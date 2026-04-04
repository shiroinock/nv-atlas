/**
 * `<Plug>` マッピングかどうかを判定する
 */
export function isPlugMapping(lhs: string): boolean {
  return lhs.startsWith("<Plug>");
}
