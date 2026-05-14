"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useCallback, useState } from "react";
import { Group, Image as KonvaImage, Layer, Rect, Shape, Stage, Text, Transformer } from "react-konva";
import Konva from "konva";
import useImage from "use-image";
import type { PackingImageCrop, PackingLayout, PackingLayoutAsset } from "@/lib/packing-layout";
import { clampPackingTilt, sortAssetsByZIndex } from "@/lib/packing-layout";
import {
  resolveLayoutWarehouseGroupId,
  type PackingTableKeyrambitItem,
  type PackingTableSingleItem,
  type PackingTableStack,
} from "@/lib/packing-warehouse";
import { isLayoutPrinterDecorAsset, isOrderShipLabelSingle, layoutPrinterPaintZIndex, PACKING_ORDER_LABEL_DISPLAY_Z } from "@/lib/packing-printer-layout";
import { isPaperBoxWorkflowItem } from "@/lib/packing-paper-box-workflow";
import {
  isSilverBagTableItem,
  silverPacketFilledCount,
  formatSealedSilverPacketCaption,
} from "@/lib/packing-silver-packet-workflow";

/** Konva 2D skew approximates CSS-like tilt: skewX ← tiltY, skewY ← tiltX (degrees → radians). */
function assetTiltSkew(asset: PackingLayoutAsset) {
  const tx = clampPackingTilt(asset.tiltX ?? 0);
  const ty = clampPackingTilt(asset.tiltY ?? 0);
  return {
    skewX: Konva.Util.degToRad(ty),
    skewY: Konva.Util.degToRad(tx),
  };
}

function clampCrop(sx: number, sy: number, sw: number, sh: number, nw: number, nh: number): PackingImageCrop {
  const x = Math.max(0, Math.min(sx, nw - 8));
  const y = Math.max(0, Math.min(sy, nh - 8));
  const w = Math.max(8, Math.min(sw, nw - x));
  const h = Math.max(8, Math.min(sh, nh - y));
  return { x, y, width: w, height: h };
}

/**
 * Map source crop (sx,sy,sw,sh) into slot W×H with a single scale (object-fit: cover),
 * so the bitmap is never axis-stretched when crop aspect ≠ slot aspect.
 */
/** Safe source-rect for layout math (avoids W/0 → Infinity which hides the image and breaks the Transformer). */
function safeSourceRect(
  nw: number,
  nh: number,
  crop: PackingImageCrop | undefined,
): { sx: number; sy: number; sw: number; sh: number } {
  if (nw <= 0 || nh <= 0) {
    return { sx: 0, sy: 0, sw: 1, sh: 1 };
  }
  let sx = crop?.x ?? 0;
  let sy = crop?.y ?? 0;
  let sw = crop?.width ?? nw;
  let sh = crop?.height ?? nh;
  if (!Number.isFinite(sx) || !Number.isFinite(sy) || !Number.isFinite(sw) || !Number.isFinite(sh)) {
    return { sx: 0, sy: 0, sw: nw, sh: nh };
  }
  sw = Math.max(1, sw);
  sh = Math.max(1, sh);
  sx = Math.max(0, Math.min(sx, nw - 1));
  sy = Math.max(0, Math.min(sy, nh - 1));
  sw = Math.min(sw, nw - sx);
  sh = Math.min(sh, nh - sy);
  sw = Math.max(1, sw);
  sh = Math.max(1, sh);
  return { sx, sy, sw, sh };
}

function uniformCoverLayout(
  nw: number,
  nh: number,
  W: number,
  H: number,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
) {
  const s = Math.max(W / sw, H / sh);
  const vx = (W - sw * s) / 2;
  const vy = (H - sh * s) / 2;
  const imgW = nw * s;
  const imgH = nh * s;
  const imgX = -sx * s + vx;
  const imgY = -sy * s + vy;
  return { imgW, imgH, imgX, imgY };
}

/** Inverse of uniform slot mapping: visible rectangle in source pixels for clip [0,viewW]×[0,viewH]. */
function cropFromUniformInnerNode(node: Konva.Image, nw: number, nh: number, viewW: number, viewH: number): PackingImageCrop {
  const rawW = node.width() * node.scaleX();
  const rawH = node.height() * node.scaleY();
  // Always bake transform into width/height so inverse matches React props on the next paint.
  node.scaleX(1);
  node.scaleY(1);
  const sMean = (rawW / nw + rawH / nh) / 2;
  node.width(nw * sMean);
  node.height(nh * sMean);
  const s = node.width() / nw;
  const imgX = node.x();
  const imgY = node.y();

  const x0 = -imgX / s;
  const x1 = (viewW - imgX) / s;
  const y0 = -imgY / s;
  const y1 = (viewH - imgY) / s;

  const loX = Math.min(x0, x1);
  const hiX = Math.max(x0, x1);
  const loY = Math.min(y0, y1);
  const hiY = Math.max(y0, y1);

  const nSx = Math.max(0, loX);
  const nSy = Math.max(0, loY);
  const nEx = Math.min(nw, hiX);
  const nEy = Math.min(nh, hiY);
  const nSw = Math.max(8, nEx - nSx);
  const nSh = Math.max(8, nEy - nSy);

  return clampCrop(nSx, nSy, nSw, nSh, nw, nh);
}

function fullImageCrop(nw: number, nh: number): PackingImageCrop {
  return { x: 0, y: 0, width: nw, height: nh };
}

function normalizeCropForSave(c: PackingImageCrop, nw: number, nh: number): PackingImageCrop | undefined {
  const full = fullImageCrop(nw, nh);
  const same =
    Math.abs(c.x - full.x) < 0.5 &&
    Math.abs(c.y - full.y) < 0.5 &&
    Math.abs(c.width - full.width) < 0.5 &&
    Math.abs(c.height - full.height) < 0.5;
  return same ? undefined : c;
}

const CROP_INNER_SUFFIX = "__crop-inner";

/** Khoảng rê (px màn hình) trước khi coi là kéo lấy đơn khỏi stack layout (tránh nhầm với tap). */
const PACKING_WAREHOUSE_PICK_DRAG_PX = 10;

function pointerClientXY(evt: Event | undefined | null): { x: number; y: number } | null {
  if (evt == null) return null;
  if ("changedTouches" in evt) {
    const te = evt as TouchEvent;
    const list = te.changedTouches;
    if (list && list.length > 0) {
      const t = list[0]!;
      return { x: t.clientX, y: t.clientY };
    }
  }
  const me = evt as MouseEvent;
  if (typeof me.clientX === "number" && typeof me.clientY === "number") {
    return { x: me.clientX, y: me.clientY };
  }
  return null;
}

