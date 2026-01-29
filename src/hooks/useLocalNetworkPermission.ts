import { useEffect, useState } from 'react';
import { useConfirmDialog } from '../context/ConfirmDialogContext';

/**
 * Hook to manage local network access permissions for connecting to local LLM servers
 * Automatically prompts on first use when Ollama provider is detected
 */
export function useLocalNetworkPermission() {
  const [hasPrompted, setHasPrompted] = useState(false);
  const { confirm } = useConfirmDialog();

  useEffect(() => {
    // Only check once on mount
    if (!hasPrompted) {
      checkAndPromptIfNeeded();
    }
  }, []); // Empty deps - only run once

  const checkAndPromptIfNeeded = async () => {
    // Prevent multiple prompts
    if (hasPrompted) return;
    
    // Check if we've already set permission (granted or denied)
    const storedPermission = localStorage.getItem('samvada-local-network-permission');
    
    // Check if we've already shown the first-time prompt
    const hasShownPrompt = localStorage.getItem('samvada-network-prompt-shown');

    // Only prompt if:
    // 1. No permission has been set yet
    // 2. We haven't shown the first-time prompt
    // 3. User has an Ollama provider configured
    if (!storedPermission && !hasShownPrompt) {
      const stateStr = localStorage.getItem('samvada-studio-state');
      if (stateStr) {
        try {
          const state = JSON.parse(stateStr);
          const hasOllamaProvider = state.providers?.some(
            (p: any) => p.type === 'ollama' && p.isEnabled
          );

          if (hasOllamaProvider) {
            // Mark as prompted IMMEDIATELY to prevent double-prompt
            setHasPrompted(true);
            
            // Show prompt after a short delay to not interrupt app load
            setTimeout(() => {
              showFirstTimePrompt();
            }, 1000);
          }
        } catch (e) {
          // Ignore JSON parse errors
        }
      }
    }
  };

  const showFirstTimePrompt = async () => {
    const shouldEnable = await confirm({
      title: '🌐 Local Network Access Required',
      message: 
        'Samvada Studio detected an Ollama provider in your configuration.\n\n' +
        'To connect to locally running LLM servers (like Ollama on localhost:11434), ' +
        'this app needs access to your local network.\n\n' +
        '✅ Grant access now?\n' +
        '(You can change this later in Admin Settings → General)',
      confirmText: 'Grant Access',
      cancelText: 'Not Now',
      type: 'info',
    });

    // Mark that we've shown the prompt (regardless of choice)
    localStorage.setItem('samvada-network-prompt-shown', 'true');

    if (shouldEnable) {
      // User agreed, test connection to trigger browser permission
      testLocalConnection();
    } else {
      // User declined, mark as denied
      localStorage.setItem('samvada-local-network-permission', 'denied');
    }
  };

  const testLocalConnection = async () => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch('http://localhost:11434/api/version', {
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      
      // Connection successful or attempted - mark as granted
      localStorage.setItem('samvada-local-network-permission', 'granted');
    } catch (error) {
      // Even if connection fails, user agreed to grant permission
      localStorage.setItem('samvada-local-network-permission', 'granted');
    }
  };

  return {
    hasPrompted,
  };
}
