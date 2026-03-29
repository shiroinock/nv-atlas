import { describe, expect, it } from "vitest";
import type { Keybinding, KeybindingConfig } from "../types/keybinding";
import { emptyBindings } from "../types/keybinding";
import { keybindingToJSON, keybindingToLua } from "./keybinding-exporters";

// テスト用ヘルパー: 最低限のフィールドで Keybinding を生成する
function makeKeybinding(
  overrides: Partial<Keybinding> & Pick<Keybinding, "lhs">,
): Keybinding {
  return {
    name: "テストコマンド",
    description: "テスト用",
    category: "motion",
    source: "default",
    noremap: true,
    ...overrides,
  };
}

// テスト用の最小 KeybindingConfig
function makeConfig(
  overrides: Partial<KeybindingConfig> = {},
): KeybindingConfig {
  return {
    version: 1,
    name: "テスト設定",
    bindings: emptyBindings(),
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-01T00:00:00.000Z",
    ...overrides,
  };
}

// ─── keybindingToLua ───────────────────────────────────────────────

describe("keybindingToLua", () => {
  describe("基本的な変換", () => {
    it("n モードの単純なバインディングを Lua 形式に変換できる", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('vim.keymap.set("n", "j", "j"');
    });

    it("rhs を持つバインディングは rhs をそのまま使用する", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [
            makeKeybinding({
              lhs: "<leader>ff",
              rhs: ":Telescope find_files<CR>",
            }),
          ],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain(":Telescope find_files<CR>");
    });

    it("rhs と commandId が両方ある場合は rhs を優先する", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j", rhs: "gj" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('"gj"');
    });

    it("rhs も commandId も未定義のバインディングはスキップされる", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [
            makeKeybinding({ lhs: "j" }),
            makeKeybinding({ lhs: "k", commandId: "k" }),
          ],
        },
      });

      const result = keybindingToLua(config);

      const setLines = result
        .split("\n")
        .filter((line) => line.includes("vim.keymap.set"));
      expect(setLines).toHaveLength(1);
      expect(result).toContain('"k"');
    });

    it("commandId がある場合は commandId を rhs として使用する", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "h", commandId: "h" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('"h"');
    });
  });

  describe("noremap オプション", () => {
    it("noremap: true の場合は { noremap = true } オプションを付与する", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j", noremap: true })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain("{ noremap = true }");
    });

    it("noremap: false の場合は { noremap = false } オプションを付与する", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j", noremap: false })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain("{ noremap = false }");
    });
  });

  describe("全 VimMode の出力", () => {
    it("n, v, x, o, i, s, c, t の全モードのバインディングを出力する", () => {
      const config = makeConfig({
        bindings: {
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
          v: [makeKeybinding({ lhs: "j", commandId: "j" })],
          x: [makeKeybinding({ lhs: "j", commandId: "j" })],
          o: [makeKeybinding({ lhs: "j", commandId: "j" })],
          i: [makeKeybinding({ lhs: "<C-n>", commandId: "j" })],
          s: [makeKeybinding({ lhs: "j", commandId: "j" })],
          c: [makeKeybinding({ lhs: "<C-n>", commandId: "j" })],
          t: [makeKeybinding({ lhs: "<C-n>", commandId: "j" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('"n"');
      expect(result).toContain('"v"');
      expect(result).toContain('"x"');
      expect(result).toContain('"o"');
      expect(result).toContain('"i"');
      expect(result).toContain('"s"');
      expect(result).toContain('"c"');
      expect(result).toContain('"t"');
    });

    it("バインディングが空のモードは出力されない", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain("-- n mode");
      expect(result).not.toContain("-- v mode");
      const lines = result
        .split("\n")
        .filter((line) => line.includes('vim.keymap.set("v"'));
      expect(lines).toHaveLength(0);
    });
  });

  describe("特殊キー", () => {
    it("<C-x> のような Ctrl キーシーケンスがそのまま出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "<C-x>", commandId: "<C-x>" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain("<C-x>");
    });

    it("<leader> を含むキーシーケンスがそのまま出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [
            makeKeybinding({
              lhs: "<leader>ff",
              rhs: ":Telescope find_files<CR>",
            }),
          ],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain("<leader>ff");
    });

    it("<CR> を含むキーシーケンスがそのまま出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "<CR>", commandId: "<CR>" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain("<CR>");
    });
  });

  describe("複合キーシーケンス", () => {
    it("dd のような2文字シーケンスがそのまま出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "dd", commandId: "dd" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('"dd"');
    });

    it("gg のような2文字シーケンスがそのまま出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "gg", commandId: "gg" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('"gg"');
    });
  });

  describe("Lua 文字列エスケープ", () => {
    it('lhs に " が含まれる場合はエスケープされる', () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: '"', commandId: '"' })],
        },
      });

      const result = keybindingToLua(config);

      // Lua では " を \" とエスケープする
      expect(result).toContain('\\"');
    });

    it("lhs に \\ が含まれる場合はエスケープされる", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "\\", commandId: "\\" })],
        },
      });

      const result = keybindingToLua(config);

      // Lua では \ を \\ とエスケープする
      expect(result).toContain("\\\\");
    });

    it('rhs に " が含まれる場合はエスケープされる', () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "<leader>q", rhs: ':echo "hello"<CR>' })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toContain('\\"hello\\"');
    });
  });

  describe("出力フォーマット", () => {
    it("各バインディングが vim.keymap.set(...) の形式で出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toMatch(/vim\.keymap\.set\("n",\s*"j",\s*"j"/);
    });

    it("複数バインディングが複数行で出力される", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [
            makeKeybinding({ lhs: "j", commandId: "j" }),
            makeKeybinding({ lhs: "k", commandId: "k" }),
          ],
        },
      });

      const result = keybindingToLua(config);

      const lines = result
        .split("\n")
        .filter((line) => line.includes("vim.keymap.set"));
      expect(lines).toHaveLength(2);
    });

    it("文字列として返される", () => {
      const config = makeConfig();

      const result = keybindingToLua(config);

      expect(typeof result).toBe("string");
    });

    it("先頭に生成元コメントが含まれる", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
        },
      });

      const result = keybindingToLua(config);

      expect(result).toMatch(/^-- Generated by KeyViz\n/);
    });
  });
});

