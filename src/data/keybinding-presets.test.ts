import { describe, expect, it } from "vitest";
import { getPresets } from "./keybinding-presets";
import { defaultCustomKeymap, QWERTY_KEYS } from "./keymap";

describe("getPresets", () => {
  describe("戻り値の基本構造", () => {
    it("配列を返す", () => {
      const result = getPresets();
      expect(Array.isArray(result)).toBe(true);
    });

    it("4つ以上のプリセットを返す", () => {
      const result = getPresets();
      expect(result.length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("各プリセットの形状", () => {
    it("全プリセットが id, name, description, keymap を持つ", () => {
      const presets = getPresets();
      for (const preset of presets) {
        expect(preset).toHaveProperty("id");
        expect(preset).toHaveProperty("name");
        expect(preset).toHaveProperty("description");
        expect(preset).toHaveProperty("keymap");
        expect(typeof preset.id).toBe("string");
        expect(typeof preset.name).toBe("string");
        expect(typeof preset.description).toBe("string");
        expect(typeof preset.keymap).toBe("object");
      }
    });

    it("全プリセットの keymap が 30 キーを持つ", () => {
      const presets = getPresets();
      for (const preset of presets) {
        const keys = Object.keys(preset.keymap);
        expect(keys).toHaveLength(30);
      }
    });

    it("全プリセットの keymap のキーセットが QWERTY 30 キーと一致する", () => {
      const presets = getPresets();
      for (const preset of presets) {
        const keys = Object.keys(preset.keymap).sort();
        expect(keys).toEqual([...QWERTY_KEYS].sort());
      }
    });
  });

  describe("プリセット id のユニーク性", () => {
    it("全プリセットの id が重複しない", () => {
      const presets = getPresets();
      const ids = presets.map((p) => p.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });
  });

  describe("QWERTY プリセット", () => {
    it("id が 'qwerty' のプリセットが存在する", () => {
      const presets = getPresets();
      const qwerty = presets.find((p) => p.id === "qwerty");
      expect(qwerty).toBeDefined();
    });

    it("QWERTY プリセットの keymap はパススルー（各キーの値が自身のキーと同じ）である", () => {
      const presets = getPresets();
      const qwerty = presets.find((p) => p.id === "qwerty");
      expect(qwerty).toBeDefined();
      if (!qwerty) return;
      for (const key of QWERTY_KEYS) {
        expect(qwerty.keymap[key]).toBe(key);
      }
    });
  });

  describe("Colemak DH プリセット", () => {
    it("id が 'colemak-dh' のプリセットが存在する", () => {
      const presets = getPresets();
      const colemakDh = presets.find((p) => p.id === "colemak-dh");
      expect(colemakDh).toBeDefined();
    });

    it("Colemak DH プリセットの keymap が defaultCustomKeymap と一致する", () => {
      const presets = getPresets();
      const colemakDh = presets.find((p) => p.id === "colemak-dh");
      expect(colemakDh).toBeDefined();
      if (!colemakDh) return;
      expect(colemakDh.keymap).toEqual(defaultCustomKeymap);
    });
  });

  describe("Dvorak プリセット", () => {
    it("id が 'dvorak' のプリセットが存在する", () => {
      const presets = getPresets();
      const dvorak = presets.find((p) => p.id === "dvorak");
      expect(dvorak).toBeDefined();
    });
  });

  describe("Colemak プリセット", () => {
    it("id が 'colemak' のプリセットが存在する", () => {
      const presets = getPresets();
      const colemak = presets.find((p) => p.id === "colemak");
      expect(colemak).toBeDefined();
    });
  });
});
