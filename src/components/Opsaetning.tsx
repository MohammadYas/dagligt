import { useEffect, useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Platform } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { Type } from '../type';
import { Konfig, hentKonfig, gemKonfig, harDropbox, harDeepSeek, maske } from '../konfig';

type Felt = { key: keyof Konfig; navn: string; hjaelp: string };

const FELTER: Felt[] = [
  { key: 'dropboxAppKey', navn: 'Dropbox app key', hjaelp: 'App Console → din app → Settings' },
  { key: 'dropboxAppSecret', navn: 'Dropbox app secret', hjaelp: 'Samme side, klik Show' },
  { key: 'dropboxRefresh', navn: 'Dropbox refresh-token', hjaelp: 'Udløber aldrig' },
  { key: 'deepseek', navn: 'DeepSeek-nøgle', hjaelp: 'Til rensning af noter og dagens brief' },
];

export default function Opsaetning({ t, daempet }: { t: Theme; daempet: boolean }) {
  const [aaben, setAaben] = useState(false);
  const [k, setK] = useState<Konfig | null>(null);
  const [kladde, setKladde] = useState<Partial<Konfig>>({});
  const [gemt, setGemt] = useState(false);

  useEffect(() => {
    hentKonfig().then(setK);
  }, []);

  async function gem() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    const ny = await gemKonfig(kladde);
    setK(ny);
    setKladde({});
    setGemt(true);
    setTimeout(() => setGemt(false), 2400);
  }

  if (!k) return null;

  const dropboxOk = harDropbox(k);
  const deepseekOk = harDeepSeek(k);
  const noget = Object.values(kladde).some((v) => typeof v === 'string' && v.trim());
  const kanGemme = Platform.OS !== 'web';

  return (
    <View>
      <View style={s.overskrift}>
        <Text style={[s.overskriftTekst, { color: t.text }]}>Nøgler</Text>
        <Pressable onPress={() => setAaben((v) => !v)} hitSlop={10}>
          <Text style={[s.link, { color: t.accent }]}>{aaben ? 'Skjul' : 'Ret'}</Text>
        </Pressable>
      </View>

      <View style={s.status}>
        <Prik t={t} ok={dropboxOk} navn="Dropbox" />
        <Prik t={t} ok={deepseekOk} navn="DeepSeek" />
      </View>

      {!aaben ? (
        <Text style={[s.hjaelp, { color: t.faint }]}>
          {dropboxOk && deepseekOk
            ? 'Begge er sat. De ligger i telefonens Keychain, ikke i appen.'
            : 'Nøglerne følger ikke med appen — repoet er offentligt. Tryk Ret og indsæt dem.'}
        </Text>
      ) : (
        <Animated.View entering={daempet ? undefined : FadeIn.duration(160)}>
          {FELTER.map((f) => (
            <View key={f.key} style={s.felt}>
              <View style={s.feltTop}>
                <Text style={[s.feltNavn, { color: t.text }]}>{f.navn}</Text>
                <Text style={[s.feltNu, { color: t.faint }]}>{maske(k[f.key])}</Text>
              </View>
              <TextInput
                style={[s.input, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
                placeholder={f.hjaelp}
                placeholderTextColor={t.faint}
                value={kladde[f.key] ?? ''}
                onChangeText={(v) => setKladde((d) => ({ ...d, [f.key]: v }))}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry={false}
              />
            </View>
          ))}

          {!kanGemme ? (
            <Text style={[s.hjaelp, { color: t.faint }]}>
              Browseren har ingen Keychain. Nøgler kan kun gemmes på telefonen.
            </Text>
          ) : (
            <Pressable
              onPress={gem}
              disabled={!noget}
              style={[s.gem, { backgroundColor: noget ? t.accent : t.cardAlt }]}
            >
              <Text style={[s.gemTekst, { color: noget ? t.bg : t.faint }]}>
                {gemt ? 'Gemt' : 'Gem nøgler'}
              </Text>
            </Pressable>
          )}
        </Animated.View>
      )}
    </View>
  );
}

function Prik({ t, ok, navn }: { t: Theme; ok: boolean; navn: string }) {
  return (
    <View style={s.prikRum}>
      <View style={[s.prik, { backgroundColor: ok ? t.done : t.faint }]} />
      <Text style={[s.prikNavn, { color: ok ? t.text : t.faint }]}>{navn}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  overskrift: {
    flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between',
    marginTop: 34, marginBottom: 10,
  },
  overskriftTekst: { ...Type.title3 },
  link: { ...Type.footnote },

  status: { flexDirection: 'row', gap: 20, marginBottom: 10 },
  prikRum: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  prik: { width: 8, height: 8, borderRadius: 4 },
  prikNavn: { ...Type.footnote },

  hjaelp: { ...Type.caption1, lineHeight: 18 },

  felt: { marginTop: 14 },
  feltTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 5 },
  feltNavn: { ...Type.footnote, fontWeight: '600' },
  feltNu: { ...Type.caption2 },
  input: { height: 44, borderRadius: 12, borderWidth: 1, paddingHorizontal: 13, ...Type.subhead },

  gem: { height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  gemTekst: { ...Type.callout, fontWeight: '600' },
});
