import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { DEFAULT_LAYOUT_NAME } from "./data/default-layout";
import { defaultCustomKeymap } from "./data/keymap";
import type { KeybindingConfig } from "./types/keybinding";
import { APP_MODE_LABELS, APP_MODES, emptyBindings } from "./types/keybinding";

vi.mock("./components/ExportPanel/ExportPanel", () => ({
  ExportPanel: vi.fn(() => <div data-testid="export-panel" />),
}));

vi.mock("./components/BindingEditor/BindingEditor", () => ({
  BindingEditor: vi.fn(() => <div data-testid="binding-editor" />),
}));

// 子コンポーネントをモック化して渡された customKeymap props を検証する
vi.mock("./components/PracticeMode/PracticeMode", () => ({
  PracticeMode: vi.fn(
    ({ customKeymap }: { customKeymap: Record<string, string> }) => (
      <div
        data-testid="practice-mode"
        data-custom-keymap={JSON.stringify(customKeymap)}
      />
    ),
  ),
}));

vi.mock("./components/CommandReference/CommandReference", () => ({
  CommandReference: vi.fn(
    ({ customKeymap }: { customKeymap: Record<string, string> }) => (
      <div
        data-testid="command-reference"
        data-custom-keymap={JSON.stringify(customKeymap)}
      />
    ),
  ),
}));

vi.mock("./components/Keyboard/Keyboard", () => ({
  Keyboard: vi.fn(
    ({ customKeymap }: { customKeymap: Record<string, string> }) => (
      <div
        data-testid="keyboard"
        data-custom-keymap={JSON.stringify(customKeymap)}
      />
    ),
  ),
}));

vi.mock("./components/KeymapEditor/KeymapEditor", () => ({
  KeymapEditor: vi.fn(() => <div data-testid="keymap-editor" />),
}));

// useKeyboardLayout をモック化してファイルシステムアクセスを回避する
vi.mock("./hooks/useKeyboardLayout", () => ({
  useKeyboardLayout: vi.fn(() => ({
    layout: { name: DEFAULT_LAYOUT_NAME, keys: [] },
    loadFromJSON: vi.fn(),
    error: null,
  })),
}));

// useNvimMaps をモック化してネットワークアクセスを回避する
vi.mock("./hooks/useNvimMaps", () => ({
  useNvimMaps: vi.fn(() => ({
    nvimMaps: null,
    loading: false,
    error: null,
    refresh: vi.fn(),
  })),
}));

// storage をモック化して localStorage アクセスを回避する
vi.mock("./utils/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./utils/storage")>()),
  loadKeymap: vi.fn(() => null),
  loadKeybindingConfig: vi.fn(() => null),
  saveKeymap: vi.fn(),
  saveLayout: vi.fn(),
  clearAllStorage: vi.fn(),
}));

// AppContent を直接テストするためにインポートする
// App はプロバイダーを内包するため、テストでは KeybindingProvider に initial を渡す形で構成する
import { App } from "./App";
import { CommandReference } from "./components/CommandReference/CommandReference";
import { Keyboard } from "./components/Keyboard/Keyboard";
import { PracticeMode } from "./components/PracticeMode/PracticeMode";
import { useNvimMaps } from "./hooks/useNvimMaps";

const mockedPracticeMode = vi.mocked(PracticeMode);
const mockedCommandReference = vi.mocked(CommandReference);
const mockedKeyboard = vi.mocked(Keyboard);
const mockedUseNvimMaps = vi.mocked(useNvimMaps);

