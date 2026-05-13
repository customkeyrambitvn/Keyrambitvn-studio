const PKG = "/minigames/packing-simulator/assets/packaging";

/** Giai đoạn UX hộp giấy đơn (`paper_box`) trên bàn đóng hàng. */
export type PaperBoxStage =
  | "unfold"
  | "folding1"
  | "folding2"
  | "open"
  | "withSilver"
  | "full"
  | "closed"
  /** Hộp đã đóng đã cho vào túi đóng hàng (`shipping_bag`). */
  | "inPackingBag"
  /** Đã dán label đơn lên hộp trong túi — ảnh `packing-bag-done`. */
  | "packingBagDone";

export function paperBoxSrcForStage(stage: PaperBoxStage): string {
  const m: Record<PaperBoxStage, string> = {
    unfold: `${PKG}/box-unfold.png`,
    folding1: `${PKG}/box-folding-1.png`,
    folding2: `${PKG}/box-folding-2.png`,
    open: `${PKG}/box-open.png`,
    withSilver: `${PKG}/box-with-silver-packet.png`,
    full: `${PKG}/box-full.png`,
    closed: `${PKG}/box-closed.png`,
    inPackingBag: `${PKG}/box-in-packing-bag.png`,
    packingBagDone: `${PKG}/packing-bag-done.png`,
  };
  return m[stage];
}

export function initialPaperBoxStage(): PaperBoxStage {
  return "unfold";
}

/** Tap: chỉ gấp đến `open`, rồi `full` → `closed`. Các bước còn lại bằng thả vật phẩm. */
export function paperBoxTapAdvance(stage: PaperBoxStage): PaperBoxStage | null {
  if (stage === "unfold") return "folding1";
  if (stage === "folding1") return "folding2";
  if (stage === "folding2") return "open";
  if (stage === "full") return "closed";
  return null;
}

export function isPaperBoxWorkflowItem(groupId: string): boolean {
  return groupId === "paper_box";
}

/** Đơn niêm phong dùng cho bước thả vào hộp mở (src hoặc nhóm kho). */
export function isSealedSilverPacketSingle(item: { groupId: string; src: string }): boolean {
  if (item.groupId === "silver_sealed_bag") return true;
  const u = (item.src.split("?")[0] ?? "").toLowerCase();
  return u.includes("sealed-silver-packet");
}

export function isThankYouCardSingle(item: { groupId: string }): boolean {
  return item.groupId === "thank_you_card";
}

/** Tâm vật thả nằm trong vùng “miệng hộp” (layout px). */
export function paperBoxOpenDropHit(
  dropCenterX: number,
  dropCenterY: number,
  box: { x: number; y: number; width: number; height: number },
): boolean {
  const padX = box.width * 0.18;
  const padY = box.height * 0.14;
  return (
    dropCenterX >= box.x + padX &&
    dropCenterX <= box.x + box.width - padX &&
    dropCenterY >= box.y + padY &&
    dropCenterY <= box.y + box.height - padY
  );
}

/** Tâm hộp đóng nằm trong vùng “miệng túi” (layout px) để nhét vào `shipping_bag`. */
export function packingBagClosedBoxDropHit(
  dropCenterX: number,
  dropCenterY: number,
  bag: { x: number; y: number; width: number; height: number },
): boolean {
  const padX = bag.width * 0.16;
  const mouthBottom = bag.y + bag.height * 0.52;
  const padTop = bag.height * 0.1;
  return (
    dropCenterX >= bag.x + padX &&
    dropCenterX <= bag.x + bag.width - padX &&
    dropCenterY >= bag.y + padTop &&
    dropCenterY <= mouthBottom
  );
}

/** Tâm label (`order_ship_label`) trên hộp đang `inPackingBag` → chuyển `packingBagDone`. */
export function paperBoxInPackingBagLabelDropHit(
  dropCenterX: number,
  dropCenterY: number,
  box: { x: number; y: number; width: number; height: number },
): boolean {
  const padX = box.width * 0.1;
  const padY = box.height * 0.08;
  return (
    dropCenterX >= box.x + padX &&
    dropCenterX <= box.x + box.width - padX &&
    dropCenterY >= box.y + padY &&
    dropCenterY <= box.y + box.height - padY
  );
}
