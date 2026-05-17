import Link from "next/link";

/** Visual control hints — only real navigation where logic exists. */
export function InventoryHintBar() {
  return (
    <nav className="inventory-hint-bar" aria-label="Phím tắt gợi ý">
      <Link href="/" className="inventory-hint-bar__item">
        <kbd className="inventory-hint-bar__key">Esc</kbd>
        <span>Quay lại</span>
      </Link>
      <span className="inventory-hint-bar__item inventory-hint-bar__item--muted" aria-disabled>
        <kbd className="inventory-hint-bar__key">I</kbd>
        <span>Xem chi tiết</span>
      </span>
      <span className="inventory-hint-bar__item inventory-hint-bar__item--muted" aria-disabled>
        <kbd className="inventory-hint-bar__key">F</kbd>
        <span>Yêu thích</span>
      </span>
      <Link href="/" className="inventory-hint-bar__item inventory-hint-bar__item--accent">
        <kbd className="inventory-hint-bar__key">O</kbd>
        <span>Mở box</span>
      </Link>
    </nav>
  );
}
