import { useEffect, useState } from 'react';
import {
  View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator, Platform, Linking,
} from 'react-native';
import { WebView } from 'react-native-webview';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { PROJEKTER, Projekt } from '../projekter';
import { Theme } from '../theme';
import { Type } from '../type';
import Puls from '../components/Puls';

// Paa web bliver WebView til en iframe, og begge sites saetter
// X-Frame-Options: DENY. Der er kun én vej ind: en rigtig fane.
const KAN_INDLEJRE = Platform.OS !== 'web';

type Liv = 'ukendt' | 'oppe' | 'nede';

export default function Projekter({ t }: { t: Theme }) {
  const [aaben, setAaben] = useState<Projekt | null>(null);
  const [fejlede, setFejlede] = useState(false);
  const [liv, setLiv] = useState<Record<string, Liv>>({});
  const [slag, setSlag] = useState(0);

  useEffect(() => {
    let afbrudt = false;
    (async () => {
      for (const p of PROJEKTER) {
        try {
          // Ingen noegle, ingen data. Vi spoerger kun om sitet svarer.
          await fetch('https://' + p.domaene, { method: 'GET', mode: 'no-cors' as RequestMode });
          if (!afbrudt) setLiv((l) => ({ ...l, [p.id]: 'oppe' }));
        } catch {
          if (!afbrudt) setLiv((l) => ({ ...l, [p.id]: 'nede' }));
        }
      }
      if (!afbrudt) setSlag((n) => n + 1);
    })();
    return () => {
      afbrudt = true;
    };
  }, []);

  function aabnUdenfor(p: Projekt) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(p.url);
  }

  function aabn(p: Projekt) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (!KAN_INDLEJRE) {
      Linking.openURL(p.url);
      return;
    }
    setFejlede(false);
    setAaben(p);
  }

  if (aaben) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[s.bar, { borderBottomColor: t.line }]}>
          <Pressable onPress={() => setAaben(null)} style={s.tilbage} hitSlop={8}>
            <Ionicons name="chevron-back" size={20} color={t.accent} />
            <Text style={[s.tilbageTekst, { color: t.accent }]}>Projekter</Text>
          </Pressable>

          <Text style={[s.barTitel, { color: t.text }]} numberOfLines={1}>
            {aaben.navn}
          </Text>

          <Pressable onPress={() => aabnUdenfor(aaben)} hitSlop={8} accessibilityLabel="Åbn i Safari">
            <Ionicons name="open-outline" size={19} color={t.accent} />
          </Pressable>
        </View>

        {fejlede ? (
          <View style={s.midt}>
            <Text style={[s.fejlTitel, { color: t.text }]}>Siden ville ikke indlæses</Text>
            <Text style={[s.fejlTekst, { color: t.dim }]}>
              {aaben.navn} tillader måske ikke visning inde i en app. Åbn den i Safari — din
              login-session følger med.
            </Text>
            <Pressable
              onPress={() => aabnUdenfor(aaben)}
              style={[s.knap, { backgroundColor: t.accent }]}
            >
              <Text style={[s.knapTekst, { color: t.bg }]}>Åbn i Safari</Text>
            </Pressable>
          </View>
        ) : (
          <WebView
            source={{ uri: aaben.url }}
            style={{ flex: 1, backgroundColor: t.bg }}
            startInLoadingState
            sharedCookiesEnabled
            domStorageEnabled
            allowsBackForwardNavigationGestures
            onError={() => setFejlede(true)}
            onHttpError={(e) => {
              if (e.nativeEvent.statusCode >= 400) setFejlede(true);
            }}
            renderLoading={() => (
              <View style={[s.indlaeser, { backgroundColor: t.bg }]}>
                <ActivityIndicator color={t.accent} />
              </View>
            )}
          />
        )}
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pad}>
      <Text style={[s.h1, { color: t.text }]}>Projekter</Text>

      {PROJEKTER.map((p, i) => (
        <Animated.View key={p.id} entering={FadeInDown.delay(i * 60).duration(280)}>
          <Pressable
            onPress={() => aabn(p)}
            style={({ pressed }) => [s.raekke, { borderTopColor: t.line, opacity: pressed ? 0.55 : 1 }]}
            accessibilityRole="link"
            accessibilityLabel={p.navn + ', ' + p.beskrivelse}
          >
            <Puls
              farve={liv[p.id] === 'nede' ? '#E24B4A' : liv[p.id] === 'oppe' ? t.done : t.faint}
              slag={slag}
              daempet={false}
            />
            <View style={{ flex: 1 }}>
              <Text style={[s.navn, { color: t.text }]}>{p.navn}</Text>
              <Text style={[s.under, { color: t.dim }]}>{p.beskrivelse}</Text>
              <Text style={[s.domaene, { color: t.faint }]}>{p.domaene}</Text>
            </View>
            <Ionicons
              name={KAN_INDLEJRE ? 'chevron-forward' : 'open-outline'}
              size={17}
              color={t.faint}
            />
          </Pressable>
        </Animated.View>
      ))}

      <Animated.Text entering={FadeIn.delay(200)} style={[s.fod, { color: t.faint }]}>
        {KAN_INDLEJRE
          ? 'Åbner inde i appen. Ikonet øverst til højre sender siden videre til Safari.'
          : 'Browseren kan ikke vise dem indlejret, så de åbner i en ny fane.'}
      </Animated.Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 22, paddingTop: 18, paddingBottom: 44 },
  h1: { ...Type.largeTitle, marginBottom: 14 },

  raekke: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 18, borderTopWidth: 1 },
  navn: { ...Type.title3 },
  under: { ...Type.footnote, marginTop: 2 },
  domaene: { ...Type.caption2, marginTop: 3 },
  fod: { ...Type.caption1, marginTop: 20 },

  bar: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 1,
  },
  tilbage: { flexDirection: 'row', alignItems: 'center' },
  tilbageTekst: { ...Type.body },
  barTitel: { ...Type.subhead, fontWeight: '600', flex: 1, textAlign: 'center' },

  indlaeser: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },

  midt: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 28 },
  fejlTitel: { ...Type.title3, marginBottom: 8 },
  fejlTekst: { ...Type.subhead, marginBottom: 22 },
  knap: { height: 46, borderRadius: 23, paddingHorizontal: 26, alignItems: 'center', justifyContent: 'center' },
  knapTekst: { ...Type.callout, fontWeight: '600' },
});
