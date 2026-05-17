"use client";

import { useEffect, useRef } from "react";
import { useSfx } from "@/app/contexts/SfxContext";
import {
  INVENTORY_SORT_OPTIONS,
  type InventorySortMode,
} from "@/app/lib/inventory-sort";
import type { ArmoryInventoryItem } from "./InventoryArmory";
import { InventoryGridSlot } from "./InventoryGridSlot";

type InventoryMobileCarouselProps = {
  items: ArmoryInventoryItem[];
  sortedItems: ArmoryInventoryItem[];
  selectedId: string | null;
  sortMode: InventorySortMode;
  onSortChange: (mode: InventorySortMode) => void;
  stackByName: Map<string, number>;
  normalizeRarity: (raw: string) => string;
  rarityToClassName: (rarity: string) => string;
  onSelect: (id: string) => void;
};

/** Mobile horizontal inventory strip — tap to update hero showcase. */
export function InventoryMobileCarousel({
  items,
  sortedItems,
  selectedId,
  sortMode,
  onSortChange,
  stackByName,
  normalizeRarity,
  rarityToClassName,
  onSelect,
}: InventoryMobileCarouselProps) {
  const { play } = useSfx();
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  useEffect(() => {
    if (!selectedId) return;
    const el = itemRefs.current.get(selectedId);
    el?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  }, [selectedId]);

  return (
    <div className="inventory-armory__carousel" aria-label="Kệ lưu trữ di động">
      <header className="inventory-armory__carousel-head">
        <p className="inventory-armory__carousel-title">Kệ lưu trữ</p>
        <div className="inventory-armory__carousel-head-actions">
          <label className="inventory-armory__grid-sort">
            <select
              className="inventory-armory__grid-sort-select"
              value={sortMode}
              onChange={(e) => {
                onSortChange(e.target.value as InventorySortMode);
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

      <div className="inventory-armory__carousel-scroll">
        <div className="inventory-armory__carousel-track" role="list">
          {sortedItems.map((item) => {
            const rarity = normalizeRarity(item.rarity);
            return (
              <div
                key={item.id}
                role="listitem"
                className="inventory-armory__carousel-item"
                ref={(node) => {
                  if (node) itemRefs.current.set(item.id, node);
                  else itemRefs.current.delete(item.id);
                }}
              >
                <InventoryGridSlot
                  name={item.name}
                  image={item.image}
                  rarity={rarity}
                  rarityClassName={rarityToClassName(rarity)}
                  selected={item.id === selectedId}
                  stackCount={stackByName.get(item.name) ?? 1}
                  onSelect={() => onSelect(item.id)}
                  className="inventory-carousel__card"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

