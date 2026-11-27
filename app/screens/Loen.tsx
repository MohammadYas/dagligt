import { useEffect, useState } from 'react';
import { addDays, calculatePeriodGross, calculatePeriodNet, formatKr, naesteLoen, PayPeriod, Shift, shortDate, tidligereLoen, todayKey, upcomingPeriods } from '../../src/lon';
import Loenkort from '../komponenter/Loenkort';
import LoenIndstillinger from '../komponenter/LoenIndstillinger';
import Periode, { VagtRaekke } from '../komponenter/Periode';
import VagtArk from '../komponenter/VagtArk';
import { useLoen } from '../data/loen';
import { Besked, Gruppe, Hoved, IkonKnap, Raekke } from '../ui/kit';

type Visning = { slags: 'oversigt' } | { slags: 'periode'; periode: PayPeriod } | { slags: 'indstillinger' };

export default function Loen() {
  const { data, gem } = useLoen();
  const [vis, setVis] = useState<Visning>({ slags: 'oversigt' });
  const [ark, setArk] = useState<{ original?: Shift } | null>(null);
  useEffect(() => { document.querySelector('.skaerm')?.scrollTo(0, 0); }, [vis]);
  if (!data) return <div className="side"><Besked tekst="Henter lønoplysninger…" /></div>;

  const iDag = todayKey();
  const naeste = naesteLoen(iDag);
  const tilbage = () => setVis({ slags: 'oversigt' });
  const gemVagt = (s: Shift) => {
    const findes = data.shifts.some(x => x.id === s.id);
    gem({ ...data, shifts: findes ? data.shifts.map(x => (x.id === s.id ? s : x)) : [...data.shifts, s] });
    setArk(null);
  };
  const slet = (id: string) => { gem({ ...data, shifts: data.shifts.filter(x => x.id !== id) }); setArk(null); };
  const vagtArk = (
    <VagtArk aaben={ark !== null} onLuk={() => setArk(null)} data={data} original={ark?.original}
      onGem={gemVagt} onSlet={ark?.original ? () => slet(ark.original!.id) : undefined} />
  );

  if (vis.slags === 'indstillinger') {
    return <LoenIndstillinger settings={data.settings} onTilbage={tilbage} onGem={settings => { gem({ ...data, settings }); tilbage(); }} />;
  }
  if (vis.slags === 'periode') {
    return <>{<Periode data={data} periode={vis.periode} onTilbage={tilbage} onRediger={s => setArk({ original: s })} />}{vagtArk}</>;
  }

  const brutto = calculatePeriodGross(data.shifts, naeste, data.settings);
  const skat = calculatePeriodNet(brutto, data.settings);
  const vagter = [...brutto.shifts].sort((a, b) => a.shift.date.localeCompare(b.shift.date) || a.shift.start.localeCompare(b.shift.start));
  const kommende = upcomingPeriods(addDays(naeste.end, 1), 4);
  const tidligere = tidligereLoen(data.shifts, iDag);
  const beloeb = (p: PayPeriod) => {
    const g = calculatePeriodGross(data.shifts, p, data.settings);
    const n = calculatePeriodNet(g, data.settings).net;
    return { g, tekst: formatKr(n ?? g.gross), brutto: n === null };
  };

  return (
    <div className="side">
      <Hoved titel="Løn" hoejre={<IkonKnap navn="tandhjul" label="Lønindstillinger" onPress={() => setVis({ slags: 'indstillinger' })} />} />
      <Loenkort data={data} onAabn={() => setVis({ slags: 'periode', periode: naeste })} onOpret={() => setArk({})} />
      {!skat.complete && <Besked tekst="Brutto er beregnet. Indtast din trækprocent under Lønindstillinger for at se nettoløn." />}

      {vagter.length
        ? <Gruppe titel="Vagter i perioden">{vagter.map(v => <VagtRaekke key={v.shift.id} vagt={v} onPress={() => setArk({ original: v.shift })} />)}</Gruppe>
        : <Gruppe titel="Vagter i perioden"><Raekke titel="Ingen vagter endnu" detalje="Opret en vagt for at se din næste løn." /></Gruppe>}

      <Gruppe titel="Kommende">
        {kommende.map(p => {
          const b = beloeb(p);
          return <Raekke key={p.start} titel={shortDate(p.payday)} detalje={b.g.shifts.length ? `${b.g.shifts.length} ${b.g.shifts.length === 1 ? 'vagt' : 'vagter'} · ${shortDate(p.start)} – ${shortDate(p.end)}` : 'Ingen planlagte vagter'}
            hoejre={<b className="tal" style={{ color: 'var(--text)' }}>{b.tekst}</b>} onPress={() => setVis({ slags: 'periode', periode: p })} />;
        })}
      </Gruppe>

      <Gruppe titel="Tidligere udbetalinger">
        {tidligere.length
          ? tidligere.map(p => {
            const b = beloeb(p);
            return <Raekke key={p.start} titel={shortDate(p.payday)} detalje={`${shortDate(p.start)} – ${shortDate(p.end)} · ${b.g.shifts.length} ${b.g.shifts.length === 1 ? 'vagt' : 'vagter'}${b.brutto ? ' · brutto' : ''}`}
              hoejre={<b className="tal" style={{ color: 'var(--text)' }}>{b.tekst}</b>} onPress={() => setVis({ slags: 'periode', periode: p })} />;
          })
          : <Raekke titel="Ingen tidligere udbetalinger endnu." />}
      </Gruppe>
      {vagtArk}
    </div>
  );
}
