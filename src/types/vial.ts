/**
 * Vial プロトコル通信モジュールの型定義
 */

export interface VialDevice {
  hid: HIDDevice;
  productName: string;
}

/**
 * 値が VialDevice インターフェースを満たすか検証する型ガード
 */
export function isVialDevice(value: unknown): value is VialDevice {
  if (value === null || typeof value !== "object") {
    return false;
  }

  const obj = value as Record<string, unknown>;

  if (
    obj.hid === null ||
    obj.hid === undefined ||
    typeof obj.hid !== "object"
  ) {
    return false;
  }

  if (typeof obj.productName !== "string") {
    return false;
  }

  return true;
}
