import type { HTMLAttributes, ReactNode } from "react";

type CollectibleCardProps = HTMLAttributes<HTMLElement> & {
  as?: "article" | "div";
  accent?: "default" | "tier" | "peak" | "multiverse" | "mecha";
  children: ReactNode;
};

const accentClass: Record<NonNullable<CollectibleCardProps["accent"]>, string> = {
  default: "store-collectible--default",
  tier: "store-collectible--tier",
  peak: "store-collectible--peak",
  multiverse: "store-collectible--multiverse",
  mecha: "store-collectible--mecha",
};

/** Game-inventory item tile — tactile hover, rarity-ready interior. */
export function CollectibleCard({
  as: Tag = "article",
  accent = "default",
  className = "",
  children,
  ...rest
}: CollectibleCardProps) {
  return (
    <Tag className={`store-collectible ${accentClass[accent]} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
