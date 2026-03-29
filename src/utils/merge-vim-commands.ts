import type { VimMode } from "../types/keybinding";
import type { MergedVimCommand, NvimMapping, VimCommand } from "../types/vim";
import { expandNvimMapMode } from "../types/vim";

/**
 * ハードコードの Vim コマンドと nvim の実マッピングをマージする
 */
export function mergeWithNvimMaps(
  hardcoded: VimCommand[],
  nvimMaps: NvimMapping[],
): MergedVimCommand[] {
  // 結果: まずハードコードを全部入れる
  const merged: MergedVimCommand[] = hardcoded.map(
    (cmd): MergedVimCommand => ({
      ...cmd,
      source: "hardcoded",
    }),
  );

  // 新規追加エントリのユニーク性キー: "key:modesJson"
  // ハードコード側のキーは modes が undefined のものもあるため別管理
  const addedNewEntryKeys = new Set<string>();

  // <Plug> で始まるマップは全モードでスキップ
  const validMaps = nvimMaps.filter((m) => !m.lhs.startsWith("<Plug>"));

  for (const nvMap of validMaps) {
    const key = normalizeNvimKey(nvMap.lhs);
    const expandedModes = expandNvimMapMode(nvMap.mode);

    // 既存エントリ（ハードコード + 追加済み）を探す
    const existing = findMatchingEntry(merged, key, expandedModes);

    if (existing) {
      // 既存エントリにマッチ → source が hardcoded の場合のみ更新
      if (existing.source === "hardcoded") {
        existing.source = nvMap.source;
        existing.nvimOverride = true;
      }
    } else {
      // 新規エントリ: 同キー・同モードの重複チェック
      const newEntryKey = makeEntryKey(key, expandedModes);
      if (addedNewEntryKeys.has(newEntryKey)) continue;

      const description = nvMap.description;
      if (!description) continue; // description なしはスキップ

      merged.push({
        key,
        name: key,
        description,
        category: "misc",
        source: nvMap.source,
        modes: expandedModes,
      });
      addedNewEntryKeys.add(newEntryKey);
    }
  }

  return merged;
}

/**
 * キーとモードの組み合わせからエントリのユニーク性キーを生成する
 */
function makeEntryKey(key: string, modes: VimMode[]): string {
  return `${key}:${[...modes].sort().join(",")}`;
}

/**
 * マージ済みエントリから、キーとモードが一致するエントリを探す。
 * VimCommand.modes がある場合はモードの交差で照合する。
 * modes が undefined のエントリはキーのみで照合する（後方互換）。
 */
function findMatchingEntry(
  merged: MergedVimCommand[],
  key: string,
  expandedModes: VimMode[],
): MergedVimCommand | undefined {
  return merged.find((c) => {
    if (c.key !== key) return false;
    if (c.modes === undefined) {
      // modes 未設定のエントリはノーマルモード相当として照合
      return expandedModes.includes("n");
    }
    // modes がある場合は expandedModes と交差があるかで照合
    return c.modes.some((m) => expandedModes.includes(m));
  });
}

/**
 * nvim の lhs キー表記を vim-commands.ts の key 形式に正規化
 */
function normalizeNvimKey(lhs: string): string {
  // <C-X> → <C-x> に統一
  return lhs.replace(
    /<C-(\w)>/gi,
    (_, ch: string) => `<C-${ch.toLowerCase()}>`,
  );
}
