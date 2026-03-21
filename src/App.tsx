import { useState, useCallback } from "react";
import type { VimCommand, HighlightEntry, VIAKeymapFull } from "./types/vim";
import { useKeyboardLayout } from "./hooks/useKeyboardLayout";
import { defaultCustomKeymap } from "./data/keymap";
import { categoryColors, categoryLabels } from "./data/vim-commands";
import { parseVIAKeymap, parseVIAKeymapFull } from "./utils/via-keymap-parser";
import { Keyboard } from "./components/Keyboard/Keyboard";
import { CommandDetail } from "./components/CommandDetail/CommandDetail";
import { LayoutLoader } from "./components/LayoutLoader/LayoutLoader";
import { PracticeMode } from "./components/PracticeMode/PracticeMode";
import styles from "./App.module.css";

export function App() {
  const { layout, loadFromJSON, error } = useKeyboardLayout();
  const [hoveredCommand, setHoveredCommand] = useState<VimCommand | null>(null);
  const [hoveredCustomKey, setHoveredCustomKey] = useState<string | null>(null);
  const [matrixKeymap, setMatrixKeymap] = useState<Record<string, string> | null>(null);
  const [viaKeymapFull, setViaKeymapFull] = useState<VIAKeymapFull | null>(null);
  const [mode, setMode] = useState<"visualize" | "practice">("visualize");
  const [highlightKeys, setHighlightKeys] = useState<HighlightEntry[]>([]);
  const [keymapFileName, setKeymapFileName] = useState<string | null>(null);
  const [matrixCols, setMatrixCols] = useState(7); // Corne v4 default

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
      // VIA 定義から matrix cols を取得
      try {
        const parsed = JSON.parse(jsonString);
        if (parsed.matrix?.cols) {
          setMatrixCols(parsed.matrix.cols);
        }
      } catch {
        // ignore
      }
    },
    [loadFromJSON]
  );

  const handleLoadKeymap = useCallback(
    (jsonString: string) => {
      try {
        const parsed = JSON.parse(jsonString);
        const mapping = parseVIAKeymap(parsed, matrixCols);
        setMatrixKeymap(mapping);
        const full = parseVIAKeymapFull(parsed, matrixCols);
        setViaKeymapFull(full);
        setKeymapFileName("keymap loaded");
      } catch (e) {
        setKeymapFileName(
          `Error: ${e instanceof Error ? e.message : "parse failed"}`
        );
      }
    },
    [matrixCols]
  );

  const noopHover = useCallback(() => {}, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>KeyViz</h1>
            <p className={styles.subtitle}>
              カスタムキーボード配列で Neovim キーバインドを可視化
            </p>
          </div>
          <div className={styles.modeTabs}>
            <button
              className={`${styles.modeTab} ${mode === "visualize" ? styles.modeTabActive : ""}`}
              onClick={() => setMode("visualize")}
            >
              可視化
            </button>
            <button
              className={`${styles.modeTab} ${mode === "practice" ? styles.modeTabActive : ""}`}
              onClick={() => setMode("practice")}
            >
              練習
            </button>
          </div>
        </div>
      </header>

      <div className={styles.loader}>
        <LayoutLoader
          layoutName={layout.name}
          keymapFileName={keymapFileName}
          onLoadLayout={handleLoadLayout}
          onLoadKeymap={handleLoadKeymap}
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

      <div className={styles.keyboardWrapper}>
        <Keyboard
          layout={layout}
          customKeymap={defaultCustomKeymap}
          matrixKeymap={matrixKeymap}
          onHover={mode === "visualize" ? handleHover : noopHover}
          highlightKeys={mode === "practice" ? highlightKeys : undefined}
        />
      </div>

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
            <span className={styles.legendDot} style={{ backgroundColor: color }} />
            {categoryLabels[cat]}
          </div>
        ))}
      </div>
    </>
  );
}
