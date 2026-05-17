import type { ReactNode } from "react";
import { RarityAura, type AuraPresentation } from "../aura/RarityAura";

type RarityGlowProps = {
  children: ReactNode;
  rarity?: string | null;
  className?: string;
  /** Larger aura for reveal hero. */
  variant?: "inline" | "hero";
};

/** @deprecated Prefer `RarityAura` — thin alias for reveal / legacy call sites. */
export function RarityGlow({ children, rarity, className = "", variant = "inline" }: RarityGlowProps) {
  const presentation: AuraPresentation = variant === "hero" ? "hero" : "grid";
  return (
    <RarityAura rarity={rarity} presentation={presentation} className={className}>
      {children}
    </RarityAura>
  );
}
