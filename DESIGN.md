# VagtStatus — Apple Dark

Privat iPhone-first arbejdsapp: aflæs CAS/TØRN, vælg vagter, planlæg ruten.
Expo 57 / React Native Web, leveret som PWA. Ingen SwiftUI-omskrivning.

## Designkontrakt

- Vagter, Løn og Rute er de tre topniveauer i bundnavigationen. Indstillinger for vagter hører under Vagter, og lønindstillinger hører under Løn.
- Sort kant-til-kant baggrund, neutrale hævede grupper, systemskrift og blå handlinger.
- 34 px hovedtitler, 17 px brødtekst/kontroller, 13–15 px hjælpetekst, 12 px fanelabels.
- Maksimal indholdsbredde 720 px, 20 px sidemargen. Statuskort ved siden af hinanden fra 620 px; ellers stablede.
- Mindst 44 × 44 px trykflader. Kontakternes hele række er aktiv, ikke kun den tegnede switch.
- Datoer vælges udelukkende i en inline kalender med store dagknapper og månedspile; valgte dage markeres blå og vises ikke som en separat datoliste.
- Gem/Annuller står fast over fanerne ved ændringer. Indhold scroller i den resterende plads.
- Bundnavigationen er fast forankret ved skærmens nederste safe area; ingen fane må flytte den, når indholdet scroller eller udvides.
- Løn viser én tydelig næste-udbetalingsflade og en primær handling til at tilføje en vagt. Satser, skat og historik er sekundære grupper, ikke ekstra dashboard-kort.
- Lange statuslinjer må altid brydes i panelet; CAS/TØRN-kort starter kompakt, kan åbnes efter behov og viser råstatus i et afgrænset scrollfelt.
- Fejl og status har tekst, ikke kun farve. Intet dekorativt glas, ingen obligatorisk animation.
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

`src/lon.ts` gemmer kun løndata lokalt i `AsyncStorage` (`vagtstatus.lon.v1`): vagter, personlige satser, hovedkort, fradrag, trækprocent og AM-bidrag. Trækprocenten er 39 % for både Multicare og Akut Hjælp; fradraget anvendes kun på hovedkortet. Den bruger en sammenhængende ISO-ugerytme til 14-dages perioder, onsdag som udbetaling og opdeler en vagt ved 07:00, 15:00, 23:00, midnat og weekendgrænsen. En vagt gemmer sin satsversion, så en senere satsændring ikke ændrer historikken.

`VagtSession` bevarer kladder på tværs af navigation, validerer alle ændringer før upload og bekræfter hver fil separat. Mislykkede filer kan prøves igen uden at gentage bekræftede uploads. Et forsinket refresh kan ikke erstatte en nyere gemning. Et mistet uploadsvar genkendes ved næste læsning, hvis serverindholdet allerede svarer til kladden.

Konfliktkontrol før overwrite er best effort, ikke en atomisk flerfilstransaktion. En anden skribent kan stadig ændre en fil mellem download og upload. UI'et er bevidst rettet mod én bruger.

Varsler er en særskilt telefonfunktion for CAS alene. Eksisterende push-abonnementer bekræftes hos serveren før status vises som slået til. Dage og steder vises som én fælles kladde og gemmes til både `/dage.txt` og `/torn_dage.txt`.

## Verifikation (22. september 2026)

- 35 automatiske isolerede tests består: codecs, kladder/Annuller, fælles CAS/TØRN-dage og steder, konflikter, delvise fejl, mistet uploadsvar, sen refresh, stedkatalog, 401 retry, read-only statusbeskyttelse, rutefallback og lønperioder/satser/skat inkl. 39 % for begge arbejdsgivere, migrering af den oprindelige tomme sats og dynamisk mobilhøjde for fast bundnavigation.
- Faktiske `/bureauer.txt` og `/kontrol.txt` læst via eksisterende Dropbox-adgang. Bureaufilens forklaringslinjer adskilles nu fra slukkede bureauer og bevares ved gemning. Akut Hjælp og det fulde MultiCare-navn bliver hver sin kontakt. Bekræftet i lokal browserkopi: ingen upload før Gem, Annuller gendanner tilstanden, og Gem deaktiverer kun det valgte bureau. Live-filerne er ikke ændret.
- TypeScript, Expo dependency check og produktions-webeksport.
- `node scripts/check-web.mjs`: ingen kendte private .env-værdier i eksporten; ét fixed-scale viewport-tag med safe-area.
- Browsertest med lokale syntetiske Dropbox-filer: kontakter, Annuller, netværksfejl + Prøv igen, fælles datoer/steder til begge systemer, prioritetspile, navnepar og kladder ved faneskift.
- 320/375/414/768 px: ingen vandret dokument-overflow eller afskårne kontroller i målte navnepar- og rutevisninger. Visuelt kontrolleret ønsker, arbejdspladser, kontakter og gemmelinje ved kompakt bredde.
- Forsidens interaktive kontroller målt til mindst 44 × 44 px ved alle fire bredder. Kontakter aktiveres med mellemrumstasten. Ved 375 × 400 px forbliver tekstfelt, Gem/Annuller og faner tilgængelige; dette simulerer kun kort højde, ikke et rigtigt Safari-tastatur.
- Offentlige prøveadresser slået op og rute beregnet: Rådhuspladsen 1 til Vesterbrogade 3, København. Ruten bevaret efter faneskift. Ingen personlige adresser eller enhedsplacering anvendt.
- Separat read-only kodegennemgang: fund rettet og gentestet.

### Ikke verificeret / levering

- TØRN er sat til `OFF` i den aktuelle `/kontrol.txt` efter brugerens ønske. Den opdaterede PWA er deployet til Netlify-produktion.
- Ingen fysisk iPhone-test: Safari-tastatur, home-indikator, VoiceOver og rigtige pushbeskeder kræver enhedskontrol. Browsermålinger er ikke en erstatning for dette.
- Ingen signeret IPA/TestFlight-build. Det native projekt mangler Apple Team ID/signering, og native plugins kræver separat kompatibilitetskontrol.
- `npm audit fix` anvendte en kompatibel opdatering. Der resterer 14 advisories (13 moderate, 1 high) i den transitive Expo/Xcode/Plist-værktøjskæde. Ingen tvungne major-opgraderinger udført.
- Eksisterende Dag/Fang-data og den urelaterede `faktura-pilot.pdf` er ikke slettet.

## Gentag lokalt

Kør `npm test`, `npm run typecheck`, og med `EXPO_NO_DOTENV=1` kør `npm run build:web`. Derefter `node scripts/check-web.mjs`.

`node scripts/preview-test.mjs` starter en isoleret preview på `http://127.0.0.1:8091/#n=local-preview`. Prøvedata ligger kun i hukommelsen. Previewen må ikke forveksles med appens live Dropbox-data.
