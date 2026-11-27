# VagtStatus — Apple Dark

Privat iPhone-first arbejdsapp: aflæs CAS/TØRN, vælg vagter, planlæg ruten.
Vite + React 19 + Motion (`motion/react`), leveret som PWA. Ingen Expo/React Native og ingen SwiftUI-omskrivning. Netlify-funktionerne og Dropbox-filkontrakten er uændrede.

## Designkontrakt

- Hjem, Løn og Rute er de tre topniveauer i bundnavigationen. Hjem viser lønkort med "Opret vagt", CAS-status med booking-kontakt og genveje til Dage og steder, Arbejdspladser og Indstillinger (varsler, udgave, lås). Lønindstillinger og tidligere udbetalinger hører under Løn. TØRN er skjult i UI, men datoer/steder skrives stadig til begge filer, og `TØRN:`-linjen bevares.
- Sort kant-til-kant baggrund, neutrale hævede grupper, systemskrift og blå handlinger.
- 34 px hovedtitler, 17 px brødtekst/kontroller, 13–15 px hjælpetekst, 12 px fanelabels.
- Maksimal indholdsbredde 720 px, 20 px sidemargen. Statuskort ved siden af hinanden fra 620 px; ellers stablede.
- Mindst 44 × 44 px trykflader. Kontakternes hele række er aktiv, ikke kun den tegnede switch.
- Datoer vælges i en inline kalender med store dagknapper, månedspile og swipe; valgte dage markeres blå. Hvert tryk gemmes automatisk (1,2 s efter sidste tryk) uden at låse kalenderen.
- Gem/Annuller står fast over fanerne ved ændringer. Indhold scroller i den resterende plads.
- Bundnavigationen er fast forankret ved skærmens nederste safe area; ingen fane må flytte den, når indholdet scroller eller udvides.
- Løn viser én tydelig næste-udbetalingsflade og en primær handling til at tilføje en vagt. Satser, skat og historik er sekundære grupper, ikke ekstra dashboard-kort.
- Lange statuslinjer må altid brydes i panelet; CAS/TØRN-kort starter kompakt, kan åbnes efter behov og viser råstatus i et afgrænset scrollfelt.
- Fejl og status har tekst, ikke kun farve. Intet dekorativt glas. Animation følger Emil Kowalski-reglerne: korte ease-out-kurver, tryk skalerer til 0,97, udgange hurtigere end indgange, ingen animation på faner; ved reduced motion bruges fades.
- Browserzoom er låst for stabil dagvælger på iPhone; systemets tekstskalering, synlig tastaturfokus og reduced-motion CSS bevares. Appskallen bruger `100dvh` direkte, så bundnavigationen står korrekt fra første frame uden at vente på et viewport-resize.

Apple-design-skillen har styret gruppering, hierarki, tilgængelighed og adskillelse af navigation/handlinger:

- `tab-bars.md › Best practices`: “Use a tab bar to support navigation, not to provide actions.”
- `accessibility.md › Mobility`: “Offer alternatives to gestures.” Derfor både træk og flyttepile.
- `layout.md › Guides and safe areas`: “Respect key display and system features in each platform.”
- `dark-mode.md › Dark Mode colors`: kontrast kontrolleret fra faktiske tokens.

Fast dark-only er brugerens udtrykkelige valg; det afviger fra Apples normale anbefaling om begge fremtoninger. Dette er Apple-inspireret webdesign, ikke native Liquid Glass eller en fuld HIG-certificering.

### Beregnet WCAG-kontrast på gruppefladen #1C1C1E

| Rolle | Farve | Kontrast |
| --- | --- | --- |
| Primær tekst | #F5F5F7 | 15,63:1 |
| Sekundær tekst | #C5C5CC | 9,91:1 |
| Hjælpetekst | #A1A1AA | 6,64:1 |
| Handling | #64A8FF | 6,96:1 |
| Kører | #5DDB83 | 9,66:1 |
| Advarsel | #FFD06A | 11,73:1 |
| Fejl | #FF827B | 7,07:1 |

