"use client";

import type { PointerEvent, RefObject } from "react";
import { rarityFlashStyle } from "./RarityFlash";
import { flashColorsForRarity } from "@/lib/opening-visual";
import { ProductImageBox } from "../ProductImageBox";
import { ParticleLayer } from "../motion/ParticleLayer";

const LASER_SPARK_COUNT = 12;

export type PouchCeremonyPhase = "pouch-ready" | "pouch-tearing" | "flash";

type MetallicPouchProps = {
  phase: PouchCeremonyPhase;
  tearProgress: number;
  stripFlyOff: boolean;
  laserActive: boolean;
  isPointerDown: boolean;
  rarity: string;
  boxName?: string;
  itemName?: string;
  itemImage?: string;
  tearStripRef: RefObject<HTMLDivElement | null>;
  onTearPointerDown: (e: PointerEvent<HTMLDivElement>) => void;
  onTearPointerMove: (e: PointerEvent<HTMLDivElement>) => void;
  onTearPointerUp: (e: PointerEvent<HTMLDivElement>) => void;
  onTearPointerCancel: (e: PointerEvent<HTMLDivElement>) => void;
};

/** Iconic silver pouch — metallic sheen, tension, tear ceremony. */
export function MetallicPouch({
  phase,
  tearProgress,
  stripFlyOff,
  laserActive,
  isPointerDown,
  rarity,
  boxName,
  itemName,
  itemImage,
  tearStripRef,
  onTearPointerDown,
  onTearPointerMove,
  onTearPointerUp,
  onTearPointerCancel,
}: MetallicPouchProps) {
  const p = tearProgress;
  const ready = phase === "pouch-ready";
  const tearing = phase === "pouch-tearing";
  const flash = phase === "flash";
  const tension = tearing || p > 0.12;
  const palette = flashColorsForRarity(rarity);

  return (
    <div
      className={[
        "metallic-pouch",
        ready ? "metallic-pouch--ready" : "",
        tearing ? "metallic-pouch--tearing" : "",
        tension ? "metallic-pouch--tension" : "",
        flash ? "metallic-pouch--flash" : "",
        isPointerDown ? "metallic-pouch--pressed" : "",
      ]
        .filter(Boolean)
        .join(" ")}
      style={rarityFlashStyle(palette)}
    >
      <ParticleLayer density="ambient" className="metallic-pouch__particles" />

      <div className="metallic-pouch__halo" aria-hidden />
      <div className="metallic-pouch__leak" aria-hidden />

      {ready || tearing ? (
        <div className="metallic-pouch__copy">
          <p className="store-kicker">Niêm phong bạc</p>
          {boxName ? <p className="mt-1 text-xs text-zinc-500">{boxName}</p> : null}
          <p className="mt-3 text-sm font-medium text-zinc-200">Kéo ngang qua vạch nét đứt</p>
        </div>
      ) : null}

      {flash ? <p className="metallic-pouch__opening-text">Đang hé lộ…</p> : null}

      <div className="metallic-pouch__stage">
        <div className="foil-pouch-scene metallic-pouch__scene">
          <div className="foil-pouch-perspective">
            <div className="foil-pouch-tilt metallic-pouch__tilt">
              <div className="foil-pouch-inner">
                <div className={`foil-bag metallic-pouch__bag ${stripFlyOff ? "foil-bag--split" : ""}`}>
                  <div className="metallic-pouch__sheen" aria-hidden />
                  <div className="metallic-pouch__specular" aria-hidden />
                  <div className="foil-crinkle" aria-hidden />
                  <div className="foil-shine-sweep metallic-pouch__shine-sweep" aria-hidden />
                  <div className="foil-seal foil-seal--left" aria-hidden />
                  <div className="foil-seal foil-seal--right" aria-hidden />
                  <div className="foil-seal foil-seal--bottom" aria-hidden />
                  <div className="foil-notch foil-notch--l" aria-hidden />
                  <div className="foil-notch foil-notch--r" aria-hidden />
                  <div className="foil-tear-track" aria-hidden>
                    <div className={`foil-tear-dash metallic-pouch__tear-line ${laserActive ? "foil-tear-dash--hot metallic-pouch__tear-line--hot" : ""}`} />
                  </div>
                  <div className="foil-panel foil-panel--upper" />
                  {flash && itemName ? (
                    <div className="metallic-pouch__preview">
                      <ProductImageBox
                        name={itemName}
                        image={itemImage}
                        rarity={rarity}
                        imageFit="contain"
                        idleMotion={false}
                        useAura={false}
                        className="metallic-pouch__preview-img"
                      />
                    </div>
                  ) : null}
                  <div className="foil-panel foil-panel--lower">
                    <span className="foil-brand-micro">KEYRAMBIT</span>
                  </div>
                </div>

                <div className="laser-cut-layer laser-cut-layer--foil" aria-hidden>
                  <div className={`laser-cut-guide ${laserActive ? "laser-cut-guide--active" : ""}`} />
                  <div className="laser-cut-opened" style={{ width: `${Math.min(100, p * 100)}%` }} />
                  <div className="laser-cut-edge" style={{ left: `${Math.min(99.5, Math.max(0, p * 100))}%` }} />
                  <div
                    className="laser-cut-head"
                    style={{
                      left: `${Math.min(100, Math.max(0, p * 100))}%`,
                      opacity: p < 0.02 ? 0 : 0.85 + p * 0.15,
                    }}
                  />
                  {Array.from({ length: LASER_SPARK_COUNT }, (_, i) => {
                    if (p * LASER_SPARK_COUNT < i) return null;
                    return (
                      <span
                        key={`lz-${i}`}
                        className="laser-spark"
                        style={{
                          left: `${((i + 0.5) / LASER_SPARK_COUNT) * Math.min(100, p * 100)}%`,
                        }}
                      />
                    );
                  })}
                </div>

                <div
                  ref={tearStripRef}
                  className={`laser-cut-hit laser-cut-hit--foil ${isPointerDown ? "laser-cut-hit--dragging" : ""} ${flash ? "laser-cut-hit--blocked" : ""}`}
                  style={{ touchAction: "none" }}
                  onPointerDown={onTearPointerDown}
                  onPointerMove={onTearPointerMove}
                  onPointerUp={onTearPointerUp}
                  onPointerCancel={onTearPointerCancel}
                >
                  <div className="laser-cut-hit-rail">
                    <div className="laser-cut-hit-fill metallic-pouch__cut-fill" style={{ width: `${Math.min(100, p * 100)}%` }} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {(ready || tearing) && (
        <div className="metallic-pouch__progress">
          <div className="opening-progress">
            <div className="opening-progress__fill" style={{ width: `${Math.min(100, p * 100)}%` }} />
          </div>
        </div>
      )}
    </div>
  );
}
