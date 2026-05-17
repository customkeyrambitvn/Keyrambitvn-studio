"use client";

import { playSfx, primeSfxAudio } from "@/app/lib/sfx/sfx-manager";
import { useSfx } from "../contexts/SfxContext";

/** Global mute toggle for UI SFX. */
export function SfxMuteToggle() {
  const { muted, setMuted } = useSfx();

  return (
    <button
      type="button"
      onClick={() => {
        const next = !muted;
        setMuted(next);
        if (!next) {
          primeSfxAudio();
          playSfx("ui_click", 1);
        }
      }}
      className="sfx-mute-toggle"
      aria-pressed={muted}
      aria-label={muted ? "Bật âm thanh giao diện" : "Tắt âm thanh giao diện"}
      title={muted ? "Bật âm thanh" : "Tắt âm thanh"}
    >
      {muted ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <line x1="23" y1="9" x2="17" y2="15" />
          <line x1="17" y1="9" x2="23" y2="15" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
          <path d="M11 5 6 9H2v6h4l5 4V5z" />
          <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
          <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
        </svg>
      )}
    </button>
  );
}
