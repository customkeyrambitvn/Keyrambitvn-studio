/** Legacy WAV ids — mapped to procedural events when possible. */
export const SFX_IDS = [
  "ui_hover_soft",
  "ui_click",
  "box_open",
  "reveal_flash",
  "item_reveal",
  "fusion_start",
  "fusion_success",
  "fusion_fail",
  "toast",
  "modal_close",
] as const;

export type SfxId = (typeof SFX_IDS)[number];

export type SfxRarityTier =
  | "common"
  | "rare"
  | "epic"
  | "hunt"
  | "secret"
  | "rare_secret"
  | "super_secret";

export type SfxHoverKind = "ui" | "rarity" | "selected";

export type SfxSpatial = "center" | "side";

export type SfxBoxStep = "lock" | "charge" | "release" | "flash" | "finish";

export type SfxFusionStep = "start" | "success" | "fail";

export type SfxEvent =
  | { type: "hover"; kind: SfxHoverKind; spatial?: SfxSpatial }
  | { type: "click"; spatial?: SfxSpatial }
  | { type: "select"; tier: SfxRarityTier; spatial?: SfxSpatial }
  | { type: "rarity_finish"; tier: SfxRarityTier; spatial?: SfxSpatial }
  | { type: "box"; step: SfxBoxStep; tier?: SfxRarityTier }
  | { type: "fusion"; step: SfxFusionStep }
  | { type: "toast" }
  | { type: "modal_close" }
  | { type: "legacy"; id: SfxId };
