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
