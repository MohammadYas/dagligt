import { KeyboardEvent, PointerEvent, ReactNode, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, PanInfo, useAnimation, useDragControls } from 'motion/react';
import { ark, fjeder, hurtig, useDaempet } from './bevaegelse';
import { IkonKnap } from './kit';

const FOKUSERBAR = 'button:not([disabled]), [href], input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])';

/**
 * Bottom sheet. Slides up on the iOS drawer curve, can be dragged down to
 * close (velocity counts, so a flick closes it), traps focus, Escape closes.
 */
export default function Ark({ aaben, onLuk, titel, children, hoejre }: {
  aaben: boolean; onLuk: () => void; titel: string; children: ReactNode; hoejre?: ReactNode;
}) {
  return createPortal(
    <AnimatePresence>{aaben && <Indhold key="ark" onLuk={onLuk} titel={titel} hoejre={hoejre}>{children}</Indhold>}</AnimatePresence>,
    document.body,
  );
}

function Indhold({ onLuk, titel, children, hoejre }: { onLuk: () => void; titel: string; children: ReactNode; hoejre?: ReactNode }) {
  const daempet = useDaempet();
  const flade = useRef<HTMLDivElement>(null);
  const styr = useAnimation();
  const traek = useDragControls();
  const start = (e: PointerEvent) => traek.start(e);
  const ude = daempet ? { opacity: 0 } : { y: '100%' };
  const inde = daempet ? { opacity: 1, y: 0 } : { y: 0 };

  useEffect(() => {
    void styr.start(inde);
    const foer = document.activeElement as HTMLElement | null;
    const forste = flade.current?.querySelector<HTMLElement>(FOKUSERBAR);
    (forste ?? flade.current)?.focus({ preventScroll: true });
    document.documentElement.style.overflow = 'hidden';
    return () => { document.documentElement.style.overflow = ''; foer?.focus?.({ preventScroll: true }); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const tast = (e: KeyboardEvent) => {
    if (e.key === 'Escape') { e.stopPropagation(); onLuk(); return; }
    if (e.key !== 'Tab' || !flade.current) return;
    const alle = [...flade.current.querySelectorAll<HTMLElement>(FOKUSERBAR)];
    if (!alle.length) return;
    const [a, z] = [alle[0], alle[alle.length - 1]];
    if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); }
    else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
  };

  const slip = (_: unknown, info: PanInfo) => {
    const hoejde = flade.current?.offsetHeight ?? 400;
    if (info.offset.y > hoejde * 0.3 || info.velocity.y > 600) onLuk();
    else void styr.start({ y: 0, transition: fjeder });
  };

  return (
    <>
      <motion.div className="ark-bag" onClick={onLuk} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={hurtig} />
      <motion.div
        ref={flade} className="ark" role="dialog" aria-modal="true" aria-label={titel} tabIndex={-1} onKeyDown={tast}
        initial={ude} animate={styr} exit={{ ...ude, transition: { ...ark, duration: 0.3 } }} transition={ark}
        drag="y" dragConstraints={{ top: 0, bottom: 0 }} dragElastic={{ top: 0.05, bottom: 1 }}
        dragListener={false} dragControls={traek} onDragEnd={slip}
      >
        <div className="ark__greb" aria-hidden onPointerDown={start}><span /></div>
        <div className="ark__top" onPointerDown={start} style={{ touchAction: 'none' }}>
          <h2 className="t-title2">{titel}</h2>
          <div style={{ display: 'flex', alignItems: 'center' }}>{hoejre}<IkonKnap navn="luk" label="Luk" onPress={onLuk} /></div>
        </div>
        <div className="ark__indhold">{children}</div>
      </motion.div>
    </>
  );
}
