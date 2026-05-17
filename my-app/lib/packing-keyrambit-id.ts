/** Id ổn định theo tên sản phẩm (kho thật không có product id riêng). */
export function keyrambitIdFromName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Snapshot trong túi bạc/hộp: ưu `keyrambitId` lúc nhét (bàn → túi), fallback chuẩn hóa `name`. */
export function embeddedKeyrambitStableId(snapshot: { keyrambitId?: string; name: string }): string {
  const fromField = snapshot.keyrambitId?.trim();
  if (fromField) return fromField;
  return keyrambitIdFromName(snapshot.name);
}
