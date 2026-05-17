"use client";

import type { ReactNode } from "react";

type StoreModalProps = {
  open: boolean;
  onClose: () => void;
  titleId?: string;
  children: ReactNode;
  className?: string;
  size?: "sm" | "md";
};

export function StoreModal({
  open,
  onClose,
  titleId,
  children,
  className = "",
  size = "md",
}: StoreModalProps) {
  if (!open) return null;

  const maxW = size === "sm" ? "max-w-sm" : "max-w-md";

  return (
    <div className="store-modal-backdrop" onClick={onClose} role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        {...(titleId ? { "aria-labelledby": titleId } : {})}
        className={`store-modal w-full ${maxW} ${className}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
