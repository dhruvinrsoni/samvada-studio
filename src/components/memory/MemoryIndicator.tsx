interface MemoryIndicatorProps {
  count: number;
  maxEntries: number;
  isDark: boolean;
}

export default function MemoryIndicator({ count, maxEntries, isDark }: MemoryIndicatorProps) {
  const pct = maxEntries > 0 ? Math.min(count / maxEntries, 1) : 0;
  const pctDisplay = Math.round(pct * 100);

  const barColor =
    pct < 0.6 ? 'bg-green-500' : pct < 0.9 ? 'bg-yellow-500' : 'bg-red-500';
  const pulse = pct > 0.9 ? 'animate-pulse' : '';

  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Memory usage
        </span>
        <span className={`text-xs ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
          {count} / {maxEntries} ({pctDisplay}%)
        </span>
      </div>
      <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor} ${pulse}`}
          style={{ width: `${pctDisplay}%` }}
        />
      </div>
      {pct > 0.9 && (
        <p className="text-[10px] text-red-400 mt-1">
          Memory nearly full — consider compacting or increasing the limit.
        </p>
      )}
    </div>
  );
}
