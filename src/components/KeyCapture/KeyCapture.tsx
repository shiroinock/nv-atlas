import { useEffect, useRef, useState } from "react";
import { normalizeKeyEvent } from "../../utils/key-event";
import styles from "./KeyCapture.module.css";

export interface KeyCaptureProps {
  onConfirm: (key: string) => void;
  onCancel: () => void;
}

export function KeyCapture({ onConfirm, onCancel }: KeyCaptureProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const capturedKeyRef = useRef<string | null>(null); // クロージャの stale 回避用
  const [capturedKey, setCapturedKey] = useState<string | null>(null); // レンダー用

  const onConfirmRef = useRef(onConfirm);
  const onCancelRef = useRef(onCancel);
  onConfirmRef.current = onConfirm;
  onCancelRef.current = onCancel;

  useEffect(() => {
    containerRef.current?.focus();
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const vimKey = normalizeKeyEvent(e);

      if (vimKey === "") return;

      if (vimKey === "<Esc>") {
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

    el.addEventListener("keydown", handleKeyDown);
    return () => el.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      ref={containerRef}
      className={styles.container}
      role="status"
      aria-label="キー入力キャプチャ"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: キーキャプチャにフォーカスが必要
      tabIndex={0}
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
