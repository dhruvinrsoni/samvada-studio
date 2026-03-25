import { useEffect, useRef } from 'react';
import { useConfirmDialog } from '../context/ConfirmDialogContext';

const ONBOARDED_KEY = 'samvada-permissions-onboarded';
const NETWORK_PERMISSION_KEY = 'samvada-local-network-permission';
const MIC_PROMPTED_KEY = 'samvada-mic-prompted';

/**
 * Proactive permission onboarding hook.
 *
 * On first load (no ONBOARDED_KEY in localStorage), presents a polished
 * confirmation asking the user to grant all required browser permissions
 * upfront: local network access (x2 Chrome prompts) and microphone.
 *
 * If user resets permissions in Settings, clearing ONBOARDED_KEY causes
 * this prompt to re-appear on next reload.
 */
export function usePermissionOnboarding() {
  const { confirm } = useConfirmDialog();
  const prompted = useRef(false);

  useEffect(() => {
    if (prompted.current) return;
    if (localStorage.getItem(ONBOARDED_KEY)) return;

    prompted.current = true;

    const timer = setTimeout(async () => {
      const accepted = await confirm({
        title: '🔐 One-time Setup — Permissions',
        message:
          'Samvada Studio needs a few browser permissions to give you the best experience. ' +
          'We ask upfront so everything works seamlessly later.\n\n' +
          '1. Local Network — connect to AI models running on your machine (Ollama)\n' +
          '2. Device Services — communicate with local inference servers\n' +
          '3. Microphone — enable voice input for hands-free interaction\n\n' +
          'You can review or revoke these anytime in Admin Settings → General.',
        confirmText: 'Grant Permissions',
        cancelText: 'Skip for Now',
        type: 'info',
      });

      if (accepted) {
        await grantAll();
      }

      localStorage.setItem(ONBOARDED_KEY, 'true');
    }, 1500);

    return () => clearTimeout(timer);
  }, [confirm]);
}

async function grantAll() {
  // 1 & 2: Trigger local network access (fires both Chrome prompts)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 3000);
    await fetch('http://localhost:11434/api/version', { signal: ctrl.signal });
    clearTimeout(tid);
  } catch {
    // Even if Ollama isn't running, the browser prompts will have fired
  }
  localStorage.setItem(NETWORK_PERMISSION_KEY, 'granted');
  window.dispatchEvent(new Event('local-storage-change'));

  // 3: Trigger microphone permission via SpeechRecognition
  try {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.start();
      // Stop immediately after the browser prompt fires
      setTimeout(() => { try { rec.stop(); } catch { /* no-op */ } }, 500);
    }
  } catch {
    // Speech API not available or user denied
  }
  localStorage.setItem(MIC_PROMPTED_KEY, 'true');
}
