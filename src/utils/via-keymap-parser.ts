/**
 * VIA からエクスポートされたキーマップ JSON をパースし、
 * マトリクス座標 → キー名 のマッピングを生成する
 *
 * VIA キーマップ形式:
 * { name, layers: [["KC_TAB", "KC_Q", ...], ...], macros, encoders }
 */

import type { ModifierKeyInfo, LayerKeyInfo, VIAKeymapFull } from "../types/vim";

/** QMK キーコード → キー名 */
const qmkToKey: Record<string, string> = {
  // アルファベット
  KC_A: "a", KC_B: "b", KC_C: "c", KC_D: "d", KC_E: "e",
  KC_F: "f", KC_G: "g", KC_H: "h", KC_I: "i", KC_J: "j",
  KC_K: "k", KC_L: "l", KC_M: "m", KC_N: "n", KC_O: "o",
  KC_P: "p", KC_Q: "q", KC_R: "r", KC_S: "s", KC_T: "t",
  KC_U: "u", KC_V: "v", KC_W: "w", KC_X: "x", KC_Y: "y",
  KC_Z: "z",
  // 数字
  KC_1: "1", KC_2: "2", KC_3: "3", KC_4: "4", KC_5: "5",
  KC_6: "6", KC_7: "7", KC_8: "8", KC_9: "9", KC_0: "0",
  // 記号
  KC_MINS: "-", KC_MINUS: "-",
  KC_EQL: "=", KC_EQUAL: "=",
  KC_LBRC: "[", KC_RBRC: "]",
  KC_BSLS: "\\", KC_BACKSLASH: "\\",
  KC_SCLN: ";", KC_SEMICOLON: ";",
  KC_QUOT: "'", KC_QUOTE: "'",
  KC_GRV: "`", KC_GRAVE: "`",
  KC_COMM: ",", KC_COMMA: ",",
  KC_DOT: ".", KC_PERIOD: ".",
  KC_SLSH: "/", KC_SLASH: "/",
  // 特殊キー
  KC_SPC: "space", KC_SPACE: "space",
  KC_ENT: "enter", KC_ENTER: "enter",
  KC_TAB: "tab",
  KC_BSPC: "bksp", KC_BACKSPACE: "bksp",
  KC_ESC: "esc", KC_ESCAPE: "esc",
  KC_DEL: "del", KC_DELETE: "del",
  KC_CAPS: "caps",
  // モディファイア
  KC_LSFT: "shift", KC_RSFT: "shift_r",
  KC_LCTL: "ctrl", KC_RCTL: "ctrl_r",
  KC_LALT: "alt", KC_RALT: "alt_r",
  KC_LGUI: "gui", KC_RGUI: "gui_r",
  // 矢印
  KC_LEFT: "left", KC_DOWN: "down", KC_UP: "up", KC_RGHT: "right",
  KC_HOME: "home", KC_END: "end",
  KC_PGUP: "pgup", KC_PGDN: "pgdn",
  // 印刷画面
  KC_PSCR: "pscr",
};

/** ベースキー → Shift 時の出力文字 (US レイアウト) */
export const shiftMap: Record<string, string> = {
  "1": "!", "2": "@", "3": "#", "4": "$", "5": "%",
  "6": "^", "7": "&", "8": "*", "9": "(", "0": ")",
  "-": "_", "=": "+", "[": "{", "]": "}", "\\": "|",
  ";": ":", "'": '"', "`": "~", ",": "<", ".": ">", "/": "?",
};

/** Shift 文字 → ベースキー の逆引き */
export const inverseShiftMap: Record<string, string> = Object.fromEntries(
  Object.entries(shiftMap).map(([base, shifted]) => [shifted, base])
);

/**
 * QMK キーコードを解析して基本キー名を返す
 * MT(), LT(), LSFT_T() 等のラッパーも tap 時のキーを抽出
 */
