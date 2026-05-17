import type {
  SfxBoxStep,
  SfxEvent,
  SfxFusionStep,
  SfxHoverKind,
  SfxRarityTier,
  SfxSpatial,
} from "./types";

type PlayOpts = {
  masterGain: number;
  pan?: number;
  pitchJitter?: number;
  reverb?: boolean;
};

const COOLDOWN: Partial<Record<string, number>> = {
  "hover:ui": 95,
  "hover:rarity": 110,
  "hover:selected": 100,
  click: 70,
  select: 140,
  "rarity_finish": 220,
  toast: 380,
};

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let reverbBus: GainNode | null = null;
let ambientNodes: { stop: () => void } | null = null;
let chargeStop: (() => void) | null = null;

const lastPlayed = new Map<string, number>();

function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function jitter(base: number, spread: number) {
  return base * (1 + rand(-spread, spread));
}

/** exponentialRampToValueAtTime cannot target 0. */
const MIN_EXP_GAIN = 0.0001;

function expGainRamp(param: AudioParam, value: number, endTime: number) {
  param.exponentialRampToValueAtTime(Math.max(MIN_EXP_GAIN, value), endTime);
}

function ensureContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return null;
    ctx = new Ctx();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);

    reverbBus = ctx.createGain();
    reverbBus.gain.value = 0.22;
    const delayL = ctx.createDelay(0.12);
    const delayR = ctx.createDelay(0.17);
    const feedback = ctx.createGain();
    feedback.gain.value = 0.28;
    const reverbMerge = ctx.createGain();
    reverbMerge.gain.value = 1;
    delayL.delayTime.value = 0.11;
    delayR.delayTime.value = 0.16;
    reverbBus.connect(delayL);
    reverbBus.connect(delayR);
    delayL.connect(feedback);
    delayR.connect(feedback);
    feedback.connect(delayL);
    feedback.connect(reverbMerge);
    reverbMerge.connect(master);
  }
  if (ctx.state === "suspended") {
    void ctx.resume();
  }
  return ctx;
}

function connectOutput(node: AudioNode, opts: PlayOpts) {
  if (!ctx || !master) return;
  const bus = ctx.createGain();
  bus.gain.value = opts.masterGain;

  if (opts.pan !== undefined && opts.pan !== 0) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = Math.max(-1, Math.min(1, opts.pan));
    node.connect(bus);
    bus.connect(panner);
    panner.connect(master);
    if (opts.reverb && reverbBus) {
      const send = ctx.createGain();
      send.gain.value = 0.35;
      bus.connect(send);
      send.connect(reverbBus);
    }
    return;
  }

  node.connect(bus);
  bus.connect(master);
  if (opts.reverb && reverbBus) {
    const send = ctx.createGain();
    send.gain.value = 0.35;
    bus.connect(send);
    send.connect(reverbBus);
  }
}

function tone(
  frequency: number,
  duration: number,
  type: OscillatorType,
  gain: number,
  opts: PlayOpts,
  attack = 0.004,
  release = 0.08
) {
  const c = ensureContext();
  if (!c || !master) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(frequency * (opts.pitchJitter ?? 1), t);
  g.gain.setValueAtTime(MIN_EXP_GAIN, t);
  expGainRamp(g.gain, gain, t + attack);
  g.gain.exponentialRampToValueAtTime(MIN_EXP_GAIN, t + duration + release);
  osc.connect(g);
  connectOutput(g, opts);
  osc.start(t);
  osc.stop(t + duration + release + 0.02);
}

function noiseBurst(
  duration: number,
  gain: number,
  opts: PlayOpts,
  filterHz = 2400,
  type: BiquadFilterType = "bandpass"
) {
  const c = ensureContext();
  if (!c || !master) return;
  const t = c.currentTime;
  const bufferSize = Math.floor(c.sampleRate * duration);
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufferSize);
  }
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = type;
  filter.frequency.value = filterHz;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(MIN_EXP_GAIN, t + duration);
  src.connect(filter);
  filter.connect(g);
  connectOutput(g, opts);
  src.start(t);
  src.stop(t + duration + 0.02);
}

function sweepTone(
  f0: number,
  f1: number,
  duration: number,
  gain: number,
  opts: PlayOpts,
  type: OscillatorType = "sine"
) {
  const c = ensureContext();
  if (!c || !master) return;
  const t = c.currentTime;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(f0 * (opts.pitchJitter ?? 1), t);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, f1 * (opts.pitchJitter ?? 1)), t + duration);
  g.gain.setValueAtTime(MIN_EXP_GAIN, t);
  expGainRamp(g.gain, gain, t + 0.01);
  g.gain.exponentialRampToValueAtTime(MIN_EXP_GAIN, t + duration + 0.05);
  osc.connect(g);
  connectOutput(g, opts);
  osc.start(t);
  osc.stop(t + duration + 0.08);
}

