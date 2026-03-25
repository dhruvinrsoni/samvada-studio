import { useEffect, useRef, useCallback } from 'react';
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
  const hasRun = useRef(false);

  // Stable reference so the effect doesn't re-fire when confirm identity changes
  const confirmRef = useRef(confirm);
  confirmRef.current = confirm;

  const runOnboarding = useCallback(async () => {
    const accepted = await confirmRef.current({
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
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    if (localStorage.getItem(ONBOARDED_KEY)) return;

    hasRun.current = true;

    const timer = setTimeout(runOnboarding, 1500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

async function grantAll() {
  // 1 & 2: Trigger local network access (fires both Chrome prompts)
  try {
    const ctrl = new AbortController();
    const tid = setTimeout(() => ctrl.abort(), 4000);
    await fetch('http://localhost:11434/api/version', { signal: ctrl.signal });
    clearTimeout(tid);
  } catch {
    // Even if Ollama isn't running, the browser prompts will have fired
  }
  localStorage.setItem(NETWORK_PERMISSION_KEY, 'granted');
  window.dispatchEvent(new Event('local-storage-change'));

  // Small delay so the first Chrome prompt completes before the mic prompt fires
  await new Promise(r => setTimeout(r, 800));

  // 3: Trigger microphone permission via SpeechRecognition
  try {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) {
      const rec = new SR();
      rec.start();
      setTimeout(() => { try { rec.stop(); } catch { /* no-op */ } }, 500);
    }
  } catch {
    // Speech API not available or user denied
  }
  localStorage.setItem(MIC_PROMPTED_KEY, 'true');
}
