"use client";

import Image from "next/image";
import { useState } from "react";

const ICON_SRC = "/brand/keyrambitvn-icon.png";

/**
 * Large icon centered in the viewport, behind page content (z-[1] vs content z-10).
 * Opacity and blend tuned for readability over dark sci-fi background.
 */
export function BrandWatermark() {
  const [hidden, setHidden] = useState(false);

  if (hidden) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[1] overflow-hidden" aria-hidden>
      <div
        className="brand-watermark-drift brand-watermark-glow absolute left-1/2 top-1/2 w-[min(135vmin,82rem)] max-w-[2000px] opacity-[0.09] sm:opacity-[0.10] md:opacity-[0.12] lg:opacity-[0.13] xl:opacity-[0.14]"
      >
        <Image
          src={ICON_SRC}
          alt=""
          width={1024}
          height={1024}
          className="h-auto w-full object-contain mix-blend-screen"
          sizes="100vw"
          onError={() => setHidden(true)}
        />
      </div>
    </div>
  );
}
