import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import Animated, {
  FadeIn, useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, withDelay, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { DB } from '../store';
import { Theme } from '../theme';
import { Type } from '../type';
import { snappy } from '../motion';
import { saml, skrivBrief } from '../brief';

type Props = { db: DB; t: Theme; daempet: boolean };

export default function Brief({ db, t, daempet }: Props) {
  const [tekst, setTekst] = useState<string | null>(null);
  const [henter, setHenter] = useState(false);
  const [taler, setTaler] = useState(false);
  const [fejl, setFejl] = useState<string | null>(null);
  const levende = useRef(true);

  useEffect(() => {
    levende.current = true;
    return () => {
      levende.current = false;
      Speech.stop();
    };
  }, []);

  function laesOp(t: string) {
    setTaler(true);
    Speech.speak(t, {
      language: 'da-DK',
      rate: 0.98,
      onDone: () => {
        if (levende.current) setTaler(false);
      },
      onStopped: () => {
        if (levende.current) setTaler(false);
      },
      onError: () => {
        if (levende.current) setTaler(false);
      },
    });
  }

  async function koer() {
    if (taler) {
      Speech.stop();
      setTaler(false);
      return;
    }
    if (tekst) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      laesOp(tekst);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setHenter(true);
    setFejl(null);
    try {
      const kilder = await saml(db);
      const ny = await skrivBrief(kilder);
      if (!levende.current) return;
      setTekst(ny);
      laesOp(ny);
    } catch (e) {
      if (levende.current) setFejl(e instanceof Error ? e.message : 'Kunne ikke hente dagen.');
    } finally {
      if (levende.current) setHenter(false);
    }
  }

  return (
    <View style={[s.rum, { borderColor: t.line }]}>
      <Pressable onPress={koer} style={s.top} accessibilityRole="button">
        <Baelge aktiv={taler || henter} t={t} daempet={daempet} />

        <View style={{ flex: 1 }}>
          <Text style={[s.titel, { color: t.text }]}>
            {taler ? 'Læser op' : henter ? 'Ser på dagen' : 'Dagens brief'}
          </Text>
          <Text style={[s.under, { color: t.faint }]}>
            {taler ? 'tryk for at stoppe' : tekst ? 'tryk for at høre igen' : 'tryk, så læser den din dag op'}
          </Text>
        </View>

        {henter ? (
          <ActivityIndicator color={t.accent} size="small" />
        ) : (
          <Ionicons name={taler ? 'stop-circle' : 'play-circle'} size={30} color={t.accent} />
        )}
      </Pressable>

      {fejl ? <Text style={[s.fejl, { color: '#E24B4A' }]}>{fejl}</Text> : null}

      {tekst ? (
        <Animated.Text
          entering={daempet ? undefined : FadeIn.duration(240)}
          style={[s.brief, { color: t.dim }]}
        >
          {tekst}
        </Animated.Text>
      ) : null}
    </View>
  );
}

/** Fem stave der bevaeger sig mens der tales. Staar stille naar der er stille. */
function Baelge({ aktiv, t, daempet }: { aktiv: boolean; t: Theme; daempet: boolean }) {
  return (
    <View style={s.baelge}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Stav key={i} indeks={i} aktiv={aktiv} t={t} daempet={daempet} />
      ))}
    </View>
  );
}

function Stav({
  indeks, aktiv, t, daempet,
}: { indeks: number; aktiv: boolean; t: Theme; daempet: boolean }) {
  const h = useSharedValue(0.25);
  const toppe = [0.5, 0.95, 0.65, 1, 0.45];

  useEffect(() => {
    if (aktiv && !daempet) {
      h.value = withDelay(
        indeks * 90,
        withRepeat(
          withTiming(toppe[indeks], { duration: 380 + indeks * 55, easing: Easing.inOut(Easing.quad) }),
          -1,
          true,
        ),
      );
    } else {
      h.value = withSpring(0.25, snappy);
    }
  }, [aktiv, daempet]);

  const stil = useAnimatedStyle(() => ({ height: 4 + h.value * 22 }));

  return <Animated.View style={[s.stav, { backgroundColor: t.accent }, stil]} />;
}

const s = StyleSheet.create({
  rum: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 16, marginBottom: 22 },
  top: { flexDirection: 'row', alignItems: 'center', gap: 14 },

  baelge: { flexDirection: 'row', alignItems: 'center', gap: 3, height: 26, width: 32 },
  stav: { width: 3.5, borderRadius: 2 },

  titel: { ...Type.headline },
  under: { ...Type.caption1, marginTop: 1 },

  brief: { ...Type.subhead, marginTop: 14 },
  fejl: { ...Type.footnote, marginTop: 12 },
});
