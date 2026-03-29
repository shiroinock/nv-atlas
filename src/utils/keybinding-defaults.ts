import { vimCommands } from "../data/vim-commands";
import type {
  Keybinding,
  KeybindingConfig,
  VimMode,
} from "../types/keybinding";
import { emptyBindings } from "../types/keybinding";
import type { VimCommand } from "../types/vim";
import { CURRENT_KEYBINDING_VERSION } from "./storage";

/**
 * VimCommand → Keybinding 変換
 */
function commandToKeybinding(
  cmd: VimCommand,
  source: Keybinding["source"] = "default",
): Keybinding {
  return {
    lhs: cmd.key,
    commandId: cmd.key,
    name: cmd.name,
    description: cmd.description,
    category: cmd.category,
    source,
    noremap: true,
  };
}

/**
 * ハードコードされた vimCommands からデフォルトの KeybindingConfig を生成。
 * 各コマンドの modes フィールドに基づいて適切なモードに分配する。
 */
export function createDefaultConfig(name = "QWERTY Default"): KeybindingConfig {
  const bindings = emptyBindings();

  for (const cmd of vimCommands) {
    const kb = commandToKeybinding(cmd);
    const modes = cmd.modes ?? ["n"];
    for (const mode of modes) {
      bindings[mode].push(kb);
    }
  }

  const now = new Date().toISOString();
  return {
    version: CURRENT_KEYBINDING_VERSION,
    name,
    bindings,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * VimCommand 配列から指定モードの Keybinding 配列を生成
 */
export function commandsToBindings(
  commands: VimCommand[],
  mode: VimMode,
  source: Keybinding["source"] = "default",
): Keybinding[] {
  void mode; // 将来のモード別フィルタリング用
  return commands.map((cmd) => commandToKeybinding(cmd, source));
}
