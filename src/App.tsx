import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import { CommandDetail } from "./components/CommandDetail/CommandDetail";
import { CommandReference } from "./components/CommandReference/CommandReference";
import { Keyboard } from "./components/Keyboard/Keyboard";
import { LayoutLoader } from "./components/LayoutLoader/LayoutLoader";
import { ModeSelector } from "./components/ModeSelector/ModeSelector";
import { PracticeMode } from "./components/PracticeMode/PracticeMode";
import { KeybindingProvider } from "./context/KeybindingContext";
import defaultLayoutJSON from "./data/default-layout.json";
import { defaultCustomKeymap } from "./data/keymap";
import {
  categoryColors,
  categoryLabels,
  vimCommands,
} from "./data/vim-commands";
import { useKeyboardLayout } from "./hooks/useKeyboardLayout";
import { useNvimMaps } from "./hooks/useNvimMaps";
import type { VimMode } from "./types/keybinding";
import type { HighlightEntry, VIAKeymapFull, VimCommand } from "./types/vim";
import { mergeWithNvimMaps } from "./utils/merge-vim-commands";
import {
  clearAllStorage,
  loadKeymap,
  saveKeymap,
  saveLayout,
} from "./utils/storage";
import { parseVIAKeymap, parseVIAKeymapFull } from "./utils/via-keymap-parser";

const CORNE_V4_MATRIX_COLS = 7;
const KEYMAP_LOADED_LABEL = "keymap loaded";

