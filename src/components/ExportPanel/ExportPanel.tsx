import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useKeybindingContext } from "../../context/KeybindingContext";
import {
  keybindingToJSON,
  keybindingToLua,
} from "../../utils/keybinding-exporters";
import styles from "./ExportPanel.module.css";

type ExportFormat = "lua" | "json";

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

export function ExportPanel() {
  const { config } = useKeybindingContext();
  const [activeFormat, setActiveFormat] = useState<ExportFormat>("lua");
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">(
    "idle",
  );
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

  const copyLabel =
    copyStatus === "copied"
      ? "コピー済み"
      : copyStatus === "error"
        ? "失敗"
        : "コピー";

  return (
    <div className={styles.container}>
      <div className={styles.toolbar}>
        <div className={styles.tabs}>
          {(["lua", "json"] as ExportFormat[]).map((fmt) => (
            <button
              key={fmt}
              type="button"
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
            className={`${styles.actionButton} ${copyStatus === "copied" ? styles.actionButtonSuccess : ""}`}
            onClick={handleCopy}
            disabled={!hasBindings}
          >
            {copyLabel}
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

      {hasBindings ? (
        <pre className={styles.preview}>{content}</pre>
      ) : (
        <p className={styles.empty}>
          キーバインドが設定されていません。レイアウトとキーマップを読み込んでください。
        </p>
      )}
    </div>
  );
}
