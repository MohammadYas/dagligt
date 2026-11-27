// Web branch of src/placering.ts: the browser's own geolocation, one reading per route.
export type Punkt = { lon: number; lat: number };
export type Tilstand = 'ukendt' | 'henter' | 'klar' | 'afvist' | 'utilgaengelig';

export function hentPlacering(): Promise<{ tilstand: Tilstand; punkt: Punkt | null }> {
  if (!navigator.geolocation) return Promise.resolve({ tilstand: 'utilgaengelig', punkt: null });
  return new Promise(klar => {
    navigator.geolocation.getCurrentPosition(
      p => klar({ tilstand: 'klar', punkt: { lon: p.coords.longitude, lat: p.coords.latitude } }),
      f => klar({ tilstand: f.code === 1 ? 'afvist' : 'utilgaengelig', punkt: null }),
      { enableHighAccuracy: false, timeout: 12000, maximumAge: 60000 },
    );
  });
}

export function forklar(t: Tilstand): string {
  switch (t) {
    case 'henter': return 'Finder dig…';
    case 'klar': return 'Ruten starter, hvor du står.';
    case 'afvist': return 'Appen har ikke adgang til din placering. Tillad det i telefonens indstillinger.';
    case 'utilgaengelig': return 'Din placering kunne ikke findes lige nu.';
    default: return '';
  }
}
