import { useCallback, useMemo, useState } from "react";
import {
  categoryColors,
  categoryLabels,
  sourceColors,
  sourceLabels,
  vimCommands,
} from "../../data/vim-commands";
import type { VimMode } from "../../types/keybinding";
import type {
  HighlightEntry,
  MergedVimCommand,
  VIAKeymapFull,
  VimCommand,
  VimCommandCategory,
  VimCommandSource,
} from "../../types/vim";
import { matchesVimMode, VIM_COMMAND_CATEGORIES } from "../../types/vim";
import { cx } from "../../utils/cx";
import { resolveVimKey } from "../../utils/vim-key-resolver";
import styles from "./CommandReference.module.css";

interface Props {
  customKeymap: Record<string, string>;
  viaKeymapFull?: VIAKeymapFull | null;
  onHighlightKeys: (keys: HighlightEntry[]) => void;
  mergedCommands?: MergedVimCommand[] | null;
  activeVimMode?: VimMode;
}

/**
 * Vim キーをユーザーの配列表記に変換する
 */
function translateKey(
  vimKey: string,
  customKeymap: Record<string, string>,
  viaKeymapFull?: VIAKeymapFull | null,
): string {
  const resolution = resolveVimKey(vimKey, customKeymap, viaKeymapFull);

  if (resolution.ctrl) {
    const { displayLabel } = resolution.ctrl;
    return `Ctrl+${displayLabel}`;
  }

  const parts: string[] = [];
  // レイヤーラベルは先頭に1回だけ表示
  const layerLabels = new Set<string>();
  for (const ch of resolution.chars) {
    if (ch.requiresLayer && ch.layerLabel) {
      layerLabels.add(ch.layerLabel);
    }
  }

  if (layerLabels.size > 0) {
    parts.push([...layerLabels].join("+"));
  }

  const keyPart = resolution.chars.map((ch) => ch.displayLabel).join("");
  parts.push(keyPart);

  return parts.join(" + ");
}

/**
 * Vim キーからハイライト対象キーを生成する
 */
function vimKeyToHighlights(
  vimKey: string,
  customKeymap: Record<string, string>,
  viaKeymapFull?: VIAKeymapFull | null,
): HighlightEntry[] {
  const entries: HighlightEntry[] = [];
  const seen = new Set<string>();

  const add = (key: string, state: HighlightEntry["state"]) => {
    const id = `${key}:${state}`;
    if (!seen.has(id)) {
      seen.add(id);
      entries.push({ qwertyKey: key, state });
    }
  };

  const resolution = resolveVimKey(vimKey, customKeymap, viaKeymapFull);

  if (resolution.ctrl) {
    add(resolution.ctrl.qwertyKey, "target");
    if (resolution.ctrl.ctrlMatrixKey) {
      add(resolution.ctrl.ctrlMatrixKey, "modifier");
    }
    return entries;
  }

  for (const ch of resolution.chars) {
    add(ch.qwertyKey, "target");
    if (ch.requiresShift && ch.shiftMatrixKey) {
      add(ch.shiftMatrixKey, "modifier");
    }
    if (ch.requiresLayer && ch.layerMatrixKey) {
      add(ch.layerMatrixKey, "modifier");
    }
  }

  return entries;
}

const allSources: VimCommandSource[] = [
  "hardcoded",
  "nvim-default",
  "plugin",
  "user",
];

