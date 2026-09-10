import { spoerg } from './ai';

export { kanRense } from './ai';

export type Renset = { titel: string; tekst: string };

const SYSTEM = [
  'Du rydder op i råt nedskrevne idéer på dansk.',
  'Du opfinder aldrig indhold. Står der lidt, skriver du lidt.',
  'Svar udelukkende med JSON på formen {"titel": "...", "tekst": "..."}.',
  'titel: højst 6 ord, ingen punktum, siger hvad idéen er.',
  'tekst: 1-3 hele sætninger der gengiver idéen klart. Behold personens egne ord hvor de bærer mening.',
].join(' ');

/** Sender den raa tanke gennem DeepSeek og faar en titel og en ren tekst tilbage. */
export async function rens(raa: string): Promise<Renset> {
  const indhold = await spoerg({
    beskeder: [
      { role: 'system', content: SYSTEM },
      { role: 'user', content: raa },
    ],
    somJson: true,
  });

  let j: { titel?: unknown; tekst?: unknown };
  try {
    j = JSON.parse(indhold);
  } catch {
    throw new Error('DeepSeek svarede ikke med gyldig JSON.');
  }

  const titel = typeof j.titel === 'string' ? j.titel.trim() : '';
  const tekst = typeof j.tekst === 'string' ? j.tekst.trim() : '';
  if (!titel && !tekst) throw new Error('DeepSeek returnerede et tomt svar.');

  // Falder tilbage paa den raa tanke, saa en note aldrig ender tom.
  return { titel: titel || raa.slice(0, 48), tekst: tekst || raa };
}
