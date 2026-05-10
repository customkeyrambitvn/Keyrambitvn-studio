"use client";

import Image from "next/image";
import { useResolvedProductImage } from "./ProductImageContext";

type ProductImageBoxProps = {
  name: string;
  /** Optional explicit URL (e.g. from product data or saved inventory); auto-match from `/public/products` when omitted or empty. */
  image?: string | null;
  className?: string;
  /** Rarity label (Vietnamese) — drives silhouette glow and premium pulse/shimmer for high tiers. */
  rarity?: string | null;
  /** `contain` keeps PNG centered with transparent letterboxing; default matches legacy `cover`. */
  imageFit?: "cover" | "contain";
  /** Tighter padding and corners for dense grids (e.g. collection). */
  compact?: boolean;
};

const RARITY_GLOW_MOD: Record<string, string> = {
  Thường: "thuong",
  Hiếm: "hiem",
  "Siêu Hiếm": "sieu-hiem",
  Combo: "combo",
  "Săn Lùng": "san-lung",
  Secret: "secret",
  "Rare Secret": "rare-secret",
  "Super Secret": "super-secret",
};

function rarityGlowMod(r?: string | null): string {
  const t = (r ?? "").trim();
  return RARITY_GLOW_MOD[t] ?? "thuong";
}

function rarityTierFlags(r?: string | null) {
  const t = (r ?? "").trim();
  const secretTier = t === "Secret" || t === "Rare Secret" || t === "Super Secret";
  const midPulse = t === "Hiếm" || t === "Siêu Hiếm" || t === "Combo" || t === "Săn Lùng";
  const superSecret = t === "Super Secret";
  return { secretTier, midPulse, superSecret };
}

export function ProductImageBox({
  name,
  image,
  className = "",
  rarity,
  imageFit = "cover",
  compact = false,
}: ProductImageBoxProps) {
  const resolved = useResolvedProductImage(name, image);
  const mod = rarityGlowMod(rarity);
  const { secretTier, midPulse, superSecret } = rarityTierFlags(rarity);

  const wrapClass = [
    "product-glow-wrap",
    compact ? "product-glow-wrap--compact" : "",
    `product-glow-wrap--${mod}`,
    secretTier ? "product-glow-wrap--secret-tier" : "",
    midPulse && !secretTier ? "product-glow-wrap--mid-pulse" : "",
    superSecret ? "product-glow-wrap--super-secret-tier" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const innerBg = resolved && imageFit === "contain" ? "bg-transparent" : "bg-zinc-900/90";
  const innerRadius = compact ? "rounded-lg" : "rounded-xl";
  const innerBase = `product-glow-target relative w-full overflow-hidden ${innerRadius} ${innerBg} ring-1 ring-white/10 aspect-[4/3]`;

  const imgClass = imageFit === "contain" ? "object-contain product-glow-img" : "object-cover product-glow-img";
  const sizes = compact
    ? "(max-width: 640px) 45vw, (max-width: 1280px) 30vw, 18vw"
    : "(max-width: 640px) 100vw, 360px";

  if (resolved) {
    return (
      <div className={wrapClass}>
        <div className={innerBase}>
          <Image src={resolved} alt={name} fill sizes={sizes} className={imgClass} />
        </div>
      </div>
    );
  }

  return (
    <div className={wrapClass}>
      <div
        className={
          innerBase +
          " flex items-center justify-center bg-gradient-to-br from-slate-700/90 via-slate-900 to-slate-950 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] product-glow-placeholder"
        }
        role="img"
        aria-label={name}
      >
        <div className="pointer-events-none px-4 text-center">
          <span className="text-[11px] font-semibold uppercase tracking-[0.55em] text-slate-400/95">Keyrambit</span>
        </div>
      </div>
    </div>
  );
}
