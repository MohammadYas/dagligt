// This platform boundary keeps native configuration and its secrets out of web builds.
import { harAdgang, adgangsHeader } from './adgang';
export class DropboxFejl extends Error {
  constructor(public besked: string, public status: number) { super(besked); }
}
export type Fil = { tekst: string; skrevet: Date | null };
async function request(sti: string, body?: string): Promise<Response> {
  if (!harAdgang()) throw new DropboxFejl('Lås appen op med dit personlige link.', 401);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 25000);
  try {
    const r = await fetch('/api/dropbox?sti=' + encodeURIComponent(sti), {
      method: body === undefined ? 'GET' : 'POST',
      headers: { ...adgangsHeader(), ...(body === undefined ? {} : { 'Content-Type': 'text/plain;charset=UTF-8' }) },
      body, signal: ctrl.signal, cache: 'no-store',
    });
    if (!r.ok) throw new DropboxFejl(r.status === 401 ? 'Adgangen er udløbet eller afvist. Åbn dit personlige link igen.' : r.status === 409 ? 'Indstillingerne findes ikke endnu. Kontrollér forbindelsen, og prøv igen.' : 'Kunne ikke nå dine indstillinger. Prøv igen.', r.status);
    return r;
  } catch (e) {
    if (e instanceof DropboxFejl) throw e;
    throw new DropboxFejl('Ingen forbindelse. Dine ændringer er bevaret. Prøv igen.', 0);
  } finally { clearTimeout(timer); }
}
export async function hentStatus(sti: string): Promise<Fil> {
  const r = await request(sti);
  const date = new Date(r.headers.get('x-skrevet') ?? '');
  return { tekst: await r.text(), skrevet: Number.isFinite(date.getTime()) ? date : null };
}
export async function hentFil(sti: string) { return (await request(sti)).text(); }
export async function gemFil(sti: string, body: string) { await request(sti, body); }
export async function erOpsat() { return harAdgang(); }
