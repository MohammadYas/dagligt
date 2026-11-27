type Abonnement = { toJSON(): object };

/**
 * Re-sends an already permitted push subscription to the server, so a rotated
 * iOS endpoint is picked up on every launch. Never asks for permission.
 */
export async function bekraeftAbonnement(
  hent: () => Promise<Abonnement | null | undefined>,
  send: (method: string, body?: object) => Promise<void>,
): Promise<boolean> {
  const sub = await hent();
  if (!sub) return false;
  await send('POST', sub.toJSON());
  return true;
}
