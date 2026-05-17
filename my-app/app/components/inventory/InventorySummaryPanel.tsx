"use client";

import { useEffect, useState } from "react";
import type { PedestalItem } from "./InventoryPedestal";

type RarityKey = string;

type InventorySummaryPanelProps = {
  totalItems: number;
  uniqueOwned: number;
  catalogTotal: number;
  rarityOrder: readonly RarityKey[];
  rarityCounts: Record<RarityKey, number>;
  rarityToClassName: (rarity: string) => string;
  selected: PedestalItem | null;
  nameStackCount: number;
};

/** Right column — collection totals, rarity breakdown, selected snapshot. */
export function InventorySummaryPanel({
  totalItems,
  uniqueOwned,
  catalogTotal,
  rarityOrder,
  rarityCounts,
  rarityToClassName,
  selected,
  nameStackCount,
}: InventorySummaryPanelProps) {
  const progressPct = catalogTotal > 0 ? Math.min(100, Math.round((uniqueOwned / catalogTotal) * 100)) : 0;
  const [collectionExpanded, setCollectionExpanded] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const sync = () => {
      if (mq.matches) setCollectionExpanded(true);
    };
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return (
    <aside
      className={`inventory-summary${collectionExpanded ? " inventory-summary--expanded" : ""}`}
      aria-label="Tóm tắt bộ sưu tập"
    >
      <button
        type="button"
        className="inventory-summary__mobile-toggle"
        onClick={() => setCollectionExpanded((open) => !open)}
        aria-expanded={collectionExpanded}
      >
        <span className="inventory-summary__mobile-toggle-label">Bộ sưu tập</span>
        <span className="inventory-summary__mobile-teaser">
          {totalItems} món · {uniqueOwned}/{catalogTotal} loại · {progressPct}%
        </span>
        <span className="inventory-summary__mobile-chevron" aria-hidden>
          {collectionExpanded ? "−" : "+"}
        </span>
      </button>

      <div className="inventory-summary__collapsible-body">
        <div className="inventory-summary__block">
          <p className="inventory-summary__heading">Bộ sưu tập</p>
          <dl className="inventory-summary__stats">
            <div className="inventory-summary__row">
              <dt>Tổng vật phẩm</dt>
              <dd>{totalItems}</dd>
            </div>
            <div className="inventory-summary__row">
              <dt>Loại đã sở hữu</dt>
              <dd>
                {uniqueOwned}
                <span className="inventory-summary__muted"> / {catalogTotal}</span>
              </dd>
            </div>
          </dl>
          <div className="inventory-summary__progress" aria-label={`Tiến độ ${progressPct}%`}>
            <div className="inventory-summary__progress-track">
              <span className="inventory-summary__progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="inventory-summary__progress-label">{progressPct}% catalogue</span>
          </div>
        </div>

        <div className="inventory-summary__block inventory-summary__block--rarities">
          <p className="inventory-summary__heading">Theo độ hiếm</p>
          <ul className="inventory-summary__rarity-list">
            {rarityOrder.map((rarity) => (
              <li key={rarity}>
                <span className={`inventory-summary__rarity-row ${rarityToClassName(rarity)}`}>
                  <span className="inventory-summary__rarity-dot" aria-hidden />
                  <span className="inventory-summary__rarity-name" title={rarity}>
                    {rarity}
                  </span>
                  <span className="inventory-summary__rarity-count">{rarityCounts[rarity] ?? 0}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        {selected ? (
          <div className="inventory-summary__block inventory-summary__block--selected inventory-summary__block--desktop-only">
            <p className="inventory-summary__heading">Đang xem</p>
            <p
              className={`inventory-summary__selected-rarity ${selected.rarityClassName}`}
              title={selected.rarity}
            >
              {selected.rarity}
            </p>
            <p className="inventory-summary__selected-name" title={selected.name}>
              {selected.name}
            </p>
            <p
              className="inventory-summary__selected-meta"
              title={`${nameStackCount > 1 ? `Sở hữu ×${nameStackCount} · ` : ""}${selected.categoryLabel}`}
            >
              {nameStackCount > 1 ? `Sở hữu ×${nameStackCount} · ` : null}
              {selected.categoryLabel}
            </p>
          </div>
        ) : null}

        <p className="inventory-summary__hint inventory-summary__block--desktop-only">
          Chọn ô bên trái để xem chi tiết Keyrambit.
        </p>
      </div>
    </aside>
  );
}
