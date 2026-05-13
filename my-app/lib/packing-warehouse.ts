import type { PaperBoxStage } from "./packing-paper-box-workflow";
import { isLayoutPrinterDecorAsset, isOrderShipLabelSingle, PACKING_PRINTER_EFFECTIVE_MIN_Z } from "./packing-printer-layout";
import type { SilverPacketContents } from "./packing-silver-packet-workflow";

const PKG = "/minigames/packing-simulator/assets/packaging";

/** Tăng khi thay file `group-thank-you-card.png` để trình duyệt không giữ bản cache cũ. */
const GROUP_THANK_YOU_CARD_VER = "20260512";

/** Nhóm trong kho: số lượng là **stack** (mỗi stack đưa ra bàn chứa `unitsPerStack` đơn vị). */
export type InventoryGroup = {
  groupId: string;
  name: string;
  stackSrc: string;
  singleItemSrc: string;
  stackCount: number;
  maxStackCount: number;
  unitsPerStack: number;
  stackWidth: number;
  stackHeight: number;
  singleWidth: number;
  singleHeight: number;
};

export type PackingTableStack = {
  type: "stack";
  id: string;
  groupId: string;
  name: string;
  stackSrc: string;
  singleItemSrc: string;
  x: number;
  y: number;
  width: number;
  height: number;
  singleWidth: number;
  singleHeight: number;
  quantity: number;
  maxQuantity: number;
  zIndex: number;
  rotation: number;
};

export type PackingTableSingleItem = {
  type: "singleItem";
  id: string;
  /** Nhóm kho (tồn, serial) — khớp `packingWarehouseGroupId` / `InventoryGroup.groupId`. */
  groupId: string;
  /** Khóa trong `singleItemSizeConfig` (vd. `packing_bag`) — dùng cho kích thước render cố định. */
  itemId: string;
  name: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  /** Chỉ `paper_box`: chuỗi gấp hộp / mở / nhận đồ / đóng trên bàn. */
  paperBoxStage?: PaperBoxStage;
  /** Chỉ `paper_box`: snapshot bên trong túi bạc niêm phong đã nhét vào hộp (hoàn trả khi vứt thùng rác). */
  paperBoxSealedSilverContents?: SilverPacketContents;
  /** `silver_bag`: đang nhồi đồ (tối đa 3). `silver_sealed_bag`: snapshot bên trong sau niêm phong (đọc/ghi khi vứt thùng rác). */
  silverPacketContents?: SilverPacketContents;
};

/** Keyrambit kéo từ kho thật lên bàn đóng hàng (PNG). */
export type PackingTableKeyrambitItem = {
  type: "keyrambit";
  id: string;
  keyrambitId: string;
  name: string;
  imageSrc: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  rarity: string;
  series: string;
  quantity: 1;
};

/** @deprecated Dùng PackingTableSingleItem */
export type PackingUserPlacedItem = PackingTableSingleItem;

export const packingInventoryDefaults: readonly InventoryGroup[] = [
  {
    groupId: "shipping_bag",
    name: "Túi đóng hàng",
    stackSrc: `${PKG}/group-packing-bag.png`,
    singleItemSrc: `${PKG}/packing-bag.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 200,
    stackHeight: 180,
    singleWidth: 280,
    singleHeight: 320,
  },
  {
    groupId: "paper_box",
    name: "Hộp giấy",
    stackSrc: `${PKG}/group-box.png`,
    singleItemSrc: `${PKG}/box-unfold.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 220,
    stackHeight: 190,
    singleWidth: 340,
    singleHeight: 290,
  },
  {
    groupId: "thank_you_card",
    name: "Thẻ cảm ơn",
    stackSrc: `${PKG}/group-thank-you-card.png?v=${GROUP_THANK_YOU_CARD_VER}`,
    singleItemSrc: `${PKG}/thank-you-card.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 180,
    stackHeight: 150,
    singleWidth: 200,
    singleHeight: 140,
  },
  {
    groupId: "keychain_ring",
    name: "Khoen khóa",
    stackSrc: `${PKG}/group-keyring.png`,
    singleItemSrc: `${PKG}/keyring.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 160,
    stackHeight: 140,
    singleWidth: 120,
    singleHeight: 120,
  },
  {
    groupId: "silica_gel",
    name: "Gói hút ẩm",
    stackSrc: `${PKG}/group-silica-gel-packet.png`,
    singleItemSrc: `${PKG}/silica-gel-packet.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 160,
    stackHeight: 140,
    singleWidth: 90,
    singleHeight: 120,
  },
  {
    groupId: "silver_bag",
    name: "Túi bạc",
    stackSrc: `${PKG}/group-silver-packet.png`,
    singleItemSrc: `${PKG}/silver-packet.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 200,
    stackHeight: 170,
    singleWidth: 200,
    singleHeight: 240,
  },
  /**
   * Đơn `sealed-silver-packet` — dùng thả vào hộp mở (`paper_box` stage `open`).
   * Cùng ảnh stack với `silver_bag`; layout cần `packingWarehouseGroupId: "silver_sealed_bag"` để phân biệt.
   */
  {
    groupId: "silver_sealed_bag",
    name: "Túi bạc niêm phong",
    stackSrc: `${PKG}/group-silver-packet.png`,
    singleItemSrc: `${PKG}/sealed-silver-packet.png`,
    stackCount: 64,
    maxStackCount: 64,
    unitsPerStack: 10,
    stackWidth: 200,
    stackHeight: 170,
    singleWidth: 200,
    singleHeight: 240,
  },
];

