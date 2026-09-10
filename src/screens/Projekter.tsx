import { useState } from 'react';
import { View, Text, Pressable, ScrollView, StyleSheet, ActivityIndicator } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons } from '@expo/vector-icons';
import { PROJEKTER, Projekt } from '../projekter';
import { Theme } from '../theme';

export default function Projekter({ t }: { t: Theme }) {
  const [aaben, setAaben] = useState<Projekt | null>(null);

  if (aaben) {
    return (
      <View style={{ flex: 1 }}>
        <View style={[s.bar, { borderBottomColor: t.line, backgroundColor: t.card }]}>
          <Pressable onPress={() => setAaben(null)} style={s.back} accessibilityLabel="Tilbage">
            <Ionicons name="chevron-back" size={22} color={t.accent} />
            <Text style={[s.backText, { color: t.accent }]}>Projekter</Text>
          </Pressable>
          <Text style={[s.barTitle, { color: t.text }]} numberOfLines={1}>
            {aaben.navn}
          </Text>
        </View>
        <WebView
          source={{ uri: aaben.url }}
          style={{ flex: 1, backgroundColor: t.bg }}
          startInLoadingState
          renderLoading={() => (
            <View style={[s.center, { backgroundColor: t.bg }]}>
              <ActivityIndicator color={t.accent} />
            </View>
          )}
        />
      </View>
    );
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pad}>
      <Text style={[s.h1, { color: t.text }]}>Projekter</Text>

      {PROJEKTER.map((p) => {
        const klar = p.url.length > 0;
        return (
          <Pressable
            key={p.id}
            disabled={!klar}
            onPress={() => setAaben(p)}
            style={[s.kort, { backgroundColor: t.card, borderColor: t.line, opacity: klar ? 1 : 0.55 }]}
          >
            <View style={[s.ikon, { backgroundColor: t.accentBg }]}>
              <Ionicons name={p.ikon as any} size={20} color={t.accent} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[s.navn, { color: t.text }]}>{p.navn}</Text>
              <Text style={[s.beskrivelse, { color: t.dim }]}>
                {klar ? p.beskrivelse : 'Mangler adresse'}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={t.faint} />
          </Pressable>
        );
      })}

      <Text style={[s.hint, { color: t.faint }]}>
        Adresser sættes i src/projekter.ts. Uden adresse kan et projekt ikke åbnes.
      </Text>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: '600', marginBottom: 18 },
  kort: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  ikon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  navn: { fontSize: 16, fontWeight: '500' },
  beskrivelse: { fontSize: 13, marginTop: 2 },
  hint: { fontSize: 12, marginTop: 10, lineHeight: 18 },
  bar: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  back: { flexDirection: 'row', alignItems: 'center' },
  backText: { fontSize: 16 },
  barTitle: { fontSize: 15, fontWeight: '500', flex: 1, textAlign: 'right' },
  center: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center' },
});
