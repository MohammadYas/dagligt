import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dark as t } from '../../theme';
import { Type, Tal } from '../../type';
import { kalenderAnker } from '../../datoanker';

const MAANEDER = ['januar', 'februar', 'marts', 'april', 'maj', 'juni', 'juli', 'august', 'september', 'oktober', 'november', 'december'];
const UGEDAGE = ['ma', 'ti', 'on', 'to', 'fr', 'lø', 'sø'];
const dagKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const danskDato = (key: string) => new Date(`${key}T12:00:00`).toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

/** Inline kalender, så datoer vælges med et tryk i stedet for tekstformat. */
export default function DatoInput({ value = '', selected = [], onChange }: { value?: string; selected?: string[]; onChange: (value: string) => void }) {
  // Aabn paa den naermeste relevante maaned: en valgt dato i dag/fremtiden,
  // ellers denne maaned. Den gamle version brugte selected[0], som ofte er en
  // gammel septemberdato – saa man skulle klikke flere maaneder frem.
  const iDag = dagKey(new Date());
  const anchor = kalenderAnker(value, selected, iDag);
  const start = new Date(`${anchor}T12:00:00`);
  const [aar, setAar] = useState(start.getFullYear());
  const [maaned, setMaaned] = useState(start.getMonth());
  const celler = useMemo(() => {
    const foerste = new Date(aar, maaned, 1);
    const spring = (foerste.getDay() + 6) % 7;
    const antal = new Date(aar, maaned + 1, 0).getDate();
    const ud: (string | null)[] = Array.from({ length: spring }, () => null);
    for (let dag = 1; dag <= antal; dag++) ud.push(dagKey(new Date(aar, maaned, dag)));
    return ud;
  }, [aar, maaned]);
  const flyt = (retning: number) => {
    const næste = new Date(aar, maaned + retning, 1);
    setAar(næste.getFullYear()); setMaaned(næste.getMonth());
  };
  return <View style={s.wrap} accessibilityLabel="Vælg en dato i kalenderen">
    <View style={s.top}>
      <Pressable onPress={() => flyt(-1)} accessibilityRole="button" accessibilityLabel="Forrige måned" style={s.pil}><Ionicons name="chevron-back" size={21} color={t.accent} /></Pressable>
      <View style={s.month}><Text style={[Type.headline, { color: t.text, textAlign: 'center' }]}>{MAANEDER[maaned]} {aar}</Text><Text style={[Type.footnote, { color: t.faint, textAlign: 'center' }]}>{selected.length ? `${selected.length} valgte dage` : 'Ingen valgte dage endnu'}</Text></View>
      <Pressable onPress={() => flyt(1)} accessibilityRole="button" accessibilityLabel="Næste måned" style={s.pil}><Ionicons name="chevron-forward" size={21} color={t.accent} /></Pressable>
    </View>
    <View style={s.week}>{UGEDAGE.map(dag => <Text key={dag} style={[s.weekday, { color: t.faint }]}>{dag}</Text>)}</View>
    <View style={s.grid}>{celler.map((key, index) => key ? <Pressable key={key} onPress={() => onChange(key)} accessibilityRole="button" accessibilityLabel={danskDato(key)} accessibilityState={{ selected: selected.includes(key) || value === key }} style={s.cell}>
      <View style={[s.day, (selected.includes(key) || value === key) && { backgroundColor: t.accent }, key === iDag && !selected.includes(key) && key !== value && { borderWidth: 1.5, borderColor: t.accent }]}><Text style={[Type.callout, Tal, { color: selected.includes(key) || value === key ? t.bg : t.text, fontWeight: selected.includes(key) || value === key ? '700' : '400' }]}>{Number(key.slice(8))}</Text></View>
    </Pressable> : <View key={`tom-${index}`} style={s.cell} />)}</View>
  </View>;
}

const s = StyleSheet.create({
  wrap: { width: '100%', gap: 8 },
  top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  month: { flex: 1, minWidth: 0, gap: 2 },
  pil: { width: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 12 },
  week: { flexDirection: 'row', marginTop: 4 },
  weekday: { flex: 1, textAlign: 'center', ...Type.caption1, fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.2857%', minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  day: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
