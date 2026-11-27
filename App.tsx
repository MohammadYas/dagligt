import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import Ionicons from '@expo/vector-icons/Ionicons';
import { dark as t } from './src/theme';
import { erWeb, harAdgang } from './src/adgang';
import Laas from './src/components/Laas';
import Vagter from './src/screens/Vagter';
import Rute from './src/screens/Rute';
import Lon from './src/screens/Lon';
import WebAppearance from './src/components/WebAppearance';

export type Route = 'vagter' | 'rute' | 'lon' | 'oensker' | 'bureauer' | 'par';
const routes: Route[] = ['vagter', 'rute', 'lon', 'oensker', 'bureauer', 'par'];
const isVagtRoute = (route: Route): route is 'vagter' | 'oensker' | 'bureauer' | 'par' => ['vagter', 'oensker', 'bureauer', 'par'].includes(route);
function readRoute(): Route {
  const name = erWeb ? window.location.hash.slice(1) : '';
  return routes.includes(name as Route) ? name as Route : 'vagter';
}
function Shell() {
  const [route, setRoute] = useState<Route>(readRoute);
  const [ruteOpened, setRuteOpened] = useState(route === 'rute');
  const [lonOpened, setLonOpened] = useState(route === 'lon');
  const [locked, setLocked] = useState(erWeb && !harAdgang());
  const inset = useSafeAreaInsets();
  useEffect(() => {
    if (!erWeb) return;
    const changed = () => { const r = readRoute(); setRoute(r); if (r === 'rute') setRuteOpened(true); if (r === 'lon') setLonOpened(true); };
    window.addEventListener('hashchange', changed);
    return () => window.removeEventListener('hashchange', changed);
  }, []);
  const go = (r: Route) => {
    setRoute(r); if (r === 'rute') setRuteOpened(true); if (r === 'lon') setLonOpened(true);
    if (erWeb && window.location.hash !== '#' + r) window.location.hash = r;
  };
  return <SafeAreaView edges={['top', 'left', 'right']} style={s.root}>
    {locked ? <Laas t={t} aabnet={() => setLocked(false)} /> :
      <KeyboardAvoidingView style={s.root} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={[s.screenArea, { paddingBottom: Platform.OS === 'web' ? 76 : 62 + inset.bottom }]}>
          <View style={[s.content, !isVagtRoute(route) && { display: 'none' }]}><Vagter t={t} route={isVagtRoute(route) ? route : 'vagter'} navigate={go} /></View>
          {ruteOpened && <View style={[s.content, route !== 'rute' && { display: 'none' }]}><Rute t={t} /></View>}
          {lonOpened && <View style={[s.content, route !== 'lon' && { display: 'none' }]}><Lon /></View>}
        </View>
        <View accessibilityRole="tablist" style={[s.tabbar, { paddingBottom: Platform.OS === 'web' ? 'max(env(safe-area-inset-bottom), 8px)' as any : Math.max(inset.bottom, 8) }]}>
          {([{ key: 'vagter', label: 'Vagter', icon: 'calendar' }, { key: 'lon', label: 'Løn', icon: 'cash' }, { key: 'rute', label: 'Rute', icon: 'navigate' }] as const).map(tab => {
            const selected = tab.key === 'vagter' ? isVagtRoute(route) : route === tab.key;
            return <Pressable key={tab.key} accessibilityRole="tab" accessibilityLabel={tab.label} aria-selected={selected} accessibilityState={{ selected }} onPress={() => go(tab.key)} style={s.tab}>
              <Ionicons aria-hidden name={tab.icon} size={25} color={selected ? t.accent : t.faint} />
              <Text maxFontSizeMultiplier={1.5} style={[s.tabText, { color: selected ? t.accent : t.faint }]}>{tab.label}</Text>
            </Pressable>;
          })}
        </View>
      </KeyboardAvoidingView>}
  </SafeAreaView>;
}
export default function App() {
  return <SafeAreaProvider><WebAppearance /><StatusBar style="light" /><Shell /></SafeAreaProvider>;
}
const s = StyleSheet.create({
  root: { flex: 1, minHeight: 0, position: 'relative', backgroundColor: t.bg },
  screenArea: { flex: 1, minHeight: 0 },
  content: { flex: 1, minHeight: 0 },
  tabbar: { position: 'absolute', left: 0, right: 0, bottom: 0, zIndex: 10, flexDirection: 'row', justifyContent: 'center', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: t.line, backgroundColor: t.card, paddingTop: 5 },
  tab: { flex: 1, maxWidth: 240, minHeight: 54, alignItems: 'center', justifyContent: 'center', gap: 4 },
  tabText: { fontSize: 12, fontWeight: '600' },
});
