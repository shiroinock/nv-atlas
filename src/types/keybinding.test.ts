import { describe, expect, test } from "vitest";
import type { AppMode, KeybindingSource, VimMode } from "./keybinding";
import {
  APP_MODE_LABELS,
  APP_MODES,
  HIGHLIGHT_MODES,
  KEYBINDING_SOURCES,
  KEYBOARD_HIDDEN_MODES,
  KEYBOARD_PLAIN_MODES,
  LEGEND_HIDDEN_MODES,
  MODE_SELECTOR_VISIBLE_MODES,
  SELECTABLE_VIM_MODES,
  VIM_MODE_META,
  VIM_MODES,
} from "./keybinding";

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

describe("KEYBOARD_HIDDEN_MODES", () => {
  test("Set のインスタンスである", () => {
    expect(KEYBOARD_HIDDEN_MODES).toBeInstanceOf(Set);
  });

  test("サイズが 1 である", () => {
    expect(KEYBOARD_HIDDEN_MODES.size).toBe(1);
  });

  describe("含まれるべきモード", () => {
    const included: AppMode[] = ["edit"];

    test.each(included)('"%s" を含む', (mode) => {
      expect(KEYBOARD_HIDDEN_MODES.has(mode)).toBe(true);
    });
  });

  describe("含まれるべきでないモード", () => {
    const excluded: AppMode[] = [
      "visualize",
      "practice",
      "reference",
      "keymap-edit",
    ];

    test.each(excluded)('"%s" を含まない', (mode) => {
      expect(KEYBOARD_HIDDEN_MODES.has(mode)).toBe(false);
    });
  });
});

describe("LEGEND_HIDDEN_MODES", () => {
  test("Set のインスタンスである", () => {
    expect(LEGEND_HIDDEN_MODES).toBeInstanceOf(Set);
  });

  test("サイズが 2 である", () => {
    expect(LEGEND_HIDDEN_MODES.size).toBe(2);
  });

  describe("含まれるべきモード", () => {
    const included: AppMode[] = ["edit", "keymap-edit"];

    test.each(included)('"%s" を含む', (mode) => {
      expect(LEGEND_HIDDEN_MODES.has(mode)).toBe(true);
    });
  });

  describe("含まれるべきでないモード", () => {
    const excluded: AppMode[] = ["visualize", "practice", "reference"];

    test.each(excluded)('"%s" を含まない', (mode) => {
      expect(LEGEND_HIDDEN_MODES.has(mode)).toBe(false);
    });
  });
});

describe("KEYBOARD_PLAIN_MODES", () => {
  test("Set のインスタンスである", () => {
    expect(KEYBOARD_PLAIN_MODES).toBeInstanceOf(Set);
  });

  test("サイズが 3 である", () => {
    expect(KEYBOARD_PLAIN_MODES.size).toBe(3);
  });

  describe("含まれるべきモード", () => {
    const included: AppMode[] = ["practice", "reference", "keymap-edit"];

    test.each(included)('"%s" を含む', (mode) => {
      expect(KEYBOARD_PLAIN_MODES.has(mode)).toBe(true);
    });
  });

  describe("含まれるべきでないモード", () => {
    const excluded: AppMode[] = ["visualize", "edit"];

    test.each(excluded)('"%s" を含まない', (mode) => {
      expect(KEYBOARD_PLAIN_MODES.has(mode)).toBe(false);
    });
  });
});

describe("MODE_SELECTOR_VISIBLE_MODES", () => {
  test("Set のインスタンスである", () => {
    expect(MODE_SELECTOR_VISIBLE_MODES).toBeInstanceOf(Set);
  });

  test("サイズが 2 である", () => {
    expect(MODE_SELECTOR_VISIBLE_MODES.size).toBe(2);
  });

  describe("含まれるべきモード", () => {
    const included: AppMode[] = ["visualize", "reference"];

    test.each(included)('"%s" を含む', (mode) => {
      expect(MODE_SELECTOR_VISIBLE_MODES.has(mode)).toBe(true);
    });
  });

  describe("含まれるべきでないモード", () => {
    const excluded: AppMode[] = ["practice", "edit", "keymap-edit"];

    test.each(excluded)('"%s" を含まない', (mode) => {
      expect(MODE_SELECTOR_VISIBLE_MODES.has(mode)).toBe(false);
    });
  });
});

describe("HIGHLIGHT_MODES", () => {
  test("Set のインスタンスである", () => {
    expect(HIGHLIGHT_MODES).toBeInstanceOf(Set);
  });

  test("サイズが 2 である", () => {
    expect(HIGHLIGHT_MODES.size).toBe(2);
  });

  describe("含まれるべきモード", () => {
    const included: AppMode[] = ["practice", "reference"];

    test.each(included)('"%s" を含む', (mode) => {
      expect(HIGHLIGHT_MODES.has(mode)).toBe(true);
    });
  });

  describe("含まれるべきでないモード", () => {
    const excluded: AppMode[] = ["visualize", "edit", "keymap-edit"];

    test.each(excluded)('"%s" を含まない', (mode) => {
      expect(HIGHLIGHT_MODES.has(mode)).toBe(false);
    });
  });
});

describe("VIM_MODE_META", () => {
  test("全 8 VimMode のキーを持つ", () => {
    for (const mode of VIM_MODES) {
      expect(VIM_MODE_META).toHaveProperty(mode);
    }
  });

  describe("各エントリが label と short を持つ", () => {
    test.each(
      [...VIM_MODES],
    )('"%s" エントリに label が存在する', (mode) => {
      expect(typeof VIM_MODE_META[mode].label).toBe("string");
    });

    test.each(
      [...VIM_MODES],
    )('"%s" エントリに short が存在する', (mode) => {
      expect(typeof VIM_MODE_META[mode].short).toBe("string");
    });
  });

  describe("期待される label/short のマッピング", () => {
    const cases: [VimMode, { label: string; short: string }][] = [
      ["n", { label: "Normal", short: "N" }],
      ["v", { label: "Visual", short: "V" }],
      ["x", { label: "Visual Block", short: "X" }],
      ["o", { label: "Op-pending", short: "O" }],
      ["i", { label: "Insert", short: "I" }],
      ["c", { label: "Command-line", short: "C" }],
      ["s", { label: "Select", short: "S" }],
      ["t", { label: "Terminal", short: "T" }],
    ];

    test.each(
      cases,
    )('"%s" の label は "%s.label", short は "%s.short"', (mode, expected) => {
      expect(VIM_MODE_META[mode].label).toBe(expected.label);
      expect(VIM_MODE_META[mode].short).toBe(expected.short);
    });
  });
});

describe("SELECTABLE_VIM_MODES", () => {
  test("7 つの要素を持つ", () => {
    expect(SELECTABLE_VIM_MODES).toHaveLength(7);
  });

  test('"x" を含まない', () => {
    expect(SELECTABLE_VIM_MODES).not.toContain("x");
  });

  test("全要素が VIM_MODE_META のキーのサブセットである", () => {
    for (const mode of SELECTABLE_VIM_MODES) {
      expect(VIM_MODE_META).toHaveProperty(mode);
    }
  });
});
