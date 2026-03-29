import type { VimMode } from "../../types/keybinding";
import styles from "./ModeSelector.module.css";

interface Props {
  activeMode: VimMode;
  onModeChange: (mode: VimMode) => void;
}

const vimModes: { mode: VimMode; label: string; short: string }[] = [
  { mode: "n", label: "Normal", short: "N" },
  { mode: "v", label: "Visual", short: "V" },
  { mode: "o", label: "Op-pending", short: "O" },
  { mode: "i", label: "Insert", short: "I" },
  { mode: "c", label: "Command-line", short: "C" },
  { mode: "s", label: "Select", short: "S" },
  { mode: "t", label: "Terminal", short: "T" },
];

export function ModeSelector({ activeMode, onModeChange }: Props) {
  return (
    <div className={styles.container}>
      <span className={styles.label}>Vim mode:</span>
      <div className={styles.tabs}>
        {vimModes.map(({ mode, label, short }) => (
          <button
            type="button"
            key={mode}
            className={`${styles.tab} ${activeMode === mode ? styles.tabActive : ""}`}
            onClick={() => onModeChange(mode)}
            title={label}
          >
            <span className={styles.short}>{short}</span>
            <span className={styles.full}>{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
