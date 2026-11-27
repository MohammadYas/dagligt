# VagtStatus — komplet web-redesign

Dato: 27. november 2026 · Status: udkast til godkendelse

## Hvorfor

VagtStatus er en privat webapp (PWA), som Mo har lagt på iPhonens hjemmeskærm. Den styrer CAS-bookingscriptet gennem tekstfiler i Dropbox, viser et estimat for næste løn og planlægger ruter. Den virker i dag, men den er tung (1,4 MB JavaScript), har flere fejl og er sværere at bruge end nødvendigt. Redesignet skal gøre den enklere, hurtigere og pænere med rolig, gennemtænkt bevægelse. Alt den kan i dag skal stadig virke, og den skal tale præcis samme "sprog" med Dropbox, som den gør nu.

## Mål

1. **Komplet nyt frontend:** Enklere skærme, færre tryk og hurtigere opstart. Animationerne bygges med Framer Motion (`motion/react`) efter Emil Kowalskis animationsregler og Apples HIG.
2. **Forsiden starter med løn:** Øverst ses næste udbetaling og beløb, med en knap til at oprette en vagt. Under det kommer CAS-status og vagtvalg.
3. **TØRN skjules i appen.** Kortet, kontakten og stednavne-par vises ikke. Backend og filer fortsætter uændret, så TØRN kan tages i brug igen senere.
4. **Kalenderen må aldrig tabe et tryk.** Man kan vælge mange datoer hurtigt efter hinanden, også mens der gemmes.
5. **Disse fejl rettes:**
   - Ruten (adressesøgningen).
   - Bundlinjen, der sidder for højt.
   - Push-beskeder, der ikke kommer frem.
   - En aftenvagt, der forsvinder fra lønnen.
   - Lønhistorik, der er svær at finde.
6. **Ny push-besked "Vagt taget"** ud over den eksisterende "CAS er tavs".

## Ikke-mål

- Ingen ændring af CAS-scriptet eller af formatet på dets filer.
- Ingen native iPhone-app (IPA/TestFlight). Den var usigneret og bruges ikke.
- Ingen nye lønregler. Satser, skat og perioder regnes som i dag. Den eneste ændring er, hvilken periode der vises som "næste løn".
- Ingen lyst tema. Appen er fortsat kun mørk, som Mo har valgt.

## Anti-mål (det er en fiasko, selv om resten virker)

- Én byte anderledes i det, appen skriver til `/kontrol.txt`, `/dage.txt`, `/torn_dage.txt`, `/bureauer.txt` eller `/steder.txt` for de samme valg.
- Tabte løndata, eller at adgangskoden skal tastes igen efter opdateringen.
- At noget gemmes til Dropbox uden at være valideret, eller at konfliktkontrollen forsvinder.
- At noget pushes til GitHub eller deployes til Netlify, før Mo har godkendt den lokale version.

## Den faste kontrakt med Dropbox (røres ikke)

Det eksterne CAS/TØRN-system læser disse filer. Netlify-funktionen `/api/dropbox` tillader kun disse stier, og den logik genbruges uændret.

| Fil | Format | Kode der ejer det |
| --- | --- | --- |
| `/kontrol.txt` | præcis `CAS: ON\|OFF` og `TØRN: ON\|OFF`, én pr. linje, afsluttende linjeskift | `vagtdata.parseKontrol/skrivKontrol` |
| `/dage.txt`, `/torn_dage.txt` | datoer `ÅÅÅÅ-MM-DD`, sorteret og unikke, derefter stednavne, én pr. linje. **Ingen datoer = alle datoer tilladt.** Begge filer får samme indhold. | `vagtdata.parseDage/skrivDage` |
| `/bureauer.txt` | rækkefølge = prioritet, `# Navn` = slået fra, vejledningslinjer bevares ord for ord | `vagtdata.parseBureauer/skrivBureauer` |
| `/steder.txt` | `CAS-navn = TØRN-navn` | `vagtdata.parsePar/skrivPar` |
| `/status_cas.txt`, `/status_torn.txt` | må kun læses; alder måles på Dropbox' `server_modified` (scriptmaskinens ur går forkert), mere end 3 min = tavs | `vagter.parseStatus` |

