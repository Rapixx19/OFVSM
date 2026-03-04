/**
 * @file haptics.ts
 * @summary Web Haptics API wrappers for tactile feedback
 * @dependencies navigator.vibrate API
 */

/**
 * Check if haptics are supported
 */
function isHapticsSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

/**
 * Light tap feedback - used for button presses
 * Pattern: 10ms single vibration
 */
export function lightTap(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(10);
}

/**
 * Success pulse feedback - used for transaction confirmations
 * Pattern: 50ms vibrate, 50ms pause, 100ms vibrate
 */
export function successPulse(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate([50, 50, 100]);
}

/**
 * Warning pattern feedback - used for expert mode toggles or failures
 * Pattern: 100ms vibrate, 50ms pause, 100ms vibrate, 50ms pause, 100ms vibrate
 */
export function warningPattern(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate([100, 50, 100, 50, 100]);
}

/**
 * Cancel any ongoing vibration
 */
export function cancelHaptics(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(0);
}

/**
 * Custom vibration pattern
 * @param pattern - Array of vibration/pause durations in ms
 */
export function customPattern(pattern: number[]): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate(pattern);
}

/**
 * Haptic feedback types
 */
export type HapticType = 'light' | 'medium' | 'success' | 'error';

/**
 * Unified haptic API for consistent feedback
 * @param type - The type of haptic feedback to trigger
 */
export function triggerHaptic(type: HapticType): void {
  if (!isHapticsSupported()) return;

  switch (type) {
    case 'light':
      navigator.vibrate(10);
      break;
    case 'medium':
      navigator.vibrate(25);
      break;
    case 'success':
      navigator.vibrate([50, 50, 100]);
      break;
    case 'error':
      navigator.vibrate([100, 50, 100, 50, 100]);
      break;
  }
}

/**
 * Jackpot pulse - celebratory haptic for 100/100 trust score
 * Pattern: Three rapid pulses (40ms each, 30ms gaps)
 */
export function jackpotPulse(): void {
  if (!isHapticsSupported()) return;
  navigator.vibrate([40, 30, 40, 30, 40]);
}
