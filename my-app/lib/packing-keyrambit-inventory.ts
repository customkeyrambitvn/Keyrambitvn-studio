import type { InventoryItem } from "@/lib/inventory-local";
import type { PlayerKeyrambitInventoryItem } from "@/lib/packing-orders-types";
import { keyrambitIdFromName } from "@/lib/packing-keyrambit-id";

export function aggregateKeyrambitInventory(flat: InventoryItem[]): PlayerKeyrambitInventoryItem[] {
  const map = new Map<string, PlayerKeyrambitInventoryItem>();
  for (const row of flat) {
    const kid = keyrambitIdFromName(row.name);
    const img = row.image?.trim() ?? "";
    const prev = map.get(kid);
    if (prev) {
      prev.quantity += 1;
    } else {
      map.set(kid, {
        keyrambitId: kid,
        name: row.name,
        imageSrc: img,
        quantity: 1,
        rarity: row.rarity,
        series: row.boxName ?? "",
      });
    }
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "vi"));
}

export function countKeyrambitOnTableById(
  table: { keyrambitId: string }[],
  keyrambitId: string,
): number {
  return table.filter((k) => k.keyrambitId === keyrambitId).length;
}
