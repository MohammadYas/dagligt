import { useState } from 'react';
import { Shift } from '../../src/lon';
import { normaliser } from '../../src/vagtdata';
import { Skaerm } from '../rute';
import CasStatus from '../komponenter/CasStatus';
import Loenkort from '../komponenter/Loenkort';
import VagtArk from '../komponenter/VagtArk';
import { useLoen } from '../data/loen';
import { useSession } from '../data/session';
import { Gruppe, Hoved, IkonKnap, Raekke } from '../ui/kit';

const flertal = (n: number, en: string, flere: string) => `${n} ${n === 1 ? en : flere}`;
const iDag = () => new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Hjem({ gaa }: { gaa: (s: Skaerm) => void }) {
  const { data, gem } = useLoen();
  const session = useSession();
  const [opret, setOpret] = useState(false);
  const cas = session.get('cas');
  const torn = session.get('torn');
  const bureauer = session.get('bureauer');
  const venter = (e: { error?: string }) => (e.error ? 'Kunne ikke hentes' : 'Henter…');

  // Same numbers as the old screen: dates and places across both files.
  let dageTekst = venter(cas.error ? cas : torn);
  if (cas.draft && torn.draft) {
    const datoer = new Set([...cas.draft.datoer, ...torn.draft.datoer]).size;
    const steder = new Set([...cas.draft.steder, ...torn.draft.steder].map(normaliser)).size;
    dageTekst = `${datoer ? flertal(datoer, 'dag', 'dage') : 'Alle dage'} · ${flertal(steder, 'sted', 'steder')}`;
  }
  const bureauTekst = !bureauer.draft ? venter(bureauer) : `${bureauer.draft.filter(b => b.aktiv).length} af ${bureauer.draft.length} aktive`;

  const gemVagt = (s: Shift) => { if (data) gem({ ...data, shifts: [...data.shifts, s] }); setOpret(false); };

  return (
    <div className="side">
      <Hoved titel="VagtStatus" under={iDag()} hoejre={<IkonKnap navn="tandhjul" label="Indstillinger" onPress={() => gaa('indstillinger')} />} />
      {data && <Loenkort data={data} onAabn={() => gaa('loen')} onOpret={() => setOpret(true)} />}
      <CasStatus />
      <Gruppe titel="Booking">
        <Raekke titel="Dage og steder" detalje={dageTekst} ikon="kalender" flise="#ff6b5e" onPress={() => gaa('dage')} />
        <Raekke titel="Arbejdspladser" detalje={bureauTekst} ikon="bygning" flise="#5e8bff" onPress={() => gaa('arbejdspladser')} />
      </Gruppe>
      {data && <VagtArk aaben={opret} onLuk={() => setOpret(false)} data={data} onGem={gemVagt} />}
    </div>
  );
}
