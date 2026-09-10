import { useEffect, useMemo, useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, AccessibilityInfo } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DB, Task, dayKey, uid, longDate, greeting } from '../store';
import { Theme } from '../theme';
import { Type } from '../type';
import Brief from '../components/Brief';

type Props = { db: DB; update: (fn: (d: DB) => DB) => void; t: Theme; navn: string };

export default function Dag({ db, update, t, navn }: Props) {
  const [draft, setDraft] = useState('');
  const [daempet, setDaempet] = useState(false);

  useEffect(() => {
    AccessibilityInfo.isReduceMotionEnabled().then(setDaempet);
  }, []);
  const key = dayKey();
  const tasks = useMemo(() => db.tasks.filter((x) => x.date === key), [db.tasks, key]);
  const done = tasks.filter((x) => x.done).length;

  function add() {
    const text = draft.trim();
    if (!text) return;
    const task: Task = { id: uid(), text, done: false, date: key };
    update((d) => ({ ...d, tasks: [...d.tasks, task] }));
    setDraft('');
  }

  function toggle(id: string) {
    update((d) => ({ ...d, tasks: d.tasks.map((x) => (x.id === id ? { ...x, done: !x.done } : x)) }));
  }

  function remove(id: string) {
    update((d) => ({ ...d, tasks: d.tasks.filter((x) => x.id !== id) }));
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={[s.date, { color: t.faint }]}>{longDate()}</Text>
      <Text style={[s.h1, { color: t.text }]}>
        {greeting()}, {navn}
      </Text>

      <Brief db={db} t={t} daempet={daempet} />

      <View style={s.row}>
        <TextInput
          style={[s.input, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
          placeholder="Hvad skal der ske i dag?"
          placeholderTextColor={t.faint}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
        />
        <Pressable style={[s.addBtn, { backgroundColor: t.accent }]} onPress={add} accessibilityLabel="Tilføj opgave">
          <Ionicons name="add" size={22} color={t.bg} />
        </Pressable>
      </View>

      {tasks.length === 0 ? (
        <Text style={[s.emptyText, { color: t.faint }]}>Ingen opgaver endnu. Skriv den første ovenfor.</Text>
      ) : (
        tasks.map((x) => (
          <Pressable
            key={x.id}
            onPress={() => toggle(x.id)}
            onLongPress={() => remove(x.id)}
            style={[s.task, { borderBottomColor: t.line }]}
          >
            <Ionicons
              name={x.done ? 'checkbox' : 'square-outline'}
              size={22}
              color={x.done ? t.done : t.faint}
            />
            <Text
              style={[
                s.taskText,
                { color: x.done ? t.faint : t.text },
                x.done && { textDecorationLine: 'line-through' },
              ]}
            >
              {x.text}
            </Text>
          </Pressable>
        ))
      )}

      {tasks.length > 0 && (
        <Text style={[s.hint, { color: t.faint }]}>Tryk for at krydse af. Hold inde for at slette.</Text>
      )}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  date: { ...Type.footnote },
  h1: { ...Type.largeTitle, marginTop: 2, marginBottom: 18 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  input: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, ...Type.body },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  task: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1 },
  taskText: { ...Type.callout, flex: 1 },
  emptyText: { ...Type.subhead, marginTop: 8 },
  hint: { ...Type.caption1, marginTop: 16 },
});
