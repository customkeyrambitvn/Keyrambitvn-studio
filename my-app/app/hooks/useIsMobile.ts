"use client";

import { useEffect, useState } from "react";

const MOBILE_MQ = "(max-width: 767px)";

/**
 * `true` khi viewport ≤767px. Chỉ cập nhật sau mount để tránh lệch SSR/hydration.
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(MOBILE_MQ);
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  return isMobile;
}
