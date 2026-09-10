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
 * Én kulør baerer al interaktion: petroleum. Den er valgt fordi den kan
 * staa ved siden af de tre tilstandsfarver uden at forveksles med nogen —
 * graesgroen betyder koerer, okker betyder tavs, teglroed betyder stoppet.
 * Farve optraeder ikke andre steder end de fire.
 *
 * Baggrundene er varme neutraler frem for hvidt og sort; en skaerm der
 * laeses kl. 5 om morgenen skal ikke lyse som papir.
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
  bg: '#131211',
  card: '#1C1B19',
  cardAlt: '#252320',
  text: '#F0EEE8',
  dim: '#A8A49B',
  faint: '#8C887F',
  line: '#312E2A',
  accent: '#6FB8BC',
  accentBg: '#17322F',
  accentText: '#9FD3D5',
  done: '#93B84E',
  advarsel: '#D19A3C',
  fejl: '#E0705F',
};
