import { useRef, useState } from 'react';
import { dark as t } from '../../theme';
export default function Traek({ index, name, move, disabled }: { index: number; name: string; move: (from: number, to: number) => void; disabled: boolean }) {
  const active = useRef(false);
  const [dragging, setDragging] = useState(false);
  const [target, setTarget] = useState(index);
  return <button type="button" disabled={disabled} aria-label={'Træk ' + name + ' for at ændre prioritet. Brug pilene som alternativ.'}
    onPointerDown={e => { if (disabled) return; active.current = true; setDragging(true); setTarget(index); e.currentTarget.setPointerCapture(e.pointerId); }}
    onPointerMove={e => {
      if (!active.current) return;
      const rows = Array.from(document.querySelectorAll('[data-agency]'));
      let closest = index, distance = Infinity;
      rows.forEach((row, i) => { const r = row.getBoundingClientRect(); const d = Math.abs(e.clientY - r.top - r.height / 2); if (d < distance) { closest = i; distance = d; } });
      setTarget(closest);
    }}
    onPointerUp={e => { if (active.current) { move(index, target); active.current = false; setDragging(false); e.currentTarget.releasePointerCapture(e.pointerId); } }}
    onPointerCancel={() => { active.current = false; setDragging(false); }}
    style={{ touchAction: 'none', cursor: 'grab', flexShrink: 0, minWidth: 44, height: 44, border: 0, borderRadius: 8, background: dragging ? t.accentBg : 'transparent', color: dragging ? t.accent : t.faint, fontSize: 23 }}>
    {dragging ? target + 1 : '☰'}
  </button>;
}
