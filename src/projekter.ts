export type Projekt = {
  id: string;
  navn: string;
  beskrivelse: string;
  url: string;
  ikon: string;
};

// URL'er skal udfyldes. Tomme aabner ikke noget.
export const PROJEKTER: Projekt[] = [
  {
    id: 'selja',
    navn: 'Selja',
    beskrivelse: 'Admin',
    url: '',
    ikon: 'briefcase-outline',
  },
  {
    id: 'billedearv',
    navn: 'Billedearv',
    beskrivelse: 'Admin panel',
    url: '',
    ikon: 'images-outline',
  },
];
