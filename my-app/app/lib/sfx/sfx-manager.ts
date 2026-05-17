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

const DEFAULT_VOLUME = 0.85;

type SfxState = {
  muted: boolean;
  volume: number;
  initialized: boolean;
};

const state: SfxState = {
  muted: false,
  volume: DEFAULT_VOLUME,
  initialized: false,
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
  if (typeof window === "undefined") return DEFAULT_VOLUME;
  try {
    const v = Number(window.localStorage.getItem("keyrambit-sfx-volume"));
    return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : DEFAULT_VOLUME;
  } catch {
    return DEFAULT_VOLUME;
  }
}

/** Resume Web Audio in the same user-gesture stack (required on mobile). */
export function resumeSfxAudioContextSync(): void {
  if (typeof window === "undefined") return;
  initSfxManager();
  const ctx = Howler.ctx as AudioContext | undefined;
  if (!ctx) return;
  if (ctx.state === "suspended") {
    try {
      void ctx.resume();
    } catch {
      /* ignore */
    }
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
            console.warn(`[sfx] failed to load ${id} (${SFX_SRC[id]}):`, err);
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
  resumeSfxAudioContextSync();

  const ctx = Howler.ctx as AudioContext | undefined;
  if (!ctx) return Promise.resolve();

  if (ctx.state === "running") return Promise.resolve();

  return ctx
    .resume()
    .catch(() => {
      /* retry on next gesture */
    })
    .then(() => undefined);
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
    resumeSfxAudioContextSync();
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

function playHowl(howl: Howl, volumeScale: number) {
  const vol = Math.max(0.35, Math.min(1, volumeScale));

  const start = () => {
    howl.volume(vol);
    howl.play();
  };

  if (howl.state() === "unloaded") {
    howl.once("load", start);
    howl.load();
    return;
  }

  start();
}

/** Play UI sound with anti-spam cooldown. */
export function playSfx(id: SfxId, volumeScale = 1) {
  if (typeof window === "undefined") return;
  if (!state.initialized) initSfxManager();
  if (state.muted) return;

  resumeSfxAudioContextSync();

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

    playHowl(howl, volumeScale);
  };

  run();

  const ctx = Howler.ctx as AudioContext | undefined;
  if (ctx?.state === "suspended") {
    void ctx.resume().then(run).catch(() => run());
  }
}
