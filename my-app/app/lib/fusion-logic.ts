import type { ProductDef } from "../data/products";
import { ITEMS_BY_RARITY } from "../data/products";

export type InventoryRarity =
  | "Thường"
  | "Hiếm"
  | "Siêu Hiếm"
  | "Combo"
  | "Săn Lùng"
  | "Secret"
  | "Rare Secret"
  | "Super Secret";

export type NormalRecipeId = "thuong-hiem" | "hiem-sieu" | "sieu-sanlung";

export type HighTargetRarity = "Secret" | "Rare Secret" | "Super Secret";

export const FUSION_BOX_NAME = "Dung Hợp";

export const NORMAL_RECIPES: Record<
  NormalRecipeId,
  { label: string; input: InventoryRarity; output: InventoryRarity; perItemPercent: number; maxSlots: 5 }
> = {
  "thuong-hiem": {
    label: "Thường → Hiếm",
    input: "Thường",
    output: "Hiếm",
    perItemPercent: 20,
    maxSlots: 5,
  },
  "hiem-sieu": {
    label: "Hiếm → Siêu Hiếm",
    input: "Hiếm",
    output: "Siêu Hiếm",
    perItemPercent: 15,
    maxSlots: 5,
  },
  "sieu-sanlung": {
    label: "Siêu Hiếm → Săn Lùng",
    input: "Siêu Hiếm",
    output: "Săn Lùng",
    perItemPercent: 10,
    maxSlots: 5,
  },
};

const HIGH_ALLOWED: InventoryRarity[] = ["Thường", "Hiếm", "Siêu Hiếm", "Săn Lùng"];

export const HIGH_TARGET_CONTRIB: Record<
  HighTargetRarity,
  Record<"Thường" | "Hiếm" | "Siêu Hiếm" | "Săn Lùng", number>
> = {
  Secret: { "Thường": 2, "Hiếm": 5, "Siêu Hiếm": 8, "Săn Lùng": 20 },
  "Rare Secret": { "Thường": 1, "Hiếm": 3, "Siêu Hiếm": 5, "Săn Lùng": 15 },
  "Super Secret": { "Thường": 0.5, "Hiếm": 2, "Siêu Hiếm": 3, "Săn Lùng": 12 },
};

export const HIGH_MAX_SLOTS = 10;

export function normalizeInventoryRarity(raw: string): InventoryRarity {
  const t = raw.trim();
  const map: Record<string, InventoryRarity> = {
    "Thường": "Thường",
    "Hiếm": "Hiếm",
    "Siêu Hiếm": "Siêu Hiếm",
    "Combo": "Combo",
    "Săn Lùng": "Săn Lùng",
    Secret: "Secret",
    "Rare Secret": "Rare Secret",
    "Super Secret": "Super Secret",
  };
  return map[t] ?? "Thường";
}

export function normalFusionChance(recipe: NormalRecipeId, filledCount: number): number {
  const def = NORMAL_RECIPES[recipe];
  return Math.min(100, filledCount * def.perItemPercent);
}

export function highFusionChance(target: HighTargetRarity, rarities: InventoryRarity[]): number {
  const table = HIGH_TARGET_CONTRIB[target];
  let sum = 0;
  for (const r of rarities) {
    if (r in table) sum += table[r as keyof typeof table];
  }
  return Math.min(100, sum);
}

export function isHighTierInputAllowed(r: InventoryRarity): boolean {
  return HIGH_ALLOWED.includes(r);
}

export function rollSuccess(percent: number): boolean {
  if (percent <= 0) return false;
  if (percent >= 100) return true;
  return Math.random() * 100 < percent;
}

export function pickRandomProduct(rarity: InventoryRarity): ProductDef {
  const list = ITEMS_BY_RARITY[rarity as keyof typeof ITEMS_BY_RARITY];
  const arr = Array.isArray(list) ? list : [];
  if (arr.length === 0) {
    return { name: "Keyrambit S1 Trắng" };
  }
  return arr[Math.floor(Math.random() * arr.length)];
}
