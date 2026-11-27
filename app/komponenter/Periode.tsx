import { calculatePeriodGross, calculatePeriodNet, calculateShiftGross, EMPLOYER_LABEL, Employer, formatHours, formatKr, longDate, PayData, PayPeriod, Shift, shortDate } from '../../src/lon';
import { Besked, Gruppe, Hoved, Raekke } from '../ui/kit';

const ARBEJDSGIVERE: Employer[] = ['multicare', 'akut'];

/** One pay period: net estimate, split per employer, and its shifts. */
export default function Periode({ data, periode, onTilbage, onRediger }: { data: PayData; periode: PayPeriod; onTilbage: () => void; onRediger: (s: Shift) => void }) {
  const brutto = calculatePeriodGross(data.shifts, periode, data.settings);
  const skat = calculatePeriodNet(brutto, data.settings);
  const vagter = [...brutto.shifts].sort((a, b) => a.shift.date.localeCompare(b.shift.date) || a.shift.start.localeCompare(b.shift.start));
  return (
    <div className="side">
      <Hoved titel={`Løn ${shortDate(periode.payday)}`} onTilbage={onTilbage} tilbage="Løn" under={`Periode ${shortDate(periode.start)} – ${shortDate(periode.end)}`} />
      <section className="loenkort">
        <span className="loenkort__etiket">Forventet udbetaling</span>
        <span className={`loenkort__beloeb tal${skat.net === null ? ' loenkort__beloeb--mangler' : ''}`}>{skat.net === null ? 'Trækprocent mangler' : formatKr(skat.net)}</span>
        <span className="loenkort__tal">
          <span><span className="t-foot">Brutto</span><b>{formatKr(brutto.gross)}</b></span>
          <span><span className="t-foot">AM-bidrag</span><b>{formatKr(skat.am)}</b></span>
          <span><span className="t-foot">A-skat</span><b>{skat.aTax === null ? '–' : formatKr(skat.aTax)}</b></span>
        </span>
        <span className="t-foot">Optjent {formatKr(brutto.earned)} · Planlagt {formatKr(brutto.planned)}</span>
      </section>

      <Gruppe titel="Fordeling">
        {ARBEJDSGIVERE.map(a => {
          const e = skat.byEmployer[a];
          return <Raekke key={a} titel={EMPLOYER_LABEL[a]} detalje={`Brutto ${formatKr(e.gross)} · AM ${formatKr(e.am)}${e.aTax === null ? '' : ` · A-skat ${formatKr(e.aTax)}`}`}
            hoejre={<b className="tal" style={{ color: 'var(--text)' }}>{e.net === null ? '–' : formatKr(e.net)}</b>} />;
        })}
      </Gruppe>

      {vagter.length
        ? <Gruppe titel="Vagter i perioden">{vagter.map(v => <VagtRaekke key={v.shift.id} vagt={v} onPress={() => onRediger(v.shift)} />)}</Gruppe>
        : <Besked tekst="Ingen vagter i denne lønperiode." />}
    </div>
  );
}

export function VagtRaekke({ vagt, onPress }: { vagt: { shift: Shift; calculation: ReturnType<typeof calculateShiftGross>; completed: boolean }; onPress: () => void }) {
  const { shift, calculation, completed } = vagt;
  return (
    <Raekke titel={`${EMPLOYER_LABEL[shift.employer]} · ${longDate(shift.date)}`}
      detalje={`${shift.start}–${shift.end} · ${formatHours(calculation.paidMinutes / 60)} timer · ${completed ? 'Optjent' : 'Planlagt'}`}
      hoejre={<b className="tal" style={{ color: 'var(--text)' }}>{formatKr(calculation.gross)}</b>} onPress={onPress} />
  );
}
