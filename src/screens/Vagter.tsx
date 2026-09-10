import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, Platform, AccessibilityInfo, Linking,
} from 'react-native';
import Animated, { FadeIn, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { hentFil, gemFil, DropboxFejl, harOpsaetning } from '../dropbox';
import {
  Script, FILER, Oensker, Status, parseOensker,
  parseStatus, tilstand, siden, medKatalog, serialiserMedSkabelon,
  skiftDato as skiftDatoIOensker, saetDatoer as saetDatoerIOensker,
} from '../vagter';
import { alleNavne, SYGEMELDING } from '../steder';
import { dayKey } from '../store';
import { Type, Tal } from '../type';
import Kalender from '../components/Kalender';
import Stedliste from '../components/Stedliste';
import Vaelger from '../components/Vaelger';
import Puls from '../components/Puls';
import RulleTal from '../components/RulleTal';

type Valg = 'cas' | 'torn' | 'begge';

const MULIGHEDER: { key: Valg; navn: string }[] = [
  { key: 'cas', navn: 'Cas' },
  { key: 'torn', navn: 'Tørn' },
  { key: 'begge', navn: 'Begge' },
];

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

export default function Vagter({ t }: { t: Theme }) {
  const [valg, setValg] = useState<Valg>('cas');
  const [status, setStatus] = useState<Partial<Record<Script, Status>>>({});
  const [oensker, setOensker] = useState<Oensker | null>(null);
  const [henter, setHenter] = useState(true);
  const [gemmer, setGemmer] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [aendret, setAendret] = useState(false);
  const [visRaa, setVisRaa] = useState(false);
  const [gemt, setGemt] = useState(false);
  const [slag, setSlag] = useState(0);
  const [daempet, setDaempet] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setDaempet);
    const lyt = AccessibilityInfo.addEventListener('reduceMotionChanged', setDaempet);
    return () => lyt.remove();
  }, []);

  const scripts: Script[] = valg === 'begge' ? ['cas', 'torn'] : [valg];
  const kilde: Script = valg === 'torn' ? 'torn' : 'cas';

  // Undgaa at et langsomt svar overskriver et nyere.
  const koersel = useRef(0);

  const hent = useCallback(
    async (ogsaaOensker: boolean) => {
      const mit = ++koersel.current;
      setFejl(null);
      try {
        const nye: Partial<Record<Script, Status>> = {};
        for (const sc of scripts) {
          nye[sc] = parseStatus(await hentFil(FILER[sc].status));
        }
        if (mit !== koersel.current) return;
        setStatus(nye);
        setSlag((n) => n + 1);

        if (ogsaaOensker) {
          const raa = await hentFil(FILER[kilde].oensker);
          if (mit !== koersel.current) return;
          setOensker(medKatalog(parseOensker(raa), alleNavne()));
          setAendret(false);
        }
      } catch (e) {
        if (mit !== koersel.current) return;
        setFejl(e instanceof DropboxFejl ? e.besked : 'Kunne ikke nå Dropbox.');
      } finally {
        if (mit === koersel.current) setHenter(false);
      }
    },
    [valg],
  );

  useEffect(() => {
    setHenter(true);
    hent(true);
  }, [valg]);

  useEffect(() => {
    const id = setInterval(() => hent(false), 60000);
    return () => clearInterval(id);
  }, [hent]);

  function skiftDato(dato: string) {
    setOensker((o) => (o ? skiftDatoIOensker(o, dato) : o));
    setAendret(true);
  }

  function saetDatoer(datoer: string[]) {
    setOensker((o) => (o ? saetDatoerIOensker(o, datoer) : o));
    setAendret(true);
  }

  function vaelgDage(antal: number) {
    Haptics.selectionAsync();
    const ud: string[] = [];
    const d = new Date();
    for (let i = 0; i < antal; i++) {
      ud.push(dayKey(d));
      d.setDate(d.getDate() + 1);
    }
    saetDatoer(ud);
  }

  function skiftSted(navn: string) {
    setOensker((o) =>
      o ? { ...o, steder: o.steder.map((x) => (x.navn === navn ? { ...x, aktiv: !x.aktiv } : x)) } : o,
    );
    setAendret(true);
  }

  function saetGruppe(navne: string[], aktiv: boolean) {
    const sat = new Set(navne);
    setOensker((o) =>
      o ? { ...o, steder: o.steder.map((x) => (sat.has(x.navn) ? { ...x, aktiv } : x)) } : o,
    );
    setAendret(true);
  }

  async function gem() {
    if (!oensker) return;
    setGemmer(true);
    setFejl(null);
    try {
      const maal: Script[] = valg === 'begge' ? ['cas', 'torn'] : [valg];
      for (const sc of maal) {
        // Hentes paa ny lige foer skrivning: filen bruges som skabelon, saa
        // dens kommentarer bevares, og scriptets egne rettelser ikke tabes.
        const nuvaerende = await hentFil(FILER[sc].oensker);
        await gemFil(FILER[sc].oensker, serialiserMedSkabelon(nuvaerende, oensker));
      }
      setAendret(false);
      // Kvitteringen hoerer til i bjaelken der lige har gjort arbejdet,
      // ikke i en dialog man skal klikke vaek.
      setGemt(true);
      setTimeout(() => setGemt(false), 2600);
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFejl(e instanceof DropboxFejl ? e.besked : 'Kunne ikke gemme til Dropbox.');
    } finally {
      setGemmer(false);
    }
  }

  const aktiveSteder = oensker?.steder.filter((x) => x.aktiv).length ?? 0;

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.pad, aendret && { paddingBottom: 108 }]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => hent(true)} tintColor={t.accent} />
        }
      >
        <Vaelger muligheder={MULIGHEDER} valgt={valg} vaelg={setValg} t={t} daempet={daempet} />

        <Text style={[s.h1, { color: t.faint }]}>Auto Vagt</Text>

        {!harOpsaetning ? <Fejllinje t={t} tekst="Ingen Dropbox-adgang. Udfyld .env." /> : null}
        {fejl ? <Fejllinje t={t} tekst={fejl} /> : null}

        {henter ? (
          <ActivityIndicator color={t.accent} style={s.spinner} />
        ) : (
          <>
            {scripts.map((sc) => (
              <Statuslinje
                key={sc}
                t={t}
                navn={FILER[sc].navn}
                status={status[sc]}
                slag={slag}
                daempet={daempet}
              />
            ))}

            <Pressable onPress={() => setVisRaa((v) => !v)} hitSlop={10} style={s.raaKnap}>
              <Text style={[s.raaKnapTekst, { color: t.faint }]}>
                {visRaa ? 'Skjul filen' : 'Vis filen'}
              </Text>
            </Pressable>

            {visRaa
              ? scripts.map((sc) =>
                  status[sc] ? (
                    <Animated.Text
                      key={sc}
                      entering={daempet ? undefined : FadeIn.duration(150)}
                      style={[s.raa, { color: t.dim }]}
                    >
                      {status[sc]!.raa.trim()}
                    </Animated.Text>
                  ) : null,
                )
              : null}

            <Overskrift
              t={t}
              tekst="Dage"
              hoejre={
                oensker?.datoer.length ? oensker.datoer.length + ' valgt' : 'alle datoer tillades'
              }
            />

            <View style={s.genveje}>
              <Genvej t={t} tekst="7 frem" tryk={() => vaelgDage(7)} />
              <Genvej t={t} tekst="14 frem" tryk={() => vaelgDage(14)} />
              <Genvej
                t={t}
                tekst="Ryd"
                tryk={() => {
                  Haptics.selectionAsync();
                  saetDatoer([]);
                }}
              />
            </View>

            {oensker ? (
              <Kalender valgte={oensker.datoer} skift={skiftDato} t={t} daempet={daempet} />
            ) : null}

            <Overskrift
              t={t}
              tekst="Steder"
              hoejre={aktiveSteder + ' af ' + (oensker?.steder.length ?? 0)}
            />

            {oensker ? (
              <Stedliste
                steder={oensker.steder}
                skift={skiftSted}
                saetGruppe={saetGruppe}
                t={t}
                daempet={daempet}
              />
            ) : null}

            <Overskrift t={t} tekst="Sygemelding" hoejre={SYGEMELDING.telefon} />

            {SYGEMELDING.frister.map((f) => (
              <View key={f.vagt} style={s.frist}>
                <Text style={[s.fristVagt, { color: t.dim }]}>{f.vagt}</Text>
                <Text style={[s.fristTid, { color: t.text }]}>senest {f.senest}</Text>
              </View>
            ))}

            <Pressable
              onPress={() => Linking.openURL('tel:' + SYGEMELDING.telefon.replace(/\s/g, ''))}
              style={s.ring}
            >
              <Text style={[s.ringTekst, { color: t.accent }]}>Ring {SYGEMELDING.telefon}</Text>
            </Pressable>

            <Text style={[s.fod, { color: t.faint }]}>
              Vagter starter mellem 15 og 23. Aldrig to samme dag.
            </Text>
          </>
        )}
      </ScrollView>

      {aendret || gemt ? (
        <Animated.View
          entering={daempet ? FadeIn.duration(120) : SlideInDown.duration(240).springify().damping(21)}
          exiting={daempet ? undefined : SlideOutDown.duration(150)}
          style={[s.bjaelke, { backgroundColor: t.bg, borderTopColor: t.line }]}
        >
          <Text style={[s.bjaelkeTekst, { color: gemt ? t.done : t.dim }]}>
            {gemt
              ? 'Gemt. Scripterne genlæser inden for 5 minutter.'
              : (oensker?.datoer.length ?? 0) + ' dage · ' + aktiveSteder + ' steder'}
          </Text>
          {gemt ? null : (
          <Pressable
            onPress={gem}
            disabled={gemmer}
            style={[s.gem, { backgroundColor: t.accent, opacity: gemmer ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Gem til Dropbox"
          >
            {gemmer ? (
              <ActivityIndicator color={t.bg} size="small" />
            ) : (
              <Text style={[s.gemTekst, { color: t.bg }]}>Gem</Text>
            )}
          </Pressable>
          )}
        </Animated.View>
      ) : null}
    </View>
  );
}

function Statuslinje({
  t, navn, status, slag, daempet,
}: { t: Theme; navn: string; status?: Status; slag: number; daempet: boolean }) {
  if (!status) return null;
  const tl = tilstand(status);
  const farve = tl === 'ok' ? t.done : tl === 'advarsel' ? t.advarsel : t.fejl;
  const ord = tl === 'ok' ? 'kører' : tl === 'advarsel' ? 'tavs' : 'stoppet';

  return (
    <View style={s.status}>
      <View style={s.statusTop}>
        <Puls farve={farve} slag={slag} daempet={daempet} />
        <Text style={[s.statusNavn, { color: t.text }]}>
          {navn} <Text style={{ color: farve }}>{ord}</Text>
        </Text>
        <Text style={[s.statusTid, { color: t.faint }]}>{siden(status.sidsteTjek)}</Text>
      </View>

      <View style={s.tal}>
        <Maaling t={t} navn="ledige" v={status.ledige ?? '–'} daempet={daempet} />
        <Maaling
          t={t}
          navn="matcher"
          v={status.matcher ?? '–'}
          daempet={daempet}
          fremhaev={Boolean(status.matcher)}
        />
        <Maaling t={t} navn="taget" v={status.taget ?? '–'} daempet={daempet} />
        {status.fejl > 0 ? (
          <Maaling t={t} navn="fejl" v={status.fejl} daempet={daempet} fremhaev />
        ) : null}
      </View>

      {status.dine && status.dine.toLowerCase() !== 'ingen' ? (
        <Text style={[s.dine, { color: t.accent }]}>Dine vagter: {status.dine}</Text>
      ) : null}

      {status.mode ? <Text style={[s.mode, { color: t.faint }]}>{status.mode}</Text> : null}
    </View>
  );
}

function Maaling({
  t, navn, v, daempet, fremhaev,
}: { t: Theme; navn: string; v: string | number; daempet: boolean; fremhaev?: boolean }) {
  return (
    <View style={s.maaling}>
      <RulleTal
        vaerdi={v}
        daempet={daempet}
        stil={[s.maalingTal, { color: fremhaev ? t.accent : t.text }]}
      />
      <Text style={[s.maalingNavn, { color: t.faint }]}>{navn}</Text>
    </View>
  );
}

function Overskrift({ t, tekst, hoejre }: { t: Theme; tekst: string; hoejre?: string }) {
  return (
    <View style={s.overskrift}>
      <Text style={[s.overskriftTekst, { color: t.text }]}>{tekst}</Text>
      {hoejre ? <Text style={[s.overskriftHoejre, { color: t.faint }]}>{hoejre}</Text> : null}
    </View>
  );
}

function Genvej({ t, tekst, tryk }: { t: Theme; tekst: string; tryk: () => void }) {
  return (
    <Pressable
      onPress={tryk}
      style={({ pressed }) => [s.genvej, { borderColor: t.line, opacity: pressed ? 0.5 : 1 }]}
    >
      <Text style={[s.genvejTekst, { color: t.dim }]}>{tekst}</Text>
    </Pressable>
  );
}

function Fejllinje({ t, tekst }: { t: Theme; tekst: string }) {
  return (
    <View style={s.fejl}>
      <Text style={[s.fejlMaerkat, { color: t.fejl }]}>Fejl</Text>
      <Text style={[s.fejlTekst, { color: t.text }]}>{tekst}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 44 },
  h1: { ...Type.caption1, marginBottom: 14, marginTop: 2 },
  spinner: { marginTop: 60 },

  status: { paddingBottom: 20 },
  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  statusNavn: { ...Type.title2, flex: 1 },
  statusTid: { ...Type.caption1 },

  tal: { flexDirection: 'row', marginTop: 12, gap: 30 },
  maaling: {},
  maalingTal: { ...Type.title1, ...Tal },
  maalingNavn: { ...Type.caption2, marginTop: 2 },
  dine: { ...Type.subhead, fontWeight: '600', marginTop: 12 },
  mode: { ...Type.caption1, marginTop: 12 },

  raaKnap: { paddingVertical: 6, marginBottom: 10 },
  raaKnapTekst: { ...Type.footnote },
  raa: { fontFamily: MONO, fontSize: 11, lineHeight: 16, marginBottom: 14 },

  overskrift: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 26, marginBottom: 12,
  },
  overskriftTekst: { ...Type.title3 },
  overskriftHoejre: { ...Type.footnote, ...Tal },

  genveje: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  genvej: { paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  genvejTekst: { ...Type.footnote },

  frist: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7 },
  fristVagt: { ...Type.subhead },
  fristTid: { ...Type.subhead, ...Tal },
  ring: { paddingVertical: 12 },
  ringTekst: { ...Type.callout, fontWeight: '600' },

  fod: { ...Type.caption1, marginTop: 22 },

  fejl: { flexDirection: 'row', gap: 9, marginBottom: 16, alignItems: 'baseline' },
  fejlMaerkat: { ...Type.footnote, fontWeight: '700' },
  fejlTekst: { ...Type.footnote, flex: 1 },

  bjaelke: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, borderTopWidth: 1,
  },
  bjaelkeTekst: { ...Type.footnote, ...Tal },
  gem: { minWidth: 96, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  gemTekst: { ...Type.callout, fontWeight: '600' },
});
