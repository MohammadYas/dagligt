import { useState } from 'react';
import { AnimatePresence, motion, PanInfo } from 'motion/react';
import { kalenderAnker } from '../../src/datoanker';
import { EASE_OUT, useDaempet } from '../ui/bevaegelse';
import Ikon from '../ui/Ikon';
import { maanedsCeller } from './kalenderdata';

const UGEDAGE = ['M', 'T', 'O', 'T', 'F', 'L', 'S'];
const TAERSKEL = 60;
const navn = (aar: number, m: number) => new Date(aar, m, 1).toLocaleDateString('da-DK', { month: 'long', year: 'numeric' });
const fuldDato = (d: string) => new Date(`${d}T12:00:00`).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/**
 * Controlled multi-date calendar. It never reloads or locks: every tap goes
 * straight to onSkift, and the selection comes back through `valgte`.
 */
export default function Kalender({ valgte, onSkift, iDag }: { valgte: string[]; onSkift: (dato: string) => void; iDag: string }) {
  const daempet = useDaempet();
  const [maaned, setMaaned] = useState(() => { const a = kalenderAnker('', valgte, iDag); return { aar: +a.slice(0, 4), m: +a.slice(5, 7) - 1 }; });
  const [retning, setRetning] = useState(0);
  const valgt = new Set(valgte);
  const idagM = { aar: +iDag.slice(0, 4), m: +iDag.slice(5, 7) - 1 };
  const erIdagM = maaned.aar === idagM.aar && maaned.m === idagM.m;

  const flyt = (n: number) => {
    setRetning(n);
    setMaaned(({ aar, m }) => { const d = new Date(aar, m + n, 1); return { aar: d.getFullYear(), m: d.getMonth() }; });
  };
  const tilIdag = () => { setRetning(maaned.aar * 12 + maaned.m > idagM.aar * 12 + idagM.m ? -1 : 1); setMaaned(idagM); };
  const slip = (_: unknown, info: PanInfo) => {
    if (info.offset.x < -TAERSKEL || info.velocity.x < -500) flyt(1);
    else if (info.offset.x > TAERSKEL || info.velocity.x > 500) flyt(-1);
  };

  const forskyd = daempet ? 0 : 28;
  return (
    <div className="kal">
      <div className="kal__top">
        <h3 className="t-headline kal__maaned" aria-live="polite">{navn(maaned.aar, maaned.m)}</h3>
        {!erIdagM && <button type="button" className="kal__idag tryk" onClick={tilIdag}>I dag</button>}
        <button type="button" className="ikonknap tryk" aria-label="Forrige måned" onClick={() => flyt(-1)}><Ikon navn="tilbage" str={22} tyk={2.2} /></button>
        <button type="button" className="ikonknap tryk" aria-label="Næste måned" onClick={() => flyt(1)}><Ikon navn="frem" str={22} tyk={2.2} /></button>
      </div>
      <div className="kal__uge" aria-hidden>{UGEDAGE.map((d, i) => <span key={i}>{d}</span>)}</div>
      <div className="kal__vindue">
        <AnimatePresence initial={false} custom={retning} mode="popLayout">
          <motion.div
            key={`${maaned.aar}-${maaned.m}`} className="kal__gitter" custom={retning}
            variants={{
              ind: (r: number) => ({ x: r * forskyd, opacity: 0 }),
              mid: { x: 0, opacity: 1 },
              ud: (r: number) => ({ x: -r * forskyd, opacity: 0 }),
            }}
            initial="ind" animate="mid" exit="ud" transition={{ duration: 0.18, ease: EASE_OUT }}
            drag="x" dragConstraints={{ left: 0, right: 0 }} dragElastic={0.25} dragSnapToOrigin onDragEnd={slip}
          >
            {maanedsCeller(maaned.aar, maaned.m).map((d, i) => d === null
              ? <span key={`t${i}`} />
              : (
                <button key={d} type="button" className="kal__dag" aria-pressed={valgt.has(d)} aria-label={fuldDato(d)}
                  data-forbi={d < iDag || undefined} data-idag={d === iDag || undefined} onClick={() => onSkift(d)}>
                  <span>{+d.slice(8)}</span>
                </button>
              ))}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
