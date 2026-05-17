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
