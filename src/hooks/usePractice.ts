import { useCallback, useMemo, useState } from "react";
import { invertKeymap } from "../data/keymap";
import { decomposeVimKey, vimCommands } from "../data/vim-commands";
import {
  type KeyInputSpec,
  type LayerKeyInfo,
  type ModifierKeyInfo,
  type PracticeScore,
  type VIAKeymapFull,
  VIM_PRACTICE_CATEGORIES,
  type VimCommand,
  type VimCommandCategory,
} from "../types/vim";
import { shiftMap } from "../utils/via-keymap-parser";

/**
 * Vim コマンドの入力方法を解決する
 */
function resolveKeyInput(
  cmd: VimCommand,
  customKeymap: Record<string, string>,
  viaKeymapFull?: VIAKeymapFull | null,
): KeyInputSpec | null {
  const { base, shifted } = decomposeVimKey(cmd.key);
  const inverseCustom = invertKeymap(customKeymap);

  // --- 1. ベースキーが customKeymap にある場合 ---
  if (base in customKeymap) {
    const outputChar = customKeymap[base];

    if (!shifted) {
      // 直接キー
      return {
        targetQwertyKey: base,
        requiresShift: false,
        expectedEventKey: outputChar,
        hint: outputChar,
      };
    }

    // Shift + ベースキー
    const shiftedOutput = /^[a-z]$/.test(outputChar)
      ? outputChar.toUpperCase()
      : (shiftMap[outputChar] ?? outputChar);

    const shiftMod = findShiftModifier(viaKeymapFull);
    return {
      targetQwertyKey: base,
      modifierInfo: shiftMod ?? undefined,
      requiresShift: true,
      expectedEventKey: shiftedOutput,
      hint: buildHint(shiftMod, null, shiftedOutput),
    };
  }

  // --- 2. VIA キーマップのレイヤーにある場合 ---
  if (viaKeymapFull) {
    // レイヤー上で直接見つかるか（S(KC_4) → "$" 等）
    for (
      let layerIdx = 0;
      layerIdx < viaKeymapFull.layerKeys.length;
      layerIdx++
    ) {
      const layerMap = viaKeymapFull.layerKeys[layerIdx];
      const targetLayer = layerIdx + 1; // layerKeys[0] = layer 1

      // コマンドのキーがレイヤー上に直接ある
      for (const [matrixKey, outputChar] of Object.entries(layerMap)) {
        if (outputChar !== cmd.key) continue;

        // このレイヤーへの切替キーを探す
        const layerKey = findLayerKey(viaKeymapFull, targetLayer);
        if (!layerKey) continue;

        // ターゲットキーの QWERTY 位置を解決
        // base layer の同じ matrix 位置から QWERTY 位置を取得
        const baseOutputAtPos = viaKeymapFull.baseKeys[matrixKey];
        const qwertyPos = baseOutputAtPos
          ? (inverseCustom[baseOutputAtPos] ?? baseOutputAtPos)
          : matrixKey;

        return {
          targetQwertyKey: qwertyPos,
          layerInfo: layerKey,
          requiresShift: false,
          expectedEventKey: cmd.key,
          hint: buildHint(null, layerKey, cmd.key),
        };
      }

      // Shift 分解したベースキーがレイヤー上にある場合
      if (shifted) {
        for (const [matrixKey, outputChar] of Object.entries(layerMap)) {
          if (outputChar !== base) continue;

          const layerKey = findLayerKey(viaKeymapFull, targetLayer);
          if (!layerKey) continue;

          const shiftMod = findShiftModifier(viaKeymapFull);
          const baseOutputAtPos = viaKeymapFull.baseKeys[matrixKey];
          const qwertyPos = baseOutputAtPos
            ? (inverseCustom[baseOutputAtPos] ?? baseOutputAtPos)
            : matrixKey;

          const shiftedOutput = /^[a-z]$/.test(base)
            ? base.toUpperCase()
            : (shiftMap[base] ?? base);

          return {
            targetQwertyKey: qwertyPos,
            modifierInfo: shiftMod ?? undefined,
            layerInfo: layerKey,
            requiresShift: true,
            expectedEventKey: shiftedOutput,
            hint: buildHint(shiftMod, layerKey, shiftedOutput),
          };
        }
      }
    }
  }

  return null;
}

function findShiftModifier(
  viaKeymapFull?: VIAKeymapFull | null,
): ModifierKeyInfo | null {
  if (!viaKeymapFull) return null;
  return viaKeymapFull.modifiers.find((m) => m.modifier === "shift") ?? null;
}

