import { describe, expect, it, test } from "vitest";
import type { NvimMapMode, VimCommandCategory, VimMode } from "./vim";
import {
  expandNvimMapMode,
  matchesVimMode,
  VIM_COMMAND_CATEGORIES,
  VIM_PRACTICE_CATEGORIES,
} from "./vim";

describe("expandNvimMapMode", () => {
  describe("単一モードの展開", () => {
    it('n → ["n"] に展開される', () => {
      const result = expandNvimMapMode("n");
      expect(result).toEqual(["n"] satisfies VimMode[]);
    });

    it('x → ["x"] に展開される', () => {
      const result = expandNvimMapMode("x");
      expect(result).toEqual(["x"] satisfies VimMode[]);
    });

    it('o → ["o"] に展開される', () => {
      const result = expandNvimMapMode("o");
      expect(result).toEqual(["o"] satisfies VimMode[]);
    });

    it('s → ["s"] に展開される', () => {
      const result = expandNvimMapMode("s");
      expect(result).toEqual(["s"] satisfies VimMode[]);
    });
  });

  describe("複数モードに展開されるケース", () => {
    it('v → ["v", "x", "s"] に展開される（Visual + Select）', () => {
      const result = expandNvimMapMode("v");
      expect(result).toEqual(["v", "x", "s"] satisfies VimMode[]);
    });

    it('"!" → ["i", "c"] に展開される（Insert + Command-line）', () => {
      const result = expandNvimMapMode("!");
      expect(result).toEqual(["i", "c"] satisfies VimMode[]);
    });

    it('"" → ["n", "v", "x", "o"] に展開される（Normal + Visual + Operator-pending）', () => {
      const result = expandNvimMapMode("");
      expect(result).toEqual(["n", "v", "x", "o"] satisfies VimMode[]);
    });
  });

  describe("返り値の型", () => {
    it("返り値は VimMode の配列である", () => {
      const modes: NvimMapMode[] = ["n", "x", "o", "v", "s", "!", ""];
      for (const mode of modes) {
        const result = expandNvimMapMode(mode);
        expect(Array.isArray(result)).toBe(true);
        expect(result.length).toBeGreaterThan(0);
      }
    });
  });
});

describe("matchesVimMode", () => {
  describe('activeMode="v"（Visual+Select）のマッチ', () => {
    it('modes に "v" を含む場合は true', () => {
      const result = matchesVimMode(["v"] satisfies VimMode[], "v");
      expect(result).toBe(true);
    });

    it('modes に "x"（Visual-exclusive）を含む場合は true', () => {
      const result = matchesVimMode(["x"] satisfies VimMode[], "v");
      expect(result).toBe(true);
    });

    it('modes に "s"（Select）のみの場合は false', () => {
      const result = matchesVimMode(["s"] satisfies VimMode[], "v");
      expect(result).toBe(false);
    });

    it('modes に "n" のみの場合は false', () => {
      const result = matchesVimMode(["n"] satisfies VimMode[], "v");
      expect(result).toBe(false);
    });
  });

  describe('activeMode="n"（Normal）のマッチ', () => {
    it('modes に "n" を含む場合は true', () => {
      const result = matchesVimMode(["n"] satisfies VimMode[], "n");
      expect(result).toBe(true);
    });

    it('modes に "v" のみの場合は false', () => {
      const result = matchesVimMode(["v"] satisfies VimMode[], "n");
      expect(result).toBe(false);
    });
  });

  describe('activeMode="s"（Select）のマッチ', () => {
    it('modes に "s" を含む場合は true', () => {
      const result = matchesVimMode(["s"] satisfies VimMode[], "s");
      expect(result).toBe(true);
    });

    it('modes に "v"（Visual+Select を包含）を含む場合は true', () => {
      const result = matchesVimMode(["v"] satisfies VimMode[], "s");
      expect(result).toBe(true);
    });
  });

  describe('activeMode="x"（Visual-exclusive）のマッチ', () => {
    it('modes に "x" を含む場合は true', () => {
      const result = matchesVimMode(["x"] satisfies VimMode[], "x");
      expect(result).toBe(true);
    });
  });

  describe("その他のモードは自分自身のみにマッチ", () => {
    it('activeMode="o" で modes に "o" を含む場合は true', () => {
      const result = matchesVimMode(["o"] satisfies VimMode[], "o");
      expect(result).toBe(true);
    });

    it('activeMode="i" で modes に "i" を含む場合は true', () => {
      const result = matchesVimMode(["i"] satisfies VimMode[], "i");
      expect(result).toBe(true);
    });

    it('activeMode="c" で modes に "c" を含む場合は true', () => {
      const result = matchesVimMode(["c"] satisfies VimMode[], "c");
      expect(result).toBe(true);
    });

    it('activeMode="t" で modes に "t" を含む場合は true', () => {
      const result = matchesVimMode(["t"] satisfies VimMode[], "t");
      expect(result).toBe(true);
    });
  });

  describe("空配列のエッジケース", () => {
    it("modes が空配列の場合はどのモードでも false", () => {
      const emptyModes: VimMode[] = [];
      const allModes: VimMode[] = ["n", "v", "x", "o", "i", "s", "c", "t"];
      for (const activeMode of allModes) {
        const result = matchesVimMode(emptyModes, activeMode);
        expect(result).toBe(false);
      }
    });
  });
});

describe("VIM_COMMAND_CATEGORIES", () => {
  test("8つの要素を持つ", () => {
    expect(VIM_COMMAND_CATEGORIES).toHaveLength(8);
  });

  describe("全ての VimCommandCategory 値を含む", () => {
    const cases: VimCommandCategory[] = [
      "motion",
      "edit",
      "search",
      "insert",
      "visual",
      "operator",
      "textobj",
      "misc",
    ];

    test.each(cases)('"%s" を含む', (category) => {
      expect(VIM_COMMAND_CATEGORIES).toContain(category);
    });
  });

  test("重複がない", () => {
    const unique = new Set<string>(VIM_COMMAND_CATEGORIES);
    expect(unique.size).toBe(VIM_COMMAND_CATEGORIES.length);
  });
});

describe("VIM_PRACTICE_CATEGORIES", () => {
  test("textobj を除いた全カテゴリを持つ", () => {
    expect(VIM_PRACTICE_CATEGORIES).toHaveLength(
      VIM_COMMAND_CATEGORIES.length - 1,
    );
  });

  test("textobj を含まない", () => {
    expect(VIM_PRACTICE_CATEGORIES).not.toContain("textobj");
  });

  describe("全要素が VIM_COMMAND_CATEGORIES のサブセットである", () => {
    test("各要素が VIM_COMMAND_CATEGORIES に含まれる", () => {
      for (const category of VIM_PRACTICE_CATEGORIES) {
        expect(VIM_COMMAND_CATEGORIES).toContain(category);
      }
    });
  });

  test("重複がない", () => {
    const unique = new Set<string>(VIM_PRACTICE_CATEGORIES);
    expect(unique.size).toBe(VIM_PRACTICE_CATEGORIES.length);
  });
});
