# VagtStatus Apple Dark redesign

**Dato:** 2026-09-21  
**Status:** Godkendt design, klar til implementeringsplan

## Formaal

Appen skal vaere en fokuseret, privat arbejdsapp til CAS, TOERN og arbejdsruter. Den nuvaerende brede daglig-app reduceres til to hovedomraader, `Vagter` og `Rute`, og hele brugerfladen redesignes som en responsiv, moerk iPhone-first webapp med Apples Human Interface Guidelines som designgrundlag.

Dropbox-filer er kun et skjult datalag. Brugeren maa aldrig se eller redigere en hel tekstfil. Alle redigerbare data vises som strukturerede kontakter, lister, datoer og tekstfelter.

## Designets tese

Appen skal foeles som et roligt kontrolpanel, man kan stole paa under en arbejdsdag: status kan aflæses paa faa sekunder, og alle aendringer er tydelige, reversible indtil Gem og nemme at naa med en tommelfinger.

Design read: privat arbejdsapp til én iPhone-bruger, med moerk iOS-systemflade og diskret egen identitet. Dials: `ENERGY 1 / RHYTHM 2 / MOTION 1`.

## Omfang

### Beholdes

- CAS- og TOERN-status.
- Dato- og stedvalg for begge systemer.
- TOERN-varsling.
- Sygemeldingsoplysninger.
- Ruteplanlaegning med nuvaerende funktionalitet.
- Eksisterende adgangslaas og Dropbox-mellemled.
- PWA-funktionalitet til Safari og hjemmeskaerm paa iPhone.

### Fjernes fra navigationen

- Dag.
- Fang.
- Projekter.
- Indstillinger som selvstaendig fane.

De eksisterende lokale data bag Dag og Fang slettes ikke. Filerne kan blive i kodebasen, men de maa ikke kunne aabnes fra den nye app-navigation.

### Ny navigation

Bundnavigationen har kun to topniveau-faner:

1. `Vagter`
2. `Rute`

Vagter er startfanen. Fanebjaelken gaar visuelt helt til skaermens bund og udfylder omraadet bag iPhones home-indikator. Ikoner og labels placeres over safe-area inset. Indholdet faar tilstraekkelig bundafstand og maa ikke blive skjult af fanebjaelken eller en aktiv gemmebjaelke.

## Visuelt system

### Farver

Appen bruger en fast moerk appearance efter brugerens udtrykkelige oenske. Farver navngives semantisk og bruges gennem faelles tokens:

- `background`: naesten sort hovedflade.
- `groupedBackground`: diskret lysere grupperet indhold.
- `elevatedBackground`: aktive og midlertidige kontrollag.
- `label`, `secondaryLabel`, `tertiaryLabel`: tydeligt teksthierarki.
- `separator`: diskrete skillelinjer.
- `accent`: iOS-lignende blaa til handlinger, valg og fokus.
- `success`, `warning`, `danger`: kun til faktiske tilstande.

Farve maa aldrig vaere eneste statusmarkoer. Status kombinerer farve med ikon, tekst og tilgaengelighedslabel.

### Typografi

- Platformens systemfont bruges, saa Safari paa iPhone benytter systemets typografiske karakter.
- Eksisterende iOS-tekststile viderefoeres som semantiske tokens.
- Brødtekst har 17 pt som udgangspunkt.
- Store titler, overskrifter, labels og maalinger har tydelig, konsekvent rangorden.
- Ingen dekorativ monospace i brugerfladen. Raastatus kan bruge monospace internt, men den vises ikke som en redigerbar fil.
- Layoutet skal kunne ombrydes ved stoerre tekst uden overlap eller skjulte handlinger.

### Former og dybde

- Grupperede lister er den primære struktur.
- Radius varierer efter funktion og bruges ikke som pynt paa alle elementer.
- Skygger bruges kun, hvor et fast eller flydende kontrollag skal adskilles fra indholdet.
- Ingen gradients, glows, glas-effekter eller dekorative baggrundsmoenstre.

### Motion og feedback

- Motion bruges kun til navigation, indsaettelse/fjernelse af rækker og gemmestatus.
- Overgange er korte og respekterer Reduce Motion.
- Valg kan give let haptisk feedback, naar platformen understøtter det.
- Fejl og gemmestatus vises i kontekst, ikke som rutinemaessige alarmer.

## Vagter

### Vagter-forside

Forsiden prioriterer aflæsning og kontrol i denne rækkefølge:

1. Stor titel `Vagter` og seneste samlede opdatering.
2. To statusgrupper, CAS og TOERN.
3. Hovedkontakter for hvert system.
4. TOERN-varsel tæt ved TOERN-status.
5. Navigation til Dage og steder, Arbejdspladser og Stednavne-par.
6. Sygemeldingsoplysninger og telefonhandling.

