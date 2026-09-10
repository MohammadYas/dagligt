const NOEGLE = process.env.EXPO_PUBLIC_DEEPSEEK_KEY ?? '';

export const harDeepSeek = NOEGLE.length > 0;

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
  if (!harDeepSeek) throw new Error('Ingen DeepSeek-nøgle i .env.');

  const svar = await fetch('https://api.deepseek.com/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOEGLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: SYSTEM },
        { role: 'user', content: raa },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!svar.ok) {
    if (svar.status === 401) throw new Error('DeepSeek afviste nøglen.');
    if (svar.status === 402) throw new Error('DeepSeek-kontoen har ingen kredit tilbage.');
    if (svar.status === 429) throw new Error('For mange kald til DeepSeek lige nu.');
    throw new Error(`DeepSeek svarede ${svar.status}.`);
  }

  const data = await svar.json();
  const indhold: string = data?.choices?.[0]?.message?.content ?? '';

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
  return {
    titel: titel || raa.slice(0, 48),
    tekst: tekst || raa,
  };
}
