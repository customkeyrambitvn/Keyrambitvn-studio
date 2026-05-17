import { rarityToFloatMod } from "@/app/components/motion/FloatingItem";

export type AuraPresentation = "grid" | "vault" | "showcase" | "hero" | "ritual";

/** 1 = common … 6 = mythic apex */
export type AuraTier = 1 | 2 | 3 | 4 | 5 | 6;

const TIER_BY_MOD: Record<string, AuraTier> = {
  thuong: 1,
  hiem: 2,
  "sieu-hiem": 3,
  combo: 3,
  "san-lung": 4,
  secret: 5,
  "rare-secret": 5,
  "super-secret": 6,
};

export function rarityToAuraMod(rarity?: string | null): string {
  return rarityToFloatMod(rarity);
}

export function rarityToAuraTier(rarity?: string | null): AuraTier {
  const mod = rarityToAuraMod(rarity);
  return TIER_BY_MOD[mod] ?? 1;
}

export function particleCountForTier(tier: AuraTier, presentation: AuraPresentation): number {
  const base = tier <= 1 ? 2 : tier === 2 ? 4 : tier === 3 ? 5 : tier === 4 ? 6 : tier === 5 ? 7 : 8;
  if (presentation === "grid" || presentation === "ritual") return Math.max(2, base - 2);
  if (presentation === "vault") return base;
  return base;
}
