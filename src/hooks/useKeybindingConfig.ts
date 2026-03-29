import { useCallback, useEffect, useMemo, useReducer, useRef } from "react";
import type {
  Keybinding,
  KeybindingConfig,
  VimMode,
} from "../types/keybinding";
import type { NvimMapping } from "../types/vim";
import { createDefaultConfig } from "../utils/keybinding-defaults";
import { saveKeybindingConfig } from "../utils/storage";

// ── Actions ──

type KeybindingAction =
  | { type: "SET_CONFIG"; config: KeybindingConfig }
  | {
      type: "UPDATE_BINDING";
      mode: VimMode;
      index: number;
      binding: Partial<Keybinding>;
    }
  | { type: "ADD_BINDING"; mode: VimMode; binding: Keybinding }
  | { type: "REMOVE_BINDING"; mode: VimMode; index: number }
  | { type: "SWAP_BINDING"; mode: VimMode; indexA: number; indexB: number }
  | { type: "IMPORT_NVIM"; maps: NvimMapping[] }
  | { type: "IMPORT_LAYOUT"; customKeymap: Record<string, string> }
  | { type: "RESET_TO_DEFAULTS" };

// ── Reducer ──

function keybindingReducer(
  state: KeybindingConfig,
  action: KeybindingAction,
): KeybindingConfig {
  const now = new Date().toISOString();

  switch (action.type) {
    case "SET_CONFIG":
      return action.config;

    case "UPDATE_BINDING": {
      const modeBindings = [...state.bindings[action.mode]];
      modeBindings[action.index] = {
        ...modeBindings[action.index],
        ...action.binding,
        source: "user-edit",
      };
      return {
        ...state,
        bindings: { ...state.bindings, [action.mode]: modeBindings },
        updatedAt: now,
      };
    }

    case "ADD_BINDING": {
      const modeBindings = [...state.bindings[action.mode], action.binding];
      return {
        ...state,
        bindings: { ...state.bindings, [action.mode]: modeBindings },
        updatedAt: now,
      };
    }

    case "REMOVE_BINDING": {
      const modeBindings = state.bindings[action.mode].filter(
        (_, i) => i !== action.index,
      );
      return {
        ...state,
        bindings: { ...state.bindings, [action.mode]: modeBindings },
        updatedAt: now,
      };
    }

    case "SWAP_BINDING": {
      const modeBindings = [...state.bindings[action.mode]];
      const temp = modeBindings[action.indexA];
      modeBindings[action.indexA] = modeBindings[action.indexB];
      modeBindings[action.indexB] = temp;
      return {
        ...state,
        bindings: { ...state.bindings, [action.mode]: modeBindings },
        updatedAt: now,
      };
    }

    case "IMPORT_LAYOUT": {
      // Phase 3 以降で deriveFromLayout を呼ぶ
      return {
        ...state,
        customKeymap: action.customKeymap,
        updatedAt: now,
      };
    }

    case "IMPORT_NVIM": {
      // Phase 4 で実装
      return state;
    }

    case "RESET_TO_DEFAULTS":
      return createDefaultConfig();

    default:
      return state;
  }
}

// ── Hook ──

export function useKeybindingConfig(initial?: KeybindingConfig) {
  const [config, dispatch] = useReducer(
    keybindingReducer,
    initial ?? createDefaultConfig(),
  );

  // config が実際に変更された場合のみ保存（初回・StrictMode 再マウント時はスキップ）
  const prevConfigRef = useRef(config);
  useEffect(() => {
    if (prevConfigRef.current === config) return;
    prevConfigRef.current = config;
    saveKeybindingConfig(config);
  }, [config]);

  /** lhs でバインディングを O(1) 検索するためのマップ */
  const bindingsByLhs = useMemo(() => {
    const map: Record<VimMode, Map<string, Keybinding>> = {} as never;
    for (const mode of Object.keys(config.bindings) as VimMode[]) {
      const m = new Map<string, Keybinding>();
      for (const b of config.bindings[mode]) {
        m.set(b.lhs, b);
      }
      map[mode] = m;
    }
    return map;
  }, [config.bindings]);

  const getBinding = useCallback(
    (mode: VimMode, lhs: string): Keybinding | undefined => {
      return bindingsByLhs[mode]?.get(lhs);
    },
    [bindingsByLhs],
  );

  return { config, dispatch, getBinding, bindingsByLhs };
}
