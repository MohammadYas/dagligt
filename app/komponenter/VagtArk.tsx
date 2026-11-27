import { useMemo, useState } from 'react';
import { EMPLOYER_LABEL, Employer, formatHours, formatKr, isWeekend, longDate, PayData, Shift, todayKey } from '../../src/lon';
import Ark from '../ui/Ark';
import { beregnVagt } from './vagtform';
import { Felt, Knap, Segment } from '../ui/kit';

type Kladde = Pick<Shift, 'employer' | 'date' | 'start' | 'end' | 'unpaidBreakMinutes'>;
const ny = (): Kladde => ({ employer: 'multicare', date: todayKey(), start: '07:00', end: '15:00', unpaidBreakMinutes: 0 });
const kopi = <T,>(v: T): T => JSON.parse(JSON.stringify(v));
const HURTIG: [string, string][] = [['07:00', '15:00'], ['15:00', '23:00'], ['23:00', '07:00']];
const gyldigDato = (d: string) => (/^\d{4}-\d{2}-\d{2}$/.test(d) ? d : todayKey());
const uid =() => (globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

/** Create or edit a shift. Same fields and defaults as the old ShiftEditor. */
export default function VagtArk({ aaben, onLuk, data, original, onGem, onSlet }: {
  aaben: boolean; onLuk: () => void; data: PayData; original?: Shift; onGem: (shift: Shift) => void; onSlet?: () => void;
}) {
  return (
    <Ark aaben={aaben} onLuk={onLuk} titel={original ? 'Rediger vagt' : 'Opret vagt'}>
      <Formular data={data} original={original} onGem={onGem} onSlet={onSlet} />
    </Ark>
  );
}

// Mounted only while the sheet is open, so it starts from the shift's own values in the first frame.
function Formular({ data, original, onGem, onSlet }: { data: PayData; original?: Shift; onGem: (shift: Shift) => void; onSlet?: () => void }) {
  const [k, setK] = useState<Kladde>(() => (original ? { employer: original.employer, date: original.date, start: original.start, end: original.end, unpaidBreakMinutes: original.unpaidBreakMinutes } : ny()));
  const [bekraeft, setBekraeft] = useState(false);

  const proeve = useMemo<Shift>(() => ({ id: 'proeve', ...k, createdAt: 0, updatedAt: 0, rateSnapshot: original?.rateSnapshot ?? data.settings.rates }), [k, original, data.settings.rates]);
  const { gyldig, beregning } = beregnVagt(proeve, data.settings);
  const saet = (p: Partial<Kladde>) => setK(c => ({ ...c, ...p }));

  const gem = () => {
    if (!gyldig) return;
    const nu = Date.now();
    onGem({ id: original?.id ?? uid(), ...k, createdAt: original?.createdAt ?? nu, updatedAt: nu, rateSnapshot: original?.rateSnapshot ?? kopi(data.settings.rates) });
  };

  return (
    <>
      <Segment label="Arbejdsgiver" vaerdi={k.employer} onSkift={(employer: Employer) => saet({ employer })}
        valg={(['multicare', 'akut'] as Employer[]).map(v => ({ v, tekst: EMPLOYER_LABEL[v] }))} />
      <Felt label="Dato" type="date" value={k.date} onChange={e => saet({ date: e.target.value })} required />
      <div className="vagt__hurtig" role="group" aria-label="Hurtigvalg">
        {HURTIG.map(([start, end]) => {
          const valgt = k.start === start && k.end === end;
          return <button key={start} type="button" className="chip tryk" aria-pressed={valgt} onClick={() => saet({ start, end })}>{start.slice(0, 2)}–{end.slice(0, 2)}</button>;
        })}
      </div>
      <div className="raekke2">
        <Felt label="Start" type="time" value={k.start} onChange={e => saet({ start: e.target.value })} />
        <Felt label="Slut" type="time" value={k.end} onChange={e => saet({ end: e.target.value })} />
      </div>
      <Felt label="Ubetalt pause (minutter)" inputMode="numeric" pattern="[0-9]*" value={String(k.unpaidBreakMinutes)}
        onChange={e => { const n = Number(e.target.value.replace(/\D/g, '') || 0); saet({ unpaidBreakMinutes: n }); }} />
      <div className="vagt__beregning" aria-live="polite">
        <span className="t-title2 tal">{formatHours(beregning.paidMinutes / 60)} timer · {formatKr(beregning.gross)}</span>
        <span className="t-foot">{longDate(gyldigDato(k.date))} · {isWeekend(gyldigDato(k.date)) ? 'Weekendsats' : 'Hverdagssats'}</span>
      </div>
      <Knap label={original ? 'Gem vagt' : 'Opret vagt'} variant="primaer" fuld onPress={gem} deaktiveret={!gyldig} />
      {onSlet && (bekraeft
        ? <div className="vagt__slet"><p className="t-sub">Vagten fjernes fra lønperioden.</p><Knap label="Slet vagt" variant="fare" fuld onPress={onSlet} /><Knap label="Annuller" variant="stille" fuld onPress={() => setBekraeft(false)} /></div>
        : <Knap label="Slet vagt" variant="fare" fuld onPress={() => setBekraeft(true)} />)}
    </>
  );
}
