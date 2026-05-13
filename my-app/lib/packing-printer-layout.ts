const PKG = "/minigames/packing-simulator/assets/packaging";

/** Ảnh máy in mặc định (layout). */
export const PACKING_PRINTER_BASE_SRC = `${PKG}/printer.png`;

/** Sau khi in xong ~3s. (Chỉ dùng editor / asset tĩnh; gameplay không đổi máy in sang ảnh này.) */
export const PACKING_PRINTER_WITH_ORDER_SRC = `${PKG}/printer-with-order.png`;

/** Label đơn spawn từ máy in. */
export const PACKING_ORDER_LABEL_SRC = `${PKG}/label.png`;

/** Label đơn từ máy in — z vẽ cao (trên đơn thường / máy in 9000) nhưng không 200k để tránh chặn kéo hộp/túi. */
export const PACKING_ORDER_LABEL_DISPLAY_Z = 14_000;

export function isOrderShipLabelSingle(item: { groupId: string }): boolean {
  return item.groupId === "order_ship_label";
}

export function stripLayoutAssetSrcQuery(src: string): string {
  return (src.split("?")[0] ?? "").trim();
}

/** Asset layout là máy in (gốc hoặc đã có đơn). */
export function isLayoutPrinterDecorAsset(asset: { src: string }): boolean {
  const u = stripLayoutAssetSrcQuery(asset.src).toLowerCase();
  return u.includes("printer-with-order") || u.includes("/printer.png");
}

export function isPrinterWithOrderSrc(src: string): boolean {
  return stripLayoutAssetSrcQuery(src).toLowerCase().includes("printer-with-order");
}

/**
 * Khi gộp vẽ với đơn bàn: máy in dùng z hiệu dụng tối thiểu này để luôn nhận click (tránh mọi đơn spawn
 * luôn nằm trên layout do `nextUserLayerZ` lấy max toàn bộ asset).
 */
export const PACKING_PRINTER_EFFECTIVE_MIN_Z = 9000;

export function layoutPrinterPaintZIndex(asset: { src: string; zIndex?: number }): number {
  const z = asset.zIndex ?? 0;
  return isLayoutPrinterDecorAsset(asset) ? Math.max(z, PACKING_PRINTER_EFFECTIVE_MIN_Z) : z;
}
