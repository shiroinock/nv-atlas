import type { KeyData } from "../../types/keyboard";
import type { VimCommand, HighlightState } from "../../types/vim";
import { categoryColors } from "../../data/vim-commands";
import styles from "./Key.module.css";

const KEY_SIZE = 54; // 1u = 54px
const GAP = 2;

interface KeyProps {
  keyData: KeyData;
  qwertyLabel: string | null;
  customLabel: string | null;
  vimCommand: VimCommand | null;
  onHover: (cmd: VimCommand | null, customKey: string | null) => void;
  highlightState?: HighlightState | null;
  plain?: boolean;
}

export function Key({ keyData, qwertyLabel, customLabel, vimCommand, onHover, highlightState, plain }: KeyProps) {
  const { x, y, w, h, r, rx, ry, color: _color } = keyData;

  const showCategory = vimCommand && !plain;

  const style: React.CSSProperties = {
    left: x * (KEY_SIZE + GAP),
    top: y * (KEY_SIZE + GAP),
    width: w * KEY_SIZE + (w - 1) * GAP,
    height: h * KEY_SIZE + (h - 1) * GAP,
    backgroundColor: plain
      ? "#313244"
      : showCategory
        ? `${categoryColors[vimCommand.category]}22`
        : "#313244",
    borderColor: plain
      ? "#45475a"
      : showCategory
        ? categoryColors[vimCommand.category]
        : "#45475a",
  };

  if (r !== 0) {
    style.transformOrigin = `${(rx - x) * KEY_SIZE}px ${(ry - y) * KEY_SIZE}px`;
    style.transform = `rotate(${r}deg)`;
  }

  // 表示するラベル: カスタム配列 > QWERTY名 > 元のKLEラベル
  const displayLabel = customLabel ?? qwertyLabel ?? keyData.label;

  const highlightClass = highlightState ? styles[`highlight_${highlightState}`] : "";

  return (
    <div
      className={`${styles.key} ${highlightClass}`}
      style={style}
      onMouseEnter={() => onHover(vimCommand, customLabel)}
      onMouseLeave={() => onHover(null, null)}
    >
      <span className={styles.customLabel}>
        {displayLabel}
      </span>
      {showCategory && (
        <>
          <span className={styles.vimCommand}>{vimCommand.name}</span>
          <span
            className={styles.categoryDot}
            style={{ backgroundColor: categoryColors[vimCommand.category] }}
          />
        </>
      )}
    </div>
  );
}
