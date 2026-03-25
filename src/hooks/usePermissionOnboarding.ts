import { useEffect, useRef } from 'react';
import { useConfirmDialog } from '../context/ConfirmDialogContext';

const ONBOARDED_KEY = 'samvada-permissions-onboarded';
const NETWORK_PERMISSION_KEY = 'samvada-local-network-permission';

/**
 * Sequenced permission onboarding.
 *
 * Step 1 -- Network: ask for local network + device services (single fetch
 * triggers both Chrome prompts). Most users will accept this.
 *
 * Step 2 -- Microphone: ask separately. Many users prefer to defer this
 * until they actually use voice input.
 *
 * Each step is a separate confirm dialog giving the user finer control.
 * If user skips, we still mark onboarding as done so they aren't nagged.
 *
 * StrictMode note: module-level flag prevents double-fire during
 * React 18 StrictMode dev mount → unmount → remount cycle.
 */
let onboardingScheduled = false;

export function usePermissionOnboarding() {
  const { confirm } = useConfirmDialog();
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  useEffect(() => {
    if (onboardingScheduled) return;
    if (localStorage.getItem(ONBOARDED_KEY)) return;

    onboardingScheduled = true;

    setTimeout(async () => {
      // ── Step 1: Network permissions ──
      const grantNetwork = await confirmRef.current({
        title: '🌐 Step 1 of 2 — Local Network Access',
        message:
          'Samvada Studio connects to AI models running on your machine (like Ollama).\n\n' +
          'To do this, the browser needs two permissions:\n' +
          '• Access other devices on your local network\n' +
          '• Access apps and services on this device\n\n' +
          'Chrome will show its own prompts after you click Grant. ' +
          'You can change this anytime in Admin Settings → General.',
        confirmText: 'Grant Network Access',
        cancelText: 'Skip',
        type: 'info',
      });

      if (grantNetwork) {
        try {
          const ctrl = new AbortController();
          const tid = setTimeout(() => ctrl.abort(), 4000);
          await fetch('http://localhost:11434/api/version', { signal: ctrl.signal });
          clearTimeout(tid);
        } catch {
          // Even if Ollama isn't running, Chrome prompts will have fired
        }
        localStorage.setItem(NETWORK_PERMISSION_KEY, 'granted');
        window.dispatchEvent(new Event('local-storage-change'));
      }

      // Brief pause between dialogs
      await new Promise(r => setTimeout(r, 600));

      // ── Step 2: Microphone ──
      const grantMic = await confirmRef.current({
        title: '🎤 Step 2 of 2 — Microphone Access',
        message:
          'Samvada Studio supports voice input for hands-free interaction.\n\n' +
          'If you\'d like to use this feature, grant microphone access now. ' +
          'Chrome will show its own prompt.\n\n' +
          'You can always enable this later when you first click the mic button.',
        confirmText: 'Grant Microphone',
        cancelText: 'Skip — I\'ll do it later',
        type: 'info',
      });

      if (grantMic) {
        try {
          const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
          if (SR) {
            const rec = new SR();
            rec.start();
            setTimeout(() => { try { rec.stop(); } catch { /* no-op */ } }, 500);
          }
        } catch {
          // Speech API not available or user denied at Chrome level
        }
      }

      localStorage.setItem(ONBOARDED_KEY, 'true');
    }, 1500);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps
}
