/**
 * Noeglerne hoerer ikke til i koden. Repoet er offentligt, og et
 * build-artefakt derfra kan hentes af enhver — saa en refresh-token der
 * aldrig udloeber maa ikke bages ind i IPA'en.
 *
 * De indtastes i stedet én gang paa telefonen og ligger i Keychain.
 * Under udvikling laeses .env, saa der ikke skal tastes for hver genstart.
 */
export type Konfig = {
  dropboxAppKey: string;
  dropboxAppSecret: string;
  dropboxRefresh: string;
  dropboxToken: string;
  deepseek: string;
};

const TOM: Konfig = {
  dropboxAppKey: '',
  dropboxAppSecret: '',
  dropboxRefresh: '',
  dropboxToken: '',
  deepseek: '',
};

const NOEGLE = 'dagligapp.konfig';

// Browseren har ingen Keychain. Tjekket sker paa runtime i stedet for
// gennem react-native, saa denne fil kan laeses af testene under node.
const erBrowser = typeof document !== 'undefined';

let Sikker: typeof import('expo-secure-store') | null = null;
try {
  if (!erBrowser) Sikker = require('expo-secure-store');
} catch {
  Sikker = null;
}

const fraEnv: Konfig = {
  dropboxAppKey: process.env.EXPO_PUBLIC_DROPBOX_APP_KEY ?? '',
  dropboxAppSecret: process.env.EXPO_PUBLIC_DROPBOX_APP_SECRET ?? '',
  dropboxRefresh: process.env.EXPO_PUBLIC_DROPBOX_REFRESH_TOKEN ?? '',
  dropboxToken: process.env.EXPO_PUBLIC_DROPBOX_TOKEN ?? '',
  deepseek: process.env.EXPO_PUBLIC_DEEPSEEK_KEY ?? '',
};

let cache: Konfig | null = null;

/** Det der er tastet ind slaar det der stod i .env. */
export async function hentKonfig(): Promise<Konfig> {
  if (cache) return cache;

  let gemt: Partial<Konfig> = {};
  if (Sikker) {
    try {
      const raa = await Sikker.getItemAsync(NOEGLE);
      if (raa) gemt = JSON.parse(raa) as Partial<Konfig>;
    } catch {}
  }

  cache = { ...TOM, ...fraEnv };
  for (const [k, v] of Object.entries(gemt)) {
    if (typeof v === 'string' && v.trim()) cache[k as keyof Konfig] = v.trim();
  }
  return cache;
}

export async function gemKonfig(ny: Partial<Konfig>): Promise<Konfig> {
  const nu = await hentKonfig();
  const samlet: Konfig = { ...nu, ...ny };
  cache = samlet;

  if (Sikker) {
    try {
      await Sikker.setItemAsync(NOEGLE, JSON.stringify(samlet));
    } catch {}
  }
  return samlet;
}

export function harDropbox(k: Konfig): boolean {
  return Boolean(k.dropboxToken || (k.dropboxRefresh && k.dropboxAppKey && k.dropboxAppSecret));
}

export function harDeepSeek(k: Konfig): boolean {
  return k.deepseek.length > 0;
}

/** Til opsaetningsskaermen: hvad der er sat, uden at afsloere vaerdien. */
export function maske(v: string): string {
  if (!v) return 'ikke sat';
  if (v.length <= 8) return '••••';
  return v.slice(0, 4) + '…' + v.slice(-4);
}
