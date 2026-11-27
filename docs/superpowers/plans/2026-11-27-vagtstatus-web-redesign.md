# VagtStatus web-redesign — implementeringsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Erstat Expo/React Native Web-frontendet med en let Vite + React + Framer Motion-PWA. Alle funktioner beholdes, TØRN skjules, og fejlene i kalender, løn, rute, push og bundlinje rettes. Dropbox-sproget skal være byte-identisk.

**Architecture:** Den nye app ligger i `app/` (UI). Den genbruger de rene logikmoduler i `src/` (vagtdata, vagtsession, vagter, lon, rute, steder, datoanker, adgang) og taler kun med de eksisterende Netlify-funktioner (`/api/dropbox`, `/api/push`). Expo-koden fjernes først i den næstsidste opgave, så den gamle app kan bygges hele vejen til da.

**Tech Stack:** Vite ^8, @vitejs/plugin-react ^6, React 19.2.3 og react-dom 19.2.3 (versioner der allerede er i projektet), motion ^14 (`import { motion } from 'motion/react'`), TypeScript ~6.0.3, tsx --test, Netlify Functions, web-push.

**Spec:** `docs/superpowers/specs/2026-11-27-vagtstatus-web-redesign-design.md`

## Global Constraints

- Output til `/kontrol.txt`, `/dage.txt`, `/torn_dage.txt`, `/bureauer.txt`, `/steder.txt` er byte-identisk med i dag (golden tests i Task 1 ændres aldrig).
- Al skrivning til Dropbox går gennem `VagtSession.save()` → `vagtdata.skriv()` → `gemFil()` → `POST /api/dropbox?sti=…`. UI'et bygger aldrig filtekst selv.
- `status_*.txt` læses kun. `/push_abonnement.txt` er appens egen fil.
- localStorage-nøglerne `dagligapp.adgang` og `vagtstatus.lon.v1` beholder navn og format.
- `/sw.js`, `/manifest.webmanifest` (`start_url: "/"`, `scope: "/"`) og `/ikoner/*` serveres på samme stier.
- Mørkt tema med tokens fra `src/theme.ts` `dark`. Trykflader er mindst 44 × 44 px. Status vises altid med tekst.
- TØRN vises ikke i UI'et, men dage og steder skrives fortsat til både `cas` og `torn`, og `kontrol.torn` bevares uændret.
- Animation: højst 250 ms for fane/fade, ingen `scale(0)`-start, og `prefers-reduced-motion` fjerner glid.
- Intet `git push` og ingen `netlify deploy` uden Mos udtrykkelige godkendelse i chatten.
- Lokal test kun mod syntetiske filer (`scripts/preview-test.mjs`), aldrig mod de rigtige Dropbox-filer.

## Review Focus

1. **Hurtige tryk under gemning:** Fem datotryk på under 2 sekunder, mens en gemning kører, skal ende som præcis de fem datoer i begge filer og med højst to upload-runder. → test i Task 3.
2. **Lønningsdag og dagene før:** Mandag–onsdag efter periodeslut skal "Næste løn" stadig vise perioden med søndagsvagten, og på torsdagen skal den stå i "Tidligere". → test i Task 2.
3. **Gammel `dage.txt` med kommentarer og `# Sted`:** Læses og skrives som i dag (kommentarer og slukkede steder falder ud, som nu), ikke anderledes. → golden i Task 1.
4. **Push-fil uden nye felter (gammelt format):** `tjek_torn` må ikke sende "Vagt taget" første gang og må ikke kaste fejl. → test i Task 5.
5. **Adressesøgning uden net, eller hvis Photon svarer 5xx:** Søgefeltet viser en tekstfejl, og stopene bevares. → test i Task 4.

---

### Task 0: Udgangspunkt og gren

**Files:** ingen kode.

- [ ] **Step 1:** `git status --porcelain` → bekræft de 20 ændrede og 26 utrackede filer fra før.
- [ ] **Step 2:** Commit det nuværende arbejde som udgangspunkt på `codex/vagtstatus-apple-dark`. Tag alt med undtagen `faktura-pilot.pdf` (urelateret, bliver liggende utracket):
```bash
git add -A -- . ':!faktura-pilot.pdf'
git commit -m "chore: snapshot deployed Apple-dark VagtStatus before web redesign"
```
- [ ] **Step 3:** `git switch -c redesign/web`, derefter `npm test` → 43 pass.

### Task 1: Golden tests for Dropbox-sproget

**Files:** Create `tests/kontrakt.test.ts`

**Interfaces:** Consumes `laes`, `skriv`, `skrivKontrol` fra `src/vagtdata.ts` og `bureauer`, `kontrol` fra `tests/fixtures/dropbox.mjs`.

