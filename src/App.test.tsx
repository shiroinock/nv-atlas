import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { defaultCustomKeymap } from "./data/keymap";
import type { KeybindingConfig } from "./types/keybinding";
import { emptyBindings } from "./types/keybinding";

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

// useKeyboardLayout をモック化してファイルシステムアクセスを回避する
vi.mock("./hooks/useKeyboardLayout", () => ({
  useKeyboardLayout: vi.fn(() => ({
    layout: { name: "ANSI 60%", keys: [] },
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
vi.mock("./utils/storage", () => ({
  loadKeymap: vi.fn(() => null),
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

const mockedPracticeMode = vi.mocked(PracticeMode);
const mockedCommandReference = vi.mocked(CommandReference);
const mockedKeyboard = vi.mocked(Keyboard);

function buildConfig(customKeymap?: Record<string, string>): KeybindingConfig {
  const now = new Date().toISOString();
  return {
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
