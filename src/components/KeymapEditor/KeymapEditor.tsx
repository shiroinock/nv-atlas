import { useEffect, useMemo, useRef, useState } from "react";
import { useKeybindingContext } from "../../context/KeybindingContext";
import { defaultCustomKeymap } from "../../data/keymap";
import { validateKeymap } from "../../utils/keymap-validator";
import styles from "./KeymapEditor.module.css";

const MAX_OUTPUT_CHAR_LENGTH = 10;

/** QWERTY物理配列の行グループ定義 */
const KEY_ROWS = [
  {
    label: "Top",
    keys: ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
  },
  {
    label: "Home",
    keys: ["a", "s", "d", "f", "g", "h", "j", "k", "l", ";"],
  },
  {
    label: "Bottom",
    keys: ["z", "x", "c", "v", "b", "n", "m", ",", ".", "/"],
  },
] as const;

/** バリデーションエラーをキー単位で引き当てるヘルパー */
function getErrorsForKey(
  errors: ReturnType<typeof validateKeymap>,
  qwertyKey: string,
): string[] {
  return errors.filter((e) => e.keys.includes(qwertyKey)).map((e) => e.message);
}

export function KeymapEditor() {
  const { config, dispatch } = useKeybindingContext();
  // customKeymap が未設定の場合は defaultCustomKeymap をフォールバックとして使用
  const keymap = config.customKeymap ?? defaultCustomKeymap;
  const errors = useMemo(() => validateKeymap(keymap), [keymap]);

  // 現在インライン編集中のキー
  const [editingKey, setEditingKey] = useState<string | null>(null);
  // 編集中の一時入力値
  const [editingValue, setEditingValue] = useState<string>("");
  // インライン input にフォーカスを当てるための ref
  const inputRef = useRef<HTMLInputElement>(null);
  // Escape キ���ンセル時に onBlur の dispatch ���防止するフラグ
  const isCancellingRef = useRef(false);

  // 編集モードに入ったときに input にフォーカス
  useEffect(() => {
    if (editingKey !== null) {
      inputRef.current?.focus();
    }
  }, [editingKey]);

  const handleCellClick = (qwertyKey: string) => {
    isCancellingRef.current = false;
    setEditingKey(qwertyKey);
    setEditingValue(keymap[qwertyKey] ?? "");
  };

  const handleConfirm = (qwertyKey: string) => {
    if (isCancellingRef.current) return;
    if (editingValue.trim() === "") {
      setEditingKey(null);
      return;
    }
    dispatch({
      type: "UPDATE_KEYMAP_ENTRY",
      qwertyKey,
      outputChar: editingValue,
    });
    setEditingKey(null);
  };

  const handleCancel = () => {
    isCancellingRef.current = true;
    setEditingKey(null);
  };

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    qwertyKey: string,
  ) => {
    if (e.key === "Enter") {
      handleConfirm(qwertyKey);
    } else if (e.key === "Escape") {
      handleCancel();
    }
  };

  return (
    <div className={styles.container} data-testid="keymap-editor">
      <div className={styles.header}>
        <h2 className={styles.title}>キーマップ編集</h2>
      </div>

      <table className={styles.table}>
        <thead>
          <tr className={styles.headerRow}>
            <th className={styles.thGroup}>行</th>
            <th className={styles.thQwerty}>QWERTY位置</th>
            <th className={styles.thOutput}>出力文字</th>
          </tr>
        </thead>

        {KEY_ROWS.map(({ label, keys }) => (
          <tbody key={label}>
            {/* 行グループのヘッダー行 */}
            <tr className={styles.groupHeader}>
              <td colSpan={3}>{label}</td>
            </tr>

            {keys.map((qwertyKey) => {
              const isEditing = editingKey === qwertyKey;
              const keyErrors = getErrorsForKey(errors, qwertyKey);
              const hasError = keyErrors.length > 0;

              return (
                <tr key={qwertyKey} className={styles.row}>
                  {/* 行グループラベルは groupHeader で表示するためここは空 */}
                  <td className={styles.tdGroup} />
                  <td className={styles.tdQwerty}>
                    <kbd className={styles.keyBadge}>{qwertyKey}</kbd>
                  </td>
                  <td
                    className={styles.tdOutput}
                    data-testid={`output-cell-${qwertyKey}`}
                    data-error={hasError ? "true" : undefined}
                  >
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        className={styles.inputCell}
                        data-testid={`output-input-${qwertyKey}`}
                        value={editingValue}
                        maxLength={MAX_OUTPUT_CHAR_LENGTH}
                        onChange={(e) => setEditingValue(e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, qwertyKey)}
                        onBlur={() => handleConfirm(qwertyKey)}
                      />
                    ) : (
                      <button
                        type="button"
                        className={`${styles.outputValue} ${hasError ? styles.errorCell : ""}`}
                        onClick={() => handleCellClick(qwertyKey)}
                      >
                        {keymap[qwertyKey] ?? ""}
                      </button>
                    )}
                    {hasError &&
                      keyErrors.map((msg) => (
                        <span
                          key={msg}
                          className={styles.errorMessage}
                          data-testid={`error-${qwertyKey}`}
                        >
                          {msg}
                        </span>
                      ))}
                  </td>
                </tr>
              );
            })}
          </tbody>
        ))}
      </table>
    </div>
  );
}
