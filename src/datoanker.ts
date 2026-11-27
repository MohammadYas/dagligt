/**
 * Vælger hvilken måned kalenderen skal åbne på.
 *
 * Den gamle kalender brugte den FØRSTE valgte dato – ofte en gammel
 * septemberdato – så man skulle klikke flere måneder frem. Nu vælger vi
 * den første valgte dato, der er i dag eller senere; ellers i dag.
 */
export function kalenderAnker(value: string, selected: string[], iDag: string): string {
  const gyldig = (d: string) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return false;
    const dt = new Date(`${d}T12:00:00Z`);
    return Number.isFinite(dt.getTime()) && dt.toISOString().slice(0, 10) === d;
  };
  const kommende = selected.find(d => gyldig(d) && d >= iDag);
  return gyldig(value) ? value : (kommende || iDag);
}
