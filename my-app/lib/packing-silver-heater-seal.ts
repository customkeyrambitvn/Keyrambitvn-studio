import type { PackingLayout, PackingLayoutAsset } from "@/lib/packing-layout";
import type { PackingTableSingleItem } from "@/lib/packing-warehouse";
import { silverPacketFilledCount } from "@/lib/packing-silver-packet-workflow";

export function isLayoutHeaterAsset(asset: Pick<PackingLayoutAsset, "src">): boolean {
  const u = (asset.src.split("?")[0] ?? "").toLowerCase();
  return u.includes("heater.png") || u.includes("/heater.");
}

export function listLayoutHeaters(layout: PackingLayout): PackingLayoutAsset[] {
  return layout.assets.filter(isLayoutHeaterAsset);
}

/** Tâm túi bạc (đã nhồi đủ 3/3) nằm trong vùng máy sấy (layout px). */
export function silverStuffPacketFullCenterOnHeater(
  single: Pick<PackingTableSingleItem, "groupId" | "x" | "y" | "width" | "height" | "silverPacketContents">,
  heaters: PackingLayoutAsset[],
): boolean {
  if (single.groupId !== "silver_bag") return false;
  if (silverPacketFilledCount(single.silverPacketContents) < 3) return false;
  if (heaters.length === 0) return false;
  const cx = single.x + single.width / 2;
  const cy = single.y + single.height / 2;
  for (const h of heaters) {
    const padX = h.width * 0.08;
    const padY = h.height * 0.08;
    if (
      cx >= h.x + padX &&
      cx <= h.x + h.width - padX &&
      cy >= h.y + padY &&
      cy <= h.y + h.height - padY
    ) {
      return true;
    }
  }
  return false;
}
