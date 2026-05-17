"use client";

import Image from "next/image";
import { useSfx } from "@/app/contexts/SfxContext";
import { rarityToSfxTier } from "@/app/lib/sfx/rarity-tier";
import type { SfxHoverKind } from "@/app/lib/sfx/types";
import { useResolvedProductImage } from "../ProductImageContext";

function slotHoverKind(selected: boolean, rarityClassName: string): SfxHoverKind {
  if (selected) return "selected";
  return rarityToSfxTier(rarityClassName) === "common" ? "ui" : "rarity";
}

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
  const { playHover } = useSfx();
  const resolved = useResolvedProductImage(name, image);

  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => {
        const kind = slotHoverKind(selected, rarityClassName);
        playHover(kind, "side", kind === "ui" ? 0.85 : 0.7);
      }}
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
