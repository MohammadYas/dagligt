import { useState } from 'react';
import { glemAdgang } from '../../src/adgang';
import { Skaerm } from '../rute';
import Varsler from '../komponenter/Varsler';
import { Gruppe, Hoved, Knap, Raekke } from '../ui/kit';

export default function Indstillinger({ gaa }: { gaa: (s: Skaerm) => void }) {
  const [bekraeft, setBekraeft] = useState(false);
  const udgave = import.meta.env.VITE_UDGAVE || 'lokal';
  return (
    <div className="side">
      <Hoved titel="Indstillinger" onTilbage={() => gaa('hjem')} tilbage="VagtStatus" />
      <Varsler />
      <Gruppe titel="Om appen">
        <Raekke titel="Udgave" hoejre={<span className="tal">{udgave}</span>} />
      </Gruppe>
      <Gruppe titel="Sikkerhed" hjaelp="Låser du appen, skal du åbne dit link igen eller indtaste adgangskoden. Dine data i Dropbox og dine lønvagter røres ikke.">
        {bekraeft
          ? <div className="felter"><Knap label="Lås appen nu" variant="fare" fuld onPress={() => { glemAdgang(); location.reload(); }} /><Knap label="Annuller" variant="stille" fuld onPress={() => setBekraeft(false)} /></div>
          : <Raekke titel="Lås appen" ikon="laas" flise="#636366" onPress={() => setBekraeft(true)} />}
      </Gruppe>
    </div>
  );
}
