import { ITEMS_BY_RARITY } from "@/app/data/products";
import type { InventoryItem } from "@/lib/inventory-local";
import { aggregateKeyrambitInventory } from "@/lib/packing-keyrambit-inventory";
import { keyrambitIdFromName } from "@/lib/packing-keyrambit-id";
import type { PackingOrder } from "@/lib/packing-orders-types";

/** Tổng số Keyrambit trong kho phẳng theo `keyrambitId` (cùng quy ước `keyrambitIdFromName`). */
export function getKeyrambitStock(keyrambitId: string, flat: InventoryItem[]): number {
  let n = 0;
  for (const row of flat) {
    if (keyrambitIdFromName(row.name) === keyrambitId) n++;
  }
  return n;
}

function allCatalogProductNames(): string[] {
  const out: string[] = [];
  for (const list of Object.values(ITEMS_BY_RARITY)) {
    for (const p of list) out.push(p.name);
  }
  return out;
}

const CUSTOMER_NAMES = [
  "Anh Tuấn",
  "Chị Lan",
  "Bạn Minh",
  "Shop ABC",
  "Khách lẻ",
  "Em Hương",
  "Anh Đức",
  "Chị Mai",
  "Bạn Nam",
  "Tiệm XYZ",
];

let orderIdSeq = 0;

function nextOrderId(rng: () => number): string {
  orderIdSeq += 1;
  return `ord-${Date.now()}-${orderIdSeq}-${Math.floor(rng() * 1e6)}`;
}

/**
 * 95%: Keyrambit đang có trong kho (quantity > 0), số lượng đơn ≤ tồn kho tại thời điểm tạo.
 * 5%: random từ catalog (có thể chưa có / không đủ trong kho).
 */
export function generateOrder(flat: InventoryItem[], rng: () => number = Math.random): PackingOrder {
  const catalog = allCatalogProductNames();
  const agg = aggregateKeyrambitInventory(flat);
  const inStock = agg.filter((a) => a.quantity > 0);

  const roll = rng();
  const preferInStock = roll < 0.95 && inStock.length > 0;

  let requiredName: string;
  let requiredQty: number;

  if (preferInStock) {
    const row = inStock[Math.floor(rng() * inStock.length)]!;
    const maxQ = Math.min(3, row.quantity);
    requiredQty = maxQ <= 1 ? 1 : 1 + Math.floor(rng() * maxQ);
    requiredName = row.name;
  } else {
    requiredName = catalog[Math.floor(rng() * catalog.length)]!;
    requiredQty = 1 + Math.floor(rng() * 2);
  }

  const customer = CUSTOMER_NAMES[Math.floor(rng() * CUSTOMER_NAMES.length)]!;

  return {
    id: nextOrderId(rng),
    customerName: customer,
    requiredKeyrambitId: keyrambitIdFromName(requiredName),
    requiredKeyrambitName: requiredName,
    requiredQuantity: requiredQty,
    /** Checklist đóng gói cố định theo `buildPackingWorkflowCompletion` — không còn preset vật tư random. */
    requiredPackagingItems: [],
    status: "pending",
  };
}

export function buildPendingOrderQueue(count: number, flat: InventoryItem[], rng: () => number = Math.random): PackingOrder[] {
  const out: PackingOrder[] = [];
  for (let i = 0; i < count; i++) {
    out.push(generateOrder(flat, rng));
  }
  return out;
}
