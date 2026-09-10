export type Projekt = {
  id: string;
  navn: string;
  beskrivelse: string;
  url: string;
  ikon: string;
};

export const PROJEKTER: Projekt[] = [
  {
    id: 'selja',
    navn: 'Selja',
    beskrivelse: 'selja.dk · admin',
    url: 'https://selja.dk/admin',
    ikon: 'briefcase-outline',
  },
  {
    id: 'billedearv',
    navn: 'Billedearv',
    beskrivelse: 'billedearv.dk · admin',
    url: 'https://billedearv.dk/admin',
    ikon: 'images-outline',
  },
];
