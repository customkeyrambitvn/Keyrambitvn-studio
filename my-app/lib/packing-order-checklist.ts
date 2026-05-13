import type { PackingOrder } from "./packing-orders-types";
import type { PackingTableKeyrambitItem, PackingTableSingleItem } from "./packing-warehouse";

export type PackingChecklistRow = {
  id: string;
  label: string;
  ok: boolean;
  detail?: string;
  /** Phân nhóm checklist quy trình (drawer đóng hàng). */
  section?: "prep" | "pack";
};

function countKeyrambitOnTable(items: PackingTableKeyrambitItem[], keyrambitId: string): number {
  return items.filter((k) => k.keyrambitId === keyrambitId).length;
}

function countWrongKeyrambitsOnTable(
  items: PackingTableKeyrambitItem[],
  requiredId: string,
): PackingTableKeyrambitItem[] {
  return items.filter((k) => k.keyrambitId !== requiredId);
}

function countPackagingSingles(singles: PackingTableSingleItem[], groupId: string): number {
  return singles.filter((s) => s.groupId === groupId).length;
}

export function buildPackingOrderChecklist(
  order: PackingOrder,
  keyrambitsOnTable: PackingTableKeyrambitItem[],
  singlesOnTable: PackingTableSingleItem[],
): { rows: PackingChecklistRow[]; allOk: boolean; wrongKeyrambitNames: string[] } {
  const wrong = countWrongKeyrambitsOnTable(keyrambitsOnTable, order.requiredKeyrambitId);
  const rightCount = countKeyrambitOnTable(keyrambitsOnTable, order.requiredKeyrambitId);
  const qtyOk = rightCount >= order.requiredQuantity;
  const hasWrong = wrong.length > 0;

  const rows: PackingChecklistRow[] = [
    {
      id: "kb-right",
      label: `Đúng Keyrambit (${order.requiredKeyrambitName})`,
      ok: !hasWrong && rightCount > 0,
      detail: hasWrong
        ? `Đơn cần “${order.requiredKeyrambitName}”, không phải “${wrong[0]!.name}”.`
        : rightCount === 0
          ? "Chưa có Keyrambit trên bàn."
          : undefined,
    },
    {
      id: "kb-qty",
      label: `Đủ số lượng Keyrambit (${rightCount}/${order.requiredQuantity})`,
      ok: qtyOk,
      detail: !qtyOk ? `Cần ${order.requiredQuantity} trên bàn.` : undefined,
    },
  ];

  for (const line of order.requiredPackagingItems) {
    const onTable = countPackagingSingles(singlesOnTable, line.itemId);
    const ok = onTable >= line.quantity;
    rows.push({
      id: `pkg-${line.itemId}`,
      label: `${line.name} ×${line.quantity}`,
      ok,
      detail: !ok ? `Trên bàn: ${onTable}/${line.quantity}` : undefined,
    });
  }

  const allOk = rows.every((r) => r.ok);
  return { rows, allOk, wrongKeyrambitNames: wrong.map((w) => w.name) };
}