function buildConfig(customKeymap?: Record<string, string>): KeybindingConfig {
  const now = new Date().toISOString();
  return {
    version: 1,
    name: "test-config",
    bindings: emptyBindings(),
    customKeymap,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * KeybindingProvider の initial prop で customKeymap を注入し、
 * AppContent 相当の動作をテストするラッパーコンポーネント。
 *
 * App は内部で KeybindingProvider を持つため直接 initial を渡せない。
 * そのため、AppContent を単独でレンダーし KeybindingProvider で包む構成を使う。
 */
function renderAppContent(config: KeybindingConfig) {
  // AppContent は export されていないため、App の代わりに
  // KeybindingProvider + AppContent の構成を再現するアプローチを取る。
  // ただし AppContent は非公開なので、App 全体をレンダーした上で
  // KeybindingProvider の initial を外側から差し込む方法は使えない。
  //
  // 代替として: AppContent 相当のロジックのみを持つテスト用コンポーネントを作るか、
  // App を export してその KeybindingProvider に initial を渡す改修を待つ。
  //
  // 現状の App は KeybindingProvider を内包しているため、
  // このテストは App を initial 対応にする実装変更が完了した後にパスすることを期待する。
  // (test-later パターン: 実装前にテストを書く)
  //
  // NOTE: 現時点では App の KeybindingProvider に initial を渡す手段がないため、
  //       テストは失敗する。実装で App を以下のように変更することでパスする:
  //   export function App({ initial }: { initial?: KeybindingConfig }) {
  //     return <KeybindingProvider initial={initial}><AppContent /></KeybindingProvider>;
  //   }
  return render(<App initial={config} />);
}

describe("AppContent - customKeymap の反映", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("デフォルトフォールバック", () => {
    test("customKeymap が undefined の場合、Keyboard に defaultCustomKeymap が渡される", async () => {
      const config = buildConfig(undefined);

      renderAppContent(config);

      const calls = mockedKeyboard.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].customKeymap).toEqual(defaultCustomKeymap);
    });

    test("customKeymap が undefined の場合、練習モードに切り替えると PracticeMode に defaultCustomKeymap が渡される", async () => {
      const user = userEvent.setup();
      const config = buildConfig(undefined);

      renderAppContent(config);

      await user.click(screen.getByRole("button", { name: "練習" }));

      const calls = mockedPracticeMode.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].customKeymap).toEqual(defaultCustomKeymap);
    });

    test("customKeymap が undefined の場合、辞書モードに切り替えると CommandReference に defaultCustomKeymap が渡される", async () => {
      const user = userEvent.setup();
      const config = buildConfig(undefined);

      renderAppContent(config);

      await user.click(screen.getByRole("button", { name: "辞書" }));

      const calls = mockedCommandReference.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].customKeymap).toEqual(defaultCustomKeymap);
    });
  });

  describe("Context からの customKeymap 反映", () => {
    test("customKeymap が設定されている場合、Keyboard にその値が渡される", async () => {
      const customKeymap = { a: "x", s: "y", d: "z" };
      const config = buildConfig(customKeymap);

      renderAppContent(config);

      const calls = mockedKeyboard.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].customKeymap).toEqual(customKeymap);
    });

    test("customKeymap が設定されている場合、defaultCustomKeymap とは異なる値が使われる", async () => {
      const customKeymap = { a: "x", s: "y", d: "z" };
      const config = buildConfig(customKeymap);

      renderAppContent(config);

      const calls = mockedKeyboard.mock.calls;
      const lastCall = calls[calls.length - 1];
      const passedKeymap = lastCall[0].customKeymap;

      expect(passedKeymap).toEqual(customKeymap);
      expect(passedKeymap).not.toEqual(defaultCustomKeymap);
    });

    test("customKeymap が設定されている場合、練習モードで PracticeMode にその値が渡される", async () => {
      const user = userEvent.setup();
      const customKeymap = { a: "x", s: "y", d: "z" };
      const config = buildConfig(customKeymap);

      renderAppContent(config);

      await user.click(screen.getByRole("button", { name: "練習" }));

      const calls = mockedPracticeMode.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].customKeymap).toEqual(customKeymap);
    });

    test("customKeymap が設定されている場合、辞書モードで CommandReference にその値が渡される", async () => {
      const user = userEvent.setup();
      const customKeymap = { a: "x", s: "y", d: "z" };
      const config = buildConfig(customKeymap);

      renderAppContent(config);

      await user.click(screen.getByRole("button", { name: "辞書" }));

      const calls = mockedCommandReference.mock.calls;
      const lastCall = calls[calls.length - 1];
      expect(lastCall[0].customKeymap).toEqual(customKeymap);
    });
  });
});

describe("App - ExportPanel の表示", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("可視化モードで ExportPanel が render される", () => {
    const config = buildConfig(undefined);

    renderAppContent(config);

    expect(screen.getByTestId("export-panel")).toBeInTheDocument();
  });

  test("練習モードでは ExportPanel が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "練習" }));

    expect(screen.queryByTestId("export-panel")).not.toBeInTheDocument();
  });

  test("辞書モードでは ExportPanel が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "辞書" }));

    expect(screen.queryByTestId("export-panel")).not.toBeInTheDocument();
  });
});

describe("App - nvimMaps の表示", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("複数モードのデータを含む nvimMaps は全モード合計数が表示される", () => {
    mockedUseNvimMaps.mockReturnValue({
      nvimMaps: [
        {
          mode: "n",
          lhs: "j",
          rhs: "j",
          noremap: true,
          description: "",
          source: "user",
          sourceDetail: "",
        },
        {
          mode: "n",
          lhs: "k",
          rhs: "k",
          noremap: true,
          description: "",
          source: "user",
          sourceDetail: "",
        },
        {
          mode: "n",
          lhs: "l",
          rhs: "l",
          noremap: true,
          description: "",
          source: "user",
          sourceDetail: "",
        },
        {
          mode: "v",
          lhs: "j",
          rhs: "j",
          noremap: true,
          description: "",
          source: "user",
          sourceDetail: "",
        },
        {
          mode: "v",
          lhs: "k",
          rhs: "k",
          noremap: true,
          description: "",
          source: "user",
          sourceDetail: "",
        },
        {
          mode: "!" as const,
          lhs: "w",
          rhs: "w",
          noremap: true,
          description: "",
          source: "user",
          sourceDetail: "",
        },
      ],
      loading: false,
      error: null,
      refresh: vi.fn(),
    });

    render(<App />);

    expect(screen.getByText("nvim: 6 maps")).toBeInTheDocument();
  });
});

