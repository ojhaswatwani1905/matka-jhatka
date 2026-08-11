/**
 * Web Vibration API (Haptics) utility for mobile feedback
 * Gated by device support and user sound/feedback preference
 */
export const haptics = {
  isSupported: (): boolean => typeof window !== 'undefined' && 'vibrate' in navigator,

  /** Short subtle tick on bet placement */
  bet: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(15); } catch { /* ignore */ }
    }
  },

  /** Gentle double-tap for small wins (<5x) */
  winSmall: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([25, 30, 25]); } catch { /* ignore */ }
    }
  },

  /** Medium pulsed rhythm for medium wins (5x-20x) */
  winMedium: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([50, 40, 70, 40, 100]); } catch { /* ignore */ }
    }
  },

  /** Elaborate celebratory vibration pattern for Big Wins / Jackpots (20x+) */
  jackpot: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate([100, 50, 150, 50, 200, 50, 300]); } catch { /* ignore */ }
    }
  },

  /** Single firm buzz on loss */
  loss: () => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try { navigator.vibrate(40); } catch { /* ignore */ }
    }
  },
};
