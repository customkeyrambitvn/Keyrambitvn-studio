"use client";

import { SelectedItemShowcase } from "./SelectedItemShowcase";

export type PedestalItem = {
  id: string;
  name: string;
  image?: string;
  rarity: string;
  rarityClassName: string;
  boxName: string;
  acquiredAt: string;
  categoryLabel: string;
};

type InventoryPedestalProps = {
  item: PedestalItem | null;
  /** Bumps when selection changes — restarts enter animation. */
  transitionKey: number;
};

/** Fixed side showcase — inspect artifact on workbench, not a popup reveal. */
export function InventoryPedestal({ item, transitionKey }: InventoryPedestalProps) {
  if (!item) {
    return (
      <div className="inventory-pedestal inventory-pedestal--empty">
        <p className="inventory-pedestal__empty-text">Chọn một Keyrambit từ kệ lưu trữ để xem chi tiết.</p>
      </div>
    );
  }

  return (
    <div className={`inventory-pedestal inventory-inspect ${item.rarityClassName}`}>
      <div className="inventory-pedestal__ambient" aria-hidden />
      <div className="inventory-pedestal__grid-floor" aria-hidden />
      <div className="inventory-pedestal__spot" aria-hidden />

      <div className="inventory-pedestal__meta-top">
        <p className="inventory-pedestal__kicker">{item.boxName}</p>
        <span className={`inventory-pedestal__badge ${item.rarityClassName}`}>{item.rarity}</span>
      </div>

      <div className="inventory-pedestal__stage selected-item-showcase-stage">
        <div className="inventory-pedestal__pedestal-base" aria-hidden />
        <SelectedItemShowcase
          itemId={item.id}
          name={item.name}
          image={item.image}
          rarity={item.rarity}
          transitionKey={transitionKey}
        />
      </div>

      <div className="inventory-pedestal__details">
        <h2 className="inventory-pedestal__title">{item.name}</h2>
        <p className="inventory-pedestal__category">{item.categoryLabel}</p>
        <p className="inventory-pedestal__date">
          Nhận ngày {new Date(item.acquiredAt).toLocaleDateString("vi-VN")}
        </p>
      </div>
    </div>
  );
}
