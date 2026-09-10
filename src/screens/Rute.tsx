import { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, ActivityIndicator,
  Linking, AccessibilityInfo, Alert,
} from 'react-native';
import Animated, {
  FadeIn, LinearTransition, useSharedValue, useAnimatedStyle, withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { Type, Tal } from '../type';
import { snappy, smooth } from '../motion';
import { soeg, Forslag } from '../dawa';
import { Stop, Rute as RuteType, planlaeg, kortLinks, tid, afstand } from '../rute';
import { uid } from '../store';

export default function Rute({ t }: { t: Theme }) {
  const [q, setQ] = useState('');
  const [forslag, setForslag] = useState<Forslag[]>([]);
  const [soeger, setSoeger] = useState(false);
  const [stop, setStop] = useState<Stop[]>([]);
  const [rute, setRute] = useState<RuteType | null>(null);
  const [planlaegger, setPlanlaegger] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const [daempet, setDaempet] = useState(false);

  const afbryd = useRef<AbortController | null>(null);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setDaempet);
  }, []);

  useEffect(() => {
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
        setForslag(await soeg(q, ctrl.signal));
      } catch {
        // Afbrudt eller uden net. Listen bliver bare staaende.
      } finally {
        setSoeger(false);
      }
    }, 220);
    return () => clearTimeout(id);
  }, [q]);

  function tilfoej(f: Forslag) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStop((s) => [...s, { id: uid(), tekst: f.tekst, lon: f.lon, lat: f.lat }]);
    setQ('');
    setForslag([]);
    setRute(null);
  }

  function fjern(id: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setStop((s) => s.filter((x) => x.id !== id));
    setRute(null);
  }

  function ryd() {
    Alert.alert('Ryd listen?', `${stop.length} adresser forsvinder.`, [
      { text: 'Behold', style: 'cancel' },
      {
        text: 'Ryd',
        style: 'destructive',
        onPress: () => {
          setStop([]);
          setRute(null);
        },
      },
    ]);
  }

  async function planlaegRute() {
    if (stop.length < 2) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setPlanlaegger(true);
    setFejl(null);
    try {
      const r = await planlaeg(stop);
      setRute(r);
      setStop(r.orden);
    } catch (e) {
      setFejl(e instanceof Error ? e.message : 'Kunne ikke beregne ruten.');
    } finally {
      setPlanlaegger(false);
    }
  }

  const links = rute ? kortLinks(rute.orden) : [];

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={[s.pad, rute && { paddingBottom: 112 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.h1, { color: t.text }]}>Rute</Text>

        <View style={s.soegRum}>
          <TextInput
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

        {forslag.length > 0 ? (
          <Animated.View entering={daempet ? undefined : FadeIn.duration(140)} style={s.forslag}>
            {forslag.map((f) => (
              <Pressable
                key={f.tekst}
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

        <View style={s.overskrift}>
          <Text style={[s.overskriftTekst, { color: t.text }]}>
            {rute ? 'Kørerækkefølge' : 'Adresser'}
          </Text>
          <View style={s.hoejre}>
            <Text style={[s.antal, { color: t.faint }]}>{stop.length}</Text>
            {stop.length > 0 ? (
              <Pressable onPress={ryd} hitSlop={8}>
                <Text style={[s.ryd, { color: t.faint }]}>Ryd</Text>
              </Pressable>
            ) : null}
          </View>
        </View>

        {stop.length === 0 ? (
          <Text style={[s.tom, { color: t.faint }]}>
            Skriv adresserne ind som de står på listen. Rækkefølgen er ligegyldig.
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
                t={t}
                daempet={daempet}
              />
            ))}
          </Animated.View>
        )}

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
  nummer, stop, sidste, planlagt, fjern, t, daempet,
}: {
  nummer: number; stop: Stop; sidste: boolean; planlagt: boolean;
  fjern: () => void; t: Theme; daempet: boolean;
}) {
  const skala = useSharedValue(0.9);

  useEffect(() => {
    skala.value = withSpring(1, planlagt ? smooth : snappy);
  }, [planlagt]);

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
      </View>

      <Pressable onPress={fjern} hitSlop={10} accessibilityLabel={'Fjern ' + vej}>
        <Ionicons name="close" size={18} color={t.faint} />
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 44 },
  h1: { ...Type.title1, marginBottom: 14 },

  soegRum: { justifyContent: 'center' },
  felt: {
    height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, ...Type.body,
  },
  spinner: { position: 'absolute', right: 14 },

  forslag: { marginTop: 10 },
  forslagRaekke: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 12, borderTopWidth: 1 },
  forslagKort: { ...Type.callout },
  forslagBy: { ...Type.caption1, marginTop: 1 },

  overskrift: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 28, marginBottom: 6,
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

  indhold: { flex: 1, paddingBottom: 15 },
  vej: { ...Type.callout, fontWeight: '600' },
  rest: { ...Type.caption1, marginTop: 2 },

  resultat: { marginTop: 26 },
  tal: { flexDirection: 'row', gap: 38 },
  talVaerdi: { ...Type.title1, ...Tal },
  talNavn: { ...Type.caption2, marginTop: 2 },
  skoen: { ...Type.caption1, marginTop: 12 },

  fejl: { ...Type.footnote, marginTop: 16 },

  bjaelke: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 22, paddingTop: 14, paddingBottom: 18, borderTopWidth: 1,
  },
  bjaelkeTekst: { ...Type.footnote, ...Tal },
  knapper: { flexDirection: 'row', gap: 8 },
  knap: {
    height: 44, borderRadius: 22, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
  },
  knapTekst: { ...Type.callout, fontWeight: '600' },
});
