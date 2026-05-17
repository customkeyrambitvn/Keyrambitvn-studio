"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { INVENTORY_CHANGED_EVENT, readLocalInventory } from "../../lib/inventory-local";

const tabs = [
  { href: "/", label: "Store" },
  { href: "/packing", label: "Đóng Hàng" },
  { href: "/fusion", label: "Dung Hợp" },
  { href: "/inventory", label: "Kho Keyrambit", showInventoryCount: true },
  { href: "/collection", label: "Bộ Sưu Tập" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SiteMainNav() {
  const pathname = usePathname();
  const [inventoryCount, setInventoryCount] = useState(0);

  useEffect(() => {
    const refresh = () => setInventoryCount(readLocalInventory().length);
    refresh();
    window.addEventListener(INVENTORY_CHANGED_EVENT, refresh);
    return () => window.removeEventListener(INVENTORY_CHANGED_EVENT, refresh);
  }, []);

  return (
    <nav className="store-nav" aria-label="Điều hướng chính">
      {tabs.map((tab) => {
        const { href, label } = tab;
        const active = isActive(pathname, href);
        const displayLabel =
          "showInventoryCount" in tab && tab.showInventoryCount ? `${label} (${inventoryCount})` : label;
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`store-nav__link${active ? " store-nav__link--active" : ""}`}
          >
            {displayLabel}
          </Link>
        );
      })}
    </nav>
  );
}
