import { test } from 'node:test';
import assert from 'node:assert/strict';
import { VagtSession } from '../src/vagtsession';
import { bureauer, kontrol } from './fixtures/dropbox.mjs';

test('MultiCare and Akut Hjælp toggles require Gem and Annuller writes nothing', async () => {
  const files: Record<string, string> = { '/bureauer.txt': bureauer, '/kontrol.txt': kontrol };
  const writes: string[] = [];
  const session = new VagtSession(async p => files[p], async (p, text) => { files[p] = text; writes.push(p); });
  await session.load('bureauer'); await session.load('kontrol');
  assert.equal(session.get('bureauer').error, undefined);
  const original = session.get('bureauer').draft!;
  session.edit('bureauer', original.map(r => ({ ...r, aktiv: false })));
  assert.deepEqual(writes, []);
  session.cancel();
  assert.deepEqual(session.get('bureauer').draft, original);
  assert.deepEqual(writes, []);
  session.edit('bureauer', original.map(r => ({ ...r, aktiv: !r.navn.startsWith('MultiCare') })));
  await session.save();
  assert.deepEqual(writes, ['/bureauer.txt']);
  assert.equal(files['/bureauer.txt'], bureauer.replace('\nMultiCare-', '\n# MultiCare-'));
  assert.equal(files['/kontrol.txt'], kontrol);
  await session.load('bureauer');
  assert.equal(session.get('bureauer').draft![1].aktiv, false);
});

