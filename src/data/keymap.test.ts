import { describe, expect, it } from "vitest";
import { defaultCustomKeymap, invertKeymap, QWERTY_KEYS } from "./keymap";

describe("QWERTY_KEYS", () => {
  it("30要素を持つ", () => {
    expect(QWERTY_KEYS).toHaveLength(30);
  });

  it("defaultCustomKeymap のキーセットと完全に一致する", () => {
    const keymapKeys = Object.keys(defaultCustomKeymap).sort();
    const qwertyKeysSorted = [...QWERTY_KEYS].sort();
    expect(qwertyKeysSorted).toEqual(keymapKeys);
  });

  it("各要素が QWERTY 物理位置のキー文字列である", () => {
    const expectedKeys = [
      "q",
      "w",
      "e",
      "r",
      "t",
      "y",
      "u",
      "i",
      "o",
      "p",
      "a",
      "s",
      "d",
      "f",
      "g",
      "h",
      "j",
      "k",
      "l",
      ";",
      "z",
      "x",
      "c",
      "v",
      "b",
      "n",
      "m",
      ",",
      ".",
      "/",
    ];
    expect([...QWERTY_KEYS].sort()).toEqual(expectedKeys.sort());
  });
});

describe("defaultCustomKeymap", () => {
  it("30キー（top row 10 + home row 10 + bottom row 10）を持つ", () => {
    const keys = Object.keys(defaultCustomKeymap);
    expect(keys).toHaveLength(30);
  });
});

describe("invertKeymap", () => {
  it("キーと値を逆引きしたマップを返す", () => {
    const result = invertKeymap({ a: "x", b: "y" });
    expect(result).toEqual({ x: "a", y: "b" });
  });

  it("単一エントリでも正しく逆引きする", () => {
    const result = invertKeymap({ a: "x" });
    expect(result).toEqual({ x: "a" });
  });

  it("空のマップには空のマップを返す", () => {
    const result = invertKeymap({});
    expect(result).toEqual({});
  });

  it("defaultCustomKeymap を逆引きして再逆引きすると元のマップに戻る（双方向性）", () => {
    const inverted = invertKeymap(defaultCustomKeymap);
    const restored = invertKeymap(inverted);
    expect(restored).toEqual(defaultCustomKeymap);
  });
});
