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
  primed: boolean;
};

const state: SfxState = {
  muted: false,
  volume: DEFAULT_VOLUME,
  initialized: false,
  primed: false,
};

/** Template elements — cloned per play so sounds can overlap. */
const pool = new Map<SfxId, HTMLAudioElement>();
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

function logPlayError(id: SfxId, err: unknown) {
  if (process.env.NODE_ENV !== "development") return;
  const message = err instanceof Error ? err.message : String(err);
  console.warn(`[sfx] play blocked for "${id}": ${message}. Click the page once, then check mute toggle.`);
}

export function initSfxManager() {
  if (typeof window === "undefined" || state.initialized) return;
  state.muted = readStoredMute();
  state.volume = readStoredVolume();

  (Object.keys(SFX_SRC) as SfxId[]).forEach((id) => {
    const audio = new Audio(SFX_SRC[id]);
    audio.preload = "auto";
    audio.load();
    pool.set(id, audio);
  });

  state.initialized = true;
}

/** Warm up audio after first user gesture (mobile / strict autoplay). */
export function primeSfxAudio(): void {
  if (typeof window === "undefined") return;
  initSfxManager();
  if (state.muted || state.primed) return;

  const template = pool.get("ui_click");
  if (!template) return;

  const warm = template.cloneNode(true) as HTMLAudioElement;
  warm.volume = 0.04 * state.volume;
  void warm.play().then(() => {
    warm.pause();
    warm.currentTime = 0;
    state.primed = true;
  }).catch(() => {
    /* will retry on next gesture */
  });
}

/** @deprecated HTML5 audio — kept for callers */
export function resumeSfxAudioContextSync(): void {
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

export function setSfxMuted(muted: boolean) {
  state.muted = muted;
  try {
    window.localStorage.setItem("keyrambit-sfx-muted", muted ? "1" : "0");
  } catch {
    /* ignore */
  }
  if (!muted) {
    primeSfxAudio();
  }
}

export function setSfxVolume(volume: number) {
  const v = Math.max(0, Math.min(1, volume));
  state.volume = v;
  try {
    window.localStorage.setItem("keyrambit-sfx-volume", String(v));
  } catch {
    /* ignore */
  }
}

function playAudio(id: SfxId, volumeScale: number) {
  const template = pool.get(id);
  if (!template) return;

  const sound = template.cloneNode(true) as HTMLAudioElement;
  sound.volume = Math.max(0, Math.min(1, state.volume * volumeScale));

  void sound.play().catch((err) => logPlayError(id, err));
}

/** Play UI sound with anti-spam cooldown. */
export function playSfx(id: SfxId, volumeScale = 1) {
  if (typeof window === "undefined") return;
  if (!state.initialized) initSfxManager();
  if (state.muted) return;

  const now = Date.now();
  const cd = COOLDOWN_MS[id];
  if (cd != null) {
    const last = lastPlayed.get(id) ?? 0;
    if (now - last < cd) return;
    lastPlayed.set(id, now);
  }

  playAudio(id, volumeScale);
}