export function App() {
  const { layout, loadFromJSON, error } = useKeyboardLayout();
  const [hoveredCommand, setHoveredCommand] = useState<VimCommand | null>(null);
  const [hoveredCustomKey, setHoveredCustomKey] = useState<string | null>(null);
  const [matrixKeymap, setMatrixKeymap] = useState<Record<
    string,
    string
  > | null>(null);
  const [viaKeymapFull, setViaKeymapFull] = useState<VIAKeymapFull | null>(
    null,
  );
  const [mode, setMode] = useState<"visualize" | "practice" | "reference">(
    "visualize",
  );
  const [activeVimMode, setActiveVimMode] = useState<VimMode>("n");
  const [highlightKeys, setHighlightKeys] = useState<HighlightEntry[]>([]);
  const [keymapFileName, setKeymapFileName] = useState<string | null>(null);
  const [matrixCols, setMatrixCols] = useState(CORNE_V4_MATRIX_COLS);
  const {
    nvimMaps,
    loading: nvimLoading,
    error: nvimError,
    refresh: refreshNvim,
  } = useNvimMaps();

  useEffect(() => {
    const stored = loadKeymap();
    if (stored) {
      try {
        const parsed = JSON.parse(stored.json);
        const mapping = parseVIAKeymap(parsed, stored.matrixCols);
        setMatrixKeymap(mapping);
        const full = parseVIAKeymapFull(parsed, stored.matrixCols);
        setViaKeymapFull(full);
        setKeymapFileName(stored.name);
        setMatrixCols(stored.matrixCols);
      } catch {
        // 復元失敗時はデフォルト状態のまま
      }
    }
  }, []);

  const mergedCommands = useMemo(
    () => (nvimMaps ? mergeWithNvimMaps(vimCommands, nvimMaps) : null),
    [nvimMaps],
  );

  const handleHover = (cmd: VimCommand | null, customKey: string | null) => {
    setHoveredCommand(cmd);
    setHoveredCustomKey(customKey);
  };

  const handleHighlightKeys = useCallback((keys: HighlightEntry[]) => {
    setHighlightKeys(keys);
  }, []);

  const handleLoadLayout = useCallback(
    (jsonString: string) => {
      loadFromJSON(jsonString);
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.matrix?.cols) {
          setMatrixCols(parsed.matrix.cols);
        }
        saveLayout(jsonString, parsed.name || "Unknown");
      } catch {
        // ignore
      }
    },
    [loadFromJSON],
  );

  const handleLoadKeymap = useCallback(
    (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        const mapping = parseVIAKeymap(parsed, matrixCols);
        setMatrixKeymap(mapping);
        const full = parseVIAKeymapFull(parsed, matrixCols);
        setViaKeymapFull(full);
        setKeymapFileName(KEYMAP_LOADED_LABEL);
        saveKeymap(jsonString, matrixCols, KEYMAP_LOADED_LABEL);
      } catch (e) {
        setKeymapFileName(
          `Error: ${e instanceof Error ? e.message : "parse failed"}`,
        );
      }
    },
    [matrixCols],
  );

  const handleClearStorage = useCallback(() => {
    clearAllStorage();
    // デフォルト状態に戻す
    loadFromJSON(JSON.stringify(defaultLayoutJSON));
    setMatrixKeymap(null);
    setViaKeymapFull(null);
    setKeymapFileName(null);
    setMatrixCols(CORNE_V4_MATRIX_COLS); // Corne v4 default
  }, [loadFromJSON]);

  const noopHover = useCallback(() => {}, []);

  return (
    <KeybindingProvider>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>KeyViz</h1>
            <p className={styles.subtitle}>
              カスタムキーボード配列で Neovim キーバインドを可視化
            </p>
            <div className={styles.nvimStatus}>
              {nvimLoading && (
                <span className={styles.nvimLoading}>nvim 読込中...</span>
              )}
              {nvimError && (
                <span className={styles.nvimError}>nvim 未接続</span>
              )}
              {nvimMaps && (
                <>
                  <span className={styles.nvimConnected}>
                    nvim: {nvimMaps.filter((m) => m.mode === "n").length} maps
                  </span>
                  <button
                    type="button"
                    className={styles.nvimRefresh}
                    onClick={refreshNvim}
                  >
                    再取得
                  </button>
                </>
              )}
            </div>
          </div>
          <div className={styles.headerRight}>
            <div className={styles.modeTabs}>
              <button
                type="button"
                className={`${styles.modeTab} ${mode === "visualize" ? styles.modeTabActive : ""}`}
                onClick={() => setMode("visualize")}
              >
                可視化
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${mode === "practice" ? styles.modeTabActive : ""}`}
                onClick={() => setMode("practice")}
              >
                練習
              </button>
              <button
                type="button"
                className={`${styles.modeTab} ${mode === "reference" ? styles.modeTabActive : ""}`}
                onClick={() => setMode("reference")}
              >
                辞書
              </button>
            </div>
            {mode !== "practice" && (
              <ModeSelector
                activeMode={activeVimMode}
                onModeChange={setActiveVimMode}
              />
            )}
          </div>
        </div>
      </header>

      <div className={styles.loader}>
        <LayoutLoader
          layoutName={layout.name}
          keymapFileName={keymapFileName}
          onLoadLayout={handleLoadLayout}
          onLoadKeymap={handleLoadKeymap}
          onClearStorage={handleClearStorage}
          error={error}
        />
      </div>

      {mode === "practice" && (
        <div className={styles.practice}>
          <PracticeMode
            customKeymap={defaultCustomKeymap}
            viaKeymapFull={viaKeymapFull}
            onHighlightKeys={handleHighlightKeys}
          />
        </div>
      )}

      <div
        className={`${styles.keyboardWrapper} ${mode === "reference" ? styles.keyboardSticky : ""}`}
      >
        <Keyboard
          layout={layout}
          customKeymap={defaultCustomKeymap}
          matrixKeymap={matrixKeymap}
          onHover={mode === "visualize" ? handleHover : noopHover}
          highlightKeys={
            mode === "practice" || mode === "reference"
              ? highlightKeys
              : undefined
          }
          plain={mode === "practice" || mode === "reference"}
          activeVimMode={activeVimMode}
        />
      </div>

      {mode === "reference" && (
        <div className={styles.reference}>
          <CommandReference
            customKeymap={defaultCustomKeymap}
            viaKeymapFull={viaKeymapFull}
            onHighlightKeys={handleHighlightKeys}
            mergedCommands={mergedCommands}
            activeVimMode={activeVimMode}
          />
        </div>
      )}

      {mode === "visualize" && (
        <div className={styles.detail}>
          <CommandDetail
            command={hoveredCommand}
            customKey={hoveredCustomKey}
          />
        </div>
      )}

      <div className={styles.legend}>
        {Object.entries(categoryColors).map(([cat, color]) => (
          <div key={cat} className={styles.legendItem}>
            <span
              className={styles.legendDot}
              style={{ backgroundColor: color }}
            />
            {categoryLabels[cat]}
          </div>
        ))}
      </div>
    </KeybindingProvider>
  );
}
