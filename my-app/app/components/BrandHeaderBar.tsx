"use client";

import Image from "next/image";
import { useState } from "react";

const WORDMARK_SRC = "/brand/keyrambitvn-wordmark.png";

/**
 * Wide clip + scale so square PNGs with extra transparent padding read at full visual size.
 * Container defines the on-screen “logo box”; overflow hides padded canvas edges.
 */
export function BrandHeaderBar({ dense = false }: { dense?: boolean }) {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <div
      className={`flex w-full justify-center ${dense ? "mb-2 sm:mb-2 md:mb-2.5" : "mb-6 sm:mb-7 md:mb-8"}`}
      aria-label="Keyrambitvn"
    >
      {useFallback ? (
        <span className="select-none text-center text-sm font-semibold uppercase tracking-[0.38em] text-cyan-200/90 sm:text-base md:tracking-[0.42em]">
          KEYRAMBITVN
        </span>
      ) : (
        <div
          className="relative mx-auto h-12 w-[min(92vw,220px)] overflow-hidden sm:h-12 sm:w-[260px] md:h-14 md:w-[300px] lg:h-16 lg:w-[320px] xl:h-[72px]"
        >
          <Image
            src={WORDMARK_SRC}
            alt="Keyrambitvn"
            fill
            priority
            sizes="(max-width: 640px) 220px, (max-width: 768px) 260px, (max-width: 1024px) 300px, 320px"
            className="origin-center object-contain object-center opacity-[0.96] scale-[2.5] sm:scale-[2.65] md:scale-[2.8] lg:scale-[2.95] xl:scale-[3]"
            onError={() => setUseFallback(true)}
          />
        </div>
      )}
    </div>
  );
}
