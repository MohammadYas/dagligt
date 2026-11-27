import { FormEvent, useState } from 'react';
import { saetAdgang } from '../../src/adgang';

/**
 * Shown only when the access code is missing. Normally it arrives through
 * the link fragment (#n=…); this is the fallback if storage was cleared.
 */
export default function Laas({ aabnet }: { aabnet: () => void }) {
  const [kode, setKode] = useState('');
  const klar = kode.trim().length > 0;
  const proev = (e: FormEvent) => {
    e.preventDefault();
    if (!klar) return;
    saetAdgang(kode);
    aabnet();
  };
  return (
    <main className="laas">
      <form className="side" onSubmit={proev} style={{ gap: 16, justifyContent: 'center', minHeight: '100%' }}>
        <h1 className="t-large">VagtStatus</h1>
        <p className="t-sub">Åbn linket du fik, så husker telefonen koden. Har du den skrevet ned, kan du indsætte den her i stedet.</p>
        <label className="felt">
          <span className="t-sub">Adgangskode</span>
          <input type="password" autoComplete="current-password" autoCapitalize="none" autoCorrect="off" value={kode} onChange={e => setKode(e.target.value)} />
        </label>
        <button type="submit" className="knap knap--primaer tryk" disabled={!klar}>Lås op</button>
      </form>
    </main>
  );
}
