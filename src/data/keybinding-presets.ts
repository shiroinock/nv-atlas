import type { KeybindingPreset } from "../types/keybinding";
import { defaultCustomKeymap, QWERTY_KEYS } from "./keymap";

/** QWERTY パススルーキーマップ（各キーが自身にマップ） */
const QWERTY_KEYMAP = Object.fromEntries(
  QWERTY_KEYS.map((key) => [key, key]),
) satisfies Record<string, string>;

/**
 * Dvorak 標準配列（QWERTY 物理位置 → Dvorak 出力文字）
 *
 * top:    q→', w→,, e→., r→p, t→y, y→f, u→g, i→c, o→r, p→l
 * home:   a→a, s→o, d→e, f→u, g→i, h→d, j→h, k→t, l→n, ;→s
 * bottom: z→;, x→q, c→j, v→k, b→x, n→b, m→m, ,→w, .→v, /→z
 */
const DVORAK_KEYMAP = {
  q: "'",
  w: ",",
  e: ".",
  r: "p",
  t: "y",
  y: "f",
  u: "g",
  i: "c",
  o: "r",
  p: "l",
  a: "a",
  s: "o",
  d: "e",
  f: "u",
  g: "i",
  h: "d",
  j: "h",
  k: "t",
  l: "n",
  ";": "s",
  z: ";",
  x: "q",
  c: "j",
  v: "k",
  b: "x",
  n: "b",
  m: "m",
  ",": "w",
  ".": "v",
  "/": "z",
} satisfies Record<string, string>;

/**
 * Colemak（無印）標準配列（QWERTY 物理位置 → Colemak 出力文字）
 *
 * top:    q→q, w→w, e→f, r→p, t→g, y→j, u→l, i→u, o→y, p→;
 * home:   a→a, s→r, d→s, f→t, g→d, h→h, j→n, k→e, l→i, ;→o
 * bottom: z→z, x→x, c→c, v→v, b→b, n→k, m→m, ,→,, .→., /→/
 */
const COLEMAK_KEYMAP = {
  q: "q",
  w: "w",
  e: "f",
  r: "p",
  t: "g",
  y: "j",
  u: "l",
  i: "u",
  o: "y",
  p: ";",
  a: "a",
  s: "r",
  d: "s",
  f: "t",
  g: "d",
  h: "h",
  j: "n",
  k: "e",
  l: "i",
  ";": "o",
  z: "z",
  x: "x",
  c: "c",
  v: "v",
  b: "b",
  n: "k",
  m: "m",
  ",": ",",
  ".": ".",
  "/": "/",
} satisfies Record<string, string>;

const PRESETS: KeybindingPreset[] = [
  {
    id: "qwerty",
    name: "QWERTY",
    description: "標準 QWERTY 配列",
    keymap: QWERTY_KEYMAP,
  },
  {
    id: "colemak-dh",
    name: "Colemak DH",
    description: "Colemak DH 配列（デフォルトカスタムキーマップ）",
    keymap: defaultCustomKeymap,
  },
  {
    id: "dvorak",
    name: "Dvorak",
    description: "Dvorak 標準配列",
    keymap: DVORAK_KEYMAP,
  },
  {
    id: "colemak",
    name: "Colemak",
    description: "Colemak（無印）標準配列",
    keymap: COLEMAK_KEYMAP,
  },
];

/** 利用可能なキーボード配列プリセット一覧を返す */
export function getPresets(): KeybindingPreset[] {
  return PRESETS;
}
