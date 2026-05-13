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
