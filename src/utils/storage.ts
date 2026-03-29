import { type KeybindingConfig, VIM_MODES } from "../types/keybinding";

const STORAGE_PREFIX = "keyviz:";
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

export function isStoredKeybindingConfig(
  value: unknown,
): value is KeybindingConfig {
  if (typeof value !== "object" || value === null) return false;

  const v = value as Record<string, unknown>;

  return (
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
  if (isStoredKeybindingConfig(parsed)) return parsed;
  return null;
}

export function clearKeybindingConfig(): void {
  localStorage.removeItem(KEYBINDING_CONFIG_KEY);
}
