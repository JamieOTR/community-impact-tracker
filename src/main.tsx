import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { initWebVitals } from "./observability/webVitals";
import { initSentry } from "./observability/sentry";

initSentry();
initWebVitals();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
