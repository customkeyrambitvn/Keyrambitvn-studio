"use client";

import type { PackingChecklistRow } from "@/lib/packing-order-checklist";
import type { PackingOrder } from "@/lib/packing-orders-types";

type Props = {
  open: boolean;
  onClose: () => void;
  pendingOrders: PackingOrder[];
  activeOrder: PackingOrder | null;
  checklistRows: PackingChecklistRow[];
  checklistAllOk: boolean;
  resolveKeyrambitStock: (keyrambitId: string) => number;
  onAcceptOrder: (orderId: string) => void;
  onRejectPendingOrder: (orderId: string) => void;
  onCompleteOrder: () => void;
  onCancelActiveOrder: () => void;
};

export function PackingOrdersDrawer({
  open,
  onClose,
  pendingOrders,
  activeOrder,
  checklistRows,
  checklistAllOk,
  resolveKeyrambitStock,
  onAcceptOrder,
  onRejectPendingOrder,
  onCompleteOrder,
  onCancelActiveOrder,
}: Props) {
  if (!open) return null;

  const hasActive = activeOrder != null;
  const activeStock = activeOrder ? resolveKeyrambitStock(activeOrder.requiredKeyrambitId) : 0;
  const activeStockOk = activeOrder != null && activeStock >= activeOrder.requiredQuantity;

  return (
    <>
      <button
        type="button"
        aria-label="Đóng panel đơn hàng"
        className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-[2px]"
        onClick={onClose}
      />
      <aside
        className="fixed inset-x-0 bottom-0 z-[70] max-h-[min(88vh,32rem)] flex flex-col rounded-t-2xl border border-zinc-700 border-b-0 bg-[#0a0c12] shadow-2xl shadow-black/60 sm:inset-x-auto sm:bottom-4 sm:right-4 sm:left-auto sm:max-h-[85vh] sm:w-full sm:max-w-md sm:rounded-2xl sm:border-b"
        role="dialog"
        aria-labelledby="orders-drawer-title"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-zinc-800 px-4 py-3">
          <h2 id="orders-drawer-title" className="text-sm font-semibold text-zinc-100">
            Đơn hàng đóng gói
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

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
          {hasActive && activeOrder ? (
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-cyan-400/90">
                Đơn đang xử lý
              </h3>
              <div className="rounded-xl border border-cyan-500/25 bg-zinc-900/50 px-3 py-2.5 text-[12px] text-zinc-200">
                <p className="font-medium text-zinc-50">{activeOrder.customerName}</p>
                <p className="mt-1 text-zinc-300">
                  Keyrambit cần đóng:{" "}
                  <span className="font-medium text-zinc-100">{activeOrder.requiredKeyrambitName}</span>
                </p>
                <p className="mt-0.5 text-zinc-400">
                  Số lượng cần: ×{activeOrder.requiredQuantity}
                </p>
                <p className="mt-0.5 text-zinc-400">
                  Trong kho hiện có: {activeStock} cái
                </p>
                <p
                  className={
                    activeStockOk ? "mt-1 text-[11px] font-medium text-emerald-400/95" : "mt-1 text-[11px] font-medium text-amber-300/95"
                  }
                >
                  Trạng thái: {activeStockOk ? "Đủ hàng" : "Thiếu hàng"}
                </p>
              </div>
              <div className="space-y-3">
                {(() => {
                  const prep = checklistRows.filter((r) => r.section === "prep");
                  const pack = checklistRows.filter((r) => r.section === "pack");
                  const legacy = checklistRows.filter((r) => !r.section);
                  const blocks: { title: string; rows: typeof checklistRows }[] = [];
                  if (prep.length) blocks.push({ title: "Chuẩn bị", rows: prep });
                  if (pack.length) blocks.push({ title: "Đóng gói", rows: pack });
                  if (legacy.length) blocks.push({ title: "Yêu cầu", rows: legacy });
                  if (!blocks.length) return null;
                  return blocks.map((block) => (
                    <div key={block.title} className="space-y-2">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-zinc-500">{block.title}</p>
                      <ul className="space-y-2">
                        {block.rows.map((row) => (
                          <li
                            key={row.id}
                            className={[
                              "flex items-start gap-2 rounded-lg border px-2.5 py-2 text-[11px]",
                              row.ok ? "border-emerald-500/35 bg-emerald-950/25" : "border-zinc-700/80 bg-zinc-950/40",
                            ].join(" ")}
                          >
                            <span className="mt-0.5 shrink-0 text-[13px]" aria-hidden>
                              {row.ok ? "✓" : "○"}
                            </span>
                            <div className="min-w-0 flex-1">
                              <p className="font-medium text-zinc-100">{row.label}</p>
                              {row.detail ? <p className="mt-0.5 text-[10px] text-amber-200/90">{row.detail}</p> : null}
                            </div>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={!checklistAllOk}
                  onClick={onCompleteOrder}
                  className="flex-1 rounded-xl border border-emerald-500/45 bg-emerald-600/20 py-2.5 text-[11px] font-semibold text-emerald-100 transition enabled:hover:bg-emerald-600/35 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Hoàn thành (hoặc kéo packing-bag-done vào vùng xanh)
                </button>
                <button
                  type="button"
                  onClick={onCancelActiveOrder}
                  className="rounded-xl border border-zinc-600 bg-zinc-900/80 py-2.5 text-[11px] font-medium text-zinc-300 transition hover:bg-zinc-800 sm:px-4"
                >
                  Hủy đơn
                </button>
              </div>
            </section>
          ) : (
            <section className="space-y-2">
              <h3 className="text-[11px] font-semibold uppercase tracking-wide text-zinc-500">
                Đơn chờ ({pendingOrders.length}/5)
              </h3>
              {pendingOrders.length === 0 ? (
                <p className="text-[12px] text-zinc-500">Hiện không có đơn chờ.</p>
              ) : (
                <ul className="space-y-2">
                  {pendingOrders.map((o) => {
                    const m = resolveKeyrambitStock(o.requiredKeyrambitId);
                    const enough = m >= o.requiredQuantity;
                    return (
                    <li
                      key={o.id}
                      className="rounded-xl border border-zinc-700/90 bg-zinc-900/45 px-3 py-2.5 text-[11px] text-zinc-200"
                    >
                      <p className="font-semibold text-zinc-50">{o.customerName}</p>
                      <p className="mt-1 text-zinc-300">
                        Keyrambit yêu cầu:{" "}
                        <span className="font-medium text-zinc-100">{o.requiredKeyrambitName}</span>
                      </p>
                      <p className="mt-0.5 text-zinc-400">Số lượng đơn cần: ×{o.requiredQuantity}</p>
                      <p className="mt-0.5 text-zinc-400">Trong kho hiện có: {m} cái</p>
                      <p
                        className={
                          enough ? "mt-0.5 text-[11px] font-medium text-emerald-400/90" : "mt-0.5 text-[11px] font-medium text-amber-300/90"
                        }
                      >
                        Trạng thái: {enough ? "Đủ hàng" : "Thiếu hàng"}
                      </p>
                      <p className="mt-1 text-[10px] leading-snug text-zinc-500">
                        {o.requiredPackagingItems.length > 0 ? (
                          <>
                            Vật dụng:{" "}
                            {o.requiredPackagingItems.map((p) => `${p.name}×${p.quantity}`).join(", ")}
                          </>
                        ) : (
                          <>
                            Quy trình: chuẩn bị đủ vật tư trên bàn, đóng gói theo checklist sau khi nhận đơn; hoàn
                            tất bằng cách kéo gói packing-bag-done vào vùng hoàn đơn (góc phải dưới).
                          </>
                        )}
                      </p>
                      <div className="mt-2 flex gap-2">
                        <button
                          type="button"
                          disabled={hasActive}
                          onClick={() => onRejectPendingOrder(o.id)}
                          className="w-[30%] min-w-[4.25rem] shrink-0 rounded-lg border border-rose-500/35 bg-zinc-950/60 py-2 text-[10px] font-medium text-rose-200/90 transition enabled:hover:border-rose-400/50 enabled:hover:bg-rose-950/35 disabled:cursor-not-allowed disabled:opacity-35 sm:py-2.5 sm:text-[11px]"
                        >
                          Từ chối
                        </button>
                        <button
                          type="button"
                          disabled={hasActive}
                          onClick={() => onAcceptOrder(o.id)}
                          className="min-w-0 flex-1 rounded-lg border border-cyan-500/45 bg-cyan-500/18 py-2.5 text-[11px] font-semibold text-cyan-50 transition enabled:hover:bg-cyan-500/28 disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          {hasActive ? "Đang có đơn xử lý" : "Nhận đơn"}
                        </button>
                      </div>
                    </li>
                    );
                  })}
                </ul>
              )}
            </section>
          )}
        </div>
      </aside>
    </>
  );
}
