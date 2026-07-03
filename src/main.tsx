import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App'

const renderError = (err: any) => {
  const div = document.createElement('div');
  div.style.position = 'fixed';
  div.style.top = '0';
  div.style.left = '0';
  div.style.width = '100%';
  div.style.background = 'red';
  div.style.color = 'white';
  div.style.padding = '10px';
  div.style.zIndex = '9999';
  div.style.whiteSpace = 'pre-wrap';
  div.innerText = err instanceof Error ? err.stack || err.message : String(err);
  document.body.appendChild(div);
};
window.addEventListener('error', (e) => renderError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => renderError(e.reason));

// Completely disable the browser context menu to enforce a strict native desktop feel.
window.addEventListener('contextmenu', (e) => {
  e.preventDefault();
}, { capture: true });

// Prevent common browser keyboard shortcuts (Print, Find, DevTools)
window.addEventListener('keydown', (e) => {
  // Ctrl+P (Print)
  if (e.ctrlKey && e.key.toLowerCase() === 'p') {
    e.preventDefault();
  }
  // Ctrl+F (Find)
  if (e.ctrlKey && e.key.toLowerCase() === 'f') {
    e.preventDefault();
  }
  // F12 or Ctrl+Shift+I (DevTools)
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key.toLowerCase() === 'i')) {
    e.preventDefault();
  }
  // F3 (Find next)
  if (e.key === 'F3') {
    e.preventDefault();
  }
}, { capture: true });

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
)
