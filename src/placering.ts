import { Platform } from 'react-native';

export type Punkt = { lon: number; lat: number };
export type Tilstand = 'ukendt' | 'henter' | 'klar' | 'afvist' | 'utilgaengelig';

// Modulet findes kun i et rigtigt build. I browseren tages den indbyggede
// geolokation i stedet, saa ruten kan proeves begge steder.
let Sted: typeof import('expo-location') | null = null;
try {
  if (Platform.OS !== 'web') Sted = require('expo-location');
} catch {
  Sted = null;
}

export type Svar = { tilstand: Tilstand; punkt: Punkt | null };

/** Henter én position. Bruges hver gang ruten laegges, ikke loebende. */
export async function hentPlacering(): Promise<Svar> {
  if (Sted) {
    try {
      const lov = await Sted.requestForegroundPermissionsAsync();
      if (!lov.granted) return { tilstand: 'afvist', punkt: null };

      const p = await Sted.getCurrentPositionAsync({
        accuracy: Sted.Accuracy.Balanced,
      });
      return {
        tilstand: 'klar',
        punkt: { lon: p.coords.longitude, lat: p.coords.latitude },
      };
    } catch {
      return { tilstand: 'utilgaengelig', punkt: null };
    }
  }

  const nav = (globalThis as any).navigator;
  if (!nav?.geolocation) return { tilstand: 'utilgaengelig', punkt: null };

  return new Promise<Svar>((klar) => {
    nav.geolocation.getCurrentPosition(
      (p: any) =>
        klar({
          tilstand: 'klar',
          punkt: { lon: p.coords.longitude, lat: p.coords.latitude },
        }),
      (f: any) =>
        klar({ tilstand: f?.code === 1 ? 'afvist' : 'utilgaengelig', punkt: null }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  });
}

export function forklar(t: Tilstand): string {
  switch (t) {
    case 'henter':
      return 'finder dig';
    case 'klar':
      return 'ruten starter her';
    case 'afvist':
      return 'appen har ikke adgang til din placering';
    case 'utilgaengelig':
      return 'placeringen kunne ikke hentes';
    default:
      return 'tryk for at bruge din placering';
  }
}
