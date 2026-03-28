import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useKeyboardLayout } from "./useKeyboardLayout";

// storage モジュールをモック
vi.mock("../utils/storage", () => ({
  loadLayout: vi.fn(),
}));

// モック関数の型付き参照を取得
import { loadLayout } from "../utils/storage";

const mockLoadLayout = vi.mocked(loadLayout);

// テスト用の有効な VIA 定義 JSON
const VALID_VIA_JSON = {
  name: "Test KB",
  layouts: {
    keymap: [[{ c: "#777777" }, "0,0", { c: "#cccccc" }, "0,1"]],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

// ============================================================
// localStorage 復元ロジック（Red フェーズ: 未実装のため失敗予定）
// ============================================================

describe("初期化時の localStorage 復元", () => {
  it("localStorage にデータなし → デフォルトレイアウト (name: 'ANSI 60%') が返される", () => {
    // Arrange
    mockLoadLayout.mockReturnValue(null);

    // Act
    const { result } = renderHook(() => useKeyboardLayout());

    // Assert
    expect(result.current.layout.name).toBe("ANSI 60%");
  });

  it("localStorage に有効なデータがある → 復元されたレイアウトが返される", () => {
    // Arrange
    const storedJson = JSON.stringify(VALID_VIA_JSON);
    mockLoadLayout.mockReturnValue({ json: storedJson, name: "Test KB" });

    // Act
    const { result } = renderHook(() => useKeyboardLayout());

    // Assert
    expect(result.current.layout.name).toBe("Test KB");
    expect(result.current.layout.keys).toHaveLength(2);
  });

  it("localStorage のデータが壊れている（パースエラー） → デフォルトにフォールバック", () => {
    // Arrange: loadLayout は型ガードで null を返すが、
    // json フィールド自体が壊れた文字列の場合をシミュレート
    mockLoadLayout.mockReturnValue({
      json: "{ broken json ::::",
      name: "Broken KB",
    });

    // Act
    const { result } = renderHook(() => useKeyboardLayout());

    // Assert: パースに失敗するのでデフォルトにフォールバック
    expect(result.current.layout.name).toBe("ANSI 60%");
  });
});

// ============================================================
// loadFromJSON（既存機能: 成功予定）
// ============================================================

describe("loadFromJSON", () => {
  it("有効な VIA 定義 JSON を渡すと新しいレイアウトが読み込まれる", () => {
    // Arrange
    mockLoadLayout.mockReturnValue(null);
    const { result } = renderHook(() => useKeyboardLayout());
    const jsonString = JSON.stringify(VALID_VIA_JSON);

    // Act
    act(() => {
      result.current.loadFromJSON(jsonString);
    });

    // Assert
    expect(result.current.layout.name).toBe("Test KB");
    expect(result.current.layout.keys).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("不正な JSON を渡すとエラーメッセージがセットされる", () => {
    // Arrange
    mockLoadLayout.mockReturnValue(null);
    const { result } = renderHook(() => useKeyboardLayout());

    // Act
    act(() => {
      result.current.loadFromJSON("{ not valid json {{");
    });

    // Assert
    expect(result.current.error).not.toBeNull();
    expect(typeof result.current.error).toBe("string");
  });
});
