/** Presentation-only rarity flash palette for pouch reveal (not game logic). */

export type FlashPalette = { core: string; ring: string; ambient: string };

export function flashColorsForRarity(rarity: string): FlashPalette {
  switch (rarity) {
    case "Thường":
      return {
        core: "rgba(241, 245, 249, 0.94)",
        ring: "rgba(255, 255, 255, 0.8)",
        ambient: "rgba(148, 163, 184, 0.45)",
      };
    case "Hiếm":
      return {
        core: "rgba(56, 189, 248, 0.92)",
        ring: "rgba(96, 165, 250, 0.82)",
        ambient: "rgba(14, 165, 233, 0.48)",
      };
    case "Siêu Hiếm":
      return {
        core: "rgba(168, 85, 247, 0.92)",
        ring: "rgba(192, 132, 252, 0.78)",
        ambient: "rgba(126, 34, 206, 0.42)",
      };
    case "Combo":
      return {
        core: "rgba(52, 211, 153, 0.9)",
        ring: "rgba(74, 222, 128, 0.72)",
        ambient: "rgba(16, 185, 129, 0.4)",
      };
    case "Săn Lùng":
      return {
        core: "rgba(251, 146, 60, 0.92)",
        ring: "rgba(251, 191, 36, 0.75)",
        ambient: "rgba(234, 88, 12, 0.4)",
      };
    case "Secret":
      return {
        core: "rgba(248, 113, 113, 0.93)",
        ring: "rgba(239, 68, 68, 0.8)",
        ambient: "rgba(185, 28, 28, 0.45)",
      };
    case "Rare Secret":
      return {
        core: "rgba(244, 114, 182, 0.92)",
        ring: "rgba(217, 70, 239, 0.78)",
        ambient: "rgba(192, 38, 211, 0.4)",
      };
    case "Super Secret":
      return {
        core: "rgba(253, 224, 71, 0.95)",
        ring: "rgba(250, 204, 21, 0.88)",
        ambient: "rgba(234, 179, 8, 0.48)",
      };
    default:
      return {
        core: "rgba(201, 162, 39, 0.9)",
        ring: "rgba(245, 230, 184, 0.75)",
        ambient: "rgba(120, 100, 60, 0.35)",
      };
  }
}

export const FLASH_BURST_PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  left: 20 + ((i * 41) % 60),
  top: 24 + ((i * 31) % 52),
  px: ((i % 5) - 2) * 36 + (i % 2) * 6,
  py: ((i % 4) - 1.5) * 32,
  delay: i * 0.024,
}));
