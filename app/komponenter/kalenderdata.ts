const pad = (n: number) => String(n).padStart(2, '0');

/** Cells for one month, Monday first. null = blank before the 1st. maaned is 0-based. */
export function maanedsCeller(aar: number, maaned: number): (string | null)[] {
  const foran = (new Date(aar, maaned, 1).getDay() + 6) % 7;
  const dage = new Date(aar, maaned + 1, 0).getDate();
  const celler: (string | null)[] = Array(foran).fill(null);
  for (let d = 1; d <= dage; d++) celler.push(`${aar}-${pad(maaned + 1)}-${pad(d)}`);
  return celler;
}

/** Month slide variants. The month on its way out ignores taps, so a tap right after a swipe lands on the new month. */
export function maanedsVarianter(forskyd: number) {
  return {
    ind: (r: number) => ({ x: r * forskyd, opacity: 0, pointerEvents: 'none' as const }),
    mid: { x: 0, opacity: 1, pointerEvents: 'auto' as const },
    ud: (r: number) => ({ x: -r * forskyd, opacity: 0, pointerEvents: 'none' as const }),
  };
}
