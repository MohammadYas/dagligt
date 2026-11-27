import { FormEvent, useState } from 'react';
import { alleNavne, gruppeFor } from '../../src/steder';
import { navn, normaliser } from '../../src/vagtdata';
import Ikon from '../ui/Ikon';
import { Besked, Felt, Gruppe, Knap } from '../ui/kit';

/** Places grouped by address like the old editor, with search and "Tilføj nyt sted". */
export default function Stedvaelger({ valgte, kendte, onSkift, onTilfoej }: {
  valgte: string[]; kendte: string[]; onSkift: (n: string) => void; onTilfoej: (n: string) => void;
}) {
  const [soeg, setSoeg] = useState('');
  const [nyt, setNyt] = useState<string | null>(null);
  const [fejl, setFejl] = useState('');
  const [egne, setEgne] = useState<string[]>([]);
  const valgt = new Set(valgte.map(normaliser));
  const navne = [...new Map([...alleNavne(), ...kendte, ...valgte, ...egne].map(n => [normaliser(n), n])).values()];

  const grupper = new Map<string, string[]>();
  for (const n of navne.filter(n => normaliser(n).includes(normaliser(soeg)))) {
    const g = gruppeFor(n);
    const titel = g ? `${g.by.split(' ').slice(1).join(' ')} · ${g.adresse}` : 'Øvrige steder';
    grupper.set(titel, [...(grupper.get(titel) ?? []), n]);
  }

  const tilfoej = (e: FormEvent) => {
    e.preventDefault();
    try {
      const n = navn(nyt ?? '');
      if (navne.some(s => normaliser(s) === normaliser(n))) throw new Error('Stedet findes allerede. Find det i listen.');
      setEgne(s => [...s, n]); onTilfoej(n); setNyt(null); setFejl('');
    } catch (err) { setFejl(err instanceof Error ? err.message : 'Navnet kan ikke bruges.'); }
  };

  return (
    <div className="knapper" style={{ gap: 20 }}>
      <Felt label="Søg efter sted" type="search" placeholder="Navn på team eller sted" value={soeg} onChange={e => setSoeg(e.target.value)} />
      {[...grupper].map(([titel, liste]) => (
        <Gruppe key={titel} titel={titel}>
          {liste.map(n => {
            const til = valgt.has(normaliser(n));
            return (
              <button key={n} type="button" role="checkbox" aria-checked={til} className="raekke sted" onClick={() => onSkift(n)}>
                <span className="raekke__tekst"><span className="t-body">{n}</span></span>
                <span className="sted__tjek" aria-hidden><Ikon navn="tjek" str={16} tyk={3} /></span>
              </button>
            );
          })}
        </Gruppe>
      ))}
      {!grupper.size && <Besked tekst="Ingen steder matcher din søgning. Du kan tilføje et nyt sted nedenfor." />}
      {nyt === null
        ? <Knap label="Tilføj nyt sted" ikon="plus" fuld onPress={() => setNyt(soeg)} />
        : (
          <form className="knapper" onSubmit={tilfoej}>
            <Felt label="Navn på nyt sted" value={nyt} onChange={e => setNyt(e.target.value)} autoFocus />
            <Knap type="submit" label="Tilføj sted" variant="primaer" fuld />
            <Knap label="Annuller" variant="stille" fuld onPress={() => { setNyt(null); setFejl(''); }} />
          </form>
        )}
      {fejl && <Besked tekst={fejl} fejl />}
    </div>
  );
}