- [ ] **Step 1: Skriv testene** med disse præcise forventninger (fanget fra den nuværende kode 27/11):

| Test | Input | Forventet |
| --- | --- | --- |
| `kontrol skrives præcist` | `skrivKontrol({cas:true,torn:false})` | `"CAS: ON\nTØRN: OFF\n"` |
| `kontrol-fil rundtur` | `skriv('kontrol', laes('kontrol', kontrol))` | `"CAS: ON\nTØRN: ON\n"` |
| `dage sorteres og dubletter fjernes` | `skriv('cas',{datoer:['2026-12-03','2026-12-01','2026-12-01'],steder:['Team Forlev','Team Sørby']})` | `"2026-12-01\n2026-12-03\nTeam Forlev\nTeam Sørby\n"` |
| `ingen dage = tom fil` | `skriv('cas',{datoer:[],steder:[]})` | `""` |
| `gammel ønskefil rundtur` | `skriv('cas', laes('cas','# ---- DAGE ----\n2026-09-25\n# 2026-09-20\n# ---- STEDER ----\nTeam Forlev\n# Team Nygade\n'))` | `"2026-09-25\nTeam Forlev\n"` |
| `torn skrives som cas` | samme Dage-objekt til `skriv('torn', …)` | identisk med `skriv('cas', …)` |
| `bureauer rundtur` | `skriv('bureauer', laes('bureauer', bureauer), bureauer)` | `=== bureauer` |
| `slukket MultiCare` | række 1 `aktiv:false` | `bureauer` med linje 4 ændret til `"# MultiCare- pædagogisk og sundhedsfagligt vikarbureau"` |
| `prioritet byttet` | `[b[1], b[0]]` | vejledningslinjerne + `"MultiCare- …\nAkut Hjælp\n"` |
| `par` | `skriv('par',[{a:'Teststed CAS',b:'Teststed TØRN'}])` | `"Teststed CAS = Teststed TØRN\n"` |

Brug `assert.equal` mod streng-literaler, ikke mod genkald af koden.
- [ ] **Step 2:** `npx tsx --test tests/kontrakt.test.ts` → alle pass (de låser den nuværende adfærd).
- [ ] **Step 3:** Commit: `test: lock Dropbox file language with golden outputs`

### Task 2: Næste løn, tidligere udbetalinger og lagring uden AsyncStorage

