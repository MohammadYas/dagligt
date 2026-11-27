import { FilKey, VagtData, STIER, laes, skriv } from './vagtdata';

type Entry<K extends FilKey> = { draft?: VagtData[K]; saved?: VagtData[K]; raw?: string; loading: boolean; error?: string; missing?: boolean };
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const besked = (e: unknown) => e instanceof Error ? e.message : 'Ingen forbindelse. Prøv igen.';
const TITLER: Record<FilKey, string> = { kontrol: 'Hovedkontakter', cas: 'CAS ønsker', torn: 'TØRN ønsker', bureauer: 'Arbejdspladser', par: 'Stednavne-par' };

/** One session owns drafts even when their editor is not on screen. */
export class VagtSession {
  private entries: { [K in FilKey]: Entry<K> } = {
    kontrol: { loading: false }, cas: { loading: false }, torn: { loading: false }, bureauer: { loading: false }, par: { loading: false },
  };
  private listeners = new Set<() => void>();
  private version = 0;
  private places = new Set<string>();
  get knownPlaces() { return [...this.places]; }
  private rememberPlaces<K extends FilKey>(key: K, value: VagtData[K]) {
    if (key === 'cas' || key === 'torn') (value as VagtData['cas']).steder.forEach(n => this.places.add(n));
  }
  saving = false;
  error: string | null = null;
  message = '';
  constructor(public download: (path: string) => Promise<string>, public upload: (path: string, text: string) => Promise<void>) {}
  subscribe = (fn: () => void) => { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; };
  snapshot = () => this.version;
  private emit() { this.version++; this.listeners.forEach(fn => fn()); }
  get<K extends FilKey>(key: K): Entry<K> { return this.entries[key]; }
  get dirtyKeys(): FilKey[] {
    return (Object.keys(STIER) as FilKey[]).filter(k => JSON.stringify(this.entries[k].draft) !== JSON.stringify(this.entries[k].saved));
  }
  async load<K extends FilKey>(key: K) {
    const e = this.get(key);
    if (this.saving || e.loading || this.dirtyKeys.includes(key)) return;
    const savedAtStart = e.saved;
    e.loading = true; e.error = undefined; this.emit();
    try {
      const raw = await this.download(STIER[key]);
      // Someone can start editing the previous snapshot during a refresh.
      if (!this.saving && e.saved === savedAtStart && !this.dirtyKeys.includes(key)) {
        const value = laes(key, raw);
        this.rememberPlaces(key, value);
        e.raw = raw; e.saved = copy(value); e.draft = copy(value); e.missing = false;
      }
    } catch (err) {
      if (!this.saving && e.saved === savedAtStart) { e.error = besked(err); e.missing = (err as { status?: number }).status === 409; }
    }
    finally { e.loading = false; this.emit(); }
  }
  edit<K extends FilKey>(key: K, value: VagtData[K]) {
    if (this.saving || !this.get(key).draft) return;
    this.rememberPlaces(key, value);
    this.get(key).draft = copy(value); this.error = null; this.message = ''; this.emit();
  }
  cancel() {
    if (this.saving) return;
    for (const k of this.dirtyKeys) {
      const e = this.entries[k];
      e.draft = e.saved === undefined ? undefined : copy(e.saved);
    }
    this.error = null; this.message = ''; this.emit();
  }
  initialize<K extends FilKey>(key: K, value: VagtData[K]) {
    const e = this.get(key);
    if (!e.missing || this.saving) return;
    e.draft = copy(value); this.emit();
  }
  async save() {
    if (this.saving || !this.dirtyKeys.length) return;
    this.saving = true; this.error = null; this.message = ''; this.emit();
    try {
      // Validate every draft before writing the first file.
      const jobs = this.dirtyKeys.map(k => ({ key: k, text: skriv(k, this.entries[k].draft!, this.entries[k].raw) }));
      const confirmed = new Set<FilKey>();
      for (const job of jobs) {
        let current: string;
        try { current = await this.download(STIER[job.key]); }
        catch (err) { if (this.entries[job.key].missing && (err as { status?: number }).status === 409) continue; throw err; }
        if (current === job.text) confirmed.add(job.key);
        else if (current !== this.entries[job.key].raw) throw new Error(`${TITLER[job.key]} er ændret siden sidst. Annuller dine ændringer og tryk Opdater, før du prøver igen.`);
      }
      for (const job of jobs) {
        if (!confirmed.has(job.key)) await this.upload(STIER[job.key], job.text);
        const e = this.entries[job.key];
        e.saved = copy(e.draft!); e.raw = job.text; e.error = undefined; e.missing = false;
        // A later failure must not undo a file already confirmed by Dropbox.
        this.emit();
      }
      this.message = 'Gemt ✓';
    } catch (err) { this.error = besked(err); }
    finally { this.saving = false; this.emit(); }
  }
}
