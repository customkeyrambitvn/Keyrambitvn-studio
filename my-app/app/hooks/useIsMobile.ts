"use client";

import { useEffect, useState } from "react";

const NARROW_MQ = "(max-width: 1023px)";
const TOUCH_PRIMARY_MQ = "(hover: none) and (pointer: coarse)";
const FINE_POINTER_MQ = "(pointer: fine)";

/**
 * Gợi ý UI “mobile” cho /packing: viewport hẹp, hoặc máy cảm ứng chủ đạo với cạnh ngắn kiểu điện thoại,
 * hoặc UA iPhone/Android (dự phòng khi meta viewport / kích thước báo cáo lệch).
 * Luôn cập nhật sau mount để tránh lệch SSR.
 */
function readPackingMobileViewportHint(): boolean {
  if (typeof window === "undefined") return false;

  if (window.matchMedia(NARROW_MQ).matches) return true;

  const sw = window.visualViewport?.width ?? window.innerWidth;
  const sh = window.visualViewport?.height ?? window.innerHeight;
  const shortSide = Math.min(sw, sh);

  const ua = navigator.userAgent;
  const isLikelyPhoneUa =
    /\b(iPhone|iPod)\b/i.test(ua) ||
    (/\bAndroid\b/i.test(ua) && /\bMobile\b/i.test(ua));

  if (isLikelyPhoneUa && shortSide <= 960) return true;

  const touchPrimary =
    window.matchMedia(TOUCH_PRIMARY_MQ).matches ||
    (navigator.maxTouchPoints > 0 && !window.matchMedia(FINE_POINTER_MQ).matches);

  if (touchPrimary && shortSide <= 640) return true;

  return false;
}

export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mqNarrow = window.matchMedia(NARROW_MQ);
    const mqTouch = window.matchMedia(TOUCH_PRIMARY_MQ);
    const mqFine = window.matchMedia(FINE_POINTER_MQ);

    const sync = () => setIsMobile(readPackingMobileViewportHint());

    sync();
    mqNarrow.addEventListener("change", sync);
    mqTouch.addEventListener("change", sync);
    mqFine.addEventListener("change", sync);
    window.addEventListener("resize", sync);
    window.addEventListener("orientationchange", sync);
    const vv = window.visualViewport;
    vv?.addEventListener("resize", sync);

    return () => {
      mqNarrow.removeEventListener("change", sync);
      mqTouch.removeEventListener("change", sync);
      mqFine.removeEventListener("change", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("orientationchange", sync);
      vv?.removeEventListener("resize", sync);
    };
  }, []);

  return isMobile;
}
