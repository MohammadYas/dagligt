/**
 * TOTP efter RFC 6238, skrevet i ren JavaScript.
 * Ingen afhaengigheder: React Native har hverken Node-crypto eller
 * WebCrypto's subtle paa alle platforme, og en engangskode maa ikke
 * afhaenge af at et native modul er til stede.
 */

/** Base32 uden padding, som authenticator-hemmeligheder altid er skrevet i. */
export function base32(s: string): Uint8Array {
  const ALFABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const rent = s.toUpperCase().replace(/[\s-]/g, '').replace(/=+$/, '');

  let bits = 0;
  let vaerdi = 0;
  const ud: number[] = [];

  for (const tegn of rent) {
    const i = ALFABET.indexOf(tegn);
    if (i < 0) throw new Error('Hemmeligheden indeholder tegn der ikke er base32.');
    vaerdi = (vaerdi << 5) | i;
    bits += 5;
    if (bits >= 8) {
      ud.push((vaerdi >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  if (!ud.length) throw new Error('Hemmeligheden er tom.');
  return new Uint8Array(ud);
}

// --- SHA-1 ---------------------------------------------------------------

function sha1(besked: Uint8Array): Uint8Array {
  const ml = besked.length * 8;
  const medPad = new Uint8Array((((besked.length + 8) >> 6) + 1) * 64);
  medPad.set(besked);
  medPad[besked.length] = 0x80;

  const dv = new DataView(medPad.buffer);
  dv.setUint32(medPad.length - 4, ml >>> 0, false);
  dv.setUint32(medPad.length - 8, Math.floor(ml / 0x100000000), false);

  let h0 = 0x67452301, h1 = 0xefcdab89, h2 = 0x98badcfe, h3 = 0x10325476, h4 = 0xc3d2e1f0;
  const w = new Int32Array(80);

  for (let i = 0; i < medPad.length; i += 64) {
    for (let j = 0; j < 16; j++) w[j] = dv.getInt32(i + j * 4, false);
    for (let j = 16; j < 80; j++) {
      const n = w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16];
      w[j] = (n << 1) | (n >>> 31);
    }

    let a = h0, b = h1, c = h2, d = h3, e = h4;
    for (let j = 0; j < 80; j++) {
      let f: number, k: number;
      if (j < 20) { f = (b & c) | (~b & d); k = 0x5a827999; }
      else if (j < 40) { f = b ^ c ^ d; k = 0x6ed9eba1; }
      else if (j < 60) { f = (b & c) | (b & d) | (c & d); k = 0x8f1bbcdc; }
      else { f = b ^ c ^ d; k = 0xca62c1d6; }

      const t = (((a << 5) | (a >>> 27)) + f + e + k + w[j]) | 0;
      e = d; d = c; c = (b << 30) | (b >>> 2); b = a; a = t;
    }
    h0 = (h0 + a) | 0; h1 = (h1 + b) | 0; h2 = (h2 + c) | 0;
    h3 = (h3 + d) | 0; h4 = (h4 + e) | 0;
  }

  const ud = new Uint8Array(20);
  new DataView(ud.buffer).setInt32(0, h0, false);
  new DataView(ud.buffer).setInt32(4, h1, false);
  new DataView(ud.buffer).setInt32(8, h2, false);
  new DataView(ud.buffer).setInt32(12, h3, false);
  new DataView(ud.buffer).setInt32(16, h4, false);
  return ud;
}

function hmacSha1(noegle: Uint8Array, besked: Uint8Array): Uint8Array {
  const BLOK = 64;
  let k = noegle.length > BLOK ? sha1(noegle) : noegle;

  const ipad = new Uint8Array(BLOK);
  const opad = new Uint8Array(BLOK);
  ipad.set(k);
  opad.set(k);
  for (let i = 0; i < BLOK; i++) {
    ipad[i] ^= 0x36;
    opad[i] ^= 0x5c;
  }

  const indre = new Uint8Array(BLOK + besked.length);
  indre.set(ipad);
  indre.set(besked, BLOK);

  const h = sha1(indre);
  const ydre = new Uint8Array(BLOK + h.length);
  ydre.set(opad);
  ydre.set(h, BLOK);
  return sha1(ydre);
}

// --- TOTP ----------------------------------------------------------------

export const PERIODE = 30;

/** Koden for et givet tidspunkt. ms udelades i praksis; den findes for test. */
export function kode(hemmelighed: string, ms: number = Date.now(), cifre = 6): string {
  const taeller = Math.floor(ms / 1000 / PERIODE);

  const besked = new Uint8Array(8);
  const dv = new DataView(besked.buffer);
  dv.setUint32(0, Math.floor(taeller / 0x100000000), false);
  dv.setUint32(4, taeller >>> 0, false);

  const h = hmacSha1(base32(hemmelighed), besked);
  const offset = h[19] & 0x0f;
  const tal =
    ((h[offset] & 0x7f) << 24) |
    ((h[offset + 1] & 0xff) << 16) |
    ((h[offset + 2] & 0xff) << 8) |
    (h[offset + 3] & 0xff);

  return String(tal % 10 ** cifre).padStart(cifre, '0');
}

/** Sekunder tilbage af det nuvaerende vindue. */
export function tilbage(ms: number = Date.now()): number {
  return PERIODE - (Math.floor(ms / 1000) % PERIODE);
}

export type Konto = { id: string; navn: string; hemmelighed: string };

/**
 * Laeser en otpauth-URI fra en QR-kode, eller tager en raa hemmelighed.
 * Returnerer null hvis hverken kan bruges.
 */
export function fraTekst(raa: string): { navn: string; hemmelighed: string } | null {
  const t = raa.trim();

  if (/^otpauth:\/\//i.test(t)) {
    try {
      const u = new URL(t);
      const h = u.searchParams.get('secret');
      if (!h) return null;
      const sti = decodeURIComponent(u.pathname.replace(/^\/+/, ''));
      const udsteder = u.searchParams.get('issuer');
      const navn = udsteder && !sti.startsWith(udsteder) ? `${udsteder}: ${sti}` : sti;
      return { navn: navn || 'Konto', hemmelighed: h };
    } catch {
      return null;
    }
  }

  const rent = t.replace(/[\s-]/g, '');
  if (!/^[A-Za-z2-7]{16,}$/.test(rent)) return null;
  return { navn: '', hemmelighed: rent };
}
