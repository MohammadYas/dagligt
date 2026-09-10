import { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withSpring,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { dayKey } from '../store';

const MAANEDER = [
  'januar', 'februar', 'marts', 'april', 'maj', 'juni',
  'juli', 'august', 'september', 'oktober', 'november', 'december',
];
const UGEDAGE = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];

type Props = {
  valgte: string[];
  skift: (dato: string) => void;
  t: Theme;
  daempet: boolean;
};

export default function Kalender({ valgte, skift, t, daempet }: Props) {
  const nu = new Date();
  const [aar, setAar] = useState(nu.getFullYear());
  const [maaned, setMaaned] = useState(nu.getMonth());
  const iDag = dayKey();

  const celler = useMemo(() => {
    const foerste = new Date(aar, maaned, 1);
    // Uger starter mandag i Danmark; getDay() giver soendag = 0.
    const spring = (foerste.getDay() + 6) % 7;
    const dageIMaaned = new Date(aar, maaned + 1, 0).getDate();

    const ud: (string | null)[] = [];
    for (let i = 0; i < spring; i++) ud.push(null);
    for (let d = 1; d <= dageIMaaned; d++) ud.push(dayKey(new Date(aar, maaned, d)));
    return ud;
  }, [aar, maaned]);

  function flyt(retning: number) {
    Haptics.selectionAsync();
    const d = new Date(aar, maaned + retning, 1);
    setAar(d.getFullYear());
    setMaaned(d.getMonth());
  }

  const valgteISyn = celler.filter((c) => c && valgte.includes(c)).length;

  return (
    <View>
      <View style={s.top}>
        <Pressable onPress={() => flyt(-1)} hitSlop={14} accessibilityLabel="Forrige måned" style={s.pil}>
          <Ionicons name="chevron-back" size={19} color={t.accent} />
        </Pressable>

        <Animated.View key={aar + '-' + maaned} entering={daempet ? undefined : FadeIn.duration(180)}>
          <Text style={[s.titel, { color: t.text }]}>
            {MAANEDER[maaned]} {aar}
          </Text>
          <Text style={[s.tael, { color: t.faint }]}>
            {valgteISyn === 0 ? 'ingen dage denne måned' : valgteISyn + ' valgt denne måned'}
          </Text>
        </Animated.View>

        <Pressable onPress={() => flyt(1)} hitSlop={14} accessibilityLabel="Næste måned" style={s.pil}>
          <Ionicons name="chevron-forward" size={19} color={t.accent} />
        </Pressable>
      </View>

      <View style={s.raekke}>
        {UGEDAGE.map((u) => (
          <Text key={u} style={[s.ugedag, { color: t.faint }]}>
            {u}
          </Text>
        ))}
      </View>

      <View style={s.gitter}>
        {celler.map((dato, i) =>
          dato ? (
            <Dag
              key={dato}
              dato={dato}
              valgt={valgte.includes(dato)}
              erIDag={dato === iDag}
              fortid={dato < iDag}
              skift={skift}
              t={t}
              daempet={daempet}
            />
          ) : (
            <View key={'tom-' + i} style={s.celle} />
          ),
        )}
      </View>
    </View>
  );
}

function Dag({
  dato, valgt, erIDag, fortid, skift, t, daempet,
}: {
  dato: string; valgt: boolean; erIDag: boolean; fortid: boolean;
  skift: (d: string) => void; t: Theme; daempet: boolean;
}) {
  const skala = useSharedValue(1);

  function tryk() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!daempet) {
      skala.value = withSpring(0.8, { damping: 13, stiffness: 520 }, (faerdig) => {
        if (faerdig) skala.value = withSpring(1, { damping: 10, stiffness: 300 });
      });
    }
    skift(dato);
  }

  const boksStil = useAnimatedStyle(() => ({
    transform: [{ scale: skala.value }],
  }));

  const fyldStil = useAnimatedStyle(() => ({
    opacity: withTiming(valgt ? 1 : 0, { duration: daempet ? 100 : 190 }),
    transform: [{ scale: withSpring(valgt ? 1 : 0.7, { damping: 15, stiffness: 240, mass: 0.5 }) }],
  }));

  return (
    <Pressable
      style={s.celle}
      onPress={tryk}
      accessibilityLabel={dato}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: valgt }}
    >
      <Animated.View style={[s.midte, boksStil]}>
        <Animated.View
          style={[s.fyld, { backgroundColor: t.accent }, fyldStil]}
          pointerEvents="none"
        />
        {!valgt && erIDag ? (
          <View style={[s.iDagRing, { borderColor: t.accent }]} pointerEvents="none" />
        ) : null}
        <Text
          style={[
            s.dagTekst,
            { color: valgt ? t.bg : fortid ? t.faint : t.text, fontWeight: valgt ? '600' : '400' },
          ]}
        >
          {parseInt(dato.slice(8), 10)}
        </Text>
      </Animated.View>
    </Pressable>
  );
}

const s = StyleSheet.create({
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  pil: { padding: 4 },
  titel: { fontSize: 16, fontWeight: '600', textAlign: 'center' },
  tael: { fontSize: 11, textAlign: 'center', marginTop: 1 },
  raekke: { flexDirection: 'row', marginTop: 10, marginBottom: 2 },
  ugedag: { flex: 1, textAlign: 'center', fontSize: 11 },
  gitter: { flexDirection: 'row', flexWrap: 'wrap' },
  celle: { width: '14.2857%', aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  midte: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  fyld: { position: 'absolute', width: 36, height: 36, borderRadius: 18 },
  iDagRing: { position: 'absolute', width: 36, height: 36, borderRadius: 18, borderWidth: 1.5 },
  dagTekst: { fontSize: 15, fontVariant: ['tabular-nums'] },
});
