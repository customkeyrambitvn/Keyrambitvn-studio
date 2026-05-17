"use client";

import Image from "next/image";
import { useSfx } from "@/app/contexts/SfxContext";
import { useResolvedProductImage } from "../ProductImageContext";

type InventoryRackSlotProps = {
  id: string;
  name: string;
  image?: string;
  rarity: string;
  rarityClassName: string;
  selected: boolean;
  returning?: boolean;
  onSelect: () => void;
};

/** Horizontal rack row — fixed height, thumb + text, glow contained in card. */
export function InventoryRackSlot({
  name,
  image,
  rarity,
  rarityClassName,
  selected,
  returning,
  onSelect,
}: InventoryRackSlotProps) {
  const { play } = useSfx();
  const resolved = useResolvedProductImage(name, image);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => play("ui_hover_soft", 0.35)}
      className={[
        "inventory-rack__slot",
        rarityClassName,
        selected ? "inventory-rack__slot--selected" : "",
        returning ? "inventory-rack__slot--return" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
      aria-label={`Chọn ${name}`}
    >
      <span className={`inventory-rack__slot-glow ${rarityClassName}`} aria-hidden />
      <span className="inventory-rack__slot-ripple" aria-hidden />

      <span className="inventory-rack__slot-thumb">
        {resolved ? (
          <Image
            src={resolved}
            alt=""
            width={80}
            height={80}
            sizes="80px"
            className="inventory-rack__slot-img"
            draggable={false}
          />
        ) : (
          <span className="inventory-rack__slot-placeholder">KR</span>
        )}
      </span>

      <span className="inventory-rack__slot-text">
        <span className="inventory-rack__slot-name">{name}</span>
        <span className={`inventory-rack__slot-rarity ${rarityClassName}`}>{rarity}</span>
      </span>
    </button>
  );
}
