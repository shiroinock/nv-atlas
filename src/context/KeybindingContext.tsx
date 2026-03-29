import { createContext, useContext, useMemo } from "react";
import { useKeybindingConfig } from "../hooks/useKeybindingConfig";
import type {
  Keybinding,
  KeybindingConfig,
  VimMode,
} from "../types/keybinding";
import { loadKeybindingConfig } from "../utils/storage";

interface KeybindingContextValue {
  config: KeybindingConfig;
  dispatch: ReturnType<typeof useKeybindingConfig>["dispatch"];
  getBinding: (mode: VimMode, lhs: string) => Keybinding | undefined;
  bindingsByLhs: ReturnType<typeof useKeybindingConfig>["bindingsByLhs"];
}

const KeybindingContext = createContext<KeybindingContextValue | null>(null);

export function KeybindingProvider({
  children,
  initial,
}: {
  children: React.ReactNode;
  initial?: KeybindingConfig;
}) {
  const resolvedInitial = useMemo(
    () => initial ?? loadKeybindingConfig() ?? undefined,
    // initial は初回マウント時にのみ使用されるため空の依存配列で固定
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const value = useKeybindingConfig(resolvedInitial);
  return (
    <KeybindingContext.Provider value={value}>
      {children}
    </KeybindingContext.Provider>
  );
}

export function useKeybindingContext(): KeybindingContextValue {
  const ctx = useContext(KeybindingContext);
  if (!ctx) {
    throw new Error(
      "useKeybindingContext must be used within a KeybindingProvider",
    );
  }
  return ctx;
}
