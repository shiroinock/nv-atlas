import { describe, expect, it } from "vitest";
import type { NvimMapMode, VimMode } from "./vim";
import { expandNvimMapMode } from "./vim";

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
