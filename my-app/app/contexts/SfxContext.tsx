"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  getSfxMuted,
  getSfxVolume,
  initSfxManager,
  playSfx,
  setSfxMuted,
  setSfxVolume,
  unlockSfxAudio,
} from "@/app/lib/sfx/sfx-manager";
import type { SfxId } from "@/app/lib/sfx/types";

type SfxContextValue = {
  muted: boolean;
  volume: number;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  play: (id: SfxId, volumeScale?: number) => void;
};

const SfxContext = createContext<SfxContextValue | null>(null);

export function SfxProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.55);

  useEffect(() => {
    initSfxManager();
    setMutedState(getSfxMuted());
    setVolumeState(getSfxVolume());

    const onFirstGesture = () => {
      void unlockSfxAudio();
    };
    window.addEventListener("pointerdown", onFirstGesture, { once: true, passive: true });
    window.addEventListener("keydown", onFirstGesture, { once: true });
    return () => {
      window.removeEventListener("pointerdown", onFirstGesture);
      window.removeEventListener("keydown", onFirstGesture);
    };
  }, []);

  const setMuted = useCallback((next: boolean) => {
    setSfxMuted(next);
    setMutedState(next);
  }, []);

  const setVolume = useCallback((next: number) => {
    setSfxVolume(next);
    setVolumeState(getSfxVolume());
  }, []);

  const play = useCallback((id: SfxId, volumeScale?: number) => {
    void unlockSfxAudio();
    playSfx(id, volumeScale);
  }, []);

  const value = useMemo(
    () => ({ muted, volume, setMuted, setVolume, play }),
    [muted, volume, setMuted, setVolume, play]
  );

  return <SfxContext.Provider value={value}>{children}</SfxContext.Provider>;
}

export function useSfx() {
  const ctx = useContext(SfxContext);
  if (!ctx) {
    throw new Error("useSfx must be used within SfxProvider");
  }
  return ctx;
}
