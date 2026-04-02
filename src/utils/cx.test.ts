import { describe, expect, it } from "vitest";
import { cx } from "./cx";

describe("cx", () => {
  describe("正常系", () => {
    it("複数の文字列をスペースで結合して返す", () => {
      const result = cx("a", "b");
      expect(result).toBe("a b");
    });

    it("単一文字列をそのまま返す", () => {
      const result = cx("a");
      expect(result).toBe("a");
    });
  });

  describe("falsy 値の除外", () => {
    it("false を除外して残りの文字列を結合する", () => {
      const result = cx("a", false, "b");
      expect(result).toBe("a b");
    });

    it("null を除外して残りの文字列を結合する", () => {
      const result = cx("a", null, "b");
      expect(result).toBe("a b");
    });

    it("undefined を除外して残りの文字列を結合する", () => {
      const result = cx("a", undefined, "b");
      expect(result).toBe("a b");
    });

    it("空文字列を除外して残りの文字列を結合する", () => {
      const result = cx("a", "", "b");
      expect(result).toBe("a b");
    });

    it("全引数が falsy の場合は空文字列を返す", () => {
      const result = cx(false, null, undefined);
      expect(result).toBe("");
    });
  });

  describe("境界値", () => {
    it("引数なしの場合は空文字列を返す", () => {
      const result = cx();
      expect(result).toBe("");
    });
  });

  describe("実用的な混在パターン", () => {
    it("条件式で false に評価された引数を除外して結合する", () => {
      // false && "mod1" は false に評価される
      // true && "mod2" は "mod2" に評価される
      const result = cx("base", false && "mod1", true && "mod2");
      expect(result).toBe("base mod2");
    });
  });

  describe("スペース境界", () => {
    it("結果の先頭にスペースがない", () => {
      const result = cx("a", "b");
      expect(result.startsWith(" ")).toBe(false);
    });

    it("結果の末尾にスペースがない", () => {
      const result = cx("a", "b");
      expect(result.endsWith(" ")).toBe(false);
    });

    it("falsy 値が先頭にある場合でも先頭スペースがない", () => {
      const result = cx(false, "a", "b");
      expect(result.startsWith(" ")).toBe(false);
    });

    it("falsy 値が末尾にある場合でも末尾スペースがない", () => {
      const result = cx("a", "b", null);
      expect(result.endsWith(" ")).toBe(false);
    });
  });
});
