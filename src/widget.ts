import { Platform } from 'react-native';
import { DB, dayKey, longDate, streak } from './store';

const GRUPPE = 'group.dk.mo.madhakka';
const NOEGLE = 'dagsstatus';

// ExtensionStorage findes kun i et rigtigt build. I Expo Go er der intet
// native modul, saa alt herunder skal kunne fejle uden at vaelte appen.
let lager: { set: (k: string, v: string) => void } | null = null;
let genindlaes: (() => void) | null = null;

if (Platform.OS === 'ios') {
  try {
    const { ExtensionStorage } = require('@bacons/apple-targets');
    lager = new ExtensionStorage(GRUPPE);
    genindlaes = () => ExtensionStorage.reloadWidget();
  } catch {
    lager = null;
    genindlaes = null;
  }
}

export function opdaterWidget(db: DB) {
  if (!lager) return;
  const key = dayKey();
  const status = {
    dato: longDate(),
    streak: streak(db.logs),
    opgaver: db.tasks
      .filter((t) => t.date === key)
      .map((t) => ({ id: t.id, tekst: t.text, done: t.done })),
  };
  try {
    lager.set(NOEGLE, JSON.stringify(status));
    genindlaes?.();
  } catch {
    // Widget'en er ikke kritisk. Fejler den, koerer appen videre.
  }
}
