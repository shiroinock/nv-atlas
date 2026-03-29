import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, test, vi } from "vitest";
import type { KeybindingConfig } from "../../types/keybinding";
import { emptyBindings } from "../../types/keybinding";
import { ExportPanel } from "./ExportPanel";

vi.mock("../../context/KeybindingContext", () => ({
  useKeybindingContext: vi.fn(),
}));

vi.mock("../../utils/keybinding-exporters", () => ({
  keybindingToLua: vi.fn(),
  keybindingToJSON: vi.fn(),
  keybindingToLangmap: vi.fn(),
}));

import { useKeybindingContext } from "../../context/KeybindingContext";
import type { Keybinding, VimMode } from "../../types/keybinding";
import {
  keybindingToJSON,
  keybindingToLangmap,
  keybindingToLua,
} from "../../utils/keybinding-exporters";

const mockedUseKeybindingContext = vi.mocked(useKeybindingContext);
const mockedKeybindingToLua = vi.mocked(keybindingToLua);
const mockedKeybindingToJSON = vi.mocked(keybindingToJSON);
const mockedKeybindingToLangmap = vi.mocked(keybindingToLangmap);

function buildConfig(overrides?: Partial<KeybindingConfig>): KeybindingConfig {
  const now = new Date().toISOString();
  return {
    version: 1,
    name: "test-config",
    bindings: emptyBindings(),
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function buildConfigWithBindings(): KeybindingConfig {
  const config = buildConfig();
  config.bindings.n = [
    {
      lhs: "j",
      commandId: "move-down",
      name: "Move down",
      description: "Move cursor down",
      category: "motion",
      source: "default",
      noremap: true,
    },
  ];
  return config;
}

function setupContext(config: KeybindingConfig) {
  const bindingsByLhs: Record<VimMode, Map<string, Keybinding>> = {
    n: new Map(),
    i: new Map(),
    v: new Map(),
    c: new Map(),
    o: new Map(),
    t: new Map(),
    x: new Map(),
    s: new Map(),
  };

  mockedUseKeybindingContext.mockReturnValue({
    config,
    dispatch: vi.fn(),
    getBinding: vi.fn(),
    bindingsByLhs,
  });
}

describe("ExportPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
    mockedKeybindingToLua.mockReturnValue("-- lua output");
    mockedKeybindingToJSON.mockReturnValue('{"json": "output"}');
    mockedKeybindingToLangmap.mockReturnValue('vim.opt.langmap = "lw,he"');
  });

  describe("デフォルト表示", () => {
    test("Lua タブが選択状態で表示される", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      const luaTab = screen.getByRole("tab", { name: "Lua" });
      expect(luaTab).toBeInTheDocument();
    });

    test("バインディングがある場合、Lua プレビューが表示される", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      expect(screen.getByText("-- lua output")).toBeInTheDocument();
    });

    test("バインディングがある場合、keybindingToLua が config で呼ばれる", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      expect(mockedKeybindingToLua).toHaveBeenCalledWith(config);
    });
  });

  describe("Tab 切替", () => {
    test("JSON タブをクリックすると JSON プレビューに切り替わる", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      await user.click(screen.getByRole("tab", { name: "JSON" }));

      expect(screen.getByText('{"json": "output"}')).toBeInTheDocument();
    });

    test("JSON タブに切り替えると keybindingToJSON が呼ばれる", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      await user.click(screen.getByRole("tab", { name: "JSON" }));

      expect(mockedKeybindingToJSON).toHaveBeenCalledWith(config);
    });

    test("JSON タブに切り替えてから Lua タブに戻ると Lua プレビューが表示される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      await user.click(screen.getByRole("tab", { name: "JSON" }));
      await user.click(screen.getByRole("tab", { name: "Lua" }));

      expect(screen.getByText("-- lua output")).toBeInTheDocument();
    });
  });

  describe("フォールバック", () => {
    test("バインディングが空のときフォールバックメッセージが表示される", () => {
      const config = buildConfig();
      setupContext(config);

      render(<ExportPanel />);

      expect(
        screen.getByText(
          "キーバインドが設定されていません。レイアウトとキーマップを読み込んでください。",
        ),
      ).toBeInTheDocument();
    });

    test("バインディングが空のとき pre 要素が表示されない", () => {
      const config = buildConfig();
      setupContext(config);

      const { container } = render(<ExportPanel />);

      expect(container.querySelector("pre")).not.toBeInTheDocument();
    });

    test("バインディングが空のときコピーボタンが無効化される", () => {
      const config = buildConfig();
      setupContext(config);

      render(<ExportPanel />);

      expect(screen.getByRole("button", { name: "コピー" })).toBeDisabled();
    });

    test("バインディングが空のときダウンロードボタンが無効化される", () => {
      const config = buildConfig();
      setupContext(config);

      render(<ExportPanel />);

      expect(
        screen.getByRole("button", { name: "ダウンロード" }),
      ).toBeDisabled();
    });
  });

  describe("コピーボタン", () => {
    test("クリックすると navigator.clipboard.writeText が Lua 出力で呼ばれる", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });

      render(<ExportPanel />);

      await user.click(screen.getByRole("button", { name: "コピー" }));

      expect(writeText).toHaveBeenCalledWith("-- lua output");
    });

    test("コピー成功後「コピー済み」が表示される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      vi.stubGlobal("navigator", {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });

      render(<ExportPanel />);

      await user.click(screen.getByRole("button", { name: "コピー" }));

      expect(
        screen.getByRole("button", { name: "コピー済み" }),
      ).toBeInTheDocument();
    });

    test("コピー失敗時「失敗」が表示され、actionButtonError クラスが付与される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      vi.stubGlobal("navigator", {
        clipboard: {
          writeText: vi.fn().mockRejectedValue(new Error("Clipboard error")),
        },
      });

      render(<ExportPanel />);

      await user.click(screen.getByRole("button", { name: "コピー" }));

      const button = screen.getByRole("button", { name: "失敗" });
      expect(button).toBeInTheDocument();
      expect(button.className).toMatch(/actionButtonError/);
    });

    test("コピー成功時、actionButtonError クラスが付与されない", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      vi.stubGlobal("navigator", {
        clipboard: { writeText: vi.fn().mockResolvedValue(undefined) },
      });

      render(<ExportPanel />);

      await user.click(screen.getByRole("button", { name: "コピー" }));

      const button = screen.getByRole("button", { name: "コピー済み" });
      expect(button.className).not.toMatch(/actionButtonError/);
    });

    test("JSON タブに切り替えてコピーすると JSON 出力が渡される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      const writeText = vi.fn().mockResolvedValue(undefined);
      vi.stubGlobal("navigator", { clipboard: { writeText } });

      render(<ExportPanel />);

      await user.click(screen.getByRole("tab", { name: "JSON" }));
      await user.click(screen.getByRole("button", { name: "コピー" }));

      expect(writeText).toHaveBeenCalledWith('{"json": "output"}');
    });
  });

  describe("ダウンロードボタン（Lua）", () => {
    test("Lua タブでダウンロードすると keyviz-config.lua のファイル名が設定される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      const createObjectURL = vi.fn().mockReturnValue("blob:mock");
      const revokeObjectURL = vi.fn();
      vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

      let capturedAnchor: HTMLAnchorElement | undefined;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") capturedAnchor = el as HTMLAnchorElement;
        return el;
      });

      render(<ExportPanel />);

      await user.click(screen.getByRole("button", { name: "ダウンロード" }));

      expect(capturedAnchor).toBeDefined();
      expect(capturedAnchor?.download).toBe("keyviz-config.lua");
    });
  });

  describe("ダウンロードボタン（JSON）", () => {
    test("JSON タブでダウンロードすると keyviz-config.json のファイル名が設定される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);
      const createObjectURL = vi.fn().mockReturnValue("blob:mock");
      const revokeObjectURL = vi.fn();
      vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

      let capturedAnchor: HTMLAnchorElement | undefined;
      const originalCreateElement = document.createElement.bind(document);
      vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
        const el = originalCreateElement(tag);
        if (tag === "a") capturedAnchor = el as HTMLAnchorElement;
        return el;
      });

      render(<ExportPanel />);

      await user.click(screen.getByRole("tab", { name: "JSON" }));
      await user.click(screen.getByRole("button", { name: "ダウンロード" }));

      expect(capturedAnchor).toBeDefined();
      expect(capturedAnchor?.download).toBe("keyviz-config.json");
    });
  });

  describe("ARIA ロール", () => {
    test("タブコンテナに role='tablist' が付与されている", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      expect(screen.getByRole("tablist")).toBeInTheDocument();
    });

    test("各タブに role='tab' が付与されている", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(3);
    });

    test("デフォルト表示で Lua タブの aria-selected が true、JSON タブが false", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      expect(screen.getByRole("tab", { name: "Lua" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("tab", { name: "JSON" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
    });

    test("タブパネルに role='tabpanel' が付与されている", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      expect(screen.getByRole("tabpanel")).toBeInTheDocument();
    });

    test("各タブの aria-controls がタブパネルの id と一致する", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      const tabpanel = screen.getByRole("tabpanel");
      expect(tabpanel).toHaveAttribute("id", "tabpanel-export");

      const luaTab = screen.getByRole("tab", { name: "Lua" });
      expect(luaTab).toHaveAttribute("aria-controls", "tabpanel-export");

      const jsonTab = screen.getByRole("tab", { name: "JSON" });
      expect(jsonTab).toHaveAttribute("aria-controls", "tabpanel-export");
    });

    test("デフォルト表示でタブパネルの aria-labelledby が Lua タブの id と一致する", () => {
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      const tabpanel = screen.getByRole("tabpanel");
      expect(tabpanel).toHaveAttribute("aria-labelledby", "tab-lua");

      const luaTab = screen.getByRole("tab", { name: "Lua" });
      expect(luaTab).toHaveAttribute("id", "tab-lua");
    });

    test("JSON タブに切り替えると aria-selected と aria-labelledby が更新される", async () => {
      const user = userEvent.setup();
      const config = buildConfigWithBindings();
      setupContext(config);

      render(<ExportPanel />);

      await user.click(screen.getByRole("tab", { name: "JSON" }));

      expect(screen.getByRole("tab", { name: "JSON" })).toHaveAttribute(
        "aria-selected",
        "true",
      );
      expect(screen.getByRole("tab", { name: "Lua" })).toHaveAttribute(
        "aria-selected",
        "false",
      );
      expect(screen.getByRole("tabpanel")).toHaveAttribute(
        "aria-labelledby",
        "tab-json",
      );
    });
  });

  describe("Langmap タブ", () => {
    describe("表示", () => {
      test("Langmap タブが表示される", () => {
        const config = buildConfig({ customKeymap: { j: "t", k: "e" } });
        setupContext(config);

        render(<ExportPanel />);

        expect(
          screen.getByRole("tab", { name: "Langmap" }),
        ).toBeInTheDocument();
      });

      test("Langmap タブをクリックすると langmap プレビューが表示される", async () => {
        const user = userEvent.setup();
        const config = buildConfig({ customKeymap: { j: "t", k: "e" } });
        setupContext(config);

        render(<ExportPanel />);

        await user.click(screen.getByRole("tab", { name: "Langmap" }));

        expect(
          screen.getByText('vim.opt.langmap = "lw,he"'),
        ).toBeInTheDocument();
      });

      test("Langmap タブに切り替えると keybindingToLangmap が config で呼ばれる", async () => {
        const user = userEvent.setup();
        const config = buildConfig({ customKeymap: { j: "t", k: "e" } });
        setupContext(config);

        render(<ExportPanel />);

        await user.click(screen.getByRole("tab", { name: "Langmap" }));

        expect(mockedKeybindingToLangmap).toHaveBeenCalledWith(config);
      });
    });

    describe("customKeymap 未設定", () => {
      test("Langmap タブで customKeymap 未設定の場合、専用メッセージが表示される", async () => {
        const user = userEvent.setup();
        const config = buildConfig();
        setupContext(config);
        mockedKeybindingToLangmap.mockReturnValue("");

        render(<ExportPanel />);

        await user.click(screen.getByRole("tab", { name: "Langmap" }));

        expect(
          screen.getByText(
            "カスタムキーマップが設定されていないか、マッピングがありません。レイアウトを読み込んでください。",
          ),
        ).toBeInTheDocument();
      });

      test("Langmap タブで customKeymap 未設定の場合、コピーボタンが無効化される", async () => {
        const user = userEvent.setup();
        const config = buildConfig();
        setupContext(config);
        mockedKeybindingToLangmap.mockReturnValue("");

        render(<ExportPanel />);

        await user.click(screen.getByRole("tab", { name: "Langmap" }));

        expect(screen.getByRole("button", { name: "コピー" })).toBeDisabled();
      });

      test("Langmap タブで customKeymap 未設定の場合、ダウンロードボタンが無効化される", async () => {
        const user = userEvent.setup();
        const config = buildConfig();
        setupContext(config);
        mockedKeybindingToLangmap.mockReturnValue("");

        render(<ExportPanel />);

        await user.click(screen.getByRole("tab", { name: "Langmap" }));

        expect(
          screen.getByRole("button", { name: "ダウンロード" }),
        ).toBeDisabled();
      });
    });

    describe("ダウンロード", () => {
      test("Langmap タブでダウンロードすると keyviz-langmap.lua のファイル名が設定される", async () => {
        const user = userEvent.setup();
        const config = buildConfig({ customKeymap: { j: "t", k: "e" } });
        setupContext(config);
        const createObjectURL = vi.fn().mockReturnValue("blob:mock");
        const revokeObjectURL = vi.fn();
        vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

        let capturedAnchor: HTMLAnchorElement | undefined;
        const originalCreateElement = document.createElement.bind(document);
        vi.spyOn(document, "createElement").mockImplementation(
          (tag: string) => {
            const el = originalCreateElement(tag);
            if (tag === "a") capturedAnchor = el as HTMLAnchorElement;
            return el;
          },
        );

        render(<ExportPanel />);

        await user.click(screen.getByRole("tab", { name: "Langmap" }));
        await user.click(screen.getByRole("button", { name: "ダウンロード" }));

        expect(capturedAnchor).toBeDefined();
        expect(capturedAnchor?.download).toBe("keyviz-langmap.lua");
      });
    });
  });
});
