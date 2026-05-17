import type { ReactNode } from "react";
import {
  particleCountForTier,
  rarityToAuraMod,
  rarityToAuraTier,
  type AuraPresentation,
} from "@/app/lib/rarity-aura";

export type { AuraPresentation };

type RarityAuraProps = {
  children: ReactNode;
  rarity?: string | null;
  presentation?: AuraPresentation;
  className?: string;
  /** Hover lift + glow intensify (inventory / collection). */
  interactive?: boolean;
};

/** Layered rarity energy — scales with tier and presentation context. */
export function RarityAura({
  children,
  rarity,
  presentation = "vault",
  className = "",
  interactive = false,
}: RarityAuraProps) {
  const mod = rarityToAuraMod(rarity);
  const tier = rarityToAuraTier(rarity);
  const particles = particleCountForTier(tier, presentation);

  const showHalo = tier >= 2;
  const showFog = tier >= 2;
  const showRays = tier >= 3 && presentation !== "grid" && presentation !== "ritual";
  const showStreaks = tier >= 3 && presentation !== "grid";
  const showRing = tier >= 4 && presentation !== "grid" && presentation !== "ritual";
  const showEmbers = tier >= 4 && (presentation === "showcase" || presentation === "hero");
  const showArcs = tier >= 5 && (presentation === "showcase" || presentation === "hero");
  const showSpotlight =
    presentation === "showcase" || presentation === "hero" || (presentation === "vault" && tier >= 5);

  return (
    <div
      className={[
        "rarity-aura",
        `rarity-aura--${presentation}`,
        `rarity-aura--${mod}`,
        `rarity-aura--tier-${tier}`,
        interactive ? "rarity-aura--interactive" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {showSpotlight ? <div className="rarity-aura__spotlight" aria-hidden /> : null}
      <div className="rarity-aura__aura" aria-hidden />
      <div className="rarity-aura__aura-pulse" aria-hidden />
      {showHalo ? <div className="rarity-aura__halo" aria-hidden /> : null}
      {showFog ? <div className="rarity-aura__fog" aria-hidden /> : null}
      {showRays ? <div className="rarity-aura__rays" aria-hidden /> : null}
      {showRing ? <div className="rarity-aura__ring" aria-hidden /> : null}
      {showStreaks ? (
        <>
          <div className="rarity-aura__streak rarity-aura__streak--a" aria-hidden />
          <div className="rarity-aura__streak rarity-aura__streak--b" aria-hidden />
        </>
      ) : null}
      {showEmbers ? (
        <>
          <span className="rarity-aura__ember rarity-aura__ember--1" aria-hidden />
          <span className="rarity-aura__ember rarity-aura__ember--2" aria-hidden />
          <span className="rarity-aura__ember rarity-aura__ember--3" aria-hidden />
        </>
      ) : null}
      {showArcs ? <div className="rarity-aura__arc" aria-hidden /> : null}
      <div className="rarity-aura__particles" aria-hidden>
        {Array.from({ length: particles }, (_, i) => (
          <span key={i} className="rarity-aura__particle" />
        ))}
      </div>
      <div className="rarity-aura__shimmer" aria-hidden />
      <div className="rarity-aura__content">{children}</div>
    </div>
  );
}
