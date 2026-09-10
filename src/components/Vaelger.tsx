import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, LayoutChangeEvent } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { Type } from '../type';
import { smooth, daempetSkift } from '../motion';

type Mulighed<T extends string> = { key: T; navn: string };

type Props<T extends string> = {
  muligheder: Mulighed<T>[];
  valgt: T;
  vaelg: (v: T) => void;
  t: Theme;
  daempet: boolean;
};

/** Segmenteret vaelger hvor den aktive plade glider med til det nye valg. */
export default function Vaelger<T extends string>({
  muligheder, valgt, vaelg, t, daempet,
}: Props<T>) {
  const [bredde, setBredde] = useState(0);
  const x = useSharedValue(0);

  const antal = muligheder.length;
  const feltBredde = bredde > 0 ? (bredde - 6) / antal : 0;
  const indeks = Math.max(0, muligheder.findIndex((m) => m.key === valgt));

  function maal(e: LayoutChangeEvent) {
    const b = e.nativeEvent.layout.width;
    setBredde(b);
    x.value = ((b - 6) / antal) * indeks;
  }

  function tryk(m: Mulighed<T>, i: number) {
    if (m.key === valgt) return;
    Haptics.selectionAsync();
    const maalX = feltBredde * i;
    x.value = daempet
      ? withTiming(maalX, daempetSkift)
      : withSpring(maalX, smooth);
    vaelg(m.key);
  }

  const pladeStil = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
    width: feltBredde,
  }));

  return (
    <View style={[s.spor, { backgroundColor: t.cardAlt }]} onLayout={maal}>
      {bredde > 0 && (
        <Animated.View style={[s.plade, { backgroundColor: t.card }, pladeStil]} />
      )}
      {muligheder.map((m, i) => {
        const aktiv = m.key === valgt;
        return (
          <Pressable
            key={m.key}
            onPress={() => tryk(m, i)}
            style={s.felt}
            accessibilityRole="tab"
            accessibilityState={{ selected: aktiv }}
            accessibilityLabel={m.navn}
          >
            <Text style={[s.tekst, { color: aktiv ? t.text : t.dim, fontWeight: aktiv ? '600' : '500' }]}>
              {m.navn}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const s = StyleSheet.create({
  spor: { flexDirection: 'row', borderRadius: 11, padding: 3, marginBottom: 18 },
  plade: { position: 'absolute', top: 3, bottom: 3, left: 3, borderRadius: 9 },
  felt: { flex: 1, height: 38, alignItems: 'center', justifyContent: 'center' },
  tekst: { ...Type.subhead },
});
