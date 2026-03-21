import { useState, useEffect, useCallback } from "react";
import type { HighlightEntry, VIAKeymapFull } from "../../types/vim";
import { usePractice } from "../../hooks/usePractice";
import { CategoryFilter } from "./CategoryFilter";
import { PracticePrompt } from "./PracticePrompt";
import styles from "./PracticeMode.module.css";

interface PracticeModeProps {
  customKeymap: Record<string, string>;
  viaKeymapFull?: VIAKeymapFull | null;
  onHighlightKeys: (keys: HighlightEntry[]) => void;
}

export function PracticeMode({ customKeymap, viaKeymapFull, onHighlightKeys }: PracticeModeProps) {
  const {
    currentCommand,
    currentInputSpec,
    score,
    lastResult,
    selectedCategories,
    eligibleCommands,
    startPractice,
    checkAnswer,
    pickNext,
    toggleCategory,
  } = usePractice(customKeymap, viaKeymapFull);

  const [started, setStarted] = useState(false);

  const handleStart = useCallback(() => {
    setStarted(true);
    startPractice();
  }, [startPractice]);

  // カテゴリ変更時に練習中なら出題を更新
  useEffect(() => {
    if (started && eligibleCommands.length > 0) {
      pickNext(currentCommand);
    }
  }, [selectedCategories]); // eslint-disable-line react-hooks/exhaustive-deps

  // 押すべきキー全てをハイライト
  const buildHighlightEntries = useCallback(
    (state: "target" | "correct" | "incorrect"): HighlightEntry[] => {
      if (!currentInputSpec) return [];
      const entries: HighlightEntry[] = [
        { qwertyKey: currentInputSpec.targetQwertyKey, state },
      ];
      if (currentInputSpec.modifierInfo) {
        entries.push({
          qwertyKey: currentInputSpec.modifierInfo.matrixKey,
          state: state === "target" ? "modifier" : state,
        });
      }
      if (currentInputSpec.layerInfo) {
        entries.push({
          qwertyKey: currentInputSpec.layerInfo.matrixKey,
          state: state === "target" ? "modifier" : state,
        });
      }
      return entries;
    },
    [currentInputSpec]
  );

  // 現在の出題キーをハイライト
  useEffect(() => {
    if (started && currentInputSpec && !lastResult) {
      onHighlightKeys(buildHighlightEntries("target"));
    } else if (!currentCommand || !started) {
      onHighlightKeys([]);
    }
  }, [currentCommand, currentInputSpec, started, lastResult, onHighlightKeys, buildHighlightEntries]);

  // キー入力ハンドラ
  useEffect(() => {
    if (!started || !currentCommand) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // 修飾キー単体は無視
      if (["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab", "Escape"].includes(e.key)) return;

      e.preventDefault();

      const result = checkAnswer(e.key, e.shiftKey);

      if (result === "correct") {
        onHighlightKeys(buildHighlightEntries("correct"));
        setTimeout(() => {
          pickNext(currentCommand);
        }, 500);
      } else {
        onHighlightKeys(buildHighlightEntries("incorrect"));
        setTimeout(() => {
          onHighlightKeys(buildHighlightEntries("target"));
        }, 800);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [started, currentCommand, checkAnswer, pickNext, onHighlightKeys, buildHighlightEntries]);

  return (
    <div className={styles.container}>
      <CategoryFilter
        selectedCategories={selectedCategories}
        onToggle={toggleCategory}
      />
      <PracticePrompt
        command={currentCommand}
        inputSpec={currentInputSpec}
        score={score}
        lastResult={lastResult}
        started={started}
        onStart={handleStart}
      />
    </div>
  );
}
