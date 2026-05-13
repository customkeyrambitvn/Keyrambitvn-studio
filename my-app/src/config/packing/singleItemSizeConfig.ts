/**
 * Kích thước cố định (px layout) cho sản phẩm đơn kéo ra từ stack trên bàn.
 * Stack trong layout/editor giữ nguyên size riêng — chỉ single item dùng các giá trị này.
 */

import type { PaperBoxStage } from "@/lib/packing-paper-box-workflow";

export const singleItemSizeConfig = {
  /** Label đơn từ máy in (không có trong kho drawer). */
  order_ship_label: { width: 220, height: 220 },
  packing_bag: { width: 350, height: 440 },
  /** Hộp giấy — từng trạng thái UX (chỉnh tay tại đây). */
  box_unfold: { width: 400, height: 400 },
  box_folding_1: { width: 400, height: 340 },
  box_folding_2: { width: 400, height: 340 },
  box_open: { width: 380, height: 320 },
  box_with_silver: { width: 380, height: 320 },
  box_full: { width: 380, height: 320 },
  box_closed: { width: 280, height: 240 },
  /** Hộp đã nằm trong túi đóng hàng. */
  box_in_packing_bag: { width: 380, height: 420 },
  /** Hộp trong túi — xong (dán label). Gần `packing_bag` done. */
  packing_bag_done: { width: 380, height: 420 },
  thank_you_card: { width: 120, height: 110 },
  keyring: { width: 70, height: 70 },
  silver_packet: { width: 180, height: 180 },
  silica_gel_packet: { width: 70, height: 70 },
  /** Keyrambit trên bàn đóng hàng (Konva). */
  table_keyrambit: { width: 140, height: 140 },
} as const;

export type SingleItemSizeId = keyof typeof singleItemSizeConfig;

/** `PaperBoxStage` → key trong `singleItemSizeConfig`. */
export const paperBoxStageToSizeKey = {
  unfold: "box_unfold",
  folding1: "box_folding_1",
  folding2: "box_folding_2",
  open: "box_open",
  withSilver: "box_with_silver",
  full: "box_full",
  closed: "box_closed",
  inPackingBag: "box_in_packing_bag",
  packingBagDone: "packing_bag_done",
} as const satisfies Record<PaperBoxStage, keyof typeof singleItemSizeConfig>;

/** `packingWarehouseGroupId` trong layout / `InventoryGroup.groupId` → key trong `singleItemSizeConfig`. */
export const packingWarehouseGroupIdToSingleItemId = {
  shipping_bag: "packing_bag",
  paper_box: "box_unfold",
  thank_you_card: "thank_you_card",
  keychain_ring: "keyring",
  silver_bag: "silver_packet",
  silver_sealed_bag: "silver_packet",
  silica_gel: "silica_gel_packet",
} as const satisfies Record<string, SingleItemSizeId>;

export type PackingWarehouseGroupIdForSingleSize = keyof typeof packingWarehouseGroupIdToSingleItemId;

export function resolveSingleItemIdForWarehouseGroup(groupId: string): string {
  const mapped =
    packingWarehouseGroupIdToSingleItemId[groupId as PackingWarehouseGroupIdForSingleSize];
  if (mapped) return mapped;
  if (groupId in singleItemSizeConfig) return groupId;
  return groupId;
}

const FALLBACK_SINGLE_PX = { width: 80, height: 80 } as const;

/** Size theo key `singleItemSizeConfig` (vd. `packing_bag`). */
export function getSingleItemSizePx(itemId: string): { width: number; height: number } {
  const row = (singleItemSizeConfig as Record<string, { width: number; height: number } | undefined>)[itemId];
  if (row && typeof row.width === "number" && typeof row.height === "number") {
    return { width: row.width, height: row.height };
  }
  return { ...FALLBACK_SINGLE_PX };
}

/** Kích thước đơn hộp giấy theo trạng thái UX. */
export function getPaperBoxStageSizePx(stage: PaperBoxStage): { width: number; height: number } {
  const key = paperBoxStageToSizeKey[stage];
  return getSingleItemSizePx(key);
}

/**
 * Giữ tâm hộp khi đổi trạng thái; trả về `itemId` khớp key size (đồng bộ với config).
 */
export function paperBoxGeometryAfterStageChange(
  x: number,
  y: number,
  w: number,
  h: number,
  stage: PaperBoxStage,
): { x: number; y: number; width: number; height: number; itemId: string } {
  const { width: nw, height: nh } = getPaperBoxStageSizePx(stage);
  const cx = x + w / 2;
  const cy = y + h / 2;
  return {
    x: cx - nw / 2,
    y: cy - nh / 2,
    width: nw,
    height: nh,
    itemId: paperBoxStageToSizeKey[stage],
  };
}

/** Size đơn spawn từ stack: map `groupId` kho → `singleItemSizeConfig`, không dùng size stack. */
export function getSingleItemSizeForWarehouseGroup(groupId: string): { width: number; height: number } {
  return getSingleItemSizePx(resolveSingleItemIdForWarehouseGroup(groupId));
}
