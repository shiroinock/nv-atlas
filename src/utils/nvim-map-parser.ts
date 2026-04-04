import type { NvimMapMode, NvimMapping, NvimMapSource } from "../types/vim";
import { isPlugMapping } from "./plug-mapping";

/**
 * `nvim --headless` の `verbose map` 出力をパースする
 *
 * 各エントリは 1〜3 行:
 *   n  [d          * <Lua 29: vim/_defaults.lua:0>
 *                    Jump to the previous diagnostic
 *   \tLast set from Lua (run Nvim with -V1 for more details)
 */
export function parseNvimMapOutput(raw: string): NvimMapping[] {
  const lines = raw.split("\n");
  const entries: NvimMapping[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // マッピング行: 先頭がモード文字 + スペース (or スペース2つ = 全モード)
    const mapMatch = line.match(
      /^([nxovsic!] | {2})(.+?)(\s+\*\s+|\s{2,})(.+)$/,
    );
    if (!mapMatch) {
      i++;
      continue;
    }

    const modeChar = mapMatch[1].trim();
    const lhs = mapMatch[2].trim();
    const noremap = mapMatch[3].includes("*");
    const rhs = mapMatch[4].trimEnd();

    // <Plug> マッピングはスキップ
    if (isPlugMapping(lhs)) {
      i++;
      // 後続の description/source 行をスキップ
      while (
        i < lines.length &&
        (lines[i].startsWith(" ") || lines[i].startsWith("\t"))
      )
        i++;
      continue;
    }

    let description = "";
    let source: NvimMapSource = "user";
    let sourceDetail = "";

    // 次行: description (先頭がスペース、タブでない)
    if (
      i + 1 < lines.length &&
      lines[i + 1].match(/^ {2,}/) &&
      !lines[i + 1].startsWith("\t")
    ) {
      i++;
      description = lines[i].trim();
      // :help で始まるものはそのまま使う
    }

    // 次行: source (先頭がタブ)
    if (i + 1 < lines.length && lines[i + 1].startsWith("\t")) {
      i++;
      const sourceLine = lines[i].trim();
      const lastSetMatch = sourceLine.match(/^Last set from (.+)/);
      if (lastSetMatch) {
        sourceDetail = lastSetMatch[1];
        source = classifySource(sourceDetail);
      }
    }

    entries.push({
      mode: (modeChar || "") as NvimMapMode,
      lhs,
      rhs,
      noremap,
      description,
      source,
      sourceDetail,
    });

    i++;
  }

  return entries;
}

function classifySource(detail: string): NvimMapSource {
  if (
    detail.includes("vim/_defaults.lua") ||
    detail.includes("vim.lua") ||
    detail.includes("Lua (run Nvim")
  ) {
    return "nvim-default";
  }
  if (
    detail.includes("/runtime/") ||
    detail.includes("/pack/") ||
    detail.includes("matchit") ||
    detail.includes("man.lua")
  ) {
    return "plugin";
  }
  return "user";
}
