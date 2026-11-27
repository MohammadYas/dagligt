// adgang must load first: it reads and clears #n=… before the router looks at the hash.
import '../src/adgang';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles.css';
import App from './App';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
