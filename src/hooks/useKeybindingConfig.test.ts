import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/storage", () => ({
  saveKeybindingConfig: vi.fn(),
}));

import { saveKeybindingConfig } from "../utils/storage";
import { useKeybindingConfig } from "./useKeybindingConfig";

const mockSaveKeybindingConfig = vi.mocked(saveKeybindingConfig);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("useKeybindingConfig — localStorage 永続化", () => {
  describe("初回レンダリング時", () => {
    it("マウント直後は saveKeybindingConfig が呼ばれない", () => {
      renderHook(() => useKeybindingConfig());

      expect(mockSaveKeybindingConfig).not.toHaveBeenCalled();
    });
  });

  describe("config 変更後の保存", () => {
    it("ADD_BINDING dispatch 後に saveKeybindingConfig が呼ばれる", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "ADD_BINDING",
          mode: "n",
          binding: {
            lhs: "zz",
            name: "テストバインディング",
            description: "テスト用",
            category: "motion",
            source: "user-edit",
            noremap: true,
          },
        });
      });

      expect(mockSaveKeybindingConfig).toHaveBeenCalledTimes(1);
    });

    it("UPDATE_BINDING dispatch 後に saveKeybindingConfig が呼ばれる", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "UPDATE_BINDING",
          mode: "n",
          index: 0,
          binding: { name: "更新済みバインディング" },
        });
      });

      expect(mockSaveKeybindingConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("saveKeybindingConfig の引数", () => {
    it("dispatch 後に更新された config が saveKeybindingConfig に渡される", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "ADD_BINDING",
          mode: "n",
          binding: {
            lhs: "<Leader>tz",
            name: "テストバインディング",
            description: "テスト用",
            category: "motion",
            source: "user-edit",
            noremap: true,
          },
        });
      });

      const savedConfig = mockSaveKeybindingConfig.mock.calls[0][0];
      const addedBinding = savedConfig.bindings.n.find(
        (b: { lhs: string }) => b.lhs === "<Leader>tz",
      );
      expect(addedBinding).toBeDefined();
      expect(addedBinding?.name).toBe("テストバインディング");
    });

    it("複数回 dispatch した場合、最新の config が saveKeybindingConfig に渡される", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "ADD_BINDING",
          mode: "n",
          binding: {
            lhs: "aa",
            name: "1回目のバインディング",
            description: "1回目",
            category: "motion",
            source: "user-edit",
            noremap: true,
          },
        });
      });

      act(() => {
        result.current.dispatch({
          type: "ADD_BINDING",
          mode: "n",
          binding: {
            lhs: "bb",
            name: "2回目のバインディング",
            description: "2回目",
            category: "motion",
            source: "user-edit",
            noremap: true,
          },
        });
      });

      expect(mockSaveKeybindingConfig).toHaveBeenCalledTimes(2);

      const secondCallConfig = mockSaveKeybindingConfig.mock.calls[1][0];
      const hasAa = secondCallConfig.bindings.n.some(
        (b: { lhs: string }) => b.lhs === "aa",
      );
      const hasBb = secondCallConfig.bindings.n.some(
        (b: { lhs: string }) => b.lhs === "bb",
      );
      expect(hasAa).toBe(true);
      expect(hasBb).toBe(true);
    });
  });
});