describe("App - 編集モードの統合", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("「編集」タブが表示される", () => {
    const config = buildConfig(undefined);

    renderAppContent(config);

    expect(screen.getByRole("button", { name: "編集" })).toBeInTheDocument();
  });

  test("「編集」タブをクリックすると BindingEditor が表示される", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.getByTestId("binding-editor")).toBeInTheDocument();
  });

  test("編集モードでは Keyboard が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.queryByTestId("keyboard")).not.toBeInTheDocument();
  });

  test("編集モードから可視化モードに切り替えると BindingEditor が非表示になる", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "編集" }));
    await user.click(screen.getByRole("button", { name: "可視化" }));

    expect(screen.queryByTestId("binding-editor")).not.toBeInTheDocument();
  });

  test("編集モードでは ExportPanel が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.queryByTestId("export-panel")).not.toBeInTheDocument();
  });

  test("編集モードでは凡例が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "編集" }));

    expect(screen.queryByTestId("legend")).not.toBeInTheDocument();
  });
});

describe("App - handleHover の参照安定性", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // handleHover が useCallback でラップされていれば、
  // 再レンダー後も Keyboard に渡される onHover は同一参照であること
  test("可視化モードで再レンダーされても Keyboard に渡される onHover の参照が変わらない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    // 初回レンダー時の onHover 参照を取得
    const calls = mockedKeyboard.mock.calls;
    const firstOnHover = calls[calls.length - 1][0].onHover;

    // Vim モードタブをクリックして AppContent を再レンダーさせる
    // ModeSelector は可視化モード時に表示され、クリックで setActiveVimMode が呼ばれる
    await user.click(screen.getByRole("tab", { name: "VVisual" }));

    // 再レンダー後の onHover 参照を取得
    const callsAfter = mockedKeyboard.mock.calls;
    const secondOnHover = callsAfter[callsAfter.length - 1][0].onHover;

    expect(secondOnHover).toBe(firstOnHover);
  });
});

describe("App - キーマップ編集モードの統合", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("「配列編集」タブが表示される", () => {
    const config = buildConfig(undefined);

    renderAppContent(config);

    expect(
      screen.getByRole("button", { name: "配列編集" }),
    ).toBeInTheDocument();
  });

  test("「配列編集」タブをクリックすると KeymapEditor が表示される", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "配列編集" }));

    expect(screen.getByTestId("keymap-editor")).toBeInTheDocument();
  });

  test("キーマップ編集モードでも Keyboard が表示される", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "配列編集" }));

    expect(screen.getByTestId("keyboard")).toBeInTheDocument();
  });

  test("キーマップ編集モードから可視化モードに切り替えると KeymapEditor が非表示になる", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "配列編集" }));
    await user.click(screen.getByRole("button", { name: "可視化" }));

    expect(screen.queryByTestId("keymap-editor")).not.toBeInTheDocument();
  });

  test("キーマップ編集モードでは ExportPanel が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "配列編集" }));

    expect(screen.queryByTestId("export-panel")).not.toBeInTheDocument();
  });

  test("キーマップ編集モードでは凡例が表示されない", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(screen.getByRole("button", { name: "配列編集" }));

    expect(screen.queryByTestId("legend")).not.toBeInTheDocument();
  });
});

describe("App - モードタブの動的生成", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  test("全 APP_MODES のタブが表示される", () => {
    const config = buildConfig(undefined);

    renderAppContent(config);

    for (const mode of APP_MODES) {
      expect(
        screen.getByRole("button", { name: APP_MODE_LABELS[mode] }),
      ).toBeInTheDocument();
    }
  });

  test("「練習」タブをクリックするとモードが切り替わる", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(
      screen.getByRole("button", { name: APP_MODE_LABELS.practice }),
    );

    expect(screen.getByTestId("practice-mode")).toBeInTheDocument();
  });

  test("「辞書」タブをクリックするとモードが切り替わる", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(
      screen.getByRole("button", { name: APP_MODE_LABELS.reference }),
    );

    expect(screen.getByTestId("command-reference")).toBeInTheDocument();
  });

  test("「編集」タブをクリックするとモードが切り替わる", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(
      screen.getByRole("button", { name: APP_MODE_LABELS.edit }),
    );

    expect(screen.getByTestId("binding-editor")).toBeInTheDocument();
  });

  test("「可視化」タブをクリックすると可視化モードに戻る", async () => {
    const user = userEvent.setup();
    const config = buildConfig(undefined);

    renderAppContent(config);

    await user.click(
      screen.getByRole("button", { name: APP_MODE_LABELS.practice }),
    );
    await user.click(
      screen.getByRole("button", { name: APP_MODE_LABELS.visualize }),
    );

    expect(screen.getByTestId("export-panel")).toBeInTheDocument();
  });

  test("モードタブ部分のスナップショット", () => {
    const config = buildConfig(undefined);

    renderAppContent(config);

    const tabButtons = APP_MODES.map((mode) =>
      screen.getByRole("button", { name: APP_MODE_LABELS[mode] }),
    );
    const tabContainer = tabButtons[0].parentElement;
    expect(tabContainer).not.toBeNull();
    expect(tabContainer).toMatchSnapshot();
  });
});
