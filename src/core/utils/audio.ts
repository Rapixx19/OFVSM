/**
 * @file audio.ts
 * @summary Audio feedback utilities for success chimes
 * @dependencies Web Audio API
 */

let audioContext: AudioContext | null = null;

/**
 * Get or create AudioContext (lazy initialization)
 */
function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;

  if (!audioContext) {
    audioContext = new (window.AudioContext ||
      (window as typeof window & { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
  }
  return audioContext;
}

/**
 * Play success chime - 300ms high-fidelity audio
 * Creates a pleasant ascending tone sequence
 */
export function playSuccessChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  // Resume context if suspended (autoplay policy)
  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const duration = 0.3;

  // Create oscillator for pleasant tone
  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(523.25, now); // C5
  oscillator.frequency.setValueAtTime(659.25, now + 0.1); // E5
  oscillator.frequency.setValueAtTime(783.99, now + 0.2); // G5

  // Envelope for smooth attack/release
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.3, now + 0.05);
  gainNode.gain.linearRampToValueAtTime(0.2, now + 0.15);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play error tone - short descending tone
 */
export function playErrorTone(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const duration = 0.2;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(440, now); // A4
  oscillator.frequency.setValueAtTime(349.23, now + 0.1); // F4

  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.25, now + 0.03);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}

/**
 * Play warning chime - subtle low-frequency tone for danger scores
 * Used when trust score drops below 30
 */
export function playWarningChime(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  if (ctx.state === 'suspended') {
    ctx.resume();
  }

  const now = ctx.currentTime;
  const duration = 0.4;

  const oscillator = ctx.createOscillator();
  const gainNode = ctx.createGain();

  // Low frequency warning tone
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(196, now); // G3 (low)
  oscillator.frequency.setValueAtTime(165, now + 0.2); // E3 (lower)

  // Subtle volume
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05);
  gainNode.gain.linearRampToValueAtTime(0.1, now + 0.2);
  gainNode.gain.linearRampToValueAtTime(0, now + duration);

  oscillator.connect(gainNode);
  gainNode.connect(ctx.destination);

  oscillator.start(now);
  oscillator.stop(now + duration);
}
