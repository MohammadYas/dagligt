import { useEffect, useState } from 'react';
import { loadPayData, PayData, savePayData } from '../../src/lon';

let cache: PayData | null = null;
const lyttere = new Set<(d: PayData) => void>();

/** Pay data from localStorage, shared by Hjem and Løn so both update together. */
export function useLoen(): { data: PayData | null; gem(data: PayData): void } {
  const [data, setData] = useState<PayData | null>(cache);
  useEffect(() => {
    lyttere.add(setData);
    if (!cache) void loadPayData().then(d => { cache = d; lyttere.forEach(f => f(d)); });
    return () => { lyttere.delete(setData); };
  }, []);
  const gem = (d: PayData) => { cache = d; void savePayData(d); lyttere.forEach(f => f(d)); };
  return { data, gem };
}
