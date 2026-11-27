import { useEffect } from 'react';
export default function WebAppearance() {
  useEffect(() => {
    document.documentElement.lang = 'da'; document.title = 'VagtStatus';
    let meta = document.querySelector('meta[name="viewport"]');
    if (!meta) { meta = document.createElement('meta'); meta.setAttribute('name', 'viewport'); document.head.appendChild(meta); }
    meta.setAttribute('content', 'width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover');
    const stopGestureZoom = (event: Event) => event.preventDefault();
    document.addEventListener('gesturestart', stopGestureZoom, { passive: false });
    document.addEventListener('gesturechange', stopGestureZoom, { passive: false });
    return () => { document.removeEventListener('gesturestart', stopGestureZoom); document.removeEventListener('gesturechange', stopGestureZoom); };
  }, []);
  return <style>{`
    :root { color-scheme: dark; }
    html, body, #root { margin: 0; background: #000; min-height: 100dvh; height: 100dvh; overflow-x: clip; touch-action: pan-y; }
    body { overscroll-behavior-y: none; }
    *, *::before, *::after { box-sizing: border-box; }
    input, textarea, button { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; }
    :focus-visible { outline: 2px solid #64a8ff !important; outline-offset: -2px; }
    [role=button], [role=tab], button { touch-action: manipulation; }
    [role=button]:hover, [role=tab]:hover { filter: brightness(1.14); }
    input[type=date] { color-scheme: dark; min-width: 0; width: 100%; font-size: 17px; }
    @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } }
    @media (prefers-contrast: more) { input, [role=switch] { border: 2px solid currentColor !important; } }
  `}</style>;
}
