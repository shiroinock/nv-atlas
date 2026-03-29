import { type KeyboardEvent, useEffect, useRef, useState } from "react";
import { normalizeKeyEvent } from "../../utils/key-event";
import styles from "./KeyCapture.module.css";

export interface KeyCaptureProps {
  onConfirm: (key: string) => void;
  onCancel: () => void;
}

export function KeyCapture({ onConfirm, onCancel }: KeyCaptureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [capturedKey, setCapturedKey] = useState<string | null>(null);

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  const handleKeyDown = (e: KeyboardEvent) => {
    const vimKey = normalizeKeyEvent(e.nativeEvent);

    if (vimKey === "") return;

    if (vimKey === "<Esc>") {
      e.preventDefault();
      onCancel();
      return;
    }

    e.preventDefault();

    if (vimKey === "<CR>" && capturedKey !== null) {
      setCapturedKey(null);
      onConfirm(capturedKey);
      return;
    }

    if (vimKey === capturedKey) {
      setCapturedKey(null);
      onConfirm(capturedKey);
      return;
    }

    setCapturedKey(vimKey);
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      role="application"
      aria-label="キー入力キャプチャ"
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {capturedKey === null ? (
        <span className={styles.placeholder}>キーを押してください…</span>
      ) : (
        <div className={styles.preview}>
          <kbd className={styles.keyBadge}>{capturedKey}</kbd>
          <span className={styles.hint}>
            Enter または同じキーで確定 / Escape でキャンセル
          </span>
        </div>
      )}
    </div>
  );
}
