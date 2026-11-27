/**
 * Ren beslutning for tjek_torn: hvilke push-beskeder skal ud, og hvad
 * skal huskes til naeste minut. Laeser kun CAS-statusteksten.
 */
const TAVS_GRANSE_MS = 3 * 60_000;
const GENVARSEL_MS = 10 * 60_000;

/** Tallet i "Taget i alt: N" eller "Taget i dag: N/M", ellers null. */
function taget(tekst) {
  const m = /Taget i (?:dag|alt):\s*(\d+)/i.exec(tekst);
  return m ? parseInt(m[1], 10) : null;
}

function dineVagter(tekst) {
  const m = /Dine vagter:\s*(.+)/i.exec(tekst);
  const v = m?.[1]?.trim();
  return v && v.toLowerCase() !== 'ingen' ? v : null;
}

/**
 * @param {{ gemt: { abonnement: object, sidstVarslet: string|null, sidstTaget?: number|null },
 *           statusTekst: string, skrevet: string|null, nu: number }} input
 */
export function vurder({ gemt, statusTekst, skrevet, nu }) {
  const beskeder = [];
  const nyGemt = { ...gemt };

  if (skrevet) {
    const tavs = nu - Date.parse(skrevet) > TAVS_GRANSE_MS;
    if (!tavs) {
      // CAS melder sig: ryd et gammelt varsel, saa naeste tavshed giver besked.
      nyGemt.sidstVarslet = null;
    } else {
      const sidenSidste = gemt.sidstVarslet ? nu - Date.parse(gemt.sidstVarslet) : Infinity;
      if (sidenSidste >= GENVARSEL_MS) {
        beskeder.push({ titel: 'CAS melder sig ikke', tekst: 'Status er mere end tre minutter gammel.' });
        nyGemt.sidstVarslet = new Date(nu).toISOString();
      }
    }
  }

  const antal = taget(statusTekst);
  if (antal !== null) {
    if (typeof gemt.sidstTaget === 'number' && antal > gemt.sidstTaget) {
      beskeder.push({ titel: 'Ny vagt taget', tekst: dineVagter(statusTekst) ?? 'CAS har taget en vagt.' });
    }
    nyGemt.sidstTaget = antal;
  }

  return { beskeder, nyGemt };
}

/** web-push kraever "mailto:" eller "https:"; en bar e-mail faar mailto: foran. */
export function vapidSubjekt(raa) {
  const v = (raa ?? '').trim();
  if (/^(mailto:|https:)/i.test(v)) return v;
  if (v.includes('@')) return 'mailto:' + v;
  return 'mailto:varsel@localhost';
}
