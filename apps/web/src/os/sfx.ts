/**
 * The FrenOS XP sound scheme. Everything is synthesised with Web Audio, so
 * there are no audio files to download (the only recordings are the songs in
 * Music). The AudioContext is created on the first user gesture and never
 * autoplays.
 */

export type SfxCue =
  | 'post'
  | 'boot'
  | 'startup'
  | 'logon'
  | 'logoff'
  | 'shutdown'
  | 'click'
  | 'navigate'
  | 'menu'
  | 'open'
  | 'close'
  | 'minimize'
  | 'maximize'
  | 'balloon'
  | 'ding'
  | 'error'
  | 'exclamation'
  | 'unlock'
  | 'recycle'
  | 'delete'
  | 'disk'
  | 'catch'
  | 'miss'
  | 'gameover'
  | 'highscore'
  | 'pop'
  | 'blow'
  | 'tada'
  | 'sparkle';

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxGain: GainNode | null = null;
let wet: GainNode | null = null;

let settings = { volume: 0.6, muted: false };

type AudioCtor = typeof AudioContext;

function audioCtor(): AudioCtor | undefined {
  if (typeof window === 'undefined') return undefined;
  const w = window as unknown as { AudioContext?: AudioCtor; webkitAudioContext?: AudioCtor };
  return w.AudioContext ?? w.webkitAudioContext;
}

function ensure(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = audioCtor();
  if (!Ctor) return null;
  try {
    ctx = new Ctor();
  } catch {
    return null;
  }
  master = ctx.createGain();
  sfxGain = ctx.createGain();
  sfxGain.connect(master);
  master.connect(ctx.destination);

  // A small feedback delay gives pads and chimes a soft "room".
  const delay = ctx.createDelay(1);
  delay.delayTime.value = 0.19;
  const feedback = ctx.createGain();
  feedback.gain.value = 0.32;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass';
  tone.frequency.value = 2600;
  wet = ctx.createGain();
  wet.gain.value = 0.28;
  wet.connect(delay);
  delay.connect(tone);
  tone.connect(feedback);
  feedback.connect(delay);
  tone.connect(sfxGain);

  applyGains();
  return ctx;
}

function applyGains(): void {
  if (!master || !sfxGain) return;
  master.gain.value = settings.muted ? 0 : 1;
  sfxGain.gain.value = settings.volume;
}

/** Called on every settings change. */
export function configureSfx(next: { volume: number; muted: boolean }): void {
  settings = { volume: next.volume / 100, muted: next.muted };
  applyGains();
}

/** First user gesture: create + resume the context. */
export function unlockAudio(): void {
  const c = ensure();
  if (c && c.state === 'suspended') void c.resume();
  applyGains();
}

export function audioContext(): AudioContext | null {
  return ensure();
}

interface ToneOpts {
  type?: OscillatorType;
  freq: number;
  to?: number;
  dur: number;
  gain: number;
  delay?: number;
  attack?: number;
  /** Send a share of the tone through the room delay. */
  room?: boolean;
  detune?: number;
}

