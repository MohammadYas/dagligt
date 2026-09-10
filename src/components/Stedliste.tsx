import { useState } from 'react';
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
import { Sted } from '../vagter';
import { GRUPPER } from '../steder';

type Props = {
  steder: Sted[];
  skift: (navn: string) => void;
  saetGruppe: (navne: string[], aktiv: boolean) => void;
  t: Theme;
  daempet: boolean;
};

export default function Stedliste({ steder, skift, saetGruppe, t, daempet }: Props) {
  const kendte = new Set(GRUPPER.flatMap((g) => g.steder.map((x) => x.navn)));
  const ukendte = steder.filter((x) => !kendte.has(x.navn));

  return (
    <View>
      {GRUPPER.map((g, i) => (
        <Gruppe
          key={g.adresse}
          adresse={g.adresse}
          by={g.by}
          note={g.note}
          navne={g.steder.map((x) => x.navn)}
          steder={steder}
          skift={skift}
          saetGruppe={saetGruppe}
          t={t}
          daempet={daempet}
          forsinkelse={i * 45}
        />
      ))}

      {ukendte.length > 0 ? (
        <Gruppe
          adresse="Øvrige"
          by="fra filen, ikke i oversigten"
          navne={ukendte.map((x) => x.navn)}
          steder={steder}
          skift={skift}
          saetGruppe={saetGruppe}
          t={t}
          daempet={daempet}
          forsinkelse={GRUPPER.length * 45}
        />
      ) : null}
    </View>
  );
}

function Gruppe({
  adresse, by, note, navne, steder, skift, saetGruppe, t, daempet, forsinkelse,
}: {
  adresse: string; by: string; note?: string; navne: string[];
  steder: Sted[]; skift: (n: string) => void;
  saetGruppe: (n: string[], a: boolean) => void;
  t: Theme; daempet: boolean; forsinkelse: number;
}) {
  const aktive = navne.filter((n) => steder.find((x) => x.navn === n)?.aktiv).length;
  const [aaben, setAaben] = useState(aktive > 0);
  const drej = useSharedValue(aktive > 0 ? 1 : 0);

  function fold() {
    Haptics.selectionAsync();
    const ny = !aaben;
    setAaben(ny);
    drej.value = daempet
      ? withTiming(ny ? 1 : 0, { duration: 120 })
      : withSpring(ny ? 1 : 0, { damping: 16, stiffness: 220 });
  }

  const pilStil = useAnimatedStyle(() => ({
    transform: [{ rotate: drej.value * 90 + 'deg' }],
  }));

  const alle = aktive === navne.length;

  return (
    <Animated.View
      entering={daempet ? undefined : FadeIn.delay(forsinkelse).duration(260)}
      style={[s.gruppe, { borderColor: t.line }]}
    >
      <Pressable
        onPress={fold}
        style={s.hoved}
        accessibilityRole="button"
        accessibilityState={{ expanded: aaben }}
      >
        <Animated.View style={pilStil}>
          <Ionicons name="chevron-forward" size={16} color={t.faint} />
        </Animated.View>

        <View style={s.hovedTekst}>
          <Text style={[s.adresse, { color: t.text }]}>{adresse}</Text>
          <Text style={[s.by, { color: t.faint }]}>{by}</Text>
        </View>

        <Text style={[s.tael, { color: aktive > 0 ? t.accent : t.faint }]}>
          {aktive}/{navne.length}
        </Text>
      </Pressable>

      {aaben ? (
        <View>
          {note ? (
            <View style={[s.note, { backgroundColor: t.cardAlt }]}>
              <Ionicons name="car-outline" size={14} color={t.dim} />
              <Text style={[s.noteTekst, { color: t.dim }]}>{note}</Text>
            </View>
          ) : null}

          {navne.map((navn) => {
            const sted = steder.find((x) => x.navn === navn);
            return (
              <Raekke
                key={navn}
                navn={navn}
                aktiv={Boolean(sted?.aktiv)}
                skift={skift}
                t={t}
                daempet={daempet}
              />
            );
          })}

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              saetGruppe(navne, !alle);
            }}
            style={s.alleKnap}
          >
            <Text style={[s.alleTekst, { color: t.accent }]}>
              {alle ? 'Fravælg alle her' : 'Vælg alle her'}
            </Text>
          </Pressable>
        </View>
      ) : null}
    </Animated.View>
  );
}

function Raekke({
  navn, aktiv, skift, t, daempet,
}: { navn: string; aktiv: boolean; skift: (n: string) => void; t: Theme; daempet: boolean }) {
  const skala = useSharedValue(1);

  function tryk() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!daempet) {
      skala.value = withSpring(1.22, { damping: 11, stiffness: 520 }, (faerdig) => {
        if (faerdig) skala.value = withSpring(1, { damping: 12, stiffness: 300 });
      });
    }
    skift(navn);
  }

  const boksStil = useAnimatedStyle(() => ({ transform: [{ scale: skala.value }] }));

  return (
    <Pressable
      onPress={tryk}
      style={[s.raekke, { borderTopColor: t.line }]}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={navn}
    >
      <Animated.View style={boksStil}>
        <Ionicons
          name={aktiv ? 'checkbox' : 'square-outline'}
          size={21}
          color={aktiv ? t.accent : t.faint}
        />
      </Animated.View>
      <Text style={[s.navn, { color: aktiv ? t.text : t.dim }]}>{navn}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  gruppe: { borderWidth: 1, borderRadius: 13, marginBottom: 10, overflow: 'hidden' },
  hoved: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14 },
  hovedTekst: { flex: 1 },
  adresse: { fontSize: 15, fontWeight: '600' },
  by: { fontSize: 12, marginTop: 1 },
  tael: { fontSize: 13, fontWeight: '600', fontVariant: ['tabular-nums'] },

  note: { flexDirection: 'row', gap: 7, alignItems: 'flex-start', marginHorizontal: 12, marginBottom: 6, padding: 10, borderRadius: 9 },
  noteTekst: { fontSize: 12, flex: 1, lineHeight: 17 },

  raekke: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 12, paddingHorizontal: 14, borderTopWidth: 1 },
  navn: { fontSize: 15, flex: 1 },

  alleKnap: { paddingVertical: 12, paddingHorizontal: 14 },
  alleTekst: { fontSize: 13, fontWeight: '500' },
});
