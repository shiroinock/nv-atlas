/**
 * Vial プロトコル通信モジュール
 * WebHID API を通じて Vial 対応キーボードと通信する
 */

import type { KLEJSON, VIADefinition } from "../types/keyboard";
import type { VialDevice } from "../types/vial";
import { isKLEJSON, isVIADefinition } from "./kle-parser";

// Vial コマンド定数
const VIAL_CMD_PREFIX = 0xfe;
const VIAL_GET_SIZE = 0x02;
const VIAL_GET_DEF = 0x03;
const DYNAMIC_KEYMAP_GET_BUFFER = 0x12;

// HID レポートサイズ（バイト）
const HID_REPORT_SIZE = 32;
// ヘッダバイト数（コマンド2バイト + offset 2バイト or offset 2 + size 1）
const CHUNK_SIZE = 28;

// USB HID Usage Table に準拠した QMK キーコード → キーコード文字列マッピング
const QMK_KEYCODE_MAP: Record<number, string> = {
  0: "KC_NO",
  // アルファベット (0x0004-0x001D: A-Z)
  4: "KC_A",
  5: "KC_B",
  6: "KC_C",
  7: "KC_D",
  8: "KC_E",
  9: "KC_F",
  10: "KC_G",
  11: "KC_H",
  12: "KC_I",
  13: "KC_J",
  14: "KC_K",
  15: "KC_L",
  16: "KC_M",
  17: "KC_N",
  18: "KC_O",
  19: "KC_P",
  20: "KC_Q",
  21: "KC_R",
  22: "KC_S",
  23: "KC_T",
  24: "KC_U",
  25: "KC_V",
  26: "KC_W",
  27: "KC_X",
  28: "KC_Y",
  29: "KC_Z",
  // 数字 (0x001E-0x0027: 1-0)
  30: "KC_1",
  31: "KC_2",
  32: "KC_3",
  33: "KC_4",
  34: "KC_5",
  35: "KC_6",
  36: "KC_7",
  37: "KC_8",
  38: "KC_9",
  39: "KC_0",
  // 特殊キー
  40: "KC_ENT",
  41: "KC_ESC",
  42: "KC_BSPC",
  43: "KC_TAB",
  44: "KC_SPC",
  45: "KC_MINS",
  46: "KC_EQL",
  47: "KC_LBRC",
  48: "KC_RBRC",
  49: "KC_BSLS",
  51: "KC_SCLN",
  52: "KC_QUOT",
  53: "KC_GRV",
  54: "KC_COMM",
  55: "KC_DOT",
  56: "KC_SLSH",
  57: "KC_CAPS",
  // 矢印キー
  79: "KC_RGHT",
  80: "KC_LEFT",
  81: "KC_DOWN",
  82: "KC_UP",
  // モディファイア
  224: "KC_LCTL",
  225: "KC_LSFT",
  226: "KC_LALT",
  227: "KC_LGUI",
  228: "KC_RCTL",
  229: "KC_RSFT",
  230: "KC_RALT",
  231: "KC_RGUI",
};

/**
 * WebHID API がサポートされているか確認する
 */
export function isWebHIDSupported(): boolean {
  return "hid" in navigator && navigator.hid !== undefined;
}

/**
 * HID コマンドを送信して inputreport イベントで応答を待つ
 * sendReport が reject した場合はエラーを伝播させる
 */
async function sendCommand(
  device: VialDevice,
  data: Uint8Array,
): Promise<DataView> {
  return new Promise((resolve, reject) => {
    const handler = (event: HIDInputReportEvent) => {
      device.hid.removeEventListener("inputreport", handler);
      resolve(event.data);
    };
    device.hid.addEventListener("inputreport", handler);
    // sendReport の失敗を Promise の reject に伝播させる
    Promise.resolve(device.hid.sendReport(0x00, data)).catch((err: unknown) => {
      device.hid.removeEventListener("inputreport", handler);
      reject(err);
    });
  });
}

/**
 * Vial 対応キーボードデバイスに接続する
 */
export async function connectVialDevice(): Promise<VialDevice> {
  if (!isWebHIDSupported()) {
    throw new Error("WebHID is not supported in this browser");
  }

  const devices = await navigator.hid.requestDevice({ filters: [] });

  if (devices.length === 0) {
    throw new Error("No device selected");
  }

  const device = devices[0];

  if (!device.opened) {
    await device.open();
  }

  return {
    hid: device,
    productName: device.productName,
  };
}

/**
 * Vial デバイスとの接続を切断する
 */
export async function disconnectVialDevice(device: VialDevice): Promise<void> {
  if (device.hid.opened) {
    await device.hid.close();
  }
}

/**
 * キーボード定義（KLE JSON）を Vial プロトコルで取得する
 * 1. vial_get_size でデータサイズを取得
 * 2. vial_get_def でチャンク単位にデータを収集
 * 3. gzip 解凍して JSON としてパース
 */
