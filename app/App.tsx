import { ReactElement, useEffect, useRef, useState } from 'react';
import { harAdgang } from '../src/adgang';
import { useSkaerm, Skaerm } from './rute';
import TabBar, { faneFor, Fane } from './TabBar';
import Laas from './screens/Laas';
import Hjem from './screens/Hjem';
import DageSteder from './screens/DageSteder';
import Arbejdspladser from './screens/Arbejdspladser';
import Loen from './screens/Loen';
import Rute from './screens/Rute';
import Indstillinger from './screens/Indstillinger';
import { useGemVedForlad } from './data/session';
import { bekraeftVarslerVedStart } from './komponenter/Varsler';

type Nav = { gaa: (s: Skaerm) => void };
const SKAERME: Record<Exclude<Skaerm, 'rute'>, (p: Nav) => ReactElement> = {
  hjem: ({ gaa }) => <Hjem gaa={gaa} />,
  dage: ({ gaa }) => <DageSteder gaa={gaa} />,
  arbejdspladser: ({ gaa }) => <Arbejdspladser gaa={gaa} />,
  indstillinger: ({ gaa }) => <Indstillinger gaa={gaa} />,
  loen: () => <Loen />,
};

export default function App() {
  const [laast, setLaast] = useState(() => !harAdgang());
  const [skaerm, gaa] = useSkaerm();
  // The route screen keeps its stops when you switch tabs: mount once, then hide.
  const [ruteAabnet, setRuteAabnet] = useState(skaerm === 'rute');
  const scroll = useRef<HTMLDivElement>(null);
  useEffect(() => { if (skaerm === 'rute') setRuteAabnet(true); scroll.current?.scrollTo(0, 0); }, [skaerm]);
  useGemVedForlad();
  useEffect(() => { if (!laast) bekraeftVarslerVedStart(); }, [laast]);

  if (laast) return <Laas aabnet={() => setLaast(false)} />;

  const vaelgFane = (f: Fane) => gaa(f);
  const Aktiv = skaerm === 'rute' ? null : SKAERME[skaerm];
  return (
    <div className="skal">
      <div className="skaerm" ref={scroll} hidden={skaerm === 'rute'}>
        {Aktiv && <Aktiv gaa={gaa} />}
      </div>
      {ruteAabnet && (
        <div className="skaerm" hidden={skaerm !== 'rute'}>
          <Rute />
        </div>
      )}
      <TabBar aktiv={faneFor(skaerm)} vaelg={vaelgFane} />
    </div>
  );
}
