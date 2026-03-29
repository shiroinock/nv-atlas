import { describe, expect, test } from "vitest";
import type { AppMode } from "./keybinding";
import { APP_MODES } from "./keybinding";

describe("APP_MODES", () => {
  test("4つの要素を持つ", () => {
    expect(APP_MODES).toHaveLength(4);
  });

  describe("全ての AppMode 値を含む", () => {
    const cases: AppMode[] = ["visualize", "practice", "reference", "edit"];

    test.each(cases)('"%s" を含む', (mode) => {
      expect(APP_MODES).toContain(mode);
    });
  });

  test("重複がない", () => {
    const unique = new Set<string>(APP_MODES);
    expect(unique.size).toBe(APP_MODES.length);
  });
});
