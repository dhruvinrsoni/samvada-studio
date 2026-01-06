import { useMemo } from 'react';
import { useChat } from '../../context/ChatContext';

interface TokenCounterProps {
  text: string;
  showCost?: boolean;
}

// Token costs per 1K tokens (approximate, varies by model)
const TOKEN_COSTS: Record<string, { input: number; output: number }> = {
  'gpt-4': { input: 0.03, output: 0.06 },
  'gpt-4o': { input: 0.005, output: 0.015 },
  'gpt-3.5-turbo': { input: 0.0005, output: 0.0015 },
  'claude-3-opus': { input: 0.015, output: 0.075 },
  'claude-3-sonnet': { input: 0.003, output: 0.015 },
  'gemini-pro': { input: 0.00025, output: 0.0005 },
  default: { input: 0.001, output: 0.002 },
};

export default function TokenCounter({ text, showCost = false }: TokenCounterProps) {
  const { state, getDefaultProvider, estimateTokens } = useChat();
  const isDark = state.theme === 'dark';
  const provider = getDefaultProvider();

  const tokenCount = useMemo(() => estimateTokens(text), [text, estimateTokens]);
  
  const estimatedCost = useMemo(() => {
    if (!showCost) return 0;
    const model = provider?.model || 'default';
    const costs = TOKEN_COSTS[model] || TOKEN_COSTS.default;
    return (tokenCount / 1000) * costs.input;
  }, [tokenCount, showCost, provider]);

  const getTokenColor = () => {
    if (tokenCount < 500) return isDark ? 'text-green-400' : 'text-green-600';
    if (tokenCount < 2000) return isDark ? 'text-yellow-400' : 'text-yellow-600';
    if (tokenCount < 4000) return isDark ? 'text-orange-400' : 'text-orange-600';
    return isDark ? 'text-red-400' : 'text-red-600';
  };

  if (tokenCount === 0) return null;

  return (
    <div className={`flex items-center gap-2 text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
      <span className={getTokenColor()}>
        ~{tokenCount.toLocaleString()} tokens
      </span>
      {showCost && estimatedCost > 0 && (
        <span className="opacity-75">
          (~${estimatedCost.toFixed(4)})
        </span>
      )}
    </div>
  );
}

// Component to show chat statistics
interface ChatStatsProps {
  compact?: boolean;
}

export function ChatStats({ compact = false }: ChatStatsProps) {
  const { state, activeChat, estimateTokens } = useChat();
  const isDark = state.theme === 'dark';

  const stats = useMemo(() => {
    if (!activeChat) return null;

    let totalPromptTokens = 0;
    let totalResponseTokens = 0;
    let totalPrompts = 0;
    let totalResponses = 0;
    let totalProcessingTime = 0;

    activeChat.promptResponses.forEach(pnr => {
      totalPromptTokens += estimateTokens(pnr.prompt.content);
      totalPrompts++;
      
      pnr.responses.forEach(r => {
        totalResponseTokens += estimateTokens(r.content);
        totalResponses++;
      });

      if (pnr.processingTime) {
        totalProcessingTime += pnr.processingTime;
      }
    });

    return {
      totalPromptTokens,
      totalResponseTokens,
      totalTokens: totalPromptTokens + totalResponseTokens,
      totalPrompts,
      totalResponses,
      avgProcessingTime: totalResponses > 0 ? totalProcessingTime / totalResponses : 0,
    };
  }, [activeChat, estimateTokens]);

  if (!stats) return null;

  if (compact) {
    return (
      <div className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
        {stats.totalTokens.toLocaleString()} tokens
      </div>
    );
  }

  return (
    <div className={`p-3 rounded-lg ${isDark ? 'bg-dark-300' : 'bg-gray-100'}`}>
      <h4 className={`text-xs font-semibold uppercase tracking-wide mb-2 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
        Chat Statistics
      </h4>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Messages:</span>
          <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalPrompts + stats.totalResponses}
          </span>
        </div>
        <div>
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Total Tokens:</span>
          <span className={`ml-2 font-medium ${isDark ? 'text-white' : 'text-gray-900'}`}>
            {stats.totalTokens.toLocaleString()}
          </span>
        </div>
        <div>
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Prompt:</span>
          <span className={`ml-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {stats.totalPromptTokens.toLocaleString()}
          </span>
        </div>
        <div>
          <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Response:</span>
          <span className={`ml-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
            {stats.totalResponseTokens.toLocaleString()}
          </span>
        </div>
        {stats.avgProcessingTime > 0 && (
          <div className="col-span-2">
            <span className={isDark ? 'text-gray-500' : 'text-gray-400'}>Avg. Response Time:</span>
            <span className={`ml-2 ${isDark ? 'text-gray-300' : 'text-gray-600'}`}>
              {(stats.avgProcessingTime / 1000).toFixed(2)}s
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
