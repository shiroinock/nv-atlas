import { useId } from "react";
import type { VimMode } from "../../types/keybinding";
import { SELECTABLE_VIM_MODES, VIM_MODE_META } from "../../types/keybinding";
import styles from "./ModeSelector.module.css";

interface Props {
  activeMode: VimMode;
  onModeChange: (mode: VimMode) => void;
}

export function ModeSelector({ activeMode, onModeChange }: Props) {
  const labelId = useId();
  return (
    <div className={styles.container}>
      <span id={labelId} className={styles.label}>
        Vim mode
      </span>
      :
      <div className={styles.tabs} role="tablist" aria-labelledby={labelId}>
        {SELECTABLE_VIM_MODES.map((mode) => {
          const { label, short } = VIM_MODE_META[mode];
          return (
            <button
              type="button"
              key={mode}
              role="tab"
              id={`tab-vim-${mode}`}
              aria-selected={activeMode === mode}
              className={`${styles.tab} ${activeMode === mode ? styles.tabActive : ""}`}
              onClick={() => onModeChange(mode)}
              title={label}
            >
              <span className={styles.short}>{short}</span>
              <span className={styles.full}>{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
