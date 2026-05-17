"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { HeaderAuthControls } from "./HeaderAuthControls";
import { SfxMuteToggle } from "./SfxMuteToggle";
import { SiteMainNav } from "./SiteMainNav";

const WORDMARK_SRC = "/brand/keyrambitvn-wordmark.png";

/** Compact HUD top bar: logo | pill tabs | sfx + auth. */
export function CompactTopNav() {
  const [useFallback, setUseFallback] = useState(false);

  return (
    <header className="compact-top-nav" aria-label="Điều hướng">
      <Link href="/" className="compact-top-nav__logo" aria-label="Keyrambitvn">
        {useFallback ? (
          <span className="compact-top-nav__logo-fallback">KEYRAMBITVN</span>
        ) : (
          <Image
            src={WORDMARK_SRC}
            alt=""
            fill
            priority
            sizes="120px"
            className="object-contain object-left scale-[2.15] origin-left opacity-[0.96]"
            onError={() => setUseFallback(true)}
          />
        )}
      </Link>

      <div className="compact-top-nav__tabs">
        <SiteMainNav />
      </div>

      <div className="compact-top-nav__tools">
        <SfxMuteToggle />
        <HeaderAuthControls />
      </div>
    </header>
  );
}
