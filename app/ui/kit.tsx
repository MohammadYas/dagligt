import { InputHTMLAttributes, KeyboardEvent, ReactNode } from 'react';
import Ikon, { IkonNavn } from './Ikon';

export function Knap({ label, onPress, variant, ikon, optaget, deaktiveret, fuld, type = 'button' }: {
  label: string; onPress?: () => void; variant?: 'primaer' | 'stille' | 'fare'; ikon?: IkonNavn;
  optaget?: boolean; deaktiveret?: boolean; fuld?: boolean; type?: 'button' | 'submit';
}) {
  return (
    <button type={type} className={`knap tryk${variant ? ` knap--${variant}` : ''}${fuld ? ' knap--fuld' : ''}`}
      onClick={onPress} disabled={deaktiveret || optaget} aria-busy={optaget || undefined}>
      {optaget ? <span className="snurre" aria-hidden /> : ikon ? <Ikon navn={ikon} str={20} tyk={2} /> : null}
      <span>{label}</span>
    </button>
  );
}

export function IkonKnap({ navn, label, onPress, deaktiveret, fare }: { navn: IkonNavn; label: string; onPress: () => void; deaktiveret?: boolean; fare?: boolean }) {
  return (
    <button type="button" className={`ikonknap tryk${fare ? ' ikonknap--fare' : ''}`} aria-label={label} onClick={onPress} disabled={deaktiveret}>
      <Ikon navn={navn} />
    </button>
  );
}

export function Gruppe({ titel, hjaelp, children }: { titel?: string; hjaelp?: string; children: ReactNode }) {
  return (
    <section className="gruppe">
      {titel && <h2 className="t-headline gruppe__titel">{titel}</h2>}
      <div className="gruppe__flade">{children}</div>
      {hjaelp && <p className="t-foot gruppe__hjaelp">{hjaelp}</p>}
    </section>
  );
}

export function Raekke({ titel, detalje, ikon, onPress, hoejre, chevron = !!onPress }: {
  titel: ReactNode; detalje?: ReactNode; ikon?: IkonNavn; onPress?: () => void; hoejre?: ReactNode; chevron?: boolean;
}) {
  const indhold = (
    <>
      {ikon && <span className="raekke__ikon"><Ikon navn={ikon} str={24} /></span>}
      <span className="raekke__tekst">
        <span className="t-body">{titel}</span>
        {detalje && <span className="t-foot">{detalje}</span>}
      </span>
      {(hoejre || chevron) && <span className="raekke__hoejre">{hoejre}{chevron && <Ikon navn="frem" str={18} tyk={2.2} />}</span>}
    </>
  );
  return onPress ? <button type="button" className="raekke" onClick={onPress}>{indhold}</button> : <div className="raekke">{indhold}</div>;
}

/** iOS-style switch. The whole row toggles; Space and Enter work. */
export function Kontakt({ label, hjaelp, vaerdi, onSkift, deaktiveret }: { label: string; hjaelp?: string; vaerdi: boolean; onSkift: (v: boolean) => void; deaktiveret?: boolean }) {
  const skift = () => { if (!deaktiveret) onSkift(!vaerdi); };
  const tast = (e: KeyboardEvent) => { if (e.key === ' ' || e.key === 'Enter') { e.preventDefault(); if (!e.repeat) skift(); } };
  return (
    <div className="raekke kontakt" role="switch" tabIndex={deaktiveret ? -1 : 0} aria-checked={vaerdi} aria-disabled={deaktiveret || undefined}
      aria-label={label} onClick={skift} onKeyDown={tast}>
      <span className="raekke__tekst"><span className="t-body">{label}</span>{hjaelp && <span className="t-foot">{hjaelp}</span>}</span>
      <span className="kontakt__spor" aria-hidden><span className="kontakt__knop" style={{ display: 'block' }} /></span>
    </div>
  );
}

export function Felt({ label, ...props }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="felt">
      <span className="t-sub">{label}</span>
      <input {...props} />
    </label>
  );
}

export function Besked({ tekst, fejl }: { tekst: string; fejl?: boolean }) {
  return <p className={`besked${fejl ? ' besked--fejl' : ''}`} role={fejl ? 'alert' : undefined} aria-live="polite">{tekst}</p>;
}

export function Pille({ tekst, tone = 'neutral', ikon }: { tekst: string; tone?: 'neutral' | 'ok' | 'advarsel' | 'fejl'; ikon?: IkonNavn }) {
  return <span className={`pille pille--${tone}`} role="status" aria-live="polite">{ikon && <Ikon navn={ikon} str={15} tyk={2.2} />}{tekst}</span>;
}

/** Large title with optional back button (sub-screens) and a trailing action. */
export function Hoved({ titel, tilbage, onTilbage, hoejre, under }: { titel: string; tilbage?: string; onTilbage?: () => void; hoejre?: ReactNode; under?: string }) {
  return (
    <header style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {onTilbage && <button type="button" className="tilbage" onClick={onTilbage}><Ikon navn="tilbage" str={24} tyk={2.2} />{tilbage ?? 'Tilbage'}</button>}
      <div className="hoved"><h1 className="t-large">{titel}</h1>{hoejre}</div>
      {under && <p className="t-sub">{under}</p>}
    </header>
  );
}
