import { useState } from 'react';
import { EMPLOYER_LABEL, Employer, PayRates, PaySettings } from '../../src/lon';
import { Felt, Gruppe, Hoved, Knap, Segment } from '../ui/kit';

const SATSER: Record<keyof PayRates, string> = { weekdayDay: 'Hverdag dag', weekdayEvening: 'Hverdag aften', weekdayNight: 'Hverdag nat', weekendDay: 'Weekend dag', weekendEvening: 'Weekend aften', weekendNight: 'Weekend nat' };
const kopi = <T,>(v: T): T => JSON.parse(JSON.stringify(v));

/** Rates and tax. New rates apply to new shifts; existing shifts keep their rateSnapshot. */
export default function LoenIndstillinger({ settings, onGem, onTilbage }: { settings: PaySettings; onGem: (s: PaySettings) => void; onTilbage: () => void }) {
  const [s, setS] = useState<PaySettings>(() => kopi(settings));
  const sats = (a: Employer, k: keyof PayRates, v: number | null) => { if (v !== null) setS(c => ({ ...c, rates: { ...c.rates, [a]: { ...c.rates[a], [k]: v } } })); };
  return (
    <div className="side">
      <Hoved titel="Lønindstillinger" onTilbage={onTilbage} tilbage="Løn" under="Satser bruges til nye vagter. Gamle vagter beholder deres satser." />
      {(['multicare', 'akut'] as Employer[]).map(a => (
        <Gruppe key={a} titel={EMPLOYER_LABEL[a]}>
          <div className="felter">
            {(Object.keys(SATSER) as (keyof PayRates)[]).map(k => <Tal key={k} label={`${SATSER[k]} (kr/time)`} vaerdi={s.rates[a][k]} onSkift={v => sats(a, k, v)} />)}
          </div>
        </Gruppe>
      ))}
      <Gruppe titel="Skat" hjaelp="Nettoløn er et estimat. Trækprocenten bruges for begge arbejdsgivere; fradraget kun på hovedkortet.">
        <div className="felter">
          <span className="t-sub">Hovedkort</span>
          <Segment label="Hovedkort" vaerdi={s.primaryTaxCardEmployer} onSkift={(primaryTaxCardEmployer: Employer) => setS(c => ({ ...c, primaryTaxCardEmployer }))}
            valg={(['multicare', 'akut'] as Employer[]).map(v => ({ v, tekst: EMPLOYER_LABEL[v] }))} />
          <Tal label="Fradrag pr. lønperiode (kr)" vaerdi={s.deductionPerPayPeriod} onSkift={v => setS(c => ({ ...c, deductionPerPayPeriod: v ?? 0 }))} />
          <Tal label="Trækprocent (%)" vaerdi={s.taxRate} nullable onSkift={taxRate => setS(c => ({ ...c, taxRate }))} />
          <Tal label="AM-bidrag (%)" vaerdi={s.amContributionRate} onSkift={v => setS(c => ({ ...c, amContributionRate: v ?? 0 }))} />
        </div>
      </Gruppe>
      <Knap label="Gem indstillinger" variant="primaer" fuld onPress={() => onGem(s)} />
    </div>
  );
}

/** Decimal field with Danish comma. Invalid text is kept on screen but not saved, like the old NumericField. */
function Tal({ label, vaerdi, onSkift, nullable = false }: { label: string; vaerdi: number | null; onSkift: (v: number | null) => void; nullable?: boolean }) {
  const [tekst, setTekst] = useState(vaerdi === null ? '' : String(vaerdi).replace('.', ','));
  const ret = (t: string) => {
    setTekst(t);
    if (!t.trim() && nullable) { onSkift(null); return; }
    const n = Number(t.replace(',', '.'));
    if (t.trim() && Number.isFinite(n) && n >= 0) onSkift(n);
  };
  return <Felt label={label} inputMode="decimal" value={tekst} placeholder={nullable ? 'Påkrævet' : '0'} onChange={e => ret(e.target.value)} />;
}
