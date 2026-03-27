// Web Audio API sound synthesis — no audio files needed.
// All sounds are generated programmatically and are safe for kids.

const STORAGE_KEY = "vb_sounds_muted";

// ── Singleton AudioContext ──────────────────────────────────
let _ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!_ctx || _ctx.state === "closed") {
      _ctx = new AudioContext();
    }
    if (_ctx.state === "suspended") {
      _ctx.resume();
    }
    return _ctx;
  } catch {
    return null;
  }
}

// ── Mute helpers ───────────────────────────────────────────
export function isSoundMuted(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === "true";
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(STORAGE_KEY, muted ? "true" : "false");
  } catch {}
}

// ── Low-level tone primitive ───────────────────────────────
function tone(
  ctx: AudioContext,
  freq: number,
  startOffset: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime + startOffset);
  gain.gain.setValueAtTime(0, ctx.currentTime + startOffset);
  gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startOffset + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startOffset + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + startOffset);
  osc.stop(ctx.currentTime + startOffset + duration + 0.05);
}

// ── Public sound functions ─────────────────────────────────

/** Short ascending "ding ding" — correct answer */
export function playCorrect() {
  if (isSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  tone(ctx, 523.25, 0,    0.14); // C5
  tone(ctx, 659.25, 0.11, 0.22); // E5
}

/** Descending "bwong" — wrong answer */
export function playWrong() {
  if (isSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "triangle";
  osc.frequency.setValueAtTime(320, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(140, ctx.currentTime + 0.35);
  gain.gain.setValueAtTime(0.28, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.38);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.42);
}

/** Ascending three-note arpeggio — streak of 3+ */
export function playStreak() {
  if (isSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  tone(ctx, 523.25, 0,    0.14); // C5
  tone(ctx, 659.25, 0.11, 0.14); // E5
  tone(ctx, 783.99, 0.22, 0.25); // G5
}

/** Urgent beeps — speed round timer under 2 seconds */
export function playTimerWarning() {
  if (isSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  [0, 0.16, 0.32].forEach((t) => tone(ctx, 880, t, 0.09, "square", 0.18));
}

/** Joyful ascending fanfare — end-of-quiz celebration (≥80%) */
export function playCelebration() {
  if (isSoundMuted()) return;
  const ctx = getCtx();
  if (!ctx) return;
  // Ascending arpeggio C5 E5 G5 C6
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => tone(ctx, freq, i * 0.13, 0.28));
  // Final chord swell after the run
  setTimeout(() => {
    const ctx2 = getCtx();
    if (!ctx2) return;
    tone(ctx2, 523.25, 0, 0.5, "sine", 0.2);
    tone(ctx2, 659.25, 0, 0.5, "sine", 0.2);
    tone(ctx2, 783.99, 0, 0.5, "sine", 0.2);
  }, notes.length * 130 + 60);
}
