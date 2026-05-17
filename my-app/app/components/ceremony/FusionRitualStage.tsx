"use client";

import type { CSSProperties } from "react";
import { ProductImageBox } from "../ProductImageBox";
import { CinematicOverlay } from "./CinematicOverlay";
import { EnergyPulse } from "./EnergyPulse";
import { FloatingArtifact } from "./FloatingArtifact";
import { RevealBackdrop } from "./RevealBackdrop";

type InventoryItem = {
  id: string;
  name: string;
  rarity: string;
  image?: string;
};

type RitualPhase = "idle" | "slots" | "fly" | "forge" | "strike" | "success" | "fail";

type FusionRitualStageProps = {
  phase: RitualPhase;
  items: InventoryItem[];
  normalizeRarity: (r: string) => string;
  rarityClass: (r: string) => string;
  rarityGlowStyle: (r: string) => CSSProperties;
  outcomeItem?: InventoryItem;
  onSkip: () => void;
};

/** Full-screen fusion ritual — orbit, compress, implosion, reveal (presentation only). */
export function FusionRitualStage({
  phase,
  items,
  normalizeRarity,
  rarityClass,
  rarityGlowStyle,
  outcomeItem,
  onSkip,
}: FusionRitualStageProps) {
  const n = items.length;
  const flying = phase === "fly" || phase === "forge" || phase === "strike";
  const compress = phase === "forge" || phase === "strike";
  const implode = phase === "strike";
  const successFx = phase === "success";
  const failFx = phase === "fail";

  const pulseVariant = failFx ? "fail" : successFx ? "success" : implode ? "implode" : compress ? "charge" : "idle";

  return (
    <CinematicOverlay depth="ritual" className={`fusion-ritual ${implode ? "fusion-ritual--implode" : ""} ${successFx ? "fusion-ritual--success" : ""} ${failFx ? "fusion-ritual--fail" : ""}`}>
      <section className="fusion-ritual__stage" role="dialog" aria-modal="true" aria-label="Dung hợp">
        <button type="button" onClick={onSkip} className="fusion-ritual__skip store-btn store-btn--ghost store-btn--sm">
          Bỏ qua
        </button>

        <p className="fusion-ritual__kicker store-kicker">Nghi lễ dung hợp</p>

        <div className={`fusion-ritual__orbit ${flying ? "fusion-ritual__orbit--collapse" : ""}`}>
          {items.map((item, i) => {
            const angle = (360 / Math.max(n, 1)) * i;
            return (
              <div
                key={item.id}
                className="fusion-ritual__orbit-slot"
                style={
                  {
                    ["--orbit-angle" as string]: `${angle}deg`,
                    ["--orbit-delay" as string]: `${i * 0.06}s`,
                  } as CSSProperties
                }
              >
                <FloatingArtifact
                  name={item.name}
                  image={item.image}
                  rarity={normalizeRarity(item.rarity)}
                  rarityClass={rarityClass(item.rarity)}
                  orbitIndex={i}
                  orbitTotal={n}
                  size="sm"
                />
              </div>
            );
          })}
        </div>

        <div className="fusion-ritual__core">
          <RevealBackdrop active />
          <EnergyPulse variant={pulseVariant} className="fusion-ritual__pulse" />
          {compress && <div className="fusion-ritual__threads" aria-hidden />}
          {implode && <div className="fusion-ritual__implosion-flash" aria-hidden />}
        </div>

        {successFx && outcomeItem ? (
          <div className="fusion-ritual__result fusion-ritual__result--success" style={rarityGlowStyle(outcomeItem.rarity)}>
            <p className="store-kicker">Dung hợp thành công</p>
            <div className="fusion-ritual__result-visual">
              <ProductImageBox
                name={outcomeItem.name}
                image={outcomeItem.image}
                rarity={normalizeRarity(outcomeItem.rarity)}
                imageFit="contain"
                frameless
                idleMotion={false}
                auraPresentation="showcase"
                interactiveAura
              />
            </div>
            <p className="fusion-ritual__result-name">{outcomeItem.name}</p>
          </div>
        ) : null}

        {failFx ? (
          <div className="fusion-ritual__result fusion-ritual__result--fail">
            <div className="fusion-ritual__fail-dust" aria-hidden />
            <p className="fusion-ritual__fail-text">Năng lượng tan rã</p>
            <p className="mt-1 text-sm text-zinc-500">Vật phẩm đã hòa vào hư không</p>
          </div>
        ) : null}

        {phase === "slots" || phase === "fly" ? (
          <p className="fusion-ritual__hint">Vật phẩm đang quy tụ về lõi…</p>
        ) : null}
      </section>
    </CinematicOverlay>
  );
}