Hver statusgruppe viser kun fortolkede oplysninger fra statusfilen, for eksempel kører/stoppet, seneste kontakt, ledige vagter, match og egne vagter. Status opdateres ved åbning, pull-to-refresh og automatisk hvert 60. sekund.

### Hovedkontakter

`CAS tændt` og `TOERN tændt` er store, selvstaendige kontakter. Hjælpeteksten forklarer, at OFF betyder, at systemet scanner, men ikke tager vagter.

Aendringer er kladder, indtil brugeren trykker `Gem ændringer`.

`/kontrol.txt` serialiseres deterministisk som:

```text
CAS: ON
TOERN: OFF
```

Systemerne kan skiftes uafhaengigt.

### Dage og steder

Visningen har et `Cas` / `Tørn`-segment. Segmentet bestemmer, om kladden vedrører `/dage.txt` eller `/torn_dage.txt`.

Datoer:

- Valgte datoer vises sorterede i en kort liste.
- `Tilføj dato` åbner en brugervenlig datovælger.
- En dato kan fjernes via en synlig slettehandling.
- Dubletter afvises.
- Tom datoliste betyder, at alle datoer tillades, og det forklares i UI'et.

Steder:

- Kendte steder kombineres fra filen og det faste katalog.
- Steder grupperes efter deres kendte arbejdsadresse, saa listen kan scannes.
- Hvert sted har en mindst 44 pt høj valgkontrol med tekstlig valgt/ikke valgt-tilstand.
- Brugeren kan søge i listen.
- Et nyt sted tilføjes i et navngivet tekstfelt med en konkret `Tilføj sted`-handling.
- Et nyt sted kan ikke vaere tomt eller en dublet efter trimning og dansk case-insensitiv sammenligning.

Ved Gem skrives en frisk fil med aktive datoer først og aktive steder bagefter. Der skrives ingen fravalgte `#`-linjer i de to ønskefiler.

### Arbejdspladser

`/bureauer.txt` vises som en prioriteret liste:

- Hver arbejdsplads har en on/off-kontakt.
- Rækkefølgen forklares som prioritet.
- Brugeren kan traekke via et tydeligt håndtag.
- Den samme funktion kan udføres med `Flyt op` og `Flyt ned`, saa gestus ikke er eneste mulighed.
- En ny arbejdsplads kan tilføjes med et navngivet tekstfelt.
- Sletning er en tydelig rækkehandling og kan annulleres før Gem.

Ved Gem skrives aktive navne som almindelige linjer og deaktiverede navne med `# ` foran, i den viste rækkefølge.

### Stednavne-par

`/steder.txt` vises som en liste af strukturerede par:

- `Navn i CAS`
- `Navn i TOERN`

Hver række kan redigeres og slettes. `Tilføj par` indsætter en tom række og fokuserer det første felt. Gem er kun mulig, naar alle synlige par har begge sider udfyldt. Filen serialiseres som `A = B`, én linje per par.

## Gem og Annuller

Alle redigerbare Vagter-visninger bruger samme kladdemodel:

- Data hentes til en `saved`-tilstand.
- Brugerinput ændrer en separat `draft`-tilstand.
- Hvis `draft` afviger fra `saved`, vises en fast handlingsbjaelke lige over fanebjaelken.
- `Annuller` kopierer `saved` tilbage til `draft`.
- `Gem ændringer` validerer og skriver kun den eller de berørte filer.
- Under skrivning viser knappen fremdrift og kan ikke udløses dobbelt.
- Efter succes bliver svaret hentet eller den gemte kladde forfremmes til `saved`, og bjaelken viser `Gemt ✓` kortvarigt.
- Ved fejl beholdes kladden. Fejlen forklarer, hvad der skete, og tilbyder `Prøv igen`.
- Navigation væk fra en visning med kladde skal bevare kladden i den aktuelle session. En synlig indikator viser, at der er ugemte ændringer.

Statusfiler er altid read-only og udløser aldrig gemmebjaelken.

## Dropbox-dataflow

Browseren kommunikerer kun med Netlify-funktionen `/api/dropbox`. Dropbox-hemmeligheder bliver paa serveren.

Tilladte filer udvides med `/kontrol.txt`. Netlify-mellemleddet bruger:

- `files/download` til læsning.
- `files/upload` med `mode: overwrite` til skrivning.

Ved et Dropbox-svar med 401 skal serverens cached adgangstoken ryddes, refresh-token-flowet køres, og præcis ét nyt forsøg udføres. Andre fejl oversættes til korte danske beskeder. Et netvaerksproblem maa ikke fjerne brugerens kladde.