function tone(opts: ToneOpts): void {
  const c = ensure();
  if (!c || !sfxGain) return;
  const t0 = c.currentTime + (opts.delay ?? 0);
  const attack = opts.attack ?? 0.005;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = opts.type ?? 'sine';
  osc.frequency.setValueAtTime(opts.freq, t0);
  if (opts.detune) osc.detune.setValueAtTime(opts.detune, t0);
  if (opts.to !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(1, opts.to), t0 + opts.dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(opts.gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + attack + opts.dur);
  osc.connect(g);
  g.connect(sfxGain);
  if (opts.room && wet) g.connect(wet);
  osc.start(t0);
  osc.stop(t0 + attack + opts.dur + 0.05);
}

function noise(opts: { dur: number; gain: number; delay?: number; freq?: number; q?: number; type?: BiquadFilterType; sweepTo?: number }): void {
  const c = ensure();
  if (!c || !sfxGain) return;
  const frames = Math.max(1, Math.floor(c.sampleRate * opts.dur));
  const buffer = c.createBuffer(1, frames, c.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buffer;
  const filter = c.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  const t0 = c.currentTime + (opts.delay ?? 0);
  filter.frequency.setValueAtTime(opts.freq ?? 1800, t0);
  if (opts.sweepTo) filter.frequency.exponentialRampToValueAtTime(opts.sweepTo, t0 + opts.dur);
  filter.Q.value = opts.q ?? 0.8;
  const g = c.createGain();
  g.gain.setValueAtTime(opts.gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + opts.dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(sfxGain);
  src.start(t0);
  src.stop(t0 + opts.dur + 0.02);
}

/** A soft bell: fundamental plus an inharmonic partial, long decay. */
function bell(freq: number, delay = 0, gain = 0.05, dur = 1.1): void {
  tone({ freq, dur, gain, delay, room: true });
  tone({ freq: freq * 2.76, dur: dur * 0.45, gain: gain * 0.25, delay, room: true });
  tone({ freq: freq * 2, dur: dur * 0.7, gain: gain * 0.3, delay });
}

/** A warm pad voice: two detuned triangles with a slow swell. */
function pad(freq: number, delay: number, dur: number, gain: number): void {
  tone({ type: 'triangle', freq, dur, gain, delay, attack: 0.35, room: true, detune: -6 });
  tone({ type: 'sine', freq, dur, gain: gain * 0.8, delay, attack: 0.4, room: true, detune: 6 });
}

/** Play a cue. Safe to call before the context exists (it is a no-op). */
export function playSfx(cue: SfxCue): void {
  if (settings.muted || settings.volume <= 0) return;
  const c = ensure();
  if (!c) return;
  if (c.state === 'suspended') void c.resume();
  switch (cue) {
    case 'post':
      tone({ type: 'square', freq: 1200, dur: 0.012, gain: 0.012 });
      break;
    case 'boot':
      tone({ type: 'square', freq: 980, dur: 0.12, gain: 0.03 });
      break;
    case 'startup':
      // A lush E♭ chord that blooms, then a little chime on top.
      pad(155.56, 0, 2.6, 0.05);
      pad(233.08, 0.05, 2.5, 0.04);
      pad(311.13, 0.12, 2.4, 0.035);
      pad(392.0, 0.2, 2.2, 0.03);
      [622.25, 932.33, 1244.51, 1567.98].forEach((f, i) => bell(f, 0.55 + i * 0.16, 0.035, 1.4));
      break;
    case 'logon':
      [523.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.09, 0.04, 0.8));
      break;
    case 'logoff':
      [1046.5, 783.99, 659.25, 523.25].forEach((f, i) => bell(f, i * 0.11, 0.035, 0.8));
      break;
    case 'shutdown':
      pad(392.0, 0, 1.8, 0.035);
      pad(311.13, 0.25, 1.8, 0.035);
      pad(233.08, 0.5, 2.0, 0.04);
      pad(155.56, 0.75, 2.2, 0.045);
      break;
    case 'click':
      noise({ dur: 0.012, gain: 0.05, freq: 3200, q: 1.2 });
      break;
    case 'navigate':
      noise({ dur: 0.018, gain: 0.08, freq: 2400, q: 2 });
      tone({ freq: 1800, dur: 0.01, gain: 0.015 });
      break;
    case 'menu':
      tone({ freq: 1320, dur: 0.03, gain: 0.012 });
      break;
    case 'open':
      tone({ type: 'triangle', freq: 520, to: 780, dur: 0.07, gain: 0.03 });
      break;
    case 'close':
      tone({ type: 'triangle', freq: 700, to: 420, dur: 0.07, gain: 0.025 });
      break;
    case 'minimize':
      noise({ dur: 0.14, gain: 0.03, freq: 2400, sweepTo: 500, q: 1.4 });
      break;
    case 'maximize':
      noise({ dur: 0.14, gain: 0.03, freq: 500, sweepTo: 2600, q: 1.4 });
      break;
    case 'balloon':
      tone({ freq: 880, to: 1320, dur: 0.06, gain: 0.04 });
      bell(1760, 0.07, 0.03, 0.5);
      break;
    case 'ding':
      bell(1567.98, 0, 0.05, 0.9);
      break;
    case 'error':
      tone({ type: 'triangle', freq: 392, dur: 0.22, gain: 0.05, room: true });
      tone({ type: 'triangle', freq: 311.13, dur: 0.3, gain: 0.05, delay: 0.12, room: true });
      break;
    case 'exclamation':
      tone({ type: 'triangle', freq: 659.25, dur: 0.18, gain: 0.05, room: true });
      tone({ type: 'sine', freq: 987.77, dur: 0.2, gain: 0.03, delay: 0.06, room: true });
      break;
    case 'unlock':
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.07, 0.04, 0.6));
      break;
    case 'recycle':
      for (let i = 0; i < 5; i++) noise({ dur: 0.05, gain: 0.05, freq: 1500 + i * 400, q: 0.6, delay: i * 0.045 });
      break;
    case 'delete':
      noise({ dur: 0.16, gain: 0.05, freq: 900, q: 0.5 });
      break;
    case 'disk':
      noise({ dur: 0.04, gain: 0.05, freq: 700 });
      noise({ dur: 0.04, gain: 0.05, freq: 900, delay: 0.07 });
      noise({ dur: 0.05, gain: 0.04, freq: 600, delay: 0.15 });
      break;
    case 'catch':
      tone({ type: 'triangle', freq: 880, to: 1320, dur: 0.06, gain: 0.05 });
      break;
    case 'miss':
      noise({ dur: 0.09, gain: 0.05, freq: 500 });
      tone({ type: 'square', freq: 110, dur: 0.09, gain: 0.04 });
      break;
    case 'gameover':
      tone({ type: 'square', freq: 440, to: 110, dur: 0.45, gain: 0.05 });
      break;
    case 'highscore':
      [523.25, 783.99, 1046.5].forEach((f, i) => bell(f, i * 0.1, 0.05, 0.6));
      break;
    case 'pop':
      noise({ dur: 0.06, gain: 0.06, freq: 1200, q: 1 });
      tone({ freq: 660, to: 330, dur: 0.06, gain: 0.03 });
      break;
    case 'blow':
      noise({ dur: 0.55, gain: 0.06, freq: 700, sweepTo: 300, q: 0.4, type: 'lowpass' });
      break;
    case 'tada':
      [
        [392.0, 0],
        [523.25, 0.08],
        [659.25, 0.16],
        [783.99, 0.24],
      ].forEach(([f, d]) => tone({ type: 'triangle', freq: f as number, dur: 0.9, gain: 0.035, delay: d as number, room: true }));
      [1046.5, 1318.51, 1567.98].forEach((f, i) => bell(f, 0.34 + i * 0.05, 0.03, 1.2));
      break;
    case 'sparkle':
      [1318.51, 1567.98, 1975.53, 2349.32, 2637.02].forEach((f, i) => bell(f, i * 0.06, 0.02, 0.7));
      break;
  }
}

