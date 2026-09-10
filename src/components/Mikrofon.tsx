import { useState } from 'react';
import { View, Pressable, StyleSheet, Alert } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withRepeat, withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { snappy } from '../motion';

type Props = {
  /** Kaldes loebende mens der tales, saa feltet fyldes i realtid. */
  paaTekst: (tekst: string) => void;
  t: Theme;
  daempet: boolean;
};

// Modulet findes kun i et rigtigt build. I Expo Go og paa web uden
// SpeechRecognition-API skal knappen bare vaere der uden at vaelte noget.
let Tale: any = null;
let brugHaendelse: any = null;
try {
  const m = require('expo-speech-recognition');
  Tale = m.ExpoSpeechRecognitionModule;
  brugHaendelse = m.useSpeechRecognitionEvent;
} catch {
  Tale = null;
}

export const harTale = Tale !== null;

export default function Mikrofon({ paaTekst, t, daempet }: Props) {
  const [lytter, setLytter] = useState(false);
  const ring = useSharedValue(0);
  const skala = useSharedValue(1);

  if (brugHaendelse) {
    brugHaendelse('start', () => setLytter(true));
    brugHaendelse('end', () => {
      setLytter(false);
      ring.value = withTiming(0, { duration: 200 });
    });
    brugHaendelse('result', (h: any) => {
      const tekst = h?.results?.[0]?.transcript;
      if (typeof tekst === 'string') paaTekst(tekst);
    });
    brugHaendelse('error', (h: any) => {
      setLytter(false);
      ring.value = withTiming(0, { duration: 200 });
      if (h?.error && h.error !== 'aborted' && h.error !== 'no-speech') {
        Alert.alert('Kunne ikke høre efter', h.message ?? String(h.error));
      }
    });
  }

  async function skift() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (!Tale) {
      Alert.alert(
        'Diktering mangler',
        'Optageknappen virker først i et rigtigt build. Brug mikrofonen på tastaturet indtil da.',
      );
      return;
    }

    if (lytter) {
      Tale.stop();
      return;
    }

    const svar = await Tale.requestPermissionsAsync();
    if (!svar.granted) {
      Alert.alert('Mangler adgang', 'Giv appen adgang til mikrofon og talegenkendelse i Indstillinger.');
      return;
    }

    ring.value = withRepeat(
      withTiming(1, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
    skala.value = withSpring(0.92, snappy, () => {
      skala.value = withSpring(1, snappy);
    });

    Tale.start({ lang: 'da-DK', interimResults: true, continuous: true });
  }

  const ringStil = useAnimatedStyle(() => ({
    opacity: daempet ? 0 : ring.value * 0.5,
    transform: [{ scale: 1 + ring.value * 0.55 }],
  }));

  const knapStil = useAnimatedStyle(() => ({ transform: [{ scale: skala.value }] }));

  return (
    <View style={s.rum}>
      <Animated.View
        style={[s.ring, { borderColor: t.accent }, ringStil]}
        pointerEvents="none"
      />
      <Animated.View style={knapStil}>
        <Pressable
          onPress={skift}
          style={[
            s.knap,
            { backgroundColor: lytter ? t.accent : 'transparent', borderColor: lytter ? t.accent : t.line },
          ]}
          accessibilityRole="button"
          accessibilityLabel={lytter ? 'Stop diktering' : 'Tal idéen ind'}
          accessibilityState={{ selected: lytter }}
        >
          <Ionicons
            name={lytter ? 'stop' : 'mic-outline'}
            size={19}
            color={lytter ? t.bg : t.dim}
          />
        </Pressable>
      </Animated.View>
    </View>
  );
}

const s = StyleSheet.create({
  rum: { width: 46, height: 46, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 46, height: 46, borderRadius: 23, borderWidth: 2 },
  knap: {
    width: 46, height: 46, borderRadius: 23, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
});
