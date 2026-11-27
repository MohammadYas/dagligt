import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Action, Field, Group, layout, LinkRow, Notice, Title } from '../components/ArbejdeUI';
import DatoInput from '../components/vagter/DatoInput';
import { dark as t } from '../theme';
import { Tal, Type } from '../type';
import { addDays, calculatePeriodGross, calculatePeriodNet, calculateShiftGross, DEFAULT_SETTINGS, EMPLOYER_LABEL, Employer, formatHours, formatKr, getPayPeriodForDate, isShiftComplete, loadPayData, longDate, PayData, PayPeriod, PayRates, PaySettings, savePayData, Shift, shortDate, todayKey, upcomingPeriods } from '../lon';
import { uid } from '../store';

type ViewName = 'oversigt' | 'tilfoej' | 'rediger' | 'indstillinger' | 'detalje' | 'historik';
type Draft = Pick<Shift, 'employer' | 'date' | 'start' | 'end' | 'unpaidBreakMinutes'>;
const now = () => Date.now();
const copy = <T,>(value: T): T => JSON.parse(JSON.stringify(value));
const initialDraft = (): Draft => ({ employer: 'multicare', date: todayKey(), start: '07:00', end: '15:00', unpaidBreakMinutes: 0 });
const rateLabels: Record<keyof PayRates, string> = { weekdayDay: 'Hverdag dag', weekdayEvening: 'Hverdag aften', weekdayNight: 'Hverdag nat', weekendDay: 'Weekend dag', weekendEvening: 'Weekend aften', weekendNight: 'Weekend nat' };

function EmployerPicker({ value, onChange }: { value: Employer; onChange: (value: Employer) => void }) {
  return <View style={{ flexDirection: 'row', padding: 4, gap: 4, borderRadius: 13, backgroundColor: t.cardAlt }}>
    {(['multicare', 'akut'] as Employer[]).map(employer => <Pressable key={employer} accessibilityRole="button" accessibilityState={{ selected: value === employer }} onPress={() => onChange(employer)} style={({ pressed }) => ({ flex: 1, minHeight: 44, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: value === employer ? t.accent : 'transparent', opacity: pressed ? .7 : 1 })}>
      <Text numberOfLines={1} style={[Type.subhead, { color: value === employer ? t.bg : t.text, fontWeight: '700' }]}>{EMPLOYER_LABEL[employer]}</Text>
    </Pressable>)}
  </View>;
}
function NumericField({ label, value, onChange, suffix, nullable = false }: { label: string; value: number | null; onChange: (value: number | null) => void; suffix?: string; nullable?: boolean }) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));
  useEffect(() => setText(value === null ? '' : String(value).replace('.', ',')), [value]);
  const edit = (next: string) => {
    setText(next);
    if (!next.trim() && nullable) { onChange(null); return; }
    const parsed = Number(next.replace(',', '.'));
    if (Number.isFinite(parsed) && parsed >= 0) onChange(parsed);
  };
  return <Field label={suffix ? `${label} (${suffix})` : label} value={text} onChangeText={edit} keyboardType="decimal-pad" inputMode="decimal" placeholder={nullable ? 'Påkrævet' : '0'} />;
}
function SectionTitle({ children }: { children: string }) { return <Text accessibilityRole="header" aria-level={2} style={[Type.headline, { color: t.text, paddingHorizontal: 4 }]}>{children}</Text>; }

function PaySummary({ period, data, onOpen }: { period: PayPeriod; data: PayData; onOpen: () => void }) {
  const gross = calculatePeriodGross(data.shifts, period, data.settings);
  const tax = calculatePeriodNet(gross, data.settings);
  return <Pressable accessibilityRole="button" accessibilityLabel={`Næste løn, udbetales ${shortDate(period.payday)}`} accessibilityHint="Vis vagter og beregning for perioden" onPress={onOpen} style={({ pressed }) => ({ borderRadius: 18, padding: 20, gap: 14, backgroundColor: t.card, opacity: pressed ? .76 : 1 })}>
    <View style={{ gap: 2 }}><Text style={[layout.caption, { color: t.accent, fontWeight: '700' }]}>Næste løn</Text><Text style={[Type.title2, { color: t.text }]}>{shortDate(period.payday)}</Text><Text style={layout.caption}>Periode {shortDate(period.start)} – {shortDate(period.end)}</Text></View>
    <View style={{ gap: 4 }}><Text style={layout.caption}>Forventet udbetaling</Text><Text style={[Type.largeTitle, Tal, { color: tax.net === null ? t.faint : t.text }]}>{tax.net === null ? 'Indtast trækprocent' : formatKr(tax.net)}</Text><Text style={layout.secondary}>Brutto {formatKr(gross.gross)} · {gross.shifts.length} vagter · {formatHours(gross.hours)} timer</Text></View>
    <View style={{ flexDirection: 'row', gap: 12 }}>
      {(['multicare', 'akut'] as Employer[]).map(employer => <View key={employer} style={{ flex: 1, minWidth: 0, gap: 3 }}><Text numberOfLines={1} style={layout.caption}>{EMPLOYER_LABEL[employer]}</Text><Text numberOfLines={1} style={[Type.headline, Tal, { color: t.text }]}>{formatKr(gross.byEmployer[employer])}</Text></View>)}
    </View>
    <Text style={[layout.caption, { color: t.accent }]}>Se periode og beregning</Text>
  </Pressable>;
}

