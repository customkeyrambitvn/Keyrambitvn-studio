import type { ReactNode } from "react";

type FusionChamberProps = {
  children: ReactNode;
  active?: boolean;
  chancePercent?: number;
  targetLabel?: string;
};

/** Pre-fusion ritual arena on the fusion page. */
export function FusionChamber({ children, active = false, chancePercent, targetLabel }: FusionChamberProps) {
  return (
    <div className={`fusion-chamber ${active ? "fusion-chamber--active" : ""}`.trim()}>
      <div className="fusion-chamber__grid" aria-hidden />
      <div className="fusion-chamber__aura" aria-hidden />
      <div className="fusion-chamber__platform" aria-hidden />

      {(targetLabel != null || chancePercent != null) && (
        <div className="fusion-chamber__readout">
          {targetLabel ? (
            <p className="fusion-chamber__target">
              Mục tiêu <span className="text-zinc-100">{targetLabel}</span>
            </p>
          ) : null}
          {chancePercent != null ? (
            <p className="fusion-chamber__chance">
              Cơ hội <span className="font-mono tabular-nums text-[#f5e6b8]">{chancePercent.toFixed(1)}%</span>
            </p>
          ) : null}
        </div>
      )}

      <div className="fusion-chamber__body">{children}</div>
    </div>
  );
}
