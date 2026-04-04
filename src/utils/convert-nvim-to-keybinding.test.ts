import { describe, expect, it } from "vitest";
import type { VimMode } from "../types/keybinding";
import { KEYBINDING_SOURCE_NVIM_IMPORT } from "../types/keybinding";
import type { NvimMapping, VimCommand } from "../types/vim";
import { DEFAULT_NVIM_MAP_CATEGORY } from "../types/vim";
import { convertNvimMapsToKeybindings } from "./convert-nvim-to-keybinding";

const baseVimCommands: VimCommand[] = [
  { key: "j", name: "↓", description: "下に移動", category: "motion" },
  { key: "k", name: "↑", description: "上に移動", category: "motion" },
  { key: "dd", name: "行削除", description: "行を削除", category: "edit" },
];

function makeNvimMap(
  overrides: Partial<NvimMapping> & { lhs: string },
): NvimMapping {
  return {
    mode: "n",
    rhs: "",
    noremap: true,
    description: overrides.description ?? "test",
    source: "user",
    sourceDetail: "init.lua",
    ...overrides,
  };
}

describe("convertNvimMapsToKeybindings", () => {
  describe("空入力", () => {
    it("空の maps を渡すと全モードが空配列の Record を返す", () => {
      const result = convertNvimMapsToKeybindings([], baseVimCommands);

      const modes: VimMode[] = ["n", "v", "x", "o", "i", "s", "c", "t"];
      for (const mode of modes) {
        expect(result[mode]).toEqual([]);
      }
    });
  });

  describe("ノーマルモードの変換", () => {
    it("ノーマルモード (n) のマップが Keybinding に変換される", () => {
      const maps = [
        makeNvimMap({
          lhs: "gd",
          rhs: "vim.lsp.buf.definition()",
          mode: "n",
          description: "Go to definition",
        }),
      ];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n).toHaveLength(1);
      expect(result.n[0].lhs).toBe("gd");
    });
  });

  describe("VimCommand マッチ", () => {
    it("VimCommand にマッチするマップは commandId が VimCommand.key に設定される", () => {
      const maps = [makeNvimMap({ lhs: "j", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].commandId).toBe("j");
    });

    it("VimCommand にマッチするマップは name が VimCommand から設定される", () => {
      const maps = [makeNvimMap({ lhs: "j", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].name).toBe("↓");
    });

    it("VimCommand にマッチするマップは description が VimCommand から設定される", () => {
      const maps = [makeNvimMap({ lhs: "j", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].description).toBe("下に移動");
    });

    it("VimCommand にマッチするマップは category が VimCommand から設定される", () => {
      const maps = [makeNvimMap({ lhs: "j", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].category).toBe("motion");
    });
  });

  describe("VimCommand 非マッチ", () => {
    it("VimCommand にマッチしないマップは rhs を保持する", () => {
      const maps = [
        makeNvimMap({ lhs: "gd", rhs: "vim.lsp.buf.definition()", mode: "n" }),
      ];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].rhs).toBe("vim.lsp.buf.definition()");
    });

    it("VimCommand にマッチしないマップは name が lhs になる", () => {
      const maps = [makeNvimMap({ lhs: "gd", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].name).toBe("gd");
    });

    it("VimCommand にマッチしないマップは category が DEFAULT_NVIM_MAP_CATEGORY になる", () => {
      const maps = [makeNvimMap({ lhs: "gd", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].category).toBe(DEFAULT_NVIM_MAP_CATEGORY);
    });

    it("VimCommand にマッチしないマップは commandId が設定されない", () => {
      const maps = [makeNvimMap({ lhs: "gd", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].commandId).toBeUndefined();
    });
  });

  describe("source フィールド", () => {
    it("VimCommand にマッチするマップの source が 'nvim-import' になる", () => {
      const maps = [makeNvimMap({ lhs: "j", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].source).toBe(KEYBINDING_SOURCE_NVIM_IMPORT);
    });

    it("VimCommand にマッチしないマップの source が 'nvim-import' になる", () => {
      const maps = [makeNvimMap({ lhs: "gd", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].source).toBe(KEYBINDING_SOURCE_NVIM_IMPORT);
    });

    it("複数マップの全バインディングの source が 'nvim-import' になる", () => {
      const maps = [
        makeNvimMap({ lhs: "j", mode: "n" }),
        makeNvimMap({ lhs: "k", mode: "n" }),
        makeNvimMap({ lhs: "gd", mode: "n" }),
      ];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(
        result.n.every((b) => b.source === KEYBINDING_SOURCE_NVIM_IMPORT),
      ).toBe(true);
    });
  });

  describe("noremap の引き継ぎ", () => {
    it("noremap: true のマップは Keybinding の noremap が true になる", () => {
      const maps = [makeNvimMap({ lhs: "j", noremap: true, mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].noremap).toBe(true);
    });

    it("noremap: false のマップは Keybinding の noremap が false になる", () => {
      const maps = [makeNvimMap({ lhs: "gd", noremap: false, mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n[0].noremap).toBe(false);
    });
  });

  describe("expandNvimMapMode によるモード展開", () => {
    it("'v' モードのマップが v, x, s の各モードに分配される", () => {
      const maps = [makeNvimMap({ lhs: "gv", mode: "v" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.v).toHaveLength(1);
      expect(result.x).toHaveLength(1);
      expect(result.s).toHaveLength(1);
      expect(result.n).toHaveLength(0);
    });

    it("'v' モードで展開された各モードのバインディングが同じ lhs を持つ", () => {
      const maps = [makeNvimMap({ lhs: "gv", mode: "v" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.v[0].lhs).toBe("gv");
      expect(result.x[0].lhs).toBe("gv");
      expect(result.s[0].lhs).toBe("gv");
    });

    it("'!' モードのマップが i, c の各モードに分配される", () => {
      const maps = [makeNvimMap({ lhs: "jk", mode: "!" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.i).toHaveLength(1);
      expect(result.c).toHaveLength(1);
      expect(result.n).toHaveLength(0);
    });

    it("'' モードのマップが n, v, x, o の各モードに分配される", () => {
      const maps = [makeNvimMap({ lhs: "gf", mode: "" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n).toHaveLength(1);
      expect(result.v).toHaveLength(1);
      expect(result.x).toHaveLength(1);
      expect(result.o).toHaveLength(1);
      expect(result.i).toHaveLength(0);
    });

    it("'x' モードのマップは x のみに分配される", () => {
      const maps = [makeNvimMap({ lhs: "gv", mode: "x" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.x).toHaveLength(1);
      expect(result.v).toHaveLength(0);
      expect(result.s).toHaveLength(0);
      expect(result.n).toHaveLength(0);
    });
  });

  describe("<Plug> スキップ", () => {
    it("<Plug> で始まる lhs はスキップされる", () => {
      const maps = [makeNvimMap({ lhs: "<Plug>(something)", mode: "n" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n).toHaveLength(0);
    });

    it("<Plug> で始まる lhs は全モードでスキップされる", () => {
      const maps = [makeNvimMap({ lhs: "<Plug>(visual-op)", mode: "v" })];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.v).toHaveLength(0);
      expect(result.x).toHaveLength(0);
      expect(result.s).toHaveLength(0);
    });

    it("<Plug> 以外のマップは通常通り変換される", () => {
      const maps = [
        makeNvimMap({ lhs: "<Plug>(something)", mode: "n" }),
        makeNvimMap({ lhs: "gd", mode: "n" }),
      ];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n).toHaveLength(1);
      expect(result.n[0].lhs).toBe("gd");
    });
  });

  describe("複合ケース", () => {
    it("マッチするマップとマッチしないマップが混在する場合に両方変換される", () => {
      const maps = [
        makeNvimMap({ lhs: "j", mode: "n" }),
        makeNvimMap({ lhs: "gd", rhs: "definition", mode: "n" }),
      ];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n).toHaveLength(2);

      const matchedBinding = result.n.find((b) => b.lhs === "j");
      expect(matchedBinding?.commandId).toBe("j");
      expect(matchedBinding?.name).toBe("↓");

      const unmatchedBinding = result.n.find((b) => b.lhs === "gd");
      expect(unmatchedBinding?.commandId).toBeUndefined();
      expect(unmatchedBinding?.name).toBe("gd");
      expect(unmatchedBinding?.rhs).toBe("definition");
    });

    it("異なるモードの複数マップが正しく分配される", () => {
      const maps = [
        makeNvimMap({ lhs: "j", mode: "n" }),
        makeNvimMap({ lhs: "k", mode: "x" }),
        makeNvimMap({ lhs: "dd", mode: "!" }),
      ];
      const result = convertNvimMapsToKeybindings(maps, baseVimCommands);

      expect(result.n).toHaveLength(1);
      expect(result.n[0].lhs).toBe("j");

      expect(result.x).toHaveLength(1);
      expect(result.x[0].lhs).toBe("k");

      expect(result.i).toHaveLength(1);
      expect(result.i[0].lhs).toBe("dd");

      expect(result.c).toHaveLength(1);
      expect(result.c[0].lhs).toBe("dd");
    });
  });
});