function ShiftRow({ item, onPress }: { item: { shift: Shift; calculation: ReturnType<typeof calculateShiftGross>; completed: boolean }; onPress: () => void }) {
  const { shift, calculation, completed } = item;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${EMPLOYER_LABEL[shift.employer]}, ${longDate(shift.date)}, ${formatKr(calculation.gross)}`} onPress={onPress} style={({ pressed }) => [layout.row, { alignItems: 'flex-start', backgroundColor: pressed ? t.cardAlt : t.card }]}>
    <View style={{ flex: 1, minWidth: 0, gap: 3 }}><Text style={layout.body}>{EMPLOYER_LABEL[shift.employer]}</Text><Text style={layout.secondary}>{longDate(shift.date)}</Text><Text style={layout.caption}>{shift.start}–{shift.end} · {formatHours(calculation.paidMinutes / 60)} timer · {completed ? 'Optjent' : 'Planlagt'}</Text></View>
    <View style={{ alignItems: 'flex-end', gap: 4 }}><Text style={[Type.headline, Tal, { color: t.text }]}>{formatKr(calculation.gross)}</Text><Ionicons name="chevron-forward" size={18} color={t.faint} /></View>
  </Pressable>;
}

function ShiftEditor({ data, original, onSave, onCancel, onDelete }: { data: PayData; original?: Shift; onSave: (shift: Shift) => void; onCancel: () => void; onDelete?: () => void }) {
  const [draft, setDraft] = useState<Draft>(original ? { employer: original.employer, date: original.date, start: original.start, end: original.end, unpaidBreakMinutes: original.unpaidBreakMinutes } : initialDraft());
  const [showCalendar, setShowCalendar] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const probe = useMemo<Shift>(() => ({ id: original?.id ?? 'preview', ...draft, createdAt: original?.createdAt ?? now(), updatedAt: now(), rateSnapshot: original?.rateSnapshot ?? data.settings.rates }), [data.settings.rates, draft, original]);
  const calculation = calculateShiftGross(probe, data.settings);
  const quick = (start: string, end: string) => setDraft(current => ({ ...current, start, end }));
  const save = () => { if (calculation.totalMinutes <= 0) return; onSave({ id: original?.id ?? uid(), ...draft, createdAt: original?.createdAt ?? now(), updatedAt: now(), rateSnapshot: original?.rateSnapshot ?? copy(data.settings.rates) }); };
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={layout.page} keyboardShouldPersistTaps="handled">
    <Title title={original ? 'Rediger vagt' : 'Tilføj vagt'} subtitle="Beløbet opdateres med det samme." back={onCancel} />
    <Group title="Arbejdsgiver"><View style={{ padding: 16 }}><EmployerPicker value={draft.employer} onChange={employer => setDraft(current => ({ ...current, employer }))} /></View></Group>
    <Group title="Tidspunkt"><View style={{ padding: 16, gap: 12 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[['07:00', '15:00'], ['15:00', '23:00'], ['23:00', '07:00']].map(([start, end]) => <Pressable key={start} accessibilityRole="button" accessibilityLabel={`${start} til ${end}`} onPress={() => quick(start, end)} style={({ pressed }) => ({ minHeight: 44, paddingHorizontal: 14, borderRadius: 10, justifyContent: 'center', backgroundColor: draft.start === start && draft.end === end ? t.accentBg : t.cardAlt, opacity: pressed ? .7 : 1 })}><Text style={[Type.headline, { color: draft.start === start && draft.end === end ? t.accent : t.text }]}>{start.slice(0, 2)}–{end.slice(0, 2)}</Text></Pressable>)}</View>
      <View style={{ flexDirection: 'row', gap: 12 }}><View style={{ flex: 1 }}><Field label="Start" value={draft.start} onChangeText={start => setDraft(current => ({ ...current, start }))} keyboardType="numbers-and-punctuation" placeholder="07:00" /></View><View style={{ flex: 1 }}><Field label="Slut" value={draft.end} onChangeText={end => setDraft(current => ({ ...current, end }))} keyboardType="numbers-and-punctuation" placeholder="15:00" /></View></View>
      <NumericField label="Ubetalt pause" value={draft.unpaidBreakMinutes} onChange={unpaidBreakMinutes => setDraft(current => ({ ...current, unpaidBreakMinutes: unpaidBreakMinutes ?? 0 }))} suffix="minutter" />
    </View></Group>
    <Group title="Dato"><View style={{ padding: 16, gap: 10 }}><Pressable accessibilityRole="button" accessibilityLabel="Vælg vagtdato" onPress={() => setShowCalendar(value => !value)} style={({ pressed }) => ({ minHeight: 44, justifyContent: 'center', opacity: pressed ? .7 : 1 })}><Text style={[Type.body, { color: t.accent }]}>{longDate(draft.date)}</Text></Pressable>{showCalendar && <DatoInput value={draft.date} selected={[draft.date]} onChange={date => { setDraft(current => ({ ...current, date })); setShowCalendar(false); }} />}</View></Group>
    <Group title="Beregning"><View style={{ padding: 16, gap: 6 }}><Text style={[Type.title2, Tal, { color: t.text }]}>{formatHours(calculation.paidMinutes / 60)} timer · {formatKr(calculation.gross)}</Text><Text style={layout.secondary}>{draft.date && (new Date(`${draft.date}T12:00:00`).getDay() === 0 || new Date(`${draft.date}T12:00:00`).getDay() === 6) ? 'Weekend registreret automatisk.' : 'Hverdag registreret automatisk.'}</Text></View></Group>
    <Action label={original ? 'Gem vagt' : 'Tilføj vagt'} primary onPress={save} />
    {onDelete && (confirmDelete ? <Group title="Slet vagt?"><View style={{ padding: 16, gap: 10 }}><Text style={layout.secondary}>Vagten fjernes fra denne lønperiode.</Text><Action label="Slet vagt" danger onPress={onDelete} /><Action label="Annuller" onPress={() => setConfirmDelete(false)} /></View></Group> : <Action label="Slet vagt" danger onPress={() => setConfirmDelete(true)} />)}
  </ScrollView>;
}

function SettingsView({ data, onSave, onCancel }: { data: PayData; onSave: (settings: PaySettings) => void; onCancel: () => void }) {
  const [settings, setSettings] = useState<PaySettings>(copy(data.settings));
  const updateRate = (employer: Employer, key: keyof PayRates, value: number | null) => { if (value !== null) setSettings(current => ({ ...current, rates: { ...current.rates, [employer]: { ...current.rates[employer], [key]: value } } })); };
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={layout.page} keyboardShouldPersistTaps="handled">
    <Title title="Lønindstillinger" subtitle="Satser og skat bruges til nye beregninger." back={onCancel} />
    {(['multicare', 'akut'] as Employer[]).map(employer => <Group key={employer} title={EMPLOYER_LABEL[employer]}><View style={{ padding: 16, gap: 12 }}>{(Object.keys(rateLabels) as (keyof PayRates)[]).map(key => <NumericField key={key} label={rateLabels[key]} value={settings.rates[employer][key]} onChange={value => updateRate(employer, key, value)} suffix="kr/time" />)}</View></Group>)}
    <Group title="Skat"><View style={{ padding: 16, gap: 14 }}><Text style={layout.secondary}>Forventet nettoløn er et estimat. Trækprocenten bruges for begge arbejdsgivere; fradraget bruges kun på hovedkortet.</Text><View style={{ gap: 8 }}><Text style={layout.secondary}>Hovedkort</Text><EmployerPicker value={settings.primaryTaxCardEmployer} onChange={primaryTaxCardEmployer => setSettings(current => ({ ...current, primaryTaxCardEmployer }))} /></View><NumericField label="Fradrag pr. lønperiode" value={settings.deductionPerPayPeriod} onChange={deductionPerPayPeriod => setSettings(current => ({ ...current, deductionPerPayPeriod: deductionPerPayPeriod ?? 0 }))} suffix="kr" /><NumericField label="Trækprocent for begge arbejdsgivere" value={settings.taxRate} onChange={taxRate => setSettings(current => ({ ...current, taxRate }))} suffix="%" nullable /><NumericField label="AM-bidrag" value={settings.amContributionRate} onChange={amContributionRate => setSettings(current => ({ ...current, amContributionRate: amContributionRate ?? 0 }))} suffix="%" /></View></Group>
    <Action label="Gem indstillinger" primary onPress={() => onSave(settings)} />
  </ScrollView>;
}

function PeriodDetail({ data, period, onBack, onEdit }: { data: PayData; period: PayPeriod; onBack: () => void; onEdit: (id: string) => void }) {
  const gross = calculatePeriodGross(data.shifts, period, data.settings); const tax = calculatePeriodNet(gross, data.settings);
  return <ScrollView style={{ flex: 1 }} contentContainerStyle={layout.page}>
    <Title title="Lønperiode" subtitle={`${shortDate(period.start)} – ${shortDate(period.end)} · Udbetales ${shortDate(period.payday)}`} back={onBack} />
    <Group title="Forventet løn"><View style={{ padding: 16, gap: 8 }}><Text style={[Type.largeTitle, Tal, { color: t.text }]}>{tax.net === null ? 'Trækprocent mangler' : formatKr(tax.net)}</Text><Text style={layout.secondary}>Brutto {formatKr(gross.gross)} · AM {formatKr(tax.am)}{tax.aTax === null ? '' : ` · A-skat ${formatKr(tax.aTax)}`}</Text><Text style={layout.caption}>Optjent {formatKr(gross.earned)} · Planlagt {formatKr(gross.planned)}</Text></View></Group>
    <Group title="Fordeling"><View style={{ padding: 16, gap: 8 }}>{(['multicare', 'akut'] as Employer[]).map(employer => <View key={employer} style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}><Text style={layout.body}>{EMPLOYER_LABEL[employer]}</Text><Text style={[Type.headline, Tal, { color: t.text }]}>{formatKr(gross.byEmployer[employer])}</Text></View>)}</View></Group>
    <SectionTitle>Vagter i perioden</SectionTitle>
    {gross.shifts.length ? <Group>{gross.shifts.sort((a, b) => a.shift.date.localeCompare(b.shift.date)).map((item, index) => <View key={item.shift.id} style={index ? layout.separator : undefined}><ShiftRow item={item} onPress={() => onEdit(item.shift.id)} /></View>)}</Group> : <Notice text="Ingen vagter i denne lønperiode." />}
  </ScrollView>;
}

export default function Lon() {
  const [data, setData] = useState<PayData | null>(null);
  const [view, setView] = useState<ViewName>('oversigt');
  const [selectedPeriod, setSelectedPeriod] = useState<PayPeriod | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { loadPayData().then(setData).catch(() => setError('Lønoplysningerne kunne ikke læses.')); }, []);
  const persist = async (next: PayData) => { setData(next); try { await savePayData(next); setError(''); } catch { setError('Kunne ikke gemme lokalt. Prøv igen.'); } };
  if (!data) return <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: t.bg }}><ActivityIndicator color={t.accent} /><Text style={layout.secondary}>Henter lønoplysninger…</Text></View>;
  const period = getPayPeriodForDate(todayKey());
  const selectedShift = selectedShiftId ? data.shifts.find(shift => shift.id === selectedShiftId) : undefined;
  const saveShift = (shift: Shift) => { const exists = data.shifts.some(item => item.id === shift.id); persist({ ...data, shifts: exists ? data.shifts.map(item => item.id === shift.id ? shift : item) : [...data.shifts, shift] }); setSelectedShiftId(null); setView('oversigt'); };
  if (view === 'tilfoej') return <ShiftEditor data={data} onSave={saveShift} onCancel={() => setView('oversigt')} />;
  if (view === 'rediger' && selectedShift) return <ShiftEditor data={data} original={selectedShift} onSave={saveShift} onCancel={() => { setSelectedShiftId(null); setView('detalje'); }} onDelete={() => { persist({ ...data, shifts: data.shifts.filter(shift => shift.id !== selectedShift.id) }); setSelectedShiftId(null); setView('oversigt'); }} />;
  if (view === 'indstillinger') return <SettingsView data={data} onSave={settings => { persist({ ...data, settings }); setView('oversigt'); }} onCancel={() => setView('oversigt')} />;
  if (view === 'detalje' && selectedPeriod) return <PeriodDetail data={data} period={selectedPeriod} onBack={() => { setSelectedShiftId(null); setView('oversigt'); }} onEdit={id => { setSelectedShiftId(id); setView('rediger'); }} />;
  const gross = calculatePeriodGross(data.shifts, period, data.settings); const tax = calculatePeriodNet(gross, data.settings);
  const upcoming = upcomingPeriods(todayKey(), 5);
  const history = [...new Map(data.shifts.map(shift => {
    const item = getPayPeriodForDate(shift.date);
    return [item.start, item] as const;
  })).values()].filter(item => item.payday < todayKey()).sort((a, b) => b.start.localeCompare(a.start));
  return <View style={{ flex: 1, minHeight: 0 }}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={layout.page} keyboardShouldPersistTaps="handled">
      <Title title={view === 'historik' ? 'Lønhistorik' : 'Løn'} subtitle={view === 'historik' ? 'Tidligere lønperioder.' : 'Dit estimat for næste løn.'} back={view === 'historik' ? () => setView('oversigt') : undefined} />
      {error && <Notice error text={error} />}
      {view === 'historik' ? <>{history.length ? <Group>{history.map((item, index) => { const amount = calculatePeriodGross(data.shifts, item, data.settings); return <View key={item.start} style={index ? layout.separator : undefined}><Pressable accessibilityRole="button" onPress={() => { setSelectedPeriod(item); setView('detalje'); }} style={layout.row}><View style={layout.flex}><Text style={layout.body}>{shortDate(item.payday)}</Text><Text style={layout.caption}>{shortDate(item.start)} – {shortDate(item.end)}</Text></View><Text style={[Type.headline, Tal, { color: t.text }]}>{formatKr(amount.gross)}</Text></Pressable></View>; })}</Group> : <Notice text="Ingen tidligere lønperioder med vagter endnu." />}</> : <>
        <PaySummary period={period} data={data} onOpen={() => { setSelectedPeriod(period); setView('detalje'); }} />
        {!tax.complete && <Notice text="Brutto er beregnet. Indtast din trækprocent under Lønindstillinger for at få et nettolønsestimat." />}
        <Group title="Lønperioden"><View style={{ padding: 16, gap: 7 }}><Text style={[Type.title3, { color: t.text }]}>{shortDate(period.start)} – {shortDate(period.end)}</Text><Text style={layout.secondary}>Udbetales {shortDate(period.payday)}</Text><Text style={layout.caption}>Optjent {formatKr(gross.earned)} · Planlagt +{formatKr(gross.planned)} · Forventet brutto {formatKr(gross.gross)}</Text></View></Group>
        <Action label="Tilføj vagt" primary icon="add" onPress={() => setView('tilfoej')} />
        <SectionTitle>Vagter i perioden</SectionTitle>
        {gross.shifts.length ? <Group>{gross.shifts.sort((a, b) => a.shift.date.localeCompare(b.shift.date)).map((item, index) => <View key={item.shift.id} style={index ? layout.separator : undefined}><ShiftRow item={item} onPress={() => { setSelectedShiftId(item.shift.id); setSelectedPeriod(period); setView('rediger'); }} /></View>)}</Group> : <Group><View style={{ padding: 16, gap: 10 }}><Text style={layout.secondary}>Ingen vagter i perioden endnu.</Text><Text style={layout.caption}>Tilføj en vagt for at se din næste løn.</Text></View></Group>}
        <SectionTitle>Kommende løn</SectionTitle>
        <Group>{upcoming.map((item, index) => { const amount = calculatePeriodGross(data.shifts, item, data.settings); const estimate = calculatePeriodNet(amount, data.settings); return <View key={item.start} style={index ? layout.separator : undefined}><Pressable accessibilityRole="button" accessibilityLabel={`Løn ${shortDate(item.payday)}`} onPress={() => { setSelectedPeriod(item); setView('detalje'); }} style={layout.row}><View style={layout.flex}><Text style={layout.body}>{shortDate(item.payday)}</Text><Text style={layout.caption}>{amount.shifts.length ? `${amount.shifts.length} vagter · ${formatKr(amount.gross)} brutto` : 'Ingen planlagte vagter'}</Text></View><Text style={[Type.headline, Tal, { color: estimate.net === null ? t.faint : t.text }]}>{estimate.net === null ? formatKr(amount.gross) : formatKr(estimate.net)}</Text><Ionicons name="chevron-forward" size={18} color={t.faint} /></Pressable></View>; })}</Group>
        <Group title="Løn"><LinkRow first title="Lønindstillinger" detail="Satser, hovedkort og skat" icon="options-outline" onPress={() => setView('indstillinger')} /><LinkRow title="Historik" detail="Tidligere lønperioder" icon="time-outline" onPress={() => setView('historik')} /></Group>
      </>}
    </ScrollView>
  </View>;
}