function cropInnerNodeId(assetId: string) {
  return `${assetId}${CROP_INNER_SUFFIX}`;
}

function LayoutImage({
  asset,
  editMode,
  cropEditActive,
  onSelect,
  onAssetChange,
  onReady,
  playPrinter,
}: {
  asset: PackingLayoutAsset;
  editMode: boolean;
  cropEditActive: boolean;
  onSelect: (id: string) => void;
  onAssetChange: (id: string, patch: Partial<PackingLayoutAsset>) => void;
  onReady: () => void;
  /** Chế độ chơi: tap máy in layout + thanh in. */
  playPrinter?: {
    warmingAssetId: string | null;
    warmingProgress01: number;
    onPrinterTap: (asset: PackingLayoutAsset) => void;
    preferTapOnPrinter?: boolean;
  } | null;
}) {
  const crossOrigin = /^https?:\/\//i.test(asset.src) ? "anonymous" : undefined;
  const [image, imageStatus] = useImage(asset.src, crossOrigin);

  const W = Math.max(1, asset.width);
  const H = Math.max(1, asset.height);
  const { skewX, skewY } = assetTiltSkew(asset);

  useEffect(() => {
    if (image) onReady();
  }, [image, onReady]);

  useEffect(() => {
    if (imageStatus === "failed") {
      console.warn("[packing] Không tải được ảnh (404/CORS?):", asset.src);
    }
  }, [imageStatus, asset.src]);

  if (!image) {
    const failed = imageStatus === "failed";
    if (!editMode) {
      if (playPrinter && isLayoutPrinterDecorAsset(asset)) {
        return (
          <Group
            x={asset.x}
            y={asset.y}
            rotation={asset.rotation}
            skewX={skewX}
            skewY={skewY}
            opacity={asset.opacity}
            listening
          >
            <Rect
              width={W}
              height={H}
              fill={failed ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.4)"}
              stroke={failed ? "#f87171" : "#64748b"}
              strokeWidth={1}
              dash={failed ? [] : [6, 4]}
            />
            <Shape
              width={W}
              height={H}
              listening
              sceneFunc={() => {}}
              hitFunc={(ctx, shape) => {
                ctx.beginPath();
                ctx.rect(0, 0, W, H);
                ctx.closePath();
                ctx.fillStrokeShape(shape);
              }}
              onClick={
                playPrinter.preferTapOnPrinter
                  ? undefined
                  : (e) => {
                      e.cancelBubble = true;
                      playPrinter.onPrinterTap(asset);
                    }
              }
              onTap={
                playPrinter.preferTapOnPrinter
                  ? (e) => {
                      e.cancelBubble = true;
                      playPrinter.onPrinterTap(asset);
                    }
                  : undefined
              }
            />
          </Group>
        );
      }
      return (
        <Group
          x={asset.x}
          y={asset.y}
          rotation={asset.rotation}
          skewX={skewX}
          skewY={skewY}
          opacity={asset.opacity}
          listening={false}
        >
          <Rect
            width={W}
            height={H}
            fill={failed ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.4)"}
            stroke={failed ? "#f87171" : "#64748b"}
            strokeWidth={1}
            dash={failed ? [] : [6, 4]}
          />
        </Group>
      );
    }
    return (
      <Group
        x={asset.x}
        y={asset.y}
        rotation={asset.rotation}
        skewX={skewX}
        skewY={skewY}
        opacity={asset.opacity}
        draggable={editMode && !asset.locked}
        listening={editMode}
        onMouseDown={() => {
          if (!editMode) return;
          onSelect(asset.id);
        }}
        onDragEnd={(e) => {
          const n = e.target;
          onAssetChange(asset.id, { x: n.x(), y: n.y() });
        }}
      >
        <Rect
          width={W}
          height={H}
          fill={failed ? "rgba(127,29,29,0.4)" : "rgba(15,23,42,0.5)"}
          stroke={failed ? "#f87171" : "#38bdf8"}
          strokeWidth={2}
          dash={failed ? [] : [8, 5]}
          listening={editMode}
          onMouseDown={(e) => {
            if (!editMode) return;
            e.cancelBubble = true;
            onSelect(asset.id);
          }}
        />
      </Group>
    );
  }

  const nw = Math.max(1, image.naturalWidth || image.width || 1);
  const nh = Math.max(1, image.naturalHeight || image.height || 1);

  const { sx, sy, sw, sh } = safeSourceRect(nw, nh, asset.crop);
  const u = uniformCoverLayout(nw, nh, W, H, sx, sy, sw, sh);

  if (!editMode) {
    if (playPrinter && isLayoutPrinterDecorAsset(asset)) {
      const showBar = playPrinter.warmingAssetId === asset.id;
      const barW = W * 0.86;
      const barH = Math.max(8, H * 0.045);
      const barX = (W - barW) / 2;
      const barY = H * 0.86;
      return (
        <Group
          x={asset.x}
          y={asset.y}
          rotation={asset.rotation}
          skewX={skewX}
          skewY={skewY}
          opacity={asset.opacity}
          listening
        >
          <Group clipX={0} clipY={0} clipWidth={W} clipHeight={H} listening={false}>
            <KonvaImage
              image={image}
              x={u.imgX}
              y={u.imgY}
              width={u.imgW}
              height={u.imgH}
              listening={false}
            />
          </Group>
          {showBar ? (
            <Group listening={false}>
              <Rect
                x={barX}
                y={barY}
                width={barW}
                height={barH}
                fill="rgba(15,23,42,0.82)"
                stroke="rgba(148,163,184,0.55)"
                strokeWidth={1}
                cornerRadius={5}
              />
              <Rect
                x={barX + 2}
                y={barY + 2}
                width={Math.max(0, (barW - 4) * playPrinter.warmingProgress01)}
                height={barH - 4}
                fill="#34d399"
                cornerRadius={4}
              />
            </Group>
          ) : null}
          <Shape
            width={W}
            height={H}
            listening
            sceneFunc={() => {}}
            hitFunc={(ctx, shape) => {
              ctx.beginPath();
              ctx.rect(0, 0, W, H);
              ctx.closePath();
              ctx.fillStrokeShape(shape);
            }}
            onClick={
              playPrinter.preferTapOnPrinter
                ? undefined
                : (e) => {
                    e.cancelBubble = true;
                    playPrinter.onPrinterTap(asset);
                  }
            }
            onTap={
              playPrinter.preferTapOnPrinter
                ? (e) => {
                    e.cancelBubble = true;
                    playPrinter.onPrinterTap(asset);
                  }
                : undefined
            }
          />
        </Group>
      );
    }
    return (
      <Group
        x={asset.x}
        y={asset.y}
        rotation={asset.rotation}
        skewX={skewX}
        skewY={skewY}
        opacity={asset.opacity}
        listening={false}
      >
        <Group clipX={0} clipY={0} clipWidth={W} clipHeight={H} listening={false}>
          <KonvaImage
            image={image}
            x={u.imgX}
            y={u.imgY}
            width={u.imgW}
            height={u.imgH}
            listening={false}
          />
        </Group>
      </Group>
    );
  }

  if (cropEditActive && editMode) {
    const innerId = cropInnerNodeId(asset.id);
    return (
      <Group
        x={asset.x}
        y={asset.y}
        rotation={asset.rotation}
        skewX={skewX}
        skewY={skewY}
        opacity={asset.opacity}
        draggable={editMode && !asset.locked}
        listening={editMode}
        onMouseDown={(e) => {
          if (!editMode) return;
          if (e.target === e.currentTarget) {
            e.cancelBubble = true;
            onSelect(asset.id);
          }
        }}
        onDragEnd={(e) => {
          const n = e.target;
          onAssetChange(asset.id, { x: n.x(), y: n.y() });
        }}
      >
        <Group clipX={0} clipY={0} clipWidth={W} clipHeight={H} listening={false}>
          <KonvaImage
            key={`${innerId}:${sx}:${sy}:${sw}:${sh}:${W}:${H}`}
            id={innerId}
            name="packing-crop-inner"
            image={image}
            x={u.imgX}
            y={u.imgY}
            width={u.imgW}
            height={u.imgH}
            listening={editMode}
            draggable={editMode && !asset.locked}
            onMouseDown={(e) => {
              if (!editMode) return;
              e.cancelBubble = true;
              onSelect(asset.id);
            }}
            onDragEnd={(e) => {
              const n = e.target as Konva.Image;
              const next = cropFromUniformInnerNode(n, nw, nh, W, H);
              const normalized = normalizeCropForSave(next, nw, nh);
              onAssetChange(asset.id, normalized === undefined ? { crop: undefined } : { crop: normalized });
            }}
            onTransformEnd={(e) => {
              const n = e.target as Konva.Image;
              const next = cropFromUniformInnerNode(n, nw, nh, W, H);
              const normalized = normalizeCropForSave(next, nw, nh);
              onAssetChange(asset.id, normalized === undefined ? { crop: undefined } : { crop: normalized });
            }}
          />
        </Group>
      </Group>
    );
  }

  /** Editor (không crop canvas): cùng pipeline với `/packing` — uniform cover + clip trong khung W×H. */
  const walkToAssetGroup = (start: Konva.Node | null): Konva.Group | null => {
    let n: Konva.Node | null = start;
    while (n) {
      if (n.id() === asset.id) return n as Konva.Group;
      n = n.getParent();
    }
    return null;
  };

  return (
    <Group
      id={asset.id}
      x={asset.x}
      y={asset.y}
      rotation={asset.rotation}
      skewX={skewX}
      skewY={skewY}
      opacity={asset.opacity}
      draggable={editMode && !asset.locked}
      listening={editMode}
      onDragEnd={(e) => {
        const n = walkToAssetGroup(e.target as Konva.Node);
        if (!n) return;
        onAssetChange(asset.id, { x: n.x(), y: n.y() });
      }}
      onTransformEnd={(e) => {
        const n = walkToAssetGroup(e.target as Konva.Node);
        if (!n) return;
        const scx = n.scaleX();
        const scy = n.scaleY();
        n.scaleX(1);
        n.scaleY(1);
        /** Group không có width/height layout — scale áp vào khung asset (W×H) như KonvaImage cũ. */
        onAssetChange(asset.id, {
          x: n.x(),
          y: n.y(),
          width: Math.max(8, asset.width * scx),
          height: Math.max(8, asset.height * scy),
          rotation: n.rotation(),
          tiltX: clampPackingTilt(Konva.Util.radToDeg(n.skewY())),
          tiltY: clampPackingTilt(Konva.Util.radToDeg(n.skewX())),
        });
      }}
    >
      <Group clipX={0} clipY={0} clipWidth={W} clipHeight={H} listening={false}>
        <KonvaImage
          image={image}
          x={u.imgX}
          y={u.imgY}
          width={u.imgW}
          height={u.imgH}
          listening={false}
        />
      </Group>
      <Shape
        width={W}
        height={H}
        listening
        sceneFunc={() => {}}
        hitFunc={(ctx, shape) => {
          ctx.beginPath();
          ctx.rect(0, 0, W, H);
          ctx.closePath();
          ctx.fillStrokeShape(shape);
        }}
        onMouseDown={(e) => {
          if (!editMode) return;
          onSelect(asset.id);
        }}
      />
    </Group>
  );
}

