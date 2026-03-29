import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_LAYOUT_NAME } from "../data/default-layout";
import { useKeyboardLayout } from "./useKeyboardLayout";

vi.mock("../utils/storage", () => ({
  loadLayout: vi.fn(),
}));

import { loadLayout } from "../utils/storage";

const mockLoadLayout = vi.mocked(loadLayout);

const VALID_VIA_JSON = {
  name: "Test KB",
  layouts: {
    keymap: [[{ c: "#777777" }, "0,0", { c: "#cccccc" }, "0,1"]],
  },
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("初期化時の localStorage 復元", () => {
  it("localStorage にデータなし → デフォルトレイアウト (name: 'ANSI 60%') が返される", () => {
    mockLoadLayout.mockReturnValue(null);

    const { result } = renderHook(() => useKeyboardLayout());

    expect(result.current.layout.name).toBe(DEFAULT_LAYOUT_NAME);
  });

  it("localStorage に有効なデータがある → 復元されたレイアウトが返される", () => {
    const storedJson = JSON.stringify(VALID_VIA_JSON);
    mockLoadLayout.mockReturnValue({ json: storedJson, name: "Test KB" });

    const { result } = renderHook(() => useKeyboardLayout());

    expect(result.current.layout.name).toBe("Test KB");
    expect(result.current.layout.keys).toHaveLength(2);
  });

  it("localStorage のデータが壊れている（パースエラー） → デフォルトにフォールバック", () => {
    mockLoadLayout.mockReturnValue({
      json: "{ broken json ::::",
      name: "Broken KB",
    });

    const { result } = renderHook(() => useKeyboardLayout());

    expect(result.current.layout.name).toBe(DEFAULT_LAYOUT_NAME);
  });
});

describe("loadFromJSON", () => {
  it("有効な VIA 定義 JSON を渡すと新しいレイアウトが読み込まれる", () => {
    mockLoadLayout.mockReturnValue(null);
    const { result } = renderHook(() => useKeyboardLayout());
    const jsonString = JSON.stringify(VALID_VIA_JSON);

    act(() => {
      result.current.loadFromJSON(jsonString);
    });

    expect(result.current.layout.name).toBe("Test KB");
    expect(result.current.layout.keys).toHaveLength(2);
    expect(result.current.error).toBeNull();
  });

  it("不正な JSON を渡すとエラーメッセージがセットされる", () => {
    mockLoadLayout.mockReturnValue(null);
    const { result } = renderHook(() => useKeyboardLayout());

    act(() => {
      result.current.loadFromJSON("{ not valid json {{");
    });

    expect(result.current.error).not.toBeNull();
    expect(typeof result.current.error).toBe("string");
  });
});
