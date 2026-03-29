import { beforeEach, describe, expect, it, vi } from "vitest";
import type { KeybindingConfig } from "../types/keybinding";
import {
  CURRENT_KEYBINDING_VERSION,
  clearAllStorage,
  clearKeybindingConfig,
  clearKeymap,
  clearLayout,
  isStoredKeybindingConfig,
  loadKeybindingConfig,
  loadKeymap,
  loadLayout,
  migrateKeybindingConfig,
  saveKeybindingConfig,
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

  it("keybinding-config もクリアされる", () => {
    const config: KeybindingConfig = {
      version: CURRENT_KEYBINDING_VERSION,
      name: "Test Config",
      bindings: { n: [], v: [], x: [], o: [], i: [], s: [], c: [], t: [] },
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-01T00:00:00.000Z",
    };
    saveKeybindingConfig(config);

    clearAllStorage();

    expect(loadKeybindingConfig()).toBeNull();
  });
});

const validConfig: KeybindingConfig = {
  version: CURRENT_KEYBINDING_VERSION,
  name: "My Config",
  bindings: { n: [], v: [], x: [], o: [], i: [], s: [], c: [], t: [] },
  createdAt: "2024-01-01T00:00:00.000Z",
  updatedAt: "2024-01-02T00:00:00.000Z",
};

describe("saveKeybindingConfig", () => {
  it('"keyviz:keybinding-config" キーに JSON 形式で保存する', () => {
    saveKeybindingConfig(validConfig);

    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      "keyviz:keybinding-config",
      expect.any(String),
    );
  });

  it("保存値が KeybindingConfig と一致する", () => {
    saveKeybindingConfig(validConfig);

    const storedRaw = localStorageMock.getItem("keyviz:keybinding-config");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored).toEqual(validConfig);
  });

  it("上書き保存した場合は最新の値が返る", () => {
    const oldConfig: KeybindingConfig = {
      ...validConfig,
      name: "Old Config",
    };
    const newConfig: KeybindingConfig = {
      ...validConfig,
      name: "New Config",
    };
    saveKeybindingConfig(oldConfig);

    saveKeybindingConfig(newConfig);
    const result = loadKeybindingConfig();

    expect(result?.name).toBe("New Config");
  });
});

describe("loadKeybindingConfig", () => {
  it("saveKeybindingConfig → loadKeybindingConfig のラウンドトリップが正しい", () => {
    saveKeybindingConfig(validConfig);

    const result = loadKeybindingConfig();

    expect(result).not.toBeNull();
    expect(result?.name).toBe(validConfig.name);
    expect(result?.bindings).toEqual(validConfig.bindings);
    expect(result?.createdAt).toBe(validConfig.createdAt);
    expect(result?.updatedAt).toBe(validConfig.updatedAt);
  });

  it("customKeymap が保持される", () => {
    const configWithKeymap: KeybindingConfig = {
      ...validConfig,
      customKeymap: { a: "a", s: "r" },
    };
    saveKeybindingConfig(configWithKeymap);

    const result = loadKeybindingConfig();

    expect(result?.customKeymap).toEqual({ a: "a", s: "r" });
  });

  it("データなしの場合 null を返す", () => {
    const result = loadKeybindingConfig();

    expect(result).toBeNull();
  });

  it("壊れた JSON の場合 null を返す", () => {
    localStorageMock.setItem("keyviz:keybinding-config", "{ broken json ::::");

    const result = loadKeybindingConfig();

    expect(result).toBeNull();
  });

  it("型ガードに失敗するデータの場合 null を返す", () => {
    localStorageMock.setItem(
      "keyviz:keybinding-config",
      JSON.stringify({ invalid: true }),
    );

    const result = loadKeybindingConfig();

    expect(result).toBeNull();
  });
});

describe("clearKeybindingConfig", () => {
  it("keybinding-config がクリアされ loadKeybindingConfig が null を返す", () => {
    saveKeybindingConfig(validConfig);

    clearKeybindingConfig();

    expect(loadKeybindingConfig()).toBeNull();
  });

  it("keybinding-config のみクリアされ layout と keymap は残る", () => {
    saveLayout('{"layout":true}', "Layout");
    saveKeymap("[[1,2,3]]", 3, "Keymap");
    saveKeybindingConfig(validConfig);

    clearKeybindingConfig();

    expect(loadKeybindingConfig()).toBeNull();
    expect(loadLayout()).not.toBeNull();
    expect(loadKeymap()).not.toBeNull();
  });

  it('"keyviz:keybinding-config" キーで removeItem が呼ばれる', () => {
    clearKeybindingConfig();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "keyviz:keybinding-config",
    );
  });
});

