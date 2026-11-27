import { AnimatePresence, motion } from 'motion/react';
import { calculatePeriodGross, calculatePeriodNet, formatHours, formatKr, naesteLoen, PayData, shortDate, todayKey } from '../../src/lon';
import { useDaempet } from '../ui/bevaegelse';
import Ikon from '../ui/Ikon';
import { Knap } from '../ui/kit';

/** Next payout at a glance. Tapping the card opens Løn; the button creates a shift. */
export default function Loenkort({ data, onAabn, onOpret }: { data: PayData; onAabn: () => void; onOpret: () => void }) {
  const periode = naesteLoen(todayKey());
  const brutto = calculatePeriodGross(data.shifts, periode, data.settings);
  const skat = calculatePeriodNet(brutto, data.settings);
  const beloeb = skat.net === null ? 'Indtast trækprocent' : formatKr(skat.net);
  return (
    <section className="loenkort">
      <button type="button" className="loenkort__flade" onClick={onAabn} aria-label={`Næste løn ${shortDate(periode.payday)}: ${beloeb}. Åbn løn`}>
        <span className="loenkort__top">
          <span style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span className="loenkort__etiket">Næste løn · {shortDate(periode.payday)}</span>
            <span className="t-foot">Periode {shortDate(periode.start)} – {shortDate(periode.end)}</span>
          </span>
          <Ikon navn="frem" str={18} tyk={2.2} />
        </span>
        <Beloeb tekst={beloeb} mangler={skat.net === null} />
        <span className="loenkort__tal">
          <span><span className="t-foot">Brutto</span><b>{formatKr(brutto.gross)}</b></span>
          <span><span className="t-foot">Vagter</span><b>{brutto.shifts.length}</b></span>
          <span><span className="t-foot">Timer</span><b>{formatHours(brutto.hours)}</b></span>
        </span>
      </button>
      <Knap label="Opret vagt" variant="primaer" ikon="plus" fuld onPress={onOpret} />
    </section>
  );
}

/** The amount crossfades through a light blur when it changes, so old and new read as one motion. */
function Beloeb({ tekst, mangler }: { tekst: string; mangler: boolean }) {
  const daempet = useDaempet();
  const skjult = daempet ? { opacity: 0 } : { opacity: 0, filter: 'blur(2px)', y: 4 };
  return (
    <span className={`loenkort__beloeb tal${mangler ? ' loenkort__beloeb--mangler' : ''}`} style={{ display: 'grid' }}>
      <AnimatePresence initial={false}>
        <motion.span key={tekst} style={{ gridArea: '1 / 1' }} initial={skjult} animate={{ opacity: 1, filter: 'blur(0px)', y: 0 }}
          exit={{ ...skjult, y: daempet ? 0 : -4, transition: { duration: 0.15, ease: 'easeOut' } }} transition={{ duration: 0.25, ease: [0.23, 1, 0.32, 1] }}>
          {tekst}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}