/** `/packing`: stack kho — tap nhẹ lấy đơn gần stack; chạm/chọn + kéo qua ngưỡng = đơn bám theo tay đến khi thả. */
function LayoutWarehouseLinkedStack({
  asset,
  remainingSingles,
  clientToLayout,
  onTapPick,
  onDragSpawnAt,
  onDragMoveSingle,
  onDragGestureEnd,
  onCarriedSinglePointerUp,
  onCarriedSinglePointerMove,
  onReady,
}: {
  asset: PackingLayoutAsset;
  remainingSingles: number;
  clientToLayout: (clientX: number, clientY: number) => { x: number; y: number } | null;
  onTapPick: () => void;
  onDragSpawnAt: (layoutX: number, layoutY: number) => string | null;
  onDragMoveSingle: (singleId: string, layoutX: number, layoutY: number) => void;
  onDragGestureEnd: () => void;
  /** Khi thả sau kéo từ stack (đã spawn đơn) — dùng tọa độ màn hình (vd. thùng rác). */
  onCarriedSinglePointerUp?: (singleId: string, clientX: number, clientY: number) => void;
  /** Khi đang kéo đơn spawn từ stack — tọa độ màn hình (hover thùng rác). */
  onCarriedSinglePointerMove?: (clientX: number, clientY: number) => void;
  onReady: () => void;
}) {
  const crossOrigin = /^https?:\/\//i.test(asset.src) ? "anonymous" : undefined;
  const [image, imageStatus] = useImage(asset.src, crossOrigin);
  const W = Math.max(1, asset.width);
  const H = Math.max(1, asset.height);
  const { skewX, skewY } = assetTiltSkew(asset);
  const inStock = remainingSingles > 0;
  const inStockRef = useRef(inStock);
  inStockRef.current = inStock;

  const packRef = useRef({
    clientToLayout,
    onTapPick,
    onDragSpawnAt,
    onDragMoveSingle,
    onDragGestureEnd,
    onCarriedSinglePointerUp,
    onCarriedSinglePointerMove,
  });
  packRef.current = {
    clientToLayout,
    onTapPick,
    onDragSpawnAt,
    onDragMoveSingle,
    onDragGestureEnd,
    onCarriedSinglePointerUp,
    onCarriedSinglePointerMove,
  };

  useEffect(() => {
    if (image) onReady();
  }, [image, onReady]);

  useEffect(() => {
    if (imageStatus === "failed") {
      console.warn("[packing] Không tải được ảnh stack layout:", asset.src);
    }
  }, [imageStatus, asset.src]);

  const onPointerDownHit = useCallback(
    (e: Konva.KonvaEventObject<PointerEvent>) => {
      e.cancelBubble = true;
      const pe = e.evt;
      const stage = e.target.getStage();
      const container = stage?.container();
      if (pe.pointerId == null) return;

      type G = {
        pointerId: number;
        startClientX: number;
        startClientY: number;
        dragCommitted: boolean;
        singleId: string | null;
      };
      const gesture: G = {
        pointerId: pe.pointerId,
        startClientX: pe.clientX,
        startClientY: pe.clientY,
        dragCommitted: false,
        singleId: null,
      };

      const onMove = (ev: PointerEvent) => {
        if (ev.pointerId !== gesture.pointerId) return;
        const d = Math.hypot(ev.clientX - gesture.startClientX, ev.clientY - gesture.startClientY);
        const p = packRef.current.clientToLayout(ev.clientX, ev.clientY);
        if (!p) return;
        let justSpawned = false;
        if (!gesture.dragCommitted && d > PACKING_WAREHOUSE_PICK_DRAG_PX) {
          gesture.dragCommitted = true;
          if (inStockRef.current) {
            gesture.singleId = packRef.current.onDragSpawnAt(p.x, p.y);
            justSpawned = Boolean(gesture.singleId);
          }
        }
        if (gesture.dragCommitted && gesture.singleId && !justSpawned) {
          packRef.current.onDragMoveSingle(gesture.singleId, p.x, p.y);
        }
        if (gesture.dragCommitted && gesture.singleId) {
          packRef.current.onCarriedSinglePointerMove?.(ev.clientX, ev.clientY);
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== gesture.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        try {
          container?.releasePointerCapture(gesture.pointerId);
        } catch {
          /* ignore */
        }
        if (!gesture.dragCommitted) {
          packRef.current.onTapPick();
        } else if (gesture.singleId) {
          packRef.current.onCarriedSinglePointerUp?.(gesture.singleId, ev.clientX, ev.clientY);
        }
        packRef.current.onDragGestureEnd();
      };

      try {
        container?.setPointerCapture(pe.pointerId);
      } catch {
        /* ignore: iframe / unsupported */
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [asset.id],
  );

  const hitShape = (
    <Shape
      width={W}
      height={H}
      listening
      sceneFunc={() => {}}
      hitFunc={(ctx, shape) => {
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.closePath();
        ctx.fillStrokeShape(shape);
      }}
      onPointerDown={onPointerDownHit}
    />
  );

  if (!image) {
    const failed = imageStatus === "failed";
    return (
      <Group
        id={asset.id}
        x={asset.x}
        y={asset.y}
        rotation={asset.rotation}
        skewX={skewX}
        skewY={skewY}
        opacity={asset.opacity}
        listening
      >
        <Rect
          width={W}
          height={H}
          fill={failed ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.4)"}
          stroke={failed ? "#f87171" : inStock ? "rgba(45,212,191,0.35)" : "#64748b"}
          strokeWidth={1}
          listening={false}
        />
        {hitShape}
      </Group>
    );
  }

  const nw = Math.max(1, image.naturalWidth || image.width || 1);
  const nh = Math.max(1, image.naturalHeight || image.height || 1);
  const { sx, sy, sw, sh } = safeSourceRect(nw, nh, asset.crop);
  const u = uniformCoverLayout(nw, nh, W, H, sx, sy, sw, sh);

  return (
    <Group
      id={asset.id}
      x={asset.x}
      y={asset.y}
      rotation={asset.rotation}
      skewX={skewX}
      skewY={skewY}
      opacity={asset.opacity * (inStock ? 1 : 0.52)}
      listening
    >
      <KonvaImage
        image={image}
        x={u.imgX}
        y={u.imgY}
        width={u.imgW}
        height={u.imgH}
        listening={false}
        shadowBlur={inStock ? 26 : 0}
        shadowColor="#22d3ee"
        shadowOpacity={inStock ? 0.62 : 0}
        shadowOffsetX={0}
        shadowOffsetY={0}
      />
      {!inStock ? <Rect width={W} height={H} fill="rgba(71,85,105,0.48)" listening={false} /> : null}
      {hitShape}
    </Group>
  );
}

function UserTableStackNode({
  stack,
  listening,
  draggable,
  onStackDragEnd,
  onStackTakeOne,
  onReady,
}: {
  stack: PackingTableStack;
  listening: boolean;
  draggable: boolean;
  onStackDragEnd?: (id: string, x: number, y: number) => void;
  /** Tap / click một lần (không kéo quá dragDistance) — mobile-first, không dùng double-click. */
  onStackTakeOne?: (id: string) => void;
  onReady: () => void;
}) {
  const crossOrigin = /^https?:\/\//i.test(stack.stackSrc) ? "anonymous" : undefined;
  const [image, imageStatus] = useImage(stack.stackSrc, crossOrigin);

  useEffect(() => {
    if (image) onReady();
  }, [image, onReady]);

  useEffect(() => {
    if (imageStatus === "failed") {
      console.warn("[packing] Không tải được ảnh stack:", stack.stackSrc);
    }
  }, [imageStatus, stack.stackSrc]);

  const lastTapRef = useRef<{ stackId: string; at: number }>({ stackId: "", at: 0 });

  const takeOneFromTap = useCallback(
    (e: Konva.KonvaEventObject<MouseEvent | TouchEvent>) => {
      if (!listening || stack.quantity <= 0 || !onStackTakeOne) return;
      const now = Date.now();
      if (lastTapRef.current.stackId === stack.id && now - lastTapRef.current.at < 450) return;
      lastTapRef.current = { stackId: stack.id, at: now };
      e.cancelBubble = true;
      onStackTakeOne(stack.id);
    },
    [listening, stack.quantity, stack.id, onStackTakeOne],
  );

  return (
    <Group
      id={stack.id}
      x={stack.x}
      y={stack.y}
      rotation={stack.rotation}
      listening={listening}
      draggable={draggable && listening}
      dragDistance={8}
      onDragEnd={(e) => {
        if (!onStackDragEnd) return;
        let n: Konva.Node | null = e.target as Konva.Node;
        while (n) {
          if (n.id() === stack.id) {
            onStackDragEnd(stack.id, n.x(), n.y());
            return;
          }
          n = n.getParent();
        }
      }}
    >
      {image ? (
        <KonvaImage
          image={image}
          width={stack.width}
          height={stack.height}
          listening={false}
        />
      ) : (
        <Rect
          width={stack.width}
          height={stack.height}
          fill={imageStatus === "failed" ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.45)"}
          stroke="#64748b"
          strokeWidth={1}
          listening={false}
        />
      )}
      <Group listening={false}>
        <Rect
          x={stack.width - 52}
          y={6}
          width={46}
          height={22}
          cornerRadius={5}
          fill="rgba(0,0,0,0.72)"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={1}
        />
        <Text
          x={stack.width - 50}
          y={9}
          width={42}
          text={`${stack.quantity}/${stack.maxQuantity}`}
          fontSize={11}
          fontStyle="bold"
          fill="#f4f4f5"
          align="center"
        />
      </Group>
      {/* Vùng bấm toàn khung: ảnh con + Group draggable khiến onTap trên Image thường không chạy; lớp này nhận tap/click (alpha cực nhỏ, gần như không thấy). */}
      <Rect
        name="packing-stack-hit"
        width={stack.width}
        height={stack.height}
        fill="rgba(0,0,0,0.004)"
        listening={listening}
        onTap={takeOneFromTap}
        onClick={takeOneFromTap}
      />
    </Group>
  );
}

function UserPlacedLayerImage({
  item,
  interactive,
  onDragEnd,
  onDragMoveScreen,
  onDragMoveLayout,
  onSingleItemTap,
  onReady,
}: {
  item: PackingTableSingleItem;
  interactive: boolean;
  onDragEnd: (id: string, x: number, y: number, clientX?: number, clientY?: number) => void;
  /** Trong lúc kéo đơn trên bàn — tọa độ màn hình (hover thùng rác / vùng hoàn đơn). */
  onDragMoveScreen?: (id: string, clientX: number, clientY: number) => void;
  /** Trong lúc kéo — tọa độ layout (px) của node; không thay merge/thùng rác (chỉ sync vị trí hiển thị). */
  onDragMoveLayout?: (id: string, layoutX: number, layoutY: number) => void;
  /** Tap nhẹ hộp giấy: chuyển bước gấp / đóng (không xung đột kéo nhờ `dragDistance`). */
  onSingleItemTap?: (id: string) => void;
  onReady: () => void;
}) {
  const crossOrigin = /^https?:\/\//i.test(item.src) ? "anonymous" : undefined;
  const [image, imageStatus] = useImage(item.src, crossOrigin);

  const isPaperBox = isPaperBoxWorkflowItem(item.groupId);
  const isSilverBag = isSilverBagTableItem(item.groupId);
  const silverFill = silverPacketFilledCount(item.silverPacketContents);
  const silverLabel = `${silverFill}/3`;
  const silverLabelColor = silverFill >= 3 ? "#22c55e" : "#ef4444";
  const paperBoxDragProps =
    isPaperBox && interactive ? { dragDistance: 14 } : {};

  /** `draggable` + `dragDistance` khiến `onTap`/`onClick` thường không chạy; dùng pointer + cờ sau `onDragStart`. */
  const paperGestureRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    dragged: boolean;
  } | null>(null);

  const onPaperPointerDown =
    isPaperBox && interactive && onSingleItemTap
      ? (e: Konva.KonvaEventObject<PointerEvent>) => {
          const p = e.evt;
          paperGestureRef.current = {
            pointerId: p.pointerId,
            startX: p.clientX,
            startY: p.clientY,
            dragged: false,
          };
        }
      : undefined;

  const onPaperDragStart =
    isPaperBox && interactive && onSingleItemTap
      ? () => {
          const g = paperGestureRef.current;
          if (g) g.dragged = true;
        }
      : undefined;

  const onPaperPointerUp =
    isPaperBox && interactive && onSingleItemTap
      ? (e: Konva.KonvaEventObject<PointerEvent>) => {
          const g = paperGestureRef.current;
          if (!g) return;
          const p = e.evt;
          if (p.pointerId !== g.pointerId) return;
          paperGestureRef.current = null;
          if (g.dragged) return;
          const d = Math.hypot(p.clientX - g.startX, p.clientY - g.startY);
          if (d > 12) return;
          onSingleItemTap(item.id);
        }
      : undefined;

  const onPaperPointerCancel =
    isPaperBox && interactive && onSingleItemTap
      ? () => {
          paperGestureRef.current = null;
        }
      : undefined;

  useEffect(() => {
    if (image) onReady();
  }, [image, onReady]);

  useEffect(() => {
    if (imageStatus === "failed") {
      console.warn("[packing] Không tải được ảnh vật phẩm kho:", item.src);
    }
  }, [imageStatus, item.src]);

  const onDragEndInner = (e: Konva.KonvaEventObject<DragEvent>) => {
    const n = e.target;
    const c = pointerClientXY(e.evt);
    onDragEnd(item.id, n.x(), n.y(), c?.x, c?.y);
  };

  const onDragMoveInner =
    interactive && (onDragMoveScreen || onDragMoveLayout)
      ? (e: Konva.KonvaEventObject<DragEvent>) => {
          const n = e.target;
          if (onDragMoveLayout) {
            onDragMoveLayout(item.id, n.x(), n.y());
          }
          if (onDragMoveScreen) {
            const c = pointerClientXY(e.evt);
            if (c) onDragMoveScreen(item.id, c.x, c.y);
          }
        }
      : undefined;

  if (!image) {
    const failed = imageStatus === "failed";
    return (
      <Group
        id={item.id}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable={interactive}
        listening={interactive}
        {...paperBoxDragProps}
        onPointerDown={onPaperPointerDown}
        onPointerUp={onPaperPointerUp}
        onPointerCancel={onPaperPointerCancel}
        onDragStart={onPaperDragStart}
        onDragMove={onDragMoveInner}
        onDragEnd={interactive ? onDragEndInner : undefined}
      >
        <Rect
          width={item.width}
          height={item.height}
          fill={failed ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.45)"}
          stroke={failed ? "#f87171" : "#64748b"}
          strokeWidth={1}
          dash={failed ? [] : [6, 4]}
          listening={interactive}
          {...(isPaperBox && interactive && onSingleItemTap
            ? {
                onPointerDown: onPaperPointerDown,
                onPointerUp: onPaperPointerUp,
                onPointerCancel: onPaperPointerCancel,
              }
            : {})}
        />
        {isSilverBag ? (
          <Text
            x={0}
            y={item.height + 6}
            width={item.width}
            text={silverLabel}
            fontSize={11}
            fontStyle="bold"
            fill={silverLabelColor}
            align="center"
            listening={false}
          />
        ) : null}
      </Group>
    );
  }

  if (isSilverBag) {
    return (
      <Group
        id={item.id}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable={interactive}
        listening={interactive}
        onDragMove={onDragMoveInner}
        onDragEnd={interactive ? onDragEndInner : undefined}
      >
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={item.width}
          height={item.height}
          opacity={1}
          listening={interactive}
        />
        <Text
          x={0}
          y={item.height + 6}
          width={item.width}
          text={silverLabel}
          fontSize={11}
          fontStyle="bold"
          fill={silverLabelColor}
          align="center"
          listening={interactive}
        />
      </Group>
    );
  }

  const sealedCaption =
    item.groupId === "silver_sealed_bag" &&
    item.silverPacketContents &&
    silverPacketFilledCount(item.silverPacketContents) > 0
      ? formatSealedSilverPacketCaption(item.silverPacketContents)
      : null;

  if (image && sealedCaption) {
    return (
      <Group
        id={item.id}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable={interactive}
        listening={interactive}
        onDragMove={onDragMoveInner}
        onDragEnd={interactive ? onDragEndInner : undefined}
      >
        <KonvaImage
          image={image}
          x={0}
          y={0}
          width={item.width}
          height={item.height}
          opacity={1}
          listening={interactive}
        />
        <Text
          x={0}
          y={item.height + 4}
          width={item.width}
          text={sealedCaption}
          fontSize={9}
          fill="#94a3b8"
          align="center"
          listening={interactive}
          lineHeight={1.15}
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={item.id}
      image={image}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      opacity={1}
      draggable={interactive}
      listening={interactive}
      {...paperBoxDragProps}
      onPointerDown={onPaperPointerDown}
      onPointerUp={onPaperPointerUp}
      onPointerCancel={onPaperPointerCancel}
      onDragStart={onPaperDragStart}
      onDragMove={onDragMoveInner}
      onDragEnd={interactive ? onDragEndInner : undefined}
    />
  );
}

const KEYRAMBIT_IMAGE_FALLBACK =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";

function UserPlacedKeyrambitImage({
  item,
  interactive,
  onDragEnd,
  onDragMoveScreen,
  onReady,
}: {
  item: PackingTableKeyrambitItem;
  interactive: boolean;
  onDragEnd: (id: string, x: number, y: number, clientX?: number, clientY?: number) => void;
  onDragMoveScreen?: (id: string, clientX: number, clientY: number) => void;
  onReady: () => void;
}) {
  const src = item.imageSrc?.trim() ? item.imageSrc : KEYRAMBIT_IMAGE_FALLBACK;
  const crossOrigin = /^https?:\/\//i.test(src) ? "anonymous" : undefined;
  const [image, imageStatus] = useImage(src, crossOrigin);

  useEffect(() => {
    if (image) onReady();
  }, [image, onReady]);

  const onDragEndInner = (e: Konva.KonvaEventObject<DragEvent>) => {
    const n = e.target;
    const c = pointerClientXY(e.evt);
    onDragEnd(item.id, n.x(), n.y(), c?.x, c?.y);
  };

  const onDragMoveInner =
    interactive && onDragMoveScreen
      ? (e: Konva.KonvaEventObject<DragEvent>) => {
          const c = pointerClientXY(e.evt);
          if (c) onDragMoveScreen(item.id, c.x, c.y);
        }
      : undefined;

  if (!image) {
    const failed = imageStatus === "failed";
    return (
      <Group
        id={item.id}
        x={item.x}
        y={item.y}
        rotation={item.rotation}
        draggable={interactive}
        listening={interactive}
        onDragMove={onDragMoveInner}
        onDragEnd={interactive ? onDragEndInner : undefined}
      >
        <Rect
          width={item.width}
          height={item.height}
          fill={failed ? "rgba(127,29,29,0.45)" : "rgba(15,23,42,0.45)"}
          stroke={failed ? "#f87171" : "#64748b"}
          strokeWidth={1}
          dash={failed ? [] : [6, 4]}
        />
      </Group>
    );
  }

  return (
    <KonvaImage
      id={item.id}
      image={image}
      x={item.x}
      y={item.y}
      width={item.width}
      height={item.height}
      rotation={item.rotation}
      opacity={1}
      draggable={interactive}
      listening={interactive}
      onDragMove={onDragMoveInner}
      onDragEnd={interactive ? onDragEndInner : undefined}
    />
  );
}

export type PackingKonvaStageProps = {
  layout: PackingLayout;
  editMode: boolean;
  containerWidth: number;
  containerHeight: number;
  selectedId: string | null;
  /** When set (and editMode), that asset uses interactive crop: drag image = pan crop, handles = zoom crop. */
  cropEditAssetId: string | null;
  onSelectId: (id: string | null) => void;
  onAssetChange: (id: string, patch: Partial<PackingLayoutAsset>) => void;
  /** Chế độ chơi: máy in layout (tap + thanh in ~3s). */
  playPrinter?: {
    warmingAssetId: string | null;
    warmingProgress01: number;
    onPrinterTap: (asset: PackingLayoutAsset) => void;
    /** Mobile: dùng `onTap` thay `onClick` để chạm nhận trên Konva. */
    preferTapOnPrinter?: boolean;
  } | null;
  /** Stack đặt từ kho (legacy / tuỳ chọn). */
  tableStacks?: PackingTableStack[];
  onTableStackMove?: (stackId: string, x: number, y: number) => void;
  onTableStackTakeOne?: (stackId: string) => void;
  /** Sản phẩm đơn trên bàn (kéo được khi `editMode` tắt). */
  singleItems?: PackingTableSingleItem[];
  /** `clientX`/`clientY` có khi kết thúc kéo Konva (dùng cho vùng thả thùng rác). */
  onSingleItemMove?: (id: string, x: number, y: number, clientX?: number, clientY?: number) => void;
  /** Thả ngón sau kéo đơn từ stack layout (pointer capture) — tọa độ màn hình. */
  onWarehouseCarriedSinglePointerUp?: (singleId: string, clientX: number, clientY: number) => void;
  /** Kéo đơn spawn từ stack — tọa độ màn hình (hover thùng rác). */
  onWarehouseCarriedSinglePointerMove?: (clientX: number, clientY: number) => void;
  /** Kéo đơn trên bàn (Konva) — tọa độ màn hình (hover thùng rác / vùng hoàn đơn). */
  onSingleItemDragMoveScreen?: (id: string, clientX: number, clientY: number) => void;
  /** Kéo đơn trên bàn — tọa độ layout (px) theo thời gian thực (niêm phong máy sấy, không commit merge). */
  onSingleItemDragMoveLayout?: (id: string, layoutX: number, layoutY: number) => void;
  /** Tap hộp giấy đơn: gấp / đóng theo `paperBoxStage`. */
  onSingleItemTap?: (id: string) => void;
  /** Tồn sản phẩm đơn theo `groupId` khi asset có `packingWarehouseGroupId`. */
  warehouseSinglesRemaining?: Record<string, number>;
  /** Tap stack layout đã gắn nhóm kho (cha kiểm tra tồn / spawn đơn / báo hết). `groupId` = field JSON hoặc suy từ `stackSrc`. */
  onLayoutWarehouseStackTap?: (asset: PackingLayoutAsset, groupId: string) => void;
  /** Kéo từ stack: spawn đơn tại điểm layout (tâm theo con trỏ), trả về `id` hoặc `null` nếu hết. */
  onLayoutWarehouseDragSpawnAt?: (
    asset: PackingLayoutAsset,
    groupId: string,
    layoutX: number,
    layoutY: number,
  ) => string | null;
  onLayoutWarehouseDragMoveSingle?: (singleId: string, layoutX: number, layoutY: number) => void;
  onLayoutWarehousePickGestureEnd?: () => void;
  /** Đơn đang được kéo từ stack (pointer capture) — tắt drag Konva của item đó. */
  warehouseCarryingSingleId?: string | null;
  /** Keyrambit từ kho thật trên bàn. */
  keyrambitItems?: PackingTableKeyrambitItem[];
  onKeyrambitItemMove?: (id: string, x: number, y: number, clientX?: number, clientY?: number) => void;
};

export function PackingKonvaStage({
  layout,
  editMode,
  containerWidth,
  containerHeight,
  selectedId,
  cropEditAssetId,
  onSelectId,
  onAssetChange,
  playPrinter,
  tableStacks,
  onTableStackMove,
  onTableStackTakeOne,
  singleItems,
  onSingleItemMove,
  warehouseSinglesRemaining,
  onLayoutWarehouseStackTap,
  onLayoutWarehouseDragSpawnAt,
  onLayoutWarehouseDragMoveSingle,
  onLayoutWarehousePickGestureEnd,
  onWarehouseCarriedSinglePointerUp,
  onWarehouseCarriedSinglePointerMove,
  onSingleItemDragMoveScreen,
  onSingleItemDragMoveLayout,
  onSingleItemTap,
  warehouseCarryingSingleId,
  keyrambitItems,
  onKeyrambitItemMove,
}: PackingKonvaStageProps) {
  const layerRef = useRef<Konva.Layer>(null);
  const trRef = useRef<Konva.Transformer>(null);
  const [drawTick, setDrawTick] = useState(0);
  const bumpDraw = useCallback(() => setDrawTick((t) => t + 1), []);

  const sorted = useMemo(() => sortAssetsByZIndex(layout.assets), [layout.assets]);

  const combinedPaintList = useMemo(() => {
    type Entry =
      | { kind: "layoutStack"; paintZ: number; ord: number; key: string; asset: PackingLayoutAsset; gid: string }
      | { kind: "layoutImg"; paintZ: number; ord: number; key: string; asset: PackingLayoutAsset }
      | { kind: "stack"; paintZ: number; ord: number; key: string; stack: PackingTableStack }
      | { kind: "single"; paintZ: number; ord: number; key: string; single: PackingTableSingleItem }
      | { kind: "keyrambit"; paintZ: number; ord: number; key: string; kb: PackingTableKeyrambitItem };

    const out: Entry[] = [];
    let ord = 0;
    for (const asset of sorted) {
      const resolvedGid = resolveLayoutWarehouseGroupId(asset);
      if (
        !editMode &&
        resolvedGid &&
        onLayoutWarehouseStackTap &&
        onLayoutWarehouseDragSpawnAt &&
        onLayoutWarehouseDragMoveSingle &&
        onLayoutWarehousePickGestureEnd
      ) {
        out.push({
          kind: "layoutStack",
          paintZ: layoutPrinterPaintZIndex(asset),
          ord: ord++,
          key: `lw-${asset.id}`,
          asset,
          gid: resolvedGid,
        });
      } else {
        out.push({
          kind: "layoutImg",
          paintZ: layoutPrinterPaintZIndex(asset),
          ord: ord++,
          key: `li-${asset.id}`,
          asset,
        });
      }
    }
    for (const s of tableStacks ?? []) {
      if (s.quantity <= 0) continue;
      out.push({ kind: "stack", paintZ: s.zIndex, ord: ord++, key: s.id, stack: s });
    }
    for (const s of singleItems ?? []) {
      const paintZ = isOrderShipLabelSingle(s) ? Math.max(s.zIndex, PACKING_ORDER_LABEL_DISPLAY_Z) : s.zIndex;
      out.push({ kind: "single", paintZ, ord: ord++, key: s.id, single: s });
    }
    for (const k of keyrambitItems ?? []) {
      out.push({ kind: "keyrambit", paintZ: k.zIndex, ord: ord++, key: k.id, kb: k });
    }
    out.sort((a, b) => (a.paintZ !== b.paintZ ? a.paintZ - b.paintZ : a.ord - b.ord));
    return out;
  }, [
    sorted,
    editMode,
    tableStacks,
    singleItems,
    keyrambitItems,
    onLayoutWarehouseStackTap,
    onLayoutWarehouseDragSpawnAt,
    onLayoutWarehouseDragMoveSingle,
    onLayoutWarehousePickGestureEnd,
  ]);

  const singlesDraggable = !editMode && Boolean(onSingleItemMove);
  const keyrambitsDraggable = !editMode && Boolean(onKeyrambitItemMove);
  const stacksListening = !editMode && Boolean(onTableStackMove || onTableStackTakeOne);
  const stacksDraggable = !editMode && Boolean(onTableStackMove);

  const { scale, ox, oy } = useMemo(() => {
    const sw = layout.stage.width;
    const sh = layout.stage.height;
    if (containerWidth <= 0 || containerHeight <= 0 || sw <= 0 || sh <= 0) {
      return { scale: 1, ox: 0, oy: 0 };
    }
    const scale = Math.min(containerWidth / sw, containerHeight / sh);
    const ox = (containerWidth - sw * scale) / 2;
    const oy = (containerHeight - sh * scale) / 2;
    return { scale, ox, oy };
  }, [layout.stage.width, layout.stage.height, containerWidth, containerHeight]);

  const clientToLayout = useCallback(
    (clientX: number, clientY: number) => {
      const stage = layerRef.current?.getStage();
      const el = stage?.container();
      if (!el || !Number.isFinite(scale) || scale === 0) return null;
      const rect = el.getBoundingClientRect();
      const x = (clientX - rect.left - ox) / scale;
      const y = (clientY - rect.top - oy) / scale;
      return { x, y };
    },
    [ox, oy, scale],
  );

  const attachTransformer = useCallback(() => {
    const tr = trRef.current;
    const layer = layerRef.current;
    if (!editMode || !tr || !layer) {
      tr?.nodes([]);
      layer?.batchDraw();
      return;
    }
    if (!selectedId) {
      tr.nodes([]);
      layer.batchDraw();
      return;
    }
    const asset = layout.assets.find((a) => a.id === selectedId);
    if (!asset || asset.locked) {
      tr.nodes([]);
      layer.batchDraw();
      return;
    }

    const useCropInner = cropEditAssetId === selectedId;
    const targetId = useCropInner ? cropInnerNodeId(selectedId) : selectedId;
    const stage = layer.getStage();
    const node =
      (stage?.findOne((n: Konva.Node) => n.id() === targetId) as Konva.Node | undefined) ??
      layer.findOne((n: Konva.Node) => n.id() === targetId);
    if (!node) {
      tr.nodes([]);
      layer.batchDraw();
      return;
    }
    tr.nodes([node]);
    tr.getLayer()?.batchDraw();
  }, [editMode, selectedId, cropEditAssetId, layout.assets]);

  useLayoutEffect(() => {
    attachTransformer();
  }, [attachTransformer, sorted, combinedPaintList, drawTick]);

  useEffect(() => {
    if (!cropEditAssetId || !selectedId) return;
    const id = requestAnimationFrame(() => {
      setDrawTick((t) => t + 1);
    });
    return () => cancelAnimationFrame(id);
  }, [cropEditAssetId, selectedId]);

  if (containerWidth <= 0 || containerHeight <= 0) {
    return <div className="h-full w-full bg-[#05070c]" />;
  }

  return (
    <Stage
      width={containerWidth}
      height={containerHeight}
      className="touch-none bg-[#05070c]"
      onMouseDown={(e) => {
        if (!editMode) return;
        if (e.target === e.target.getStage()) onSelectId(null);
      }}
    >
      <Layer ref={layerRef}>
        <Group x={ox} y={oy} scaleX={scale} scaleY={scale}>
          {combinedPaintList.map((entry) => {
            if (entry.kind === "layoutStack") {
              const remaining = warehouseSinglesRemaining?.[entry.gid] ?? 0;
              return (
                <LayoutWarehouseLinkedStack
                  key={entry.key}
                  asset={entry.asset}
                  remainingSingles={remaining}
                  clientToLayout={clientToLayout}
                  onTapPick={() => onLayoutWarehouseStackTap!(entry.asset, entry.gid)}
                  onDragSpawnAt={(lx, ly) => onLayoutWarehouseDragSpawnAt!(entry.asset, entry.gid, lx, ly)}
                  onDragMoveSingle={onLayoutWarehouseDragMoveSingle!}
                  onDragGestureEnd={onLayoutWarehousePickGestureEnd!}
                  onCarriedSinglePointerUp={onWarehouseCarriedSinglePointerUp}
                  onCarriedSinglePointerMove={onWarehouseCarriedSinglePointerMove}
                  onReady={bumpDraw}
                />
              );
            }
            if (entry.kind === "layoutImg") {
              return (
                <LayoutImage
                  key={entry.key}
                  asset={entry.asset}
                  editMode={editMode}
                  cropEditActive={cropEditAssetId === entry.asset.id}
                  onSelect={onSelectId}
                  onAssetChange={onAssetChange}
                  onReady={bumpDraw}
                  playPrinter={!editMode ? playPrinter : undefined}
                />
              );
            }
            if (entry.kind === "stack") {
              return (
                <UserTableStackNode
                  key={entry.key}
                  stack={entry.stack}
                  listening={stacksListening}
                  draggable={stacksDraggable}
                  onStackDragEnd={onTableStackMove}
                  onStackTakeOne={onTableStackTakeOne}
                  onReady={bumpDraw}
                />
              );
            }
            if (entry.kind === "keyrambit") {
              return (
                <UserPlacedKeyrambitImage
                  key={entry.key}
                  item={entry.kb}
                  interactive={keyrambitsDraggable}
                  onDragEnd={(id, x, y, cx, cy) => onKeyrambitItemMove?.(id, x, y, cx, cy)}
                  onDragMoveScreen={onSingleItemDragMoveScreen}
                  onReady={bumpDraw}
                />
              );
            }
            return (
              <UserPlacedLayerImage
                key={entry.key}
                item={entry.single}
                interactive={
                  singlesDraggable &&
                  !(warehouseCarryingSingleId != null && entry.single.id === warehouseCarryingSingleId)
                }
                onDragEnd={(id, x, y, cx, cy) => onSingleItemMove?.(id, x, y, cx, cy)}
                onDragMoveScreen={onSingleItemDragMoveScreen}
                onDragMoveLayout={onSingleItemDragMoveLayout}
                onSingleItemTap={onSingleItemTap}
                onReady={bumpDraw}
              />
            );
          })}
          {editMode ? (
            <Transformer
              ref={trRef}
              rotateEnabled={!(selectedId && cropEditAssetId === selectedId)}
              keepRatio
              shiftBehavior={selectedId && cropEditAssetId === selectedId ? "none" : "default"}
              borderEnabled
              anchorStroke="#22d3ee"
              anchorFill="#0a0f1d"
              borderStroke="#67e8f9"
              boundBoxFunc={(oldBox, newBox) => {
                if (newBox.width < 12 || newBox.height < 12) return oldBox;
                return newBox;
              }}
            />
          ) : null}
        </Group>
      </Layer>
    </Stage>
  );
}
