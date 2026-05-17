import { Howl, Howler } from "howler";
import type { SfxId } from "./types";

const SFX_SRC: Record<SfxId, string> = {
  ui_hover_soft: "/sfx/ui_hover_soft.wav",
  ui_click: "/sfx/ui_click.wav",
  box_open: "/sfx/box_open.wav",
  reveal_flash: "/sfx/reveal_flash.wav",
  item_reveal: "/sfx/item_reveal.wav",
  fusion_start: "/sfx/fusion_start.wav",
  fusion_success: "/sfx/fusion_success.wav",
  fusion_fail: "/sfx/fusion_fail.wav",
  toast: "/sfx/toast.wav",
  modal_close: "/sfx/modal_close.wav",
};

const COOLDOWN_MS: Partial<Record<SfxId, number>> = {
  ui_hover_soft: 120,
  ui_click: 80,
  toast: 400,
};

type SfxState = {
  muted: boolean;
  volume: number;
  initialized: boolean;
  unlocked: boolean;
};

const state: SfxState = {
  muted: false,
  volume: 0.72,
  initialized: false,
  unlocked: false,
};

const pool = new Map<SfxId, Howl>();
const lastPlayed = new Map<SfxId, number>();

function readStoredMute(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem("keyrambit-sfx-muted") === "1";
  } catch {
    return false;
  }
}

function readStoredVolume(): number {
  if (typeof window === "undefined") return 0.72;
  try {
    const v = Number(window.localStorage.getItem("keyrambit-sfx-volume"));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 0.72;
  } catch {
    return 0.72;
  }
}

export function initSfxManager() {
  if (typeof window === "undefined" || state.initialized) return;
  state.muted = readStoredMute();
  state.volume = readStoredVolume();
  Howler.volume(state.volume);
  Howler.mute(state.muted);

  (Object.keys(SFX_SRC) as SfxId[]).forEach((id) => {
    pool.set(
      id,
      new Howl({
        src: [SFX_SRC[id]],
        volume: 1,
        preload: true,
        html5: false,
        onloaderror: (_id, err) => {
          if (process.env.NODE_ENV === "development") {
            console.warn(`[sfx] failed to load ${id}:`, err);
          }
        },
      })
    );
  });
  state.initialized = true;
}

/** Browsers block audio until a user gesture resumes the AudioContext. */
export function unlockSfxAudio(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  initSfxManager();
  if (state.unlocked) return Promise.resolve();

  const ctx = Howler.ctx as AudioContext | undefined;
  if (!ctx) {
    state.unlocked = true;
    return Promise.resolve();
  }

  if (ctx.state === "running") {
    state.unlocked = true;
    return Promise.resolve();
  }

  return ctx.resume().then(() => {
    state.unlocked = true;
  }).catch(() => {
    /* still try playback on next gesture */
  });
}

export function getSfxMuted() {
  return state.muted;
}

export function getSfxVolume() {
  return state.volume;
}

export function setSfxMuted(muted: boolean) {
  state.muted = muted;
  Howler.mute(muted);
  try {
    window.localStorage.setItem("keyrambit-sfx-muted", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!muted) {
    void unlockSfxAudio();
  }
}

export function setSfxVolume(volume: number) {
  const v = Math.max(0, Math.min(1, volume));
  state.volume = v;
  Howler.volume(v);
  try {
    window.localStorage.setItem("keyrambit-sfx-volume", String(v));
  } catch {
    /* ignore */
  }
}

/** Play UI sound with anti-spam cooldown. */
export function playSfx(id: SfxId, volumeScale = 1) {
  if (typeof window === "undefined") return;
  if (!state.initialized) initSfxManager();
  if (state.muted) return;

  const run = () => {
    const now = Date.now();
    const cd = COOLDOWN_MS[id];
    if (cd != null) {
      const last = lastPlayed.get(id) ?? 0;
      if (now - last < cd) return;
      lastPlayed.set(id, now);
    }

    const howl = pool.get(id);
    if (!howl) return;

    const vol = Math.max(0.15, Math.min(1, volumeScale * state.volume));
    howl.volume(vol);

    if (howl.state() === "unloaded") {
      howl.once("load", () => howl.play());
      howl.load();
      return;
    }

    const soundId = howl.play();
    if (soundId === undefined && process.env.NODE_ENV === "development") {
      console.warn(`[sfx] play blocked for ${id} — try clicking the page first`);
    }
  };

  if (!state.unlocked) {
    void unlockSfxAudio().then(run);
    return;
  }
  run();
}
