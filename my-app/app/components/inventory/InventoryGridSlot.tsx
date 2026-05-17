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

type InventoryGridSlotProps = {
  name: string;
  image?: string;
  rarity: string;
  rarityClassName: string;
  selected: boolean;
  stackCount?: number;
  onSelect: () => void;
  className?: string;
};

function rarityShortLabel(rarity: string): string {
  const map: Record<string, string> = {
    "Thường": "Thường",
    "Hiếm": "Hiếm",
    "Siêu Hiếm": "S.Hiếm",
    Combo: "Combo",
    "Săn Lùng": "S.Lùng",
    Secret: "Secret",
    "Rare Secret": "R.Secret",
    "Super Secret": "S.Secret",
  };
  return map[rarity] ?? rarity;
}

/** RPG inventory slot — square tile, rarity border, optional stack badge. */
export function InventoryGridSlot({
  name,
  image,
  rarity,
  rarityClassName,
  selected,
  stackCount = 1,
  onSelect,
  className = "",
}: InventoryGridSlotProps) {
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
        "inventory-grid__slot",
        rarityClassName,
        selected ? "inventory-grid__slot--selected" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      aria-pressed={selected}
      aria-label={`${name}, ${rarity}${stackCount > 1 ? `, x${stackCount}` : ""}`}
    >
      <span className={`inventory-grid__slot-glow ${rarityClassName}`} aria-hidden />
      <span className={`inventory-grid__slot-strip card-rarity-strip ${rarityClassName}`} aria-hidden />
      {stackCount > 1 ? (
        <span className="inventory-grid__slot-stack" aria-label={`Số lượng ${stackCount}`}>
          ×{stackCount}
        </span>
      ) : null}
      <span className="inventory-grid__slot-thumb">
        {resolved ? (
          <Image
            src={resolved}
            alt=""
            width={64}
            height={64}
            sizes="64px"
            className="inventory-grid__slot-img"
            draggable={false}
          />
        ) : (
          <span className="inventory-grid__slot-placeholder">KR</span>
        )}
      </span>
      <span className="inventory-grid__slot-name-row">
        <span className={`inventory-grid__slot-rarity-dot ${rarityClassName}`} aria-hidden />
        <span className={`inventory-grid__slot-rarity-tag ${rarityClassName}`}>{rarityShortLabel(rarity)}</span>
        <span className="inventory-grid__slot-name">{name}</span>
      </span>
    </button>
  );
}
