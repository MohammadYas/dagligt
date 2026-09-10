import { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  RefreshControl, Platform, Alert, AccessibilityInfo, Linking,
} from 'react-native';
import Animated, {
  FadeIn, FadeInDown, SlideInDown, SlideOutDown, LinearTransition,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { hentFil, gemFil, DropboxFejl, harOpsaetning } from '../dropbox';
import {
  Script, FILER, Oensker, Status, parseOensker, serialiserOensker,
  parseStatus, tilstand, siden, medKatalog,
} from '../vagter';
import { alleNavne, SYGEMELDING } from '../steder';
import { dayKey } from '../store';
import Kalender from '../components/Kalender';
import Stedliste from '../components/Stedliste';
import Vaelger from '../components/Vaelger';
import Puls from '../components/Puls';
import RulleTal from '../components/RulleTal';
import Dagbaand from '../components/Dagbaand';

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
    // Scripterne skriver statusfilen hvert minut.
    const id = setInterval(() => hent(false), 60000);
    return () => clearInterval(id);
  }, [hent]);

  function skiftDato(dato: string) {
    setOensker((o) =>
      o
        ? {
            ...o,
            datoer: o.datoer.includes(dato)
              ? o.datoer.filter((d) => d !== dato)
              : [...o.datoer, dato].sort(),
          }
        : o,
    );
    setAendret(true);
  }

  function saetDatoer(datoer: string[]) {
    setOensker((o) => (o ? { ...o, datoer } : o));
    setAendret(true);
  }

  /** Vaelger i dag og de naeste n-1 dage. */
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
      o
        ? { ...o, steder: o.steder.map((x) => (x.navn === navn ? { ...x, aktiv: !x.aktiv } : x)) }
        : o,
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
      const tekst = serialiserOensker(oensker);
      const maal: Script[] = valg === 'begge' ? ['cas', 'torn'] : [valg];
      for (const sc of maal) await gemFil(FILER[sc].oensker, tekst);
      setAendret(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(
        'Gemt',
        maal.length > 1
          ? 'Ønskerne ligger nu i både dage.txt og torn_dage.txt. Scripterne genlæser inden for 5 minutter.'
          : 'Ønskerne ligger nu i ' + FILER[maal[0]].oensker + '. Scriptet genlæser inden for 5 minutter.',
      );
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
        contentContainerStyle={[s.pad, aendret && { paddingBottom: 110 }]}
        refreshControl={
          <RefreshControl refreshing={false} onRefresh={() => hent(true)} tintColor={t.accent} />
        }
      >
        <Text style={[s.h1, { color: t.text }]}>VagtStatus</Text>

        <Vaelger muligheder={MULIGHEDER} valgt={valg} vaelg={setValg} t={t} daempet={daempet} />

        {!harOpsaetning ? (
          <Banner t={t} type="fejl" tekst="Ingen Dropbox-adgang opsat. Udfyld .env i projektet." />
        ) : null}
        {fejl ? <Banner t={t} type="fejl" tekst={fejl} /> : null}

        {henter ? (
          <View style={s.midt}>
            <ActivityIndicator color={t.accent} />
          </View>
        ) : (
          <Animated.View layout={daempet ? undefined : LinearTransition.duration(220)}>
            {scripts.map((sc, i) => (
              <StatusKort
                key={sc}
                t={t}
                navn={FILER[sc].navn}
                status={status[sc]}
                visRaa={visRaa}
                slag={slag}
                daempet={daempet}
                forsinkelse={i * 70}
              />
            ))}

            <Pressable onPress={() => setVisRaa((v) => !v)} style={s.link} hitSlop={8}>
              <Ionicons
                name={visRaa ? 'code-slash' : 'code-slash-outline'}
                size={14}
                color={t.accent}
              />
              <Text style={[s.linkTekst, { color: t.accent }]}>
                {visRaa ? 'Skjul rå statusfil' : 'Vis rå statusfil'}
              </Text>
            </Pressable>

            <View style={[s.kort, { backgroundColor: t.card, borderColor: t.line }]}>
              <Text style={[s.kortTitel, { color: t.text }]}>Dage</Text>
              <Text style={[s.under, { color: t.dim }]}>
                {oensker?.datoer.length
                  ? oensker.datoer.length + ' dage valgt i alt'
                  : 'Ingen dage valgt — så tillades alle datoer'}
              </Text>

              {oensker ? (
                <Dagbaand valgte={oensker.datoer} skift={skiftDato} t={t} daempet={daempet} />
              ) : null}

              <View style={s.genveje}>
                <Genvej t={t} tekst="7 dage frem" tryk={() => vaelgDage(7)} />
                <Genvej t={t} tekst="14 dage frem" tryk={() => vaelgDage(14)} />
                <Genvej t={t} tekst="Ryd" tryk={() => { Haptics.selectionAsync(); saetDatoer([]); }} />
              </View>

              {oensker ? (
                <Kalender valgte={oensker.datoer} skift={skiftDato} t={t} daempet={daempet} />
              ) : null}
            </View>

            <View style={s.stedTop}>
              <Text style={[s.kortTitel, { color: t.text }]}>Steder</Text>
              <Text style={[s.stedTael, { color: t.dim }]}>
                {aktiveSteder} af {oensker?.steder.length ?? 0}
              </Text>
            </View>
            <Text style={[s.under, { color: t.dim, marginBottom: 12 }]}>
              Fravalgte steder bliver husket i filen og kan slås til igen når som helst.
            </Text>

            {oensker ? (
              <Stedliste
                steder={oensker.steder}
                skift={skiftSted}
                saetGruppe={saetGruppe}
                t={t}
                daempet={daempet}
              />
            ) : null}

            {valg === 'begge' ? (
              <Banner
                t={t}
                type="advarsel"
                tekst="Begge: det du gemmer her lander i begge filer."
              />
            ) : null}

            <Sygemelding t={t} daempet={daempet} />

            <Text style={[s.fod, { color: t.faint }]}>
              Scripterne tager kun vagter der starter mellem 15:00 og 23:00, og aldrig to samme dag.
            </Text>
          </Animated.View>
        )}
      </ScrollView>

      {aendret ? (
        <Animated.View
          entering={daempet ? FadeIn.duration(120) : SlideInDown.duration(260).springify().damping(20)}
          exiting={daempet ? undefined : SlideOutDown.duration(160)}
          style={[s.gemBjaelke, { backgroundColor: t.card, borderTopColor: t.line }]}
        >
          <View style={{ flex: 1 }}>
            <Text style={[s.gemTitel, { color: t.text }]}>Ikke gemt endnu</Text>
            <Text style={[s.gemUnder, { color: t.dim }]}>
              {oensker?.datoer.length ?? 0} dage · {aktiveSteder} steder
            </Text>
          </View>
          <Pressable
            onPress={gem}
            disabled={gemmer}
            style={[s.gemKnap, { backgroundColor: t.accent, opacity: gemmer ? 0.6 : 1 }]}
            accessibilityRole="button"
            accessibilityLabel="Gem til Dropbox"
          >
            {gemmer ? (
              <ActivityIndicator color={t.bg} size="small" />
            ) : (
              <Text style={[s.gemKnapTekst, { color: t.bg }]}>Gem</Text>
            )}
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function StatusKort({
  t, navn, status, visRaa, slag, daempet, forsinkelse,
}: {
  t: Theme; navn: string; status?: Status; visRaa: boolean;
  slag: number; daempet: boolean; forsinkelse: number;
}) {
  if (!status) return null;
  const tl = tilstand(status);
  const farve = tl === 'ok' ? t.done : tl === 'advarsel' ? '#BA7517' : '#E24B4A';
  const ord = tl === 'ok' ? 'Kører' : tl === 'advarsel' ? 'Tavs' : 'Stoppet';

  return (
    <Animated.View
      entering={daempet ? undefined : FadeInDown.delay(forsinkelse).duration(280)}
      style={[s.kort, { backgroundColor: t.card, borderColor: t.line }]}
    >
      <View style={s.statusTop}>
        <Puls farve={farve} slag={slag} daempet={daempet} />
        <Text style={[s.kortTitel, { color: t.text, flex: 1 }]}>{navn}</Text>
        <Text style={[s.tilstand, { color: farve }]}>{ord}</Text>
      </View>

      <Text style={[s.under, { color: t.dim }]}>
        Meldte sig {siden(status.sidsteTjek)}
        {status.fejl > 0 ? ' · ' + status.fejl + ' fejl i træk' : ''}
      </Text>

      <View style={[s.talSpor, { borderTopColor: t.line }]}>
        <Tal t={t} navn="Ledige" v={status.ledige ?? '–'} daempet={daempet} />
        <View style={[s.skille, { backgroundColor: t.line }]} />
        <Tal t={t} navn="Matcher" v={status.matcher ?? '–'} fremhaev={Boolean(status.matcher)} daempet={daempet} />
        <View style={[s.skille, { backgroundColor: t.line }]} />
        <Tal t={t} navn="Taget" v={status.taget ?? '–'} daempet={daempet} />
      </View>

      {status.mode ? (
        <View style={[s.mode, { backgroundColor: t.cardAlt }]}>
          <Ionicons name="flask-outline" size={13} color={t.dim} />
          <Text style={[s.modeTekst, { color: t.dim }]} numberOfLines={2}>
            {status.mode}
          </Text>
        </View>
      ) : null}

      {visRaa ? (
        <Animated.Text
          entering={daempet ? undefined : FadeIn.duration(160)}
          style={[s.raa, { color: t.dim, backgroundColor: t.cardAlt }]}
        >
          {status.raa.trim()}
        </Animated.Text>
      ) : null}
    </Animated.View>
  );
}

function Tal({
  t, navn, v, fremhaev, daempet,
}: { t: Theme; navn: string; v: string | number; fremhaev?: boolean; daempet: boolean }) {
  return (
    <View style={s.talBoks}>
      <RulleTal vaerdi={v} daempet={daempet} stil={[s.talVaerdi, { color: fremhaev ? t.accent : t.text }]} />
      <Text style={[s.talNavn, { color: t.faint }]}>{navn}</Text>
    </View>
  );
}

function Genvej({ t, tekst, tryk }: { t: Theme; tekst: string; tryk: () => void }) {
  return (
    <Pressable
      onPress={tryk}
      style={({ pressed }) => [
        s.genvej,
        { borderColor: t.line, backgroundColor: pressed ? t.cardAlt : 'transparent' },
      ]}
    >
      <Text style={[s.genvejTekst, { color: t.text }]}>{tekst}</Text>
    </Pressable>
  );
}

function Sygemelding({ t, daempet }: { t: Theme; daempet: boolean }) {
  const [aaben, setAaben] = useState(false);

  return (
    <View style={[s.syg, { borderColor: t.line }]}>
      <Pressable onPress={() => setAaben((v) => !v)} style={s.sygHoved}>
        <Ionicons name="medkit-outline" size={17} color={t.dim} />
        <Text style={[s.sygTitel, { color: t.text }]}>Sygemelding</Text>
        <Text style={[s.sygTlf, { color: t.accent }]}>{SYGEMELDING.telefon}</Text>
      </Pressable>

      {aaben ? (
        <Animated.View entering={daempet ? undefined : FadeIn.duration(180)}>
          {SYGEMELDING.frister.map((f) => (
            <View key={f.vagt} style={[s.frist, { borderTopColor: t.line }]}>
              <Text style={[s.fristVagt, { color: t.dim }]}>{f.vagt}</Text>
              <Text style={[s.fristTid, { color: t.text }]}>senest {f.senest}</Text>
            </View>
          ))}
          <Pressable
            onPress={() => Linking.openURL('tel:' + SYGEMELDING.telefon.replace(/\s/g, ''))}
            style={[s.ring, { borderTopColor: t.line }]}
          >
            <Ionicons name="call-outline" size={15} color={t.accent} />
            <Text style={[s.ringTekst, { color: t.accent }]}>Ring nu</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Banner({ t, type, tekst }: { t: Theme; type: 'fejl' | 'advarsel'; tekst: string }) {
  const bg = type === 'fejl' ? '#FCEBEB' : '#FAEEDA';
  const fg = type === 'fejl' ? '#A32D2D' : '#854F0B';
  return (
    <Animated.View entering={FadeIn.duration(180)} style={[s.banner, { backgroundColor: bg }]}>
      <Ionicons name={type === 'fejl' ? 'alert-circle' : 'information-circle'} size={17} color={fg} />
      <Text style={[s.bannerTekst, { color: fg }]}>{tekst}</Text>
    </Animated.View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 44 },
  h1: { fontSize: 30, fontWeight: '700', letterSpacing: -0.6, marginBottom: 16 },
  midt: { paddingVertical: 48, alignItems: 'center' },

  kort: { borderRadius: 15, borderWidth: 1, padding: 16, marginBottom: 12 },
  kortTitel: { fontSize: 17, fontWeight: '600', letterSpacing: -0.2 },
  under: { fontSize: 13, marginTop: 3, lineHeight: 18 },

  statusTop: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  tilstand: { fontSize: 13.5, fontWeight: '600' },

  talSpor: { flexDirection: 'row', alignItems: 'center', marginTop: 14, paddingTop: 13, borderTopWidth: 1 },
  talBoks: { flex: 1 },
  talVaerdi: { fontSize: 21, fontWeight: '700', fontVariant: ['tabular-nums'], letterSpacing: -0.4 },
  talNavn: { fontSize: 11, marginTop: 2 },
  skille: { width: 1, height: 26, marginHorizontal: 12 },

  mode: { flexDirection: 'row', gap: 7, alignItems: 'center', marginTop: 12, padding: 9, borderRadius: 9 },
  modeTekst: { fontSize: 12, flex: 1 },

  raa: { fontFamily: MONO, fontSize: 11, lineHeight: 16, marginTop: 12, padding: 11, borderRadius: 9 },

  link: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 4, marginBottom: 14 },
  linkTekst: { fontSize: 13 },

  genveje: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12, marginBottom: 6 },
  genvej: { paddingHorizontal: 13, paddingVertical: 8, borderRadius: 9, borderWidth: 1 },
  genvejTekst: { fontSize: 13, fontWeight: '500' },

  stedTop: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginTop: 8 },
  stedTael: { fontSize: 13, fontVariant: ['tabular-nums'] },

  syg: { borderWidth: 1, borderRadius: 13, marginTop: 14, overflow: 'hidden' },
  sygHoved: { flexDirection: 'row', alignItems: 'center', gap: 9, padding: 14 },
  sygTitel: { fontSize: 15, fontWeight: '600', flex: 1 },
  sygTlf: { fontSize: 14, fontWeight: '600', fontVariant: ['tabular-nums'] },
  frist: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, paddingHorizontal: 14, borderTopWidth: 1 },
  fristVagt: { fontSize: 13 },
  fristTid: { fontSize: 13, fontWeight: '500', fontVariant: ['tabular-nums'] },
  ring: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingVertical: 12, borderTopWidth: 1 },
  ringTekst: { fontSize: 14, fontWeight: '600' },

  fod: { fontSize: 12, lineHeight: 18, marginTop: 18 },

  banner: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, padding: 12, borderRadius: 11, marginBottom: 14 },
  bannerTekst: { fontSize: 13, flex: 1, lineHeight: 18 },

  gemBjaelke: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', gap: 14,
    paddingHorizontal: 20, paddingTop: 14, paddingBottom: 18,
    borderTopWidth: 1,
  },
  gemTitel: { fontSize: 15, fontWeight: '600' },
  gemUnder: { fontSize: 12.5, marginTop: 1, fontVariant: ['tabular-nums'] },
  gemKnap: { minWidth: 92, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  gemKnapTekst: { fontSize: 16, fontWeight: '600' },
});
