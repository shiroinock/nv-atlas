// 修飾キー名 → Vim 表記プレフィックスの対応
const MODIFIER_PREFIX_MAP: Record<string, string> = {
  Control: "C",
  Shift: "S",
  Alt: "A",
  Meta: "M",
};

const MODIFIER_KEYS = new Set(Object.keys(MODIFIER_PREFIX_MAP));

// KeyboardEvent の key 値から Vim 表記への特殊キーマッピング
const SPECIAL_KEY_MAP: Record<string, string> = {
  Enter: "CR",
  Escape: "Esc",
  Tab: "Tab",
  " ": "Space",
  Backspace: "BS",
  Delete: "Del",
  ArrowUp: "Up",
  ArrowDown: "Down",
  ArrowLeft: "Left",
  ArrowRight: "Right",
};

/**
 * KeyboardEvent を Vim 表記文字列に変換する。
 * 修飾キー単体は空文字列、特殊キーや修飾付きキーは <...> 形式で囲む。
 */
export function normalizeKeyEvent(e: KeyboardEvent): string {
  // 修飾キー単体はイベントとして無視
  if (MODIFIER_KEYS.has(e.key)) {
    return "";
  }

  const specialKey = SPECIAL_KEY_MAP[e.key];
  const keyPart = specialKey ?? e.key;
  const isSpecial = specialKey !== undefined;

  // 修飾プレフィックスを C, S, A, M の順で構築
  const modifierFlags: [boolean, string][] = [
    [e.ctrlKey, MODIFIER_PREFIX_MAP.Control],
    [
      e.shiftKey && (isSpecial || e.ctrlKey || e.altKey || e.metaKey),
      MODIFIER_PREFIX_MAP.Shift,
    ],
    [e.altKey, MODIFIER_PREFIX_MAP.Alt],
    [e.metaKey, MODIFIER_PREFIX_MAP.Meta],
  ];
  const modifiers = modifierFlags
    .filter(([active]) => active)
    .map(([, prefix]) => prefix);

  const hasModifiers = modifiers.length > 0;

  // 修飾キーあり、または特殊キーの場合は <...> 形式で返す
  if (hasModifiers || isSpecial) {
    const prefix = hasModifiers ? `${modifiers.join("-")}-` : "";
    return `<${prefix}${keyPart}>`;
  }

  return keyPart;
}