Regler for navne: ingen linjeskift, `#`, `=` eller kontroltegn, ikke formet som en dato og unikke uden hensyn til store/små bogstaver (`da-DK`).

Regler for gemning (`VagtSession`):
1. Alle kladder valideres, før første fil skrives.
2. Hver fil hentes igen. Er den ændret siden sidste læsning, afbrydes der med besked. Svarer den allerede til kladden, regnes den som gemt.
3. Filerne uploades én ad gangen, og hver fil bekræftes for sig.

Dette bevares.

**Sådan sikres det:** Før der ændres noget, skrives "golden tests". De fodrer den nuværende kode med realistiske eksempelfiler og gemmer det præcise output. Den nye app skal give byte-identisk output. Testene skrives først og ændres ikke under redesignet.

## Lokale data, der skal overleve

Appen bliver på samme domæne, så dens localStorage følger med:

- `dagligapp.adgang`: adgangskoden. Den sættes én gang via `#n=…` i adressen og sendes som `x-adgang`.
- `vagtstatus.lon.v1`: vagter, satser og skat. Det er rå JSON, som `AsyncStorage` på web lægger direkte i `localStorage`. Den nye app læser og skriver samme nøgle med samme format gennem `lon.normalisePayData`.

Service workeren bliver på `/sw.js`, og dens push- og notificationclick-håndtering bevares. Cachenavnet hæves, så den gamle skal ryddes. `manifest.webmanifest` beholder `start_url` og `scope`.

## Tilgange (overvejet)

1. **Ny React-webapp: Vite + React 19 + TypeScript + Framer Motion — VALGT af Mo.** Logikmodulerne genbruges, og kun skærmene skrives om. Bundlen bliver cirka 200 KB i stedet for 1,4 MB, og der er fuld kontrol over safe-area og bundlinje. Prisen er, at native-sporet forsvinder.
2. **Behold Expo / React Native Web og redesign.** Det er et mindre indgreb, men Framer Motion kan ikke bruges ordentligt, bundlen forbliver tung, og bundlinje-problemet hænger sammen med React Native Web.
3. Fravalgt: Framer Motion i udvalgte `.web.tsx`-filer inde i Expo. Det giver to UI-systemer, der kæmper om de samme skærme.

## Sådan bygges det

### Genbrugt uden ændring

`vagtdata.ts`, `vagter.ts` (parseStatus, siden, tilstand), `steder.ts`, `rute.ts` (OSRM + reserve), `datoanker.ts`, `adgang.ts`, `dropbox.web.ts` (bliver til `dropbox.ts`, kun via `/api/dropbox`), samt alle Netlify-funktioner undtagen de to nævnt under "Push" nedenfor.

### Genbrugt med små tilføjelser (hver med test)

- **`lon.ts`:** Ny funktion `naesteLoen(i dag)` = første periode, hvor udbetalingen er i dag eller senere. Eksisterende funktioner røres ikke.
  - Fejlen er påvist: en aftenvagt søndag 18. okt (periode 5.–18. okt, udbetaling 21. okt) forsvinder mandag 19. til og med onsdag 21. okt. Den er hverken i "Næste løn", "Kommende" eller "Historik", fordi skærmen bruger perioden for *i dag* (19. okt–1. nov), og historikken kun viser udbetalinger før i dag.
  - Løsning: "Næste løn" bruger `naesteLoen`, og historikken viser udbetalinger før i dag.
