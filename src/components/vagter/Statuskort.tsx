import { ActivityIndicator, Platform, Pressable, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Fil } from '../../dropbox';
import { parseStatus, siden, tilstand } from '../../vagter';
import { dark as t } from '../../theme';
import { Type, Tal } from '../../type';
import { layout, Notice } from '../ArbejdeUI';

export default function Statuskort({ name, file, error, loading, enabled, expanded = false, onToggle, onViewRaw }: { name: string; file?: Fil; error?: string; loading: boolean; enabled?: boolean; expanded?: boolean; onToggle?: () => void; onViewRaw?: (name: string, text: string) => void }) {
  const collapsed = !expanded;
  const status = file ? parseStatus(file.tekst, file.skrevet) : undefined;
  const state = status ? tilstand(status) : undefined;
  const color = error ? t.fejl : state === 'ok' ? t.done : state === 'advarsel' ? t.advarsel : t.fejl;
  const label = error ? 'Forbindelsesfejl' : state === 'ok' ? 'Kører' : state === 'advarsel' ? 'Ingen nylig kontakt' : 'Kræver opmærksomhed';
  return <View style={{ flex: 1, minWidth: 0, padding: 16, borderRadius: 18, backgroundColor: t.card, gap: 12, overflow: 'hidden' }}>
    <Pressable accessibilityRole="button" accessibilityLabel={`${name}, ${label}`} accessibilityHint={collapsed ? 'Vis statusdetaljer' : 'Skjul statusdetaljer'} accessibilityState={{ expanded: !collapsed }} onPress={onToggle} style={({ pressed }) => ({ minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12, opacity: pressed ? .7 : 1 })}>
      <View style={{ flex: 1, minWidth: 0, gap: 5 }}><Text accessibilityRole="header" aria-level={2} style={[Type.title2, { color: t.text }]}>{name}</Text>
        {!status && !error ? <Text style={[layout.secondary, { flexShrink: 1, minWidth: 0 }]}>{'Henter status…'}</Text> : <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 7, minWidth: 0 }}><Ionicons name={state === 'ok' && !error ? 'checkmark-circle' : 'alert-circle'} size={19} color={color} /><Text style={[Type.headline, { color, flexShrink: 1, minWidth: 0 }]}>{label}</Text></View>}
        {enabled !== undefined && <Text style={[layout.caption, { color: enabled ? t.done : t.advarsel, fontWeight: '600', flexShrink: 1, minWidth: 0 }]}>{enabled ? 'Booking aktiv' : 'Booking slået fra'}</Text>}
      </View>
      {loading && <ActivityIndicator size="small" color={t.accent} />}
      <Ionicons name={collapsed ? 'chevron-down' : 'chevron-up'} size={20} color={t.faint} />
    </Pressable>
    {!collapsed && status && <>
      <Text style={[layout.caption, { flexShrink: 1, minWidth: 0, maxWidth: '100%' }]}>{'Sidste opdatering ' + siden(status.sidsteTjek)}{status.sidsteTjek ? '\n' + status.sidsteTjek.toLocaleString('da-DK') : ''}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 12 }}>
        {([{ label: 'Ledige vagter', value: status.ledige }, { label: 'Matcher', value: status.matcher }] as const).map(m => m.value !== null && <View key={m.label} style={{ minWidth: 110, flexGrow: 1 }}><Text style={[Type.largeTitle, Tal, { color: t.text }]}>{m.value}</Text><Text style={layout.caption} numberOfLines={2}>{m.label}</Text></View>)}
      </View>
      {status.dine && <Text style={[layout.secondary, { flexShrink: 1, minWidth: 0, maxWidth: '100%' }]}>{'Dine vagter: ' + status.dine}</Text>}
      {status.interesseret && status.interesseret.toLowerCase() !== 'ingen' && <Text style={[layout.secondary, { color: t.accent, flexShrink: 1, minWidth: 0, maxWidth: '100%' }]}>{'Interesseret: ' + status.interesseret}</Text>}
      {status.taget !== null && <Text style={[layout.secondary, { flexShrink: 1, minWidth: 0, maxWidth: '100%' }]}>{'Taget i alt: ' + status.taget}</Text>}
      {status.mode && <Text style={[layout.caption, { flexShrink: 1, minWidth: 0, maxWidth: '100%' }]}>{status.mode}</Text>}
      {error && <Notice error text="Viser senest hentede status. Prøv Opdater igen." />}
      <Text style={[layout.caption, { color: t.dim, fontWeight: '600' }]}>Rå statusfil</Text>
      <TextInput
        accessibilityLabel="Rå statusfil"
        editable={false}
        multiline
        scrollEnabled
        value={status.raa.trim()}
        textAlignVertical="top"
        style={{ width: '100%', height: 160, minWidth: 0, backgroundColor: t.cardAlt, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, color: t.text, fontSize: 11, lineHeight: 16, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' }}
      />
      <Pressable accessibilityRole="button" accessibilityLabel={`Vis hele råfilen for ${name}`} onPress={() => onViewRaw?.(name, status.raa)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? .65 : 1 })}>
        <Text style={[layout.caption, { color: t.accent, fontWeight: '600' }]}>Åbn hele råfilen</Text>
      </Pressable>
    </>}
    {!status && error && <Notice error text={error} />}
  </View>;
}
