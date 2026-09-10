import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { DB, dayKey, streak, lastDays } from '../store';
import { Theme } from '../theme';
import { Type, Tal } from '../type';

type Props = { db: DB; update: (fn: (d: DB) => DB) => void; t: Theme };

const MOODS = [
  { v: 1, label: 'Skidt' },
  { v: 2, label: 'Ok' },
  { v: 3, label: 'Godt' },
];

export default function Log({ db, update, t }: Props) {
  const key = dayKey();
  const iDag = db.logs.find((l) => l.date === key);
  const dage = lastDays(14);
  const snit = db.logs.length
    ? db.logs.reduce((a, l) => a + l.mood, 0) / db.logs.length
    : 0;

  function saet(mood: number) {
    update((d) => ({
      ...d,
      logs: [...d.logs.filter((l) => l.date !== key), { date: key, mood }],
    }));
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pad}>
      <Text style={[s.streakTal, { color: t.text }]}>{streak(db.logs)}</Text>
      <Text style={[s.streakOrd, { color: t.dim }]}>
        {streak(db.logs) === 1 ? 'dag i træk' : 'dage i træk'}
      </Text>

      <View style={[s.bi, { borderTopColor: t.line }]}>
        <Text style={[s.biTekst, { color: t.dim }]}>
          {db.logs.length} {db.logs.length === 1 ? 'dag logget' : 'dage logget'}
        </Text>
        <Text style={[s.biTekst, { color: t.dim }]}>
          snit {snit ? snit.toFixed(1) : '–'}
        </Text>
      </View>

      <Text style={[s.label, { color: t.dim }]}>Hvordan går det i dag?</Text>
      <View style={s.moodRow}>
        {MOODS.map((m) => {
          const valgt = iDag?.mood === m.v;
          return (
            <Pressable
              key={m.v}
              onPress={() => saet(m.v)}
              style={[
                s.mood,
                { backgroundColor: valgt ? t.accent : t.card, borderColor: valgt ? t.accent : t.line },
              ]}
            >
              <Text style={[s.moodText, { color: valgt ? t.bg : t.text }]}>{m.label}</Text>
            </Pressable>
          );
        })}
      </View>

      <Text style={[s.label, { color: t.dim, marginTop: 28 }]}>Sidste 14 dage</Text>
      <View style={s.chart}>
        {dage.map((d) => {
          const l = db.logs.find((x) => x.date === d);
          const h = l ? l.mood / 3 : 0;
          return (
            <View key={d} style={s.barSlot}>
              <View
                style={[
                  s.bar,
                  {
                    height: h ? Math.max(6, h * 72) : 4,
                    backgroundColor: l ? (d === key ? t.accent : t.accentBg) : t.line,
                  },
                ]}
              />
            </View>
          );
        })}
      </View>
      <View style={s.chartAxis}>
        <Text style={[s.axisText, { color: t.faint }]}>for 14 dage siden</Text>
        <Text style={[s.axisText, { color: t.faint }]}>i dag</Text>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 22, paddingTop: 30, paddingBottom: 40 },
  streakTal: { fontSize: 76, lineHeight: 80, fontWeight: '700', letterSpacing: -3, ...Tal },
  streakOrd: { ...Type.title3, marginTop: -2 },
  bi: { flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, marginTop: 22, paddingTop: 12 },
  biTekst: { ...Type.footnote, ...Tal },

  label: { ...Type.footnote, marginTop: 34, marginBottom: 10 },
  moodRow: { flexDirection: 'row', gap: 10 },
  mood: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moodText: { ...Type.subhead, fontWeight: '600' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 76 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 4, width: '100%' },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { ...Type.caption2 },
});
