const STORAGE_PREFIX = "keyviz:";
const LAYOUT_KEY = `${STORAGE_PREFIX}layout`;
const KEYMAP_KEY = `${STORAGE_PREFIX}keymap`;

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
}
