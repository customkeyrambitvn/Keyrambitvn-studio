"use client";

import { SiteMainNav } from "./SiteMainNav";

/** Main site tab bar; Google auth is fixed in the root layout (`GlobalAuthCorner`). */
export function MainNavWithAuth() {
  return (
    <div className="mb-5 w-full min-w-0">
      <SiteMainNav />
    </div>
  );
}
