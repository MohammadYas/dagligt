import { useEffect, useState } from 'react';
import {
  View, Text, TextInput, Pressable, ScrollView, StyleSheet,
  ActivityIndicator, Platform, KeyboardAvoidingView,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { Theme } from '../theme';
import { Type } from '../type';
import { hentFil, gemFil, DropboxFejl } from '../dropbox';

const MONO = Platform.OS === 'ios' ? 'Menlo' : 'monospace';

const FILER = [
  {
    sti: '/bureauer.txt',
    navn: 'Arbejdspladser',
    hjaelp: 'Rækkefølgen = prioritet (øverst vinder).\nSæt # foran for at slå en arbejdsplads FRA.',
  },
  {
    sti: '/steder.txt',
    navn: 'Stednavne',
    hjaelp:
      'Kun for steder der hedder HELT forskelligt i de to arbejdspladser.\nFormat: Navn i den ene = Navn i den anden.',
  },
];

type Felt = { tekst: string; henter: boolean; gemmer: boolean; gemt: boolean; fejl: string | null };

const TOM: Felt = { tekst: '', henter: true, gemmer: false, gemt: false, fejl: null };

export default function Indstillinger({ t }: { t: Theme }) {
  const [felter, setFelter] = useState<Record<string, Felt>>({});

  useEffect(() => {
    (async () => {
      for (const f of FILER) {
        try {
          const tekst = await hentFil(f.sti);
          setFelter((m) => ({ ...m, [f.sti]: { ...TOM, tekst, henter: false } }));
        } catch (e) {
          setFelter((m) => ({
            ...m,
            [f.sti]: {
              ...TOM,
              henter: false,
              fejl: e instanceof DropboxFejl ? e.besked : 'Kunne ikke hente filen.',
            },
          }));
        }
      }
    })();
  }, []);

  function skriv(sti: string, tekst: string) {
    setFelter((m) => ({ ...m, [sti]: { ...(m[sti] ?? TOM), tekst, gemt: false } }));
  }

  async function gem(sti: string) {
    const felt = felter[sti];
    if (!felt) return;
    setFelter((m) => ({ ...m, [sti]: { ...felt, gemmer: true, fejl: null } }));
    try {
      await gemFil(sti, felt.tekst);
      setFelter((m) => ({ ...m, [sti]: { ...(m[sti] ?? felt), gemmer: false, gemt: true } }));
      setTimeout(
        () => setFelter((m) => ({ ...m, [sti]: { ...(m[sti] ?? felt), gemt: false } })),
        2400,
      );
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setFelter((m) => ({
        ...m,
        [sti]: {
          ...(m[sti] ?? felt),
          gemmer: false,
          fejl: e instanceof DropboxFejl ? e.besked : 'Kunne ikke gemme filen.',
        },
      }));
    }
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={s.pad}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[s.h1, { color: t.text }]}>Indstillinger</Text>

        {FILER.map((f) => {
          const felt = felter[f.sti] ?? TOM;
          return (
            <View key={f.sti} style={s.sektion}>
              <Text style={[s.navn, { color: t.text }]}>{f.navn}</Text>
              <Text style={[s.hjaelp, { color: t.faint }]}>{f.hjaelp}</Text>

              {felt.henter ? (
                <ActivityIndicator color={t.accent} style={s.spinner} />
              ) : (
                <TextInput
                  style={[s.felt, { backgroundColor: t.card, color: t.text, borderColor: t.line }]}
                  value={felt.tekst}
                  onChangeText={(v) => skriv(f.sti, v)}
                  multiline
                  textAlignVertical="top"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              )}

              {felt.fejl ? <Text style={[s.fejl, { color: t.fejl }]}>{felt.fejl}</Text> : null}

              <Pressable
                onPress={() => gem(f.sti)}
                disabled={felt.henter || felt.gemmer}
                style={[s.gem, { backgroundColor: t.accent, opacity: felt.henter || felt.gemmer ? 0.6 : 1 }]}
              >
                {felt.gemmer ? (
                  <ActivityIndicator color={t.bg} size="small" />
                ) : (
                  <Text style={[s.gemTekst, { color: felt.gemt ? t.done : t.bg }]}>
                    {felt.gemt ? 'Gemt' : 'Gem'}
                  </Text>
                )}
              </Pressable>
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  pad: { paddingHorizontal: 24, paddingTop: 26, paddingBottom: 48 },
  h1: { ...Type.largeTitle, marginBottom: 14 },

  sektion: { marginTop: 22 },
  navn: { ...Type.title3, marginBottom: 4 },
  hjaelp: { ...Type.caption1, lineHeight: 18, marginBottom: 10 },

  felt: {
    fontFamily: MONO,
    fontSize: 13,
    lineHeight: 20,
    minHeight: 160,
    maxHeight: 340,
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
  },
  spinner: { marginTop: 16 },

  fejl: { ...Type.caption1, marginTop: 8 },

  gem: {
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    alignSelf: 'flex-start',
    minWidth: 104,
  },
  gemTekst: { ...Type.callout, fontWeight: '600' },
});
