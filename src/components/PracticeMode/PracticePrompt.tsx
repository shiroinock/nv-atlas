import { categoryColors, categoryLabels } from "../../data/vim-commands";
import type { KeyInputSpec, PracticeScore, VimCommand } from "../../types/vim";
import { cx } from "../../utils/cx";
import styles from "./PracticePrompt.module.css";

interface PracticePromptProps {
  command: VimCommand | null;
  inputSpec: KeyInputSpec | null;
  score: PracticeScore;
  lastResult: "correct" | "incorrect" | null;
  started: boolean;
  onStart: () => void;
}

export function PracticePrompt({
  command,
  inputSpec,
  score,
  lastResult,
  started,
  onStart,
}: PracticePromptProps) {
  if (!started) {
    return (
      <div className={styles.panel}>
        <button type="button" className={styles.startButton} onClick={onStart}>
          練習を開始
        </button>
      </div>
    );
  }

  if (!command) {
    return (
      <div className={styles.panel}>
        <p className={styles.message}>
          選択したカテゴリに出題可能なコマンドがありません
        </p>
      </div>
    );
  }

  const color = categoryColors[command.category];

  const showHint =
    inputSpec && (inputSpec.requiresShift || inputSpec.layerInfo);

  return (
    <div
      className={cx(
        styles.panel,
        lastResult === "correct" && styles.correct,
        lastResult === "incorrect" && styles.incorrect,
      )}
    >
      <div className={styles.prompt}>
        <span
          className={styles.badge}
          style={{ backgroundColor: `${color}33`, color }}
        >
          {categoryLabels[command.category]}
        </span>
        <span className={styles.commandName}>「{command.name}」</span>
        <span className={styles.description}>{command.description}</span>
      </div>
      <div className={styles.hintRow}>
        {showHint && <span className={styles.hint}>{inputSpec.hint}</span>}
        <span className={styles.instruction}>を押してください</span>
      </div>
      <div className={styles.score}>
        <span>
          正解: {score.correct}/{score.total}
        </span>
        {score.total > 0 && (
          <span className={styles.rate}>
            ({Math.round((score.correct / score.total) * 100)}%)
          </span>
        )}
        {score.streak >= 2 && (
          <span className={styles.streak}>{score.streak} 連続正解</span>
        )}
      </div>
    </div>
  );
}
