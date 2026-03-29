import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ROOT = resolve(fileURLToPath(import.meta.url), "../../..");

function readCss(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), "utf-8");
}

const indexCss = readCss("src/index.css");

function extractRootBlock(css: string): string {
  const match = css.match(/:root\s*\{([^}]*)\}/);
  return match ? match[1] : "";
}

function excludeRootBlock(css: string): string {
  return css.replace(/:root\s*\{[^}]*\}/g, "");
}

const CTP_VARIABLES: Array<{ name: string; hex: string }> = [
  { name: "--ctp-crust", hex: "#11111b" },
  { name: "--ctp-mantle", hex: "#181825" },
  { name: "--ctp-base", hex: "#1e1e2e" },
  { name: "--ctp-surface0", hex: "#24273a" },
  { name: "--ctp-surface1", hex: "#313244" },
  { name: "--ctp-surface2", hex: "#45475a" },
  { name: "--ctp-subtext0", hex: "#7f849c" },
  { name: "--ctp-subtext1", hex: "#6c7086" },
  { name: "--ctp-text", hex: "#a6adc8" },
  { name: "--ctp-foreground", hex: "#cdd6f4" },
  { name: "--ctp-blue", hex: "#89b4fa" },
  { name: "--ctp-cyan", hex: "#4fc3f7" },
  { name: "--ctp-green", hex: "#a6e3a1" },
  { name: "--ctp-red", hex: "#f38ba8" },
  { name: "--ctp-peach", hex: "#fab387" },
  { name: "--ctp-yellow", hex: "#f9e2af" },
];

const CTP_RGB_PATTERNS: Array<{ name: string; rgbPattern: RegExp }> = [
  { name: "--ctp-surface2", rgbPattern: /rgba?\(\s*69\s*,\s*71\s*,\s*90/ },
  { name: "--ctp-blue", rgbPattern: /rgba?\(\s*137\s*,\s*180\s*,\s*250/ },
  { name: "--ctp-green", rgbPattern: /rgba?\(\s*166\s*,\s*227\s*,\s*161/ },
  { name: "--ctp-red", rgbPattern: /rgba?\(\s*243\s*,\s*139\s*,\s*168/ },
  { name: "--ctp-cyan", rgbPattern: /rgba?\(\s*79\s*,\s*195\s*,\s*247/ },
  { name: "--ctp-crust", rgbPattern: /rgba?\(\s*17\s*,\s*17\s*,\s*27/ },
  { name: "--ctp-mantle", rgbPattern: /rgba?\(\s*24\s*,\s*24\s*,\s*37/ },
  { name: "--ctp-base", rgbPattern: /rgba?\(\s*30\s*,\s*30\s*,\s*46/ },
  { name: "--ctp-surface0", rgbPattern: /rgba?\(\s*36\s*,\s*39\s*,\s*58/ },
  { name: "--ctp-surface1", rgbPattern: /rgba?\(\s*49\s*,\s*50\s*,\s*68/ },
  { name: "--ctp-subtext0", rgbPattern: /rgba?\(\s*127\s*,\s*132\s*,\s*156/ },
  { name: "--ctp-subtext1", rgbPattern: /rgba?\(\s*108\s*,\s*112\s*,\s*134/ },
  { name: "--ctp-text", rgbPattern: /rgba?\(\s*166\s*,\s*173\s*,\s*200/ },
  { name: "--ctp-foreground", rgbPattern: /rgba?\(\s*205\s*,\s*214\s*,\s*244/ },
  { name: "--ctp-peach", rgbPattern: /rgba?\(\s*250\s*,\s*179\s*,\s*135/ },
  { name: "--ctp-yellow", rgbPattern: /rgba?\(\s*249\s*,\s*226\s*,\s*175/ },
];

const TARGET_CSS_PATHS = [
  "src/App.module.css",
  "src/components/BindingEditor/BindingEditor.module.css",
  "src/components/CommandDetail/CommandDetail.module.css",
  "src/components/CommandReference/CommandReference.module.css",
  "src/components/ExportPanel/ExportPanel.module.css",
  "src/components/Keyboard/Key.module.css",
  "src/components/KeyCapture/KeyCapture.module.css",
  "src/components/LayoutLoader/LayoutLoader.module.css",
  "src/components/ModeSelector/ModeSelector.module.css",
  "src/components/PracticeMode/PracticePrompt.module.css",
];

describe("CSS カスタムプロパティ統合テスト", () => {
  describe("src/index.css の :root 定義", () => {
    const rootBlock = extractRootBlock(indexCss);

    it(":root ブロックが存在する", () => {
      expect(rootBlock).not.toBe("");
    });

    for (const { name, hex } of CTP_VARIABLES) {
      it(`${name}: ${hex} が定義されている`, () => {
        const pattern = new RegExp(
          `${name.replace(/[-]/g, "\\$&")}\\s*:\\s*${hex.replace(/[#]/g, "\\$&")}`,
        );
        expect(
          pattern.test(rootBlock),
          `${name} が ${hex} として :root に定義されていない`,
        ).toBe(true);
      });
    }
  });

  describe("対象 CSS ファイルのハードコード色値排除", () => {
    for (const filePath of TARGET_CSS_PATHS) {
      describe(filePath, () => {
        const cssBody = excludeRootBlock(readCss(filePath));

        it("Catppuccin の hex 色値がハードコードされていない", () => {
          const found: Array<{ variable: string; hex: string }> = [];
          for (const { name, hex } of CTP_VARIABLES) {
            const pattern = new RegExp(hex.replace("#", "#?"), "i");
            if (pattern.test(cssBody)) {
              found.push({ variable: name, hex });
            }
          }
          expect(
            found,
            `ハードコードされた Catppuccin カラーが残っています: ${JSON.stringify(found)}`,
          ).toHaveLength(0);
        });

        it("Catppuccin カラーの rgba() 表現がハードコードされていない", () => {
          const found: Array<{ variable: string; match: string }> = [];
          for (const { name, rgbPattern } of CTP_RGB_PATTERNS) {
            const match = cssBody.match(rgbPattern);
            if (match) {
              found.push({ variable: name, match: match[0] });
            }
          }
          expect(
            found,
            `ハードコードされた rgba() 形式の Catppuccin カラーが残っています: ${JSON.stringify(found)}`,
          ).toHaveLength(0);
        });
      });
    }
  });

  describe("src/index.css の :root 外ブロックのハードコード色値排除", () => {
    const indexCssBody = excludeRootBlock(indexCss);

    it("Catppuccin の hex 色値が :root 外にハードコードされていない", () => {
      const found: Array<{ variable: string; hex: string }> = [];
      for (const { name, hex } of CTP_VARIABLES) {
        const pattern = new RegExp(hex.replace("#", "#?"), "i");
        if (pattern.test(indexCssBody)) {
          found.push({ variable: name, hex });
        }
      }
      expect(
        found,
        `index.css の :root 外に Catppuccin カラーが残っています: ${JSON.stringify(found)}`,
      ).toHaveLength(0);
    });
  });
});
