import type { HTMLAttributes, ReactNode } from "react";

type StorePanelProps = HTMLAttributes<HTMLElement> & {
  as?: "section" | "div" | "article";
  inset?: boolean;
  children: ReactNode;
};

/** Inventory-style glass panel with depth and inner refraction edge. */
export function StorePanel({
  as: Tag = "section",
  inset = false,
  className = "",
  children,
  ...rest
}: StorePanelProps) {
  return (
    <Tag className={`${inset ? "store-panel store-panel--inset" : "store-panel"} ${className}`.trim()} {...rest}>
      {children}
    </Tag>
  );
}
