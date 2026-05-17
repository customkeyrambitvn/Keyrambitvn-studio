"use client";

import Image from "next/image";
import { useResolvedProductImage } from "./ProductImageContext";
import { RarityAura, type AuraPresentation } from "./aura";
import { FloatingItem, rarityToFloatMod } from "./motion";

type ProductImageBoxProps = {
  name: string;
  /** Optional explicit URL (e.g. from product data or saved inventory); auto-match from `/public/products` when omitted or empty. */
  image?: string | null;
  className?: string;
  /** Rarity label (Vietnamese) — drives layered aura when enabled. */
  rarity?: string | null;
  /** `contain` keeps PNG centered with transparent letterboxing; default matches legacy `cover`. */
  imageFit?: "cover" | "contain";
  /** Tighter padding and corners for dense grids (e.g. collection). */
  compact?: boolean;
  /** Idle float / hover (off inside nested motion wrappers). */
  idleMotion?: boolean;
  /** No card frame — image floats; aura supplies depth. */
  frameless?: boolean;
  /** Layered rarity aura (off when parent already wraps RarityAura / RarityGlow). */
  useAura?: boolean;
  auraPresentation?: AuraPresentation;
  /** Hover lift + glow boost on the aura host. */
  interactiveAura?: boolean;
};

export function ProductImageBox({
  name,
  image,
  className = "",
  rarity,
  imageFit = "cover",
  compact = false,
  idleMotion = true,
  frameless = false,
  useAura = true,
  auraPresentation,
  interactiveAura,
}: ProductImageBoxProps) {
  const resolved = useResolvedProductImage(name, image);
  const floatMod = rarityToFloatMod(rarity);
  const intensity = compact ? "subtle" : "normal";

  const presentation: AuraPresentation =
    auraPresentation ?? (compact ? "grid" : frameless ? "vault" : "vault");
  const auraInteractive = interactiveAura ?? (!compact && useAura);

  const innerBg =
    frameless || useAura || (resolved && imageFit === "contain") ? "bg-transparent" : "bg-zinc-900/90";
  const innerRadius = frameless || useAura ? "" : compact ? "rounded-lg" : "rounded-xl";
  const frameClass =
    frameless || useAura
      ? "product-glow-target--frameless relative w-full aspect-square max-h-[min(52vw,240px)] mx-auto"
      : `product-glow-target relative w-full overflow-hidden ${innerRadius} ${innerBg} ring-1 ring-white/10 aspect-[4/3]`;

  const imgClass = imageFit === "contain" ? "object-contain product-glow-img" : "object-cover product-glow-img";
  const sizes = compact
    ? "(max-width: 640px) 45vw, (max-width: 1280px) 30vw, 18vw"
    : "(max-width: 640px) 100vw, 360px";

  const inner = resolved ? (
    <div className={frameClass}>
      <Image src={resolved} alt={name} fill sizes={sizes} className={imgClass} />
    </div>
  ) : (
    <div
      className={
        frameClass +
        " flex items-center justify-center bg-gradient-to-br from-slate-700/90 via-slate-900 to-slate-950 product-glow-placeholder"
      }
      role="img"
      aria-label={name}
    >
      <div className="pointer-events-none px-4 text-center">
        <span className="text-[11px] font-semibold uppercase tracking-[0.55em] text-slate-400/95">Keyrambit</span>
      </div>
    </div>
  );

  const wrapClass = [
    "product-glow-wrap",
    useAura ? "product-glow-wrap--aura-host" : "",
    frameless ? "product-glow-wrap--frameless" : "",
    compact ? "product-glow-wrap--compact" : "",
    useAura ? "" : className,
  ]
    .filter(Boolean)
    .join(" ");

  const box = <div className={wrapClass}>{inner}</div>;

  const withFloat = !idleMotion ? (
    box
  ) : (
    <FloatingItem rarityMod={floatMod} intensity={intensity} interactive={!compact && !auraInteractive}>
      {box}
    </FloatingItem>
  );

  if (!useAura) {
    return withFloat;
  }

  return (
    <RarityAura rarity={rarity} presentation={presentation} interactive={auraInteractive} className={className}>
      {withFloat}
    </RarityAura>
  );
}
