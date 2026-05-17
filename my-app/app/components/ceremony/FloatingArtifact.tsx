"use client";

import Image from "next/image";
import { useResolvedProductImage } from "../ProductImageContext";
import { RarityAura } from "../aura";
import { rarityToFloatMod } from "../motion/FloatingItem";

type FloatingArtifactProps = {
  name: string;
  image?: string | null;
  rarity: string;
  rarityClass: string;
  /** Orbit slot index for staggered animation delay */
  orbitIndex?: number;
  orbitTotal?: number;
  size?: "sm" | "md";
  className?: string;
};

/** Collectible thumbnail with ritual float + unified rarity aura. */
export function FloatingArtifact({
  name,
  image,
  rarity,
  rarityClass,
  orbitIndex = 0,
  orbitTotal = 1,
  size = "md",
  className = "",
}: FloatingArtifactProps) {
  const resolved = useResolvedProductImage(name, image);
  const mod = rarityToFloatMod(rarity);
  const delay = (orbitIndex / Math.max(orbitTotal, 1)) * 0.35;

  return (
    <div
      className={`floating-artifact floating-artifact--${size} floating-artifact--${mod} ${rarityClass} ${className}`.trim()}
      style={{ ["--orbit-delay" as string]: `${delay}s` }}
    >
      <RarityAura rarity={rarity} presentation="ritual" className="floating-artifact__aura-host">
        <div className="floating-artifact__frame">
          {resolved ? (
            <Image src={resolved} alt="" fill sizes="72px" className="object-contain p-1.5" />
          ) : (
            <span className="text-[9px] font-semibold uppercase tracking-widest text-zinc-500">KR</span>
          )}
        </div>
      </RarityAura>
    </div>
  );
}
