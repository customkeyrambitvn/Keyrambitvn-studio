const PKG = "/minigames/packing-simulator/assets/packaging";

/** Ảnh túi bạc trống (kho `silver_bag`). */
export const SILVER_PACKET_EMPTY_SRC = `${PKG}/silver-packet.png`;

/** Ảnh túi đã có đồ bên trong — dùng khi đã bắt đầu nhồi (≥1/3). */
export const SILVER_PACKET_STUFF_INSIDE_SRC = `${PKG}/stuff-inside-silver-packet.png`;

export type SilverPacketRestoreSnapshot = {
  name: string;
  image?: string;
  rarity: string;
  boxName: string;
};

export type SilverPacketContents = {
  keyrambit?: SilverPacketRestoreSnapshot;
  keychain: boolean;
  silica: boolean;
};

export function emptySilverPacketContents(): SilverPacketContents {
  return { keychain: false, silica: false };
}

export function silverPacketFilledCount(contents: SilverPacketContents | undefined): number {
  if (!contents) return 0;
  return (contents.keyrambit ? 1 : 0) + (contents.keychain ? 1 : 0) + (contents.silica ? 1 : 0);
}

/** Bản sao sâu để gắn vào `silver_sealed_bag` sau niêm phong (không chia sẻ tham chiếu với túi đang nhồi). */
export function cloneSilverPacketContentsSnapshot(c: SilverPacketContents): SilverPacketContents {
  return {
    keychain: c.keychain,
    silica: c.silica,
    ...(c.keyrambit
      ? {
          keyrambit: {
            name: c.keyrambit.name,
            rarity: c.keyrambit.rarity,
            boxName: c.keyrambit.boxName,
            ...(c.keyrambit.image ? { image: c.keyrambit.image } : {}),
          },
        }
      : {}),
  };
}

/** Một dòng mô tả nội dung đã niêm (hiển thị dưới asset). */
export function formatSealedSilverPacketCaption(c: SilverPacketContents): string {
  const bits: string[] = [];
  if (c.keyrambit) bits.push(c.keyrambit.name);
  if (c.keychain) bits.push("Khoen khóa");
  if (c.silica) bits.push("Gói hút ẩm");
  const s = bits.join(" · ");
  return s.length > 72 ? `${s.slice(0, 69)}…` : s;
}

export function silverPacketSrcForContents(
  contents: SilverPacketContents | undefined,
  emptyFallback: string,
): string {
  return silverPacketFilledCount(contents) > 0 ? SILVER_PACKET_STUFF_INSIDE_SRC : emptyFallback;
}

export function isSilverBagTableItem(groupId: string): boolean {
  return groupId === "silver_bag";
}

/** Tâm thả nằm trong vùng túi bạc (layout px). */
export function silverPacketOpenDropHit(
  dropCenterX: number,
  dropCenterY: number,
  bag: { x: number; y: number; width: number; height: number },
): boolean {
  const padX = bag.width * 0.14;
  const padY = bag.height * 0.12;
  return (
    dropCenterX >= bag.x + padX &&
    dropCenterX <= bag.x + bag.width - padX &&
    dropCenterY >= bag.y + padY &&
    dropCenterY <= bag.y + bag.height - padY
  );
}

export type SilverPacketDragKind = "keyrambit" | "keychain" | "silica";

export function canDropIntoSilverPacket(
  bagContents: SilverPacketContents | undefined,
  kind: SilverPacketDragKind,
): boolean {
  const c = bagContents ?? emptySilverPacketContents();
  if (silverPacketFilledCount(c) >= 3) return false;
  if (kind === "keyrambit") return !c.keyrambit;
  if (kind === "keychain") return !c.keychain;
  return !c.silica;
}
