import type { SfxRarityTier } from "./types";

const CLASS_MAP: Record<string, SfxRarityTier> = {
  "rarity-thuong": "common",
  "rarity-hiem": "rare",
  "rarity-sieu-hiem": "epic",
  "rarity-combo": "epic",
  "rarity-san-lung": "hunt",
  "rarity-secret": "secret",
  "rarity-rare-secret": "rare_secret",
  "rarity-super-secret": "super_secret",
};

const LABEL_MAP: Record<string, SfxRarityTier> = {
  "Thường": "common",
  "Hiếm": "rare",
  "Siêu Hiếm": "epic",
  Combo: "epic",
  "Săn Lùng": "hunt",
  Secret: "secret",
  "Rare Secret": "rare_secret",
  "Super Secret": "super_secret",
};

/** Map rarity label or CSS class to SFX tier. */
export function rarityToSfxTier(rarityOrClass: string): SfxRarityTier {
  const trimmed = rarityOrClass.trim();
  if (CLASS_MAP[trimmed]) return CLASS_MAP[trimmed];
  if (LABEL_MAP[trimmed]) return LABEL_MAP[trimmed];
  return "common";
}