- **`vagtsession.ts`:** Tryk må gerne komme, mens der gemmes.
  - `edit()` afviser ikke længere under gemning.
  - `save()` gemmer øjebliksbilledet fra sin start. Opstår der nye ændringer undervejs, kører den én gang til.
  - Validering, konfliktkontrol og bekræftelse fil for fil er uændret, og eksisterende tests skal stadig bestå.
- **Adressesøgning:** `dawa.ts` erstattes af `adresse.ts` med samme `Forslag`-form. DAWA (`api.dataforsyningen.dk`) svarer nu 403 "RBAC: access denied".
  - Ny kilde: Photon (OpenStreetMap, `photon.komoot.io`), uden nøgle. Søgningen vægtes mod Slagelse-området (Slagelse, Korsør, Skælskør) og filtreres til Danmark.
  - Afprøvet: "Smedegade 32 Slagelse" giver rigtige koordinater.

### Fjernet fra buildet (ligger stadig i git-historikken)

Expo, React Native, Reanimated og de native filer (`targets/widget`, `build-*.sh`, iOS-workflow, `konfig.ts`/SecureStore, den native del af `dropbox.ts`). Det samme gælder de gamle skærme Dag, Fang, Log, Projekter og Indstillinger samt deres komponenter, som ikke er i brug i dag. Testene, der kun gjaldt React Native-skallen, erstattes af tilsvarende tests for den nye skal.

### Skærme

Der er tre faner i bunden: **Hjem · Løn · Rute**.

**Hjem**
- Lønkort øverst: "Næste løn · ons 21. okt", nettobeløb i stort, brutto og antal vagter, samt knappen **Opret vagt**, som åbner et ark nedefra.
- CAS-statuskort: Kører / Ingen nylig kontakt / Kræver opmærksomhed, altid med tekst og ikke kun farve. Kortet kan åbnes og viser så ledige vagter, matcher, dine vagter og råfilen.
- Kontakten "Automatisk booking". Den skriver til `kontrol.txt` og beholder TØRN-værdien uændret.
- Rækkerne "Dage og steder" og "Arbejdspladser".
- Et tandhjul til Indstillinger: varsler og opdatering.

**Dage og steder**
- Kalender i fuld bredde. Man skifter måned ved at swipe eller trykke på pilene, og der er en "I dag"-knap.
- Et tryk slår en dag til eller fra med det samme. Dage før i dag er dæmpet.
- En lille statuspille viser "3 dage valgt · Gemmer… / Gemt ✓". Der gemmes cirka 1,2 sekund efter sidste tryk og med det samme, når skærmen forlades. Trykkene blokeres aldrig.
- Steder er grupperet efter adresse, med søgning og mulighed for at tilføje nye.
- Dage og steder skrives som i dag til både CAS- og TØRN-filen.

**Arbejdspladser:** Som i dag (til/fra, træk eller pile for prioritet, tilføj og slet), med en Gem-linje.

**Løn**
- Næste løn øverst, derefter de kommende perioder.
- Sektionen **Tidligere udbetalinger** vises direkte på siden. Den skjules ikke bag et link.
- Vagter tilføjes og redigeres i et ark. Lønindstillinger ligger under et tandhjul.

**Rute:** Adressesøg, liste med stop (træk for rækkefølge), "Start hvor jeg står", Beregn og Åbn i Google Maps. Logikken er som i dag.

**Skjult:** TØRN-statuskort, TØRN-kontakt, skærmen Stednavne-par.

**Bevares som i dag:**
- Låseskærmen, når der ingen adgangskode er.
- Status hentes igen hvert minut, og når appen kommer i forgrunden. Træk ned for at opdatere.
- Ugemte ændringer gemmes, når appen skjules eller lukkes (`visibilitychange`/`pagehide`), og der advares, før siden forlades.
- Ruten er bevaret, når man skifter fane.

### Byggerens egne valg (markeret, kan rettes)

