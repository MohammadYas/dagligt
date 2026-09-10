export type Projekt = {
  id: string;
  navn: string;
  /** Domænet alene. Bruges som underrubrik og til at måle om sitet svarer. */
  domaene: string;
  beskrivelse: string;
  url: string;
  ikon: string;
};

export const PROJEKTER: Projekt[] = [
  {
    id: 'selja',
    navn: 'Selja',
    domaene: 'selja.dk',
    beskrivelse: 'Annoncer, brugere, kreditter',
    url: 'https://selja.dk/log-ind?videre=%2Fadmin',
    ikon: 'briefcase-outline',
  },
  {
    id: 'billedearv',
    navn: 'Billedearv',
    domaene: 'billedearv.dk',
    beskrivelse: 'Ordrer og beskeder',
    url: 'https://billedearv.dk/admin',
    ikon: 'images-outline',
  },
];
