/**
 * Haptic feedback utility using Navigator.vibrate() API.
 * Falls back silently on unsupported devices.
 */

type HapticPattern = 'light' | 'medium' | 'heavy' | 'success' | 'error' | 'selection';

const PATTERNS: Record<HapticPattern, number | number[]> = {
  light: 10,
  medium: 25,
  heavy: 50,
  success: [15, 50, 30],
  error: [50, 30, 50, 30, 50],
  selection: 5,
};

function isSupported(): boolean {
  return typeof navigator !== 'undefined' && 'vibrate' in navigator;
}

export function haptic(pattern: HapticPattern = 'light'): void {
  if (!isSupported()) return;
  try {
    navigator.vibrate(PATTERNS[pattern]);
  } catch {
    // Silently fail
  }
}

export function hapticLight(): void { haptic('light'); }
export function hapticMedium(): void { haptic('medium'); }
export function hapticSuccess(): void { haptic('success'); }
export function hapticError(): void { haptic('error'); }
export function hapticSelection(): void { haptic('selection'); }
