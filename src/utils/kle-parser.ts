import type {
  KeyboardLayout,
  KeyData,
  KLEJSON,
  KLEKeyProperties,
  VIADefinition,
} from "../types/keyboard";

/**
 * KLE ラベルからレイアウトオプション情報を抽出する
 *
 * VIA の KLE ラベルは改行区切りで:
 * - position 0 (top-left): マトリクス座標 "row,col"
 * - position 3 (bottom-right): レイアウトオプション "option,choice"
 * - position 9 (center): エンコーダID "e0" 等
 */
function parseKLELabel(raw: string): {
  label: string;
  layoutOption: number | null;
  layoutChoice: number | null;
} {
  const parts = raw.split("\n");
  const label = parts[0] || raw;

  // position 3 = bottom-right = layout option
  const optionStr = parts[3] || "";
  const optionMatch = optionStr.match(/^(\d+),(\d+)$/);

  if (optionMatch) {
    return {
      label,
      layoutOption: parseInt(optionMatch[1], 10),
      layoutChoice: parseInt(optionMatch[2], 10),
    };
  }

  return { label, layoutOption: null, layoutChoice: null };
}

/**
 * KLE JSON をパースして内部レイアウトデータに変換する
 */
export function parseKLE(
  kle: KLEJSON,
  name: string = "Keyboard",
): KeyboardLayout {
  const keys: KeyData[] = [];

  let currentX = 0;
  let currentY = 0;
  let currentColor = "#cccccc";
  let currentTextColor = "#000000";

  let nextW = 1;
  let nextH = 1;

  // 回転
  let currentR = 0;
  let currentRX = 0;
  let currentRY = 0;

  for (const row of kle) {
    for (const item of row) {
      if (typeof item === "string") {
        const { label, layoutChoice } = parseKLELabel(item);

        // レイアウトオプション: choice 0（デフォルト）のみ表示、それ以外はスキップ
        if (layoutChoice !== null && layoutChoice !== 0) {
          // スキップするがカーソルは進める
          currentX += nextW;
          nextW = 1;
          nextH = 1;
          continue;
        }

        keys.push({
          x: currentX,
          y: currentY,
          w: nextW,
          h: nextH,
          r: currentR,
          rx: currentRX,
          ry: currentRY,
          label,
          color: currentColor,
          textColor: currentTextColor,
        });

        currentX += nextW;
        nextW = 1;
        nextH = 1;
      } else {
        const props = item as KLEKeyProperties;

        // 回転の処理
        if (
          props.r !== undefined ||
          props.rx !== undefined ||
          props.ry !== undefined
        ) {
          if (props.rx !== undefined) currentRX = props.rx;
          if (props.ry !== undefined) currentRY = props.ry;
          if (props.r !== undefined) currentR = props.r;
          currentX = currentRX;
          currentY = currentRY;
        }

        // x, y は累積的にカーソルを動かす
        if (props.y !== undefined) currentY += props.y;
        if (props.x !== undefined) currentX += props.x;

        if (props.w !== undefined) nextW = props.w;
        if (props.h !== undefined) nextH = props.h;
        if (props.c !== undefined) currentColor = props.c;
        if (props.t !== undefined) currentTextColor = props.t;
      }
    }
    // 行末: Y を1つ下げ、X をリセット
    currentY += 1;
    currentX = currentR !== 0 ? currentRX : 0;
  }

  return { keys, name };
}

/**
 * VIA 定義 JSON またはKLE JSONをパースする
 */
export function parseVIAorKLE(json: unknown): KeyboardLayout {
  if (isVIADefinition(json)) {
    return parseKLE(json.layouts.keymap, json.name);
  }
  if (Array.isArray(json)) {
    return parseKLE(json as KLEJSON);
  }
  throw new Error(
    "Unsupported JSON format: expected VIA definition or KLE array",
  );
}

export function isVIADefinition(json: unknown): json is VIADefinition {
  if (typeof json !== "object" || json === null) return false;
  if (!("name" in json) || typeof json.name !== "string") return false;
  if (!("layouts" in json)) return false;
  const layouts = json.layouts;
  if (typeof layouts !== "object" || layouts === null) return false;
  if (!("keymap" in layouts)) return false;
  return isKLEJSON(layouts.keymap);
}

export function isKLEJSON(json: unknown): json is KLEJSON {
  if (!Array.isArray(json)) return false;
  return json.every((row) => Array.isArray(row));
}
