import {
  playBoxOpenSequence,
  playBoxRevealFinish,
  playSfxEvent,
  primeEngine,
  setEngineMasterVolume,
  startAmbientLoop,
  stopAmbientLoop,
} from "./sfx-engine";
import { rarityToSfxTier } from "./rarity-tier";
import type {
  SfxEvent,
  SfxHoverKind,
  SfxId,
  SfxRarityTier,
  SfxSpatial,
} from "./types";

export type { SfxEvent, SfxHoverKind, SfxId, SfxRarityTier, SfxSpatial };
export { rarityToSfxTier } from "./rarity-tier";

const DEFAULT_VOLUME = 0.72;

type SfxState = {
  muted: boolean;
  volume: number;
  ambient: boolean;
  initialized: boolean;
};

const state: SfxState = {
  muted: false,
  volume: DEFAULT_VOLUME,
  ambient: true,
  initialized: false,
};

function readStoredMute(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("keyrambit-sfx-muted") === "1";
  } catch {
    return false;
  }
}

function readStoredVolume(): number {
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const v = Number(window.localStorage.getItem("keyrambit-sfx-volume"));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

function readStoredAmbient(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem("keyrambit-sfx-ambient") !== "0";
  } catch {
    return true;
  }
}

function syncAmbient() {
  if (state.muted || !state.ambient || state.volume < 0.001) {
    stopAmbientLoop();
    return;
  }
  startAmbientLoop(state.volume);
}

export function initSfxManager() {
  if (typeof window === "undefined" || state.initialized) return;
  state.muted = readStoredMute();
  state.volume = readStoredVolume();
  state.ambient = readStoredAmbient();
  setEngineMasterVolume(state.volume);
  state.initialized = true;

  if (process.env.NODE_ENV === "development") {
    const w = window as Window & { __sfxTest?: () => void; __sfxUnmute?: () => void };
    w.__sfxTest = () => {
      state.muted = false;
      setSfxMuted(false);
      primeSfxAudio();
      playClick();
    };
    w.__sfxUnmute = () => setSfxMuted(false);
  }
}

export function primeSfxAudio() {
  if (typeof window === "undefined") return;
  initSfxManager();
  if (state.muted) return;
  primeEngine();
  playSfxEvent({ type: "hover", kind: "ui", spatial: "side" }, state.volume * 0.15);
  syncAmbient();
}

export function resumeSfxAudioContextSync() {
  primeSfxAudio();
}

export function unlockSfxAudio(): Promise<void> {
  primeSfxAudio();
  return Promise.resolve();
}

export function getSfxMuted() {
  return state.muted;
}

export function getSfxVolume() {
  return state.volume;
}

export function getSfxAmbientEnabled() {
  return state.ambient;
}

export function setSfxMuted(muted: boolean) {
  state.muted = muted;
  try {
    window.localStorage.setItem("keyrambit-sfx-muted", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (muted) stopAmbientLoop();
  else {
    primeSfxAudio();
    syncAmbient();
  }
}

export function setSfxVolume(volume: number) {
  const v = Math.max(0, Math.min(1, volume));
  state.volume = v;
  setEngineMasterVolume(v);
  try {
    window.localStorage.setItem("keyrambit-sfx-volume", String(v));
  } catch {
    /* ignore */
  }
  syncAmbient();
}

export function setSfxAmbientEnabled(enabled: boolean) {
  state.ambient = enabled;
  try {
    window.localStorage.setItem("keyrambit-sfx-ambient", enabled ? "1" : "0");
  } catch {
    /* ignore */
  }
  syncAmbient();
}

export function playSfxEventBus(event: SfxEvent, volumeScale = 1) {
  if (typeof window === "undefined") return;
  if (!state.initialized) initSfxManager();
  if (state.muted) return;
  primeEngine();
  playSfxEvent(event, state.volume * volumeScale);
}

/** @deprecated Use playSfxEventBus — kept for existing call sites. */
export function playSfx(id: SfxId, volumeScale = 1) {
  playSfxEventBus({ type: "legacy", id }, volumeScale);
}

export function playHover(kind: SfxHoverKind, spatial: SfxSpatial = "side", scale = 1) {
  playSfxEventBus({ type: "hover", kind, spatial }, scale);
}

export function playClick(spatial: SfxSpatial = "side", scale = 1) {
  playSfxEventBus({ type: "click", spatial }, scale);
}

export function playItemSelect(rarity: string, options?: { spatial?: SfxSpatial; selected?: boolean }) {
  const tier = rarityToSfxTier(rarity);
  const spatial = options?.spatial ?? (options?.selected ? "center" : "side");
  if (options?.selected) {
    playHover("selected", spatial, 0.9);
  }
  playSfxEventBus({ type: "select", tier, spatial: spatial === "center" ? "center" : "side" });
}

export function playRarityReveal(rarity: string, spatial: SfxSpatial = "center") {
  playSfxEventBus({
    type: "rarity_finish",
    tier: rarityToSfxTier(rarity),
    spatial,
  });
}

export function playBoxOpen(scale = 1) {
  if (state.muted) return;
  primeEngine();
  playBoxOpenSequence(state.volume * scale);
}

export function playBoxFlash(scale = 1) {
  playSfxEventBus({ type: "box", step: "flash" }, scale);
}

export function playBoxRevealFinishOnly(rarity: string, scale = 1) {
  playSfxEventBus(
    { type: "box", step: "finish", tier: rarityToSfxTier(rarity) },
    scale
  );
}

export function playBoxReveal(rarity: string, scale = 1) {
  if (state.muted) return;
  primeEngine();
  playBoxRevealFinish(rarityToSfxTier(rarity), state.volume * scale);
}

export function playFusion(step: "start" | "success" | "fail", scale = 1) {
  playSfxEventBus({ type: "fusion", step }, scale);
}

export function playToast(scale = 1) {
  playSfxEventBus({ type: "toast" }, scale);
}

export function playModalClose(scale = 1) {
  playSfxEventBus({ type: "modal_close" }, scale);
}

export function refreshAmbient() {
  syncAmbient();
}
