import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert, Platform } from 'react-native';
import Animated, {
  FadeIn, LinearTransition, useSharedValue, useAnimatedStyle, withTiming, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Clipboard from 'expo-clipboard';
import { Theme } from '../theme';
import { Type, Tal } from '../type';
import { kode, tilbage, fraTekst, Konto, PERIODE } from '../totp';
import { uid } from '../store';

const NOEGLE = 'dagligapp.koder';

// Hemmelighederne hoerer til i Keychain, ikke i almindelig lagring.
// Modulet findes ikke paa web, saa opslaget skal kunne fejle stille.
let Sikker: typeof import('expo-secure-store') | null = null;
try {
  if (Platform.OS !== 'web') Sikker = require('expo-secure-store');
} catch {
  Sikker = null;
}

async function laes(): Promise<Konto[]> {
  if (!Sikker) return [];
  try {
    const raa = await Sikker.getItemAsync(NOEGLE);
    return raa ? (JSON.parse(raa) as Konto[]) : [];
  } catch {
    return [];
  }
}

async function skriv(k: Konto[]) {
  if (!Sikker) return;
  try {
    await Sikker.setItemAsync(NOEGLE, JSON.stringify(k));
  } catch {}
}

export default function Koder({ t, daempet }: { t: Theme; daempet: boolean }) {
  const [konti, setKonti] = useState<Konto[]>([]);
  const [tilfoejer, setTilfoejer] = useState(false);
  const [navn, setNavn] = useState('');
  const [hemmelighed, setHemmelighed] = useState('');
  const [fejl, setFejl] = useState<string | null>(null);
  const [nu, setNu] = useState(Date.now());

  useEffect(() => {
    laes().then(setKonti);
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNu(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  function gem(nye: Konto[]) {
    setKonti(nye);
    skriv(nye);
  }

  function tilfoej() {
    const læst = fraTekst(hemmelighed);
    if (!læst) {
      setFejl('Det ligner hverken en otpauth-adresse eller en base32-hemmelighed.');
      return;
    }
    try {
      kode(læst.hemmelighed);
    } catch (e) {
      setFejl(e instanceof Error ? e.message : 'Hemmeligheden kunne ikke bruges.');
      return;
    }
    gem([...konti, { id: uid(), navn: navn.trim() || læst.navn || 'Konto', hemmelighed: læst.hemmelighed }]);
    setNavn('');
    setHemmelighed('');
    setFejl(null);
    setTilfoejer(false);
  }

  function slet(k: Konto) {
    Alert.alert('Fjern koden?', k.navn, [
      { text: 'Behold', style: 'cancel' },
      { text: 'Fjern', style: 'destructive', onPress: () => gem(konti.filter((x) => x.id !== k.id)) },
    ]);
  }

  if (!Sikker) {
    return (
      <View>
        <Overskrift t={t} tilfoejer={false} skift={() => {}} vis={false} />
        <Text style={[s.tom, { color: t.faint }]}>
          Koder gemmes i telefonens Keychain og virker først i appen på telefonen.
        </Text>
      </View>
    );
  }

  const sek = tilbage(nu);

  return (
    <View>
      <Overskrift t={t} tilfoejer={tilfoejer} skift={() => setTilfoejer((v) => !v)} vis />

      {tilfoejer ? (
        <Animated.View entering={daempet ? undefined : FadeIn.duration(160)} style={s.tilfoej}>
          <TextInput
            style={[s.felt, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
            placeholder="Navn, fx Dropbox"
            placeholderTextColor={t.faint}
            value={navn}
            onChangeText={setNavn}
            autoCapitalize="words"
          />
          <TextInput
            style={[s.felt, { backgroundColor: t.card, color: t.text, borderColor: t.line, marginTop: 8 }]}
            placeholder="Hemmelighed eller otpauth://…"
            placeholderTextColor={t.faint}
            value={hemmelighed}
            onChangeText={(v) => {
              setHemmelighed(v);
              setFejl(null);
            }}
            autoCapitalize="none"
            autoCorrect={false}
          />
          {fejl ? <Text style={[s.fejl, { color: t.fejl }]}>{fejl}</Text> : null}
          <Pressable onPress={tilfoej} style={[s.gem, { backgroundColor: t.accent }]}>
            <Text style={[s.gemTekst, { color: t.bg }]}>Tilføj</Text>
          </Pressable>
        </Animated.View>
      ) : null}

      {konti.length === 0 && !tilfoejer ? (
        <Text style={[s.tom, { color: t.faint }]}>
          Ingen koder endnu. Indsæt en hemmelighed, så viser den sig her.
        </Text>
      ) : null}

      <Animated.View layout={daempet ? undefined : LinearTransition.duration(220)}>
        {konti.map((k) => (
          <Raekke key={k.id} k={k} nu={nu} sek={sek} slet={() => slet(k)} t={t} daempet={daempet} />
        ))}
      </Animated.View>
    </View>
  );
}

function Overskrift({
  t, tilfoejer, skift, vis,
}: { t: Theme; tilfoejer: boolean; skift: () => void; vis: boolean }) {
  return (
    <View style={s.overskrift}>
      <Text style={[s.overskriftTekst, { color: t.text }]}>Koder</Text>
      {vis ? (
        <Pressable onPress={skift} hitSlop={10}>
          <Text style={[s.link, { color: t.accent }]}>{tilfoejer ? 'Fortryd' : 'Tilføj'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function Raekke({
  k, nu, sek, slet, t, daempet,
}: { k: Konto; nu: number; sek: number; slet: () => void; t: Theme; daempet: boolean }) {
  const [kopieret, setKopieret] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  let tal = '------';
  try {
    tal = kode(k.hemmelighed, nu);
  } catch {
    tal = 'fejl';
  }

  async function kopier() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(tal);
    setKopieret(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setKopieret(false), 1400);
  }

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  // Under ti sekunder skifter koden snart; det skal ses, ikke laeses.
  const knap = sek <= 10;

  return (
    <Pressable
      onPress={kopier}
      onLongPress={slet}
      style={[s.raekke, { borderTopColor: t.line }]}
      accessibilityLabel={k.navn + ', kode ' + tal.split('').join(' ')}
    >
      <View style={{ flex: 1 }}>
        <Text style={[s.navn, { color: t.faint }]}>{k.navn}</Text>
        <Text style={[s.kode, { color: knap ? t.advarsel : t.text }]}>
          {tal.slice(0, 3)} {tal.slice(3)}
        </Text>
      </View>

      {kopieret ? (
        <Animated.Text entering={FadeIn.duration(120)} style={[s.kopieret, { color: t.done }]}>
          kopieret
        </Animated.Text>
      ) : (
        <Ur sek={sek} farve={knap ? t.advarsel : t.accent} spor={t.line} daempet={daempet} />
      )}
    </Pressable>
  );
}

/** Sekundviseren som en stribe der toemmes, ikke en ring der snurrer. */
function Ur({
  sek, farve, spor, daempet,
}: { sek: number; farve: string; spor: string; daempet: boolean }) {
  const andel = useSharedValue(sek / PERIODE);

  useEffect(() => {
    andel.value = daempet
      ? sek / PERIODE
      : withTiming(sek / PERIODE, { duration: 950, easing: Easing.linear });
  }, [sek, daempet]);

  const stil = useAnimatedStyle(() => ({ height: `${Math.max(0, andel.value) * 100}%` }));

  return (
    <View style={s.ur}>
      <View style={[s.urSpor, { backgroundColor: spor }]} />
      <Animated.View style={[s.urFyld, { backgroundColor: farve }, stil]} />
      <Text style={[s.urTal, { color: farve }]}>{sek}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overskrift: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 34, marginBottom: 10,
  },
  overskriftTekst: { ...Type.title3 },
  link: { ...Type.footnote },

  tilfoej: { marginBottom: 14 },
  felt: { height: 46, borderRadius: 14, borderWidth: 1, paddingHorizontal: 14, ...Type.body },
  fejl: { ...Type.footnote, marginTop: 8 },
  gem: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  gemTekst: { ...Type.callout, fontWeight: '600' },

  tom: { ...Type.subhead, marginTop: 4 },

  raekke: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderTopWidth: 1 },
  navn: { ...Type.caption1 },
  kode: { ...Type.title1, ...Tal, marginTop: 1, letterSpacing: 1.5 },
  kopieret: { ...Type.footnote },

  ur: { width: 26, height: 34, alignItems: 'center', justifyContent: 'flex-end' },
  urSpor: { position: 'absolute', left: 11, top: 0, bottom: 14, width: 3, borderRadius: 2 },
  urFyld: { position: 'absolute', left: 11, bottom: 14, width: 3, borderRadius: 2 },
  urTal: { ...Type.caption2, ...Tal, position: 'absolute', bottom: 0 },
});
