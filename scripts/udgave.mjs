/**
 * Bygger web-udgaven med et tidsstempel indbygget.
 *
 * Stemplet vises i Indstillinger, saa det kan afgoeres om telefonen
 * rent faktisk har hentet den nye version — i stedet for at gaette.
 */
import { execFileSync } from 'node:child_process';

const nu = new Date();
const p = (n) => String(n).padStart(2, '0');
const udgave = p(nu.getHours()) + p(nu.getMinutes());

console.log('==> Udgave ' + udgave);

execFileSync('npx', ['vite', 'build'], { stdio: 'inherit', shell: true, env: { ...process.env, VITE_UDGAVE: udgave } });
