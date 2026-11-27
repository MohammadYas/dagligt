import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { parseStatus, siden, tilstand, Tilstand } from '../../src/vagter';
import { indlaesAlt, useSession } from '../data/session';
import { useCasStatus } from '../data/status';
import { hurtig, useDaempet } from '../ui/bevaegelse';
import Ikon from '../ui/Ikon';
import { Besked, Knap, Kontakt, Pille } from '../ui/kit';

const TEKST: Record<Tilstand, string> = { ok: 'Kører', advarsel: 'Ingen nylig kontakt', fejl: 'Kræver opmærksomhed' };

/** CAS status (read-only file) plus the one switch that turns booking on/off in /kontrol.txt. */
export default function CasStatus() {
  const { fil, fejl, henter, opdater } = useCasStatus();
  const session = useSession();
  const daempet = useDaempet();
  const [udvidet, setUdvidet] = useState(false);
  const kontrol = session.get('kontrol');
  const status = fil ? parseStatus(fil.tekst, fil.skrevet) : null;
  const t = status ? tilstand(status) : null;
  const tone = fejl ? 'fejl' : t ?? 'neutral';
  const etiket = fejl ? 'Forbindelsesfejl' : t ? TEKST[t] : 'Henter…';

  const skift = (cas: boolean) => {
    const k = kontrol.draft;
    if (!k) return;
    // TØRN is hidden in the UI but its line is written back unchanged.
    session.edit('kontrol', { ...k, cas });
    void session.save();
  };
  const genindlaes = () => { opdater(); indlaesAlt(); };

  return (
    <section className="gruppe">
      <div className="gruppe__flade">
        <div className="cas__hoved">
          <div className="cas__titel">
            <h2 className="t-title2">CAS</h2>
            <Pille tekst={etiket} tone={tone === 'advarsel' || tone === 'ok' || tone === 'fejl' ? tone : 'neutral'} />
          </div>
          <button type="button" className="ikonknap tryk" aria-label="Opdater" onClick={genindlaes} disabled={henter}>
            <span className={henter ? 'drej' : undefined} style={{ display: 'flex' }}><Ikon navn="opdater" /></span>
          </button>
        </div>
        {status && <p className="t-foot cas__siden">Sidste kontakt {siden(status.sidsteTjek)}</p>}

        {kontrol.draft
          ? <Kontakt label="Automatisk booking" hjaelp={kontrol.draft.cas ? 'Booking aktiv' : 'Booking slået fra'} vaerdi={kontrol.draft.cas} onSkift={skift} />
          : !kontrol.error ? <div className="raekke"><span className="t-sub">Henter kontakt…</span></div> : null}

        {status && (
          <button type="button" className="raekke" aria-expanded={udvidet} onClick={() => setUdvidet(v => !v)}>
            <span className="raekke__tekst"><span className="t-body">Detaljer</span></span>
            <span className="raekke__hoejre" style={{ transform: `rotate(${udvidet ? 180 : 0}deg)`, transition: 'transform 200ms var(--ease-out)' }}><Ikon navn="ned" str={18} tyk={2.2} /></span>
          </button>
        )}
        <AnimatePresence initial={false}>
          {udvidet && status && (
            <motion.div key="detaljer" className="cas__detaljer"
              initial={daempet ? { opacity: 0 } : { height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
              exit={{ ...(daempet ? { opacity: 0 } : { height: 0, opacity: 0 }), transition: { ...hurtig, duration: 0.15 } }} transition={hurtig} style={{ overflow: 'hidden' }}>
              <dl className="cas__tal">
                <Tal navn="Ledige" v={status.ledige} />
                <Tal navn="Matcher" v={status.matcher} />
                <Tal navn="Taget i alt" v={status.taget} />
              </dl>
              {status.dine && <p className="t-foot"><b>Dine vagter:</b> {status.dine}</p>}
              {status.interesseret && <p className="t-foot"><b>Interesseret:</b> {status.interesseret}</p>}
              <pre className="cas__raa">{status.raa}</pre>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {fejl && fejl !== kontrol.error && <Besked tekst={fejl} fejl />}
      {kontrol.error && !kontrol.draft && (
        <div className="knapper">
          <Besked tekst={kontrol.error} fejl />
          <Knap label="Prøv igen" onPress={() => void session.load('kontrol')} />
          {kontrol.missing && <Knap label="Opret kontakter, begge slået fra" onPress={() => session.initialize('kontrol', { cas: false, torn: false })} />}
        </div>
      )}
      {session.error && (
        <div className="knapper">
          <Besked tekst={session.error} fejl />
          <Knap label="Prøv igen" onPress={() => void session.save()} />
          <Knap label="Annuller ændringer" variant="stille" onPress={() => session.cancel()} />
        </div>
      )}
    </section>
  );
}

function Tal({ navn, v }: { navn: string; v: number | string | null }) {
  return <div><dt className="t-foot">{navn}</dt><dd className="t-title2 tal">{v ?? '–'}</dd></div>;
}
