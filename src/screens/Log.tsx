import { View, Text, Pressable, ScrollView, StyleSheet } from 'react-native';
import { DB, dayKey, streak, lastDays } from '../store';
import { Theme } from '../theme';

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
      <Text style={[s.h1, { color: t.text }]}>Log</Text>

      <View style={s.stats}>
        <Stat t={t} label="Streak" value={String(streak(db.logs))} />
        <Stat t={t} label="Dage logget" value={String(db.logs.length)} />
        <Stat t={t} label="Snit" value={snit ? snit.toFixed(1) : '–'} />
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

function Stat({ t, label, value }: { t: Theme; label: string; value: string }) {
  return (
    <View style={[s.statCard, { backgroundColor: t.cardAlt }]}>
      <Text style={[s.statLabel, { color: t.dim }]}>{label}</Text>
      <Text style={[s.statValue, { color: t.text }]}>{value}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: '600', marginBottom: 20 },
  stats: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  statCard: { flex: 1, borderRadius: 12, padding: 14, alignItems: 'center' },
  statLabel: { fontSize: 12 },
  statValue: { fontSize: 22, fontWeight: '600', marginTop: 3 },
  label: { fontSize: 13, marginBottom: 10 },
  moodRow: { flexDirection: 'row', gap: 10 },
  mood: { flex: 1, height: 48, borderRadius: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  moodText: { fontSize: 15, fontWeight: '500' },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 5, height: 76 },
  barSlot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderRadius: 4, width: '100%' },
  chartAxis: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  axisText: { fontSize: 11 },
});
