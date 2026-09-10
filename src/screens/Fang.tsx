import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet, AccessibilityInfo, Alert,
} from 'react-native';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { DB, Capture, uid } from '../store';
import { Theme } from '../theme';
import { Type, Tal } from '../type';
import { snappy, daempetSkift } from '../motion';
import { rens, harDeepSeek } from '../deepseek';
import Mikrofon from '../components/Mikrofon';

type Props = { db: DB; update: (fn: (d: DB) => DB) => void; t: Theme };

export default function Fang({ db, update, t }: Props) {
  const [draft, setDraft] = useState('');
  const [aabne, setAabne] = useState<Set<string>>(new Set());
  const [daempet, setDaempet] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setDaempet);
  }, []);

  const items = [...db.captures].sort((a, b) => b.ts - a.ts);

  function saet(id: string, aendring: Partial<Capture>) {
    update((d) => ({
      ...d,
      captures: d.captures.map((c) => (c.id === id ? { ...c, ...aendring } : c)),
    }));
  }

  async function rensNote(id: string, raa: string) {
    saet(id, { tilstand: 'venter', fejl: undefined });
    try {
      const r = await rens(raa);
      saet(id, { tilstand: 'renset', titel: r.titel, renset: r.tekst });
    } catch (e) {
      saet(id, { tilstand: 'fejl', fejl: e instanceof Error ? e.message : 'Rensning mislykkedes.' });
    }
  }

  function tilfoej() {
    const text = draft.trim();
    if (!text) return;
    const c: Capture = {
      id: uid(),
      text,
      ts: Date.now(),
      tilstand: harDeepSeek ? 'venter' : undefined,
    };
    update((d) => ({ ...d, captures: [...d.captures, c] }));
    setDraft('');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (harDeepSeek) rensNote(c.id, text);
  }

  function fold(id: string) {
    Haptics.selectionAsync();
    setAabne((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  /** Sletning er den eneste vej ud af indbakken, saa den skal bekraeftes. */
  function slet(id: string) {
    const note = db.captures.find((c) => c.id === id);
    const navn = note?.titel ?? note?.text ?? '';
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Slet noten?',
      navn.length > 60 ? navn.slice(0, 60) + '…' : navn,
      [
        { text: 'Behold', style: 'cancel' },
        {
          text: 'Slet',
          style: 'destructive',
          onPress: () => update((d) => ({ ...d, captures: d.captures.filter((c) => c.id !== id) })),
        },
      ],
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={[s.h1, { color: t.text }]}>Indbakke</Text>

      <View style={s.raekke}>
        <TextInput
          style={[s.felt, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
          placeholder="Skriv idéen som den falder dig ind"
          placeholderTextColor={t.faint}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={tilfoej}
          returnKeyType="done"
          multiline
        />
        <Mikrofon paaTekst={setDraft} t={t} daempet={daempet} />

        <Pressable
          style={[s.knap, { backgroundColor: draft.trim() ? t.accent : t.line }]}
          onPress={tilfoej}
          accessibilityLabel="Gem idé"
        >
          <Ionicons name="arrow-up" size={20} color={draft.trim() ? t.bg : t.faint} />
        </Pressable>
      </View>

      <Text style={[s.hjaelp, { color: t.faint }]}>
        {harDeepSeek
          ? 'Skriv eller tal den ind. DeepSeek skriver den rent, og din egen ordlyd bliver gemt ved siden af.'
          : 'Ingen DeepSeek-nøgle i .env — noten gemmes som du skrev den.'}
      </Text>

      {items.length === 0 ? (
        <Text style={[s.tom, { color: t.faint }]}>Tom. Sådan skal den helst se ud sidst på dagen.</Text>
      ) : (
        items.map((c) => (
          <Note
            key={c.id}
            c={c}
            aaben={aabne.has(c.id)}
            fold={() => fold(c.id)}
            slet={() => slet(c.id)}
            proevIgen={() => rensNote(c.id, c.text)}
            t={t}
            daempet={daempet}
          />
        ))
      )}
    </ScrollView>
  );
}

function Note({
  c, aaben, fold, slet, proevIgen, t, daempet,
}: {
  c: Capture; aaben: boolean; fold: () => void; slet: () => void; proevIgen: () => void;
  t: Theme; daempet: boolean;
}) {
  const venter = c.tilstand === 'venter';
  const drej = useSharedValue(0);

  useEffect(() => {
    drej.value = daempet
      ? withTiming(aaben ? 1 : 0, daempetSkift)
      : withSpring(aaben ? 1 : 0, snappy);
  }, [aaben, daempet]);

  const pil = useAnimatedStyle(() => ({ transform: [{ rotate: drej.value * 90 + 'deg' }] }));

  const overskrift = c.titel ?? c.text;

  return (
    <View style={[s.note, { borderTopColor: t.line }]}>
      <Pressable
        onPress={fold}
        onLongPress={slet}
        style={s.hoved}
        accessibilityRole="button"
        accessibilityState={{ expanded: aaben }}
        accessibilityLabel={overskrift}
      >
        <Animated.View style={[pil, s.pil]}>
          <Ionicons name="chevron-forward" size={15} color={t.faint} />
        </Animated.View>

        <Text style={[s.titel, { color: t.text }]} numberOfLines={aaben ? undefined : 2}>
          {overskrift}
        </Text>

        {venter ? (
          <Renser t={t} daempet={daempet} />
        ) : (
          <Text style={[s.tid, { color: t.faint }]}>{naar(c.ts)}</Text>
        )}
      </Pressable>

      {aaben ? (
        <Animated.View entering={daempet ? undefined : FadeIn.duration(160)} style={s.krop}>
          {c.renset ? (
            <>
              <Text style={[s.brod, { color: t.dim }]}>{c.renset}</Text>
              {c.renset !== c.text ? (
                <>
                  <Text style={[s.maerkat, { color: t.faint }]}>Som du skrev den</Text>
                  <Text style={[s.raa, { color: t.faint }]}>{c.text}</Text>
                </>
              ) : null}
            </>
          ) : (
            <Text style={[s.brod, { color: t.dim }]}>{c.text}</Text>
          )}

          {c.tilstand === 'fejl' ? (
            <Pressable onPress={proevIgen} style={s.igen}>
              <Text style={[s.igenTekst, { color: t.accent }]}>{c.fejl} Prøv igen</Text>
            </Pressable>
          ) : null}

          <Pressable onPress={slet} style={s.slet}>
            <Text style={[s.sletTekst, { color: t.fejl }]}>Slet</Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

/** Tre prikker der aander mens DeepSeek arbejder. */
function Renser({ t, daempet }: { t: Theme; daempet: boolean }) {
  const puls = useSharedValue(0.35);

  useEffect(() => {
    if (!daempet) {
      puls.value = withRepeat(withTiming(1, { duration: 620 }), -1, true);
    }
  }, [daempet]);

  const stil = useAnimatedStyle(() => ({ opacity: daempet ? 0.6 : puls.value }));

  return (
    <Animated.View style={[s.renser, stil]}>
      <View style={[s.prik, { backgroundColor: t.accent }]} />
      <View style={[s.prik, { backgroundColor: t.accent }]} />
      <View style={[s.prik, { backgroundColor: t.accent }]} />
    </Animated.View>
  );
}

function naar(ts: number) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'nu';
  if (min < 60) return min + ' min';
  const timer = Math.floor(min / 60);
  if (timer < 24) return timer + ' t';
  return Math.floor(timer / 24) + ' d';
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 24, paddingTop: 22, paddingBottom: 48 },
  h1: { ...Type.largeTitle, marginBottom: 18 },

  raekke: { flexDirection: 'row', gap: 10, alignItems: 'flex-end' },
  felt: {
    flex: 1, minHeight: 46, maxHeight: 132, borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingTop: 12, paddingBottom: 12, ...Type.body,
  },
  knap: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  hjaelp: { ...Type.caption1, marginTop: 10, marginBottom: 22 },

  tom: { ...Type.subhead, marginTop: 8 },

  note: { borderTopWidth: 1 },
  hoved: { flexDirection: 'row', alignItems: 'flex-start', gap: 9, paddingVertical: 15 },
  pil: { paddingTop: 3 },
  titel: { ...Type.callout, fontWeight: '600', flex: 1 },
  tid: { ...Type.caption1, ...Tal, marginTop: 2 },

  krop: { paddingLeft: 24, paddingBottom: 14 },
  brod: { ...Type.subhead },
  maerkat: { ...Type.caption2, marginTop: 14, marginBottom: 3 },
  raa: { ...Type.footnote },

  igen: { paddingVertical: 10 },
  igenTekst: { ...Type.footnote },
  slet: { paddingTop: 12 },
  sletTekst: { ...Type.footnote },

  renser: { flexDirection: 'row', gap: 3, marginTop: 7 },
  prik: { width: 4, height: 4, borderRadius: 2 },
});