describe("isStoredKeybindingConfig", () => {
  it("正常な KeybindingConfig は true を返す", () => {
    expect(isStoredKeybindingConfig(validConfig)).toBe(true);
  });

  it("customKeymap を含む場合も true を返す", () => {
    const configWithKeymap = { ...validConfig, customKeymap: { a: "a" } };
    expect(isStoredKeybindingConfig(configWithKeymap)).toBe(true);
  });

  it("name フィールドが欠落している場合 false を返す", () => {
    const { name: _name, ...withoutName } = validConfig;
    expect(isStoredKeybindingConfig(withoutName)).toBe(false);
  });

  it("bindings フィールドが欠落している場合 false を返す", () => {
    const { bindings: _bindings, ...withoutBindings } = validConfig;
    expect(isStoredKeybindingConfig(withoutBindings)).toBe(false);
  });

  it("createdAt フィールドが欠落している場合 false を返す", () => {
    const { createdAt: _createdAt, ...withoutCreatedAt } = validConfig;
    expect(isStoredKeybindingConfig(withoutCreatedAt)).toBe(false);
  });

  it("updatedAt フィールドが欠落している場合 false を返す", () => {
    const { updatedAt: _updatedAt, ...withoutUpdatedAt } = validConfig;
    expect(isStoredKeybindingConfig(withoutUpdatedAt)).toBe(false);
  });

  it("name が string でない場合 false を返す", () => {
    const withInvalidName = { ...validConfig, name: 42 };
    expect(isStoredKeybindingConfig(withInvalidName)).toBe(false);
  });

  it("bindings がオブジェクトでない場合 false を返す", () => {
    const withInvalidBindings = { ...validConfig, bindings: "invalid" };
    expect(isStoredKeybindingConfig(withInvalidBindings)).toBe(false);
  });

  it("bindings が空オブジェクトの場合 false を返す", () => {
    const withEmptyBindings = { ...validConfig, bindings: {} };
    expect(isStoredKeybindingConfig(withEmptyBindings)).toBe(false);
  });

  it("bindings にモードキーが不足している場合 false を返す", () => {
    const withPartialBindings = {
      ...validConfig,
      bindings: { n: [], v: [] },
    };
    expect(isStoredKeybindingConfig(withPartialBindings)).toBe(false);
  });

  it("bindings のモードキーの値が配列でない場合 false を返す", () => {
    const withNonArrayMode = {
      ...validConfig,
      bindings: {
        n: "not-array",
        v: [],
        x: [],
        o: [],
        i: [],
        s: [],
        c: [],
        t: [],
      },
    };
    expect(isStoredKeybindingConfig(withNonArrayMode)).toBe(false);
  });

  it("createdAt が string でない場合 false を返す", () => {
    const withInvalidCreatedAt = { ...validConfig, createdAt: 12345 };
    expect(isStoredKeybindingConfig(withInvalidCreatedAt)).toBe(false);
  });

  it("updatedAt が string でない場合 false を返す", () => {
    const withInvalidUpdatedAt = { ...validConfig, updatedAt: null };
    expect(isStoredKeybindingConfig(withInvalidUpdatedAt)).toBe(false);
  });

  it("null の場合 false を返す", () => {
    expect(isStoredKeybindingConfig(null)).toBe(false);
  });

  it("プリミティブ値の場合 false を返す", () => {
    expect(isStoredKeybindingConfig("string")).toBe(false);
    expect(isStoredKeybindingConfig(42)).toBe(false);
    expect(isStoredKeybindingConfig(undefined)).toBe(false);
  });

  describe("bindings 要素レベル検証", () => {
    const validBinding = {
      lhs: "j",
      name: "下に移動",
      description: "カーソルを下に移動",
      category: "motion",
      source: "default",
      noremap: true,
    };

    const allModesWithBinding = {
      n: [validBinding],
      v: [validBinding],
      x: [validBinding],
      o: [validBinding],
      i: [validBinding],
      s: [validBinding],
      c: [validBinding],
      t: [validBinding],
    };

    it("全モードが空配列の場合 true を返す", () => {
      expect(isStoredKeybindingConfig(validConfig)).toBe(true);
    });

    it("正常な Keybinding 要素を含む場合 true を返す", () => {
      const config = { ...validConfig, bindings: allModesWithBinding };
      expect(isStoredKeybindingConfig(config)).toBe(true);
    });

    it("lhs が欠落している要素がある場合 false を返す", () => {
      const { lhs: _lhs, ...withoutLhs } = validBinding;
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withoutLhs] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("name が欠落している要素がある場合 false を返す", () => {
      const { name: _name, ...withoutName } = validBinding;
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withoutName] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("description が欠落している要素がある場合 false を返す", () => {
      const { description: _description, ...withoutDescription } = validBinding;
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withoutDescription] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("source が欠落している要素がある場合 false を返す", () => {
      const { source: _source, ...withoutSource } = validBinding;
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withoutSource] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("noremap が欠落している要素がある場合 false を返す", () => {
      const { noremap: _noremap, ...withoutNoremap } = validBinding;
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withoutNoremap] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("category が欠落している要素がある場合 false を返す", () => {
      const { category: _category, ...withoutCategory } = validBinding;
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withoutCategory] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("noremap が boolean でなく string の場合 false を返す", () => {
      const withStringNoremap = { ...validBinding, noremap: "true" };
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [withStringNoremap] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("要素がオブジェクトでなく文字列の場合 false を返す", () => {
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: ["j"] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("要素がオブジェクトでなく数値の場合 false を返す", () => {
      const config = {
        ...validConfig,
        bindings: { ...allModesWithBinding, n: [42] },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });

    it("一部のモードに正常な要素があり、別のモードに不正な要素がある場合 false を返す", () => {
      const { lhs: _lhs, ...withoutLhs } = validBinding;
      const config = {
        ...validConfig,
        bindings: {
          n: [validBinding],
          v: [validBinding],
          x: [validBinding],
          o: [validBinding],
          i: [validBinding],
          s: [validBinding],
          c: [validBinding],
          t: [withoutLhs],
        },
      };
      expect(isStoredKeybindingConfig(config)).toBe(false);
    });
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

describe("マイグレーション: v0 → v1", () => {
  const v0Config = {
    name: "v0 Config",
    bindings: { n: [], v: [], x: [], o: [], i: [], s: [], c: [], t: [] },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  };

  it("v0 データ（version フィールドなし）が version: 1 に変換される", () => {
    const result = migrateKeybindingConfig(v0Config);

    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
  });

  it("v0 データの name フィールドが保持される", () => {
    const result = migrateKeybindingConfig(v0Config);

    expect(result).not.toBeNull();
    expect(result!.name).toBe("v0 Config");
  });

  it("v0 データの bindings フィールドが保持される", () => {
    const result = migrateKeybindingConfig(v0Config);

    expect(result).not.toBeNull();
    expect(result!.bindings).toEqual(v0Config.bindings);
  });

  it("v0 データの createdAt フィールドが保持される", () => {
    const result = migrateKeybindingConfig(v0Config);

    expect(result).not.toBeNull();
    expect(result!.createdAt).toBe("2024-01-01T00:00:00.000Z");
  });

  it("v0 データの updatedAt フィールドが保持される", () => {
    const result = migrateKeybindingConfig(v0Config);

    expect(result).not.toBeNull();
    expect(result!.updatedAt).toBe("2024-01-02T00:00:00.000Z");
  });

  it("v0 データの customKeymap フィールドが保持される", () => {
    const v0WithKeymap = { ...v0Config, customKeymap: { a: "a", s: "r" } };

    const result = migrateKeybindingConfig(v0WithKeymap);

    expect(result).not.toBeNull();
    expect(result!.customKeymap).toEqual({ a: "a", s: "r" });
  });

  it("customKeymap がない v0 データも正しく変換される", () => {
    const result = migrateKeybindingConfig(v0Config);

    expect(result).not.toBeNull();
    expect(result!.customKeymap).toBeUndefined();
    expect(result!.version).toBe(1);
  });

  it("既に version: 1 のデータはそのまま返される", () => {
    const v1Config = { ...v0Config, version: 1 };

    const result = migrateKeybindingConfig(v1Config);

    expect(result).not.toBeNull();
    expect(result!.version).toBe(1);
    expect(result!.name).toBe("v0 Config");
  });
});

describe("loadKeybindingConfig のバージョンマイグレーション", () => {
  const v0ConfigRaw = {
    name: "Migrated Config",
    bindings: { n: [], v: [], x: [], o: [], i: [], s: [], c: [], t: [] },
    createdAt: "2024-01-01T00:00:00.000Z",
    updatedAt: "2024-01-02T00:00:00.000Z",
  };

  it("v0 データを localStorage から読み込むと version: 1 のデータが返る", () => {
    localStorageMock.setItem(
      "keyviz:keybinding-config",
      JSON.stringify(v0ConfigRaw),
    );

    const result = loadKeybindingConfig();

    expect(result).not.toBeNull();
    expect(result?.version).toBe(1);
  });

  it("v0 データを読み込んだ後 name や bindings が保持される", () => {
    localStorageMock.setItem(
      "keyviz:keybinding-config",
      JSON.stringify(v0ConfigRaw),
    );

    const result = loadKeybindingConfig();

    expect(result?.name).toBe("Migrated Config");
    expect(result?.bindings).toEqual(v0ConfigRaw.bindings);
  });

  it("マイグレーション後のデータが localStorage に再保存される（永続化）", () => {
    localStorageMock.setItem(
      "keyviz:keybinding-config",
      JSON.stringify(v0ConfigRaw),
    );

    loadKeybindingConfig();

    const storedRaw = localStorageMock.getItem("keyviz:keybinding-config");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored.version).toBe(1);
  });

  it("マイグレーション不可能な壊れたデータの場合は null を返す", () => {
    localStorageMock.setItem("keyviz:keybinding-config", "{ broken json ::::");

    const result = loadKeybindingConfig();

    expect(result).toBeNull();
  });

  it("マイグレーション後に型ガードに失敗するデータの場合は null を返す", () => {
    localStorageMock.setItem(
      "keyviz:keybinding-config",
      JSON.stringify({ name: "incomplete" }),
    );

    const result = loadKeybindingConfig();

    expect(result).toBeNull();
  });

  it("壊れたデータの場合は localStorage がクリアされる", () => {
    localStorageMock.setItem("keyviz:keybinding-config", "{ broken json ::::");

    loadKeybindingConfig();

    expect(localStorageMock.removeItem).toHaveBeenCalledWith(
      "keyviz:keybinding-config",
    );
  });
});

describe("isStoredKeybindingConfig の version 検証", () => {
  it("version: 1 を含む正常なデータは true を返す", () => {
    expect(isStoredKeybindingConfig(validConfig)).toBe(true);
  });

  it("version フィールドがない（v0）データは false を返す", () => {
    const v0Data = {
      name: "v0 Config",
      bindings: { n: [], v: [], x: [], o: [], i: [], s: [], c: [], t: [] },
      createdAt: "2024-01-01T00:00:00.000Z",
      updatedAt: "2024-01-02T00:00:00.000Z",
    };

    expect(isStoredKeybindingConfig(v0Data)).toBe(false);
  });

  it("version が string の場合は false を返す", () => {
    const withStringVersion = { ...validConfig, version: "1" };

    expect(isStoredKeybindingConfig(withStringVersion)).toBe(false);
  });

  it("version が null の場合は false を返す", () => {
    const withNullVersion = { ...validConfig, version: null };

    expect(isStoredKeybindingConfig(withNullVersion)).toBe(false);
  });

  it("version が負の数の場合は false を返す", () => {
    const withNegativeVersion = { ...validConfig, version: -1 };

    expect(isStoredKeybindingConfig(withNegativeVersion)).toBe(false);
  });

  it("version が 0 の場合は false を返す", () => {
    const withZeroVersion = { ...validConfig, version: 0 };

    expect(isStoredKeybindingConfig(withZeroVersion)).toBe(false);
  });
});

describe("saveKeybindingConfig の version 保持", () => {
  it("saveKeybindingConfig で保存した config に version: 1 が含まれる", () => {
    saveKeybindingConfig(validConfig);

    const storedRaw = localStorageMock.getItem("keyviz:keybinding-config");
    expect(storedRaw).not.toBeNull();
    const stored = JSON.parse(storedRaw as string);
    expect(stored.version).toBe(1);
  });

  it("loadKeybindingConfig で取得した config に version: 1 が含まれる", () => {
    saveKeybindingConfig(validConfig);

    const result = loadKeybindingConfig();

    expect(result?.version).toBe(1);
  });
});
