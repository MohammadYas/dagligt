import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { View, Text, ScrollView, RefreshControl, useWindowDimensions } from 'react-native';
import { Theme, dark as t } from '../theme';
import { hentFil, hentStatus, gemFil, Fil } from '../dropbox';
import { VagtSession } from '../vagtsession';
import { FilKey, STIER } from '../vagtdata';
import { FILER } from '../vagter';
import type { Route } from '../../App';
import { Action, Group, layout, LinkRow, Notice, Title, Toggle } from '../components/ArbejdeUI';
import { Agencies, Pairs, Resource, Wishes } from '../components/vagter/Editors';
import Statuskort from '../components/vagter/Statuskort';
import RaStatusDialog from '../components/vagter/RaStatusDialog';
import Varsler from '../components/vagter/Varsler';

export default function Vagter({ route, navigate }: { t: Theme; route: Route; navigate: (r: Route) => void }) {
  const [session] = useState(() => new VagtSession(hentFil, gemFil));
  useSyncExternalStore(session.subscribe, session.snapshot, session.snapshot);
  const [statuses, setStatuses] = useState<Partial<Record<'cas' | 'torn', { file?: Fil; error?: string }>>>({});
  const [expandedStatus, setExpandedStatus] = useState<'cas' | 'torn' | null>(null);
  const [rawStatus, setRawStatus] = useState<{ name: string; text: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [, tick] = useState(0);
  const running = useRef(false), scroll = useRef<ScrollView>(null), forrigeRoute = useRef(route);
  const { width, fontScale } = useWindowDimensions();
  const refreshStatus = useCallback(async () => {
    if (running.current) return;
    running.current = true; setLoading(true);
    await Promise.all((['cas', 'torn'] as const).map(async key => {
      try {
        const file = await hentStatus(FILER[key].status);
        setStatuses(s => ({ ...s, [key]: { file } }));
      } catch(e) { setStatuses(s => ({ ...s, [key]: { ...s[key], error: e instanceof Error ? e.message : 'Kunne ikke hente status.' } })); }
    }));
    running.current = false; setLoading(false);
  }, []);
  const refresh = () => { refreshStatus(); (Object.keys(STIER) as FilKey[]).forEach(k => session.load(k)); };
  useEffect(() => {
    refresh();
    const interval = setInterval(refreshStatus, 60000);
    const clock = setInterval(() => tick(v => v + 1), 15000);
    const visible = () => {
      if (document.visibilityState === 'visible') refreshStatus();
      else if (session.dirtyKeys.length) void session.save();
    };
    const pageHide = () => { if (session.dirtyKeys.length) void session.save(); };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', visible);
      window.addEventListener('pagehide', pageHide);
    }
    return () => {
      clearInterval(interval); clearInterval(clock);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', visible);
        window.removeEventListener('pagehide', pageHide);
      }
    };
  }, [refreshStatus, session]);
  useEffect(() => {
    scroll.current?.scrollTo({ y: 0, animated: false });
    // Skift af skaerm maa ikke efterlade booking-kriterier som en glemt kladde.
    if (forrigeRoute.current !== route && session.dirtyKeys.length) void session.save();
    forrigeRoute.current = route;
  }, [route, session]);
  const dirty = session.dirtyKeys.length > 0;
  useEffect(() => {
    if (!dirty || typeof window === 'undefined') return;
    const leave = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', leave);
    return () => window.removeEventListener('beforeunload', leave);
  }, [dirty]);
  const control = session.get('kontrol').draft;
  const titles: Partial<Record<Route,string>> = { oensker: 'Dage og steder', bureauer: 'Arbejdspladser', par: 'Stednavne-par' };
  return <View style={{ flex: 1, minHeight: 0, position: 'relative' }}>
    <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={layout.page} keyboardShouldPersistTaps="handled"
      refreshControl={<RefreshControl refreshing={loading} onRefresh={refresh} tintColor={t.accent} />}>
      <Title title={titles[route] ?? 'Vagter'} subtitle={route === 'vagter' ? 'Dit overblik over CAS og TØRN.' : undefined} back={route !== 'vagter' ? () => navigate('vagter') : undefined} backLabel="Vagter" />
      {route === 'vagter' ? <>
        <View style={{ flexDirection: width >= 620 && fontScale < 1.4 ? 'row' : 'column', alignItems: 'flex-start', gap: 16 }}>
          <View style={{ flex: width >= 620 && fontScale < 1.4 ? 1 : undefined, width: width >= 620 && fontScale < 1.4 ? undefined : '100%', minWidth: 0 }}>
            <Statuskort name="CAS" file={statuses.cas?.file} error={statuses.cas?.error} loading={loading} enabled={control?.cas} expanded={expandedStatus === 'cas'} onToggle={() => setExpandedStatus(v => v === 'cas' ? null : 'cas')} onViewRaw={(name, text) => setRawStatus({ name, text })} />
          </View>
          <View style={{ flex: width >= 620 && fontScale < 1.4 ? 1 : undefined, width: width >= 620 && fontScale < 1.4 ? undefined : '100%', minWidth: 0 }}>
            <Statuskort name="TØRN" file={statuses.torn?.file} error={statuses.torn?.error} loading={loading} enabled={control?.torn} expanded={expandedStatus === 'torn'} onToggle={() => setExpandedStatus(v => v === 'torn' ? null : 'torn')} onViewRaw={(name, text) => setRawStatus({ name, text })} />
          </View>
        </View>
        <Action label="Opdater" icon="refresh-outline" onPress={refresh} busy={loading} />
        <Group title="Automatisk booking" help="Slået fra betyder: scanner stadig, men tager ingen vagter. Ændringer gælder først, når du trykker Gem.">
          <Resource session={session} id="kontrol">{control && <>
            <Toggle label="CAS tændt" value={control.cas} disabled={session.saving} onChange={cas => session.edit('kontrol', { ...control, cas })} />
            <View style={layout.separator}><Toggle label="TØRN tændt" value={control.torn} disabled={session.saving} onChange={torn => session.edit('kontrol', { ...control, torn })} /></View>
          </>}</Resource>
        </Group>
        <Group title="Dine vagtvalg">
          <LinkRow first title="Dage og steder" detail="Hvornår og hvor du vil arbejde" icon="calendar-outline" onPress={() => navigate('oensker')} />
          <LinkRow title="Arbejdspladser" detail="Aktive arbejdspladser og prioritet" icon="business-outline" onPress={() => navigate('bureauer')} />
          <LinkRow title="Stednavne-par" detail="Forbind forskellige navne på samme sted" icon="link-outline" onPress={() => navigate('par')} />
        </Group>
        <Varsler />
        <Text style={[layout.caption, { textAlign: 'center' }]}>VagtStatus · CAS & TØRN</Text>
      </> : route === 'oensker' ? <Wishes session={session} /> : route === 'bureauer' ? <Agencies session={session} /> : <Pairs session={session} />}
    </ScrollView>
    {(dirty || session.message || session.error) && <View style={{ backgroundColor: t.card, borderTopWidth: 1, borderTopColor: t.line }}>
      <View style={{ width: '100%', maxWidth: 720, alignSelf: 'center', paddingHorizontal: 16, paddingVertical: 12, gap: 8 }}>
        {session.error ? <Notice error text={session.error} /> : <Notice text={session.saving ? 'Gemmer dine ændringer…' : dirty ? 'Du har ugemte ændringer' : session.message} />}
        {dirty && <View style={{ flexDirection: width < 360 && fontScale > 1.2 ? 'column' : 'row', gap: 8 }}>
          <View style={{ flex: 1 }}><Action label="Annuller" onPress={() => session.cancel()} disabled={session.saving} /></View>
          <View style={{ flex: 2 }}><Action label={session.error ? 'Prøv igen' : 'Gem ændringer'} primary busy={session.saving} onPress={() => session.save()} /></View>
        </View>}
      </View>
    </View>}
    {rawStatus && <RaStatusDialog name={rawStatus.name} text={rawStatus.text} onClose={() => setRawStatus(null)} />}
  </View>;
}
