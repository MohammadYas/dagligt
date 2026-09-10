/**
 * Bygger web-udgaven med et tidsstempel indbygget.
 *
 * Stemplet vises nederst i appen, saa det kan afgoeres om telefonen
 * rent faktisk har hentet den nye version — i stedet for at gaette.
 */
import { execFileSync } from 'node:child_process';

const nu = new Date();
const p = (n) => String(n).padStart(2, '0');
const udgave = p(nu.getHours()) + p(nu.getMinutes());

console.log('==> Udgave ' + udgave);

execFileSync(
  'npx',
  ['expo', 'export', '--platform', 'web', '--output-dir', 'dist'],
  { stdio: 'inherit', shell: true, env: { ...process.env, EXPO_PUBLIC_UDGAVE: udgave } },
);
