import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeybindingContext } from "../../context/KeybindingContext";
import {
  keybindingToJSON,
  keybindingToLua,
} from "../../utils/keybinding-exporters";
import styles from "./ExportPanel.module.css";

type ExportFormat = "lua" | "json";
type CopyStatus = "idle" | "copied" | "error";

const FORMAT_LABELS: Record<ExportFormat, string> = {
  lua: "Lua",
  json: "JSON",
};

const FILE_NAMES: Record<ExportFormat, string> = {
  lua: "keyviz-config.lua",
  json: "keyviz-config.json",
};

const MIME_TYPES: Record<ExportFormat, string> = {
  lua: "text/plain",
  json: "application/json",
};

const COPY_STATUS_RESET_MS = 2000;

const COPY_STATUS_LABELS: Record<CopyStatus, string> = {
  idle: "コピー",
  copied: "コピー済み",
  error: "失敗",
};

const COPY_STATUS_CLASS: Record<CopyStatus, string> = {
  idle: "",
  copied: styles.actionButtonSuccess,
  error: styles.actionButtonError,
};

export function ExportPanel() {
  const { config } = useKeybindingContext();
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("lua");
  const [copyStatus, setCopyStatus] = useState<CopyStatus>("idle");
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  );

  const hasBindings = useMemo(
    () => Object.values(config.bindings).some((bs) => bs.length > 0),
    [config.bindings],
  );

  const content = useMemo(
    () =>
      hasBindings
        ? activeFormat === "lua"
          ? keybindingToLua(config)
          : keybindingToJSON(config)
        : "",
    [hasBindings, activeFormat, config],
  );

  const resetCopyStatus = useCallback(() => {
    clearTimeout(copyTimerRef.current);
    copyTimerRef.current = setTimeout(
      () => setCopyStatus("idle"),
      COPY_STATUS_RESET_MS,
    );
  }, []);

  const handleTabChange = useCallback((fmt: ExportFormat) => {
    setActiveFormat(fmt);
    setCopyStatus("idle");
    clearTimeout(copyTimerRef.current);
  }, []);

  useEffect(() => {
    return () => clearTimeout(copyTimerRef.current);
  }, []);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopyStatus("copied");
    } catch {
      setCopyStatus("error");
    }
    resetCopyStatus();
  }, [content, resetCopyStatus]);

  const handleDownload = useCallback(() => {
    const blob = new Blob([content], { type: MIME_TYPES[activeFormat] });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = FILE_NAMES[activeFormat];
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [content, activeFormat]);

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.tabs} role="tablist">
          {(["lua", "json"] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
              role="tab"
              id={`tab-${fmt}`}
              aria-controls="tabpanel-export"
              aria-selected={activeFormat === fmt}
              className={`${styles.tab} ${activeFormat === fmt ? styles.tabActive : ""}`}
              onClick={() => handleTabChange(fmt)}
            >
              {FORMAT_LABELS[fmt]}
            </button>
          ))}
        </div>
        <div className={styles.actions}>
          <button
            type="button"
            className={`${styles.actionButton} ${COPY_STATUS_CLASS[copyStatus]}`}
            onClick={handleCopy}
            disabled={!hasBindings}
          >
            {COPY_STATUS_LABELS[copyStatus]}
          </button>
          <button
            type="button"
            className={styles.actionButton}
            onClick={handleDownload}
            disabled={!hasBindings}
          >
            ダウンロード
          </button>
        </div>
      </div>

      <div
        role="tabpanel"
        id="tabpanel-export"
        aria-labelledby={`tab-${activeFormat}`}
      >
        {hasBindings ? (
          <pre className={styles.preview}>{content}</pre>
        ) : (
          <p className={styles.empty}>
            キーバインドが設定されていません。レイアウトとキーマップを読み込んでください。
          </p>
        )}
      </div>
    </div>
  );
}
