import { describe, expect, test } from "vitest";
import type { AppMode, KeybindingSource } from "./keybinding";
import { APP_MODE_LABELS, APP_MODES, KEYBINDING_SOURCES } from "./keybinding";

describe("APP_MODES", () => {
  test("5つの要素を持つ", () => {
    expect(APP_MODES).toHaveLength(5);
  });

  describe("全ての AppMode 値を含む", () => {
    const cases = [
      "visualize",
      "practice",
      "reference",
      "edit",
      "keymap-edit",
    ] as AppMode[];

    test.each(cases)('"%s" を含む', (mode) => {
      expect(APP_MODES).toContain(mode);
    });
  });

  test("重複がない", () => {
    const unique = new Set<string>(APP_MODES);
    expect(unique.size).toBe(APP_MODES.length);
  });
});

describe("KEYBINDING_SOURCES", () => {
  test("4つの要素を持つ", () => {
    expect(KEYBINDING_SOURCES).toHaveLength(4);
  });

  describe("全ての KeybindingSource 値を含む", () => {
    const cases: KeybindingSource[] = [
      "default",
      "layout-derived",
      "nvim-import",
      "user-edit",
    ];

    test.each(cases)('"%s" を含む', (source) => {
      expect(KEYBINDING_SOURCES).toContain(source);
    });
  });

  test("重複がない", () => {
    const unique = new Set<string>(KEYBINDING_SOURCES);
    expect(unique.size).toBe(KEYBINDING_SOURCES.length);
  });
});

describe("APP_MODE_LABELS", () => {
  test("全ての APP_MODES のキーを持つ", () => {
    for (const mode of APP_MODES) {
      expect(APP_MODE_LABELS).toHaveProperty(mode);
    }
  });

  describe("各モードのラベルが期待通りの日本語文字列であること", () => {
    const cases: [AppMode, string][] = [
      ["visualize", "可視化"],
      ["practice", "練習"],
      ["reference", "辞書"],
      ["edit", "編集"],
      ["keymap-edit" as AppMode, "配列編集"],
    ];

    test.each(cases)('"%s" のラベルは "%s"', (mode, expected) => {
      expect(APP_MODE_LABELS[mode]).toBe(expected);
    });
  });
});