function resolveKeycode(keycode: string): string | null {
  // そのまま引ける場合
  if (qmkToKey[keycode] !== undefined) return qmkToKey[keycode];

  // MT(MOD_xxx, KC_xxx) - Mod-Tap
  const mtMatch = keycode.match(/^MT\([^,]+,\s*(KC_\w+)\)$/);
  if (mtMatch) return qmkToKey[mtMatch[1]] ?? null;

  // LT(layer, KC_xxx) - Layer-Tap
  const ltMatch = keycode.match(/^LT\(\d+,\s*(KC_\w+)\)$/);
  if (ltMatch) return qmkToKey[ltMatch[1]] ?? null;

  // LSFT_T(KC_xxx), LCTL_T(KC_xxx) 等 - Mod-Tap shorthand
  const modTapMatch = keycode.match(/^[LR](?:SFT|CTL|ALT|GUI)_T\((KC_\w+)\)$/);
  if (modTapMatch) return qmkToKey[modTapMatch[1]] ?? null;

  // S(KC_xxx) - Shifted key
  const shiftMatch = keycode.match(/^S\((KC_\w+)\)$/);
  if (shiftMatch) {
    const baseKey = qmkToKey[shiftMatch[1]] ?? null;
    if (baseKey && baseKey.length === 1) {
      // 文字なら大文字化、記号なら shiftMap で変換
      if (/^[a-z]$/.test(baseKey)) return baseKey.toUpperCase();
      return shiftMap[baseKey] ?? null;
    }
    return null;
  }

  // MO(layer), TG(layer), TO(layer), TT(layer), OSL(layer), DF(layer)
  if (/^(?:MO|TG|TO|TT|OSL|DF)\(\d+\)$/.test(keycode)) return null;

  // MACRO(n)
  if (/^MACRO\(\d+\)$/.test(keycode)) return null;

  // KC_NO, KC_TRNS
  if (keycode === "KC_NO" || keycode === "KC_TRNS" || keycode === "_______") return null;

  // IME キー
  if (keycode === "KC_HANJ" || keycode === "KC_HAEN") return null;

  return null;
}

/**
 * QMK キーコードから修飾キー情報を抽出
 */
function extractModifier(keycode: string, matrixKey: string): ModifierKeyInfo | null {
  // 単独修飾キー
  const standaloneModMap: Record<string, { modifier: ModifierKeyInfo["modifier"]; side: string }> = {
    KC_LSFT: { modifier: "shift", side: "L" },
    KC_RSFT: { modifier: "shift", side: "R" },
    KC_LCTL: { modifier: "ctrl", side: "L" },
    KC_RCTL: { modifier: "ctrl", side: "R" },
    KC_LALT: { modifier: "alt", side: "L" },
    KC_RALT: { modifier: "alt", side: "R" },
    KC_LGUI: { modifier: "gui", side: "L" },
    KC_RGUI: { modifier: "gui", side: "R" },
  };

  if (standaloneModMap[keycode]) {
    const { modifier } = standaloneModMap[keycode];
    return { matrixKey, modifier, tapKey: null, label: modifier };
  }

  // MT(MOD_xxx, KC_xxx) - Mod-Tap
  const mtMatch = keycode.match(/^MT\((MOD_[LR]?(?:SFT|CTL|ALT|GUI))[^,]*,\s*(KC_\w+)\)$/);
  if (mtMatch) {
    const modifier = parseModName(mtMatch[1]);
    const tapKey = qmkToKey[mtMatch[2]] ?? null;
    if (modifier && tapKey) {
      return { matrixKey, modifier, tapKey, label: `${tapKey}長押し` };
    }
  }

  // LSFT_T(KC_xxx) shorthand
  const modTapMatch = keycode.match(/^([LR])(SFT|CTL|ALT|GUI)_T\((KC_\w+)\)$/);
  if (modTapMatch) {
    const modifier = parseModShorthand(modTapMatch[2]);
    const tapKey = qmkToKey[modTapMatch[3]] ?? null;
    if (modifier && tapKey) {
      return { matrixKey, modifier, tapKey, label: `${tapKey}長押し` };
    }
  }

  return null;
}

function parseModName(modName: string): ModifierKeyInfo["modifier"] | null {
  if (modName.includes("SFT")) return "shift";
  if (modName.includes("CTL")) return "ctrl";
  if (modName.includes("ALT")) return "alt";
  if (modName.includes("GUI")) return "gui";
  return null;
}

