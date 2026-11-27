import { createPortal } from 'react-dom';
import type { CSSProperties } from 'react';
import { dark as t } from '../../theme';

export default function RaStatusDialog({ name, text, onClose }: { name: string; text: string; onClose: () => void }) {
  const shell: CSSProperties = {
    position: 'fixed', top: 0, right: 0, bottom: 0, left: 0, zIndex: 2147483647,
    display: 'flex', flexDirection: 'column', gap: 12, padding: 16,
    background: t.bg, color: t.text, overscrollBehavior: 'contain',
  };
  const textArea: CSSProperties = {
    flex: 1, width: '100%', minHeight: 0, boxSizing: 'border-box', resize: 'none', overflow: 'auto',
    border: 0, borderRadius: 14, padding: 14, background: t.cardAlt, color: t.text,
    fontFamily: 'Menlo, Monaco, Consolas, monospace', fontSize: 12, lineHeight: 1.5, outline: 'none',
  };
  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`Rå statusfil · ${name}`} style={shell}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <h2 style={{ margin: 0, color: t.text, fontSize: 22, lineHeight: 1.2 }}>{`Rå statusfil · ${name}`}</h2>
        <button type="button" onClick={onClose} aria-label="Luk råfil" style={{ minHeight: 44, padding: '8px 0 8px 16px', border: 0, background: 'transparent', color: t.accent, fontSize: 17, fontWeight: 700, cursor: 'pointer' }}>Luk</button>
      </div>
      <textarea readOnly aria-label={`Hele råstatusfilen for ${name}`} value={text} style={textArea} />
    </div>,
    document.body,
  );
}
