import { describe, expect, it } from "vitest";
import { isVialDevice } from "./vial";

// ============================================================
// isVialDevice 型ガード
// ============================================================

describe("isVialDevice", () => {
  it("有効な VialDevice オブジェクトで true を返す", () => {
    const vialDevice = {
      hid: {} as HIDDevice,
      productName: "Test Keyboard",
    };

    expect(isVialDevice(vialDevice)).toBe(true);
  });

  it("hid フィールドが欠落している場合 false を返す", () => {
    const withoutHid = {
      productName: "Test Keyboard",
    };

    expect(isVialDevice(withoutHid)).toBe(false);
  });

  it("productName フィールドが欠落している場合 false を返す", () => {
    const withoutProductName = {
      hid: {} as HIDDevice,
    };

    expect(isVialDevice(withoutProductName)).toBe(false);
  });

  it("productName が string でない場合 false を返す", () => {
    const withInvalidProductName = {
      hid: {} as HIDDevice,
      productName: 42,
    };

    expect(isVialDevice(withInvalidProductName)).toBe(false);
  });

  it("hid が null の場合 false を返す", () => {
    const withNullHid = {
      hid: null,
      productName: "Test Keyboard",
    };

    expect(isVialDevice(withNullHid)).toBe(false);
  });

  it("null の場合 false を返す", () => {
    expect(isVialDevice(null)).toBe(false);
  });

  it("undefined の場合 false を返す", () => {
    expect(isVialDevice(undefined)).toBe(false);
  });

  it("プリミティブ値の場合 false を返す", () => {
    expect(isVialDevice("string")).toBe(false);
    expect(isVialDevice(42)).toBe(false);
    expect(isVialDevice(true)).toBe(false);
  });

  it("空オブジェクトの場合 false を返す", () => {
    expect(isVialDevice({})).toBe(false);
  });
});