function setup() {
  const files: Record<string, string> = { '/kontrol.txt': 'CAS: ON\nTØRN: OFF\n', '/dage.txt': 'Team Forlev\n' };
  const writes: string[] = [];
  const session = new VagtSession(async p => files[p] ?? '', async (p, text) => { writes.push(p); files[p] = text; });
  return { files, writes, session };
}
test('editing never writes; cancel restores the saved snapshot', async () => {
  const { session, writes } = setup();
  await session.load('kontrol');
  session.edit('kontrol', { cas: false, torn: true });
  assert.equal(session.dirtyKeys.length, 1);
  assert.equal(writes.length, 0);
  session.cancel();
  assert.deepEqual(session.get('kontrol').draft, { cas: true, torn: false });
  assert.equal(session.dirtyKeys.length, 0);
});
test('save overwrites the correct file and checkpoints it', async () => {
  const { session, files, writes } = setup();
  await session.load('kontrol');
  session.edit('kontrol', { cas: false, torn: true });
  await session.save();
  assert.deepEqual(writes, ['/kontrol.txt']);
  assert.equal(files['/kontrol.txt'], 'CAS: OFF\nTØRN: ON\n');
  assert.equal(session.dirtyKeys.length, 0);
  assert.equal(session.message, 'Gemt ✓');
});
test('failed save retains draft; successful files are not repeated', async () => {
  const { session, files } = setup();
  await session.load('kontrol'); await session.load('cas');
  session.edit('kontrol', { cas: false, torn: true });
  session.edit('cas', { datoer: ['2026-09-25'], steder: [] });
  session.upload = async (p, t) => { if (p === '/dage.txt') throw new Error('Ingen forbindelse'); files[p] = t; };
  await session.save();
  assert.deepEqual(session.dirtyKeys, ['cas']);
  assert.match(session.error!, /Ingen forbindelse/);
  assert.deepEqual(session.get('cas').draft?.datoer, ['2026-09-25']);
});
test('remote changes cannot silently replace edits', async () => {
  const { session, files, writes } = setup();
  await session.load('kontrol');
  session.edit('kontrol', { cas: false, torn: true });
  files['/kontrol.txt'] = 'CAS: OFF\nTØRN: OFF\n';
  await session.load('kontrol');
  assert.deepEqual(session.get('kontrol').draft, { cas: false, torn: true });
  await session.save();
  assert.equal(writes.length, 0);
  assert.match(session.error!, /ændret/);
});
test('invalid drafts are rejected before any upload', async () => {
  const { session, writes } = setup();
  await session.load('kontrol'); await session.load('par');
  session.edit('kontrol', { cas: false, torn: true });
  session.edit('par', [{ a: 'A', b: '' }]);
  await session.save();
  assert.equal(writes.length, 0);
  assert.equal(session.dirtyKeys.length, 2);
});
test('missing settings are created only after explicit initialization and save', async () => {
  const missing = Object.assign(new Error('missing'), { status: 409 });
  let uploaded = '';
  const session = new VagtSession(async () => { throw missing; }, async (_, t) => { uploaded = t; });
  await session.load('kontrol');
  assert.equal(session.get('kontrol').draft, undefined);
  assert.equal(session.dirtyKeys.length, 0);
  session.initialize('kontrol', { cas: false, torn: false });
  session.cancel();
  assert.equal(session.get('kontrol').draft, undefined);
  session.initialize('kontrol', { cas: false, torn: false });
  await session.save();
  assert.equal(uploaded, 'CAS: OFF\nTØRN: OFF\n');
  assert.equal(session.dirtyKeys.length, 0);
});
test('repeated save taps cannot send duplicate requests', async () => {
  const { session } = setup();
  await session.load('kontrol'); session.edit('kontrol', { cas: false, torn: false });
  let complete!: () => void, count = 0;
  session.upload = async () => { count++; await new Promise<void>(r => { complete = r; }); };
  const first = session.save();
  await new Promise(r => setImmediate(r));
  await session.save();
  assert.equal(count, 1); complete(); await first;
});
test('retry recognizes a confirmed remote value after a lost upload response', async () => {
  const { session, files } = setup();
  await session.load('kontrol');
  session.edit('kontrol', { cas: false, torn: true });
  let uploads = 0;
  session.upload = async (p, text) => { uploads++; files[p] = text; throw new Error('Forbindelsen blev afbrudt'); };
  await session.save();
  assert.equal(session.dirtyKeys.length, 1);
  await session.save();
  assert.equal(session.error, null);
  assert.equal(session.dirtyKeys.length, 0);
  assert.equal(uploads, 1);
});
test('a late refresh cannot undo a newer successful save', async () => {
  const { session, files } = setup();
  await session.load('kontrol');
  const old = files['/kontrol.txt'];
  let finish!: (text: string) => void;
  session.download = () => new Promise<string>(r => { finish = r; });
  const refresh = session.load('kontrol');
  session.edit('kontrol', { cas: false, torn: true });
  session.download = async p => files[p];
  await session.save();
  finish(old); await refresh;
  assert.deepEqual(session.get('kontrol').draft, { cas: false, torn: true });
  assert.equal(session.dirtyKeys.length, 0);
});
test('file-only and new place names remain selectable after deselection and navigation', async () => {
  const { session, files } = setup();
  files['/dage.txt'] = 'Mit særlige arbejdssted\n';
  await session.load('cas');
  session.edit('cas', { datoer: [], steder: ['Et nyt sted'] });
  session.edit('cas', { datoer: [], steder: [] });
  assert.deepEqual(session.knownPlaces, ['Mit særlige arbejdssted', 'Et nyt sted']);
  session.cancel();
  assert.deepEqual(session.get('cas').draft?.steder, ['Mit særlige arbejdssted']);
});

test('fælles dage og steder kan gemmes til både CAS- og TØRN-filen', async () => {
  const files: Record<string, string> = {
    '/dage.txt': '2026-09-25\nTeam Forlev\n',
    '/torn_dage.txt': '2026-09-26\nTeam Nygade\n',
  };
  const writes: string[] = [];
  const session = new VagtSession(async p => files[p], async (p, text) => { files[p] = text; writes.push(p); });
  await session.load('cas'); await session.load('torn');
  const samlet = { datoer: ['2026-09-25', '2026-09-26'], steder: ['Team Forlev', 'Team Nygade', 'Team Vemmelev'] };
  session.edit('cas', samlet); session.edit('torn', samlet);
  await session.save();
  assert.deepEqual(writes, ['/dage.txt', '/torn_dage.txt']);
  assert.equal(files['/dage.txt'], files['/torn_dage.txt']);
});
