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
  getSfxAmbientEnabled,
  getSfxMuted,
  getSfxVolume,
  initSfxManager,
  playBoxOpen,
  playBoxFlash,
  playBoxRevealFinishOnly,
  playBoxReveal,
  playClick,
  playFusion,
  playHover,
  playItemSelect,
  playModalClose,
  playRarityReveal,
  playSfx,
  playSfxEventBus,
  playToast,
  primeSfxAudio,
  refreshAmbient,
  setSfxAmbientEnabled,
  setSfxMuted,
  setSfxVolume,
} from "@/app/lib/sfx/sfx-manager";
import type { SfxEvent, SfxHoverKind, SfxId, SfxSpatial } from "@/app/lib/sfx/types";

type SfxContextValue = {
  muted: boolean;
  volume: number;
  ambient: boolean;
  setMuted: (muted: boolean) => void;
  setVolume: (volume: number) => void;
  setAmbient: (enabled: boolean) => void;
  /** @deprecated Prefer typed helpers below. */
  play: (id: SfxId, volumeScale?: number) => void;
  playEvent: (event: SfxEvent, volumeScale?: number) => void;
  playHover: (kind: SfxHoverKind, spatial?: SfxSpatial, scale?: number) => void;
  playClick: (spatial?: SfxSpatial, scale?: number) => void;
  playItemSelect: (
    rarity: string,
    options?: { spatial?: SfxSpatial; selected?: boolean; rarityClassName?: string }
  ) => void;
  playRarityReveal: (rarity: string, spatial?: SfxSpatial) => void;
  playBoxOpen: (scale?: number) => void;
  playBoxFlash: (scale?: number) => void;
  playBoxRevealFinishOnly: (rarity: string, scale?: number) => void;
  playBoxReveal: (rarity: string, scale?: number) => void;
  playFusion: (step: "start" | "success" | "fail", scale?: number) => void;
  playToast: (scale?: number) => void;
  playModalClose: (scale?: number) => void;
};

const SfxContext = createContext<SfxContextValue | null>(null);

export function SfxProvider({ children }: { children: ReactNode }) {
  const [muted, setMutedState] = useState(false);
  const [volume, setVolumeState] = useState(0.72);
  const [ambient, setAmbientState] = useState(true);

  useEffect(() => {
    initSfxManager();
    setMutedState(getSfxMuted());
    setVolumeState(getSfxVolume());
    setAmbientState(getSfxAmbientEnabled());

    const onGesture = () => primeSfxAudio();
    window.addEventListener("pointerdown", onGesture, { capture: true, passive: true });
    window.addEventListener("touchstart", onGesture, { capture: true, passive: true });
    window.addEventListener("keydown", onGesture, { capture: true });

    return () => {
      window.removeEventListener("pointerdown", onGesture, { capture: true });
      window.removeEventListener("touchstart", onGesture, { capture: true });
      window.removeEventListener("keydown", onGesture, { capture: true });
    };
  }, []);

  useEffect(() => {
    refreshAmbient();
  }, [muted, ambient, volume]);

  const setMuted = useCallback((next: boolean) => {
    setSfxMuted(next);
    setMutedState(next);
  }, []);

  const setVolume = useCallback((next: number) => {
    setSfxVolume(next);
    setVolumeState(getSfxVolume());
  }, []);

  const setAmbient = useCallback((next: boolean) => {
    setSfxAmbientEnabled(next);
    setAmbientState(next);
  }, []);

  const play = useCallback((id: SfxId, volumeScale?: number) => {
    primeSfxAudio();
    playSfx(id, volumeScale);
  }, []);

  const playEvent = useCallback((event: SfxEvent, volumeScale?: number) => {
    primeSfxAudio();
    playSfxEventBus(event, volumeScale);
  }, []);

  const value = useMemo(
    () => ({
      muted,
      volume,
      ambient,
      setMuted,
      setVolume,
      setAmbient,
      play,
      playEvent,
      playHover: (kind: SfxHoverKind, spatial?: SfxSpatial, scale?: number) => {
        primeSfxAudio();
        playHover(kind, spatial, scale);
      },
      playClick: (spatial?: SfxSpatial, scale?: number) => {
        primeSfxAudio();
        playClick(spatial, scale);
      },
      playItemSelect: (
        rarity: string,
        options?: { spatial?: SfxSpatial; selected?: boolean; rarityClassName?: string }
      ) => {
        primeSfxAudio();
        const r = options?.rarityClassName ?? rarity;
        playItemSelect(r, options);
      },
      playRarityReveal: (rarity: string, spatial?: SfxSpatial) => {
        primeSfxAudio();
        playRarityReveal(rarity, spatial);
      },
      playBoxOpen: (scale?: number) => {
        primeSfxAudio();
        playBoxOpen(scale);
      },
      playBoxFlash: (scale?: number) => {
        primeSfxAudio();
        playBoxFlash(scale);
      },
      playBoxRevealFinishOnly: (rarity: string, scale?: number) => {
        primeSfxAudio();
        playBoxRevealFinishOnly(rarity, scale);
      },
      playBoxReveal: (rarity: string, scale?: number) => {
        primeSfxAudio();
        playBoxReveal(rarity, scale);
      },
      playFusion: (step: "start" | "success" | "fail", scale?: number) => {
        primeSfxAudio();
        playFusion(step, scale);
      },
      playToast: (scale?: number) => {
        primeSfxAudio();
        playToast(scale);
      },
      playModalClose: (scale?: number) => {
        primeSfxAudio();
        playModalClose(scale);
      },
    }),
    [muted, volume, ambient, setMuted, setVolume, setAmbient, play, playEvent]
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
