import { useCallback, useEffect, useMemo, useState } from "react";
import styles from "./App.module.css";
import { BindingEditor } from "./components/BindingEditor/BindingEditor";
import { CommandDetail } from "./components/CommandDetail/CommandDetail";
import { CommandReference } from "./components/CommandReference/CommandReference";
import { ExportPanel } from "./components/ExportPanel/ExportPanel";
import { Keyboard } from "./components/Keyboard/Keyboard";
import { KeymapEditor } from "./components/KeymapEditor/KeymapEditor";
import { LayerSelector } from "./components/LayerSelector/LayerSelector";
import { LayoutLoader } from "./components/LayoutLoader/LayoutLoader";
import { ModeSelector } from "./components/ModeSelector/ModeSelector";
import { PracticeMode } from "./components/PracticeMode/PracticeMode";
import {
  KeybindingProvider,
  useKeybindingContext,
} from "./context/KeybindingContext";
import defaultLayoutJSON from "./data/default-layout.json";
import { defaultCustomKeymap } from "./data/keymap";
import {
  categoryColors,
  categoryLabels,
  vimCommands,
} from "./data/vim-commands";
import { useKeyboardLayout } from "./hooks/useKeyboardLayout";
import { useNvimMaps } from "./hooks/useNvimMaps";
import type { AppMode, KeybindingConfig, VimMode } from "./types/keybinding";
import { APP_MODE_LABELS, APP_MODES } from "./types/keybinding";
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

function AppContent() {
  const { config, dispatch } = useKeybindingContext();

  // Context の customKeymap を優先し、未設定の場合はデフォルトにフォールバック
  const customKeymap = useMemo(
    () => config.customKeymap ?? defaultCustomKeymap,
    [config.customKeymap],
  );

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
  const [mode, setMode] = useState<AppMode>("visualize");
  const [activeVimMode, setActiveVimMode] = useState<VimMode>("n");
  const [activeLayer, setActiveLayer] = useState(0);
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

  const activeMatrixKeymap = useMemo(() => {
    if (!viaKeymapFull) return matrixKeymap;
    if (activeLayer === 0) return viaKeymapFull.baseKeys;
    return viaKeymapFull.layerKeys[activeLayer - 1] ?? viaKeymapFull.baseKeys;
  }, [viaKeymapFull, activeLayer, matrixKeymap]);

  // viaKeymapFull が存在する場合: Layer 0 + layerKeys の数
  const layerCount = viaKeymapFull ? viaKeymapFull.layerKeys.length + 1 : 0;

  const handleHover = useCallback(
    (cmd: VimCommand | null, customKey: string | null) => {
      setHoveredCommand(cmd);
      setHoveredCustomKey(customKey);
    },
    [],
  );

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
        setActiveLayer(0);
        saveKeymap(jsonString, matrixCols, KEYMAP_LOADED_LABEL);
      } catch (e) {
        setKeymapFileName(
          `Error: ${e instanceof Error ? e.message : "parse failed"}`,
        );
      }
    },
    [matrixCols],
  );

  const handleSelectPreset = useCallback(
    (keymap: Record<string, string>) => {
      dispatch({ type: "IMPORT_LAYOUT", customKeymap: keymap });
    },
    [dispatch],
  );

  const handleClearStorage = useCallback(() => {
    clearAllStorage();
    // デフォルト状態に戻す
    loadFromJSON(JSON.stringify(defaultLayoutJSON));
    setMatrixKeymap(null);
    setViaKeymapFull(null);
    setKeymapFileName(null);
    setMatrixCols(CORNE_V4_MATRIX_COLS); // Corne v4 default
    setActiveLayer(0);
  }, [loadFromJSON]);

  const noopHover = useCallback(() => {}, []);

  return (
    <>
      <header className={styles.header}>
        <div className={styles.headerTop}>
          <div>
            <h1 className={styles.title}>nv-atlas</h1>
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
                    nvim: {nvimMaps.length} maps
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
              {APP_MODES.map((appMode) => (
                <button
                  key={appMode}
                  type="button"
                  className={`${styles.modeTab} ${mode === appMode ? styles.modeTabActive : ""}`}
                  onClick={() => setMode(appMode)}
                >
                  {APP_MODE_LABELS[appMode]}
                </button>
              ))}
            </div>
            {(mode === "visualize" || mode === "reference") && (
              <ModeSelector
                activeMode={activeVimMode}
                onModeChange={setActiveVimMode}
              />
            )}
            {layerCount > 1 && (
              <LayerSelector
                layerCount={layerCount}
                activeLayer={activeLayer}
                onLayerChange={setActiveLayer}
              />
            )}
          </div>
        </div>
      </header>

      <div className={styles.loader}>
        <LayoutLoader
          layoutName={layout.name}
          keymapFileName={keymapFileName}
          customKeymap={customKeymap}
          onLoadLayout={handleLoadLayout}
          onLoadKeymap={handleLoadKeymap}
          onSelectPreset={handleSelectPreset}
          onClearStorage={handleClearStorage}
          error={error}
        />
      </div>

      {mode === "practice" && (
        <div className={styles.practice}>
          <PracticeMode
            customKeymap={customKeymap}
            viaKeymapFull={viaKeymapFull}
            onHighlightKeys={handleHighlightKeys}
          />
        </div>
      )}

      {mode !== "edit" && (
        <div
          className={`${styles.keyboardWrapper} ${mode === "reference" ? styles.keyboardSticky : ""}`}
        >
          <Keyboard
            layout={layout}
            customKeymap={customKeymap}
            matrixKeymap={activeMatrixKeymap}
            onHover={mode === "visualize" ? handleHover : noopHover}
            highlightKeys={
              mode === "practice" || mode === "reference"
                ? highlightKeys
                : undefined
            }
            plain={
              mode === "practice" ||
              mode === "reference" ||
              mode === "keymap-edit"
            }
            activeVimMode={activeVimMode}
          />
        </div>
      )}

      {mode === "reference" && (
        <div className={styles.reference}>
          <CommandReference
            customKeymap={customKeymap}
            viaKeymapFull={viaKeymapFull}
            onHighlightKeys={handleHighlightKeys}
            mergedCommands={mergedCommands}
            activeVimMode={activeVimMode}
          />
        </div>
      )}

      {mode === "edit" && (
        <div className={styles.editor}>
          <BindingEditor />
        </div>
      )}

      {mode === "keymap-edit" && (
        <div className={styles.editor}>
          <KeymapEditor />
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

      {mode === "visualize" && (
        <div className={styles.export}>
          <ExportPanel />
        </div>
      )}

      {mode !== "edit" && mode !== "keymap-edit" && (
        <div className={styles.legend} data-testid="legend">
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
      )}
    </>
  );
}

export function App({ initial }: { initial?: KeybindingConfig }) {
  return (
    <KeybindingProvider initial={initial}>
      <AppContent />
    </KeybindingProvider>
  );
}
