import type { PaperBoxStage } from "./packing-paper-box-workflow";
import { embeddedKeyrambitStableId, keyrambitIdFromName } from "./packing-keyrambit-id";
import type { PackingOrder } from "./packing-orders-types";
import type { PackingTableKeyrambitItem, PackingTableSingleItem } from "./packing-warehouse";
import { isOrderShipLabelSingle } from "./packing-printer-layout";
import { silverPacketFilledCount } from "./packing-silver-packet-workflow";
import type { PackingChecklistRow } from "./packing-order-checklist";

function countKeyrambitOnTable(items: PackingTableKeyrambitItem[], keyrambitId: string): number {
  return items.filter((k) => k.keyrambitId === keyrambitId).length;
}

function countWrongKeyrambitsOnTable(
  items: PackingTableKeyrambitItem[],
  requiredId: string,
): PackingTableKeyrambitItem[] {
  return items.filter((k) => k.keyrambitId !== requiredId);
}

function hasPaperBoxOnTable(singles: PackingTableSingleItem[]): boolean {
  return singles.some((s) => s.groupId === "paper_box");
}

function keychainSatisfied(singles: PackingTableSingleItem[]): boolean {
  if (singles.some((s) => s.groupId === "keychain_ring")) return true;
  for (const s of singles) {
    const c = s.silverPacketContents;
    if (c?.keychain) return true;
    if (s.groupId === "paper_box" && s.paperBoxSealedSilverContents?.keychain) return true;
  }
  return false;
}

function silicaSatisfied(singles: PackingTableSingleItem[]): boolean {
  if (singles.some((s) => s.groupId === "silica_gel")) return true;
  for (const s of singles) {
    const c = s.silverPacketContents;
    if (c?.silica) return true;
    if (s.groupId === "paper_box" && s.paperBoxSealedSilverContents?.silica) return true;
  }
  return false;
}

/** Túi bạc còn là đơn trên bàn, hoặc đã nhét vào hộp (không còn đơn silver_*). */
function silverPacketPrepOk(singles: PackingTableSingleItem[]): boolean {
  if (singles.some((s) => s.groupId === "silver_bag" || s.groupId === "silver_sealed_bag")) return true;
  return singles.some((s) => {
    if (s.groupId !== "paper_box") return false;
    const st = s.paperBoxStage ?? "unfold";
    return (
      st === "withSilver" ||
      st === "full" ||
      st === "closed" ||
      st === "inPackingBag" ||
      st === "packingBagDone"
    );
  });
}

/** Keyrambit đúng loại đang nằm trong túi bạc (mở/niêm) hoặc snapshot trong hộp — không còn trên bàn dạng `keyrambit`. */
function countKeyrambitEmbeddedInSingles(singles: PackingTableSingleItem[], requiredKeyrambitId: string): number {
  let n = 0;
  for (const s of singles) {
    const c = s.silverPacketContents;
    if (c?.keyrambit && keyrambitIdFromName(c.keyrambit.name) === requiredKeyrambitId) n += 1;
    if (s.groupId === "paper_box") {
      const b = s.paperBoxSealedSilverContents;
      if (b?.keyrambit && keyrambitIdFromName(b.keyrambit.name) === requiredKeyrambitId) n += 1;
    }
  }
  return n;
}

function listWrongKeyrambitEmbedded(singles: PackingTableSingleItem[], requiredKeyrambitId: string): string[] {
  const out: string[] = [];
  for (const s of singles) {
    const c = s.silverPacketContents;
    if (c?.keyrambit && embeddedKeyrambitStableId(c.keyrambit) !== requiredKeyrambitId) {
      out.push(c.keyrambit.name);
    }
    if (s.groupId === "paper_box") {
      const b = s.paperBoxSealedSilverContents;
      if (b?.keyrambit && embeddedKeyrambitStableId(b.keyrambit) !== requiredKeyrambitId) {
        out.push(b.keyrambit.name);
      }
    }
  }
  return out;
}

function packingBagPrepOk(singles: PackingTableSingleItem[]): boolean {
  if (singles.some((s) => s.groupId === "shipping_bag")) return true;
  return singles.some(
    (s) =>
      s.groupId === "paper_box" &&
      ((s.paperBoxStage ?? "") === "inPackingBag" || (s.paperBoxStage ?? "") === "packingBagDone"),
  );
}