Parser og serializer holdes som rene funktioner uden UI-afhaengigheder for:

- kontroltilstand.
- arbejdspladser og prioritet.
- datoer og steder.
- stednavne-par.
- statusfortolkning.

## Rute

Rute beholder sin eksisterende funktionalitet og tjenester. Redesignets fokus er:

- Stor, tydelig titel og fokuseret adressefelt.
- Søgeforslag i en tilgaengelig, grupperet liste.
- Tydelig startposition og stoprækkefølge.
- Store fjern- og flyttehandlinger.
- Samlet tids- og afstandsresultat uden generiske statistik-kort.
- Fast, tommelfingervenlig handling til at beregne eller åbne ruten.
- Klare tomme, søgende, beregnende og fejltilstande.

## Responsivitet

Mobil er den primære platform. Layoutet verificeres ved 320, 375, 414 og 768 CSS-pixels.

- Ingen vandret scrolling.
- Lange danske labels må ombrydes uden at skubbe kontroller ud af skaermen.
- Rækker, statusgrupper og handlingsbjaelker skifter fra vandret til stablet layout, naar tekst eller bredde kræver det.
- Trykflader er mindst 44 x 44 pt.
- Tastaturet maa ikke skjule det aktive felt eller Gem/Annuller.
- Bredere browsere bruger en centreret indholdskolonne med en passende maksimumsbredde.
- Fanebjaelken og gemmebjaelken respekterer `safe-area-inset-bottom`.
- Layoutet fungerer i Safari både i browseren og installeret som PWA.

## Tilgaengelighed

- Alle ikoner har en tekstlig label.
- Status kommunikeres med tekst og form, ikke kun farve.
- Fokus er synligt ved tastaturnavigation.
- Kontakter eksponerer rolle, label, hjælpetekst og aktuel tilstand.
- Dynamiske gemme- og fejlbeskeder annonceres som live-status.
- Traek til omrokering har knapbaseret alternativ.
- Reduce Motion respekteres.
- Tekstzoom og stoerre systemtekst testes uden overlap.
- Kontrast skal vaere mindst 4.5:1 for normal tekst og 3:1 for stor eller fed tekst og relevante UI-graenser.

## Teknisk retning

- Projektet forbliver Expo/React Native Web og PWA, fordi brugerens maalenhed er iPhone-browseren.
- Implementationen følger den versionslaaste Expo 57-dokumentation. SDK-opgradering fra 56 til 57 behandles som et eksplicit første implementeringstrin og verificeres isoleret, før UI-koden ændres.
- Der indføres et samlet design-tokenlag og genbrugelige iOS-lignende komponenter for skærmtitel, grupperet sektion, række, kontakt, status, tekstfelt og fast handlingsbjaelke.
- Navigationsstate holdes let og lokal, fordi appen kun har to topniveau-faner og få detaljevisninger.
- Eksisterende forretningslogik genbruges, hvor adfaerden stadig matcher specifikationen.

## Teststrategi

Implementationen følger red, green, refactor.

### Rene logiktests

- Parse og serialisering af `/kontrol.txt`.
- Parse, aktivering, deaktiviering og rækkefølge for `/bureauer.txt`.
- Frisk serialisering af datoer og aktive steder for begge ønskefiler.
- Parse, validering og serialisering af stednavne-par.
- Dublet- og tomfeltvalidering.
- Kladdemodellens ændret-, annuller- og gemt-tilstand.
- 401 giver tokenfornyelse og præcis ét nyt Dropbox-forsøg.

### Integrations- og buildkontrol

- TypeScript typecheck.
- Eksisterende tests uden regressioner.
- Expo dependency check efter SDK-opgradering.
- Expo web-export og PWA-efterbehandling.
- Ingen hemmeligheder i den eksporterede browserbundle.

### Visuel og funktionel kontrol

- 320, 375, 414 og 768 px.
- Vagter-forside, alle tre detaljevisninger og Rute.
- Tom, loading, normal, ændret, gemmer, gemt og fejl.
- Fanebjaelke ved skaermkant og gemmebjaelke lige over.
- Tastatur, tekstzoom, reduceret bevægelse og mørk kontrast.
- Klikgennemgang af alle synlige kontroller uden døde handlinger.

## Ikke en del af denne levering

- SwiftUI-omskrivning.
- TestFlight- eller IPA-levering, fordi den godkendte maelplatform er webbrowser/PWA paa iPhone.
- Nye backend-systemer ud over det eksisterende Dropbox-mellemled.
- Sletning af gamle Dag-, Fang- eller Projekt-data.
