"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSfx } from "@/app/contexts/SfxContext";
import { ITEMS_BY_RARITY } from "@/app/data/products";
import { productCategory } from "@/app/lib/category";
import {
  DEFAULT_INVENTORY_SORT,
  INVENTORY_SORT_OPTIONS,
  sortInventoryItems,
  type InventorySortMode,
} from "@/app/lib/inventory-sort";
import { InventoryGridSlot } from "./InventoryGridSlot";
import { InventoryMobileCarousel } from "./InventoryMobileCarousel";
import { InventoryPedestal, type PedestalItem } from "./InventoryPedestal";
import { InventorySummaryPanel } from "./InventorySummaryPanel";

export type ArmoryInventoryItem = {
  id: string;
  name: string;
  rarity: string;
  boxName: string;
  acquiredAt: string;
  image?: string;
};

type InventoryArmoryProps = {
  items: ArmoryInventoryItem[];
  rarityOrder: readonly string[];
  rarityCounts: Record<string, number>;
  normalizeRarity: (raw: string) => string;
  rarityToClassName: (rarity: string) => string;
};

function catalogProductTotal(): number {
  return Object.values(ITEMS_BY_RARITY).reduce(
    (sum, list) => sum + (Array.isArray(list) ? list.length : 0),
    0
  );
}

/** 3-column RPG inventory: grid | inspect | summary. */
export function InventoryArmory({
  items,
  rarityOrder,
  rarityCounts,
  normalizeRarity,
  rarityToClassName,
}: InventoryArmoryProps) {
  const { play } = useSfx();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [transitionKey, setTransitionKey] = useState(0);
  const [sortMode, setSortMode] = useState<InventorySortMode>(DEFAULT_INVENTORY_SORT);

  const sortedItems = useMemo(
    () => sortInventoryItems(items, sortMode, rarityOrder, normalizeRarity),
    [items, sortMode, rarityOrder, normalizeRarity]
  );

  useEffect(() => {
    if (items.length === 0) {
      setSelectedId(null);
      return;
    }
    setSelectedId((current) => {
      if (current && items.some((i) => i.id === current)) return current;
      return items[0].id;
    });
  }, [items]);

  const selectedItem = useMemo(
    () => items.find((i) => i.id === selectedId) ?? null,
    [items, selectedId]
  );

  const stackByName = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      map.set(item.name, (map.get(item.name) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const uniqueOwned = stackByName.size;
  const catalogTotal = useMemo(() => catalogProductTotal(), []);

  const pedestalItem: PedestalItem | null = useMemo(() => {
    if (!selectedItem) return null;
    const rarity = normalizeRarity(selectedItem.rarity);
    return {
      id: selectedItem.id,
      name: selectedItem.name,
      image: selectedItem.image,
      rarity,
      rarityClassName: rarityToClassName(rarity),
      boxName: selectedItem.boxName,
      acquiredAt: selectedItem.acquiredAt,
      categoryLabel: productCategory(selectedItem.name),
    };
  }, [selectedItem, normalizeRarity, rarityToClassName]);

  const nameStackCount = selectedItem ? stackByName.get(selectedItem.name) ?? 1 : 0;

  const handleSelect = useCallback(
    (id: string) => {
      if (id === selectedId) return;
      play("ui_click", 0.55);
      setSelectedId(id);
      setTransitionKey((k) => k + 1);
    },
    [selectedId, play]
  );

  return (
    <section className="inventory-armory main-inventory-layout" aria-label="Kho đồ Keyrambit">
      <div className="inventory-armory__grid-panel">
        <header className="inventory-armory__grid-head">
          <p className="inventory-armory__grid-title">Kệ lưu trữ</p>
          <div className="inventory-armory__grid-head-actions">
            <label className="inventory-armory__grid-sort">
              <select
                className="inventory-armory__grid-sort-select"
                value={sortMode}
                onChange={(e) => {
                  setSortMode(e.target.value as InventorySortMode);
                  play("ui_click", 0.4);
                }}
                aria-label="Sắp xếp kệ lưu trữ"
                title={INVENTORY_SORT_OPTIONS.find((o) => o.value === sortMode)?.label}
              >
                {INVENTORY_SORT_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value} title={opt.label}>
                    {opt.shortLabel}
                  </option>
                ))}
              </select>
            </label>
            <span className="inventory-armory__grid-count">{items.length} món</span>
          </div>
        </header>
        <div className="inventory-armory__grid-scroll">
          <div className="inventory-armory__grid" role="list">
            {sortedItems.map((item) => {
              const rarity = normalizeRarity(item.rarity);
              return (
                <InventoryGridSlot
                  key={item.id}
                  name={item.name}
                  image={item.image}
                  rarity={rarity}
                  rarityClassName={rarityToClassName(rarity)}
                  selected={item.id === selectedId}
                  stackCount={stackByName.get(item.name) ?? 1}
                  onSelect={() => handleSelect(item.id)}
                />
              );
            })}
          </div>
        </div>
      </div>

      <div className="inventory-armory__inspect-wrap">
        <InventoryPedestal item={pedestalItem} transitionKey={transitionKey} />
      </div>

      <InventoryMobileCarousel
        items={items}
        sortedItems={sortedItems}
        selectedId={selectedId}
        sortMode={sortMode}
        onSortChange={setSortMode}
        stackByName={stackByName}
        normalizeRarity={normalizeRarity}
        rarityToClassName={rarityToClassName}
        onSelect={handleSelect}
      />

      <InventorySummaryPanel
        totalItems={items.length}
        uniqueOwned={uniqueOwned}
        catalogTotal={catalogTotal}
        rarityOrder={rarityOrder}
        rarityCounts={rarityCounts}
        rarityToClassName={rarityToClassName}
        selected={pedestalItem}
        nameStackCount={nameStackCount}
      />
    </section>
  );
}
