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
  unlocked: boolean;
};

const state: SfxState = {
  muted: false,
  volume: DEFAULT_VOLUME,
  initialized: false,
  unlocked: false,
};

const resolvedSrc = new Map<SfxId, string>();
const lastPlayed = new Map<SfxId, number>();

function sfxUrl(relativePath: string): string {
  if (typeof window === "undefined") return relativePath;
  try {
    return new URL(relativePath, window.location.href).href;
  } catch {
    return relativePath;
  }
}

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
    if (!Number.isFinite(v)) return DEFAULT_VOLUME;
    return Math.max(0, Math.min(1, v));
  } catch {
    return DEFAULT_VOLUME;
  }
}

function logPlayError(id: SfxId, err: unknown) {
  const message = err instanceof Error ? err.message : String(err);
  console.warn(
    `[sfx] "${id}" failed: ${message}. Muted=${state.muted} volume=${state.volume}. ` +
      "Click the page, ensure the speaker icon is ON, then try: window.__sfxTest()"
  );
}

function attachDevTestHook() {
  if (process.env.NODE_ENV !== "development" || typeof window === "undefined") return;
  const w = window as Window & { __sfxTest?: () => void; __sfxUnmute?: () => void };
  w.__sfxTest = () => {
    state.muted = false;
    state.unlocked = true;
    try {
      window.localStorage.setItem("keyrambit-sfx-muted", "0");
    } catch {
      /* ignore */
    }
    playSfx("ui_click", 1);
  };
  w.__sfxUnmute = () => {
    setSfxMuted(false);
    state.unlocked = true;
  };
}

export function initSfxManager() {
  if (typeof window === "undefined" || state.initialized) return;
  state.muted = readStoredMute();
  state.volume = readStoredVolume();

  if (state.volume <= 0) {
    state.volume = DEFAULT_VOLUME;
  }

  (Object.keys(SFX_SRC) as SfxId[]).forEach((id) => {
    resolvedSrc.set(id, sfxUrl(SFX_SRC[id]));
  });

  state.initialized = true;
  attachDevTestHook();
}

/** Call on first user gesture — unlocks autoplay for HTML5 audio. */
export function primeSfxAudio(): void {
  if (typeof window === "undefined") return;
  initSfxManager();
  if (state.muted) return;

  state.unlocked = true;

  const src = resolvedSrc.get("ui_click");
  if (!src) return;

  const warm = new Audio(src);
  warm.volume = Math.min(0.2, state.volume);
  void warm.play().catch(() => {
    /* retry on next click */
  });
}

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
    state.unlocked = true;
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

function createSound(id: SfxId): HTMLAudioElement | null {
  const src = resolvedSrc.get(id);
  if (!src) return null;
  const sound = new Audio(src);
  sound.preload = "auto";
  return sound;
}

function playAudio(id: SfxId, volumeScale: number) {
  const sound = createSound(id);
  if (!sound) return;

  const vol = Math.max(0, Math.min(1, state.volume * volumeScale));
  sound.volume = vol;

  const attempt = () => {
    sound.currentTime = 0;
    const p = sound.play();
    if (p !== undefined) {
      void p.catch((err) => logPlayError(id, err));
    }
  };

  if (sound.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    attempt();
    return;
  }

  sound.addEventListener("canplaythrough", attempt, { once: true });
  sound.addEventListener("error", () => {
    logPlayError(id, new Error(`Could not load ${sound.src}`));
  }, { once: true });
  sound.load();
}

/** Play UI sound with anti-spam cooldown. */
export function playSfx(id: SfxId, volumeScale = 1) {
  if (typeof window === "undefined") return;
  if (!state.initialized) initSfxManager();
  if (state.muted) return;

  if (!state.unlocked) {
    state.unlocked = true;
  }

  const now = Date.now();
  const cd = COOLDOWN_MS[id];
  if (cd != null) {
    const last = lastPlayed.get(id) ?? 0;
    if (now - last < cd) return;
    lastPlayed.set(id, now);
  }

  playAudio(id, volumeScale);
}
