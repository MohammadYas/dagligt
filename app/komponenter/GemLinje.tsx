import { AnimatePresence, motion } from 'motion/react';
import type { VagtSession } from '../../src/vagtsession';
import { hurtig, useDaempet } from '../ui/bevaegelse';
import { Knap } from '../ui/kit';

/** Save bar above the tabs. Shown only when there are unsaved edits or a failed save. */
export default function GemLinje({ session }: { session: VagtSession }) {
  const daempet = useDaempet();
  const vis = session.dirtyKeys.length > 0 || !!session.error || session.saving;
  const skjult = daempet ? { opacity: 0 } : { opacity: 0, y: 16 };
  return (
    <AnimatePresence>
      {vis && (
        <motion.div className="gemlinje" role="region" aria-label="Ikke gemte ændringer"
          initial={skjult} animate={{ opacity: 1, y: 0 }} exit={{ ...skjult, transition: { ...hurtig, duration: 0.15 } }} transition={hurtig}>
          <p className={`t-foot${session.error ? ' besked--fejl' : ''}`} role={session.error ? 'alert' : 'status'}>
            {session.error ?? (session.saving ? 'Gemmer…' : 'Du har ændringer, der ikke er gemt.')}
          </p>
          <div className="gemlinje__knapper">
            <Knap label="Annuller" variant="stille" onPress={() => session.cancel()} deaktiveret={session.saving} />
            <Knap label={session.error ? 'Prøv igen' : 'Gem ændringer'} variant="primaer" optaget={session.saving} onPress={() => void session.save()} />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
