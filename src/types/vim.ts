import type { VimMode } from "./keybinding";

export type { VimMode };

export type VimCommandCategory =
  | "motion"
  | "edit"
  | "search"
  | "insert"
  | "visual"
  | "operator"
  | "textobj"
  | "misc";

/** VimCommandCategory の全値リスト */
export const VIM_COMMAND_CATEGORIES = [
  "motion",
  "edit",
  "search",
  "insert",
  "visual",
  "operator",
  "textobj",
  "misc",
] as const satisfies VimCommandCategory[];

/** 練習モード用カテゴリ（textobj を除く） */
export const VIM_PRACTICE_CATEGORIES: readonly VimCommandCategory[] =
  VIM_COMMAND_CATEGORIES.filter((c) => c !== "textobj");

/** nvim マッピング新規エントリのデフォルトカテゴリ */
export const DEFAULT_NVIM_MAP_CATEGORY: VimCommandCategory = "misc";

// ── Neovim map 連携 ──

export type NvimMapMode = "n" | "x" | "o" | "v" | "s" | "!" | "";

/**
 * NvimMapMode を VimMode[] に展開する。
 * "v" (Visual) は x/s を含み、"!" は i/c、"" は n/v/x/o に展開。
 */
export function expandNvimMapMode(mode: NvimMapMode): VimMode[] {
  switch (mode) {
    case "v":
      return ["v", "x", "s"];
    case "!":
      return ["i", "c"];
    case "":
      return ["n", "v", "x", "o"];
    default:
      return [mode];
  }
}

export type NvimMapSource = "nvim-default" | "plugin" | "user";

export interface NvimMapping {
  mode: NvimMapMode;
  lhs: string;
  rhs: string;
  noremap: boolean;
  description: string;
  source: NvimMapSource;
  sourceDetail: string;
}

/**
 * UI のモードセレクタで選択された activeMode に対して、
 * コマンドの modes 配列がマッチするかを判定する。
 *
 * モード階層:
 * - "v"（Visual+Select）を選択 → "v" または "x"（Visual-exclusive）にマッチ
 * - "s"（Select）を選択 → "s" または "v"（Visual+Select を包含）にマッチ
 * - その他 → 自分自身のみにマッチ
 */
export function matchesVimMode(
  commandModes: VimMode[],
  activeMode: VimMode,
): boolean {
  if (commandModes.length === 0) return false;

  // activeMode="v" は "v"（Visual+Select）と "x"（Visual-exclusive）を包含
  if (activeMode === "v") {
    return commandModes.includes("v") || commandModes.includes("x");
  }

  // activeMode="s" は "s"（Select）と "v"（Visual+Select を包含）にマッチ
  if (activeMode === "s") {
    return commandModes.includes("s") || commandModes.includes("v");
  }

  return commandModes.includes(activeMode);
}

export type VimCommandSource = "hardcoded" | NvimMapSource;

export interface MergedVimCommand extends VimCommand {
  source: VimCommandSource;
  nvimOverride?: boolean;
}

export interface VimCommand {
  /** Vim のキー (QWERTY基準) */
  key: string;
  /** コマンド名 */
  name: string;
  /** 説明 */
  description: string;
  /** カテゴリ */
  category: VimCommandCategory;
  /** 適用モード（省略時は ["n"]） */
  modes?: VimMode[];
}

/** QWERTY キー → カスタム配列キー のマッピング */
export interface KeyMapping {
  /** QWERTY のキー */
  qwerty: string;
  /** カスタム配列で出力されるキー */
  custom: string;
}

/** 練習モードの状態 */
export interface PracticeScore {
  correct: number;
  total: number;
  streak: number;
}

/** キーのハイライト状態 */
export type HighlightState = "target" | "correct" | "incorrect" | "modifier";

/** 修飾キー情報（mod-tap または単独修飾キー） */
export interface ModifierKeyInfo {
  matrixKey: string;
  modifier: "shift" | "ctrl" | "alt" | "gui";
  /** mod-tap の tap 出力。単独修飾キーは null */
  tapKey: string | null;
  /** 表示用ラベル: "a長押し" or "Shift" */
  label: string;
}

/** レイヤーキー情報 */
export interface LayerKeyInfo {
  matrixKey: string;
  layer: number;
  /** LT の tap 出力。MO は null */
  tapKey: string | null;
  /** 表示用ラベル: "space長押し" or "Layer 1" */
  label: string;
}

/** VIA キーマップの拡張解析結果 */
export interface VIAKeymapFull {
  baseKeys: Record<string, string>;
  modifiers: ModifierKeyInfo[];
  layerTaps: LayerKeyInfo[];
  /** レイヤーごとのキーマップ (index=layer番号, matrixKey → outputChar) */
  layerKeys: Record<string, string>[];
}

/** 練習で押すべきキーの組み合わせ */
export interface KeyInputSpec {
  /** ターゲットキーの QWERTY 位置 */
  targetQwertyKey: string;
  modifierInfo?: ModifierKeyInfo;
  layerInfo?: LayerKeyInfo;
  requiresShift: boolean;
  /** ブラウザで受け取る event.key */
  expectedEventKey: string;
  /** 表示用ヒント: "Shift (a長押し) + t" */
  hint: string;
}

/** ハイライト対象キー */
export interface HighlightEntry {
  qwertyKey: string;
  state: HighlightState;
}
