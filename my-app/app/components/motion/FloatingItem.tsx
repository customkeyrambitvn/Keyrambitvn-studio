import type { ReactNode } from "react";

type FloatIntensity = "subtle" | "normal" | "hero";

type FloatingItemProps = {
  children: ReactNode;
  className?: string;
  /** Rarity mod slug: thuong, hiem, secret, etc. */
  rarityMod?: string;
  intensity?: FloatIntensity;
  /** Enable hover lift (disable inside modals if needed). */
  interactive?: boolean;
  disabled?: boolean;
};

/** Premium idle float + optional rarity pulse — wraps collectible imagery. */
export function FloatingItem({
  children,
  className = "",
  rarityMod = "thuong",
  intensity = "normal",
  interactive = true,
  disabled = false,
}: FloatingItemProps) {
  const classes = [
    "floating-item",
    `floating-item--${intensity}`,
    `floating-item--rarity-${rarityMod}`,
    interactive && !disabled ? "floating-item--interactive" : "",
    disabled ? "floating-item--static" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return <div className={classes}>{children}</div>;
}

export function rarityToFloatMod(rarity?: string | null): string {
  const map: Record<string, string> = {
    "Thường": "thuong",
    "Hiếm": "hiem",
    "Siêu Hiếm": "sieu-hiem",
    Combo: "combo",
    "Săn Lùng": "san-lung",
    Secret: "secret",
    "Rare Secret": "rare-secret",
    "Super Secret": "super-secret",
  };
  return map[(rarity ?? "").trim()] ?? "thuong";
}