function shouldPlay(key: string, ms: number) {
  const last = lastPlayed.get(key) ?? 0;
  if (now() - last < ms) return false;
  lastPlayed.set(key, now());
  return true;
}

function spatialPan(spatial?: SfxSpatial) {
  if (spatial === "center") return 0;
  return -0.22;
}

function baseOpts(volume: number, spatial?: SfxSpatial, reverb = false): PlayOpts {
  return {
    masterGain: volume,
    pan: spatialPan(spatial),
    pitchJitter: jitter(1, 0.04),
    reverb,
  };
}

function playHover(kind: SfxHoverKind, spatial?: SfxSpatial, master = 1) {
  const key = `hover:${kind}`;
  if (!shouldPlay(key, COOLDOWN[key] ?? 90)) return;
  const vol = master * (kind === "ui" ? 0.22 : kind === "rarity" ? 0.28 : 0.26);
  const opts = baseOpts(vol, spatial);

  if (kind === "ui") {
    tone(jitter(3400, 0.08), 0.055, "sine", 0.12, opts, 0.002, 0.04);
    return;
  }
  if (kind === "rarity") {
    tone(jitter(2600, 0.06), 0.05, "triangle", 0.09, opts, 0.002, 0.035);
    window.setTimeout(() => tone(jitter(4200, 0.07), 0.045, "sine", 0.07, { ...opts, pitchJitter: jitter(1, 0.05) }, 0.002, 0.03), 18);
    return;
  }
  tone(jitter(1900, 0.05), 0.065, "sine", 0.1, opts, 0.003, 0.05);
}

function playClick(spatial?: SfxSpatial, master = 1) {
  if (!shouldPlay("click", COOLDOWN.click ?? 70)) return;
  const opts = baseOpts(master * 0.42, spatial);
  noiseBurst(0.028, 0.14, opts, 1800, "bandpass");
  tone(jitter(140, 0.06), 0.055, "sine", 0.2, { ...opts, pitchJitter: jitter(1, 0.03) }, 0.002, 0.04);
  tone(jitter(920, 0.05), 0.07, "triangle", 0.11, { ...opts, pitchJitter: jitter(1, 0.04) }, 0.004, 0.05);
}

function playSelect(tier: SfxRarityTier, spatial?: SfxSpatial, master = 1) {
  if (!shouldPlay("select", COOLDOWN.select ?? 140)) return;
  const center = spatial === "center";
  const opts = baseOpts(master * (center ? 0.55 : 0.38), spatial, center);
  sweepTone(280, center ? 1100 : 820, 0.11, 0.16, opts, "sine");
  noiseBurst(0.04, 0.1, opts, center ? 3200 : 2600, "highpass");
  tone(jitter(520, 0.08), center ? 0.16 : 0.12, "triangle", center ? 0.14 : 0.1, { ...opts, reverb: center }, 0.006, 0.08);

  const tierBoost: Partial<Record<SfxRarityTier, number>> = {
    rare: 0.04,
    epic: 0.06,
    hunt: 0.07,
    secret: 0.08,
    rare_secret: 0.09,
    super_secret: 0.1,
  };
  const extra = tierBoost[tier] ?? 0;
  if (extra > 0) {
    tone(jitter(1200, 0.1), 0.09, "sine", extra, { ...opts, reverb: true }, 0.004, 0.06);
  }
}