const THANK_CARD_OR_LATER: PaperBoxStage[] = ["full", "closed", "inPackingBag", "packingBagDone"];

function thankYouCardPrepOk(singles: PackingTableSingleItem[]): boolean {
  if (singles.some((s) => s.groupId === "thank_you_card")) return true;
  return singles.some(
    (s) => s.groupId === "paper_box" && THANK_CARD_OR_LATER.includes((s.paperBoxStage ?? "unfold") as PaperBoxStage),
  );
}

function labelPrepOk(singles: PackingTableSingleItem[]): boolean {
  if (singles.some(isOrderShipLabelSingle)) return true;
  return singles.some((s) => s.groupId === "paper_box" && (s.paperBoxStage ?? "") === "packingBagDone");
}

function silverFullyStuffed(contents: { keyrambit?: unknown; keychain: boolean; silica: boolean } | undefined): boolean {
  if (!contents) return false;
  return Boolean(contents.keyrambit) && contents.keychain && contents.silica;
}

function stuffInsideSilverOk(singles: PackingTableSingleItem[]): boolean {
  for (const s of singles) {
    if (s.groupId === "silver_bag" && silverPacketFilledCount(s.silverPacketContents) >= 3) return true;
    if (s.groupId === "silver_sealed_bag" && silverFullyStuffed(s.silverPacketContents)) return true;
    if (s.groupId === "paper_box" && silverFullyStuffed(s.paperBoxSealedSilverContents)) return true;
  }
  return false;
}

function sealedSilverOk(singles: PackingTableSingleItem[]): boolean {
  if (singles.some((s) => s.groupId === "silver_sealed_bag")) return true;
  return singles.some((s) => {
    if (s.groupId !== "paper_box") return false;
    const st = s.paperBoxStage ?? "unfold";
    return st === "withSilver" || st === "full" || st === "closed" || st === "inPackingBag" || st === "packingBagDone";
  });
}

const OPEN_OR_LATER: PaperBoxStage[] = ["open", "withSilver", "full", "closed", "inPackingBag", "packingBagDone"];

function boxOpenOk(singles: PackingTableSingleItem[]): boolean {
  return singles.some(
    (s) => s.groupId === "paper_box" && OPEN_OR_LATER.includes((s.paperBoxStage ?? "unfold") as PaperBoxStage),
  );
}

const WITH_SILVER_OR_LATER: PaperBoxStage[] = ["withSilver", "full", "closed", "inPackingBag", "packingBagDone"];

function boxWithSilverOk(singles: PackingTableSingleItem[]): boolean {
  return singles.some(
    (s) =>
      s.groupId === "paper_box" &&
      WITH_SILVER_OR_LATER.includes((s.paperBoxStage ?? "unfold") as PaperBoxStage),
  );
}

const FULL_OR_LATER: PaperBoxStage[] = ["full", "closed", "inPackingBag", "packingBagDone"];

function boxFullOk(singles: PackingTableSingleItem[]): boolean {
  return singles.some(
    (s) => s.groupId === "paper_box" && FULL_OR_LATER.includes((s.paperBoxStage ?? "unfold") as PaperBoxStage),
  );
}

const CLOSED_OR_LATER: PaperBoxStage[] = ["closed", "inPackingBag", "packingBagDone"];

function boxClosedOk(singles: PackingTableSingleItem[]): boolean {
  return singles.some(
    (s) => s.groupId === "paper_box" && CLOSED_OR_LATER.includes((s.paperBoxStage ?? "unfold") as PaperBoxStage),
  );
}

const IN_BAG_OR_DONE: PaperBoxStage[] = ["inPackingBag", "packingBagDone"];

function boxInPackingBagOk(singles: PackingTableSingleItem[]): boolean {
  return singles.some(
    (s) => s.groupId === "paper_box" && IN_BAG_OR_DONE.includes((s.paperBoxStage ?? "unfold") as PaperBoxStage),
  );
}

