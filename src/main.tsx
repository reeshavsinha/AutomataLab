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
window.addEventListener('error', (e) => renderError(e.error || e.message));
window.addEventListener('unhandledrejection', (e) => renderError(e.reason));



// Custom Context Menu Handler
window.addEventListener('contextmenu', async (e) => {
  e.preventDefault();
  
  const target = e.target as HTMLElement;
  const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;
  const hasSelection = window.getSelection()?.toString().length;
  
  if (isInput || hasSelection) {
    try {
      const menu = await Menu.new({
        items: [
          await PredefinedMenuItem.new({ item: 'Undo', text: 'Undo' }),
          await PredefinedMenuItem.new({ item: 'Separator' }),
          await PredefinedMenuItem.new({ item: 'Cut', text: 'Cut' }),
          await PredefinedMenuItem.new({ item: 'Copy', text: 'Copy' }),
          await PredefinedMenuItem.new({ item: 'Paste', text: 'Paste' }),
          await MenuItem.new({ 
            text: 'Paste as plain text', 
            action: async () => {
              try {
                const text = await navigator.clipboard.readText();
                document.execCommand('insertText', false, text);
              } catch (err) {
                console.error('Failed to paste as plain text:', err);
              }
            }
          }),
          await PredefinedMenuItem.new({ item: 'Separator' }),
          await PredefinedMenuItem.new({ item: 'SelectAll', text: 'Select all' }),
        ]
      });
      await menu.popup();
    } catch (err) {
      console.error('Failed to show native context menu:', err);
    }
  }
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
