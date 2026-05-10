"use client";

import { HeaderAuthControls } from "./HeaderAuthControls";

/** Fixed top-right auth chrome on every page (separate from the main tab bar). */
export function GlobalAuthCorner() {
  return (
    <div
      className="pointer-events-none fixed top-0 right-0 z-[100] p-3 pt-[max(0.75rem,env(safe-area-inset-top))] pr-[max(0.75rem,env(safe-area-inset-right))] sm:p-4 sm:pt-[max(1rem,env(safe-area-inset-top))] sm:pr-[max(1rem,env(safe-area-inset-right))]"
      aria-label="Đăng nhập"
    >
      <div className="pointer-events-auto flex justify-end">
        <HeaderAuthControls />
      </div>
    </div>
  );
}
