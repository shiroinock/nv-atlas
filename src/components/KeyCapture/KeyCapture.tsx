import { useEffect, useRef, useState } from "react";
import { normalizeKeyEvent } from "../../utils/key-event";
import styles from "./KeyCapture.module.css";

export interface KeyCaptureProps {
  onConfirm: (key: string) => void;
  onCancel: () => void;
}

export function KeyCapture({ onConfirm, onCancel }: KeyCaptureProps) {
  const capturedKeyRef = useRef<string | null>(null); // クロージャの stale 回避用
  const [capturedKey, setCapturedKey] = useState<string | null>(null); // レンダー用

  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  useEffect(() => {
    onConfirmRef.current = onConfirm;
    onCancelRef.current = onCancel;
  });

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const vimKey = normalizeKeyEvent(e);

      if (vimKey === "") return;

      if (e.key === "Escape") {
        e.preventDefault();
        onCancelRef.current();
        return;
      }

      e.preventDefault();

      if (e.key === "Enter" && capturedKeyRef.current !== null) {
        onConfirmRef.current(capturedKeyRef.current);
        return;
      }

      if (vimKey === capturedKeyRef.current) {
        onConfirmRef.current(capturedKeyRef.current);
        return;
      }

      capturedKeyRef.current = vimKey;
      setCapturedKey(vimKey);
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={styles.container} role="status" aria-live="polite">
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
