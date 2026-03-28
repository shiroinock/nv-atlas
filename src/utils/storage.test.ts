import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearAllStorage,
  clearKeymap,
  clearLayout,
  loadKeymap,
  loadLayout,
  saveKeymap,
  saveLayout,
} from "./storage";

// localStorage のモック実装
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] ?? null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] ?? null),
  };
})();

vi.stubGlobal("localStorage", localStorageMock);

beforeEach(() => {
  localStorageMock.clear();
  vi.clearAllMocks();
});

// ============================================================
// saveLayout / loadLayout
// ============================================================

describe("saveLayout / loadLayout", () => {
  it("saveLayout → loadLayout のラウンドトリップが正しい", () => {
    // Arrange
    const json = '{"name":"MyKeyboard","layouts":{"keymap":[]}}';
    const name = "My Keyboard";

    // Act
    saveLayout(json, name);
    const result = loadLayout();

    // Assert
    expect(result).not.toBeNull();
    expect(result?.json).toBe(json);
    expect(result?.name).toBe(name);
  });

  it("上書き保存した場合は最新の値が返る", () => {
    // Arrange
    saveLayout('{"old":true}', "Old Name");

    // Act
    saveLayout('{"new":true}', "New Name");
    const result = loadLayout();

    // Assert
    expect(result?.json).toBe('{"new":true}');
    expect(result?.name).toBe("New Name");
  });
});

// ============================================================
// saveKeymap / loadKeymap
// ============================================================

describe("saveKeymap / loadKeymap", () => {
  it("saveKeymap → loadKeymap のラウンドトリップが正しい（matrixCols を含む）", () => {
    // Arrange
    const json = "[[4,4,4,4]]";
    const matrixCols = 12;
    const name = "My Keymap";

    // Act
    saveKeymap(json, matrixCols, name);
    const result = loadKeymap();

    // Assert
    expect(result).not.toBeNull();
    expect(result?.json).toBe(json);
    expect(result?.matrixCols).toBe(matrixCols);
    expect(result?.name).toBe(name);
  });

  it("matrixCols の数値が保持される（文字列に変換されない）", () => {
    // Arrange
    saveKeymap("[]", 7, "Compact");

    // Act
    const result = loadKeymap();

    // Assert
    expect(typeof result?.matrixCols).toBe("number");
    expect(result?.matrixCols).toBe(7);
  });
});

// ============================================================
// loadLayout: データなし / 壊れた JSON
// ============================================================

describe("loadLayout", () => {
  it("データなしの場合 null を返す", () => {
    // Act
    const result = loadLayout();

    // Assert
    expect(result).toBeNull();
  });

  it("壊れた JSON の場合 null を返す（フォールバック）", () => {
    // Arrange
    localStorageMock.setItem("keyviz:layout", "{ broken json ::::");

    // Act
    const result = loadLayout();

    // Assert
    expect(result).toBeNull();
  });
});

// ============================================================
// loadKeymap: データなし / 壊れた JSON
// ============================================================

describe("loadKeymap", () => {
  it("データなしの場合 null を返す", () => {
    // Act
    const result = loadKeymap();

    // Assert
    expect(result).toBeNull();
  });

  it("壊れた JSON の場合 null を返す（フォールバック）", () => {
    // Arrange
    localStorageMock.setItem("keyviz:keymap", "not valid json {{");

    // Act
    const result = loadKeymap();

    // Assert
    expect(result).toBeNull();
  });
});

// ============================================================
// clearLayout
// ============================================================

describe("clearLayout", () => {
  it("layout のみクリアされ、keymap は残る", () => {
    // Arrange
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");

    // Act
    clearLayout();

    // Assert
    expect(loadLayout()).toBeNull();
    expect(loadKeymap()).not.toBeNull();
  });
});

// ============================================================
// clearKeymap
// ============================================================

describe("clearKeymap", () => {
  it("keymap のみクリアされ、layout は残る", () => {
    // Arrange
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");

    // Act
    clearKeymap();

    // Assert
    expect(loadKeymap()).toBeNull();
    expect(loadLayout()).not.toBeNull();
  });
});

// ============================================================
// clearAllStorage
// ============================================================

describe("clearAllStorage", () => {
  it("layout と keymap 両方がクリアされる", () => {
    // Arrange
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");

    // Act
    clearAllStorage();

    // Assert
    expect(loadLayout()).toBeNull();
    expect(loadKeymap()).toBeNull();
  });
});

// ============================================================
// 保存キーの検証
// ============================================================

describe("保存キー", () => {
  it('saveLayout は "keyviz:layout" キーに保存する', () => {
    // Act
    saveLayout('{"layout":true}', "Layout");

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "keyviz:layout",
      expect.any(String),
    );
  });

  it('saveKeymap は "keyviz:keymap" キーに保存する', () => {
    // Act
    saveKeymap("[[1,2]]", 2, "Keymap");

    // Assert
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "keyviz:keymap",
      expect.any(String),
    );
  });

  it('"keyviz:layout" の保存値に json と name が含まれる', () => {
    // Arrange
    const json = '{"layout":true}';
    const name = "Test Layout";

    // Act
    saveLayout(json, name);

    // Assert
    const storedRaw = localStorageMock.getItem("keyviz:layout");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored).toEqual({ json, name });
  });

  it('"keyviz:keymap" の保存値に json, matrixCols, name が含まれる', () => {
    // Arrange
    const json = "[[4,4]]";
    const matrixCols = 12;
    const name = "Test Keymap";

    // Act
    saveKeymap(json, matrixCols, name);

    // Assert
    const storedRaw = localStorageMock.getItem("keyviz:keymap");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored).toEqual({ json, matrixCols, name });
  });
});