- Deploy sker som i dag fra den lokale maskine med Netlify CLI, med `dist` bygget lokalt. `netlify.toml`'s build-kommando opdateres til det nye build.
- "Vagt taget" bruger det første tal i "Taget i alt: N" eller "N/M". Der sendes ingen besked første gang, et tal ses (det er bare udgangspunktet).
- Den offentlige VAPID-nøgle i appen genbruges uændret.

### Bevægelse

Framer Motion (`motion/react`), efter disse regler:
- Ark glider op med en fjeder, der føles tung, ikke hoppende.
- Lister animerer, når rækker kommer og går (layout-animation).
- Knapper skalerer let ned (0,97), når man trykker.
- Fanerne skifter med en kort fade/glid på under 250 ms.
- Ingen animation går fra `scale(0)`, og ingen bevægelse er nødvendig for at forstå skærmen.
- `prefers-reduced-motion` slår glid fra og beholder kun fades.

Mo har bedt om disse skills: [emilkowalski/skills](https://github.com/emilkowalski/skills), en Framer Motion-skill (forslag: secondsky/claude-skills `motion`) og de Apple-skills, der allerede er installeret. De hentes ned i projektet, men kun når Mo har sagt ja til download.

### Udseende

Den mørke Apple-stil beholdes, og WCAG-kontrasttabellen i `DESIGN.md` er stadig gyldig: sort baggrund, grupper i `#1C1C1E`, blå handlinger `#64A8FF` og systemskrift. Der kommer færre kort, mere luft og et tydeligt hovedtal pr. skærm. Trykflader er mindst 44 × 44 px.

### Bundlinjen

- Fast i bunden med højde 49 px plus `env(safe-area-inset-bottom)` og ikke mere. Der er ingen ekstra margin oven i safe-area.
- Skallen bruger `height: 100%` på `html/body` med `viewport-fit=cover` i stedet for de nuværende lag af `100dvh` og React Native-padding.
- Det skal kontrolleres på Mos iPhone, fordi browseren alene ikke viser den rigtige safe-area.

### Push

- **Først:** find ud af, hvorfor "CAS er tavs" ikke kommer frem. Tjek Netlify-loggen for `tjek_torn`, at VAPID-nøglerne er sat, og at telefonen har et gyldigt abonnement.
- **Kendt problem:** Hver gang appen åbnes, overskriver `push.mjs` `push_abonnement.txt` og nulstiller `sidstVarslet`. Den rettes, så den beholder de eksisterende felter. Filen er appens egen og læses ikke af CAS.
- **Nyt — "Vagt taget":** `tjek_torn` læser allerede `status_cas.txt`. Den sammenligner tallet i "Taget i alt" med det sidst sete tal, som gemmes i `push_abonnement.txt`. Er tallet steget, sendes "Ny vagt taget", gerne med linjen fra "Dine vagter". Funktionen læser kun CAS-filen og skriver aldrig til den.

### Test og afprøvning

- `npm test` skal bestå: alle eksisterende logiktests og golden tests, samt nye tests for `naesteLoen`, kø i `VagtSession`, adresse-mapping og push-sammenligningen.
- Lokal preview mod syntetiske Dropbox-filer i hukommelsen (som `scripts/preview-test.mjs`), aldrig mod de rigtige filer.
- Tjek ved bredderne 320, 375 og 414 px.
- Bundtstørrelse og `scripts/check-web.mjs` (ingen hemmeligheder i bundlen).

### Levering

1. Det nuværende arbejde, der ikke er committet (46 filer), committes først som udgangspunkt, så der altid kan rulles tilbage.
2. Redesignet laves på en ny gren.
3. Mo afprøver det lokalt, gerne fra telefonen på samme wifi.
4. Først når Mo siger god for det: push til GitHub og deploy til Netlify.

## Overladt til den der bygger

Det præcise visuelle udtryk (afstande, ikoner, fjederværdier), komponentopdelingen og hvordan lokal-previewen ser ud. Alt skal holde sig inden for reglerne ovenfor.
