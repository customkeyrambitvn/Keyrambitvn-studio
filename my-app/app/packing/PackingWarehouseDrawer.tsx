"use client";

import type { PackingWarehouseStockRow } from "@/lib/packing-warehouse";

type Props = {
  open: boolean;
  onClose: () => void;
  stocks: PackingWarehouseStockRow[];
};

export function PackingWarehouseDrawer({ open, onClose, stocks }: Props) {
  if (!open) return null;

  return (
    <>
      <button
        type="button"
        aria-label="Đóng kho"
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-lg flex-col border-l border-zinc-700 bg-[#0a0c12] shadow-2xl shadow-black/60"
        role="dialog"
        aria-labelledby="warehouse-drawer-title"
      >
        <div className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="warehouse-drawer-title" className="text-sm font-semibold text-zinc-100">
            Kho Đóng Hàng
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden p-4">
          <p className="text-[11px] leading-relaxed text-zinc-500">
            Đây chỉ là bảng tồn: số <span className="text-zinc-400">sản phẩm đơn</span> còn lại theo từng nhóm. Lấy
            đồ bằng cách <span className="text-zinc-400">chạm stack trên bàn</span> (stack đã gắn nhóm trong editor
            layout).
          </p>

          <div className="min-h-0 flex-1 overflow-y-auto">
            <ul className="space-y-2">
              {stocks.map((row) => {
                const empty = row.remainingSingles <= 0;
                return (
                  <li
                    key={row.groupId}
                    className={[
                      "flex items-center justify-between gap-3 rounded-xl border px-3 py-2.5",
                      empty ? "border-zinc-800/90 bg-zinc-950/50" : "border-cyan-500/25 bg-zinc-900/55",
                    ].join(" ")}
                  >
                    <span className="min-w-0 flex-1 text-[12px] font-medium leading-snug text-zinc-100">
                      {row.name}
                    </span>
                    <span
                      className={[
                        "shrink-0 tabular-nums text-[11px] font-semibold",
                        empty ? "text-zinc-500" : "text-cyan-100/95",
                      ].join(" ")}
                    >
                      {row.remainingSingles} / {row.maxSingles}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </aside>
    </>
  );
}
