"use client";

import Image from "next/image";
import { useCallback, useRef } from "react";
import type { PlayerKeyrambitInventoryItem } from "@/lib/packing-orders-types";

export type KeyrambitWarehouseRowVm = PlayerKeyrambitInventoryItem & {
  canDrag: boolean;
  displaySrc: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  rows: KeyrambitWarehouseRowVm[];
  /** Kéo đủ xa rồi thả — tọa độ màn hình (parent quyết có trúng bàn hay không). Chế độ `drag`. */
  onDragEndPlace: (row: PlayerKeyrambitInventoryItem, displaySrc: string, clientX: number, clientY: number) => void;
  /** `drag` (desktop): kéo từ ảnh. `tap-center` (mobile): chọn dòng = đặt giữa bàn. */
  placementMode?: "drag" | "tap-center";
  /** Bắt buộc khi `placementMode === "tap-center"`. */
  onTapPlaceCenter?: (row: PlayerKeyrambitInventoryItem, displaySrc: string) => void;
};

const DRAG_THRESHOLD_PX = 12;

export function PackingKeyrambitWarehouseDrawer({
  open,
  onClose,
  rows,
  onDragEndPlace,
  placementMode = "drag",
  onTapPlaceCenter,
}: Props) {
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    row: PlayerKeyrambitInventoryItem;
    displaySrc: string;
    moved: boolean;
  } | null>(null);

  const endDrag = useCallback(() => {
    dragRef.current = null;
  }, []);

  const onPointerDownRow = useCallback(
    (e: React.PointerEvent, row: KeyrambitWarehouseRowVm) => {
      if (!row.canDrag) return;
      e.preventDefault();
      dragRef.current = {
        pointerId: e.pointerId,
        startX: e.clientX,
        startY: e.clientY,
        row: {
          keyrambitId: row.keyrambitId,
          name: row.name,
          imageSrc: row.imageSrc,
          quantity: row.quantity,
          rarity: row.rarity,
          series: row.series,
        },
        displaySrc: row.displaySrc,
        moved: false,
      };

      const onMove = (ev: PointerEvent) => {
        const g = dragRef.current;
        if (!g || ev.pointerId !== g.pointerId) return;
        if (Math.hypot(ev.clientX - g.startX, ev.clientY - g.startY) > DRAG_THRESHOLD_PX) {
          g.moved = true;
        }
      };

      const onUp = (ev: PointerEvent) => {
        if (ev.pointerId !== dragRef.current?.pointerId) return;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        window.removeEventListener("pointercancel", onUp);
        const g = dragRef.current;
        dragRef.current = null;
        if (!g || !g.moved) return;
        onDragEndPlace(g.row, g.displaySrc, ev.clientX, ev.clientY);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
      window.addEventListener("pointercancel", onUp);
    },
    [onDragEndPlace],
  );

  if (!open) return null;

  const tapMode = placementMode === "tap-center" && typeof onTapPlaceCenter === "function";

  return (
    <>
      <button
        type="button"
        aria-label="Đóng kho Keyrambit"
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[min(88vh,32rem)] flex flex-col rounded-t-2xl border border-zinc-700 border-b-0 bg-[#0a0c12] shadow-2xl shadow-black/60 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:left-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:rounded-2xl sm:border-b"
        role="dialog"
        aria-labelledby="kr-warehouse-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="kr-warehouse-title" className="text-sm font-semibold text-zinc-100">
            Kho Keyrambit
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
            aria-label="Đóng"
          >
            <span className="text-lg leading-none">×</span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          <p className="mb-3 text-[11px] leading-relaxed text-zinc-500">
            {tapMode ? (
              <>
                Chạm dòng sản phẩm để đặt <span className="text-zinc-400">giữa bàn</span> (kéo trên bàn sau đó). Kho đồng
                bộ với kho Keyrambit; chỉ trừ khi bấm <span className="text-zinc-400">Hoàn thành đóng hàng</span> trong
                đơn.
              </>
            ) : (
              <>
                Kéo sản phẩm ra bàn đóng hàng (kéo đủ xa rồi thả trên vùng bàn). Kho đồng bộ với kho Keyrambit của bạn;
                chỉ trừ khi bấm <span className="text-zinc-400">Hoàn thành đóng hàng</span> trong đơn.
              </>
            )}
          </p>
          <ul className="space-y-2">
            {rows.map((row) =>
              tapMode ? (
                <li key={row.keyrambitId}>
                  <button
                    type="button"
                    disabled={!row.canDrag}
                    onClick={() => {
                      if (!row.canDrag || !onTapPlaceCenter) return;
                      onTapPlaceCenter(
                        {
                          keyrambitId: row.keyrambitId,
                          name: row.name,
                          imageSrc: row.imageSrc,
                          quantity: row.quantity,
                          rarity: row.rarity,
                          series: row.series,
                        },
                        row.displaySrc,
                      );
                    }}
                    className={[
                      "flex w-full items-center gap-3 rounded-xl border px-2.5 py-2 text-left transition active:scale-[0.99]",
                      row.canDrag
                        ? "border-violet-500/40 bg-zinc-900/55 touch-manipulation hover:border-violet-400/55"
                        : "cursor-not-allowed border-zinc-800/90 bg-zinc-950/50 opacity-70",
                    ].join(" ")}
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/10">
                      {row.displaySrc ? (
                        <Image src={row.displaySrc} alt="" fill sizes="56px" className="object-contain" unoptimized />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-600">—</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-medium leading-snug text-zinc-100">{row.name}</p>
                      <p className="mt-0.5 text-[10px] text-zinc-500">
                        SL: <span className="tabular-nums text-zinc-300">{row.quantity}</span>
                        {row.rarity ? ` · ${row.rarity}` : ""}
                        {row.series ? ` · ${row.series}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ) : (
                <li
                  key={row.keyrambitId}
                  className={[
                    "flex items-center gap-3 rounded-xl border px-2.5 py-2",
                    row.canDrag ? "border-violet-500/30 bg-zinc-900/55" : "border-zinc-800/90 bg-zinc-950/50 opacity-70",
                  ].join(" ")}
                >
                  <div
                    className={[
                      "relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-white/10",
                      row.canDrag ? "touch-none cursor-grab active:cursor-grabbing" : "cursor-not-allowed",
                    ].join(" ")}
                    onPointerDown={(e) => onPointerDownRow(e, row)}
                  >
                    {row.displaySrc ? (
                      <Image src={row.displaySrc} alt="" fill sizes="56px" className="object-contain" unoptimized />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-[9px] text-zinc-600">—</div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-medium leading-snug text-zinc-100">{row.name}</p>
                    <p className="mt-0.5 text-[10px] text-zinc-500">
                      SL: <span className="tabular-nums text-zinc-300">{row.quantity}</span>
                      {row.rarity ? ` · ${row.rarity}` : ""}
                      {row.series ? ` · ${row.series}` : ""}
                    </p>
                  </div>
                </li>
              ),
            )}
          </ul>
        </div>
      </aside>
    </>
  );
}
