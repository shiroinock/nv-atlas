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

describe("saveLayout / loadLayout", () => {
  it("saveLayout → loadLayout のラウンドトリップが正しい", () => {
    const json = '{"name":"MyKeyboard","layouts":{"keymap":[]}}';
    const name = "My Keyboard";

    saveLayout(json, name);
    const result = loadLayout();

    expect(result).not.toBeNull();
    expect(result?.json).toBe(json);
    expect(result?.name).toBe(name);
  });

  it("上書き保存した場合は最新の値が返る", () => {
    saveLayout('{"old":true}', "Old Name");

    saveLayout('{"new":true}', "New Name");
    const result = loadLayout();

    expect(result?.json).toBe('{"new":true}');
    expect(result?.name).toBe("New Name");
  });
});

describe("saveKeymap / loadKeymap", () => {
  it("saveKeymap → loadKeymap のラウンドトリップが正しい（matrixCols を含む）", () => {
    const json = "[[4,4,4,4]]";
    const matrixCols = 12;
    const name = "My Keymap";

    saveKeymap(json, matrixCols, name);
    const result = loadKeymap();

    expect(result).not.toBeNull();
    expect(result?.json).toBe(json);
    expect(result?.matrixCols).toBe(matrixCols);
    expect(result?.name).toBe(name);
  });

  it("matrixCols の数値が保持される（文字列に変換されない）", () => {
    saveKeymap("[]", 7, "Compact");

    const result = loadKeymap();

    expect(typeof result?.matrixCols).toBe("number");
    expect(result?.matrixCols).toBe(7);
  });
});

describe("loadLayout", () => {
  it("データなしの場合 null を返す", () => {
    const result = loadLayout();

    expect(result).toBeNull();
  });

  it("壊れた JSON の場合 null を返す（フォールバック）", () => {
    localStorageMock.setItem("keyviz:layout", "{ broken json ::::");

    const result = loadLayout();

    expect(result).toBeNull();
  });
});

describe("loadKeymap", () => {
  it("データなしの場合 null を返す", () => {
    const result = loadKeymap();

    expect(result).toBeNull();
  });

  it("壊れた JSON の場合 null を返す（フォールバック）", () => {
    localStorageMock.setItem("keyviz:keymap", "not valid json {{");

    const result = loadKeymap();

    expect(result).toBeNull();
  });
});

describe("clearLayout", () => {
  it("layout のみクリアされ、keymap は残る", () => {
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");

    clearLayout();

    expect(loadLayout()).toBeNull();
    expect(loadKeymap()).not.toBeNull();
  });
});

describe("clearKeymap", () => {
  it("keymap のみクリアされ、layout は残る", () => {
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");

    clearKeymap();

    expect(loadKeymap()).toBeNull();
    expect(loadLayout()).not.toBeNull();
  });
});

describe("clearAllStorage", () => {
  it("layout と keymap 両方がクリアされる", () => {
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");

    clearAllStorage();

    expect(loadLayout()).toBeNull();
    expect(loadKeymap()).toBeNull();
  });
});

describe("保存キー", () => {
  it('saveLayout は "keyviz:layout" キーに保存する', () => {
    saveLayout('{"layout":true}', "Layout");

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "keyviz:layout",
      expect.any(String),
    );
  });

  it('saveKeymap は "keyviz:keymap" キーに保存する', () => {
    saveKeymap("[[1,2]]", 2, "Keymap");

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "keyviz:keymap",
      expect.any(String),
    );
  });

  it('"keyviz:layout" の保存値に json と name が含まれる', () => {
    const json = '{"layout":true}';
    const name = "Test Layout";

    saveLayout(json, name);

    const storedRaw = localStorageMock.getItem("keyviz:layout");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored).toEqual({ json, name });
  });

  it('"keyviz:keymap" の保存値に json, matrixCols, name が含まれる', () => {
    const json = "[[4,4]]";
    const matrixCols = 12;
    const name = "Test Keymap";

    saveKeymap(json, matrixCols, name);

    const storedRaw = localStorageMock.getItem("keyviz:keymap");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored).toEqual({ json, matrixCols, name });
  });
});
