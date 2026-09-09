/**
 * A short two-note chime rendered with WebAudio — no audio file, works offline.
 * Browsers require a user gesture before sound can play, so `unlock()` must be
 * called from a pointer/keyboard event first.
 */
let ctx: AudioContext | null = null;

export function unlockChime(): boolean {
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === "suspended") void ctx.resume();
    return true;
  } catch {
    return false;
  }
}

export function isChimeUnlocked(): boolean {
  return !!ctx && ctx.state === "running";
}

export function playChime(): void {
  if (!ctx || ctx.state !== "running") return;
  const now = ctx.currentTime;
  const notes: [number, number][] = [
    [659.25, 0], // E5
    [880, 0.14], // A5
  ];
  for (const [freq, offset] of notes) {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.25, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.5);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.55);
  }
}
