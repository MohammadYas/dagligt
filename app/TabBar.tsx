import Ikon, { IkonNavn } from './ui/Ikon';
import type { Skaerm } from './rute';

export type Fane = 'hjem' | 'loen' | 'rute';
const FANER: { key: Fane; label: string; ikon: IkonNavn }[] = [
  { key: 'hjem', label: 'Hjem', ikon: 'hjem' },
  { key: 'loen', label: 'Løn', ikon: 'loen' },
  { key: 'rute', label: 'Rute', ikon: 'rute' },
];

/** Which tab a screen belongs to. Vagt sub-screens live under Hjem. */
export function faneFor(s: Skaerm): Fane {
  return s === 'loen' ? 'loen' : s === 'rute' ? 'rute' : 'hjem';
}

// Tab switches happen tens of times a day: no animation (animate › frequency gate).
export default function TabBar({ aktiv, vaelg }: { aktiv: Fane; vaelg: (f: Fane) => void }) {
  return (
    <nav className="fanebar" role="tablist" aria-label="Hovedmenu">
      {FANER.map(f => (
        <button key={f.key} role="tab" className="fane" aria-selected={aktiv === f.key} onClick={() => vaelg(f.key)}>
          <Ikon navn={f.ikon} str={26} tyk={aktiv === f.key ? 2.1 : 1.7} />
          <span>{f.label}</span>
        </button>
      ))}
    </nav>
  );
}
