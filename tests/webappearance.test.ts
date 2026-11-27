import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import assert from 'node:assert/strict';

const source = readFileSync(new URL('../src/components/WebAppearance.web.tsx', import.meta.url), 'utf8');

test('mobilens faste bundnavigation bruger dynamisk CSS-højde fra første frame', () => {
  assert.match(source, /height:\s*100dvh/);
  assert.doesNotMatch(source, /--app-height/);
  assert.doesNotMatch(source, /visualViewport/);
});
