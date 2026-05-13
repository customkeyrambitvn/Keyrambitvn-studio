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
    <nav
      className="flex w-full min-w-0 flex-1 flex-wrap gap-1 rounded-xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:flex-nowrap"
      aria-label="Điều hướng chính"
    >
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
            className={`min-w-0 flex-1 rounded-lg px-2 py-2 text-center text-[11px] font-medium leading-tight transition sm:px-3 sm:text-sm ${
              active
                ? "border border-cyan-400/45 bg-cyan-500/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                : "border border-transparent text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-200"
            }`}
          >
            {displayLabel}
          </Link>
        );
      })}
    </nav>
  );
}
