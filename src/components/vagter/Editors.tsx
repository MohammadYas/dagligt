import { ReactNode, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { VagtSession } from '../../vagtsession';
import { Dage, FilKey, VagtData, navn, normaliser } from '../../vagtdata';
import { alleNavne, gruppeFor } from '../../steder';
import { dark as t } from '../../theme';
import { Action, Field, Group, IconButton, layout, Notice, Toggle, spaceActivation } from '../ArbejdeUI';
import DatoInput from './DatoInput';
import Traek from './Traek';

export function Resource({ session, id, children }: { session: VagtSession; id: FilKey; children: ReactNode }) {
  const entry = session.get(id);
  const initial: VagtData = { kontrol: { cas: false, torn: false }, cas: { datoer: [], steder: [] }, torn: { datoer: [], steder: [] }, bureauer: [], par: [] };
  if (entry.loading && !entry.draft) return <View style={layout.row}><ActivityIndicator color={t.accent} /><Text style={layout.secondary}>Henter indstillinger…</Text></View>;
  return <View style={{ gap: 16 }}>{entry.error && !entry.draft && <><Notice error text={entry.error} /><Action label="Prøv igen" onPress={() => session.load(id)} />{entry.missing && <Action label={id === 'kontrol' ? 'Opret kontakter, begge slået fra' : 'Opret indstillinger'} onPress={() => session.initialize(id, initial[id])} />}</>}{entry.draft ? children : !entry.error && <Notice text="Henter indstillinger…" />}</View>;
}
const samlet = (cas: Dage, torn: Dage): Dage => ({
  datoer: [...new Set([...cas.datoer, ...torn.datoer])].sort(),
  steder: [...new Map([...cas.steder, ...torn.steder].map(n => [normaliser(n), n])).values()],
});

export function Wishes({ session }: { session: VagtSession }) {
  const [query, setQuery] = useState('');
  const [newName, setNewName] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState('');
  const [custom, setCustom] = useState<string[]>([]);
  const cas = session.get('cas').draft;
  const torn = session.get('torn').draft;
  const value = cas && torn ? samlet(cas, torn) : undefined;
  const names = Array.from(new Map([...alleNavne(), ...session.knownPlaces, ...custom].map(n => [normaliser(n), n])).values());
  const selected = new Set(value?.steder.map(normaliser));
  // Booking-kriterierne må aldrig ligge som en glemt kladde: gem kort efter
  // sidste tryk, og gem med det samme når skærmen forlades.
  const autoSave = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleSave = () => {
    if (autoSave.current) clearTimeout(autoSave.current);
    autoSave.current = setTimeout(() => {
      autoSave.current = null;
      void session.save();
    }, 800);
  };
  useEffect(() => () => {
    if (autoSave.current) {
      clearTimeout(autoSave.current);
      autoSave.current = null;
    }
    if (session.dirtyKeys.length) void session.save();
  }, [session]);
  const editBoth = (next: Dage) => {
    session.edit('cas', next);
    session.edit('torn', next);
  };
  const choose = (n: string) => {
    if (!value) return;
    editBoth({ ...value, steder: selected.has(normaliser(n)) ? value.steder.filter(s => normaliser(s) !== normaliser(n)) : [...value.steder, n] });
    scheduleSave();
  };
  const toggleDate = (d: string) => {
    if (!value) return;
    const datoer = value.datoer.includes(d) ? value.datoer.filter(x => x !== d) : [...value.datoer, d].sort();
    editBoth({ ...value, datoer });
    scheduleSave();
    setError('');
  };
  const groups = new Map<string, string[]>();
  for (const n of names.filter(n => normaliser(n).includes(normaliser(query)))) {
    const g = gruppeFor(n); const title = g ? `${g.by.split(' ').slice(1).join(' ')} · ${g.adresse}` : 'Øvrige steder';
    groups.set(title, [...(groups.get(title) ?? []), n]);
  }
  return <Resource session={session} id="cas"><Resource session={session} id="torn">
      {value && <>
        <Group title="Dage" help={value.datoer.length ? `${value.datoer.length} valgte dage for CAS og TØRN. Tryk på en blå dag for at fjerne den – ændringen gemmes automatisk.` : 'Ingen valgte dage betyder, at alle datoer tillades i begge systemer. Ændringer gemmes automatisk.'}>
          <View style={{ padding: 16 }}><DatoInput selected={value.datoer} onChange={toggleDate} /></View>
        </Group>
        {error && <Notice error text={error} />}
        <View style={{ gap: 12 }}><Text accessibilityRole="header" aria-level={2} style={[layout.body, { fontWeight: '600' }]}>Steder</Text><Text style={layout.secondary}>{value.steder.length} valgt for CAS og TØRN · ændringer gemmes automatisk</Text><Field label="Søg efter sted" value={query} onChangeText={setQuery} placeholder="Navn på team eller sted" />
          {Array.from(groups).map(([g, list]) => <Group key={g} title={g}>{list.map((n, i) => <Pressable key={n} {...spaceActivation(() => choose(n), session.saving)} disabled={session.saving} accessibilityRole="checkbox" accessibilityLabel={n} aria-checked={selected.has(normaliser(n))} accessibilityState={{ checked: selected.has(normaliser(n)), disabled: session.saving }} onPress={() => choose(n)} style={({ pressed }) => [layout.row, i > 0 && layout.separator, { backgroundColor: pressed ? t.cardAlt : t.card }]}>
            <Text style={[layout.body, layout.flex]}>{n}</Text><Ionicons name={selected.has(normaliser(n)) ? 'checkmark-circle' : 'ellipse-outline'} size={25} color={selected.has(normaliser(n)) ? t.accent : t.faint} />
          </Pressable>)}</Group>)}
          {!groups.size && <Notice text="Ingen steder matcher din søgning. Du kan tilføje et nyt sted nedenfor." />}
          {showNew ? <Group><View style={{ padding: 16, gap: 12 }}><Field label="Navn på nyt sted" value={newName} onChangeText={setNewName} autoFocus /><Action label="Tilføj sted" primary disabled={session.saving} onPress={() => { try { const n = navn(newName); if (names.some(s => normaliser(s) === normaliser(n))) throw new Error('Stedet findes allerede. Find det i listen.'); setCustom(s => [...s, n]); editBoth({ ...value, steder: [...value.steder, n] }); scheduleSave(); setNewName(''); setShowNew(false); setQuery(''); setError(''); } catch(e) { setError((e as Error).message); } }} /><Action label="Luk" onPress={() => setShowNew(false)} /></View></Group> : <Action label="Tilføj et nyt sted" icon="add-circle-outline" onPress={() => setShowNew(true)} />}
        </View>
      </>}
    </Resource></Resource>;
}
export function Agencies({ session }: { session: VagtSession }) {
  const rows = session.get('bureauer').draft;
  const [name, setName] = useState(''), [error, setError] = useState(''), [adding, setAdding] = useState(false);
  const move = (from: number, to: number) => { if (!rows || to < 0 || to >= rows.length) return; const next = [...rows]; next.splice(to, 0, next.splice(from, 1)[0]); session.edit('bureauer', next); };
  return <Resource session={session} id="bureauer">
    <Notice text="Øverste arbejdsplads har førsteprioritet, hvis to vagter kolliderer. Træk i håndtaget, eller brug pilene." />
    {rows && <Group>{!rows.length && <Text style={[layout.secondary, { padding: 16 }]}>Tilføj din første arbejdsplads.</Text>}{rows.map((r, i) => <View key={r.navn} {...{ dataSet: { agency: String(i) } } as any} style={i > 0 && layout.separator}>
      <Toggle label={`${i + 1}. ${r.navn}`} value={r.aktiv} disabled={session.saving} onChange={aktiv => session.edit('bureauer', rows.map((x, j) => j === i ? { ...x, aktiv } : x))} />
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingBottom: 8, justifyContent: 'space-between' }}>
        <Text style={layout.caption}>{r.aktiv ? 'Aktiv' : 'Slået fra'}</Text>
        <View style={{ flexDirection: 'row' }}><Traek index={i} name={r.navn} move={move} disabled={session.saving} /><IconButton name="arrow-up" label={'Flyt ' + r.navn + ' op'} disabled={i === 0 || session.saving} onPress={() => move(i, i - 1)} /><IconButton name="arrow-down" label={'Flyt ' + r.navn + ' ned'} disabled={i === rows.length - 1 || session.saving} onPress={() => move(i, i + 1)} /><IconButton name="trash-outline" label={'Slet ' + r.navn} danger disabled={session.saving} onPress={() => session.edit('bureauer', rows.filter((_, j) => j !== i))} /></View>
      </View>
    </View>)}</Group>}
    {rows && (adding ? <Group><View style={{ padding: 16, gap: 12 }}><Field label="Arbejdspladsens navn" value={name} onChangeText={setName} autoFocus /><Action label="Tilføj arbejdsplads" primary disabled={session.saving} onPress={() => { try { const n = navn(name); if (rows.some(r => normaliser(r.navn) === normaliser(n))) throw new Error('Arbejdspladsen findes allerede.'); session.edit('bureauer', [...rows, { navn: n, aktiv: true }]); setName(''); setAdding(false); setError(''); } catch(e) { setError((e as Error).message); } }} /><Action label="Luk" onPress={() => setAdding(false)} /></View></Group> : <Action label="Tilføj arbejdsplads" icon="add-circle-outline" onPress={() => setAdding(true)} />)}
    {error && <Notice text={error} error />}
  </Resource>;
}
export function Pairs({ session }: { session: VagtSession }) {
  const rows = session.get('par').draft;
  return <Resource session={session} id="par"><Notice text="Brug kun et par, når det samme sted har forskellige navne i de to systemer." />
    {rows?.map((r, i) => <Group key={i}><View style={{ padding: 16, gap: 14 }}>
      <Field label="Navn i CAS" value={r.a} editable={!session.saving} onChangeText={a => session.edit('par', rows.map((x,j) => i === j ? { ...x, a } : x))} />
      <Field label="Navn i TØRN" value={r.b} editable={!session.saving} onChangeText={b => session.edit('par', rows.map((x,j) => i === j ? { ...x, b } : x))} />
      <Action label={'Slet par ' + (i + 1)} danger disabled={session.saving} onPress={() => session.edit('par', rows.filter((_,j) => i !== j))} />
    </View></Group>)}
    {rows && !rows.length && <Group><Text style={[layout.secondary, { padding: 20 }]}>Ingen stednavne-par. Du behøver kun tilføje et, hvis navnene er forskellige.</Text></Group>}
    {rows && <Action label="Tilføj par" icon="add-circle-outline" disabled={session.saving} onPress={() => session.edit('par', [...rows, { a: '', b: '' }])} />}
  </Resource>;
}
