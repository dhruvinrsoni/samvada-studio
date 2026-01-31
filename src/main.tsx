import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import './utils/persistenceTest' // Load persistence test utilities for console use
import './utils/errorLogger' // Load error logger utilities for console use
import { ConfirmDialogProvider } from './context/ConfirmDialogContext'

// Global Error Handlers - Catch errors that escape ErrorBoundary
window.onerror = (message, source, lineno, colno, error) => {
  console.group('🚨 Global Error Caught');
  console.error('Message:', message);
  console.error('Source:', source);
  console.error('Line:', lineno, 'Column:', colno);
  console.error('Error:', error);
  console.groupEnd();

  // Save to localStorage for debugging
  try {
    const errorLog = {
      type: 'global_error',
      timestamp: new Date().toISOString(),
      message: String(message),
      source,
      line: lineno,
      column: colno,
      stack: error?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    const existingErrors = JSON.parse(localStorage.getItem('app_error_log') || '[]');
    existingErrors.push(errorLog);
    if (existingErrors.length > 10) existingErrors.shift();
    localStorage.setItem('app_error_log', JSON.stringify(existingErrors));
  } catch (e) {
    console.warn('Could not save error to localStorage:', e);
  }

  // Return false to allow default error handling
  return false;
};

// Unhandled Promise Rejection Handler
window.addEventListener('unhandledrejection', (event) => {
  console.group('🚨 Unhandled Promise Rejection');
  console.error('Reason:', event.reason);
  console.error('Promise:', event.promise);
  console.groupEnd();

  // Save to localStorage
  try {
    const errorLog = {
      type: 'unhandled_promise',
      timestamp: new Date().toISOString(),
      reason: String(event.reason),
      message: event.reason?.message || String(event.reason),
      stack: event.reason?.stack,
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    const existingErrors = JSON.parse(localStorage.getItem('app_error_log') || '[]');
    existingErrors.push(errorLog);
    if (existingErrors.length > 10) existingErrors.shift();
    localStorage.setItem('app_error_log', JSON.stringify(existingErrors));
  } catch (e) {
    console.warn('Could not save promise rejection to localStorage:', e);
  }

  // Prevent default to avoid "Uncaught (in promise)" console errors
  event.preventDefault();
});

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
