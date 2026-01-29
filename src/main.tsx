import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './utils/persistenceTest' // Load persistence test utilities for console use
import { ConfirmDialogProvider } from './context/ConfirmDialogContext'

// Service Worker Registration Logging
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    console.log('[PWA] Service Worker support detected');
  });
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfirmDialogProvider>
      <App />
    </ConfirmDialogProvider>
  </StrictMode>,
)