function packingBagDoneOk(singles: PackingTableSingleItem[]): boolean {
  return singles.some((s) => s.groupId === "paper_box" && (s.paperBoxStage ?? "") === "packingBagDone");
}

/**
 * Checklist chuẩn bị + đóng gói theo quy trình cố định (không phụ thuộc `requiredPackagingItems` random).
 */
export function buildPackingWorkflowCompletion(
  order: PackingOrder,
  keyrambitsOnTable: PackingTableKeyrambitItem[],
  singlesOnTable: PackingTableSingleItem[],
): { rows: PackingChecklistRow[]; allOk: boolean; wrongKeyrambitNames: string[] } {
  const wrong = countWrongKeyrambitsOnTable(keyrambitsOnTable, order.requiredKeyrambitId);
  const wrongEmbedded = listWrongKeyrambitEmbedded(singlesOnTable, order.requiredKeyrambitId);
  const hasWrong = wrong.length > 0 || wrongEmbedded.length > 0;

  const rightOnTable = countKeyrambitOnTable(keyrambitsOnTable, order.requiredKeyrambitId);
  const rightEmbedded = countKeyrambitEmbeddedInSingles(singlesOnTable, order.requiredKeyrambitId);
  const rightTotal = rightOnTable + rightEmbedded;
  const qtyOk = rightTotal >= order.requiredQuantity;

  const prepRows: PackingChecklistRow[] = [
    {
      id: "prep-kb-right",
      section: "prep",
      label: `Chuẩn bị: đúng Keyrambit (${order.requiredKeyrambitName})`,
      ok: !hasWrong && rightTotal > 0,
      detail: hasWrong
        ? wrong.length > 0
          ? `Đơn cần “${order.requiredKeyrambitName}”, không phải “${wrong[0]!.name}”.`
          : `Đơn cần “${order.requiredKeyrambitName}”, trong túi/hộp có “${wrongEmbedded[0] ?? "?"}”.`
        : rightTotal === 0
          ? "Chưa có Keyrambit trên bàn hoặc trong túi bạc/hộp."
          : undefined,
    },
    {
      id: "prep-kb-qty",
      section: "prep",
      label: `Chuẩn bị: đủ số lượng Keyrambit (${rightTotal}/${order.requiredQuantity})`,
      ok: qtyOk,
      detail: !qtyOk ? `Cần ${order.requiredQuantity} (bàn + trong túi bạc/hộp); hiện ${rightTotal}.` : undefined,
    },
    {
      id: "prep-box",
      section: "prep",
      label: "Chuẩn bị: hộp giấy (box-unfold) trên bàn",
      ok: hasPaperBoxOnTable(singlesOnTable),
      detail: !hasPaperBoxOnTable(singlesOnTable) ? "Chưa có hộp giấy trên bàn." : undefined,
    },
    {
      id: "prep-keyring",
      section: "prep",
      label: "Chuẩn bị: khoen khóa (trên bàn hoặc đã cho vào túi bạc / hộp)",
      ok: keychainSatisfied(singlesOnTable),
      detail: !keychainSatisfied(singlesOnTable) ? "Chưa có khoen trên bàn hoặc trong túi bạc." : undefined,
    },
    {
      id: "prep-silica",
      section: "prep",
      label: "Chuẩn bị: gói hút ẩm (trên bàn hoặc đã cho vào túi bạc / hộp)",
      ok: silicaSatisfied(singlesOnTable),
      detail: !silicaSatisfied(singlesOnTable) ? "Chưa có gói hút ẩm trên bàn hoặc trong túi bạc." : undefined,
    },
    {
      id: "prep-silver",
      section: "prep",
      label: "Chuẩn bị: túi bạc (trên bàn hoặc đã cho vào hộp)",
      ok: silverPacketPrepOk(singlesOnTable),
      detail: !silverPacketPrepOk(singlesOnTable)
        ? "Chưa có túi bạc trên bàn và hộp chưa có bước nhét túi bạc."
        : undefined,
    },
    {
      id: "prep-ship-bag",
      section: "prep",
      label: "Chuẩn bị: túi đóng gói (packing-bag) trên bàn hoặc đã nhét hộp",
      ok: packingBagPrepOk(singlesOnTable),
      detail: !packingBagPrepOk(singlesOnTable) ? "Chưa có túi đóng hàng hoặc hộp trong túi." : undefined,
    },
    {
      id: "prep-card",
      section: "prep",
      label: "Chuẩn bị: thẻ cảm ơn (trên bàn hoặc đã thêm vào hộp)",
      ok: thankYouCardPrepOk(singlesOnTable),
      detail: !thankYouCardPrepOk(singlesOnTable) ? "Chưa có thẻ cảm ơn hoặc hộp chưa đến bước thêm thẻ." : undefined,
    },
    {
      id: "prep-label",
      section: "prep",
      label: "Chuẩn bị: in label đơn (trên bàn hoặc đã dán lên túi hoàn chỉnh)",
      ok: labelPrepOk(singlesOnTable),
      detail: !labelPrepOk(singlesOnTable) ? "Chưa in label hoặc chưa dán lên gói packing-bag-done." : undefined,
    },
  ];

  const packRows: PackingChecklistRow[] = [
    {
      id: "pack-box-open",
      section: "pack",
      label: "Đóng gói: gấp hộp — có box-open",
      ok: boxOpenOk(singlesOnTable),
      detail: !boxOpenOk(singlesOnTable) ? "Chưa có hộp ở trạng thái mở (open) trở đi." : undefined,
    },
    {
      id: "pack-stuff-silver",
      section: "pack",
      label: "Đóng gói: nhồi túi bạc — có stuff-inside-silver-packet (đủ Keyrambit + khoen + hút ẩm)",
      ok: stuffInsideSilverOk(singlesOnTable),
      detail: !stuffInsideSilverOk(singlesOnTable) ? "Túi bạc chưa đủ 3 món (Keyrambit, khoen, hút ẩm)." : undefined,
    },
    {
      id: "pack-sealed",
      section: "pack",
      label: "Đóng gói: hàn miệng — có sealed-silver-packet hoặc đã cho vào hộp",
      ok: sealedSilverOk(singlesOnTable),
      detail: !sealedSilverOk(singlesOnTable) ? "Chưa niêm phong túi bạc hoặc chưa nhét vào hộp." : undefined,
    },
    {
      id: "pack-box-silver",
      section: "pack",
      label: "Đóng gói: nhét túi bạc vào hộp — có box-with-silver-packet",
      ok: boxWithSilverOk(singlesOnTable),
      detail: !boxWithSilverOk(singlesOnTable) ? "Hộp chưa có túi bạc đã niêm phong bên trong." : undefined,
    },
    {
      id: "pack-box-full",
      section: "pack",
      label: "Đóng gói: thêm thẻ cảm ơn — có box-full",
      ok: boxFullOk(singlesOnTable),
      detail: !boxFullOk(singlesOnTable) ? "Hộp chưa đủ (chưa thêm thẻ cảm ơn)." : undefined,
    },
    {
      id: "pack-box-closed",
      section: "pack",
      label: "Đóng gói: đóng hộp — có box-closed",
      ok: boxClosedOk(singlesOnTable),
      detail: !boxClosedOk(singlesOnTable) ? "Hộp chưa đóng." : undefined,
    },
    {
      id: "pack-in-bag",
      section: "pack",
      label: "Đóng gói: cho hộp vào túi đóng hàng — có box-in-packing-bag",
      ok: boxInPackingBagOk(singlesOnTable),
      detail: !boxInPackingBagOk(singlesOnTable) ? "Hộp chưa nằm trong túi đóng hàng." : undefined,
    },
    {
      id: "pack-done",
      section: "pack",
      label: "Đóng gói: dán label — có packing-bag-done",
      ok: packingBagDoneOk(singlesOnTable),
      detail: !packingBagDoneOk(singlesOnTable) ? "Chưa dán label / chưa có ảnh packing-bag-done." : undefined,
    },
  ];

  const rows = [...prepRows, ...packRows];
  const allOk = rows.every((r) => r.ok);
  const wrongKeyrambitNames = [...new Set([...wrong.map((w) => w.name), ...wrongEmbedded])];
  return { rows, allOk, wrongKeyrambitNames };
}
