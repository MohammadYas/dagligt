/**
 * Adgangskontrol for mellemleddene.
 *
 * Adressen er offentlig — en adresse kan ikke holdes hemmelig. Derfor
 * kraever hvert kald en kode, som ligger i Netlifys miljoevariabler og
 * i telefonens lokale lager. Uden den svarer funktionerne 401, og
 * hverken Dropbox-filerne eller DeepSeek-kontoen kan naas.
 */
export function harAdgang(request) {
  const forventet = process.env.APP_ADGANGSKODE ?? '';
  if (!forventet) return false;

  const givet =
    request.headers.get('x-adgang') ??
    new URL(request.url).searchParams.get('n') ??
    '';

  if (givet.length !== forventet.length) return false;

  // Sammenligner hele strengen uanset hvor den afviger, saa svartiden
  // ikke roeber hvor mange tegn der var rigtige.
  let forskel = 0;
  for (let i = 0; i < forventet.length; i++) {
    forskel |= forventet.charCodeAt(i) ^ givet.charCodeAt(i);
  }
  return forskel === 0;
}

export const AFVIST = new Response('Ingen adgang.', {
  status: 401,
  headers: { 'Cache-Control': 'no-store' },
});