export function CommandReference({
  customKeymap,
  viaKeymapFull,
  onHighlightKeys,
  mergedCommands,
  activeVimMode = "n",
}: Props) {
  const [selectedCategories, setSelectedCategories] = useState<
    Set<VimCommandCategory>
  >(new Set(VIM_COMMAND_CATEGORIES));
  const [selectedSources, setSelectedSources] = useState<Set<VimCommandSource>>(
    new Set(allSources),
  );
  const [searchText, setSearchText] = useState("");

  const commands = mergedCommands ?? vimCommands;
  const hasSources = mergedCommands != null;

  const handleRowEnter = useCallback(
    (cmd: VimCommand) => {
      onHighlightKeys(vimKeyToHighlights(cmd.key, customKeymap, viaKeymapFull));
    },
    [onHighlightKeys, customKeymap, viaKeymapFull],
  );

  const handleRowLeave = useCallback(() => {
    onHighlightKeys([]);
  }, [onHighlightKeys]);

  const filteredCommands = useMemo(() => {
    const lowerSearch = searchText.toLowerCase();
    return commands.filter((cmd) => {
      // モードフィルタ: コマンドの modes に activeVimMode が含まれるか
      const modes = cmd.modes ?? ["n"];
      if (!matchesVimMode(modes, activeVimMode)) return false;
      if (!selectedCategories.has(cmd.category)) return false;
      if (
        hasSources &&
        !selectedSources.has((cmd as MergedVimCommand).source ?? "hardcoded")
      )
        return false;
      if (searchText === "") return true;
      return (
        cmd.key.toLowerCase().includes(lowerSearch) ||
        cmd.name.toLowerCase().includes(lowerSearch) ||
        cmd.description.toLowerCase().includes(lowerSearch) ||
        translateKey(cmd.key, customKeymap, viaKeymapFull)
          .toLowerCase()
          .includes(lowerSearch)
      );
    });
  }, [
    commands,
    selectedCategories,
    selectedSources,
    hasSources,
    searchText,
    customKeymap,
    viaKeymapFull,
    activeVimMode,
  ]);

  // カテゴリでグループ化
  const grouped = useMemo(() => {
    const groups: Partial<Record<VimCommandCategory, VimCommand[]>> = {};
    for (const cmd of filteredCommands) {
      if (!groups[cmd.category]) groups[cmd.category] = [];
      const group = groups[cmd.category];
      if (group) group.push(cmd);
    }
    return groups;
  }, [filteredCommands]);

  const toggleCategory = (cat: VimCommandCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(cat)) {
        if (next.size > 1) next.delete(cat);
      } else {
        next.add(cat);
      }
      return next;
    });
  };

  const toggleSource = (src: VimCommandSource) => {
    setSelectedSources((prev) => {
      const next = new Set(prev);
      if (next.has(src)) {
        if (next.size > 1) next.delete(src);
      } else {
        next.add(src);
      }
      return next;
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.controls}>
        <div className={styles.categories}>
          {VIM_COMMAND_CATEGORIES.map((cat) => (
            <button
              type="button"
              key={cat}
              className={cx(
                styles.filterButton,
                selectedCategories.has(cat) && styles.filterSelected,
              )}
              style={
                selectedCategories.has(cat)
                  ? {
                      borderColor: categoryColors[cat],
                      color: categoryColors[cat],
                    }
                  : undefined
              }
              onClick={() => toggleCategory(cat)}
            >
              {categoryLabels[cat]}
            </button>
          ))}
        </div>
        {hasSources && (
          <div className={styles.sources}>
            {allSources.map((src) => (
              <button
                type="button"
                key={src}
                className={cx(
                  styles.filterButton,
                  selectedSources.has(src) && styles.filterSelected,
                )}
                style={
                  selectedSources.has(src)
                    ? {
                        borderColor: sourceColors[src],
                        color: sourceColors[src],
                      }
                    : undefined
                }
                onClick={() => toggleSource(src)}
              >
                {sourceLabels[src]}
              </button>
            ))}
          </div>
        )}
        <input
          className={styles.search}
          type="text"
          placeholder="検索..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </div>

      <div className={styles.tableWrapper}>
        {VIM_COMMAND_CATEGORIES.filter((cat) => grouped[cat]).map((cat) => (
          <div key={cat} className={styles.group}>
            <h3
              className={styles.groupTitle}
              style={{ color: categoryColors[cat] }}
            >
              {categoryLabels[cat]}
            </h3>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th className={styles.thKey}>Vim キー</th>
                  <th className={styles.thKey}>あなたの配列</th>
                  <th className={styles.thName}>名前</th>
                  <th className={styles.thDesc}>説明</th>
                  {hasSources && <th className={styles.thSource}>ソース</th>}
                </tr>
              </thead>
              <tbody>
                {(grouped[cat] ?? []).map((cmd) => {
                  const translated = translateKey(
                    cmd.key,
                    customKeymap,
                    viaKeymapFull,
                  );
                  const isDifferent = translated !== cmd.key;
                  const source = (cmd as MergedVimCommand).source;
                  return (
                    <tr
                      key={cmd.key}
                      className={styles.row}
                      onMouseEnter={() => handleRowEnter(cmd)}
                      onMouseLeave={handleRowLeave}
                    >
                      <td className={styles.cellKey}>
                        <code>{cmd.key}</code>
                      </td>
                      <td
                        className={cx(
                          styles.cellKey,
                          isDifferent && styles.cellDiff,
                        )}
                      >
                        <code>{translated}</code>
                      </td>
                      <td className={styles.cellName}>{cmd.name}</td>
                      <td className={styles.cellDesc}>{cmd.description}</td>
                      {hasSources && (
                        <td className={styles.cellSource}>
                          <span
                            className={styles.sourceBadge}
                            style={{ color: sourceColors[source] }}
                          >
                            {sourceLabels[source]}
                          </span>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ))}
      </div>

      <p className={styles.count}>{filteredCommands.length} コマンド</p>
    </div>
  );
}
