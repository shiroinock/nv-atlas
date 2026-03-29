import { useState } from "react";
import { useKeybindingContext } from "../../context/KeybindingContext";
import {
  categoryColors,
  categoryLabels,
  sourceColors,
} from "../../data/vim-commands";
import type { KeybindingSource, VimMode } from "../../types/keybinding";
import { KeyCapture } from "../KeyCapture/KeyCapture";
import { ModeSelector } from "../ModeSelector/ModeSelector";
import styles from "./BindingEditor.module.css";

const SOURCE_DISPLAY_KEYS: Record<KeybindingSource, string> = {
  default: "hardcoded",
  "layout-derived": "nvim-default",
  "nvim-import": "plugin",
  "user-edit": "user",
};

const SOURCE_LABELS: Record<KeybindingSource, string> = {
  default: "デフォルト",
  "layout-derived": "レイアウト",
  "nvim-import": "nvim",
  "user-edit": "ユーザー",
};

export function BindingEditor() {
  const { config, dispatch } = useKeybindingContext();
  const [activeMode, setActiveMode] = useState<VimMode>("n");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  const bindings = config.bindings[activeMode];

  const handleConfirm = (index: number, newLhs: string) => {
    dispatch({
      type: "UPDATE_BINDING",
      mode: activeMode,
      index,
      binding: { lhs: newLhs },
    });
    setEditingIndex(null);
  };

  const handleRemove = (index: number) => {
    dispatch({ type: "REMOVE_BINDING", mode: activeMode, index });
    if (editingIndex === index) setEditingIndex(null);
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>キーバインディング</h2>
        <ModeSelector activeMode={activeMode} onModeChange={setActiveMode} />
      </div>

      {bindings.length === 0 ? (
        <p className={styles.empty}>このモードにバインディングはありません</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr className={styles.headerRow}>
              <th className={styles.thKey}>キー</th>
              <th className={styles.thName}>コマンド名</th>
              <th className={styles.thCategory}>カテゴリ</th>
              <th className={styles.thSource}>ソース</th>
              <th className={styles.thActions}>操作</th>
            </tr>
          </thead>
          <tbody>
            {bindings.map((binding, index) => {
              const isEditing = editingIndex === index;
              const categoryColor =
                categoryColors[binding.category] ?? "#90a4ae";
              const sourceKey = SOURCE_DISPLAY_KEYS[binding.source];
              const sourceColor = sourceColors[sourceKey] ?? "#6c7086";

              return (
                <tr
                  key={binding.lhs}
                  className={`${styles.row} ${isEditing ? styles.rowEditing : ""}`}
                  onClick={() => !isEditing && setEditingIndex(index)}
                >
                  <td className={styles.tdKey}>
                    {isEditing ? (
                      <KeyCapture
                        onConfirm={(key) => handleConfirm(index, key)}
                        onCancel={() => setEditingIndex(null)}
                      />
                    ) : (
                      <kbd className={styles.keyBadge}>{binding.lhs}</kbd>
                    )}
                  </td>
                  <td className={styles.tdName}>
                    <span className={styles.commandName}>{binding.name}</span>
                    {binding.description && (
                      <span className={styles.description}>
                        {binding.description}
                      </span>
                    )}
                  </td>
                  <td className={styles.tdCategory}>
                    <span
                      className={styles.badge}
                      style={
                        {
                          "--badge-color": categoryColor,
                        } as React.CSSProperties
                      }
                    >
                      {categoryLabels[binding.category] ?? binding.category}
                    </span>
                  </td>
                  <td className={styles.tdSource}>
                    <span
                      className={styles.badge}
                      style={
                        { "--badge-color": sourceColor } as React.CSSProperties
                      }
                    >
                      {SOURCE_LABELS[binding.source]}
                    </span>
                  </td>
                  <td className={styles.tdActions}>
                    {!isEditing && (
                      <>
                        <button
                          type="button"
                          className={styles.actionButton}
                          onClick={(e) => {
                            e.stopPropagation();
                            setEditingIndex(index);
                          }}
                        >
                          変更
                        </button>
                        <button
                          type="button"
                          className={`${styles.actionButton} ${styles.actionButtonRemove}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRemove(index);
                          }}
                        >
                          削除
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
