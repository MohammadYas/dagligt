import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, withSpring, withTiming } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { dayKey } from '../store';

const BOGSTAV = ['s', 'm', 't', 'o', 't', 'f', 'l'];
const DAGE_FREM = 21;

type Props = {
  valgte: string[];
  skift: (dato: string) => void;
  t: Theme;
  daempet: boolean;
};

/**
 * Tre uger frem som én stribe. Hver vagt ligger 15-23, saa hver dag er
 * enten paa eller af — baandet viser forpligtelsen i ét blik, uden at
 * man skal laese en kalender.
 */
export default function Dagbaand({ valgte, skift, t, daempet }: Props) {
  const start = new Date();
  const dage: { noegle: string; ugedag: number; dato: number }[] = [];

  for (let i = 0; i < DAGE_FREM; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    dage.push({ noegle: dayKey(d), ugedag: d.getDay(), dato: d.getDate() });
  }

  return (
    <View style={s.baand}>
      {dage.map((d, i) => (
        <Stav
          key={d.noegle}
          noegle={d.noegle}
          bogstav={BOGSTAV[d.ugedag]}
          dato={d.dato}
          valgt={valgte.includes(d.noegle)}
          weekend={d.ugedag === 0 || d.ugedag === 6}
          foerste={i === 0}
          skift={skift}
          t={t}
          daempet={daempet}
        />
      ))}
    </View>
  );
}

function Stav({
  noegle, bogstav, dato, valgt, weekend, foerste, skift, t, daempet,
}: {
  noegle: string; bogstav: string; dato: number; valgt: boolean;
  weekend: boolean; foerste: boolean;
  skift: (d: string) => void; t: Theme; daempet: boolean;
}) {
  const stavStil = useAnimatedStyle(() => ({
    height: withSpring(valgt ? 34 : 12, { damping: 17, stiffness: 200, mass: 0.6 }),
    backgroundColor: withTiming(valgt ? t.accent : t.line, { duration: 200 }),
  }));

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        skift(noegle);
      }}
      style={s.kolonne}
      hitSlop={{ top: 6, bottom: 6 }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: valgt }}
      accessibilityLabel={noegle}
    >
      <View style={s.stavRum}>
        <Animated.View style={[s.stav, daempet ? { height: valgt ? 34 : 12, backgroundColor: valgt ? t.accent : t.line } : stavStil]} />
      </View>
      <Text
        style={[
          s.bogstav,
          { color: foerste ? t.accent : weekend ? t.faint : t.dim, fontWeight: foerste ? '700' : '400' },
        ]}
      >
        {foerste ? 'i dag' : bogstav}
      </Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  baand: { flexDirection: 'row', alignItems: 'flex-end', gap: 3, height: 56, marginTop: 14 },
  kolonne: { flex: 1, alignItems: 'center' },
  stavRum: { height: 34, justifyContent: 'flex-end', width: '100%' },
  stav: { width: '100%', borderRadius: 3, minWidth: 5 },
  bogstav: { fontSize: 9, marginTop: 5 },
});