function playRarityFinish(tier: SfxRarityTier, spatial?: SfxSpatial, master = 1) {
  if (!shouldPlay(`rarity_finish:${tier}`, COOLDOWN.rarity_finish ?? 220)) return;
  const opts = baseOpts(master * 0.62, spatial, true);

  switch (tier) {
    case "common":
      playClick(spatial, master * 0.7);
      return;
    case "rare":
      tone(jitter(1800, 0.08), 0.1, "sine", 0.12, opts, 0.004, 0.07);
      tone(jitter(3200, 0.1), 0.08, "triangle", 0.08, { ...opts, pitchJitter: jitter(1, 0.05) }, 0.003, 0.05);
      return;
    case "epic":
    case "hunt":
      sweepTone(400, 1400, 0.14, 0.14, opts);
      tone(jitter(640, 0.07), 0.12, "triangle", 0.1, opts, 0.005, 0.08);
      return;
    case "secret":
      noiseBurst(0.06, 0.12, opts, 900, "lowpass");
      tone(jitter(110, 0.05), 0.14, "sawtooth", 0.08, { ...opts, pitchJitter: jitter(1, 0.02) }, 0.006, 0.1);
      tone(jitter(420, 0.08), 0.18, "sine", 0.12, opts, 0.008, 0.12);
      return;
    case "rare_secret":
      sweepTone(220, 880, 0.16, 0.13, opts, "triangle");
      tone(jitter(1320, 0.09), 0.11, "sine", 0.11, opts, 0.004, 0.09);
      noiseBurst(0.05, 0.09, opts, 2400, "bandpass");
      return;
    case "super_secret":
      sweepTone(180, 1240, 0.2, 0.15, opts);
      tone(jitter(880, 0.06), 0.14, "sine", 0.1, opts, 0.005, 0.1);
      tone(jitter(1760, 0.08), 0.12, "triangle", 0.09, { ...opts, pitchJitter: jitter(1, 0.04) }, 0.004, 0.08);
      tone(jitter(70, 0.04), 0.22, "sine", 0.14, opts, 0.01, 0.14);
      return;
    default:
      playClick(spatial, master * 0.6);
  }
}

function stopBoxCharge() {
  chargeStop?.();
  chargeStop = null;
}

function playBox(step: SfxBoxStep, tier: SfxRarityTier = "common", master = 1) {
  const opts = baseOpts(master * 0.58, "center", step === "finish");

  switch (step) {
    case "lock":
      noiseBurst(0.035, 0.16, opts, 1200, "bandpass");
      tone(jitter(220, 0.05), 0.06, "square", 0.1, opts, 0.002, 0.04);
      return;
    case "charge": {
      stopBoxCharge();
      const c = ensureContext();
      if (!c || !master) return;
      const t = c.currentTime;
      const osc = c.createOscillator();
      const g = c.createGain();
      const filter = c.createBiquadFilter();
      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(420, t + 1.1);
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(400, t);
      filter.frequency.exponentialRampToValueAtTime(2200, t + 1.1);
      filter.Q.value = 0.7;
      g.gain.setValueAtTime(MIN_EXP_GAIN, t);
      expGainRamp(g.gain, master * 0.12, t + 0.08);
      g.gain.exponentialRampToValueAtTime(MIN_EXP_GAIN, t + 1.15);
      osc.connect(filter);
      filter.connect(g);
      connectOutput(g, { ...opts, reverb: true });
      osc.start(t);
      osc.stop(t + 1.2);
      chargeStop = () => {
        try {
          osc.stop();
        } catch {
          /* already stopped */
        }
      };
      return;
    }
    case "release":
      stopBoxCharge();
      noiseBurst(0.05, 0.1, opts, 600, "lowpass");
      return;
    case "flash":
      stopBoxCharge();
      noiseBurst(0.07, 0.2, opts, 2800, "highpass");
      tone(jitter(80, 0.04), 0.1, "sine", 0.18, opts, 0.002, 0.08);
      sweepTone(200, 40, 0.12, 0.12, opts);
      return;
    case "finish":
      stopBoxCharge();
      playRarityFinish(tier, "center", master);
      return;
    default:
      return;
  }
}

function playFusion(step: SfxFusionStep, master = 1) {
  const opts = baseOpts(master * 0.5, "center", step !== "fail");
  switch (step) {
    case "start":
      sweepTone(160, 520, 0.2, 0.14, opts, "triangle");
      noiseBurst(0.04, 0.1, opts, 2000, "bandpass");
      return;
    case "success":
      playRarityFinish("epic", "center", master);
      tone(jitter(1040, 0.06), 0.14, "sine", 0.1, { ...opts, reverb: true }, 0.004, 0.1);
      return;
    case "fail":
      tone(jitter(140, 0.04), 0.2, "sawtooth", 0.08, opts, 0.01, 0.12);
      noiseBurst(0.08, 0.12, opts, 500, "lowpass");
      return;
    default:
      return;
  }
}

function playToast(master = 1) {
  if (!shouldPlay("toast", COOLDOWN.toast ?? 380)) return;
  const opts = baseOpts(master * 0.32, "side");
  tone(jitter(1200, 0.07), 0.09, "sine", 0.1, opts, 0.004, 0.07);
}

function playModalClose(master = 1) {
  const opts = baseOpts(master * 0.3, "side");
  tone(jitter(680, 0.06), 0.07, "triangle", 0.09, opts, 0.003, 0.05);
}

export function primeEngine() {
  ensureContext();
}