function parseModShorthand(shorthand: string): ModifierKeyInfo["modifier"] | null {
  const map: Record<string, ModifierKeyInfo["modifier"]> = {
    SFT: "shift", CTL: "ctrl", ALT: "alt", GUI: "gui",
  };
  return map[shorthand] ?? null;
}

/**
 * QMK キーコードからレイヤーキー情報を抽出
 */
function extractLayerKey(keycode: string, matrixKey: string): LayerKeyInfo | null {
  // LT(layer, KC_xxx) - Layer-Tap
  const ltMatch = keycode.match(/^LT\((\d+),\s*(KC_\w+)\)$/);
  if (ltMatch) {
    const layer = parseInt(ltMatch[1]);
    const tapKey = qmkToKey[ltMatch[2]] ?? null;
    const label = tapKey ? `${tapKey}長押し` : `Layer ${layer}`;
    return { matrixKey, layer, tapKey, label };
  }

  // MO(layer)
  const moMatch = keycode.match(/^MO\((\d+)\)$/);
  if (moMatch) {
    const layer = parseInt(moMatch[1]);
    return { matrixKey, layer, tapKey: null, label: `Layer ${layer}` };
  }

  return null;
}

export interface VIAKeymap {
  layers: string[][];
}

/**
 * VIA キーマップ JSON + マトリクスカラム数から
 * マトリクス座標 → キー名 のマッピングを生成（ベースレイヤーのみ）
 */
export function parseVIAKeymap(
  json: unknown,
  matrixCols: number
): Record<string, string> {
  const keymap = json as VIAKeymap;
  if (!keymap.layers || !Array.isArray(keymap.layers) || keymap.layers.length === 0) {
    throw new Error("Invalid VIA keymap: missing layers array");
  }

  const baseLayer = keymap.layers[0];
  const result: Record<string, string> = {};

  for (let i = 0; i < baseLayer.length; i++) {
    const row = Math.floor(i / matrixCols);
    const col = i % matrixCols;
    const matrixKey = `${row},${col}`;
    const keyName = resolveKeycode(baseLayer[i]);
    if (keyName) {
      result[matrixKey] = keyName;
    }
  }

  return result;
}

/**
 * VIA キーマップの拡張解析
 * ベースレイヤーのキーマップ + 修飾キー + レイヤーキー + 全レイヤーのキーマップ
 */
export function parseVIAKeymapFull(
  json: unknown,
  matrixCols: number
): VIAKeymapFull {
  const keymap = json as VIAKeymap;
  if (!keymap.layers || !Array.isArray(keymap.layers) || keymap.layers.length === 0) {
    throw new Error("Invalid VIA keymap: missing layers array");
  }

  const baseKeys: Record<string, string> = {};
  const modifiers: ModifierKeyInfo[] = [];
  const layerTaps: LayerKeyInfo[] = [];
  const layerKeys: Record<string, string>[] = [];

  // ベースレイヤー解析
  const baseLayer = keymap.layers[0];
  for (let i = 0; i < baseLayer.length; i++) {
    const row = Math.floor(i / matrixCols);
    const col = i % matrixCols;
    const matrixKey = `${row},${col}`;
    const rawKeycode = baseLayer[i];

    // タップ時のキー名
    const keyName = resolveKeycode(rawKeycode);
    if (keyName) {
      baseKeys[matrixKey] = keyName;
    }

    // 修飾キー抽出
    const modInfo = extractModifier(rawKeycode, matrixKey);
    if (modInfo) modifiers.push(modInfo);

    // レイヤーキー抽出
    const layerInfo = extractLayerKey(rawKeycode, matrixKey);
    if (layerInfo) layerTaps.push(layerInfo);
  }

  // 上位レイヤー解析
  for (let layerIdx = 1; layerIdx < keymap.layers.length; layerIdx++) {
    const layer = keymap.layers[layerIdx];
    const keys: Record<string, string> = {};

    for (let i = 0; i < layer.length; i++) {
      const row = Math.floor(i / matrixCols);
      const col = i % matrixCols;
      const matrixKey = `${row},${col}`;
      const keyName = resolveKeycode(layer[i]);
      if (keyName) {
        keys[matrixKey] = keyName;
      }
    }

    layerKeys.push(keys);
  }

  return { baseKeys, modifiers, layerTaps, layerKeys };
}
