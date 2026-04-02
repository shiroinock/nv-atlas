export const QWERTY_KEYS = [
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
] as const;

/**
 * QWERTY物理位置 → カスタム配列の出力文字 マッピング
 *
 * キー: QWERTYの物理位置の文字
 * 値: そのキーを押したときに実際に出力される文字（カスタム配列）
 */
export const defaultCustomKeymap: Record<string, string> = {
  // top row
  q: "q",
  w: "l",
  e: "h",
  r: "c",
  t: "f",
  y: "p",
  u: "b",
  i: "u",
  o: ",",
  p: ".",
  // home row
  a: "a",
  s: "n",
  d: "r",
  f: "s",
  g: "w",
  h: "k",
  j: "t",
  k: "e",
  l: "o",
  ";": "i",
  // bottom row
  z: "-",
  x: "z",
  c: "y",
  v: "m",
  b: "v",
  n: "g",
  m: "d",
  ",": "j",
  ".": "x",
  "/": ";",
};

/**
 * カスタム配列の出力文字 → QWERTY物理位置 の逆引き
 */
export function invertKeymap(
  keymap: Record<string, string>,
): Record<string, string> {
  const inverted: Record<string, string> = {};
  for (const [qwerty, custom] of Object.entries(keymap)) {
    inverted[custom] = qwerty;
  }
  return inverted;
}
