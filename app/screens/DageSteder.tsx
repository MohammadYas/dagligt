import { useEffect, useRef, useState } from 'react';
import { todayKey } from '../../src/lon';
import { Dage, normaliser } from '../../src/vagtdata';
import { Skaerm } from '../rute';
import Kalender from '../komponenter/Kalender';
import Stedvaelger from '../komponenter/Stedvaelger';
import { useSession } from '../data/session';
import { Besked, Gruppe, Hoved, Knap, Pille } from '../ui/kit';

const VENT_MS = 1200;
const tom: Dage = { datoer: [], steder: [] };

// TØRN is hidden, but both files keep getting the same dates and places.
const samlet = (cas: Dage, torn: Dage): Dage => ({
  datoer: [...new Set([...cas.datoer, ...torn.datoer])].sort(),
  steder: [...new Map([...cas.steder, ...torn.steder].map(n => [normaliser(n), n])).values()],
});

export default function DageSteder({ gaa }: { gaa: (s: Skaerm) => void }) {
  const session = useSession();
  const cas = session.get('cas');
  const torn = session.get('torn');
  const vaerdi = cas.draft && torn.draft ? samlet(cas.draft, torn.draft) : undefined;
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [gemt, setGemt] = useState(false);
  const varIgang = useRef(false);

  // Save shortly after the last tap; never block taps while saving.
  const planlaeg = () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { timer.current = null; void session.save(); }, VENT_MS);
  };
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
    if (session.dirtyKeys.length) void session.save();
  }, [session]);

  useEffect(() => {
    if (session.saving) { varIgang.current = true; setGemt(false); return; }
    if (!varIgang.current) return;
    varIgang.current = false;
    if (session.error) return;
    setGemt(true);
    const t = setTimeout(() => setGemt(false), 2000);
    return () => clearTimeout(t);
  }, [session.saving, session.error]);

  // Read the live drafts on every tap, not this render's copy: two taps in one frame must both count.
  const nu = (): Dage | undefined => {
    const c = session.get('cas').draft, t = session.get('torn').draft;
    return c && t ? samlet(c, t) : undefined;
  };
  const ret = (f: (v: Dage) => Dage) => {
    const v = nu();
    if (!v) return;
    const next = f(v);
    session.edit('cas', next); session.edit('torn', next); planlaeg();
  };
  const skiftDato = (d: string) => ret(v => ({ ...v, datoer: v.datoer.includes(d) ? v.datoer.filter(x => x !== d) : [...v.datoer, d].sort() }));
  const skiftSted = (n: string) => ret(v => {
    const til = v.steder.some(s => normaliser(s) === normaliser(n));
    return { ...v, steder: til ? v.steder.filter(s => normaliser(s) !== normaliser(n)) : [...v.steder, n] };
  });

  const antal = vaerdi?.datoer.length ?? 0;
  const dageTekst = antal ? `${antal} ${antal === 1 ? 'dag' : 'dage'} valgt` : 'Alle dage';
  const afventer = session.saving || timer.current !== null || session.dirtyKeys.some(k => k === 'cas' || k === 'torn');
  const fejlFil = [cas, torn].find(e => e.error && !e.draft);
  const mangler = [['cas', cas], ['torn', torn]] as const;

  return (
    <div className="side">
      <Hoved titel="Dage og steder" onTilbage={() => gaa('hjem')} tilbage="VagtStatus" />
      {vaerdi && (session.error
        ? <Pille tekst="Ikke gemt" tone="fejl" />
        : <Pille tekst={afventer ? `${dageTekst} · Gemmer…` : gemt ? 'Gemt ✓' : dageTekst} tone={gemt && !afventer ? 'ok' : 'neutral'} />)}

      {session.error && (
        <div className="knapper">
          <Besked tekst={session.error} fejl />
          <Knap label="Prøv igen" onPress={() => void session.save()} />
        </div>
      )}

      {fejlFil && (
        <div className="knapper">
          <Besked tekst={fejlFil.error!} fejl />
          <Knap label="Prøv igen" onPress={() => { void session.load('cas'); void session.load('torn'); }} />
          {mangler.some(([, e]) => e.missing) && (
            <Knap label="Opret indstillinger" onPress={() => mangler.forEach(([k, e]) => { if (e.missing) session.initialize(k, tom); })} />
          )}
        </div>
      )}

      {!vaerdi && !fejlFil && <Besked tekst="Henter dine dage og steder…" />}

      {vaerdi && (
        <>
          <Gruppe titel="Dage" hjaelp={antal ? 'Tryk på en blå dag for at fjerne den. Ændringer gemmes automatisk.' : 'Ingen valgte dage betyder, at alle datoer er tilladt. Ændringer gemmes automatisk.'}>
            <Kalender valgte={vaerdi.datoer} onSkift={skiftDato} iDag={todayKey()} />
          </Gruppe>
          <section className="gruppe">
            <h2 className="t-headline gruppe__titel">Steder</h2>
            <p className="t-foot gruppe__hjaelp">{vaerdi.steder.length} valgt · ændringer gemmes automatisk</p>
          </section>
          <Stedvaelger valgte={vaerdi.steder} kendte={session.knownPlaces} onSkift={skiftSted}
            onTilfoej={n => ret(v => ({ ...v, steder: [...v.steder, n] }))} />
        </>
      )}
    </div>
  );
}
