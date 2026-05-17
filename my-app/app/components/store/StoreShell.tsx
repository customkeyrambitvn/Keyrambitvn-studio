"use client";

import type { ReactNode } from "react";
import { BrandWatermark } from "../BrandWatermark";
import { AnimatedGlowBackground, ParticleLayer } from "../motion";

type StoreShellProps = {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

/** Premium collectible-store page frame: animated atmosphere, grain, watermark. */
export function StoreShell({ children, className = "", contentClassName = "" }: StoreShellProps) {
  return (
    <main className={`store-shell relative text-zinc-100 ${className}`.trim()}>
      <AnimatedGlowBackground />
      <div className="store-grain" aria-hidden />
      <ParticleLayer density="ambient" />
      <BrandWatermark />
      <div className="store-vignette" aria-hidden />
      <div className="store-floor-glow" aria-hidden />
      <div
        className={`relative z-10 mx-auto w-full max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 ${contentClassName}`.trim()}
      >
        {children}
      </div>
    </main>
  );
}
