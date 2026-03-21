import type { KeyboardLayout } from "../../types/keyboard";
import type { VimCommand, HighlightEntry } from "../../types/vim";
import { getVimCommandByKey } from "../../data/vim-commands";
import { invertKeymap } from "../../data/keymap";
import { Key } from "./Key";
import styles from "./Keyboard.module.css";

const KEY_SIZE = 54;
const GAP = 2;

/**
 * KLE ラベル → QWERTY キー名 のマッピング（文字ラベル用）
 */
const labelToQwerty: Record<string, string> = {
  Q: "q", W: "w", E: "e", R: "r", T: "t", Y: "y", U: "u", I: "i", O: "o", P: "p",
  A: "a", S: "s", D: "d", F: "f", G: "g", H: "h", J: "j", K: "k", L: "l",
  Z: "z", X: "x", C: "c", V: "v", B: "b", N: "n", M: "m",
  ";": ";", "'": "'", ",": ",", ".": ".", "/": "/",
  "-": "-", "=": "=", "[": "[", "]": "]", "\\": "\\",
  "`": "`",
};

interface KeyboardProps {
  layout: KeyboardLayout;
  customKeymap: Record<string, string>;
  matrixKeymap: Record<string, string> | null;
  onHover: (cmd: VimCommand | null, customKey: string | null) => void;
  highlightKeys?: HighlightEntry[];
}

export function Keyboard({ layout, customKeymap, matrixKeymap, onHover, highlightKeys }: KeyboardProps) {
  // カスタム配列の逆引き: 出力文字 → QWERTY位置
  const inverseCustom = invertKeymap(customKeymap);

  // キーボード全体のバウンディングボックスを計算
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const key of layout.keys) {
    if (key.r !== 0) {
      const rad = (key.r * Math.PI) / 180;
      const corners = [
        [key.x, key.y],
        [key.x + key.w, key.y],
        [key.x, key.y + key.h],
        [key.x + key.w, key.y + key.h],
      ];
      for (const [px, py] of corners) {
        const dx = px - key.rx;
        const dy = py - key.ry;
        const rx = key.rx + dx * Math.cos(rad) - dy * Math.sin(rad);
        const ry = key.ry + dx * Math.sin(rad) + dy * Math.cos(rad);
        if (rx < minX) minX = rx;
        if (ry < minY) minY = ry;
        if (rx > maxX) maxX = rx;
        if (ry > maxY) maxY = ry;
      }
    } else {
      if (key.x < minX) minX = key.x;
      if (key.y < minY) minY = key.y;
      if (key.x + key.w > maxX) maxX = key.x + key.w;
      if (key.y + key.h > maxY) maxY = key.y + key.h;
    }
  }

  const offsetX = -minX;
  const offsetY = -minY;
  const width = (maxX - minX) * (KEY_SIZE + GAP) + GAP;
  const height = (maxY - minY) * (KEY_SIZE + GAP) + GAP;

  return (
    <div className={styles.container} style={{ width, height }}>
      {layout.keys.map((keyData, i) => {
        let displayLabel: string | null = null;
        let vimCommand: VimCommand | null = null;

        if (matrixKeymap) {
          // === VIA キーマップが読み込まれている場合 ===
          // マトリクス座標 → VIA が教えてくれる出力文字
          const outputChar = matrixKeymap[keyData.label] ?? null;

          if (outputChar && outputChar.length === 1) {
            displayLabel = outputChar;
            // 出力文字 → 逆引きで QWERTY 位置 → Vim コマンド
            // (langmap と同じ変換: ユーザーが "l" を押すと Vim は "w" と解釈)
            const qwertyPos = inverseCustom[outputChar] ?? outputChar;
            vimCommand = getVimCommandByKey(qwertyPos) ?? null;
          } else if (outputChar) {
            // space, tab, enter 等の特殊キー
            displayLabel = outputChar;
          }
        } else {
          // === ANSI 標準レイアウト (VIA キーマップなし) ===
          const qwertyKey = labelToQwerty[keyData.label] ?? null;
          if (qwertyKey) {
            displayLabel = customKeymap[qwertyKey] ?? qwertyKey;
            vimCommand = getVimCommandByKey(qwertyKey) ?? null;
          }
        }

        const offsetKeyData = {
          ...keyData,
          x: keyData.x + offsetX,
          y: keyData.y + offsetY,
        };

        // ハイライト判定: QWERTY位置またはマトリクスキーでマッチ
        let keyQwertyPos: string | null = null;
        if (matrixKeymap) {
          const outputChar = matrixKeymap[keyData.label] ?? null;
          if (outputChar && outputChar.length === 1) {
            keyQwertyPos = inverseCustom[outputChar] ?? outputChar;
          }
        } else {
          keyQwertyPos = labelToQwerty[keyData.label] ?? null;
        }
        const matchedHighlight = highlightKeys?.find((h) =>
          h.qwertyKey === keyQwertyPos || h.qwertyKey === keyData.label
        );
        const keyHighlight = matchedHighlight?.state ?? null;

        return (
          <Key
            key={i}
            keyData={offsetKeyData}
            qwertyLabel={displayLabel}
            customLabel={displayLabel}
            vimCommand={vimCommand}
            onHover={onHover}
            highlightState={keyHighlight}
          />
        );
      })}
    </div>
  );
}
