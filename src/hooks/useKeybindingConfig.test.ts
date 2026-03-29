import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/storage", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../utils/storage")>()),
  saveKeybindingConfig: vi.fn(),
}));

import type { NvimMapping } from "../types/vim";
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

// ── テストヘルパー ──

function makeNvimMap(overrides: Partial<NvimMapping> = {}): NvimMapping {
  return {
    mode: "n",
    lhs: "j",
    rhs: "j",
    noremap: true,
    description: "",
    source: "user",
    sourceDetail: "",
    ...overrides,
  };
}

describe("useKeybindingConfig — IMPORT_NVIM", () => {
  describe("state.bindings の更新", () => {
    it("IMPORT_NVIM dispatch 後に state.bindings が空でなくなる", () => {
      const { result } = renderHook(() => useKeybindingConfig());
      const maps: NvimMapping[] = [
        makeNvimMap({ mode: "n", lhs: "j", description: "下に移動" }),
      ];

      act(() => {
        result.current.dispatch({ type: "IMPORT_NVIM", maps });
      });

      const totalBindings = Object.values(
        result.current.config.bindings,
      ).reduce((sum, arr) => sum + arr.length, 0);
      expect(totalBindings).toBeGreaterThan(0);
    });

    it("ノーマルモードのマップが state.bindings.n に反映される", () => {
      const { result } = renderHook(() => useKeybindingConfig());
      const maps: NvimMapping[] = [
        makeNvimMap({ mode: "n", lhs: "j", description: "下に移動" }),
      ];

      act(() => {
        result.current.dispatch({ type: "IMPORT_NVIM", maps });
      });

      const nBindings = result.current.config.bindings.n;
      const found = nBindings.find((b) => b.lhs === "j");
      expect(found).toBeDefined();
    });

    it("v モードのマップが state.bindings.v、x、s にそれぞれ反映される", () => {
      const { result } = renderHook(() => useKeybindingConfig());
      const maps: NvimMapping[] = [
        makeNvimMap({ mode: "v", lhs: "gq", description: "ビジュアル整形" }),
      ];

      act(() => {
        result.current.dispatch({ type: "IMPORT_NVIM", maps });
      });

      const bindings = result.current.config.bindings;
      expect(bindings.v.find((b) => b.lhs === "gq")).toBeDefined();
      expect(bindings.x.find((b) => b.lhs === "gq")).toBeDefined();
      expect(bindings.s.find((b) => b.lhs === "gq")).toBeDefined();
    });
  });

  describe("永続化", () => {
    it("IMPORT_NVIM dispatch 後に saveKeybindingConfig が呼ばれる", () => {
      const { result } = renderHook(() => useKeybindingConfig());
      const maps: NvimMapping[] = [
        makeNvimMap({ mode: "n", lhs: "k", description: "上に移動" }),
      ];

      act(() => {
        result.current.dispatch({ type: "IMPORT_NVIM", maps });
      });

      expect(mockSaveKeybindingConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("updatedAt の更新", () => {
    it("IMPORT_NVIM dispatch 後に updatedAt が更新される", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

      const { result } = renderHook(() => useKeybindingConfig());
      const before = result.current.config.updatedAt;

      vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));
      const maps: NvimMapping[] = [
        makeNvimMap({ mode: "n", lhs: "l", description: "右に移動" }),
      ];

      act(() => {
        result.current.dispatch({ type: "IMPORT_NVIM", maps });
      });

      expect(result.current.config.updatedAt).not.toBe(before);
      vi.useRealTimers();
    });
  });
});

describe("useKeybindingConfig — UPDATE_KEYMAP_ENTRY", () => {
  describe("state.customKeymap の更新", () => {
    it("UPDATE_KEYMAP_ENTRY dispatch 後に config.customKeymap[qwertyKey] が outputChar になる", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "IMPORT_LAYOUT",
          customKeymap: { q: "q", w: "w", a: "a" },
        });
      });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_KEYMAP_ENTRY",
          qwertyKey: "q",
          outputChar: "b",
        });
      });

      expect(result.current.config.customKeymap?.q).toBe("b");
    });
  });

  describe("既存エントリの上書き", () => {
    it("既に値がある qwertyKey に dispatch すると値が上書きされる", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "IMPORT_LAYOUT",
          customKeymap: { q: "original" },
        });
      });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_KEYMAP_ENTRY",
          qwertyKey: "q",
          outputChar: "overwritten",
        });
      });

      expect(result.current.config.customKeymap?.q).toBe("overwritten");
    });
  });

  describe("他のエントリへの影響なし", () => {
    it("更新対象以外の customKeymap エントリは変更されない", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "IMPORT_LAYOUT",
          customKeymap: { q: "q", w: "w", a: "a" },
        });
      });

      act(() => {
        result.current.dispatch({
          type: "UPDATE_KEYMAP_ENTRY",
          qwertyKey: "q",
          outputChar: "x",
        });
      });

      expect(result.current.config.customKeymap?.w).toBe("w");
      expect(result.current.config.customKeymap?.a).toBe("a");
    });
  });

  describe("永続化", () => {
    it("UPDATE_KEYMAP_ENTRY dispatch 後に saveKeybindingConfig が呼ばれる", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "IMPORT_LAYOUT",
          customKeymap: { q: "q" },
        });
      });

      mockSaveKeybindingConfig.mockClear();

      act(() => {
        result.current.dispatch({
          type: "UPDATE_KEYMAP_ENTRY",
          qwertyKey: "q",
          outputChar: "b",
        });
      });

      expect(mockSaveKeybindingConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("updatedAt の更新", () => {
    it("UPDATE_KEYMAP_ENTRY dispatch 後に updatedAt が更新される", () => {
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

      const { result } = renderHook(() => useKeybindingConfig());

      act(() => {
        result.current.dispatch({
          type: "IMPORT_LAYOUT",
          customKeymap: { q: "q" },
        });
      });

      const before = result.current.config.updatedAt;

      vi.setSystemTime(new Date("2026-01-01T00:00:01.000Z"));

      act(() => {
        result.current.dispatch({
          type: "UPDATE_KEYMAP_ENTRY",
          qwertyKey: "q",
          outputChar: "b",
        });
      });

      expect(result.current.config.updatedAt).not.toBe(before);
      vi.useRealTimers();
    });
  });

  describe("customKeymap 未設定時のフォールバック", () => {
    it("customKeymap が undefined のまま UPDATE_KEYMAP_ENTRY を dispatch すると defaultCustomKeymap をベースにする", () => {
      const { result } = renderHook(() => useKeybindingConfig());

      expect(result.current.config.customKeymap).toBeUndefined();

      act(() => {
        result.current.dispatch({
          type: "UPDATE_KEYMAP_ENTRY",
          qwertyKey: "q",
          outputChar: "z",
        });
      });

      expect(result.current.config.customKeymap?.q).toBe("z");
      expect(result.current.config.customKeymap?.w).toBeDefined();
      expect(Object.keys(result.current.config.customKeymap ?? {}).length).toBe(
        30,
      );
    });
  });
});
