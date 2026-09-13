/**
 * Planlagt tjek: ser hvert minut om Toern-scripter har meldt sig.
 *
 * Er statusfilen mere end tre minutter gammel, sendes et push-varsel til
 * telefonen. Der gaar hoest ét varsel hvert 10. minut, saa en Toern der
 * er gaaet helt ned ikke overdenger telefonen. Naar Toern melder igen,
 * spaendes vaagenen: naeste tiet er der igen varsel med det samme.
 */
import webPush from 'web-push';
import { hent, gem } from './_dropbox.mjs';

const STI = '/push_abonnement.txt';
const STATUS = '/status_torn.txt';
const TAVS_GRANSE_MS = 3 * 60_000;
const GENVARSEL_MS = 10 * 60_000;

export default async () => {
  const fil = await hent(STI);
  if (!fil.ok) return; // Intet abonnement gemt endnu.

  let gemt;
  try {
    gemt = JSON.parse(fil.tekst);
  } catch {
    return;
  }
  const abonnement = gemt?.abonnement;
  if (!abonnement || !abonnement.endpoint) return;

  const status = await hent(STATUS);
  if (!status.ok || !status.skrevet) return; // Kan ikke maale alder; lad vaere at varsle.

  const alder = Date.now() - Date.parse(status.skrevet);
  const tavs = alder > TAVS_GRANSE_MS;

  if (!tavs) {
    // Toern melder sig: ryd et gammelt varsel, saa naeste tiet giver besked.
    if (gemt.sidstVarslet) {
      await gem(STI, JSON.stringify({ abonnement, sidstVarslet: null }));
    }
    return;
  }

  const sidenSidste = gemt.sidstVarslet
    ? Date.now() - Date.parse(gemt.sidstVarslet)
    : Infinity;
  if (sidenSidste < GENVARSEL_MS) return;

  webPush.setVapidDetails(
    process.env.VAPID_SUBJECT ?? 'mailto:varsel@localhost',
    process.env.VAPID_PUBLIC_KEY ?? '',
    process.env.VAPID_PRIVATE_KEY ?? '',
  );

  try {
    await webPush.sendNotification(
      abonnement,
      JSON.stringify({
        titel: 'Tørn melder sig ikke',
        tekst: 'Status er mere end tre minutter gammel.',
      }),
    );
  } catch (e) {
    // Abonnementet kan vaere udloebet (404/410). Telefonen maa melde sig igen.
    console.error('Push fejlede:', e);
    return;
  }

  await gem(STI, JSON.stringify({ abonnement, sidstVarslet: new Date().toISOString() }));
};

export const config = { schedule: '*/1 * * * *' };