/* ───────────────────────────── music box ─────────────────────────────── */

const NOTE: Record<string, number> = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.0, A4: 440.0, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.0, B5: 987.77,
  C6: 1046.5,
};

/** "Happy Birthday to You" (public domain), as [note, beats] pairs in 3/4. */
const HAPPY_BIRTHDAY: Array<[string, number]> = [
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['C5', 1], ['B4', 2],
  ['G4', 0.75], ['G4', 0.25], ['A4', 1], ['G4', 1], ['D5', 1], ['C5', 2],
  ['G4', 0.75], ['G4', 0.25], ['G5', 1], ['E5', 1], ['C5', 1], ['B4', 1], ['A4', 2],
  ['F5', 0.75], ['F5', 0.25], ['E5', 1], ['C5', 1], ['D5', 1], ['C5', 3],
];

/**
 * Plays "Happy Birthday" on a little synthesized music box. Returns the
 * song length in seconds (0 when sound is unavailable or muted).
 */
export function playBirthdaySong(bpm = 132): number {
  if (settings.muted || settings.volume <= 0) return 0;
  const c = ensure();
  if (!c) return 0;
  if (c.state === 'suspended') void c.resume();
  const beat = 60 / bpm;
  let at = 0.05;
  for (const [name, beats] of HAPPY_BIRTHDAY) {
    const f = NOTE[name] ?? 440;
    const len = Math.max(0.35, beats * beat * 1.6);
    bell(f * 2, at, 0.045, len);
    if (beats >= 1) tone({ type: 'triangle', freq: f / 2, dur: beats * beat, gain: 0.018, delay: at, attack: 0.02 });
    at += beats * beat;
  }
  return at + 1;
}
