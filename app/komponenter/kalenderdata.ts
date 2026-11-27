const pad = (n: number) => String(n).padStart(2, '0');

/** Cells for one month, Monday first. null = blank before the 1st. maaned is 0-based. */
export function maanedsCeller(aar: number, maaned: number): (string | null)[] {
  const foran = (new Date(aar, maaned, 1).getDay() + 6) % 7;
  const dage = new Date(aar, maaned + 1, 0).getDate();
  const celler: (string | null)[] = Array(foran).fill(null);
  for (let d = 1; d <= dage; d++) celler.push(`${aar}-${pad(maaned + 1)}-${pad(d)}`);
  return celler;
}
