/**
 * Generates minimal premium UI WAV placeholders in public/sfx/.
 * Run: node scripts/generate-sfx.mjs
 */
import { mkdirSync, writeFileSync } from "fs";
import { join } from "path";

const OUT = join(process.cwd(), "public", "sfx");

const PRESETS = {
  ui_hover_soft: { freq: 880, dur: 0.04, vol: 0.28, type: "sine" },
  ui_click: { freq: 520, dur: 0.08, vol: 0.38, type: "triangle" },
  box_open: { freq: 220, dur: 0.24, vol: 0.42, sweep: 1.6 },
  reveal_flash: { freq: 640, dur: 0.16, vol: 0.4, sweep: 0.5 },
  item_reveal: { freq: 392, dur: 0.32, vol: 0.45, sweep: 1.35 },
  fusion_start: { freq: 180, dur: 0.34, vol: 0.38, sweep: 1.2 },
  fusion_success: { freq: 523, dur: 0.38, vol: 0.42, sweep: 1.5 },
  fusion_fail: { freq: 140, dur: 0.42, vol: 0.36, sweep: 0.65 },
  toast: { freq: 740, dur: 0.1, vol: 0.32, type: "sine" },
  modal_close: { freq: 420, dur: 0.06, vol: 0.28, type: "triangle" },
};

function encodeWav(samples, sampleRate = 44100) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2;
  const buffer = Buffer.alloc(44 + dataSize);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + dataSize, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20);
  buffer.writeUInt16LE(numChannels, 22);
  buffer.writeUInt32LE(sampleRate, 24);
  buffer.writeUInt32LE(byteRate, 28);
  buffer.writeUInt16LE(blockAlign, 32);
  buffer.writeUInt16LE(bitsPerSample, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(dataSize, 40);
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    buffer.writeInt16LE(Math.floor(s * 32767), 44 + i * 2);
  }
  return buffer;
}

function synth({ freq, dur, vol, sweep = 1, type = "sine" }) {
  const sr = 44100;
  const n = Math.floor(sr * dur);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const f = freq * (sweep ** (t / dur - 0.5));
    const env = Math.sin((Math.PI * i) / n) ** 1.2;
    let v = 0;
    const phase = 2 * Math.PI * f * t;
    if (type === "triangle") v = (2 / Math.PI) * Math.asin(Math.sin(phase));
    else v = Math.sin(phase);
    out[i] = v * vol * env;
  }
  return out;
}

mkdirSync(OUT, { recursive: true });
for (const [name, preset] of Object.entries(PRESETS)) {
  const samples = synth(preset);
  writeFileSync(join(OUT, `${name}.wav`), encodeWav(samples));
  console.log(`wrote ${name}.wav`);
}
