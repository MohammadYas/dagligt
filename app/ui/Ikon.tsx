// Small stroke icons drawn for this app (24×24 grid). currentColor everywhere.
const STIER = {
  hjem: 'M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1z',
  loen: 'M3 7.5A1.5 1.5 0 0 1 4.5 6h15A1.5 1.5 0 0 1 21 7.5v9a1.5 1.5 0 0 1-1.5 1.5h-15A1.5 1.5 0 0 1 3 16.5zM12 14.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5zM6.5 9.5v5M17.5 9.5v5',
  rute: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11zM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5z',
  frem: 'M9.5 5.5 16 12l-6.5 6.5',
  tilbage: 'M14.5 5.5 8 12l6.5 6.5',
  op: 'M5.5 14.5 12 8l6.5 6.5',
  ned: 'M5.5 9.5 12 16l6.5-6.5',
  plus: 'M12 5v14M5 12h14',
  luk: 'M6 6l12 12M18 6 6 18',
  tjek: 'M5 12.5l4.5 4.5L19 7.5',
  tandhjul: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.5-2-3.4-2.3 1a7.5 7.5 0 0 0-2.6-1.5L14 2.6h-4l-.5 2.5a7.5 7.5 0 0 0-2.6 1.5l-2.3-1-2 3.4 2 1.5a7.6 7.6 0 0 0 0 3l-2 1.5 2 3.4 2.3-1a7.5 7.5 0 0 0 2.6 1.5l.5 2.5h4l.5-2.5a7.5 7.5 0 0 0 2.6-1.5l2.3 1 2-3.4z',
  kalender: 'M4 7a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2zM4 10h16M8.5 3v4M15.5 3v4',
  bygning: 'M5 21V5a1 1 0 0 1 1-1h8a1 1 0 0 1 1 1v16M15 10h3a1 1 0 0 1 1 1v10M3 21h18M8.5 8h3M8.5 12h3M8.5 16h3',
  opdater: 'M20 11a8 8 0 1 0-2.3 5.7M20 5v6h-6',
  skraldespand: 'M5 7h14M10 11v6M14 11v6M6.5 7l1 12.5a1 1 0 0 0 1 .9h7a1 1 0 0 0 1-.9l1-12.5M9.5 7V4.5h5V7',
  greb: 'M9 7h.01M15 7h.01M9 12h.01M15 12h.01M9 17h.01M15 17h.01',
  sted: 'M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11z',
  advarsel: 'M12 4 2.8 19.5h18.4zM12 10v4.5M12 17.2h.01',
  klokke: 'M6 16V11a6 6 0 1 1 12 0v5l1.5 2h-15zM10 20.5a2 2 0 0 0 4 0',
  laas: 'M6.5 11h11a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1zM8.5 11V8a3.5 3.5 0 0 1 7 0v3',
} as const;

export type IkonNavn = keyof typeof STIER;

export default function Ikon({ navn, str = 22, tyk = 1.8 }: { navn: IkonNavn; str?: number; tyk?: number }) {
  return (
    <svg width={str} height={str} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={tyk} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      <path d={STIER[navn]} />
    </svg>
  );
}
