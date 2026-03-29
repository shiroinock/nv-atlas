import { useCallback, useRef } from "react";
import { DEFAULT_LAYOUT_NAME } from "../../data/default-layout";
import { getPresets } from "../../data/keybinding-presets";
import type { KeybindingPreset } from "../../types/keybinding";
import styles from "./LayoutLoader.module.css";

/** カスタム選択肢の value 定数 */
const CUSTOM_PRESET_VALUE = "__custom__";

const PRESETS = getPresets();

interface FileDropZoneProps {
  label: string;
  description: string;
  fileName: string | null;
  onLoad: (json: string) => void;
}

function FileDropZone({
  label,
  description,
  fileName,
  onLoad,
}: FileDropZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") onLoad(text);
      };
      reader.readAsText(file);
    },
    [onLoad],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.currentTarget.classList.remove(styles.dropzoneActive);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div className={styles.dropzoneGroup}>
      <span className={styles.label}>{label}</span>
      {/* biome-ignore lint/a11y/useSemanticElements: ドロップゾーンは drag&drop 対応のため div が必要 */}
      <div
        role="button"
        tabIndex={0}
        className={styles.dropzone}
        onDrop={handleDrop}
        onDragOver={(e) => {
          e.preventDefault();
          e.currentTarget.classList.add(styles.dropzoneActive);
        }}
        onDragLeave={(e) =>
          e.currentTarget.classList.remove(styles.dropzoneActive)
        }
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            fileInputRef.current?.click();
          }
        }}
      >
        {fileName ? (
          <span className={styles.fileName}>{fileName}</span>
        ) : (
          description
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          style={{ display: "none" }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />
      </div>
    </div>
  );
}

/** 2 つのキーマップが等しいか比較する */
function isKeymapEqual(
  a: Record<string, string>,
  b: Record<string, string>,
): boolean {
  const keysA = Object.keys(a);
  return (
    keysA.length === Object.keys(b).length && keysA.every((k) => a[k] === b[k])
  );
}

/** 現在のキーマップに一致するプリセットを返す（なければ null） */
function findMatchingPreset(
  keymap: Record<string, string>,
  presets: KeybindingPreset[],
): KeybindingPreset | null {
  return presets.find((p) => isKeymapEqual(keymap, p.keymap)) ?? null;
}

interface LayoutLoaderProps {
  layoutName: string;
  keymapFileName: string | null;
  customKeymap: Record<string, string>;
  onLoadLayout: (json: string) => void;
  onLoadKeymap: (json: string) => void;
  onSelectPreset: (keymap: Record<string, string>) => void;
  onClearStorage: () => void;
  error: string | null;
}

export function LayoutLoader({
  layoutName,
  keymapFileName,
  customKeymap,
  onLoadLayout,
  onLoadKeymap,
  onSelectPreset,
  onClearStorage,
  error,
}: LayoutLoaderProps) {
  const matchingPreset = findMatchingPreset(customKeymap, PRESETS);
  const selectedValue = matchingPreset
    ? matchingPreset.id
    : CUSTOM_PRESET_VALUE;

  const handlePresetChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      const preset = PRESETS.find((p) => p.id === e.target.value);
      if (preset) {
        onSelectPreset(preset.keymap);
      }
    },
    [onSelectPreset],
  );

  return (
    <div className={styles.container}>
      <FileDropZone
        label="1. キーボードレイアウト"
        description="VIA 定義 JSON をドロップ or クリック"
        fileName={layoutName !== DEFAULT_LAYOUT_NAME ? layoutName : null}
        onLoad={onLoadLayout}
      />
      {/* select + dropzone を束ねるため、ラベルは group 直下に配置 */}
      <div className={styles.keymapGroup}>
        <span className={styles.label}>2. キーマップ</span>
        <select
          className={styles.presetSelect}
          value={selectedValue}
          onChange={handlePresetChange}
        >
          {PRESETS.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
          {/* プリセットに一致しない場合のみ表示 */}
          {!matchingPreset && (
            <option value={CUSTOM_PRESET_VALUE}>カスタム</option>
          )}
        </select>
        <FileDropZone
          label=""
          description="または VIA JSON をドロップ or クリック"
          fileName={keymapFileName}
          onLoad={onLoadKeymap}
        />
      </div>
      {error && <span className={styles.error}>{error}</span>}
      <button
        type="button"
        className={styles.clearButton}
        onClick={onClearStorage}
      >
        保存データをクリア
      </button>
    </div>
  );
}
