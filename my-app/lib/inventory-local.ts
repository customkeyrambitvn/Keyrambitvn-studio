export type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

export const INVENTORY_STORAGE_KEY = "keyrambit-inventory";
export const INVENTORY_TITLE_KEY = "keyrambit-inventory-title";
export const DEFAULT_INVENTORY_TITLE = "Keyrambit Collection";

export const INVENTORY_CHANGED_EVENT = "keyrambit-inventory-changed";

function dispatchChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(INVENTORY_CHANGED_EVENT));
}

export function readLocalInventory(): InventoryItem[] {
  if (typeof window === "undefined") return [];
  const raw = window.localStorage.getItem(INVENTORY_STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as InventoryItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function writeLocalInventory(items: InventoryItem[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INVENTORY_STORAGE_KEY, JSON.stringify(items));
  dispatchChanged();
}

export function readLocalInventoryTitle(): string {
  if (typeof window === "undefined") return DEFAULT_INVENTORY_TITLE;
  const raw = window.localStorage.getItem(INVENTORY_TITLE_KEY);
  if (raw == null || raw.trim() === "") return DEFAULT_INVENTORY_TITLE;
  return raw.trim();
}

export function writeLocalInventoryTitle(title: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(INVENTORY_TITLE_KEY, title);
  dispatchChanged();
}

/** Guest rows first; cloud rows that don't share an id with guest. */
export function mergeGuestIntoAccount(guest: InventoryItem[], cloud: InventoryItem[]): InventoryItem[] {
  const guestIds = new Set(guest.map((g) => g.id));
  const rest = cloud.filter((c) => !guestIds.has(c.id));
  return [...guest, ...rest];
}
