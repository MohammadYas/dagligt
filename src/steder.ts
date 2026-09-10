// Alle fremmoedesteder, grupperet efter adresse.
// "standard" markerer de 19 der koerer i dag. Resten er slaaet fra,
// men bliver skrevet til filen som "# Navn" saa de kan vaelges til igen.

export type StedGruppe = {
  adresse: string;
  by: string;
  note?: string;
  steder: { navn: string; standard: boolean }[];
};

export const GRUPPER: StedGruppe[] = [
  {
    adresse: 'Hashøjvej 7',
    by: '4200 Slagelse',
    steder: [
      { navn: 'Team Forlev', standard: true },
      { navn: 'Team Vemmelev', standard: true },
      { navn: 'Team Stillinge', standard: true },
      { navn: 'Team Sørby', standard: true },
      { navn: 'Slagelse Nat', standard: true },
    ],
  },
  {
    adresse: 'Linde Allé 56',
    by: '4220 Korsør',
    steder: [
      { navn: 'Team Bragesvej', standard: true },
      { navn: 'Team Motalavej', standard: true },
      { navn: 'Team Tårnborgvej', standard: true },
      { navn: 'Team Svenstrup', standard: true },
      { navn: 'Team Skovvej', standard: true },
      { navn: 'Team Skovåsen', standard: true },
      { navn: 'Team Boeslunde', standard: true },
      { navn: 'Team Nygade', standard: true },
      { navn: 'Korsør Nat', standard: false },
    ],
  },
  {
    adresse: 'Sdr. Stationsvej 6',
    by: '4200 Slagelse',
    note: 'Registrér parkering ved hoveddøren, på venstre hånd.',
    steder: [
      { navn: 'Team Kalvehaven', standard: false },
      { navn: 'Team Digterhaven', standard: false },
      { navn: 'Team Naverhaven', standard: false },
      { navn: 'Team Alliancehaven', standard: false },
    ],
  },
  {
    adresse: 'Smedegade 32',
    by: '4200 Slagelse',
    steder: [
      { navn: 'Team Århusvej', standard: true },
      { navn: 'Team Byskovvej', standard: true },
      { navn: 'Team Rosenkildevej', standard: true },
      { navn: 'Team Sorterup', standard: true },
      { navn: 'Team Sønderås', standard: true },
      { navn: 'Team Lille Valby', standard: true },
    ],
  },
  {
    adresse: 'Næstvedvej 15',
    by: '4230 Skælskør',
    steder: [
      { navn: 'Team Maglehaven', standard: false },
      { navn: 'Team Norvejen', standard: false },
      { navn: 'Team Rådmandshaven', standard: false },
      { navn: 'Team Bakkedraget', standard: false },
      { navn: 'Team Flakkebjerg', standard: false },
      { navn: 'Team Bisserup', standard: false },
      { navn: 'Skælskør Nat', standard: false },
    ],
  },
];

export const SYGEMELDING = {
  telefon: '22 62 72 85',
  frister: [
    { vagt: 'Dagvagt', senest: '06:30' },
    { vagt: 'Aftenvagt', senest: '09:00' },
    { vagt: 'Nattevagt', senest: '12:00' },
  ],
};

/** Adressen et stednavn hoerer til, eller null hvis det ikke staar i kataloget. */
export function gruppeFor(navn: string): StedGruppe | null {
  return GRUPPER.find((g) => g.steder.some((s) => s.navn === navn)) ?? null;
}

/** Alle navne i kataloget, i katalogets raekkefoelge. */
export function alleNavne(): string[] {
  return GRUPPER.flatMap((g) => g.steder.map((s) => s.navn));
}
