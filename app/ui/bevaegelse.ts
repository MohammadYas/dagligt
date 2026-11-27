import { useReducedMotion } from 'motion/react';

// Same curves as the CSS tokens in styles.css (emilkowalski/skills · animate).
export const EASE_OUT = [0.23, 1, 0.32, 1] as const;
export const EASE_IN_OUT = [0.77, 0, 0.175, 1] as const;
export const EASE_DRAWER = [0.32, 0.72, 0, 1] as const;

/** Entrances/exits of small things: 200ms strong ease-out. */
export const hurtig = { duration: 0.2, ease: EASE_OUT };
/** Sheets: iOS drawer curve. */
export const ark = { duration: 0.45, ease: EASE_DRAWER };
/** Settling after a drag keeps the gesture's velocity. */
export const fjeder = { type: 'spring', duration: 0.5, bounce: 0.2 } as const;

/** Reduced motion keeps fades, drops movement. */
export function useDaempet(): boolean {
  return useReducedMotion() ?? false;
}
