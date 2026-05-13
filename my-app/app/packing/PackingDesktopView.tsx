"use client";

import type { HTMLAttributes, ReactNode } from "react";

type DivProps = HTMLAttributes<HTMLDivElement>;

/** Layout desktop — cha quyết định có render hay không (hook + `?view=`). */
export function PackingDesktopView({ className = "", children, ...rest }: { className?: string; children: ReactNode } & Omit<DivProps, "className" | "children">) {
  return (
    <div {...rest} className={["flex", className].filter(Boolean).join(" ")}>
      {children}
    </div>
  );
}

/** Khối desktop — cha quyết định có render hay không. */
export function PackingDesktopBlock({ className = "", children, ...rest }: { className?: string; children: ReactNode } & Omit<DivProps, "className" | "children">) {
  return (
    <div {...rest} className={className}>
      {children}
    </div>
  );
}
