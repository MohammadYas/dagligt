import { FormEvent, PointerEvent, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import type { Bureau } from '../../src/vagtdata';
import { navn, normaliser } from '../../src/vagtdata';
import { Skaerm } from '../rute';
import GemLinje from '../komponenter/GemLinje';
import { useSession } from '../data/session';
import Ikon from '../ui/Ikon';
import { Besked, Felt, Hoved, IkonKnap, Knap } from '../ui/kit';

/** Agencies in priority order. Everything is a draft until "Gem ændringer". */
export default function Arbejdspladser({ gaa }: { gaa: (s: Skaerm) => void }) {
  const session = useSession();
  const entry = session.get('bureauer');
  const rows = entry.draft;
  const [nyt, setNyt] = useState<string | null>(null);
  const [fejl, setFejl] = useState('');
  const saet = (next: Bureau[]) => session.edit('bureauer', next);
  const flyt = (fra: number, til: number) => {
    if (!rows || til < 0 || til >= rows.length) return;
    const next = [...rows]; next.splice(til, 0, next.splice(fra, 1)[0]); saet(next);
  };
  const tilfoej = (e: FormEvent) => {
    e.preventDefault();
    if (!rows) return;
    try {
      const n = navn(nyt ?? '');
      if (rows.some(r => normaliser(r.navn) === normaliser(n))) throw new Error('Arbejdspladsen findes allerede.');
      saet([...rows, { navn: n, aktiv: true }]); setNyt(null); setFejl('');
    } catch (err) { setFejl(err instanceof Error ? err.message : 'Navnet kan ikke bruges.'); }
  };

  return (
    <div className="side">
      <Hoved titel="Arbejdspladser" onTilbage={() => gaa('hjem')} tilbage="VagtStatus"
        under="Øverste arbejdsplads har førsteprioritet, hvis to vagter kolliderer. Træk i håndtaget eller brug pilene." />

      {entry.error && !rows && (
        <div className="knapper">
          <Besked tekst={entry.error} fejl />
          <Knap label="Prøv igen" onPress={() => void session.load('bureauer')} />
          {entry.missing && <Knap label="Opret indstillinger" onPress={() => session.initialize('bureauer', [])} />}
        </div>
      )}
      {!rows && !entry.error && <Besked tekst="Henter arbejdspladser…" />}

      {rows && (
        <>
          {rows.length
            ? (
              <Reorder.Group as="ul" axis="y" values={rows} onReorder={saet} className="gruppe__flade bureauer">
                {rows.map((r, i) => (
                  <Raekke key={r.navn} r={r} i={i} sidst={i === rows.length - 1}
                    onAktiv={aktiv => saet(rows.map((x, j) => (j === i ? { ...x, aktiv } : x)))}
                    onFlyt={til => flyt(i, til)} onSlet={() => saet(rows.filter((_, j) => j !== i))} />
                ))}
              </Reorder.Group>
            )
            : <Besked tekst="Tilføj din første arbejdsplads." />}

          {nyt === null
            ? <Knap label="Tilføj arbejdsplads" ikon="plus" fuld onPress={() => setNyt('')} />
            : (
              <form className="knapper" onSubmit={tilfoej}>
                <Felt label="Arbejdspladsens navn" value={nyt} onChange={e => setNyt(e.target.value)} autoFocus />
                <Knap type="submit" label="Tilføj arbejdsplads" variant="primaer" fuld />
                <Knap label="Annuller" variant="stille" fuld onPress={() => { setNyt(null); setFejl(''); }} />
              </form>
            )}
          {fejl && <Besked tekst={fejl} fejl />}
        </>
      )}
      <GemLinje session={session} />
      <div aria-hidden style={{ height: 96 }} />
    </div>
  );
}

function Raekke({ r, i, sidst, onAktiv, onFlyt, onSlet }: {
  r: Bureau; i: number; sidst: boolean; onAktiv: (v: boolean) => void; onFlyt: (til: number) => void; onSlet: () => void;
}) {
  const traek = useDragControls();
  return (
    <Reorder.Item as="li" value={r} dragListener={false} dragControls={traek} className="bureau" whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' }}>
      <span className="bureau__greb" aria-hidden onPointerDown={(e: PointerEvent) => traek.start(e)}><Ikon navn="greb" /></span>
      <button type="button" role="switch" aria-checked={r.aktiv} aria-label={`${r.navn} aktiv`} className="bureau__navn kontakt" onClick={() => onAktiv(!r.aktiv)}>
        <span className="raekke__tekst"><span className="t-body">{i + 1}. {r.navn}</span><span className="t-foot">{r.aktiv ? 'Aktiv' : 'Slået fra'}</span></span>
        <span className="kontakt__spor" aria-hidden><span className="kontakt__knop" style={{ display: 'block' }} /></span>
      </button>
      <span className="bureau__knapper">
        <IkonKnap navn="op" label={`Flyt ${r.navn} op`} onPress={() => onFlyt(i - 1)} deaktiveret={i === 0} />
        <IkonKnap navn="ned" label={`Flyt ${r.navn} ned`} onPress={() => onFlyt(i + 1)} deaktiveret={sidst} />
        <IkonKnap navn="skraldespand" label={`Slet ${r.navn}`} onPress={onSlet} fare />
      </span>
    </Reorder.Item>
  );
}
