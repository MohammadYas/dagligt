import { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
  useSharedValue, useAnimatedStyle, withSpring, withTiming, FadeIn,
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

  const grupper = [
    ...GRUPPER.map((g) => ({
      adresse: g.adresse,
      by: g.by,
      note: g.note,
      navne: g.steder.map((x) => x.navn),
    })),
    ...(ukendte.length
      ? [{ adresse: 'Øvrige', by: 'kun i filen', note: undefined, navne: ukendte.map((x) => x.navn) }]
      : []),
  ];

  return (
    <View>
      {grupper.map((g) => (
        <Gruppe
          key={g.adresse}
          {...g}
          steder={steder}
          skift={skift}
          saetGruppe={saetGruppe}
          t={t}
          daempet={daempet}
        />
      ))}
    </View>
  );
}

function Gruppe({
  adresse, by, note, navne, steder, skift, saetGruppe, t, daempet,
}: {
  adresse: string; by: string; note?: string; navne: string[];
  steder: Sted[]; skift: (n: string) => void;
  saetGruppe: (n: string[], a: boolean) => void;
  t: Theme; daempet: boolean;
}) {
  // Alle grupper starter foldet. Taellingen fortaeller hvad der ligger indeni.
  const [aaben, setAaben] = useState(false);
  const drej = useSharedValue(0);

  const aktive = navne.filter((n) => steder.find((x) => x.navn === n)?.aktiv).length;
  const alle = aktive === navne.length;

  function fold() {
    Haptics.selectionAsync();
    const ny = !aaben;
    setAaben(ny);
    drej.value = daempet
      ? withTiming(ny ? 1 : 0, { duration: 110 })
      : withSpring(ny ? 1 : 0, { damping: 16, stiffness: 240 });
  }

  const pilStil = useAnimatedStyle(() => ({
    transform: [{ rotate: drej.value * 90 + 'deg' }],
  }));

  return (
    <View style={[s.gruppe, { borderTopColor: t.line }]}>
      <Pressable
        onPress={fold}
        style={s.hoved}
        accessibilityRole="button"
        accessibilityState={{ expanded: aaben }}
        accessibilityLabel={adresse + ', ' + aktive + ' af ' + navne.length + ' valgt'}
      >
        <Animated.View style={pilStil}>
          <Ionicons name="chevron-forward" size={15} color={t.faint} />
        </Animated.View>
        <Text style={[s.adresse, { color: t.text }]}>{adresse}</Text>
        <Text style={[s.by, { color: t.faint }]}>{by}</Text>
        <Text style={[s.tael, { color: aktive ? t.text : t.faint }]}>
          {aktive}/{navne.length}
        </Text>
      </Pressable>

      {aaben ? (
        <Animated.View entering={daempet ? undefined : FadeIn.duration(160)} style={s.krop}>
          {note ? <Text style={[s.note, { color: t.dim }]}>{note}</Text> : null}

          {navne.map((navn) => (
            <Raekke
              key={navn}
              navn={navn}
              aktiv={Boolean(steder.find((x) => x.navn === navn)?.aktiv)}
              skift={skift}
              t={t}
              daempet={daempet}
            />
          ))}

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              saetGruppe(navne, !alle);
            }}
            style={s.alle}
          >
            <Text style={[s.alleTekst, { color: t.accent }]}>
              {alle ? 'Fravælg alle her' : 'Vælg alle her'}
            </Text>
          </Pressable>
        </Animated.View>
      ) : null}
    </View>
  );
}

function Raekke({
  navn, aktiv, skift, t, daempet,
}: { navn: string; aktiv: boolean; skift: (n: string) => void; t: Theme; daempet: boolean }) {
  const skala = useSharedValue(1);

  function tryk() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!daempet) {
      skala.value = withSpring(1.25, { damping: 11, stiffness: 540 }, (f) => {
        if (f) skala.value = withSpring(1, { damping: 12, stiffness: 300 });
      });
    }
    skift(navn);
  }

  const boks = useAnimatedStyle(() => ({ transform: [{ scale: skala.value }] }));

  return (
    <Pressable
      onPress={tryk}
      style={s.raekke}
      accessibilityRole="checkbox"
      accessibilityState={{ checked: aktiv }}
      accessibilityLabel={navn}
    >
      <Animated.View style={boks}>
        <Ionicons
          name={aktiv ? 'checkmark-circle' : 'ellipse-outline'}
          size={20}
          color={aktiv ? t.accent : t.faint}
        />
      </Animated.View>
      <Text style={[s.navn, { color: aktiv ? t.text : t.dim }]}>{navn}</Text>
    </Pressable>
  );
}

const s = StyleSheet.create({
  gruppe: { borderTopWidth: 1 },
  hoved: { flexDirection: 'row', alignItems: 'baseline', gap: 9, paddingVertical: 15 },
  adresse: { fontSize: 15.5, fontWeight: '500' },
  by: { fontSize: 12, flex: 1 },
  tael: { fontSize: 13, fontVariant: ['tabular-nums'] },

  krop: { paddingBottom: 6 },
  note: { fontSize: 12.5, lineHeight: 18, marginLeft: 24, marginBottom: 8 },

  raekke: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, marginLeft: 24 },
  navn: { fontSize: 15, flex: 1 },

  alle: { marginLeft: 24, paddingVertical: 10 },
  alleTekst: { fontSize: 13.5 },
});
