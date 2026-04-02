import { describe, expect, it } from "vitest";
import { defaultCustomKeymap, QWERTY_KEYS } from "../data/keymap";
import type { KeymapValidationError } from "./keymap-validator";
import { validateKeymap } from "./keymap-validator";

describe("validateKeymap", () => {
  describe("正常系", () => {
    it("有効なキーマップでは空配列を返す", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "b",
        e: "c",
      };

      const result = validateKeymap(keymap);

      expect(result).toEqual([]);
    });

    it("30キー全てが有効なキーマップでは空配列を返す", () => {
      const result = validateKeymap(defaultCustomKeymap);

      expect(result).toEqual([]);
    });
  });

  describe("重複する出力文字の検出", () => {
    it('重複する出力文字を検出して type: "duplicate-output" のエラーを返す', () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
        e: "c",
      };

      const result = validateKeymap(keymap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("duplicate-output");
    });

    it("重複している出力文字を持つ全キーが keys プロパティに含まれる", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
        e: "c",
      };

      const result = validateKeymap(keymap);

      expect(result[0].keys).toContain("q");
      expect(result[0].keys).toContain("w");
    });

    it("3つ以上のキーが同じ出力文字を持つ場合も検出できる", () => {
      const keymap: Record<string, string> = {
        q: "x",
        w: "x",
        e: "x",
        r: "y",
      };

      const result = validateKeymap(keymap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("duplicate-output");
      expect(result[0].keys).toContain("q");
      expect(result[0].keys).toContain("w");
      expect(result[0].keys).toContain("e");
    });

    it("異なる出力文字グループが重複している場合はそれぞれ別エラーを返す", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
        e: "b",
        r: "b",
        t: "c",
      };

      const result = validateKeymap(keymap);

      const duplicateErrors = result.filter(
        (e) => e.type === "duplicate-output",
      );
      expect(duplicateErrors).toHaveLength(2);
    });
  });

  describe("サポート外の QWERTY キーの検出", () => {
    it('QWERTY 30キー以外のキーを検出して type: "invalid-qwerty" のエラーを返す', () => {
      const keymap: Record<string, string> = {
        q: "a",
        "1": "b",
        e: "c",
      };

      const result = validateKeymap(keymap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("invalid-qwerty");
    });

    it("無効なキーが keys プロパティに含まれる", () => {
      const keymap: Record<string, string> = {
        q: "a",
        "1": "b",
      };

      const result = validateKeymap(keymap);

      expect(result[0].keys).toContain("1");
    });

    it("複数の無効なキーをまとめて検出できる", () => {
      const keymap: Record<string, string> = {
        "1": "a",
        "2": "b",
        q: "c",
      };

      const result = validateKeymap(keymap);

      const invalidErrors = result.filter((e) => e.type === "invalid-qwerty");
      expect(invalidErrors).toHaveLength(1);
      expect(invalidErrors[0].keys).toContain("1");
      expect(invalidErrors[0].keys).toContain("2");
    });

    it("有効な QWERTY キー 30種が全て受け入れられる", () => {
      const keymap = Object.fromEntries(
        QWERTY_KEYS.map((key, i) => [key, String(i)]),
      );

      const result = validateKeymap(keymap);

      const invalidErrors = result.filter((e) => e.type === "invalid-qwerty");
      expect(invalidErrors).toHaveLength(0);
    });
  });

  describe("空の出力文字の検出", () => {
    it('空文字列の出力文字を検出して type: "empty-output" のエラーを返す', () => {
      const keymap: Record<string, string> = {
        q: "",
        w: "b",
        e: "c",
      };

      const result = validateKeymap(keymap);

      expect(result).toHaveLength(1);
      expect(result[0].type).toBe("empty-output");
    });

    it("空の出力文字を持つキーが keys プロパティに含まれる", () => {
      const keymap: Record<string, string> = {
        q: "",
        w: "b",
      };

      const result = validateKeymap(keymap);

      expect(result[0].keys).toContain("q");
    });

    it("複数のキーが空の出力文字を持つ場合もまとめて検出できる", () => {
      const keymap: Record<string, string> = {
        q: "",
        w: "",
        e: "c",
      };

      const result = validateKeymap(keymap);

      const emptyErrors = result.filter((e) => e.type === "empty-output");
      expect(emptyErrors).toHaveLength(1);
      expect(emptyErrors[0].keys).toContain("q");
      expect(emptyErrors[0].keys).toContain("w");
    });
  });

  describe("複数エラーの同時検出", () => {
    it("重複・無効・空が混在する場合に全てのエラーを返す", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
        "1": "b",
        e: "",
      };

      const result = validateKeymap(keymap);

      const types = result.map((e) => e.type);
      expect(types).toContain("duplicate-output");
      expect(types).toContain("invalid-qwerty");
      expect(types).toContain("empty-output");
    });

    it("空のキーマップでは空配列を返す", () => {
      const result = validateKeymap({});

      expect(result).toEqual([]);
    });
  });

  describe("エラーの型・プロパティ", () => {
    it("エラーオブジェクトに type, keys, message プロパティが含まれる", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
      };

      const result = validateKeymap(keymap);

      expect(result).toHaveLength(1);
      const error = result[0];
      expect(error).toHaveProperty("type");
      expect(error).toHaveProperty("keys");
      expect(error).toHaveProperty("message");
    });

    it("keys プロパティは文字列の配列である", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
      };

      const result = validateKeymap(keymap);

      expect(Array.isArray(result[0].keys)).toBe(true);
      for (const key of result[0].keys) {
        expect(typeof key).toBe("string");
      }
    });

    it("message プロパティは空でない文字列である", () => {
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
      };

      const result = validateKeymap(keymap);

      expect(typeof result[0].message).toBe("string");
      expect(result[0].message.length).toBeGreaterThan(0);
    });

    it("KeymapValidationError 型は type, keys, message を持つ", () => {
      const error: KeymapValidationError = {
        type: "duplicate-output",
        keys: ["q", "w"],
        message: "重複する出力文字が検出されました",
      };

      expect(error.type).toBe("duplicate-output");
      expect(error.keys).toEqual(["q", "w"]);
      expect(error.message).toBe("重複する出力文字が検出されました");
    });

    it('type は "duplicate-output" | "invalid-qwerty" | "empty-output" のいずれかである', () => {
      const validTypes = ["duplicate-output", "invalid-qwerty", "empty-output"];
      const keymap: Record<string, string> = {
        q: "a",
        w: "a",
        "1": "b",
        e: "",
      };

      const result = validateKeymap(keymap);

      for (const error of result) {
        expect(validTypes).toContain(error.type);
      }
    });
  });
});
