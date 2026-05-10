/** Category label from product name; first matching rule wins. */
export function productCategory(productName: string): string {
  const name = productName;

  if (/phụ kiện/i.test(name)) {
    return "Phụ Kiện";
  }
  if (name.includes("Aura Sword")) {
    return "Aura Sword";
  }
  if (name.includes("Trống Đồng")) {
    return "Việt Nam Huyền Sử";
  }
  if (name.includes("Rồng Thời Lý")) {
    return "Lịch Sử Việt Nam";
  }
  if (name.includes("Lạc Hồng")) {
    return "Văn Hóa Việt Nam";
  }
  if (name.includes("WC")) {
    return "Bóng Đá";
  }
  if (name.includes("Naruto")) {
    return "Naruto";
  }
  if (name.includes("Pokemon")) {
    return "Pokemon";
  }
  if (name.includes("Kamenrider")) {
    return "Kamenrider";
  }
  const lower = name.toLowerCase();
  if (lower.includes("mech")) {
    return "Mecha";
  }
  if (name.includes("Kimetsu no Yaiba")) {
    return "Kimetsu";
  }
  if (name.includes("One Piece")) {
    return "One Piece";
  }
  if (name.includes("My Hero Academia")) {
    return "MHA";
  }
  if (name.includes("Solo Leveling")) {
    return "Solo Leveling";
  }

  return "Khác";
}
