import { TextStyle } from 'react-native';

/**
 * iOS-tekststilene, ikke egne tal. Systemet har allerede besluttet
 * stoerrelse, linjeafstand og tracking for hvert trin, og Dynamic Type
 * skalerer dem forskelligt — body vokser mere end footnote.
 */
export const Type = {
  largeTitle: { fontSize: 34, lineHeight: 41, fontWeight: '700', letterSpacing: -0.8 },
  title1: { fontSize: 28, lineHeight: 34, fontWeight: '700', letterSpacing: -0.6 },
  title2: { fontSize: 22, lineHeight: 28, fontWeight: '600', letterSpacing: -0.4 },
  title3: { fontSize: 20, lineHeight: 25, fontWeight: '600', letterSpacing: -0.3 },
  headline: { fontSize: 17, lineHeight: 22, fontWeight: '600', letterSpacing: -0.2 },
  body: { fontSize: 17, lineHeight: 22, fontWeight: '400' },
  callout: { fontSize: 16, lineHeight: 21, fontWeight: '400' },
  subhead: { fontSize: 15, lineHeight: 20, fontWeight: '400' },
  footnote: { fontSize: 13, lineHeight: 18, fontWeight: '400' },
  caption1: { fontSize: 12, lineHeight: 16, fontWeight: '400' },
  caption2: { fontSize: 11, lineHeight: 13, fontWeight: '400' },
} satisfies Record<string, TextStyle>;

/** Maalinger: tabulaere cifre, saa tallene ikke hopper naar de skifter. */
export const Tal: TextStyle = { fontVariant: ['tabular-nums'] };

/**
 * Tab-linjen kan ikke vokse til AX-stoerrelser uden at aede en fjerdedel
 * af skaermen, saa dens labels faar et loft. Alt andet skalerer frit.
 */
export const TAB_LOFT = 1.3;
