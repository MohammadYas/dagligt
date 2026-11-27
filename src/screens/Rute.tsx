import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Linking, AccessibilityInfo,
} from 'react-native';
import Animated, {
  FadeIn, LinearTransition, useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import Ionicons from '@expo/vector-icons/Ionicons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { Type, Tal } from '../type';
import { snappy, smooth } from '../motion';
import { soeg, Forslag } from '../dawa';
import { Stop, Rute as RuteType, planlaeg, kortLinks, tid, afstand } from '../rute';
import { uid } from '../store';
import { hentPlacering, forklar, Tilstand } from '../placering';
import { Action, IconButton, Title, layout, Notice } from '../components/ArbejdeUI';

export default function Rute({ t }: { t: Theme }) {
  const [q, setQ] = useState('');
  const [forslag, setForslag] = useState<Forslag[]>([]);
  const [soeger, setSoeger] = useState(false);
  const [stop, setStop] = useState<Stop[]>([]);
  const [rute, setRute] = useState<RuteType | null>(null);
  const [planlaegger, setPlanlaegger] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [daempet, setDaempet] = useState(false);
  const [start, setStart] = useState<Tilstand>('ukendt');
  const [startPunkt, setStartPunkt] = useState<Stop | null>(null);
  const [bekraeftRyd, setBekraeftRyd] = useState(false);
  const [soegeFejl, setSoegeFejl] = useState('');
  const revision = useRef(0);

  const afbryd = useRef<AbortController | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setDaempet);
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setDaempet);
    return () => subscription.remove();
  }, []);

  async function brugPlacering() {
    revision.current++;
    setStart('henter');
    const svar = await hentPlacering();
    revision.current++;
    setStart(svar.tilstand);
    setStartPunkt(
      svar.punkt
        ? { id: 'mig', tekst: 'Min placering', lon: svar.punkt.lon, lat: svar.punkt.lat }
        : null,
    );
    setRute(null);
  }

  useEffect(() => {
    afbryd.current?.abort();
    let current = true;
    setSoeger(false);
    setSoegeFejl('');
    if (q.trim().length < 3) {
      setForslag([]);
      return;
    }
    const id = setTimeout(async () => {
      afbryd.current?.abort();
      const ctrl = new AbortController();
      afbryd.current = ctrl;
      setSoeger(true);
      try {
        const found = await soeg(q, ctrl.signal);
        if (current) { setForslag(found); if (!found.length) setSoegeFejl('Ingen adresser fundet. Prøv vejnavn, husnummer og by.'); }
      } catch {
        if (current && !ctrl.signal.aborted) setSoegeFejl('Kunne ikke søge efter adresser. Tjek forbindelsen, og prøv igen.');
      } finally {
        if (current) setSoeger(false);
      }
    }, 220);
    return () => { current = false; clearTimeout(id); afbryd.current?.abort(); };
  }, [q]);

  function tilfoej(f: Forslag) {
    revision.current++;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStop((s) => [...s, { id: uid(), tekst: f.tekst, lon: f.lon, lat: f.lat }]);
    setQ('');
    setForslag([]);
    setRute(null);
  }

  function fjern(id: string) {
    revision.current++;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStop((s) => s.filter((x) => x.id !== id));
    setRute(null);
  }

  function ryd() {
    setBekraeftRyd(true);
  }

  function flyt(index: number, delta: number) {
    const to = index + delta;
    if (to < 0 || to >= stop.length) return;
    revision.current++;
    setStop(rows => { const next = [...rows]; next.splice(to, 0, next.splice(index, 1)[0]); return next; });
    setRute(null);
  }

  async function planlaegRute() {
    if (stop.length < 2 || planlaegger) return;
    const version = revision.current;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlanlaegger(true);
    setFejl(null);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);
    try {
      const medStart = startPunkt ? [startPunkt, ...stop] : stop;
      const r = await planlaeg(medStart, controller.signal);
      if (revision.current !== version) return;
      setRute(r);
      // Startpunktet hoerer ikke til i adresselisten; den viser stederne.
      setStop(r.orden.filter((x) => x.id !== 'mig'));
    } catch (e) {
      setFejl(e instanceof Error ? e.message : 'Kunne ikke beregne ruten.');
    } finally {
      clearTimeout(timeout);
      setPlanlaegger(false);
    }
  }

  const links = rute ? kortLinks(rute.orden, Boolean(startPunkt)) : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Title title="Rute" subtitle="Fra første stop til fyraften." />

        <View style={s.soegRum}>
          <Text style={[layout.secondary, { marginBottom: 8 }]}>Tilføj en adresse</Text>
          <TextInput
            accessibilityLabel="Søg efter adresse"
            style={[s.felt, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
            placeholder="Vej og husnummer"
            placeholderTextColor={t.faint}
            value={q}
            onChangeText={setQ}
            autoCorrect={false}
            autoCapitalize="words"
            returnKeyType="search"
          />
          {soeger ? <ActivityIndicator color={t.faint} style={s.spinner} size="small" /> : null}
        </View>
        {soegeFejl ? <Notice text={soegeFejl} /> : null}

        {forslag.length > 0 ? (
          <Animated.View entering={daempet ? undefined : FadeIn.duration(140)} style={s.forslag}>
            {forslag.map((f) => (
              <Pressable
                key={f.tekst}
                accessibilityRole="button"
                accessibilityLabel={'Tilføj ' + f.tekst}
                onPress={() => tilfoej(f)}
                style={({ pressed }) => [
                  s.forslagRaekke,
                  { borderTopColor: t.line, opacity: pressed ? 0.5 : 1 },
                ]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={[s.forslagKort, { color: t.text }]}>
                    {f.kort}
                    {f.detalje ? <Text style={{ color: t.dim }}>{'  ' + f.detalje}</Text> : null}
                  </Text>
                  <Text style={[s.forslagBy, { color: t.faint }]}>
                    {[f.bynavn, f.post].filter(Boolean).join(' · ')}
                    {f.udenbys ? '  uden for kommunen' : ''}
                  </Text>
                </View>
                <Ionicons name="add" size={19} color={t.accent} />
              </Pressable>
            ))}
          </Animated.View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Brug min placering som startpunkt"
          onPress={brugPlacering}
          disabled={start === 'henter'}
          style={[s.start, { borderTopColor: t.line, backgroundColor: t.card }]}
        >
          <View style={[s.startPrik, { borderColor: startPunkt ? t.accent : t.faint }]}>
            {startPunkt ? <View style={[s.startKerne, { backgroundColor: t.accent }]} /> : null}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.startNavn, { color: startPunkt ? t.text : t.dim }]}>Min placering</Text>
            <Text style={[s.startUnder, { color: t.faint }]}>{forklar(start)}</Text>
          </View>
          {start === 'henter' ? (
            <ActivityIndicator size="small" color={t.faint} />
          ) : (
            <Ionicons name="locate-outline" size={18} color={t.accent} />
          )}
        </Pressable>

        <View style={s.overskrift}>
          <Text style={[s.overskriftTekst, { color: t.text }]}>
            {rute ? 'Kørerækkefølge' : 'Adresser'}
          </Text>
          <View style={s.hoejre}>
            <Text style={[s.antal, { color: t.faint }]}>{stop.length}</Text>
            {stop.length > 0 ? (
              <Pressable onPress={ryd} accessibilityRole="button" style={{ minHeight: 44, minWidth: 44, justifyContent: 'center' }}>
                <Text style={[s.ryd, { color: t.faint }]}>Ryd</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
        {bekraeftRyd && <View style={{ gap: 8, padding: 16, backgroundColor: t.card, borderRadius: 16 }}>
          <Notice text={'Fjern alle ' + stop.length + ' adresser fra ruten?'} />
          <Action label="Behold adresser" onPress={() => setBekraeftRyd(false)} />
          <Action label="Fjern alle adresser" danger onPress={() => { revision.current++; setStop([]); setRute(null); setBekraeftRyd(false); }} />
        </View>}

        {stop.length === 0 ? (
          <Text style={[s.tom, { color: t.faint }]}>
            Tilføj mindst to adresser for at planlægge din arbejdsrute. Du kan bruge din placering som startpunkt.
          </Text>
        ) : (
          <Animated.View layout={daempet ? undefined : LinearTransition.duration(260)}>
            {stop.map((x, i) => (
              <Stoprakke
                key={x.id}
                nummer={i + 1}
                stop={x}
                sidste={i === stop.length - 1}
                planlagt={Boolean(rute)}
                fjern={() => fjern(x.id)}
                op={() => flyt(i, -1)}
                ned={() => flyt(i, 1)}
                foerste={i === 0}
                t={t}
                daempet={daempet}
              />
            ))}
          </Animated.View>
        )}
        {stop.length > 0 && <Text style={[layout.caption, { marginTop: 12 }]}>Første og sidste stop fastholdes. Flyt dem med pilene, før du beregner ruten.</Text>}

        {fejl ? <Text style={[s.fejl, { color: t.fejl }]}>{fejl}</Text> : null}

        {rute ? (
          <Animated.View entering={daempet ? undefined : FadeIn.duration(240)} style={s.resultat}>
            <View style={s.tal}>
              <View>
                <Text style={[s.talVaerdi, { color: t.text }]}>{tid(rute.sekunder)}</Text>
                <Text style={[s.talNavn, { color: t.faint }]}>kørsel i alt</Text>
              </View>
              <View>
                <Text style={[s.talVaerdi, { color: t.text }]}>{afstand(rute.meter)}</Text>
                <Text style={[s.talNavn, { color: t.faint }]}>strækning</Text>
              </View>
            </View>
            {!rute.rigtigeTider ? (
              <Text style={[s.skoen, { color: t.faint }]}>
                Uden net er tiden skønnet ud fra fugleflugt.
              </Text>
            ) : null}
          </Animated.View>
        ) : null}
      </ScrollView>

      {stop.length >= 2 ? (
        <View style={[s.bjaelke, { backgroundColor: t.bg, borderTopColor: t.line }]}>
          {rute ? (
            <>
              <Text style={[s.bjaelkeTekst, { color: t.dim }]}>
                {links.length > 1 ? `${links.length} etaper` : 'Klar'}
              </Text>
              <View style={s.knapper}>
                {links.map((url, i) => (
                  <Pressable
                    accessibilityRole="button"
                    key={url}
                    onPress={() => Linking.openURL(url)}
                    style={[s.knap, { backgroundColor: t.accent }]}
                  >
                    <Ionicons name="navigate" size={16} color={t.bg} />
                    <Text style={[s.knapTekst, { color: t.bg }]}>
                      {links.length > 1 ? `Etape ${i + 1}` : 'Åbn i Maps'}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </>
          ) : (
            <>
              <Text style={[s.bjaelkeTekst, { color: t.dim }]}>
                {stop.length} adresser · ikke planlagt
              </Text>
              <Pressable
                accessibilityRole="button"
                onPress={planlaegRute}
                disabled={planlaegger}
                style={[s.knap, { backgroundColor: t.accent, opacity: planlaegger ? 0.6 : 1 }]}
              >
                {planlaegger ? (
                  <ActivityIndicator color={t.bg} size="small" />
                ) : (
                  <Text style={[s.knapTekst, { color: t.bg }]}>Find hurtigste rute</Text>
                )}
              </Pressable>
            </>
          )}
        </View>
      ) : null}
    </View>
  );
}

function Stoprakke({
  nummer, stop, sidste, planlagt, fjern, t, daempet, op, ned, foerste,
}: {
  nummer: number; stop: Stop; sidste: boolean; planlagt: boolean;
  fjern: () => void; t: Theme; daempet: boolean;
  op: () => void; ned: () => void; foerste: boolean;
}) {
  const skala = useSharedValue(0.9);

  useEffect(() => {
    skala.value = daempet ? 1 : withSpring(1, planlagt ? smooth : snappy);
  }, [planlagt, daempet]);

  const stil = useAnimatedStyle(() => ({ transform: [{ scale: skala.value }] }));

  const dele = stop.tekst.split(', ');
  const vej = dele[0];
  const rest = dele.slice(1).join(', ');

  return (
    <View style={[s.raekke, { borderTopColor: t.line }]}>
      <View style={s.spor}>
        <Animated.View
          style={[
            s.perle,
            { backgroundColor: planlagt ? t.accent : 'transparent', borderColor: planlagt ? t.accent : t.line },
            stil,
          ]}
        >
          <Text style={[s.perleTal, { color: planlagt ? t.bg : t.faint }]}>{nummer}</Text>
        </Animated.View>
        {!sidste ? <View style={[s.streg, { backgroundColor: t.line }]} /> : null}
      </View>

      <View style={s.indhold}>
        <Text style={[s.vej, { color: t.text }]}>{vej}</Text>
        <Text style={[s.rest, { color: t.faint }]}>{rest}</Text>
        <View style={{ flexDirection: 'row', marginTop: 4 }}>
          <IconButton name="arrow-up" label={'Flyt ' + vej + ' op'} disabled={foerste} onPress={op} />
          <IconButton name="arrow-down" label={'Flyt ' + vej + ' ned'} disabled={sidste} onPress={ned} />
        </View>
      </View>

      <IconButton name="close" label={'Fjern ' + vej} onPress={fjern} danger />
    </View>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 24, paddingBottom: 28, width: '100%', maxWidth: 720, alignSelf: 'center' },
  h1: { ...Type.title1, marginBottom: 14 },

  soegRum: { justifyContent: 'center', marginTop: 28 },
  felt: {
    minHeight: 52, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 12, ...Type.body,
  },
  spinner: { position: 'absolute', right: 14 },

  forslag: { marginTop: 10, borderRadius: 14, overflow: 'hidden' },
  forslagRaekke: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1 },
  forslagKort: { ...Type.callout },
  forslagBy: { ...Type.caption1, marginTop: 1 },

  start: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, borderRadius: 16, marginTop: 26 },
  startPrik: { width: 24, height: 24, borderRadius: 12, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  startKerne: { width: 9, height: 9, borderRadius: 5 },
  startNavn: { ...Type.callout, fontWeight: '600' },
  startUnder: { ...Type.caption1, marginTop: 1 },

  overskrift: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 22, marginBottom: 6,
  },
  overskriftTekst: { ...Type.title3 },
  hoejre: { flexDirection: 'row', alignItems: 'baseline', gap: 14 },
  antal: { ...Type.footnote, ...Tal },
  ryd: { ...Type.footnote },

  tom: { ...Type.subhead, marginTop: 10 },

  raekke: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, paddingTop: 13, borderTopWidth: 1 },
  spor: { alignItems: 'center', width: 26 },
  perle: {
    width: 26, height: 26, borderRadius: 13, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  perleTal: { ...Type.caption1, ...Tal, fontWeight: '600' },
  streg: { width: 1, flex: 1, minHeight: 22, marginTop: 3 },

  indhold: { flex: 1, minWidth: 0, paddingBottom: 15 },
  vej: { ...Type.callout, fontWeight: '600' },
  rest: { ...Type.caption1, marginTop: 2 },

  resultat: { marginTop: 26 },
  tal: { flexDirection: 'row', flexWrap: 'wrap', gap: 28 },
  talVaerdi: { ...Type.title1, ...Tal },
  talNavn: { ...Type.caption2, marginTop: 2 },
  skoen: { ...Type.caption1, marginTop: 12 },

  fejl: { ...Type.footnote, marginTop: 16 },

  bjaelke: {
    width: '100%', maxWidth: 720, alignSelf: 'center',
    gap: 10, paddingHorizontal: 20, paddingVertical: 12, borderTopWidth: 1,
  },
  bjaelkeTekst: { ...Type.footnote, ...Tal },
  knapper: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  knap: {
    minHeight: 48, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  knapTekst: { ...Type.callout, fontWeight: '600' },
});
