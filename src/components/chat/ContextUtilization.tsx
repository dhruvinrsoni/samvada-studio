import { useMemo } from 'react';
import { useChat } from '../../context/ChatContext';
import { buildChatHistory, estimateHistoryTokens } from '../../utils/chatHistoryBuilder';
import { getModelContextWindow } from '../../types';
import { buildSystemMessageParts } from '../../utils/llmService';

interface ContextUtilizationProps {
  currentInputText: string;
  providerId?: string;
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`;
  return String(n);
}

export default function ContextUtilization({ currentInputText, providerId }: ContextUtilizationProps) {
  const { activeChat, state, estimateTokens, isDark } = useChat();

  const utilization = useMemo(() => {
    if (!activeChat) return null;

    // Only show when history is enabled
    const sendHistory = activeChat.settings.sendChatHistory ?? true;
    if (!sendHistory) return null;

    // Find provider
    const provider = providerId
      ? state.providers.find(p => p.id === providerId)
      : state.providers.find(p => p.isDefault) || state.providers[0];

    if (!provider?.model) return null;

    const contextWindow = getModelContextWindow(provider.model);
    if (!contextWindow) return null;

    // System tokens
    const systemParts = buildSystemMessageParts(undefined, activeChat.settings);
    const systemTokens = systemParts.reduce(
      (sum, p) => sum + Math.ceil(p.content.length / 4), 0,
    );

    // History tokens
    const history = buildChatHistory(activeChat.promptResponses);
    const historyTokens = estimateHistoryTokens(history);

    // Current input tokens
    const inputTokens = estimateTokens(currentInputText);

    const totalUsed = systemTokens + historyTokens + inputTokens;
    const percentage = Math.min(100, (totalUsed / contextWindow) * 100);

    return { systemTokens, historyTokens, inputTokens, totalUsed, contextWindow, percentage };
  }, [activeChat, state.providers, providerId, currentInputText, estimateTokens]);

  if (!utilization) return null;

  const barColor =
    utilization.percentage < 50 ? 'bg-green-500' :
    utilization.percentage < 75 ? 'bg-yellow-500' :
    utilization.percentage < 90 ? 'bg-orange-500' : 'bg-red-500';

  return (
    <div
      className={`flex items-center gap-1.5 text-[10px] sm:text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}
      title={`System: ~${formatTokens(utilization.systemTokens)} | History: ~${formatTokens(utilization.historyTokens)} | Input: ~${formatTokens(utilization.inputTokens)}`}
    >
      <div className={`w-12 sm:w-16 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${utilization.percentage}%` }}
        />
      </div>
      <span className="whitespace-nowrap">
        ~{formatTokens(utilization.totalUsed)}/{formatTokens(utilization.contextWindow)}
      </span>
    </div>
  );
}
