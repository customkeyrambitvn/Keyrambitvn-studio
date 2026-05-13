"use client";

type Props = {
  pendingOrderCount: number;
  onOpenOrders: () => void;
  onOpenKeyrambitWarehouse: () => void;
  onOpenPackingWarehouse: () => void;
};

/** Thanh điều khiển nhanh iPhone: không che bàn, nút lớn, chữ ngắn. */
export function PackingMobileView({ pendingOrderCount, onOpenOrders, onOpenKeyrambitWarehouse, onOpenPackingWarehouse }: Props) {
  return (
    <div
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-[50] border-t border-zinc-800/90 bg-[#05070c]/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur-md"
      role="toolbar"
      aria-label="Điều khiển đóng hàng"
    >
      <div className="mx-auto flex max-w-md items-stretch justify-center gap-2">
        <button
          type="button"
          onClick={onOpenOrders}
          className="flex min-h-[3rem] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-amber-500/45 bg-[#0a0f1d]/95 py-1.5 text-[10px] font-semibold text-amber-50 active:scale-[0.98]"
        >
          <span className="text-lg leading-none" aria-hidden>
            📋
          </span>
          <span>Đơn</span>
          <span className="text-[9px] font-normal text-amber-200/80">({pendingOrderCount})</span>
        </button>
        <button
          type="button"
          onClick={onOpenKeyrambitWarehouse}
          className="flex min-h-[3rem] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-violet-500/45 bg-[#0a0f1d]/95 py-1.5 text-[10px] font-semibold text-violet-50 active:scale-[0.98]"
        >
          <span className="text-lg leading-none" aria-hidden>
            🎁
          </span>
          <span>KR</span>
        </button>
        <button
          type="button"
          onClick={onOpenPackingWarehouse}
          className="flex min-h-[3rem] min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-xl border border-cyan-500/45 bg-[#0a0f1d]/95 py-1.5 text-[10px] font-semibold text-cyan-50 active:scale-[0.98]"
        >
          <span className="text-lg leading-none" aria-hidden>
            📦
          </span>
          <span>Kho</span>
        </button>
      </div>
    </div>
  );
}
