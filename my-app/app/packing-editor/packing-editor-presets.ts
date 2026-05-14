/** Must match `public/minigames/packing-simulator/assets/...` */
const MG = "/minigames/packing-simulator/assets";

export type PackingEditorPreset = {
  label: string;
  src: string;
  defaultWidth: number;
  defaultHeight: number;
};

/** Default sizes are in stage pixels (1920×1080); tweak in editor after placing. */
export const PACKING_EDITOR_PRESETS: readonly PackingEditorPreset[] = [
  { label: "Background 1", src: `${MG}/background/background-1-mobile.png`, defaultWidth: 1920, defaultHeight: 1080 },
  { label: "Background 1 (mobile)", src: `${MG}/background/background-1-mobile.png`, defaultWidth: 1080, defaultHeight: 1920 },
  { label: "Background 1 (alt file)", src: `${MG}/background/bacground-1.png`, defaultWidth: 1920, defaultHeight: 1080 },
  { label: "Desk 1 (full)", src: `${MG}/desk/desk-1/desk-1.png`, defaultWidth: 1680, defaultHeight: 520 },
  { label: "Desk 1 (mobile file)", src: `${MG}/desk/desk-1/desk-1-mobile.png`, defaultWidth: 1680, defaultHeight: 520 },
  { label: "Desk 1 (assets copy)", src: "/assets/packing/desk/desk-1/desk-1.png", defaultWidth: 1680, defaultHeight: 520 },
  { label: "Top desk 1", src: `${MG}/desk/desk-1/topdesk-1.png`, defaultWidth: 1720, defaultHeight: 420 },
  { label: "Workstation desk 1", src: `${MG}/workstation/desk-1.png`, defaultWidth: 1400, defaultHeight: 480 },
  /** `public/minigames/packing-simulator/assets/packaging/printer*.png` */
  { label: "Printer", src: `${MG}/packaging/printer.png`, defaultWidth: 400, defaultHeight: 460 },
  { label: "Printer + order", src: `${MG}/packaging/printer-with-order.png`, defaultWidth: 420, defaultHeight: 480 },
  { label: "Heater", src: `${MG}/packaging/heater.png`, defaultWidth: 380, defaultHeight: 420 },
  { label: "Box unfold", src: `${MG}/packaging/box-unfold.png`, defaultWidth: 420, defaultHeight: 360 },
  { label: "Box folding 1", src: `${MG}/packaging/box-folding-1.png`, defaultWidth: 400, defaultHeight: 340 },
  { label: "Box folding 2", src: `${MG}/packaging/box-folding-2.png`, defaultWidth: 400, defaultHeight: 340 },
  { label: "Box open", src: `${MG}/packaging/box-open.png`, defaultWidth: 380, defaultHeight: 320 },
  { label: "Box with silver packet", src: `${MG}/packaging/box-with-silver-packet.png`, defaultWidth: 380, defaultHeight: 320 },
  { label: "Box full", src: `${MG}/packaging/box-full.png`, defaultWidth: 380, defaultHeight: 320 },
  { label: "Box closed", src: `${MG}/packaging/box-closed.png`, defaultWidth: 360, defaultHeight: 300 },
  { label: "Group box", src: `${MG}/packaging/group-box.png`, defaultWidth: 220, defaultHeight: 200 },
  { label: "Box in packing bag", src: `${MG}/packaging/box-in-packing-bag.png`, defaultWidth: 400, defaultHeight: 360 },
  { label: "Packing bag", src: `${MG}/packaging/packing-bag.png`, defaultWidth: 380, defaultHeight: 420 },
  { label: "Packing bag (done)", src: `${MG}/packaging/packing-bag-done.png`, defaultWidth: 380, defaultHeight: 420 },
  { label: "Group packing bag", src: `${MG}/packaging/group-packing-bag.png`, defaultWidth: 200, defaultHeight: 220 },
  { label: "Silver packet", src: `${MG}/packaging/silver-packet.png`, defaultWidth: 200, defaultHeight: 240 },
  { label: "Silver packet (stuff)", src: `${MG}/packaging/stuff-inside-silver-packet.png`, defaultWidth: 200, defaultHeight: 240 },
  { label: "Silver packet (sealed)", src: `${MG}/packaging/sealed-silver-packet.png`, defaultWidth: 200, defaultHeight: 240 },
  { label: "Group silver packet", src: `${MG}/packaging/group-silver-packet.png`, defaultWidth: 220, defaultHeight: 200 },
  { label: "Silica gel", src: `${MG}/packaging/silica-gel-packet.png`, defaultWidth: 80, defaultHeight: 110 },
  { label: "Group silica", src: `${MG}/packaging/group-silica-gel-packet.png`, defaultWidth: 140, defaultHeight: 120 },
  { label: "Keyring", src: `${MG}/packaging/keyring.png`, defaultWidth: 100, defaultHeight: 100 },
  { label: "Group keyring", src: `${MG}/packaging/group-keyring.png`, defaultWidth: 140, defaultHeight: 120 },
  { label: "Thank you card", src: `${MG}/packaging/thank-you-card.png`, defaultWidth: 200, defaultHeight: 140 },
  { label: "Group thank you card", src: `${MG}/packaging/group-thank-you-card.png`, defaultWidth: 220, defaultHeight: 160 },
];
