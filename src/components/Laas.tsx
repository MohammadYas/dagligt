import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { Theme } from '../theme';
import { Type } from '../type';
import { saetAdgang } from '../adgang';

/**
 * Vises kun paa web, og kun hvis koden mangler. Normalt kommer den ind
 * gennem linkets fragment, saa denne skaerm er reserven — hvis lageret
 * er ryddet, eller hvis genvejen aabnes paa en anden telefon.
 */
export default function Laas({ t, aabnet }: { t: Theme; aabnet: () => void }) {
  const [kode, setKode] = useState('');

  function proev() {
    if (!kode.trim()) return;
    saetAdgang(kode);
    aabnet();
  }

  return (
    <View style={[s.rum, { backgroundColor: t.bg }]}>
      <Text accessibilityRole="header" style={[s.titel, { color: t.text }]}>VagtStatus</Text>
      <Text style={[s.tekst, { color: t.dim }]}>
        Åbn linket du fik, så husker telefonen koden. Har du den skrevet ned, kan du
        indsætte den her i stedet.
      </Text>

      <TextInput
        accessibilityLabel="Adgangskode"
        secureTextEntry
        style={[s.felt, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
        placeholder="Adgangskode"
        placeholderTextColor={t.faint}
        value={kode}
        onChangeText={setKode}
        autoCapitalize="none"
        autoCorrect={false}
        onSubmitEditing={proev}
        returnKeyType="go"
      />

      <Pressable
        accessibilityRole="button"
        disabled={!kode.trim()}
        accessibilityState={{ disabled: !kode.trim() }}
        onPress={proev}
        style={[s.knap, { backgroundColor: kode.trim() ? t.accent : t.cardAlt }]}
      >
        <Text style={[s.knapTekst, { color: kode.trim() ? t.bg : t.faint }]}>Lås op</Text>
      </Pressable>
    </View>
  );
}

const s = StyleSheet.create({
  rum: { flex: 1, justifyContent: 'center', paddingHorizontal: 24, maxWidth: 520, width: '100%', alignSelf: 'center' },
  titel: { ...Type.largeTitle, marginBottom: 10 },
  tekst: { ...Type.subhead, marginBottom: 26 },
  felt: { minHeight: 52, borderRadius: 12, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 12, ...Type.body },
  knap: { minHeight: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 14 },
  knapTekst: { ...Type.callout, fontWeight: '600' },
});
