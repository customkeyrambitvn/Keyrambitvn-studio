import { PACKING_WAREHOUSE_GROUP_ID_SET } from "./packing-warehouse";

export const PACKING_LAYOUT_VERSION = 1 as const;

/** Crop rectangle in **source image pixels** (Konva `Image.crop`). Omit for full image. */
export type PackingImageCrop = {
  x: number;
  y: number;
  width: number;
  height: number;
};

/** Degrees; UI clamp typically ±60. Stored in JSON; Konva uses skew as 2D “tilt” fallback. */
export const PACKING_TILT_MIN = -60;
export const PACKING_TILT_MAX = 60;

export function clampPackingTilt(deg: number): number {
  return Math.max(PACKING_TILT_MIN, Math.min(PACKING_TILT_MAX, deg));
}

export type PackingLayoutAsset = {
  id: string;
  /** Optional display label in editor / exports */
  name?: string;
  /**
   * Khi chơi `/packing`: asset này là stack lấy từ tồn nhóm kho (`packing-warehouse`); không spawn từ drawer.
   * Chỉ chấp nhận `groupId` đã đăng ký trong `PACKING_WAREHOUSE_GROUP_ID_SET`.
   */
  packingWarehouseGroupId?: string;
  src: string;
  x: number;
  y: number;
  width: number;
  height: number;
  /** 2D rotation in degrees (flat plane). */
  rotation: number;
  /** Horizontal perspective tilt (degrees); rendered as Konva skewY. */
  tiltX: number;
  /** Vertical perspective tilt (degrees); rendered as Konva skewX. */
  tiltY: number;
  zIndex: number;
  opacity: number;
  locked: boolean;
  crop?: PackingImageCrop;
};

export type PackingLayout = {
  version: typeof PACKING_LAYOUT_VERSION;
  stage: { width: number; height: number };
  assets: PackingLayoutAsset[];
};

/** Default layout shipped with the app (player + editor initial). */
export const PACKING_LAYOUT_DEFAULT_URL = "/layouts/packing-default.json";

/** Layout mặc định cho mobile (`/packing?view=mobile`, viewport nhỏ) và packing-editor-mobile. */
export const PACKING_LAYOUT_MOBILE_DEFAULT_URL = "/layouts/packing-layout-mobile.json";

/**
 * When the editor clicks "Save layout", JSON is also written here so `/packing` can show the same
 * layout in this browser without replacing files under `public/`.
 */
export const PACKING_LAYOUT_LOCALSTORAGE_KEY = "keyrambitvn:packing-layout-json-v1";

/** Dispatched on `window` after a successful preview persist (same-tab listener). */
export const PACKING_LAYOUT_SAVED_EVENT = "keyrambitvn:packing-layout-saved";

/** True when the dev-only packing editor route is allowed (checked on the server). */
export function isPackingEditorEnabled(): boolean {
  return (
    process.env.NEXT_PUBLIC_ENABLE_PACKING_EDITOR === "true" ||
    process.env.VITE_ENABLE_PACKING_EDITOR === "true"
  );
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function str(v: unknown): string | null {
  return typeof v === "string" ? v : null;
}

function bool(v: unknown): boolean | null {
  return typeof v === "boolean" ? v : null;
}

export function parsePackingLayout(raw: unknown): PackingLayout | null {
  if (!isRecord(raw)) return null;
  if (raw.version !== PACKING_LAYOUT_VERSION) return null;
  const stage = raw.stage;
  if (!isRecord(stage)) return null;
  const sw = num(stage.width);
  const sh = num(stage.height);
  if (sw == null || sh == null || sw <= 0 || sh <= 0) return null;
  const assetsRaw = raw.assets;
  if (!Array.isArray(assetsRaw)) return null;

  const assets: PackingLayoutAsset[] = [];
  for (const item of assetsRaw) {
    if (!isRecord(item)) return null;
    const id = str(item.id);
    const src = str(item.src);
    const x = num(item.x);
    const y = num(item.y);
    const width = num(item.width);
    const height = num(item.height);
    const rotation = num(item.rotation);
    const zIndex = num(item.zIndex);
    const opacity = num(item.opacity);
    const locked = bool(item.locked);
    if (
      id == null ||
      src == null ||
      x == null ||
      y == null ||
      width == null ||
      height == null ||
      rotation == null ||
      zIndex == null ||
      opacity == null ||
      locked == null
    ) {
      return null;
    }
    if (width <= 0 || height <= 0) return null;
    if (opacity < 0 || opacity > 1) return null;

    const nameRaw = str(item.name);
    const name = nameRaw && nameRaw.trim() ? nameRaw.trim() : undefined;
    const tiltXRaw = num(item.tiltX);
    const tiltYRaw = num(item.tiltY);
    const tiltX = clampPackingTilt(tiltXRaw ?? 0);
    const tiltY = clampPackingTilt(tiltYRaw ?? 0);

    let crop: PackingImageCrop | undefined;
    if (item.crop !== undefined && item.crop !== null) {
      if (!isRecord(item.crop)) return null;
      const cx = num(item.crop.x);
      const cy = num(item.crop.y);
      const cw = num(item.crop.width);
      const ch = num(item.crop.height);
      if (cx == null || cy == null || cw == null || ch == null) return null;
      if (cw <= 0 || ch <= 0) return null;
      crop = { x: cx, y: cy, width: cw, height: ch };
    }

    let packingWarehouseGroupId: string | undefined;
    const pwgRaw = str(item.packingWarehouseGroupId);
    if (pwgRaw) {
      const trimmed = pwgRaw.trim();
      if (trimmed && PACKING_WAREHOUSE_GROUP_ID_SET.has(trimmed)) {
        packingWarehouseGroupId = trimmed;
      }
    }

    assets.push({
      id,
      ...(name ? { name } : {}),
      ...(packingWarehouseGroupId ? { packingWarehouseGroupId } : {}),
      src,
      x,
      y,
      width,
      height,
      rotation,
      tiltX,
      tiltY,
      zIndex,
      opacity,
      locked,
      ...(crop ? { crop } : {}),
    });
  }

  return { version: PACKING_LAYOUT_VERSION, stage: { width: sw, height: sh }, assets };
}

export function sortAssetsByZIndex(assets: PackingLayoutAsset[]): PackingLayoutAsset[] {
  return [...assets].sort((a, b) => a.zIndex - b.zIndex);
}
