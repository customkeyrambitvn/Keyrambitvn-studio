"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/", label: "Store" },
  { href: "/fusion", label: "Dung Hợp" },
] as const;

export function MainTabNav() {
  const pathname = usePathname();

  return (
    <nav
      className="mb-5 flex w-full justify-center gap-1 rounded-xl border border-cyan-500/25 bg-[#0a0f1d]/90 p-1 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]"
      aria-label="Điều hướng chính"
    >
      {tabs.map(({ href, label }) => {
        const active = pathname === href || (href !== "/" && pathname.startsWith(href));
        return (
          <Link
            key={href}
            href={href}
            className={`min-w-0 flex-1 rounded-lg px-3 py-2.5 text-center text-sm font-medium transition sm:px-4 sm:text-base ${
              active
                ? "border border-cyan-400/45 bg-cyan-500/15 text-cyan-100 shadow-[0_0_20px_rgba(34,211,238,0.12)]"
                : "border border-transparent text-zinc-400 hover:border-zinc-600 hover:bg-zinc-800/40 hover:text-zinc-200"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