**Files:** Modify `src/lon.ts` (tilføj funktioner, og skift kun `loadPayData`/`savePayData`'s lager). Test `tests/lon.test.ts`.

**Interfaces — Produces:**
- `naesteLoen(today: string): PayPeriod` — første periode med `payday >= today`.
- `tidligereLoen(shifts: Shift[], today: string): PayPeriod[]` — unikke perioder for vagterne med `payday < today`, nyeste først.
- `loadPayData(): Promise<PayData>` og `savePayData(data: PayData): Promise<void>` — samme signatur, men læser og skriver `globalThis.localStorage['vagtstatus.lon.v1']` direkte (samme rå JSON-streng som AsyncStorage gav på web).

- [ ] **Step 1: Fejlende tests**
```ts
test('søndagsvagt forbliver i næste løn indtil lønningsdagen', () => {
  for (const d of ['2026-10-17','2026-10-18','2026-10-19','2026-10-20','2026-10-21'])
    assert.equal(naesteLoen(d).payday, '2026-10-21');
  assert.equal(naesteLoen('2026-10-22').payday, '2026-11-04');
});
test('tidligere udbetalinger starter dagen efter lønningsdag', () => {
  const s = [shift({ date: '2026-10-18', start: '15:00', end: '23:00' })];
  assert.deepEqual(tidligereLoen(s, '2026-10-21'), []);
  assert.deepEqual(tidligereLoen(s, '2026-10-22').map(p => p.payday), ['2026-10-21']);
});
test('løndata gemmes under samme localStorage-nøgle og format', async () => { /* stub globalThis.localStorage med Map; savePayData(normalisePayData(null)); assert key 'vagtstatus.lon.v1' og JSON.parse(value).version === 2; loadPayData() round-trips */ });
```
- [ ] **Step 2:** `npx tsx --test tests/lon.test.ts` → FAIL (naesteLoen er ikke defineret).
- [ ] **Step 3:** Implementér. `naesteLoen`: `p = getPayPeriodForDate(today)`. Hvis `getPayPeriodForDate(addDays(p.start,-1)).payday >= today`, returneres den forrige periode, ellers `p`. Fjern `import AsyncStorage` og brug try/catch om `localStorage`.
- [ ] **Step 4:** `npm test` → alle pass.
- [ ] **Step 5:** Commit: `fix(lon): keep finished period as next pay until payday; local storage without AsyncStorage`

### Task 3: VagtSession tager imod tryk under gemning

**Files:** Modify `src/vagtsession.ts`. Test `tests/vagtsession.test.ts`.

**Interfaces:** Uændret offentlig API (`edit`, `save`, `load`, `cancel`, `dirtyKeys`, `saving`, `subscribe`, `snapshot`, `get`, `initialize`, `knownPlaces`).

- [ ] **Step 1: Fejlende tests**
  - `edits during a save are kept and saved in a follow-up round`: Lav en download/upload med en kontrolleret promise. Start `save()` med datoer `['2026-12-01']`. Mens upload hænger, kaldes `edit('cas', {…datoer:['2026-12-01','2026-12-02']})` og det samme for `torn`. Slip upload. Afvent, til `saving===false` og `dirtyKeys.length===0`. Assert: sidste upload til `/dage.txt` er `"2026-12-01\n2026-12-02\n…"`, og `/torn_dage.txt` er identisk.
  - `five rapid toggles end in at most two upload rounds`: Assert, at antallet af uploads pr. fil er ≤ 2, og at slutindholdet har alle 5 datoer.
  - `a failed save does not auto-retry in a loop`: Upload fejler. Assert `error` er sat, og at der ikke kommer et nyt download-kald inden for 50 ms.
- [ ] **Step 2:** `npx tsx --test tests/vagtsession.test.ts` → de 3 nye fejler, og de 12 gamle passerer.
- [ ] **Step 3:** Implementér:
  - `edit()`: fjern `this.saving ||`-vagten. Draft-tjekket bevares.
  - `save()`:
    - Gem `value: copy(draft)` i hvert job ved start.
    - Efter upload: `e.saved = job.value` (ikke den aktuelle draft) og `e.raw = job.text`.
    - I `finally`: kør `void this.save()` én gang til, hvis `!this.error && this.dirtyKeys.length`.
  - `cancel()` og `load()` er stadig blokeret under gemning.
- [ ] **Step 4:** `npm test` → alle pass, inkl. Task 1.
- [ ] **Step 5:** Commit: `fix(session): accept edits while saving and save them in a follow-up round`

### Task 4: Adressesøgning via Photon

**Files:** Create `src/adresse.ts`. Test `tests/adresse.test.ts`. (`src/dawa.ts` slettes i Task 13.)

**Interfaces — Produces:** `soeg(q: string, signal?: AbortSignal): Promise<Forslag[]>` og `type Forslag`, med præcis de felter `dawa.ts` har i dag (`tekst, kort, detalje, bynavn, post, udenbys, lon, lat`).

- [ ] **Step 1: Fejlende tests** med en stubbet `fetch`, der returnerer en Photon-FeatureCollection, med en feature `{street:'Smedegade', housenumber:'32', postcode:'4200', city:'Slagelse', locality:'Kirkegårdshuse', countrycode:'DK'}` og koordinater `[11.3667,55.4061]`:
  - Mapping: `kort==='Smedegade 32'`, `post==='4200 Slagelse'`, `bynavn==='Kirkegårdshuse'`, `udenbys===false`, `lon===11.3667`, `lat===55.4061`.
  - Forespørgslen indeholder `lat=55.40`, `lon=11.35`, `lang=default` og `limit=12`, og ikke-DK-resultater filtreres fra.
  - Features uden `housenumber` eller `street` springes over. Dubletter (samme `tekst`) fjernes.
  - `q` under 2 tegn → `[]` uden fetch. `fetch` svarer 503 → kaster `Error('Adressesøgningen svarer ikke lige nu.')`.
- [ ] **Step 2:** Kør → FAIL.
- [ ] **Step 3:** Implementér mod `https://photon.komoot.io/api/?q=…&lat=55.40&lon=11.35&limit=12&lang=default`. `udenbys = !['4200','4220','4230','4241','4242','4243','4244','4245','4261','4262'].includes(postcode)`.
- [ ] **Step 4:** `npm test` → pass. Probe live én gang: `curl -s "https://photon.komoot.io/api/?q=Linde%20All%C3%A9%2056%20Kors%C3%B8r&limit=1"` → har `"postcode":"4220"`.
- [ ] **Step 5:** Commit: `fix(rute): replace closed DAWA with Photon address search`

### Task 5: Push — diagnose, behold felter og "Vagt taget"

**Files:** Create `netlify/functions/_varsel.mjs`. Modify `netlify/functions/tjek_torn.mjs` og `netlify/functions/push.mjs`. Test `tests/varsel.test.mts`.

**Interfaces — Produces:** `vurder({ gemt, statusTekst, skrevet, nu }) → { beskeder: {titel:string, tekst:string}[], nyGemt }`, hvor `gemt = { abonnement, sidstVarslet: string|null, sidstTaget?: number|null }`.

- [ ] **Step 1: Diagnose (kun læsning, ingen værdier i output):**
```bash
netlify status
netlify env:list --json --context production | node -e "let s='';process.stdin.on('data',c=>s+=c).on('end',()=>console.log(Object.keys(JSON.parse(s)).sort().join('\n')))"
```
Forventet: `APP_ADGANGSKODE, DEEPSEEK_KEY, DROPBOX_*, VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT`. Kør derefter `netlify logs:function tjek_torn` i baggrunden i 3 minutter og notér `Push fejlede`/404/410-linjer. Skriv fundet i opgavens commit-besked. Mangler en VAPID-nøgle, eller passer den offentlige nøgle ikke til `Varsler.tsx` `KEY`, stopper du og spørger Mo.
- [ ] **Step 2: Fejlende tests** for `vurder`:
  - Status 2 min gammel, `sidstVarslet` sat → ingen beskeder, `nyGemt.sidstVarslet===null`.
  - Status 4 min gammel, `sidstVarslet:null` → én besked `{titel:'CAS melder sig ikke', tekst:'Status er mere end tre minutter gammel.'}`.
  - Status 4 min gammel, `sidstVarslet` 5 min siden → ingen besked (10-min-grænsen).
  - `Taget i alt: 2 (max 3 pr. dato)`, `sidstTaget` mangler → ingen besked, `nyGemt.sidstTaget===2`.
  - `Taget i alt: 3`, `sidstTaget:2`, med `Dine vagter: 2026-11-12 kl. 07:00 Stillinge` → besked `{titel:'Ny vagt taget', tekst:'2026-11-12 kl. 07:00 Stillinge'}`, `sidstTaget===3`.
  - `Taget i alt: 1/3` læses som 1. Tallet falder (ny dag) → ingen besked, `sidstTaget` opdateres.
- [ ] **Step 3:** Implementér `vurder` med `parseStatus`-reglerne (regex `Taget i (?:dag|alt):\s*(\d+)`). Når `tjek_torn` kalder `vurder`, sendes hver besked via webPush, og `nyGemt` skrives kun, hvis den er ændret. `push.mjs` POST læser først den eksisterende fil og skriver `{ ...gammel, abonnement }`. DELETE skriver som i dag.
- [ ] **Step 4:** `npm test` → pass. `tests/proxy.test.mts` er uændret og passerer.
- [ ] **Step 5:** Commit: `feat(push): notify when CAS takes a shift; keep push state on re-subscribe`

### Task 6: Vite-skal, faner og lås

**Files:**
- Create `index.html`, `vite.config.ts` (med `server.proxy: { '/api': 'http://127.0.0.1:8091' }`, så Vite dev bruger fixture-serveren), `tsconfig.app.json`, `app/main.tsx`, `app/App.tsx`, `app/TabBar.tsx`, `app/styles.css`, `app/rute.ts` (hash-router), `app/screens/Laas.tsx`.
- Move `web/manifest.webmanifest`, `web/sw.js`, `web/robots.txt` og `web/ikoner/` → `public/`. Bump `CACHE` til `'vagtstatus-v4'`.
- Modify `package.json`: deps `vite`, `@vitejs/plugin-react`, `motion`. Scripts `dev:web`, `build:web` = `vite build`, og `typecheck` kører også `tsc -p tsconfig.app.json --noEmit`.
- Modify `scripts/check-web.mjs` (samme tjek: én viewport-meta, `lang="da"`, titel og ingen `.env`-værdier i `dist`).

**Interfaces — Produces:**
- `type Skaerm = 'hjem'|'dage'|'arbejdspladser'|'indstillinger'|'loen'|'rute'`.
- `useSkaerm(): [Skaerm, (s: Skaerm) => void]` (hash-baseret). Gamle hashes oversættes: `vagter→hjem`, `oensker→dage`, `bureauer→arbejdspladser`, `lon→loen`, `par→hjem`.
- `TabBar({ aktiv, vaelg })` med de tre faner Hjem · Løn · Rute.

- [ ] **Step 1:** Test `tests/skaerm.test.ts` for den rene oversættelse `fraHash(hash: string): Skaerm` (alle gamle hashes plus `''` og `#n=abc` → `'hjem'`). Kør → FAIL, implementér i `app/rute.ts`, kør → PASS.
- [ ] **Step 2:** `index.html` med `<html lang="da">`, `<title>VagtStatus</title>`, samme meta-blok som `scripts/pwa.mjs` har i dag (viewport, apple-mobile-web-app-*, theme-color, manifest, apple-touch-icon) og SW-registrering med `updateViaCache:'none'`. `app/main.tsx` importerer `src/adgang` først, så `#n=` læses og fjernes, før routeren kigger på hash.
- [ ] **Step 3:** `styles.css`:
  - CSS-variabler fra `dark`.
  - `html,body,#root{height:100%;margin:0;background:#000}`, `overscroll-behavior:none`, systemskrift og `-webkit-tap-highlight-color:transparent`.
  - Fanebaren: `position:fixed;bottom:0;height:calc(49px + env(safe-area-inset-bottom));padding-bottom:env(safe-area-inset-bottom)`. Indhold får `padding-bottom` med samme værdi.
  - Reduced-motion-blok.
- [ ] **Step 4:** `App` viser `Laas` (port af `src/components/Laas.tsx`-adfærd: indtast kode → `saetAdgang`), når `!harAdgang()`. Ellers vises skærm og `TabBar`. Fanerne skifter med `AnimatePresence mode="popLayout"`, opacity 0→1 og y 6→0 på 200 ms. Skærmene er pladsholdere indtil Task 8–12.
- [ ] **Step 5:** `npm run build:web && node scripts/check-web.mjs` → "Web export: …". Bundlens JS er under 300 KB (`du -k dist/assets/*.js`).
- [ ] **Step 6:** Commit: `feat(web): Vite shell with tabs, hash routes and lock screen`

### Task 7: UI-kit og bevægelse

**Files:** Create `app/ui/` with `Knap.tsx`, `Gruppe.tsx`, `Raekke.tsx`, `Kontakt.tsx`, `Felt.tsx`, `Besked.tsx`, `Ark.tsx`, `Pille.tsx`, `bevaegelse.ts`.

**Forudsætning:** Spørg Mo, om [emilkowalski/skills](https://github.com/emilkowalski/skills) og `secondsky/claude-skills` `motion` må hentes til `.claude/skills/`. Siger Mo ja, læses de nu, og deres regler følges i denne og de efterfølgende opgaver. Siger Mo nej, følges reglerne i Global Constraints.

**Interfaces — Produces:**
- `bevaegelse.ts`: `fjeder = { type:'spring', stiffness: 420, damping: 38 }`, `hurtig = { duration: .18, ease: [0.2, 0, 0, 1] }`, og `useDaempet()` = `useReducedMotion()`.
- `Knap({ label, onPress, variant?: 'primaer'|'stille'|'fare', ikon?, optaget?, deaktiveret? })` — `whileTap={{ scale: .97 }}`, højde ≥ 48.
- `Kontakt({ label, hjaelp?, vaerdi, onSkift, deaktiveret? })` — hele rækken er `role="switch"`, og mellemrum aktiverer.
- `Ark({ aaben, onLuk, titel, children })` — glider op fra bunden med `fjeder`, har en baggrund der lukker, Escape lukker, og fokus fanges i arket.
- `Pille({ tekst, tone: 'neutral'|'ok'|'advarsel'|'fejl' })` — `aria-live="polite"`.
- `Gruppe({ titel?, hjaelp?, children })`, `Raekke({ titel, detalje?, ikon?, onPress?, hoejre? })`, `Felt(props & { label })`, `Besked({ tekst, fejl? })`.

- [ ] **Step 1:** Byg komponenterne. Ikoner er inline SVG (ingen ikonpakke).
- [ ] **Step 2:** Midlertidig `#ui`-side, der viser alle komponenter. Kontrollér med browserpanelet ved 375 px: tab/mellemrum virker, fokusring er synlig, og reduced-motion (emuleret) stopper glid. Fjern `#ui` igen.
- [ ] **Step 3:** `npm run typecheck` → ingen fejl. Commit: `feat(web): UI kit with motion presets`

### Task 8: Data-hooks

**Files:** Create `app/data/session.ts`, `app/data/status.ts`, `app/data/loen.ts`. Modify: ingen.

**Interfaces — Produces:**
- `session: VagtSession` (én instans: `new VagtSession(hentFil, gemFil)` fra `src/dropbox.web.ts`) og `useSession(): VagtSession` (via `useSyncExternalStore(session.subscribe, session.snapshot)`).
- `useGemVedForlad()`: gemmer ved `visibilitychange→hidden` og `pagehide`, og advarer ved `beforeunload`, når `dirtyKeys.length`.
- `useCasStatus(): { fil?: Fil; fejl?: string; henter: boolean; opdater(): void }` — henter `FILER.cas.status` ved start, hvert 60. sekund og når appen bliver synlig.
- `useLoen(): { data: PayData|null; gem(data: PayData): void }` — via `loadPayData`/`savePayData`.

- [ ] **Step 1:** Implementér. Første render kalder `session.load(k)` for `kontrol`, `cas`, `torn` og `bureauer` (ikke `par`, som ikke vises).
- [ ] **Step 2:** `npm run typecheck`. Commit: `feat(web): data hooks over existing session, status and pay modules`

### Task 9: Hjem

**Files:** Create `app/screens/Hjem.tsx`, `app/komponenter/Loenkort.tsx`, `app/komponenter/CasStatus.tsx`, `app/komponenter/VagtArk.tsx` (genbruges i Task 11).

**Interfaces — Consumes:** `useLoen`, `useCasStatus`, `useSession`, `naesteLoen`, `calculatePeriodGross`, `calculatePeriodNet`, `parseStatus`, `tilstand`, `siden`.
**Produces:** `VagtArk({ aaben, onLuk, data, original?: Shift, onGem(shift: Shift), onSlet?() })`. Felter og standarder som `ShiftEditor` i `src/screens/Lon.tsx`: arbejdsgiver Multicare/Akut Hjælp, dato (kalender), start 07:00, slut 15:00, ubetalt pause 0. `rateSnapshot` sættes ved oprettelse.

- [ ] **Step 1: Loenkort:**
  - "Næste løn · {kort dato for payday}".
  - Nettobeløb i 34 px tabulære cifre. Er `taxRate` null, vises "Indtast trækprocent".
  - "Brutto … · N vagter · T timer".
  - Primærknap **Opret vagt** åbner `VagtArk`.
  - Et tryk på kortet → `loen`.
- [ ] **Step 2: CasStatus:**
  - Titel "CAS" og tilstandstekst: Kører / Ingen nylig kontakt / Kræver opmærksomhed / Forbindelsesfejl.
  - "Booking aktiv/slået fra" fra `kontrol.cas`.
  - Kan foldes ud (motion layout) og viser så ledige, matcher, dine vagter, interesseret, taget i alt og råfilen i et scrollfelt på højst 200 px.
- [ ] **Step 3:** Kontakten "Automatisk booking" → `session.edit('kontrol', { ...kontrol, cas })` efterfulgt af `session.save()` med det samme (en enkelt kontakt behøver ingen Gem-linje). `torn` sendes uændret videre. Fejl vises med `Besked fejl` og knappen "Prøv igen".
- [ ] **Step 4:** Rækkerne "Dage og steder" (detalje "N dage · M steder", eller "Alle dage" når N=0) og "Arbejdspladser", plus tandhjul → `indstillinger`. Træk ned for at opdatere er ikke nødvendigt: knappen "Opdater" i CasStatus kalder `opdater()` og `session.load`.
- [ ] **Step 5:** Kontrollér i browserpanelet mod `scripts/preview-test.mjs` (Task 12 opdaterer det til `dist`; indtil da kører Vite dev med en lille proxy til port 8091). Kontakten skal give præcis én POST `/kontrol.txt` = `"CAS: OFF\nTØRN: ON\n"` for fixturen.
- [ ] **Step 6:** Commit: `feat(web): home with pay header, CAS status and booking switch`

### Task 10: Dage og steder + ny kalender

**Files:** Create `app/screens/DageSteder.tsx`, `app/komponenter/Kalender.tsx`, `app/komponenter/Stedvaelger.tsx`. Test `tests/kalender.test.ts`.

**Interfaces — Produces:**
- `Kalender({ valgte: string[], onSkift(dato: string), iDag: string })`.
- Den rene hjælpefunktion `maanedsCeller(aar: number, maaned: number): (string|null)[]` i `app/komponenter/kalenderdata.ts`, der starter mandag.
- Start-måned via `kalenderAnker('', valgte, iDag)`.

- [ ] **Step 1: Test `maanedsCeller`:**
  - `(2026, 1)` (februar) har 6 tomme celler foran (1. feb 2026 er søndag) og 28 datoer.
  - `(2026, 10)` (november) har 6 tomme celler foran og 30 datoer.
  - Kør → FAIL, implementér, kør → PASS.
- [ ] **Step 2: Kalender:**
  - 7 kolonner med celler på mindst 44 px.
  - Swipe vandret (motion `drag="x"` med `dragConstraints={{left:0,right:0}}` og en tærskel på 60 px) eller pilene skifter måned med et glid på 180 ms.
  - Knappen "I dag", som kun vises, når en anden måned står fremme.
  - Datoer før i dag er dæmpede, men kan stadig trykkes (de kan stå i filen).
  - Valgte datoer er blå. Et tryk animerer `scale .92→1`.
  - `aria-pressed` og fuld dansk dato som `aria-label`.
- [ ] **Step 3: Stedvaelger:** Grupperet efter `gruppeFor(n)` som i `Editors.tsx`, med søgning og "Tilføj nyt sted" (valideret med `navn()` og kontrol for dubletter med `normaliser`).
- [ ] **Step 4: Gem-logik i `DageSteder`:**
  - `samlet(cas, torn)` som i `Editors.tsx`, og hver ændring kalder `session.edit('cas', next)` og `session.edit('torn', next)`.
  - Gem 1200 ms efter sidste tryk, og straks når skærmen forlades (unmount).
  - Ingen kontroller er deaktiveret under gemning.
  - `Pille`: "N dage valgt · Gemmer…" mens der gemmes, "Gemt ✓" i 2 sekunder bagefter, og ved fejl `Pille fejl` med "Prøv igen".
- [ ] **Step 5:** Browserkontrol mod fixtures: tryk 5 datoer på cirka 2 sekunder → `/__test/results` viser slutindholdet med alle 5 i både `/dage.txt` og `/torn_dage.txt`, og højst 2 writes pr. fil. Tryk på en valgt dag fjerner den.
- [ ] **Step 6:** Commit: `feat(web): days and places with non-blocking calendar`

### Task 11: Arbejdspladser og Løn

**Files:** Create `app/screens/Arbejdspladser.tsx`, `app/screens/Loen.tsx`, `app/komponenter/Periode.tsx`, `app/komponenter/LoenIndstillinger.tsx`, `app/komponenter/GemLinje.tsx`.

**Interfaces — Consumes:** `VagtArk` (Task 9), `naesteLoen`, `tidligereLoen`, `upcomingPeriods`, `calculatePeriodGross`, `calculatePeriodNet`, `calculateShiftGross`.
**Produces:** `GemLinje({ session })`, en fast linje over fanerne med Annuller / Gem ændringer / Prøv igen, som vises, når `dirtyKeys.length` er større end 0 eller der er en fejl.

- [ ] **Step 1: Arbejdspladser:**
  - Liste med `Kontakt` pr. bureau.
  - Rækkefølge via motion `Reorder.Group` (træk i håndtaget) samt op/ned-knapper.
  - Slet og "Tilføj arbejdsplads".
  - Alt er kladde, indtil der trykkes Gem i `GemLinje`.
- [ ] **Step 2: Løn:**
  - Toppen viser `naesteLoen(todayKey())` (samme kort som på Hjem) og **Tilføj vagt**.
  - "Vagter i perioden" (rækker → rediger i `VagtArk`).
  - "Kommende" = `upcomingPeriods(naesteLoen(i dag).end + 1 dag, 4)`.
  - **"Tidligere udbetalinger"** = `tidligereLoen(...)` med beløb, vist direkte. Er listen tom: "Ingen tidligere udbetalinger endnu."
  - Tandhjul → `LoenIndstillinger`: satser for 6 felter × 2 arbejdsgivere, hovedkort, fradrag, trækprocent og AM. Valideres som `NumericField`.
- [ ] **Step 3: Periode-detalje:** Brutto, AM, A-skat og netto pr. arbejdsgiver (`calculatePeriodNet`), samt vagtlisten.
- [ ] **Step 4:** Browserkontrol:
  - Opret, rediger og slet en vagt.
  - Ændr satser, og tjek at gamle vagter beholder deres `rateSnapshot`.
  - Sæt systemuret til 2026-10-20 (browserens `Date`-override i konsollen) med en søndagsvagt 18/10 → den vises under Næste løn.
- [ ] **Step 5:** Commit: `feat(web): agencies editor and pay screens with visible history`

### Task 12: Rute, Indstillinger og lokal preview

**Files:**
- Create `app/screens/Rute.tsx`, `app/screens/Indstillinger.tsx`, `app/komponenter/Varsler.tsx`.
- Modify `scripts/preview-test.mjs`: server `dist/` og tilføj `/api/push` (201 i hukommelsen). Status-fixture med `Dine vagter`/`Taget i alt: 1`.

**Interfaces — Consumes:** `soeg` (Task 4), `planlaeg`, `kortLinks`, `tid`, `afstand` fra `src/rute.ts`, `hentPlacering`-adfærden (kun browserens `navigator.geolocation` — port fra `src/placering.ts` web-grenen), `adgangsHeader`, `glemAdgang`.

- [ ] **Step 1: Rute:**
  - Søgefelt med 250 ms debounce og `AbortController` pr. søgning. Forslagsliste med `kort`, `detalje`, `bynavn · post` og markering ved `udenbys`.
  - Stopliste med `Reorder.Group` og slet.
  - "Start hvor jeg står", Beregn, resultat (tid, afstand og "skønnet" når `!rigtigeTider`) og en knap pr. `kortLinks`-etape.
  - Rutens tilstand ligger i komponenten, som altid er monteret (skjult med `hidden` ved faneskift), så den bevares.
- [ ] **Step 2: Indstillinger:**
  - Varsler (port af `src/components/vagter/Varsler.tsx`, samme `KEY` og samme kald til `/api/push`, plus teksten: "Du får besked, når CAS ikke har meldt sig i tre minutter, og når en vagt bliver taget.").
  - Appudgave (`import.meta.env.VITE_UDGAVE`).
  - "Lås appen" → `glemAdgang()` og genindlæs.
- [ ] **Step 3: Browserkontrol** (`npm run build:web && node scripts/preview-test.mjs`, åbn `http://127.0.0.1:8091/#n=local-preview`):
  - Alle skærme ved 320/375/414 px: ingen vandret scroll, og fanebaren er fast i bunden.
  - Ruten med offentlige adresser (Rådhuspladsen 1 København → Vesterbrogade 3).
  - Netværksfejl via `POST /__test/fail` → "Prøv igen" virker.
  - Bundtstørrelse er noteret.
- [ ] **Step 4:** Commit: `feat(web): route and settings screens; local fixture preview serves new build`

### Task 13: Fjern Expo-frontendet

**Files:**
- Delete: `App.tsx`, `index.ts`, `app.json`, `babel.config.js`, `build-devclient.sh`, `build-ipa.sh`, `.github/workflows/ios.yml`, `targets/`, `assets/` (ikke `public/`), `scripts/klargoer-ipa.mjs`, `scripts/pwa.mjs`, `web/`, `src/components/`, `src/screens/`, `src/dropbox.ts`, `src/konfig.ts`, `src/dawa.ts`, `src/placering.ts`, `src/motion.ts`, `src/type.ts`, `src/widget.ts`, `src/store.ts`, `src/projekter.ts`, `src/brief.ts`, `src/ai.ts`, `src/deepseek.ts`, `src/totp.ts`, `src/react-dom.d.ts`, `tests/webappearance.test.ts`, `tests/alt.mts`.
- Rename `src/dropbox.web.ts` → `src/dropbox.ts` (opdatér imports).
- Modify:
  - `package.json`: fjern expo, react-native, reanimated, async-storage, secure-store, location, speech, haptics, clipboard, webview, safe-area og vector-icons. Behold `web-push`.
  - `tsconfig.json`: ét projekt med `lib: ["DOM","ES2023"]`, `jsx: "react-jsx"` og `include: ["app","src","tests","netlify"]`. Slet `tsconfig.app.json`.
  - `scripts/udgave.mjs`: kør `vite build` med `VITE_UDGAVE`.
  - `netlify.toml`: `command = "node scripts/udgave.mjs"`, `publish = "dist"`, headers og redirects som i dag.
  - `DESIGN.md`: opdatér stack, skærme og verifikation.

Sletningen må ikke ramme `src/vagtdata.ts`, `src/vagtsession.ts`, `src/vagter.ts`, `src/lon.ts`, `src/rute.ts`, `src/steder.ts`, `src/datoanker.ts`, `src/adgang.ts`, `src/adresse.ts` eller `src/theme.ts`.

- [ ] **Step 1:** `grep -rn "from '\.\./src\|from '\.\/src\|src/" app tests netlify` → hver import peger på en fil, der stadig findes.
- [ ] **Step 2:** `npm install`, derefter `npm test`, `npm run typecheck` og `node scripts/udgave.mjs && node scripts/check-web.mjs` → alle grønne. Testantallet er mindst 43 − 1 (webappearance) + de nye.
- [ ] **Step 3:** `git diff --stat main -- src/vagtdata.ts src/vagter.ts src/steder.ts netlify/functions/dropbox.mjs netlify/functions/_dropbox.mjs netlify/functions/_adgang.mjs netlify/functions/deepseek.mjs` → tomt (kontraktfilerne er urørte).
- [ ] **Step 4:** Commit: `chore: remove Expo/React Native frontend after web rewrite`

### Task 14: Helhedsgennemgang og Mos lokale godkendelse

- [ ] **Step 1:** Hel gennemgang af grenen (reviewer på det mest kapable model) mod spec og Global Constraints, især golden tests, `VagtSession`-diffen og push-funktionerne. Ret det, der findes, og gentag `npm test`.
- [ ] **Step 2:** Start `scripts/preview-test.mjs`, og vis Mo appen i browserpanelet. Spørg, om Mo vil teste på telefonen:
  - (a) Lokalt på wifi med fixtures: preview-serveren bindes til `0.0.0.0`. Det er ufarligt, fordi der ingen rigtige data er.
  - (b) Et Netlify **draft deploy** (ikke produktion) mod de rigtige filer. Det kræver Mos udtrykkelige ja, fordi det skriver til live Dropbox.
- [ ] **Step 3:** Kun efter Mos "godkendt" i chatten:
```bash
git push -u origin redesign/web
node scripts/udgave.mjs && netlify deploy --prod --dir dist
```
Derefter: tjek at `/sw.js` svarer med `CACHE='vagtstatus-v4'`, og bed Mo åbne appen fra hjemmeskærmen og bekræfte bundlinje og push.
