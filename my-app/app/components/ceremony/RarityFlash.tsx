"use client";

import type { CSSProperties } from "react";
import { FLASH_BURST_PARTICLES, flashColorsForRarity, type FlashPalette } from "@/lib/opening-visual";
import { ProductImageBox } from "../ProductImageBox";
import { RevealBackdrop } from "./RevealBackdrop";

type RarityFlashProps = {
  rarity: string;
  /** Item preview for silhouette beat */
  itemName?: string;
  itemImage?: string;
  showSilhouette?: boolean;
};

export function rarityFlashStyle(palette: FlashPalette): CSSProperties {
  return {
    ["--flash-core" as string]: palette.core,
    ["--flash-ring" as string]: palette.ring,
    ["--flash-ambient" as string]: palette.ambient,
  } as CSSProperties;
}

/** Tear climax: burst, particles, optional silhouette before full reveal. */
export function RarityFlash({ rarity, itemName, itemImage, showSilhouette = true }: RarityFlashProps) {
  const palette = flashColorsForRarity(rarity);

  return (
    <div className="rarity-flash" style={rarityFlashStyle(palette)} aria-hidden>
      <RevealBackdrop active />
      <div className="rarity-flash__burst" />
      <div className="rarity-flash__shockwave" />
      {FLASH_BURST_PARTICLES.map((pt, i) => (
        <span
          key={i}
          className="rarity-flash__particle"
          style={
            {
              left: `${pt.left}%`,
              top: `${pt.top}%`,
              ["--px" as string]: `${pt.px}px`,
              ["--py" as string]: `${pt.py}px`,
              animationDelay: `${pt.delay}s`,
            } as CSSProperties
          }
        />
      ))}
      {showSilhouette && itemName ? (
        <div className="rarity-flash__silhouette">
          <ProductImageBox
            name={itemName}
            image={itemImage}
            rarity={rarity}
            imageFit="contain"
            idleMotion={false}
            useAura={false}
            className="rarity-flash__silhouette-img"
          />
        </div>
      ) : null}
    </div>
  );
}
