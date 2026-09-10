import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, useColorScheme, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { DB, load, save, empty } from './src/store';
import { light, dark } from './src/theme';
import { opdaterWidget } from './src/widget';
import Dag from './src/screens/Dag';
import Log from './src/screens/Log';
import Fang from './src/screens/Fang';
import Projekter from './src/screens/Projekter';

const NAVN = 'mo';

const TABS = [
  { key: 'dag', label: 'Dag', icon: 'sunny-outline', on: 'sunny' },
  { key: 'log', label: 'Log', icon: 'stats-chart-outline', on: 'stats-chart' },
  { key: 'fang', label: 'Fang', icon: 'file-tray-outline', on: 'file-tray' },
  { key: 'projekter', label: 'Projekter', icon: 'grid-outline', on: 'grid' },
] as const;

type TabKey = (typeof TABS)[number]['key'];

export default function App() {
  const scheme = useColorScheme();
  const t = scheme === 'dark' ? dark : light;
  const [tab, setTab] = useState<TabKey>('dag');
  const [db, setDb] = useState<DB>(empty);
  const [klar, setKlar] = useState(false);

  useEffect(() => {
    load().then((d) => {
      setDb(d);
      setKlar(true);
      opdaterWidget(d);
    });
  }, []);

  function update(fn: (d: DB) => DB) {
    setDb((prev) => {
      const next = fn(prev);
      save(next);
      opdaterWidget(next);
      return next;
    });
  }

  return (
    <SafeAreaProvider>
      <StatusBar style={scheme === 'dark' ? 'light' : 'dark'} />
      <SafeAreaView style={[s.root, { backgroundColor: t.bg }]} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={s.root}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {!klar ? (
            <View style={s.center}>
              <ActivityIndicator color={t.accent} />
            </View>
          ) : tab === 'dag' ? (
            <Dag db={db} update={update} t={t} navn={NAVN} />
          ) : tab === 'log' ? (
            <Log db={db} update={update} t={t} />
          ) : tab === 'fang' ? (
            <Fang db={db} update={update} t={t} />
          ) : (
            <Projekter t={t} />
          )}

          <View style={[s.tabbar, { borderTopColor: t.line, backgroundColor: t.card }]}>
            {TABS.map((x) => {
              const aktiv = tab === x.key;
              return (
                <Pressable key={x.key} style={s.tab} onPress={() => setTab(x.key)} accessibilityRole="button">
                  <Ionicons name={(aktiv ? x.on : x.icon) as any} size={23} color={aktiv ? t.accent : t.faint} />
                  <Text style={[s.tabLabel, { color: aktiv ? t.accent : t.faint }]}>{x.label}</Text>
                </Pressable>
              );
            })}
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  tabbar: { flexDirection: 'row', borderTopWidth: 1, paddingTop: 8, paddingBottom: 6 },
  tab: { flex: 1, alignItems: 'center', gap: 3 },
  tabLabel: { fontSize: 11, fontWeight: '500' },
});
