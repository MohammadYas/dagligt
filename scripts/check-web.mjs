// Check built files without printing any private environment values.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import assert from 'node:assert/strict';
const files = readdirSync('dist', { recursive: true }).filter(p => /\.(html|js)$/.test(p));
const bundle = files.map(p => readFileSync(join('dist', p), 'utf8')).join('\n');
assert.ok(!bundle.includes('EXPO_PUBLIC_DROPBOX'), 'Native Dropbox configuration must not enter the web bundle');
if (existsSync('.env')) {
  for (const line of readFileSync('.env', 'utf8').split(/\r?\n/)) {
    const pair = /^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/.exec(line);
    if (!pair || !/DROPBOX|TOKEN|SECRET|DEEPSEEK|ADGANGSKODE/.test(pair[1])) continue;
    const value = pair[2].replace(/^['"]|['"]$/g, '');
    if (value.length > 8) assert.ok(!bundle.includes(value), 'Private environment value found in web export');
  }
}
const html = readFileSync('dist/index.html', 'utf8');
assert.equal((html.match(/name="viewport"/g) ?? []).length, 1);
assert.ok(html.includes('viewport-fit=cover') && html.includes('maximum-scale=1') && html.includes('user-scalable=no'));
assert.ok(html.includes('lang="da"') && html.includes('<title>VagtStatus</title>'));
console.log('Web export: no known private values; Danish title; fixed-scale safe-area viewport.');
