import { useCallback, useRef } from "react";
import styles from "./LayoutLoader.module.css";

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

interface LayoutLoaderProps {
  layoutName: string;
  keymapFileName: string | null;
  onLoadLayout: (json: string) => void;
  onLoadKeymap: (json: string) => void;
  onClearStorage: () => void;
  error: string | null;
}

export function LayoutLoader({
  layoutName,
  keymapFileName,
  onLoadLayout,
  onLoadKeymap,
  onClearStorage,
  error,
}: LayoutLoaderProps) {
  return (
    <div className={styles.container}>
      <FileDropZone
        label="1. キーボードレイアウト"
        description="VIA 定義 JSON をドロップ or クリック"
        fileName={layoutName !== "ANSI 60%" ? layoutName : null}
        onLoad={onLoadLayout}
      />
      <FileDropZone
        label="2. キーマップ"
        description="VIA エクスポートした keymap JSON をドロップ or クリック"
        fileName={keymapFileName}
        onLoad={onLoadKeymap}
      />
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
