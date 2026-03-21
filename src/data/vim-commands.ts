import type { VimCommand } from "../types/vim";
import { inverseShiftMap } from "../utils/via-keymap-parser";

/**
 * Vim ノーマルモードの主要コマンド一覧
 * key は QWERTY 基準
 */
export const vimCommands: VimCommand[] = [
  // === Motion ===
  { key: "h", name: "←", description: "左に移動", category: "motion" },
  { key: "j", name: "↓", description: "下に移動", category: "motion" },
  { key: "k", name: "↑", description: "上に移動", category: "motion" },
  { key: "l", name: "→", description: "右に移動", category: "motion" },
  { key: "w", name: "word→", description: "次の単語の先頭へ", category: "motion" },
  { key: "b", name: "word←", description: "前の単語の先頭へ", category: "motion" },
  { key: "e", name: "end→", description: "単語の末尾へ", category: "motion" },
  { key: "0", name: "行頭", description: "行頭に移動", category: "motion" },
  { key: "$", name: "行末", description: "行末に移動", category: "motion" },
  { key: "^", name: "行頭(非空白)", description: "行頭の非空白文字に移動", category: "motion" },
  { key: "gg", name: "先頭行", description: "ファイルの先頭行に移動", category: "motion" },
  { key: "G", name: "最終行", description: "ファイルの最終行に移動", category: "motion" },
  { key: "f", name: "find→", description: "行内で指定文字まで移動", category: "motion" },
  { key: "t", name: "till→", description: "行内で指定文字の手前まで移動", category: "motion" },
  { key: "F", name: "find←", description: "行内で指定文字まで逆方向に移動", category: "motion" },
  { key: "T", name: "till←", description: "行内で指定文字の手前まで逆方向に移動", category: "motion" },
  { key: "%", name: "対応括弧", description: "対応する括弧に移動", category: "motion" },
  { key: "{", name: "段落↑", description: "前の段落に移動", category: "motion" },
  { key: "}", name: "段落↓", description: "次の段落に移動", category: "motion" },

  // === Operator ===
  { key: "d", name: "delete", description: "削除（モーションと組み合わせ: dw, dd 等）", category: "operator" },
  { key: "c", name: "change", description: "削除してインサートモードへ（cw, cc 等）", category: "operator" },
  { key: "y", name: "yank", description: "ヤンク/コピー（yw, yy 等）", category: "operator" },
  { key: ">", name: "indent→", description: "インデントを増やす", category: "operator" },
  { key: "<", name: "indent←", description: "インデントを減らす", category: "operator" },

  // === Edit ===
  { key: "x", name: "1字削除", description: "カーソル位置の1文字を削除", category: "edit" },
  { key: "X", name: "1字削除←", description: "カーソルの左の1文字を削除", category: "edit" },
  { key: "r", name: "replace", description: "カーソル位置の1文字を置換", category: "edit" },
  { key: "p", name: "paste↓", description: "カーソルの後ろ/下にペースト", category: "edit" },
  { key: "P", name: "paste↑", description: "カーソルの前/上にペースト", category: "edit" },
  { key: "u", name: "undo", description: "元に戻す", category: "edit" },
  { key: "J", name: "join", description: "次の行を現在の行に結合", category: "edit" },
  { key: "~", name: "大小変換", description: "大文字/小文字を切り替え", category: "edit" },
  { key: ".", name: "繰り返し", description: "直前の変更コマンドを繰り返す", category: "edit" },

  // === Insert ===
  { key: "i", name: "insert", description: "カーソル位置でインサートモードへ", category: "insert" },
  { key: "I", name: "Insert行頭", description: "行頭でインサートモードへ", category: "insert" },
  { key: "a", name: "append", description: "カーソルの後ろでインサートモードへ", category: "insert" },
  { key: "A", name: "Append行末", description: "行末でインサートモードへ", category: "insert" },
  { key: "o", name: "open↓", description: "下に行を挿入してインサートモードへ", category: "insert" },
  { key: "O", name: "Open↑", description: "上に行を挿入してインサートモードへ", category: "insert" },
  { key: "s", name: "substitute", description: "1文字削除してインサートモードへ", category: "insert" },

  // === Search ===
  { key: "/", name: "検索→", description: "前方検索", category: "search" },
  { key: "?", name: "検索←", description: "後方検索", category: "search" },
  { key: "n", name: "次の一致", description: "次の検索結果に移動", category: "search" },
  { key: "N", name: "前の一致", description: "前の検索結果に移動", category: "search" },
  { key: "*", name: "単語検索→", description: "カーソル下の単語を前方検索", category: "search" },
  { key: "#", name: "単語検索←", description: "カーソル下の単語を後方検索", category: "search" },

  // === Visual ===
  { key: "v", name: "visual", description: "文字単位ビジュアルモード", category: "visual" },
  { key: "V", name: "Visual行", description: "行単位ビジュアルモード", category: "visual" },

  // === Misc ===
  { key: ":", name: "コマンド", description: "コマンドラインモードへ", category: "misc" },
  { key: "g", name: "g prefix", description: "gコマンドのプレフィックス（gg, gd 等）", category: "misc" },
  { key: "z", name: "z prefix", description: "zコマンドのプレフィックス（zz, zt 等）", category: "misc" },
  { key: "m", name: "mark", description: "マークを設定", category: "misc" },
  { key: "q", name: "マクロ記録", description: "マクロの記録開始/停止", category: "misc" },
  { key: "@", name: "マクロ実行", description: "マクロを実行", category: "misc" },
];

/**
 * QWERTY キー → VimCommand の引き当て（単一キーのみ）
 */
export function getVimCommandByKey(key: string): VimCommand | undefined {
  return vimCommands.find((cmd) => cmd.key === key);
}

/** カテゴリ別の色 */
export const categoryColors: Record<string, string> = {
  motion: "#4fc3f7",
  edit: "#ff8a65",
  search: "#aed581",
  insert: "#ce93d8",
  visual: "#fff176",
  operator: "#f48fb1",
  misc: "#90a4ae",
};

export const categoryLabels: Record<string, string> = {
  motion: "移動",
  edit: "編集",
  search: "検索",
  insert: "挿入",
  visual: "ビジュアル",
  operator: "オペレータ",
  misc: "その他",
};

/**
 * Vim キーを Shift 分解する
 * "G" → { base: "g", shifted: true }
 * "$" → { base: "4", shifted: true }
 * "j" → { base: "j", shifted: false }
 */
export function decomposeVimKey(key: string): { base: string; shifted: boolean } {
  if (key.length !== 1) return { base: key, shifted: false };

  // 大文字アルファベット
  if (/^[A-Z]$/.test(key)) {
    return { base: key.toLowerCase(), shifted: true };
  }

  // Shift 記号 → ベースキーに分解
  if (inverseShiftMap[key]) {
    return { base: inverseShiftMap[key], shifted: true };
  }

  return { base: key, shifted: false };
}
