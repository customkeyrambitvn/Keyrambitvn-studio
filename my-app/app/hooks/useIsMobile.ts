"use client";

import { useEffect, useState } from "react";

/** ≤1023px: gồm điện thoại xoay ngang (CSS width thường > 767) và tablet nhỏ — dùng cho /packing. */
const MOBILE_MQ = "(max-width: 1023px)";

/**
 * `true` khi viewport khớp MOBILE_MQ. Chỉ cập nhật sau mount để tránh lệch SSR/hydration.
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
