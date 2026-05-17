export type InventorySortMode = "newest" | "oldest" | "rarity-desc" | "rarity-asc";

export const INVENTORY_SORT_OPTIONS: ReadonlyArray<{
  value: InventorySortMode;
  label: string;
  shortLabel: string;
}> = [
  { value: "newest", label: "Mới nhất – cũ nhất", shortLabel: "Mới→cũ" },
  { value: "oldest", label: "Cũ nhất – mới nhất", shortLabel: "Cũ→mới" },
  { value: "rarity-desc", label: "Độ hiếm giảm dần", shortLabel: "Hiếm ↓" },
  { value: "rarity-asc", label: "Độ hiếm tăng dần", shortLabel: "Hiếm ↑" },
] as const;

export const DEFAULT_INVENTORY_SORT: InventorySortMode = "newest";

type SortableItem = {
  id: string;
  name: string;
  rarity: string;
  acquiredAt: string;
};

export function sortInventoryItems<T extends SortableItem>(
  items: T[],
  mode: InventorySortMode,
  rarityOrder: readonly string[],
  normalizeRarity: (raw: string) => string
): T[] {
  const rarityRank = new Map(rarityOrder.map((rarity, index) => [rarity, index]));
  const rankOf = (item: T) => rarityRank.get(normalizeRarity(item.rarity)) ?? 0;
  const timeOf = (item: T) => {
    const t = new Date(item.acquiredAt).getTime();
    return Number.isFinite(t) ? t : 0;
  };
  const byName = (a: T, b: T) => a.name.localeCompare(b.name, "vi");

  const sorted = [...items];

  switch (mode) {
    case "oldest":
      sorted.sort((a, b) => timeOf(a) - timeOf(b) || byName(a, b));
      break;
    case "rarity-desc":
      sorted.sort((a, b) => rankOf(b) - rankOf(a) || timeOf(b) - timeOf(a) || byName(a, b));
      break;
    case "rarity-asc":
      sorted.sort((a, b) => rankOf(a) - rankOf(b) || timeOf(b) - timeOf(a) || byName(a, b));
      break;
    case "newest":
    default:
      sorted.sort((a, b) => timeOf(b) - timeOf(a) || byName(a, b));
      break;
  }

  return sorted;
}
