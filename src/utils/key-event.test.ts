import { describe, expect, it } from "vitest";
import { normalizeKeyEvent } from "./key-event";

describe("normalizeKeyEvent", () => {
  describe("通常キー単体", () => {
    it("小文字キーをそのまま返す", () => {
      const e = new KeyboardEvent("keydown", { key: "a" });
      expect(normalizeKeyEvent(e)).toBe("a");
    });

    it("大文字キーをそのまま返す", () => {
      const e = new KeyboardEvent("keydown", { key: "A" });
      expect(normalizeKeyEvent(e)).toBe("A");
    });

    it("数字キーをそのまま返す", () => {
      const e = new KeyboardEvent("keydown", { key: "1" });
      expect(normalizeKeyEvent(e)).toBe("1");
    });
  });

  describe("特殊キー変換", () => {
    it("Enter を <CR> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "Enter" });
      expect(normalizeKeyEvent(e)).toBe("<CR>");
    });

    it("Escape を <Esc> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "Escape" });
      expect(normalizeKeyEvent(e)).toBe("<Esc>");
    });

    it("Tab を <Tab> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "Tab" });
      expect(normalizeKeyEvent(e)).toBe("<Tab>");
    });

    it("Space を <Space> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: " " });
      expect(normalizeKeyEvent(e)).toBe("<Space>");
    });

    it("Backspace を <BS> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "Backspace" });
      expect(normalizeKeyEvent(e)).toBe("<BS>");
    });

    it("Delete を <Del> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "Delete" });
      expect(normalizeKeyEvent(e)).toBe("<Del>");
    });

    it("ArrowUp を <Up> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "ArrowUp" });
      expect(normalizeKeyEvent(e)).toBe("<Up>");
    });

    it("ArrowDown を <Down> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "ArrowDown" });
      expect(normalizeKeyEvent(e)).toBe("<Down>");
    });

    it("ArrowLeft を <Left> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "ArrowLeft" });
      expect(normalizeKeyEvent(e)).toBe("<Left>");
    });

    it("ArrowRight を <Right> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "ArrowRight" });
      expect(normalizeKeyEvent(e)).toBe("<Right>");
    });
  });

  describe("修飾キー単体", () => {
    it("Control 単体は空文字列を返す", () => {
      const e = new KeyboardEvent("keydown", { key: "Control" });
      expect(normalizeKeyEvent(e)).toBe("");
    });

    it("Shift 単体は空文字列を返す", () => {
      const e = new KeyboardEvent("keydown", { key: "Shift" });
      expect(normalizeKeyEvent(e)).toBe("");
    });

    it("Alt 単体は空文字列を返す", () => {
      const e = new KeyboardEvent("keydown", { key: "Alt" });
      expect(normalizeKeyEvent(e)).toBe("");
    });

    it("Meta 単体は空文字列を返す", () => {
      const e = new KeyboardEvent("keydown", { key: "Meta" });
      expect(normalizeKeyEvent(e)).toBe("");
    });
  });

  describe("修飾キー + 通常キーの組み合わせ", () => {
    it("Ctrl+f を <C-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "f", ctrlKey: true });
      expect(normalizeKeyEvent(e)).toBe("<C-f>");
    });

    it("Ctrl+u を <C-u> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "u", ctrlKey: true });
      expect(normalizeKeyEvent(e)).toBe("<C-u>");
    });

    it("Alt+f を <A-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "f", altKey: true });
      expect(normalizeKeyEvent(e)).toBe("<A-f>");
    });

    it("Meta+f を <M-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "f", metaKey: true });
      expect(normalizeKeyEvent(e)).toBe("<M-f>");
    });

    it("Ctrl+Enter を <C-CR> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: "Enter", ctrlKey: true });
      expect(normalizeKeyEvent(e)).toBe("<C-CR>");
    });

    it("Ctrl+Space を <C-Space> に変換する", () => {
      const e = new KeyboardEvent("keydown", { key: " ", ctrlKey: true });
      expect(normalizeKeyEvent(e)).toBe("<C-Space>");
    });
  });

  describe("複数修飾キーの組み合わせ", () => {
    it("Ctrl+Shift+f を <C-S-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
        shiftKey: true,
      });
      expect(normalizeKeyEvent(e)).toBe("<C-S-f>");
    });

    it("Ctrl+Alt+f を <C-A-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
        altKey: true,
      });
      expect(normalizeKeyEvent(e)).toBe("<C-A-f>");
    });

    it("Ctrl+Shift+Alt+f を <C-S-A-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", {
        key: "f",
        ctrlKey: true,
        shiftKey: true,
        altKey: true,
      });
      expect(normalizeKeyEvent(e)).toBe("<C-S-A-f>");
    });

    it("修飾キーの順序は C, S, A, M の順になる", () => {
      const e = new KeyboardEvent("keydown", {
        key: "x",
        metaKey: true,
        ctrlKey: true,
        altKey: true,
        shiftKey: true,
      });
      expect(normalizeKeyEvent(e)).toBe("<C-S-A-M-x>");
    });

    it("Shift+Meta+f を <S-M-f> に変換する", () => {
      const e = new KeyboardEvent("keydown", {
        key: "f",
        shiftKey: true,
        metaKey: true,
      });
      expect(normalizeKeyEvent(e)).toBe("<S-M-f>");
    });
  });
});
