import type { ReactNode } from "react";
import { ParticleLayer } from "./ParticleLayer";

export type OpeningStagePhase = "pouch-ready" | "pouch-tearing" | "flash" | "revealed" | null;

type OpeningStageProps = {
  phase: OpeningStagePhase;
  children: ReactNode;
  rarityMod?: string;
};

/** Spotlight stage for blind-box opening — shake/glow via CSS phase modifiers. */
export function OpeningStage({ phase, children, rarityMod = "thuong" }: OpeningStageProps) {
  const active = phase && phase !== "revealed";
  const tearing = phase === "pouch-tearing";
  const flash = phase === "flash";
  const ready = phase === "pouch-ready";

  return (
    <section className="opening-overlay" aria-live="polite">
      <ParticleLayer density={flash ? "opening" : "ambient"} className="opening-overlay__particles" />
      <div className="opening-overlay__vignette" aria-hidden />

      <div
        className={[
          "opening-stage",
          active ? "opening-stage--active" : "",
          ready ? "opening-stage--ready" : "",
          tearing ? "opening-stage--tearing" : "",
          flash ? "opening-stage--flash" : "",
          `opening-stage--rarity-${rarityMod}`,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="opening-stage__spotlight" aria-hidden />
        <div className="opening-stage__ring" aria-hidden />
        <div className="opening-stage__floor" aria-hidden />
        <div className="opening-stage__content">{children}</div>
      </div>
    </section>
  );
}
