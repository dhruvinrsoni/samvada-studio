// Debug helper for Samvada Studio
import { loadState, STORAGE_KEY } from './storage';
import BRAND from '../constants/brand';

// Expose a debug accessor on window for manual inspection in browser console
// Usage in browser console: window.__LLMS_UI_DEBUG__.getSavedState()

export const installDebug = () => {
  (window as any).__SAMVADA_DEBUG__ = {
    brand: BRAND,
    getSavedState: () => loadState(),
    rawLocalStorage: () => localStorage.getItem(STORAGE_KEY),
    clearSavedState: () => { localStorage.removeItem(STORAGE_KEY); return true; },
  };
};

// Auto-install if running in browser
if (typeof window !== 'undefined') {
  try { installDebug(); } catch (e) { /* ignore */ }
}