export async function getKeyboardDefinition(
  device: VialDevice,
): Promise<KLEJSON | VIADefinition> {
  // vial_get_size コマンドを送信してデータサイズを取得
  const sizeCmd = new Uint8Array(HID_REPORT_SIZE);
  sizeCmd[0] = VIAL_CMD_PREFIX;
  sizeCmd[1] = VIAL_GET_SIZE;

  const sizeResponse = await sendCommand(device, sizeCmd);

  // 応答の先頭4バイトを LE uint32 としてサイズ取得
  const defSize =
    sizeResponse.getUint8(0) |
    (sizeResponse.getUint8(1) << 8) |
    (sizeResponse.getUint8(2) << 16) |
    (sizeResponse.getUint8(3) << 24);

  if (defSize === 0) {
    throw new Error("Keyboard definition size is 0");
  }

  // vial_get_def でチャンク単位にデータを収集
  const compressedData = new Uint8Array(defSize);
  let offset = 0;

  while (offset < defSize) {
    const remaining = defSize - offset;
    const chunkSize = Math.min(remaining, CHUNK_SIZE);

    const defCmd = new Uint8Array(HID_REPORT_SIZE);
    defCmd[0] = VIAL_CMD_PREFIX;
    defCmd[1] = VIAL_GET_DEF;
    // offset は big-endian で送信（Vial プロトコル仕様）
    defCmd[2] = (offset >> 8) & 0xff;
    defCmd[3] = offset & 0xff;
    defCmd[4] = chunkSize;

    const defResponse = await sendCommand(device, defCmd);

    for (let i = 0; i < chunkSize; i++) {
      compressedData[offset + i] = defResponse.getUint8(i);
    }

    offset += chunkSize;
  }

  // gzip 解凍
  const ds = new DecompressionStream("gzip");
  const writer = ds.writable.getWriter();
  writer.write(compressedData);
  writer.close();

  const reader = ds.readable.getReader();
  const chunks: Uint8Array[] = [];

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    if (value) chunks.push(value);
  }

  // チャンクを結合してテキストデコード
  const totalLength = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const decompressed = new Uint8Array(totalLength);
  let pos = 0;
  for (const chunk of chunks) {
    decompressed.set(chunk, pos);
    pos += chunk.length;
  }

  const jsonText = new TextDecoder().decode(decompressed);
  const parsed: unknown = JSON.parse(jsonText);
  if (isVIADefinition(parsed)) return parsed;
  if (isKLEJSON(parsed)) return parsed;
  throw new Error(
    "Invalid keyboard definition: expected VIA definition or KLE JSON array",
  );
}

/**
 * QMK キーコード数値をキーコード文字列に変換する
 */
function keycodeToString(keycode: number): string {
  if (keycode === 0) return "KC_NO";
  if (keycode === 1) return "KC_TRNS";
  return (
    QMK_KEYCODE_MAP[keycode] ??
    `0x${keycode.toString(16).toUpperCase().padStart(4, "0")}`
  );
}

/**
 * キーマップデータを動的キーマップバッファから取得する
 * @param device - 接続済みの VialDevice
 * @param layers - レイヤー数
 * @param matrixSize - 1レイヤーあたりのキー数
 */
export async function getKeymapData(
  device: VialDevice,
  layers: number,
  matrixSize: number,
): Promise<{ layers: string[][] }> {
  if (layers === 0) {
    return { layers: [] };
  }

  // 全キーマップバッファサイズ（各キーコードは2バイト）
  const totalBytes = layers * matrixSize * 2;
  const buffer = new Uint8Array(totalBytes);
  let offset = 0;

  while (offset < totalBytes) {
    const remaining = totalBytes - offset;
    const chunkSize = Math.min(remaining, CHUNK_SIZE);

    const cmd = new Uint8Array(HID_REPORT_SIZE);
    cmd[0] = DYNAMIC_KEYMAP_GET_BUFFER;
    cmd[1] = (offset >> 8) & 0xff;
    cmd[2] = offset & 0xff;
    cmd[3] = chunkSize;

    const response = await sendCommand(device, cmd);

    for (let i = 0; i < chunkSize; i++) {
      buffer[offset + i] = response.getUint8(i);
    }

    offset += chunkSize;
  }

  // バッファを2バイト big-endian でキーコード数値に変換してレイヤーに分割
  const result: string[][] = [];

  for (let layerIdx = 0; layerIdx < layers; layerIdx++) {
    const layerKeys: string[] = [];

    for (let keyIdx = 0; keyIdx < matrixSize; keyIdx++) {
      const byteOffset = (layerIdx * matrixSize + keyIdx) * 2;
      // big-endian 2バイトをキーコード数値に変換
      const keycode = (buffer[byteOffset] << 8) | buffer[byteOffset + 1];
      layerKeys.push(keycodeToString(keycode));
    }

    result.push(layerKeys);
  }

  return { layers: result };
}
