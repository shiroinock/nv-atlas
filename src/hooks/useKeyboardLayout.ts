import { useCallback, useState } from "react";
import defaultLayoutJSON from "../data/default-layout.json";
import type { KeyboardLayout } from "../types/keyboard";
import { parseKLE, parseVIAorKLE } from "../utils/kle-parser";
import { loadLayout } from "../utils/storage";

const PARSE_ERROR_MESSAGE = "JSON の解析に失敗しました";

function buildDefaultLayout(): KeyboardLayout {
  return parseKLE(defaultLayoutJSON.layouts.keymap, defaultLayoutJSON.name);
}

function restoreLayoutFromStorage(): KeyboardLayout | null {
  const stored = loadLayout();
  if (stored === null) return null;

  try {
    const parsed = JSON.parse(stored.json);
    return parseVIAorKLE(parsed);
  } catch {
    return null;
  }
}

export function useKeyboardLayout() {
  const [layout, setLayout] = useState<KeyboardLayout>(
    () => restoreLayoutFromStorage() ?? buildDefaultLayout(),
  );
  const [error, setError] = useState<string | null>(null);

  const loadFromJSON = useCallback((jsonString: string) => {
    try {
      const parsed = JSON.parse(jsonString);
      const newLayout = parseVIAorKLE(parsed);
      setLayout(newLayout);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : PARSE_ERROR_MESSAGE);
    }
  }, []);

  return { layout, loadFromJSON, error };
}