export function startAmbientLoop(masterVolume: number) {
  if (ambientNodes) return;
  if (masterVolume < 0.001) return;
  const c = ensureContext();
  if (!c || !master) return;

  const t = c.currentTime;
  const hum = c.createOscillator();
  const humGain = c.createGain();
  hum.type = "sine";
  hum.frequency.value = 52;
  humGain.gain.setValueAtTime(MIN_EXP_GAIN, t);
  expGainRamp(humGain.gain, masterVolume * 0.018, t + 1.2);

  const bufferSize = c.sampleRate * 2;
  const buffer = c.createBuffer(1, bufferSize, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.35;
  }
  const noise = c.createBufferSource();
  noise.buffer = buffer;
  noise.loop = true;
  const noiseFilter = c.createBiquadFilter();
  noiseFilter.type = "lowpass";
  noiseFilter.frequency.value = 280;
  const noiseGain = c.createGain();
  noiseGain.gain.setValueAtTime(MIN_EXP_GAIN, t);
  expGainRamp(noiseGain.gain, masterVolume * 0.006, t + 1.2);

  hum.connect(humGain);
  noise.connect(noiseFilter);
  noiseFilter.connect(noiseGain);
  connectOutput(humGain, { masterGain: 1 });
  connectOutput(noiseGain, { masterGain: 1 });

  hum.start(t);
  noise.start(t);

  ambientNodes = {
    stop: () => {
      const stopT = c.currentTime;
      humGain.gain.cancelScheduledValues(stopT);
      humGain.gain.setValueAtTime(humGain.gain.value, stopT);
      humGain.gain.exponentialRampToValueAtTime(MIN_EXP_GAIN, stopT + 0.6);
      noiseGain.gain.exponentialRampToValueAtTime(MIN_EXP_GAIN, stopT + 0.6);
      window.setTimeout(() => {
        try {
          hum.stop();
          noise.stop();
        } catch {
          /* ignore */
        }
      }, 650);
      ambientNodes = null;
    },
  };
}

export function stopAmbientLoop() {
  ambientNodes?.stop();
  ambientNodes = null;
}

export function setEngineMasterVolume(volume: number) {
  if (master) master.gain.value = Math.max(0, Math.min(1, volume));
}

export function playSfxEvent(event: SfxEvent, masterVolume = 1) {
  if (typeof window === "undefined") return;
  ensureContext();

  switch (event.type) {
    case "hover":
      playHover(event.kind, event.spatial, masterVolume);
      break;
    case "click":
      playClick(event.spatial, masterVolume);
      break;
    case "select":
      playSelect(event.tier, event.spatial ?? "center", masterVolume);
      break;
    case "rarity_finish":
      playRarityFinish(event.tier, event.spatial, masterVolume);
      break;
    case "box":
      playBox(event.step, event.tier ?? "common", masterVolume);
      break;
    case "fusion":
      playFusion(event.step, masterVolume);
      break;
    case "toast":
      playToast(masterVolume);
      break;
    case "modal_close":
      playModalClose(masterVolume);
      break;
    case "legacy":
      playLegacy(event.id, masterVolume);
      break;
    default:
      break;
  }
}

function playLegacy(id: string, master: number) {
  const map: Record<string, SfxEvent> = {
    ui_hover_soft: { type: "hover", kind: "ui" },
    ui_click: { type: "click" },
    box_open: { type: "box", step: "lock" },
    reveal_flash: { type: "box", step: "flash" },
    item_reveal: { type: "rarity_finish", tier: "epic" },
    fusion_start: { type: "fusion", step: "start" },
    fusion_success: { type: "fusion", step: "success" },
    fusion_fail: { type: "fusion", step: "fail" },
    toast: { type: "toast" },
    modal_close: { type: "modal_close" },
  };
  const ev = map[id];
  if (ev) {
    playSfxEvent(ev, master);
    if (id === "box_open") {
      window.setTimeout(() => playSfxEvent({ type: "box", step: "charge" }, master), 140);
    }
  }
}

/** Box open sequence entry — lock + charging build-up. */
export function playBoxOpenSequence(masterVolume = 1) {
  playSfxEvent({ type: "box", step: "lock" }, masterVolume);
  window.setTimeout(() => playSfxEvent({ type: "box", step: "charge" }, masterVolume), 150);
}

export function playBoxRevealFinish(tier: SfxRarityTier, masterVolume = 1) {
  playSfxEvent({ type: "box", step: "release" }, masterVolume * 0.5);
  window.setTimeout(() => {
    playSfxEvent({ type: "box", step: "flash" }, masterVolume);
  }, 90);
  window.setTimeout(() => {
    playSfxEvent({ type: "box", step: "finish", tier }, masterVolume);
  }, 220);
}
