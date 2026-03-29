import type { VimCommandCategory } from "./vim";

/** Vim モード */
export type VimMode = "n" | "v" | "x" | "o" | "i" | "s" | "c" | "t";

/** VimMode の全値リスト */
export const VIM_MODES = [
  "n",
  "v",
  "x",
  "o",
  "i",
  "s",
  "c",
  "t",
] as const satisfies VimMode[];

/** アプリモード */
export type AppMode = "visualize" | "practice" | "reference" | "edit";

/** AppMode の全値リスト */
export const APP_MODES = [
  "visualize",
  "practice",
  "reference",
  "edit",
] as const satisfies AppMode[];

/** バインディングの出自 */
export type KeybindingSource =
  | "default"
  | "layout-derived"
  | "nvim-import"
  | "user-edit";

/** 個別のキーバインディング */
export interface Keybinding {
  /** キーシーケンス ("j", "dd", "<C-f>", "<leader>ff") */
  lhs: string;
  /** VimCommand.key への参照（既知コマンドの場合） */
  commandId?: string;
  /** フリーフォームの右辺（カスタム/プラグインマッピング） */
  rhs?: string;
  /** コマンド名 */
  name: string;
  /** 説明 */
  description: string;
  /** カテゴリ */
  category: VimCommandCategory;
  /** 出自 */
  source: KeybindingSource;
  /** noremap かどうか */
  noremap: boolean;
}

/** キーバインド設定全体 */
export interface KeybindingConfig {
  /** 設定名 */
  name: string;
  /** モードごとのバインディング */
  bindings: Record<VimMode, Keybinding[]>;
  /** 物理キーの表示用カスタムキーマップ（QWERTY → 出力文字） */
  customKeymap?: Record<string, string>;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
}

/** 空のバインディングマップ */
export function emptyBindings(): Record<VimMode, Keybinding[]> {
  return { n: [], v: [], x: [], o: [], i: [], s: [], c: [], t: [] };
}

/** プリセット配列の識別子 */
export type PresetId = "qwerty" | "colemak-dh" | "dvorak" | "colemak";

/** キーボード配列プリセット */
export interface KeybindingPreset {
  id: PresetId;
  name: string;
  description: string;
  keymap: Record<string, string>;
}
