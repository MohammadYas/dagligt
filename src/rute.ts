export type Stop = { id: string; tekst: string; lon: number; lat: number };

export type Rute = {
  /** Stoppene i den raekkefoelge de skal koeres. */
  orden: Stop[];
  /** Samlet koeretid i sekunder, og afstand i meter. */
  sekunder: number;
  meter: number;
  /** true naar tiderne kommer fra vejnettet, false naar de er skoennet. */
  rigtigeTider: boolean;
};

const OSRM = 'https://router.project-osrm.org';

/**
 * Optimerer raekkefoelgen. Foerste stop bliver hvor du starter, sidste stop
 * bliver hvor du slutter; alt derimellem sorteres efter faktisk koeretid.
 */
export async function planlaeg(stop: Stop[], signal?: AbortSignal): Promise<Rute> {
  if (stop.length < 2) {
    return { orden: stop, sekunder: 0, meter: 0, rigtigeTider: true };
  }

  try {
    return await viaVejnet(stop, signal);
  } catch {
    // Uden net eller uden svar sorterer vi paa fugleflugt i stedet.
    return skoennet(stop);
  }
}

async function viaVejnet(stop: Stop[], signal?: AbortSignal): Promise<Rute> {
  const koord = stop.map((s) => `${s.lon},${s.lat}`).join(';');
  const url =
    `${OSRM}/trip/v1/driving/${koord}` +
    `?source=first&destination=last&roundtrip=false&overview=false`;

  const svar = await fetch(url, { signal });
  if (!svar.ok) throw new Error('rute utilgaengelig');

  const j = (await svar.json()) as {
    code: string;
    trips?: { duration: number; distance: number }[];
    waypoints?: { waypoint_index: number }[];
  };
  if (j.code !== 'Ok' || !j.trips?.length || !j.waypoints) throw new Error(j.code);

  // waypoint_index fortaeller hvor i ruten hvert indsendt stop havnede.
  const orden = [...stop]
    .map((s, i) => ({ s, plads: j.waypoints![i].waypoint_index }))
    .sort((a, b) => a.plads - b.plads)
    .map((x) => x.s);

  return {
    orden,
    sekunder: Math.round(j.trips[0].duration),
    meter: Math.round(j.trips[0].distance),
    rigtigeTider: true,
  };
}

/** Naermeste nabo fra foerste stop, derefter 2-opt. Bruges kun som reserve. */
function skoennet(stop: Stop[]): Rute {
  const start = stop[0];
  const slut = stop[stop.length - 1];
  const midt = stop.slice(1, -1);

  const orden: Stop[] = [start];
  const rest = [...midt];
  let nu = start;
  while (rest.length) {
    let bedst = 0;
    let bedstAfstand = Infinity;
    rest.forEach((k, i) => {
      const d = luftlinje(nu, k);
      if (d < bedstAfstand) {
        bedstAfstand = d;
        bedst = i;
      }
    });
    nu = rest.splice(bedst, 1)[0];
    orden.push(nu);
  }
  orden.push(slut);

  toOpt(orden);

  let meter = 0;
  for (let i = 0; i < orden.length - 1; i++) meter += luftlinje(orden[i], orden[i + 1]);

  return {
    orden,
    // 40 km/t er et roligt bygennemsnit med stop undervejs.
    sekunder: Math.round((meter / 1000 / 40) * 3600),
    meter: Math.round(meter),
    rigtigeTider: false,
  };
}

/** Bytter par af kanter saa laenge det forkorter ruten. Start og slut ligger fast. */
function toOpt(r: Stop[]) {
  let bedre = true;
  while (bedre) {
    bedre = false;
    for (let i = 1; i < r.length - 2; i++) {
      for (let k = i + 1; k < r.length - 1; k++) {
        const foer = luftlinje(r[i - 1], r[i]) + luftlinje(r[k], r[k + 1]);
        const efter = luftlinje(r[i - 1], r[k]) + luftlinje(r[i], r[k + 1]);
        if (efter < foer - 1) {
          const del = r.slice(i, k + 1).reverse();
          r.splice(i, del.length, ...del);
          bedre = true;
        }
      }
    }
  }
}

function luftlinje(a: Stop, b: Stop): number {
  const R = 6371000;
  const rad = (g: number) => (g * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Google Maps tager hoejst 9 mellemstop pr. link, saa lange ruter deles i etaper. */
export function kortLinks(orden: Stop[], startErMigSelv = false): string[] {
  if (orden.length < 2) return [];

  const etaper: Stop[][] = [];
  const MAKS = 11; // start + 9 mellemstop + slut
  let i = 0;
  while (i < orden.length - 1) {
    const del = orden.slice(i, i + MAKS);
    etaper.push(del);
    i += MAKS - 1; // sidste stop i en etape er foerste i den naeste
  }

  return etaper.map((del, i) => {
    const p = (s: Stop) => `${s.lat},${s.lon}`;
    // Starter ruten hvor du staar, udelades origin: Maps bruger din
    // position i det oejeblik du aabner linket, ikke da du lagde ruten.
    const skipOrigin = startErMigSelv && i === 0;
    const mellem = (skipOrigin ? del.slice(0, -1) : del.slice(1, -1)).map(p).join('|');
    return (
      'https://www.google.com/maps/dir/?api=1' +
      (skipOrigin ? '' : `&origin=${p(del[0])}`) +
      `&destination=${p(del[del.length - 1])}` +
      (mellem ? `&waypoints=${encodeURIComponent(mellem)}` : '') +
      '&travelmode=driving'
    );
  });
}

export function tid(sekunder: number): string {
  const min = Math.round(sekunder / 60);
  if (min < 60) return `${min} min`;
  const timer = Math.floor(min / 60);
  const rest = min % 60;
  return rest ? `${timer} t ${rest} min` : `${timer} t`;
}

export function afstand(meter: number): string {
  return meter < 1000 ? `${meter} m` : `${(meter / 1000).toFixed(1)} km`;
}
