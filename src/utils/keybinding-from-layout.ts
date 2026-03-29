import { invertKeymap } from "../data/keymap";
import { decomposeVimKey, vimCommands } from "../data/vim-commands";
import type { Keybinding, KeybindingConfig } from "../types/keybinding";
import { emptyBindings } from "../types/keybinding";
import type { VimCommand } from "../types/vim";
import { CURRENT_KEYBINDING_VERSION } from "./storage";

/**
 * カスタム配列から KeybindingConfig を生成する。
 *
 * 現行の langmap 的ロジック:
 * 1. customKeymap を反転（出力文字 → QWERTY 物理位置）
 * 2. 各 VimCommand のキー（QWERTY 基準）を反転マップで引いて、
 *    カスタム配列上の物理キーに対応する lhs を算出
 *
 * 例: Colemak で j→t なら、Vim の "j"(下移動) は
 *     カスタム配列の "t" キーで実行される → lhs = "t"
 */
export function deriveFromLayout(
  customKeymap: Record<string, string>,
  commands: VimCommand[] = vimCommands,
  name = "Layout Derived",
): KeybindingConfig {
  const inverse = invertKeymap(customKeymap);
  const bindings = emptyBindings();

  bindings.n = commands.map((cmd): Keybinding => {
    const { base, shifted } = decomposeVimKey(cmd.key);
    // 単一文字キーの場合、カスタム配列上の対応キーを lhs にする
    const customChar = base.length === 1 ? (inverse[base] ?? base) : base;
    const lhs = shifted
      ? customChar.toUpperCase() === customChar && customChar.length === 1
        ? customChar.toUpperCase()
        : customChar
      : customChar;

    return {
      lhs: cmd.key.length > 1 && !cmd.key.startsWith("<") ? cmd.key : lhs,
      commandId: cmd.key,
      rhs: cmd.key,
      name: cmd.name,
      description: cmd.description,
      category: cmd.category,
      source: "layout-derived",
      noremap: true,
    };
  });

  const now = new Date().toISOString();
  return {
    version: CURRENT_KEYBINDING_VERSION,
    name,
    bindings,
    customKeymap,
    createdAt: now,
    updatedAt: now,
  };
}
