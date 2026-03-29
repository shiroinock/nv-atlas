import { describe, expect, it } from "vitest";
import type { VimMode } from "../types/keybinding";
import type { NvimMapping, VimCommand } from "../types/vim";
import { mergeWithNvimMaps } from "./merge-vim-commands";

const baseCommands: VimCommand[] = [
  { key: "j", name: "↓", description: "下に移動", category: "motion" },
  { key: "k", name: "↑", description: "上に移動", category: "motion" },
  { key: "dd", name: "行削除", description: "行を削除", category: "edit" },
];

function makeNvimMap(
  overrides: Partial<NvimMapping> & { lhs: string },
): NvimMapping {
  return {
    mode: "n",
    rhs: "",
    noremap: true,
    description: overrides.description ?? "test",
    source: "user",
    sourceDetail: "init.lua",
    ...overrides,
  };
}

describe("mergeWithNvimMaps", () => {
  it("nvim マップが空なら hardcoded をそのまま返す", () => {
    const result = mergeWithNvimMaps(baseCommands, []);
    expect(result).toHaveLength(3);
    expect(result.every((c) => c.source === "hardcoded")).toBe(true);
  });

  it("既存キーに一致する nvim マップは source を更新する", () => {
    const nvimMaps = [makeNvimMap({ lhs: "j", source: "user" })];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);

    const j = result.find((c) => c.key === "j");
    expect(j?.source).toBe("user");
    expect(j?.nvimOverride).toBe(true);
  });

  it("新規キーの nvim マップはマージ結果に追加される", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "gd", description: "Go to definition" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);

    expect(result).toHaveLength(4);
    const gd = result.find((c) => c.key === "gd");
    expect(gd).toBeDefined();
    expect(gd?.description).toBe("Go to definition");
    expect(gd?.category).toBe("misc");
  });

  it("description が空の nvim マップはスキップされる", () => {
    const nvimMaps = [makeNvimMap({ lhs: "gx", description: "" })];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    expect(result).toHaveLength(3);
  });

  it("<Plug> で始まるマップはスキップされる", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "<Plug>(something)", description: "plugin" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    expect(result).toHaveLength(3);
  });

  it("visual mode (x) のマップがマージされる", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "jk", mode: "x", description: "escape" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    expect(result).toHaveLength(4);
    const jk = result.find((c) => c.key === "jk");
    expect(jk).toBeDefined();
    expect(jk?.description).toBe("escape");
  });

  it("insert mode (!) のマップがマージされる", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "jk", mode: "!", description: "escape insert" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    expect(result).toHaveLength(4);
    const jk = result.find((c) => c.key === "jk");
    expect(jk).toBeDefined();
    expect(jk?.description).toBe("escape insert");
  });

  it("全モード指定 (空文字列) のマップがマージされる", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "gf", mode: "", description: "go to file" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    expect(result).toHaveLength(4);
    const gf = result.find((c) => c.key === "gf");
    expect(gf).toBeDefined();
  });

  it("MergedVimCommand に modes が正しく設定される（visual mode）", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "gv", mode: "x", description: "reselect visual" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    const gv = result.find((c) => c.key === "gv");
    expect(gv?.modes).toEqual(["x"] satisfies VimMode[]);
  });

  it("MergedVimCommand に modes が正しく設定される（v → visual + select）", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "gv", mode: "v", description: "reselect visual" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    const gv = result.find((c) => c.key === "gv");
    expect(gv?.modes).toEqual(["v", "x", "s"] satisfies VimMode[]);
  });

  it("MergedVimCommand に modes が正しく設定される（! → insert + command-line）", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "jk", mode: "!", description: "escape" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    const jk = result.find((c) => c.key === "jk");
    expect(jk?.modes).toEqual(["i", "c"] satisfies VimMode[]);
  });

  it("MergedVimCommand に modes が正しく設定される（空文字列 → n/v/x/o）", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "gf", mode: "", description: "go to file" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    const gf = result.find((c) => c.key === "gf");
    expect(gf?.modes).toEqual(["n", "v", "x", "o"] satisfies VimMode[]);
  });

  it("<Plug> で始まるマップは全モードでスキップされる", () => {
    const nvimMaps = [
      makeNvimMap({
        lhs: "<Plug>(visual-op)",
        mode: "x",
        description: "plugin",
      }),
      makeNvimMap({
        lhs: "<Plug>(insert-op)",
        mode: "!",
        description: "plugin",
      }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    expect(result).toHaveLength(3);
  });

  it("同じキーでモードが異なるマップは別エントリとして扱われる", () => {
    const nvimMaps = [
      makeNvimMap({
        lhs: "gd",
        mode: "n",
        description: "go to definition normal",
      }),
      makeNvimMap({
        lhs: "gd",
        mode: "x",
        description: "go to definition visual",
      }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);
    const gds = result.filter((c) => c.key === "gd");
    expect(gds).toHaveLength(2);
    const normalEntry = gds.find(
      (c) => c.modes?.includes("n") || c.modes === undefined,
    );
    const visualEntry = gds.find(
      (c) => c.modes?.includes("x") && !c.modes?.includes("n"),
    );
    expect(normalEntry).toBeDefined();
    expect(visualEntry).toBeDefined();
  });

  it("VimCommand.modes と NvimMapping の mode が照合される", () => {
    const commandsWithModes: VimCommand[] = [
      {
        key: "p",
        name: "貼り付け",
        description: "貼り付け",
        category: "edit",
        modes: ["n"],
      },
      {
        key: "p",
        name: "貼り付け(visual)",
        description: "選択範囲を置換して貼り付け",
        category: "edit",
        modes: ["x"],
      },
    ];
    const nvimMaps = [
      makeNvimMap({
        lhs: "p",
        mode: "x",
        source: "user",
        description: "custom paste",
      }),
    ];
    const result = mergeWithNvimMaps(commandsWithModes, nvimMaps);
    const visualP = result.find(
      (c) => c.key === "p" && c.modes?.includes("x") && !c.modes?.includes("n"),
    );
    expect(visualP?.source).toBe("user");
    expect(visualP?.nvimOverride).toBe(true);
    const normalP = result.find((c) => c.key === "p" && c.modes?.includes("n"));
    expect(normalP?.source).toBe("hardcoded");
  });

  it("<C-X> を <C-x> に正規化してマッチする", () => {
    const commands: VimCommand[] = [
      {
        key: "<C-f>",
        name: "Scroll",
        description: "前方スクロール",
        category: "motion",
      },
    ];
    const nvimMaps = [
      makeNvimMap({
        lhs: "<C-F>",
        source: "nvim-default",
        description: "scroll",
      }),
    ];
    const result = mergeWithNvimMaps(commands, nvimMaps);

    const cf = result.find((c) => c.key === "<C-f>");
    expect(cf?.source).toBe("nvim-default");
    expect(cf?.nvimOverride).toBe(true);
  });

  it("同じキーの重複 nvim マップは最初のもののみ反映される", () => {
    const nvimMaps = [
      makeNvimMap({ lhs: "gd", description: "first", source: "user" }),
      makeNvimMap({ lhs: "gd", description: "second", source: "nvim-default" }),
    ];
    const result = mergeWithNvimMaps(baseCommands, nvimMaps);

    const gds = result.filter((c) => c.key === "gd");
    expect(gds).toHaveLength(1);
    expect(gds[0].description).toBe("first");
  });
});
