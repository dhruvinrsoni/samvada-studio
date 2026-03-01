import { useChat } from '../context/ChatContext';

/**
 * Returns whether the user has enabled compact mode in their theme settings.
 * Use this in UI components to reduce sizes and spacing accordingly.
 */
export function useCompactMode(): boolean {
  const { state } = useChat();
  return state.themeSettings.compactMode ?? false;
}
