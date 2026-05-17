import type { ReactNode } from "react";
import { ParticleLayer } from "../motion/ParticleLayer";
import { CinematicOverlay } from "./CinematicOverlay";
import { RevealBackdrop } from "./RevealBackdrop";

export type RevealStagePhase = "pouch-ready" | "pouch-tearing" | "flash" | "revealed" | null;

type RevealStageProps = {
  phase: RevealStagePhase;
  children: ReactNode;
  rarityMod?: string;
};

/** Ceremonial opening stage — darker focus, spotlight, rarity tint. */
export function RevealStage({ phase, children, rarityMod = "thuong" }: RevealStageProps) {
  const tearing = phase === "pouch-tearing";
  const flash = phase === "flash";
  const ready = phase === "pouch-ready";
  const revealed = phase === "revealed";

  return (
    <CinematicOverlay depth={revealed ? "soft" : "ritual"} className="reveal-stage-overlay">
      <section
        className={[
          "reveal-stage",
          phase ? "reveal-stage--active" : "",
          ready ? "reveal-stage--ready" : "",
          tearing ? "reveal-stage--tearing" : "",
          flash ? "reveal-stage--flash" : "",
          revealed ? "reveal-stage--revealed" : "",
          `reveal-stage--rarity-${rarityMod}`,
        ]
          .filter(Boolean)
          .join(" ")}
        aria-live="polite"
      >
        <ParticleLayer density={flash ? "opening" : "ambient"} className="reveal-stage__particles" />
        <RevealBackdrop active={!revealed} />
        <div className="reveal-stage__spotlight" aria-hidden />
        <div className="reveal-stage__pedestal" aria-hidden />
        <div className="reveal-stage__content">{children}</div>
      </section>
    </CinematicOverlay>
  );
}
