/**
 * Kích thước đơn khi chơi Packing Simulator trên mobile (viewport dưới 768px hoặc ?view=mobile).
 * Giữ cùng key với `singleItemSizeConfig` để logic kho / hộp giấy không đổi — chỉ thu nhỏ cho màn hẹp.
 */

import type { PaperBoxStage } from "@/lib/packing-paper-box-workflow";
import {
  packingWarehouseGroupIdToSingleItemId,
  paperBoxStageToSizeKey,
} from "@/src/config/packing/singleItemSizeConfig";

export const singleItemSizeConfigMobile = {
  order_ship_label: { width: 180, height: 180 },
  packing_bag: { width: 290, height: 360 },
  box_unfold: { width: 330, height: 330 },
  box_folding_1: { width: 330, height: 280 },
  box_folding_2: { width: 330, height: 280 },
  box_open: { width: 315, height: 265 },
  box_with_silver: { width: 315, height: 265 },
  box_full: { width: 315, height: 265 },
  box_closed: { width: 235, height: 200 },
  box_in_packing_bag: { width: 315, height: 350 },
  packing_bag_done: { width: 315, height: 350 },
  thank_you_card: { width: 100, height: 92 },
  keyring: { width: 60, height: 60 },
  silver_packet: { width: 150, height: 150 },
  silica_gel_packet: { width: 58, height: 58 },
  table_keyrambit: { width: 118, height: 118 },
} as const;

export type SingleItemSizeIdMobile = keyof typeof singleItemSizeConfigMobile;

const FALLBACK_SINGLE_PX = { width: 72, height: 72 } as const;

export function resolveSingleItemIdForWarehouseGroupMobile(groupId: string): string {
  const mapped =
    packingWarehouseGroupIdToSingleItemId[groupId as keyof typeof packingWarehouseGroupIdToSingleItemId];
  if (mapped) return mapped;
  if (groupId in singleItemSizeConfigMobile) return groupId;
  return groupId;
}

export function getSingleItemSizePxMobile(itemId: string): { width: number; height: number } {
  const row = (singleItemSizeConfigMobile as Record<string, { width: number; height: number } | undefined>)[itemId];
  if (row && typeof row.width === "number" && typeof row.height === "number") {
    return { width: row.width, height: row.height };
  }
  return { ...FALLBACK_SINGLE_PX };
}

export function getPaperBoxStageSizePxMobile(stage: PaperBoxStage): { width: number; height: number } {
  const key = paperBoxStageToSizeKey[stage];
  return getSingleItemSizePxMobile(key);
}

export function paperBoxGeometryAfterStageChangeMobile(
  x: number,
  y: number,
  w: number,
  h: number,
  stage: PaperBoxStage,
): { x: number; y: number; width: number; height: number; itemId: string } {
  const { width: nw, height: nh } = getPaperBoxStageSizePxMobile(stage);
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

export function getSingleItemSizeForWarehouseGroupMobile(groupId: string): { width: number; height: number } {
  return getSingleItemSizePxMobile(resolveSingleItemIdForWarehouseGroupMobile(groupId));
}