// ─── keybindingToJSON ──────────────────────────────────────────────

describe("keybindingToJSON", () => {
  describe("基本的な変換", () => {
    it("KeybindingConfig を JSON 文字列に変換できる", () => {
      const config = makeConfig();

      const result = keybindingToJSON(config);

      expect(typeof result).toBe("string");
    });

    it("変換結果が valid な JSON である", () => {
      const config = makeConfig();

      const result = keybindingToJSON(config);

      expect(() => JSON.parse(result)).not.toThrow();
    });

    it("パースした結果が元の config と一致する", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
        },
      });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe(config.name);
      expect(parsed.bindings.n[0].lhs).toBe("j");
      expect(parsed.createdAt).toBe(config.createdAt);
      expect(parsed.updatedAt).toBe(config.updatedAt);
    });

    it("整形済み（インデント付き）JSON として出力される", () => {
      const config = makeConfig();

      const result = keybindingToJSON(config);

      // 整形済みなら改行が含まれる
      expect(result).toContain("\n");
    });
  });

  describe("フィールドの保持", () => {
    it("name フィールドが保持される", () => {
      const config = makeConfig({ name: "My Custom Config" });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.name).toBe("My Custom Config");
    });

    it("customKeymap フィールドが存在する場合は保持される", () => {
      const config = makeConfig({
        customKeymap: { a: "a", b: "b", h: "n" },
      });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.customKeymap).toEqual({ a: "a", b: "b", h: "n" });
    });

    it("customKeymap が未定義の場合は JSON にも含まれない", () => {
      const config = makeConfig();

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.customKeymap).toBeUndefined();
    });

    it("全 VimMode の bindings が保持される", () => {
      const config = makeConfig({
        bindings: {
          n: [makeKeybinding({ lhs: "j", commandId: "j" })],
          v: [makeKeybinding({ lhs: "v", commandId: "v" })],
          x: [],
          o: [],
          i: [],
          s: [],
          c: [],
          t: [],
        },
      });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.bindings.n).toHaveLength(1);
      expect(parsed.bindings.v).toHaveLength(1);
      expect(parsed.bindings.x).toHaveLength(0);
    });

    it("Keybinding の全フィールドが保持される（commandId, rhs, noremap など）", () => {
      const config = makeConfig({
        bindings: {
          ...emptyBindings(),
          n: [
            makeKeybinding({
              lhs: "<leader>ff",
              commandId: "ff",
              rhs: ":Telescope find_files<CR>",
              noremap: true,
              source: "user-edit",
              name: "ファイル検索",
              description: "Telescope でファイルを検索",
              category: "misc",
            }),
          ],
        },
      });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      const binding = parsed.bindings.n[0];
      expect(binding.lhs).toBe("<leader>ff");
      expect(binding.commandId).toBe("ff");
      expect(binding.rhs).toBe(":Telescope find_files<CR>");
      expect(binding.noremap).toBe(true);
      expect(binding.source).toBe("user-edit");
    });
  });

  describe("createdAt / updatedAt", () => {
    it("createdAt が保持される", () => {
      const config = makeConfig({ createdAt: "2024-06-01T12:00:00.000Z" });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.createdAt).toBe("2024-06-01T12:00:00.000Z");
    });

    it("updatedAt が保持される", () => {
      const config = makeConfig({ updatedAt: "2024-06-15T08:30:00.000Z" });

      const result = keybindingToJSON(config);
      const parsed = JSON.parse(result);

      expect(parsed.updatedAt).toBe("2024-06-15T08:30:00.000Z");
    });
  });
});
