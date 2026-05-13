import type { PackingLayout } from "@/lib/packing-layout";

/** Cùng công thức với `PackingKonvaStage` (stage letterbox trong `wrapEl`). */
export function clientToPackingLayoutCoords(
  layout: PackingLayout,
  containerWidth: number,
  containerHeight: number,
  wrapEl: HTMLElement | null,
  clientX: number,
  clientY: number,
): { x: number; y: number } | null {
  const sw = layout.stage.width;
  const sh = layout.stage.height;
  if (!wrapEl || containerWidth <= 0 || containerHeight <= 0 || sw <= 0 || sh <= 0) return null;
  const scale = Math.min(containerWidth / sw, containerHeight / sh);
  const ox = (containerWidth - sw * scale) / 2;
  const oy = (containerHeight - sh * scale) / 2;
  const rect = wrapEl.getBoundingClientRect();
  const x = (clientX - rect.left - ox) / scale;
  const y = (clientY - rect.top - oy) / scale;
  return { x, y };
}

/** Map hình chữ nhật layout (px) → tọa độ viewport (px) — dùng overlay UI trên bàn. */
export function packingLayoutRectToClientViewportRect(
  layout: PackingLayout,
  containerWidth: number,
  containerHeight: number,
  wrapEl: HTMLElement | null,
  rect: { x: number; y: number; width: number; height: number },
): { left: number; top: number; width: number; height: number } | null {
  const sw = layout.stage.width;
  const sh = layout.stage.height;
  if (!wrapEl || containerWidth <= 0 || containerHeight <= 0 || sw <= 0 || sh <= 0) return null;
  const scale = Math.min(containerWidth / sw, containerHeight / sh);
  const ox = (containerWidth - sw * scale) / 2;
  const oy = (containerHeight - sh * scale) / 2;
  const br = wrapEl.getBoundingClientRect();
  return {
    left: br.left + ox + rect.x * scale,
    top: br.top + oy + rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}
