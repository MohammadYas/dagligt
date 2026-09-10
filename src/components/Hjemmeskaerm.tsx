import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../theme';
import { Type } from '../type';
import { erWeb } from '../adgang';

/**
 * Vises kun i browseren, og kun naar siden ikke allerede koerer som app.
 * Safari har ingen installationsknap en side kan kalde — brugeren skal
 * selv gennem Del-menuen — saa vejledningen er det eneste vi kan give.
 */
function koererSomApp(): boolean {
  try {
    const w = globalThis as any;
    if (w.navigator?.standalone === true) return true;
    return Boolean(w.matchMedia?.('(display-mode: standalone)')?.matches);
  } catch {
    return false;
  }
}

const TRIN = [
  { ikon: 'share-outline', tekst: 'Tryk på Del-knappen nederst i Safari' },
  { ikon: 'add-circle-outline', tekst: 'Vælg «Føj til hjemmeskærm»' },
  { ikon: 'checkmark-circle-outline', tekst: 'Tryk Tilføj. Så ligger den som en app' },
];

export default function Hjemmeskaerm({ t }: { t: Theme }) {
  if (!erWeb || koererSomApp()) return null;

  return (
    <View>
      <Text style={[s.overskrift, { color: t.text }]}>Læg den på hjemmeskærmen</Text>
      <Text style={[s.under, { color: t.dim }]}>
        Så åbner den uden adresselinje, husker adgangskoden, og virker uden net til det
        meste.
      </Text>

      {TRIN.map((trin, i) => (
        <View key={trin.tekst} style={[s.trin, { borderTopColor: t.line }]}>
          <Text style={[s.nummer, { color: t.faint }]}>{i + 1}</Text>
          <Ionicons name={trin.ikon as any} size={19} color={t.accent} />
          <Text style={[s.tekst, { color: t.text }]}>{trin.tekst}</Text>
        </View>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  overskrift: { ...Type.title3, marginTop: 34 },
  under: { ...Type.footnote, marginTop: 4, marginBottom: 8 },
  trin: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13, borderTopWidth: 1 },
  nummer: { ...Type.footnote, width: 12 },
  tekst: { ...Type.subhead, flex: 1 },
});
