import { PointerEvent, useEffect, useRef, useState } from 'react';
import { Reorder, useDragControls } from 'motion/react';
import { Forslag, soeg } from '../../src/adresse';
import { afstand, kortLinks, planlaeg, Rute as RuteType, Stop, tid } from '../../src/rute';
import { forklar, hentPlacering, Tilstand } from '../data/placering';
import Ikon from '../ui/Ikon';
import { Besked, Felt, Gruppe, Hoved, IkonKnap, Knap, Raekke } from '../ui/kit';

const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;

/** Route planner. Stays mounted while you switch tabs, so the stops survive. */
export default function Rute() {
  const [q, setQ] = useState('');
  const [forslag, setForslag] = useState<Forslag[]>([]);
  const [soeger, setSoeger] = useState(false);
  const [soegeFejl, setSoegeFejl] = useState('');
  const [stop, setStop] = useState<Stop[]>([]);
  const [rute, setRute] = useState<RuteType | null>(null);
  const [planlaegger, setPlanlaegger] = useState(false);
  const [fejl, setFejl] = useState('');
  const [start, setStart] = useState<Tilstand>('ukendt');
  const [startPunkt, setStartPunkt] = useState<Stop | null>(null);
  const [bekraeftRyd, setBekraeftRyd] = useState(false);
  const revision = useRef(0);

  // Search 250ms after the last keystroke; each search cancels the one before.
  useEffect(() => {
    setSoegeFejl('');
    if (q.trim().length < 3) { setForslag([]); setSoeger(false); return; }
    const ctrl = new AbortController();
    const id = setTimeout(async () => {
      setSoeger(true);
      try {
        const fundet = await soeg(q, ctrl.signal);
        setForslag(fundet);
        if (!fundet.length) setSoegeFejl('Ingen adresser fundet. Prøv vejnavn, husnummer og by.');
      } catch {
        if (!ctrl.signal.aborted) setSoegeFejl('Kunne ikke søge efter adresser. Tjek forbindelsen, og prøv igen.');
      } finally {
        if (!ctrl.signal.aborted) setSoeger(false);
      }
    }, 250);
    return () => { clearTimeout(id); ctrl.abort(); };
  }, [q]);

  const aendret = () => { revision.current++; setRute(null); };
  const tilfoej = (f: Forslag) => { aendret(); setStop(s => [...s, { id: uid(), tekst: f.tekst, lon: f.lon, lat: f.lat }]); setQ(''); setForslag([]); };
  const fjern = (id: string) => { aendret(); setStop(s => s.filter(x => x.id !== id)); };
  const flyt = (i: number, d: number) => {
    const til = i + d;
    if (til < 0 || til >= stop.length) return;
    aendret();
    setStop(r => { const n = [...r]; n.splice(til, 0, n.splice(i, 1)[0]); return n; });
  };

  async function brugPlacering() {
    aendret(); setStart('henter');
    const svar = await hentPlacering();
    revision.current++;
    setStart(svar.tilstand);
    setStartPunkt(svar.punkt ? { id: 'mig', tekst: 'Min placering', lon: svar.punkt.lon, lat: svar.punkt.lat } : null);
  }

  async function beregn() {
    if (stop.length + (startPunkt ? 1 : 0) < 2 || planlaegger) return;
    const version = revision.current;
    setPlanlaegger(true); setFejl('');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 20000);
    try {
      const r = await planlaeg(startPunkt ? [startPunkt, ...stop] : stop, ctrl.signal);
      if (revision.current !== version) return;
      setRute(r);
      // The start point is not an address on the list; the list shows the places.
      setStop(r.orden.filter(x => x.id !== 'mig'));
    } catch (e) {
      setFejl(e instanceof Error && e.name !== 'AbortError' ? e.message : 'Kunne ikke beregne ruten. Prøv igen.');
    } finally { clearTimeout(t); setPlanlaegger(false); }
  }

  const links = rute ? kortLinks(rute.orden, Boolean(startPunkt)) : [];
  const nok = stop.length + (startPunkt ? 1 : 0) >= 2;

  return (
    <div className="side">
      <Hoved titel="Rute" under="Tilføj adresser. Ruten sorteres efter køretid." />

      <div className="rute__soeg">
        <Felt label="Tilføj adresse" type="search" enterKeyHint="search" autoComplete="off" placeholder="Vej, husnummer og by" value={q} onChange={e => setQ(e.target.value)} />
        {soeger && <span className="t-foot">Søger…</span>}
        {forslag.length > 0 && (
          <div className="gruppe__flade">
            {forslag.map(f => (
              <Raekke key={f.tekst} titel={f.kort} ikon="sted" onPress={() => tilfoej(f)} chevron={false}
                detalje={[f.detalje, [f.bynavn, f.post].filter(Boolean).join(' · ')].filter(Boolean).join(' · ')}
                hoejre={f.udenbys ? <span className="maerke">Udenbys</span> : <Ikon navn="plus" str={20} tyk={2.2} />} />
            ))}
          </div>
        )}
        {soegeFejl && <Besked tekst={soegeFejl} />}
      </div>

      <Gruppe titel="Start">
        <Raekke titel={startPunkt ? 'Min placering' : 'Start hvor jeg står'} ikon="sted"
          detalje={start === 'ukendt' ? 'Ellers starter ruten ved første adresse.' : forklar(start)}
          onPress={start === 'henter' ? undefined : brugPlacering} chevron={false}
          hoejre={startPunkt ? <button type="button" className="tekstknap" onClick={e => { e.stopPropagation(); aendret(); setStartPunkt(null); setStart('ukendt'); }}>Fjern</button> : undefined} />
      </Gruppe>

      {stop.length > 0 && (
        <section className="gruppe">
          <div className="hoved" style={{ alignItems: 'center' }}>
            <h2 className="t-headline gruppe__titel">{stop.length} {stop.length === 1 ? 'adresse' : 'adresser'}</h2>
            {bekraeftRyd
              ? <span style={{ display: 'flex', gap: 4 }}><button type="button" className="tekstknap tekstknap--fare" onClick={() => { aendret(); setStop([]); setBekraeftRyd(false); }}>Ryd alle</button><button type="button" className="tekstknap" onClick={() => setBekraeftRyd(false)}>Annuller</button></span>
              : <button type="button" className="tekstknap" onClick={() => setBekraeftRyd(true)}>Ryd</button>}
          </div>
          <Reorder.Group as="ol" axis="y" values={stop} onReorder={n => { aendret(); setStop(n); }} className="gruppe__flade bureauer">
            {stop.map((s, i) => <StopRaekke key={s.id} s={s} i={i} sidst={i === stop.length - 1} onFlyt={d => flyt(i, d)} onFjern={() => fjern(s.id)} />)}
          </Reorder.Group>
        </section>
      )}

      <Knap label={rute ? 'Beregn igen' : 'Beregn rute'} variant="primaer" fuld optaget={planlaegger} deaktiveret={!nok} onPress={() => void beregn()} />
      {!nok && <p className="t-foot" style={{ margin: 0 }}>Tilføj mindst to adresser, eller start hvor du står og tilføj én.</p>}
      {fejl && <Besked tekst={fejl} fejl />}

      {rute && (
        <section className="loenkort" aria-live="polite">
          <span className="loenkort__etiket">Samlet køretid{rute.rigtigeTider ? '' : ' · skønnet'}</span>
          <span className="loenkort__beloeb tal">{tid(rute.sekunder)}</span>
          <span className="t-foot">{afstand(rute.meter)}{rute.rigtigeTider ? '' : ' · vejnettet svarede ikke, så tiden er skønnet ud fra afstand'}</span>
          {links.map((l, i) => (
            <a key={l} className="knap knap--primaer tryk knap--fuld" href={l} target="_blank" rel="noreferrer">
              <Ikon navn="rute" str={20} tyk={2} /><span>{links.length > 1 ? `Åbn etape ${i + 1} i Google Maps` : 'Åbn i Google Maps'}</span>
            </a>
          ))}
        </section>
      )}
    </div>
  );
}

function StopRaekke({ s, i, sidst, onFlyt, onFjern }: { s: Stop; i: number; sidst: boolean; onFlyt: (d: number) => void; onFjern: () => void }) {
  const traek = useDragControls();
  return (
    <Reorder.Item as="li" value={s} dragListener={false} dragControls={traek} className="bureau" whileDrag={{ scale: 1.02, boxShadow: '0 12px 30px rgba(0,0,0,0.45)' }}>
      <span className="bureau__greb" aria-hidden onPointerDown={(e: PointerEvent) => traek.start(e)}><Ikon navn="greb" /></span>
      <span className="raekke__tekst stop__tekst"><span className="t-body"><b className="tal">{i + 1}.</b> {s.tekst}</span></span>
      <span style={{ display: 'flex' }}>
        <IkonKnap navn="op" label={`Flyt ${s.tekst} op`} onPress={() => onFlyt(-1)} deaktiveret={i === 0} />
        <IkonKnap navn="ned" label={`Flyt ${s.tekst} ned`} onPress={() => onFlyt(1)} deaktiveret={sidst} />
        <IkonKnap navn="luk" label={`Fjern ${s.tekst}`} onPress={onFjern} fare />
      </span>
    </Reorder.Item>
  );
}