export function clonePackingInventory(): InventoryGroup[] {
  return JSON.parse(JSON.stringify(packingInventoryDefaults)) as InventoryGroup[];
}

/** Hợp lệ cho `PackingLayoutAsset.packingWarehouseGroupId` (parse JSON). */
export const PACKING_WAREHOUSE_GROUP_ID_SET = new Set(packingInventoryDefaults.map((g) => g.groupId));

/** So khớp `src` layout với `stackSrc` nhóm (bỏ query string) — khi chưa gán field trong JSON. */
export function inferWarehouseGroupFromStackImageSrc(src: string): string | undefined {
  const normalized = (src.split("?")[0] ?? "").trim();
  if (!normalized) return undefined;
  for (const g of packingInventoryDefaults) {
    const stack = (g.stackSrc.split("?")[0] ?? "").trim();
    if (stack && stack === normalized) return g.groupId;
  }
  return undefined;
}

/** Ưu tiên `packingWarehouseGroupId` hợp lệ; không có thì suy từ ảnh stack kho. */
export function resolveLayoutWarehouseGroupId(asset: {
  packingWarehouseGroupId?: string;
  src: string;
}): string | undefined {
  const id = asset.packingWarehouseGroupId;
  if (id && PACKING_WAREHOUSE_GROUP_ID_SET.has(id)) return id;
  return inferWarehouseGroupFromStackImageSrc(asset.src);
}

export function totalSinglesInWarehouseGroup(g: Pick<InventoryGroup, "stackCount" | "unitsPerStack">): number {
  return Math.max(0, Math.floor(g.stackCount * g.unitsPerStack));
}

export function maxSinglesCapacityForGroup(g: Pick<InventoryGroup, "maxStackCount" | "unitsPerStack">): number {
  return Math.max(0, Math.floor(g.maxStackCount * g.unitsPerStack));
}

/** Tồn sản phẩm đơn ban đầu theo từng nhóm (theo `packingInventoryDefaults`). */
export function createDefaultSinglesLeftMap(): Record<string, number> {
  const m: Record<string, number> = {};
  for (const def of packingInventoryDefaults) {
    m[def.groupId] = totalSinglesInWarehouseGroup(def);
  }
  return m;
}

export type PackingWarehouseStockRow = {
  groupId: string;
  name: string;
  remainingSingles: number;
  maxSingles: number;
};

export function buildWarehouseStockRows(singlesLeft: Record<string, number>): PackingWarehouseStockRow[] {
  return packingInventoryDefaults.map((g) => ({
    groupId: g.groupId,
    name: g.name,
    remainingSingles: singlesLeft[g.groupId] ?? 0,
    maxSingles: maxSinglesCapacityForGroup(g),
  }));
}

export function nextUserLayerZ(
  layout: { assets: { zIndex?: number; src?: string }[] },
  stacks: PackingTableStack[],
  singles: PackingTableSingleItem[],
  keyrambits: PackingTableKeyrambitItem[] = [],
): number {
  let maxBase = 0;
  for (const a of layout.assets) {
    const z = a.zIndex ?? 0;
    if (z >= PACKING_PRINTER_EFFECTIVE_MIN_Z) continue;
    if (a.src && isLayoutPrinterDecorAsset(a as { src: string })) continue;
    maxBase = Math.max(maxBase, z);
  }
  let maxZ = maxBase;
  for (const s of stacks) maxZ = Math.max(maxZ, s.zIndex);
  for (const s of singles) {
    if (isOrderShipLabelSingle(s)) continue;
    maxZ = Math.max(maxZ, s.zIndex);
  }
  for (const k of keyrambits) maxZ = Math.max(maxZ, k.zIndex);
  return maxZ + 1;
}
