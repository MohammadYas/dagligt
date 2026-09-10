import { useState } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { DB, Capture, uid } from '../store';
import { Theme } from '../theme';

type Props = { db: DB; update: (fn: (d: DB) => DB) => void; t: Theme };

export default function Fang({ db, update, t }: Props) {
  const [draft, setDraft] = useState('');
  const items = [...db.captures].sort((a, b) => b.ts - a.ts);

  function add() {
    const text = draft.trim();
    if (!text) return;
    const c: Capture = { id: uid(), text, ts: Date.now() };
    update((d) => ({ ...d, captures: [...d.captures, c] }));
    setDraft('');
  }

  function remove(id: string) {
    update((d) => ({ ...d, captures: d.captures.filter((x) => x.id !== id) }));
  }

  return (
    <ScrollView style={{ flex: 1 }} contentContainerStyle={s.pad} keyboardShouldPersistTaps="handled">
      <Text style={[s.h1, { color: t.text }]}>Indbakke</Text>

      <View style={s.row}>
        <TextInput
          style={[s.input, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
          placeholder="Skriv en tanke"
          placeholderTextColor={t.faint}
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={add}
          returnKeyType="done"
          autoFocus
        />
        <Pressable style={[s.addBtn, { backgroundColor: t.accent }]} onPress={add} accessibilityLabel="Gem tanke">
          <Ionicons name="add" size={22} color={t.bg} />
        </Pressable>
      </View>

      {items.length === 0 ? (
        <Text style={[s.emptyText, { color: t.faint }]}>Tom. Sådan skal den helst se ud sidst på dagen.</Text>
      ) : (
        items.map((x) => (
          <Pressable key={x.id} onLongPress={() => remove(x.id)} style={[s.item, { borderBottomColor: t.line }]}>
            <Text style={[s.itemText, { color: t.text }]}>{x.text}</Text>
            <Text style={[s.itemTime, { color: t.faint }]}>{naar(x.ts)}</Text>
          </Pressable>
        ))
      )}

      {items.length > 0 && <Text style={[s.hint, { color: t.faint }]}>Hold en linje inde for at slette.</Text>}
    </ScrollView>
  );
}

function naar(ts: number) {
  const min = Math.floor((Date.now() - ts) / 60000);
  if (min < 1) return 'nu';
  if (min < 60) return `${min} min siden`;
  const t = Math.floor(min / 60);
  if (t < 24) return `${t} t siden`;
  return `${Math.floor(t / 24)} d siden`;
}

const s = StyleSheet.create({
  pad: { padding: 20, paddingBottom: 40 },
  h1: { fontSize: 28, fontWeight: '600', marginBottom: 18 },
  row: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  input: { flex: 1, height: 46, borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, fontSize: 16 },
  addBtn: { width: 46, height: 46, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  item: { paddingVertical: 14, borderBottomWidth: 1 },
  itemText: { fontSize: 16 },
  itemTime: { fontSize: 12, marginTop: 3 },
  emptyText: { fontSize: 14, marginTop: 8, lineHeight: 20 },
  hint: { fontSize: 12, marginTop: 16 },
});
