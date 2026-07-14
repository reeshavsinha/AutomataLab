import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Menu, MenuItem, PredefinedMenuItem } from '@tauri-apps/api/menu';
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
const isBenignError = (msg: string) => {
  return msg.includes('resizeobserver') || 
         msg.includes('resize observer') || 
         msg === 'canceled' || 
         msg === 'script error' || 
         msg.includes('script error.');
};

window.addEventListener('error', (e) => {
  const msg = (typeof e === 'string' ? e : (e.error?.message || e.message || '')).toLowerCase();
  if (isBenignError(msg)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }
  renderError(e.error || e.message);
});
window.addEventListener('unhandledrejection', (e) => {
  const msg = (e.reason?.message || String(e.reason) || '').toLowerCase();
  if (isBenignError(msg)) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }
  renderError(e.reason);
});



// Custom Context Menu Handler
window.addEventListener('contextmenu', async (e) => {
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || 
                  target.tagName === 'TEXTAREA' || 
                  target.isContentEditable ||
                  target.classList.contains('inputarea') ||
                  target.closest('.monaco-editor') !== null;
  const hasSelection = (window.getSelection()?.toString().length || 0) > 0;
  
  if (isInput || hasSelection) {
    // If it's an input or there's text selected, allow the native webview context menu
    // which natively provides Cut, Copy, Paste, etc.
    return;
  }
  
  // Otherwise prevent the default context menu
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
