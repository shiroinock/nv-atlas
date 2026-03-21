import type { VimCommand, NvimMapping, MergedVimCommand } from "../types/vim";

/**
 * ハードコードの Vim コマンドと nvim の実マッピングをマージする
 */
export function mergeWithNvimMaps(
  hardcoded: VimCommand[],
  nvimMaps: NvimMapping[],
): MergedVimCommand[] {
  // ハードコード側のキー → コマンド索引
  const hardcodedByKey = new Map<string, VimCommand>();
  for (const cmd of hardcoded) {
    hardcodedByKey.set(cmd.key, cmd);
  }

  // 結果: まずハードコードを全部入れる
  const merged: MergedVimCommand[] = hardcoded.map((cmd) => ({
    ...cmd,
    source: "hardcoded" as const,
  }));

  const addedKeys = new Set(hardcoded.map((c) => c.key));

  // nvim マップから normal mode のみ取り込む
  const normalMaps = nvimMaps.filter(
    (m) => m.mode === "n" && !m.lhs.startsWith("<Plug>")
  );

  for (const nvMap of normalMaps) {
    const key = normalizeNvimKey(nvMap.lhs);

    if (addedKeys.has(key)) {
      // 既存コマンドにマッチ → source 情報を更新
      const existing = merged.find((c) => c.key === key);
      if (existing && existing.source === "hardcoded") {
        existing.source = nvMap.source;
        existing.nvimOverride = true;
      }
    } else {
      // 新規エントリ
      const description = cleanDescription(nvMap.description);
      if (!description) continue; // description なしはスキップ

      merged.push({
        key,
        name: key,
        description,
        category: "misc",
        source: nvMap.source,
      });
      addedKeys.add(key);
    }
  }

  return merged;
}

/**
 * nvim の lhs キー表記を vim-commands.ts の key 形式に正規化
 */
function normalizeNvimKey(lhs: string): string {
  // <C-X> → <C-x> に統一
  return lhs.replace(/<C-(\w)>/gi, (_, ch: string) => `<C-${ch.toLowerCase()}>`);
}

/**
 * nvim の description をクリーンアップ
 */
function cleanDescription(desc: string): string {
  if (!desc) return "";
  // ":help xxx-default" 形式は Vim デフォルトの説明参照なのでそのまま
  if (desc.startsWith(":help ")) return desc;
  return desc;
}