## Data og gemning

`src/vagtdata.ts` læser/skriver de fem redigerbare indstillingsfiler. `TØRN` bevares præcist i kontrolfilen. Statusfiler kan ikke uploades gennem proxyen.

`src/lon.ts` gemmer kun løndata lokalt i `localStorage` (`vagtstatus.lon.v1`, samme nøgle og JSON-format som den gamle app på web, så eksisterende vagter følger med på samme domæne): vagter, personlige satser, hovedkort, fradrag, trækprocent og AM-bidrag. Trækprocenten er 39 % for både Multicare og Akut Hjælp; fradraget anvendes kun på hovedkortet. Den bruger en sammenhængende ISO-ugerytme til 14-dages perioder, onsdag som udbetaling og opdeler en vagt ved 07:00, 15:00, 23:00, midnat og weekendgrænsen. En vagt gemmer sin satsversion, så en senere satsændring ikke ændrer historikken.

`VagtSession` bevarer kladder på tværs af navigation, validerer alle ændringer før upload og bekræfter hver fil separat. Mislykkede filer kan prøves igen uden at gentage bekræftede uploads. Et forsinket refresh kan ikke erstatte en nyere gemning. Et mistet uploadsvar genkendes ved næste læsning, hvis serverindholdet allerede svarer til kladden.

Konfliktkontrol før overwrite er best effort, ikke en atomisk flerfilstransaktion. En anden skribent kan stadig ændre en fil mellem download og upload. UI'et er bevidst rettet mod én bruger.

Varsler er en særskilt telefonfunktion for CAS alene. Eksisterende push-abonnementer bekræftes hos serveren før status vises som slået til. Dage og steder vises som én fælles kladde og gemmes til både `/dage.txt` og `/torn_dage.txt`.

## Verifikation (27. november 2026, web-omskrivning)

- 80 automatiske tests består (`npm test`), inkl. kalenderceller, gamle løndata læst uændret, lønperioder (søndagsaftenvagt 18. okt i udbetaling 21. okt) og alle eksisterende Dropbox-kontrakttests.
- `npm run typecheck` (ét TypeScript-projekt) og `node scripts/udgave.mjs && node scripts/check-web.mjs` grønne. Bundle ca. 411 kB JS (134 kB gzip) + 13 kB CSS.
- Kontraktfilerne (`src/vagtdata.ts`, `src/vagter.ts`, `src/steder.ts`, `netlify/functions/dropbox.mjs`, `_dropbox.mjs`, `_adgang.mjs`, `deepseek.mjs`) er uændrede i forhold til udgangspunktet.
- Browsertest mod lokale syntetiske Dropbox-filer: booking-kontakt skriver præcis `CAS: OFF
TØRN: ON
`; fem hurtige datotryk havner i både `/dage.txt` og `/torn_dage.txt` med én skrivning pr. fil; ændringer under en igangværende gemning bevares; `/bureauer.txt` bevarer forklaringslinjer og afsluttende linjeskift; netværksfejl + Prøv igen; rute Rådhuspladsen 1 → Vesterbrogade 3.
- 320/375/414 px: ingen vandret overflow; fanebaren står nederst.

### Ikke verificeret / levering

- Ingen fysisk iPhone-test endnu: bundbar i standalone, Safari-tastatur, VoiceOver og rigtige pushbeskeder kræver enhedskontrol.
- Løndata ligger i browserens lager pr. domæne; skiftes domæne, følger de ikke med.
- Den urelaterede `faktura-pilot.pdf` er ikke slettet.

## Gentag lokalt

Kør `npm test`, `npm run typecheck` og `npm run build` (= `node scripts/udgave.mjs`). Derefter `node scripts/check-web.mjs`.

`node scripts/preview-test.mjs` starter en isoleret preview af `dist/` på `http://127.0.0.1:8091/#n=local-preview`. `npm run dev` starter Vite på 5173 og sender `/api` til den preview. Prøvedata ligger kun i hukommelsen og må ikke forveksles med appens live Dropbox-data.
