import { type KeybindingConfig, VIM_MODES } from "../types/keybinding";

const STORAGE_PREFIX = "keyviz:";

/** 現在のキーバインド設定スキーマバージョン */
export const CURRENT_KEYBINDING_VERSION = 1;

/** v0 データ（version フィールドなし）の型 */
type KeybindingConfigV0 = Omit<KeybindingConfig, "version">;

/** マイグレーション対象データの型（v0 または最新バージョン） */
type MigrationInput = KeybindingConfigV0 | KeybindingConfig;
const LAYOUT_KEY = `${STORAGE_PREFIX}layout`;
const KEYMAP_KEY = `${STORAGE_PREFIX}keymap`;
const KEYBINDING_CONFIG_KEY = `${STORAGE_PREFIX}keybinding-config`;

type StoredLayout = {
  json: string;
  name: string;
};

type StoredKeymap = {
  json: string;
  matrixCols: number;
  name: string;
};

function isStoredLayout(value: unknown): value is StoredLayout {
  return (
    typeof value === "object" &&
    value !== null &&
    "json" in value &&
    typeof (value as Record<string, unknown>).json === "string" &&
    "name" in value &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

function isStoredKeymap(value: unknown): value is StoredKeymap {
  return (
    typeof value === "object" &&
    value !== null &&
    "json" in value &&
    typeof (value as Record<string, unknown>).json === "string" &&
    "matrixCols" in value &&
    typeof (value as Record<string, unknown>).matrixCols === "number" &&
    "name" in value &&
    typeof (value as Record<string, unknown>).name === "string"
  );
}

function safeJsonParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function saveLayout(json: string, name: string): void {
  const data: StoredLayout = { json, name };
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(data));
}

export function loadLayout(): StoredLayout | null {
  const raw = localStorage.getItem(LAYOUT_KEY);
  if (raw === null) return null;

  const parsed = safeJsonParse(raw);
  if (isStoredLayout(parsed)) return parsed;
  return null;
}

export function clearLayout(): void {
  localStorage.removeItem(LAYOUT_KEY);
}

export function saveKeymap(
  json: string,
  matrixCols: number,
  name: string,
): void {
  const data: StoredKeymap = { json, matrixCols, name };
  localStorage.setItem(KEYMAP_KEY, JSON.stringify(data));
}

export function loadKeymap(): StoredKeymap | null {
  const raw = localStorage.getItem(KEYMAP_KEY);
  if (raw === null) return null;

  const parsed = safeJsonParse(raw);
  if (isStoredKeymap(parsed)) return parsed;
  return null;
}

export function clearKeymap(): void {
  localStorage.removeItem(KEYMAP_KEY);
}

export function clearAllStorage(): void {
  clearLayout();
  clearKeymap();
  clearKeybindingConfig();
}

function isValidBindingElement(element: unknown): boolean {
  if (typeof element !== "object" || element === null) return false;
  const e = element as Record<string, unknown>;
  return (
    typeof e.lhs === "string" &&
    typeof e.name === "string" &&
    typeof e.description === "string" &&
    typeof e.category === "string" &&
    typeof e.source === "string" &&
    typeof e.noremap === "boolean"
  );
}

function hasValidBindings(bindings: Record<string, unknown>): boolean {
  return VIM_MODES.every(
    (mode) =>
      mode in bindings &&
      Array.isArray(bindings[mode]) &&
      (bindings[mode] as unknown[]).every(isValidBindingElement),
  );
}

/**
 * キーバインド設定を最新バージョンにマイグレーションする。
 * v0（version フィールドなし）から順次最新バージョンへ変換する。
 * 未知のバージョンの場合は null を返す。
 */
export function migrateKeybindingConfig(
  data: MigrationInput,
): KeybindingConfig | null {
  // version フィールドがない場合は v0 として扱う
  const version = "version" in data ? data.version : 0;

  if (version === CURRENT_KEYBINDING_VERSION) {
    // 既に最新バージョン
    return data as KeybindingConfig;
  }

  // v0 → v1: version フィールドを追加する
  if (version === 0) {
    return { ...data, version: 1 };
  }

  // 未知のバージョン（将来のバージョンや不正値）
  return null;
}

export function isStoredKeybindingConfig(
  value: unknown,
): value is KeybindingConfig {
  if (typeof value !== "object" || value === null) return false;

  const v = value as Record<string, unknown>;

  return (
    "version" in v &&
    typeof v.version === "number" &&
    Number.isInteger(v.version) &&
    (v.version as number) >= 1 &&
    "name" in v &&
    typeof v.name === "string" &&
    "bindings" in v &&
    typeof v.bindings === "object" &&
    v.bindings !== null &&
    hasValidBindings(v.bindings as Record<string, unknown>) &&
    "createdAt" in v &&
    typeof v.createdAt === "string" &&
    "updatedAt" in v &&
    typeof v.updatedAt === "string"
  );
}

export function saveKeybindingConfig(config: KeybindingConfig): void {
  localStorage.setItem(KEYBINDING_CONFIG_KEY, JSON.stringify(config));
}

export function loadKeybindingConfig(): KeybindingConfig | null {
  const raw = localStorage.getItem(KEYBINDING_CONFIG_KEY);
  if (raw === null) return null;

  const parsed = safeJsonParse(raw);
  if (parsed === null || typeof parsed !== "object") {
    clearKeybindingConfig();
    return null;
  }

  // 既に最新バージョンなら型ガードのみ実行
  if (isStoredKeybindingConfig(parsed)) return parsed;

  // version フィールドがない、または古いバージョンはマイグレーションを試みる
  const migrated = migrateKeybindingConfig(parsed as MigrationInput);

  if (!isStoredKeybindingConfig(migrated)) {
    // マイグレーション後も型ガードに失敗した場合はクリア
    clearKeybindingConfig();
    return null;
  }

  // マイグレーション結果を localStorage に再保存して永続化
  localStorage.setItem(KEYBINDING_CONFIG_KEY, JSON.stringify(migrated));
  return migrated;
}

export function clearKeybindingConfig(): void {
  localStorage.removeItem(KEYBINDING_CONFIG_KEY);
}