function findLayerKey(
  viaKeymapFull: VIAKeymapFull,
  layer: number,
): LayerKeyInfo | null {
  return viaKeymapFull.layerTaps.find((lt) => lt.layer === layer) ?? null;
}

function buildHint(
  shiftMod: ModifierKeyInfo | null,
  layerKey: LayerKeyInfo | null,
  displayKey: string,
): string {
  const parts: string[] = [];

  if (layerKey) {
    parts.push(layerKey.label);
  }

  if (shiftMod) {
    parts.push(`Shift (${shiftMod.label})`);
  } else if (!shiftMod && parts.length === 0) {
    // Shift が必要だが修飾キー情報がない（非 VIA モード）
    // この場合は呼び出し元で Shift を含めるかどうか判断
  }

  parts.push(displayKey);
  return parts.join(" + ");
}

/**
 * 練習モードのロジックを管理するフック
 */
export function usePractice(
  customKeymap: Record<string, string>,
  viaKeymapFull?: VIAKeymapFull | null,
) {
  const [selectedCategories, setSelectedCategories] = useState<
    Set<VimCommandCategory>
  >(() => new Set<VimCommandCategory>(VIM_PRACTICE_CATEGORIES));
  const [currentCommand, setCurrentCommand] = useState<VimCommand | null>(null);
  const [score, setScore] = useState<PracticeScore>({
    correct: 0,
    total: 0,
    streak: 0,
  });
  const [lastResult, setLastResult] = useState<"correct" | "incorrect" | null>(
    null,
  );

  // 各コマンドの入力方法を事前解決
  const inputSpecMap = useMemo(() => {
    const map = new Map<string, KeyInputSpec>();
    for (const cmd of vimCommands) {
      if (cmd.key.length !== 1) continue;
      const spec = resolveKeyInput(cmd, customKeymap, viaKeymapFull);
      if (spec) map.set(cmd.key, spec);
    }
    return map;
  }, [customKeymap, viaKeymapFull]);

  // 出題可能なコマンドをフィルタ
  const eligibleCommands = useMemo(() => {
    return vimCommands.filter((cmd) => {
      if (cmd.key.length !== 1) return false;
      if (!selectedCategories.has(cmd.category)) return false;
      // inputSpec が解決できるコマンドのみ出題
      return inputSpecMap.has(cmd.key);
    });
  }, [selectedCategories, inputSpecMap]);

  // 現在の出題の入力仕様
  const currentInputSpec = useMemo(() => {
    if (!currentCommand) return null;
    return inputSpecMap.get(currentCommand.key) ?? null;
  }, [currentCommand, inputSpecMap]);

  // ランダムに次の問題を選択（同じ問題の連続を避ける）
  const pickNext = useCallback(
    (exclude?: VimCommand | null) => {
      if (eligibleCommands.length === 0) {
        setCurrentCommand(null);
        return;
      }
      const candidates =
        eligibleCommands.length > 1
          ? eligibleCommands.filter((cmd) => cmd.key !== exclude?.key)
          : eligibleCommands;
      const next = candidates[Math.floor(Math.random() * candidates.length)];
      setCurrentCommand(next);
      setLastResult(null);
    },
    [eligibleCommands],
  );

  // 練習開始
  const startPractice = useCallback(() => {
    setScore({ correct: 0, total: 0, streak: 0 });
    setLastResult(null);
    pickNext();
  }, [pickNext]);

  // 回答チェック
  const checkAnswer = useCallback(
    (pressedKey: string, shiftHeld: boolean): "correct" | "incorrect" => {
      if (!currentCommand || !currentInputSpec) return "incorrect";

      const keyMatch = pressedKey === currentInputSpec.expectedEventKey;
      const shiftMatch = currentInputSpec.requiresShift ? shiftHeld : true;
      const isCorrect = keyMatch && shiftMatch;

      const result = isCorrect ? "correct" : "incorrect";
      setLastResult(result);
      setScore((prev) => ({
        correct: prev.correct + (isCorrect ? 1 : 0),
        total: prev.total + 1,
        streak: isCorrect ? prev.streak + 1 : 0,
      }));
      return result;
    },
    [currentCommand, currentInputSpec],
  );

  // カテゴリの切り替え
  const toggleCategory = useCallback((cat: VimCommandCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  }, []);

  return {
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
  };
}
