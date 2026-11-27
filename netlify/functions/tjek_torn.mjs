/**
 * Planlagt tjek: ser hvert minut paa CAS-statusfilen.
 *
 * - Er statusfilen mere end tre minutter gammel, sendes "CAS melder sig
 *   ikke" (hoejst ét varsel hvert 10. minut).
 * - Stiger "Taget i alt", sendes "Ny vagt taget".
 *
 * Statusfilen laeses kun. Det eneste der skrives er appens egen
 * /push_abonnement.txt. Beslutningen ligger i _varsel.mjs.
 */
import webPush from 'web-push';
import { hent, gem } from './_dropbox.mjs';
import { vurder, vapidSubjekt } from './_varsel.mjs';

const STI = '/push_abonnement.txt';
const STATUS = '/status_cas.txt';

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
  if (!status.ok) return;

  const { beskeder, nyGemt } = vurder({ gemt, statusTekst: status.tekst, skrevet: status.skrevet, nu: Date.now() });

  if (beskeder.length) {
    webPush.setVapidDetails(
      vapidSubjekt(process.env.VAPID_SUBJECT),
      process.env.VAPID_PUBLIC_KEY ?? '',
      process.env.VAPID_PRIVATE_KEY ?? '',
    );
    for (const besked of beskeder) {
      try {
        await webPush.sendNotification(abonnement, JSON.stringify(besked));
      } catch (e) {
        // Abonnementet kan vaere udloebet (404/410). Telefonen maa melde sig igen.
        // Intet gemmes, saa beskeden proeves igen naeste minut.
        console.error('Push fejlede:', e);
        return;
      }
    }
  }

  if (JSON.stringify(nyGemt) !== JSON.stringify(gemt)) await gem(STI, JSON.stringify(nyGemt));
};

export const config = { schedule: '*/1 * * * *' };
