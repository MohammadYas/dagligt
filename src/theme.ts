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
};

export const light: Theme = {
  bg: '#F4F2ED',
  card: '#FFFFFF',
  cardAlt: '#F1EFE8',
  text: '#1C1C1A',
  dim: '#5F5E5A',
  faint: '#96948C',
  line: '#E2E0D8',
  accent: '#534AB7',
  accentBg: '#EEEDFE',
  accentText: '#26215C',
  done: '#639922',
};

export const dark: Theme = {
  bg: '#141413',
  card: '#1F1F1E',
  cardAlt: '#282826',
  text: '#F2F1EC',
  dim: '#A5A39B',
  faint: '#75736C',
  line: '#33322F',
  accent: '#AFA9EC',
  accentBg: '#2B2748',
  accentText: '#CECBF6',
  done: '#97C459',
};
