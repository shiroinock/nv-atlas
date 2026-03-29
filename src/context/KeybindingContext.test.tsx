import { renderHook } from "@testing-library/react";
import type React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../utils/storage", () => ({
  loadKeybindingConfig: vi.fn(),
  saveKeybindingConfig: vi.fn(),
}));

import type { KeybindingConfig } from "../types/keybinding";
import { loadKeybindingConfig } from "../utils/storage";
import { KeybindingProvider, useKeybindingContext } from "./KeybindingContext";

const mockLoadKeybindingConfig = vi.mocked(loadKeybindingConfig);

const savedConfig: KeybindingConfig = {
  name: "保存済み設定",
  bindings: {
    n: [
      {
        lhs: "j",
        name: "下に移動",
        description: "カーソルを下に移動",
        category: "motion",
        source: "user-edit",
        noremap: true,
      },
    ],
    v: [],
    x: [],
    o: [],
    i: [],
    s: [],
    c: [],
    t: [],
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

const initialConfig: KeybindingConfig = {
  name: "initial prop 設定",
  bindings: {
    n: [
      {
        lhs: "k",
        name: "上に移動",
        description: "カーソルを上に移動",
        category: "motion",
        source: "default",
        noremap: true,
      },
    ],
    v: [],
    x: [],
    o: [],
    i: [],
    s: [],
    c: [],
    t: [],
  },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-01T00:00:00.000Z",
};

beforeEach(() => {
  vi.clearAllMocks();
});

function createWrapper(initial?: KeybindingConfig) {
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <KeybindingProvider initial={initial}>{children}</KeybindingProvider>
    );
  };
}

describe("KeybindingProvider — localStorage 復元", () => {
  describe("localStorage に保存データがある場合", () => {
    it("保存済み設定の name で初期化される", () => {
      mockLoadKeybindingConfig.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.config.name).toBe("保存済み設定");
    });

    it("保存済み設定の bindings で初期化される", () => {
      mockLoadKeybindingConfig.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.config.bindings.n).toHaveLength(1);
      expect(result.current.config.bindings.n[0].lhs).toBe("j");
    });

    it("loadKeybindingConfig が1回だけ呼ばれる", () => {
      mockLoadKeybindingConfig.mockReturnValue(savedConfig);

      renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(),
      });

      expect(mockLoadKeybindingConfig).toHaveBeenCalledTimes(1);
    });
  });

  describe("localStorage にデータがない場合（null）", () => {
    it("デフォルト設定の name で初期化される", () => {
      mockLoadKeybindingConfig.mockReturnValue(null);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.config.name).toBe("QWERTY Default");
    });

    it("デフォルト設定の bindings.n が空でない（vimCommands から生成済み）", () => {
      mockLoadKeybindingConfig.mockReturnValue(null);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.config.bindings.n.length).toBeGreaterThan(0);
    });

    it("createdAt と updatedAt が設定されている", () => {
      mockLoadKeybindingConfig.mockReturnValue(null);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(),
      });

      expect(result.current.config.createdAt).toBeTruthy();
      expect(result.current.config.updatedAt).toBeTruthy();
    });
  });

  describe("initial prop が渡された場合", () => {
    it("initial prop の name が localStorage より優先される", () => {
      mockLoadKeybindingConfig.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(initialConfig),
      });

      expect(result.current.config.name).toBe("initial prop 設定");
    });

    it("initial prop の bindings が localStorage より優先される", () => {
      mockLoadKeybindingConfig.mockReturnValue(savedConfig);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(initialConfig),
      });

      expect(result.current.config.bindings.n[0].lhs).toBe("k");
    });

    it("initial prop が渡された場合、loadKeybindingConfig は呼ばれない（短絡評価）", () => {
      mockLoadKeybindingConfig.mockReturnValue(savedConfig);

      renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(initialConfig),
      });

      expect(mockLoadKeybindingConfig).not.toHaveBeenCalled();
    });

    it("initial prop が渡された場合、localStorage が null でも initial prop で初期化される", () => {
      mockLoadKeybindingConfig.mockReturnValue(null);

      const { result } = renderHook(() => useKeybindingContext(), {
        wrapper: createWrapper(initialConfig),
      });

      expect(result.current.config.name).toBe("initial prop 設定");
    });
  });

  describe("コンテキスト外での使用", () => {
    it("KeybindingProvider の外で useKeybindingContext を使うとエラーを投げる", () => {
      expect(() => {
        renderHook(() => useKeybindingContext());
      }).toThrow(
        "useKeybindingContext must be used within a KeybindingProvider",
      );
    });
  });
});
