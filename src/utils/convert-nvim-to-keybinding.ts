import type { Keybinding, VimMode } from "../types/keybinding";
import {
  emptyBindings,
  KEYBINDING_SOURCE_NVIM_IMPORT,
} from "../types/keybinding";
import type { NvimMapping, VimCommand } from "../types/vim";
import { DEFAULT_NVIM_MAP_CATEGORY, expandNvimMapMode } from "../types/vim";
import { isPlugMapping } from "./plug-mapping";

export function convertNvimMapsToKeybindings(
  maps: NvimMapping[],
  vimCommands: VimCommand[],
): Record<VimMode, Keybinding[]> {
  const result = emptyBindings();
  const cmdByKey = new Map(vimCommands.map((c) => [c.key, c]));

  for (const map of maps) {
    if (isPlugMapping(map.lhs)) continue;

    const matched = cmdByKey.get(map.lhs);

    const binding: Keybinding = matched
      ? {
          lhs: map.lhs,
          commandId: matched.key,
          name: matched.name,
          description: matched.description,
          category: matched.category,
          source: KEYBINDING_SOURCE_NVIM_IMPORT,
          noremap: map.noremap,
        }
      : {
          lhs: map.lhs,
          rhs: map.rhs,
          name: map.lhs,
          description: map.description,
          category: DEFAULT_NVIM_MAP_CATEGORY,
          source: KEYBINDING_SOURCE_NVIM_IMPORT,
          noremap: map.noremap,
        };

    for (const mode of expandNvimMapMode(map.mode)) {
      result[mode].push(binding);
    }
  }

  return result;
}
