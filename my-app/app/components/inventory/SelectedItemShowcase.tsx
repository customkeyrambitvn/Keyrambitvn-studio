"use client";

import { ProductImageBox } from "../ProductImageBox";
import { RarityAura } from "../aura";

const SPARKLE_COUNT = 10;

type SelectedItemShowcaseProps = {
  itemId: string;
  name: string;
  image?: string;
  rarity: string;
  transitionKey: number;
};

/** Center-panel inspect artifact — idle float, living aura, hover lift. */
export function SelectedItemShowcase({
  itemId,
  name,
  image,
  rarity,
  transitionKey,
}: SelectedItemShowcaseProps) {
  return (
    <div
      key={`${itemId}-${transitionKey}`}
      className="selected-item-showcase inventory-pedestal__artifact inventory-pedestal__artifact--enter"
    >
      <div className="selected-item-showcase__dust" aria-hidden />
      <div className="aura-sparkles selected-item-showcase__sparkles" aria-hidden>
        {Array.from({ length: SPARKLE_COUNT }, (_, i) => (
          <span key={i} className="aura-sparkles__dot" />
        ))}
      </div>

      <RarityAura
        rarity={rarity}
        presentation="showcase"
        interactive
        className="selected-item-showcase__aura inventory-pedestal__aura"
      >
        <div className="selected-item-showcase__float">
          <ProductImageBox
            name={name}
            image={image}
            rarity={rarity}
            frameless
            imageFit="contain"
            idleMotion={false}
            useAura={false}
            className="inventory-pedestal__artifact-img"
          />
        </div>
      </RarityAura>
    </div>
  );
}
