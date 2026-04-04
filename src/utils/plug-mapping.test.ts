import { describe, expect, it } from "vitest";
import { isPlugMapping } from "./plug-mapping";

describe("isPlugMapping", () => {
  describe("true を返すケース", () => {
    it("<Plug>foo は true を返す", () => {
      expect(isPlugMapping("<Plug>foo")).toBe(true);
    });

    it("<Plug>(example) は true を返す", () => {
      expect(isPlugMapping("<Plug>(example)")).toBe(true);
    });
  });

  describe("false を返すケース", () => {
    it("通常のキー j は false を返す", () => {
      expect(isPlugMapping("j")).toBe(false);
    });

    it("空文字列は false を返す", () => {
      expect(isPlugMapping("")).toBe(false);
    });

    it("Plug 以外の特殊キー <C-a> は false を返す", () => {
      expect(isPlugMapping("<C-a>")).toBe(false);
    });

    it("不完全な形式 <Plug は false を返す", () => {
      expect(isPlugMapping("<Plug")).toBe(false);
    });
  });
});
