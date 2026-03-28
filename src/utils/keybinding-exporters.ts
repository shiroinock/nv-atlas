import type { KeybindingConfig, VimMode } from "../types/keybinding";

const VIM_MODES: VimMode[] = ["n", "v", "x", "o", "i", "s", "c", "t"];

function escapeLua(str: string): string {
  return str.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
}

export function keybindingToLua(config: KeybindingConfig): string {
  const lines: string[] = [];

  for (const mode of VIM_MODES) {
    const bindings = config.bindings[mode];
    if (bindings.length === 0) continue;

    for (const binding of bindings) {
      const rhs = binding.rhs ?? binding.commandId ?? "";
      const lhsEscaped = escapeLua(binding.lhs);
      const rhsEscaped = escapeLua(rhs);
      const opts = binding.noremap ? ", { noremap = true }" : "";
      lines.push(
        `vim.keymap.set("${mode}", "${lhsEscaped}", "${rhsEscaped}"${opts})`,
      );
    }
  }

  return lines.join("\n");
}

export function keybindingToJSON(config: KeybindingConfig): string {
  return JSON.stringify(config, null, 2);
}
