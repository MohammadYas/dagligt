export type Theme = {
  bg: string;
  card: string;
  cardAlt: string;
  text: string;
  dim: string;
  faint: string;
  line: string;
  accent: string;
  accentBg: string;
  accentText: string;
  done: string;
  advarsel: string;
  fejl: string;
};

/**
 * Legacy light palette remains available to retained, inactive screens.
 * VagtStatus uses dark: black canvas, raised neutral groups, blue actions,
 * and distinct green/amber/red signals always accompanied by text.
 */
export const light: Theme = {
  bg: '#F3F1EC',
  card: '#FFFFFF',
  cardAlt: '#E7E4DC',
  text: '#191817',
  dim: '#55534E',
  faint: '#7E7A72',
  line: '#D8D4C9',
  accent: '#1A5E62',
  accentBg: '#DCE8E7',
  accentText: '#0E3A3D',
  done: '#4A7A22',
  advarsel: '#9A6410',
  fejl: '#A33227',
};

export const dark: Theme = {
  bg: '#000000',
  card: '#1C1C1E',
  cardAlt: '#2C2C2E',
  text: '#F5F5F7',
  dim: '#C5C5CC',
  faint: '#A1A1AA',
  line: '#48484A',
  accent: '#64A8FF',
  accentBg: '#142D4D',
  accentText: '#C1DCFF',
  done: '#5DDB83',
  advarsel: '#FFD06A',
  fejl: '#FF827B',
};
