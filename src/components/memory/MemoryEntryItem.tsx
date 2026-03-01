import type { MemoryEntry, MemorySource } from '../../types/memory';

interface MemoryEntryItemProps {
  entry: MemoryEntry;
  isDark: boolean;
  onDelete: (id: string) => void;
}

function sourceBadge(source: MemorySource) {
  switch (source) {
    case 'extraction':
      return { label: 'extracted', cls: 'bg-blue-500/20 text-blue-400' };
    case 'compaction':
      return { label: 'compacted', cls: 'bg-purple-500/20 text-purple-400' };
    case 'manual':
      return { label: 'manual', cls: 'bg-gray-500/20 text-gray-400' };
  }
}

function relativeDate(date: Date): string {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return `${Math.floor(days / 30)}mo ago`;
}

export default function MemoryEntryItem({ entry, isDark, onDelete }: MemoryEntryItemProps) {
  const badge = sourceBadge(entry.source);

  return (
    <div
      className={`flex items-start gap-2 p-2.5 rounded-lg border group transition-colors ${
        isDark
          ? 'border-dark-100 bg-dark-300 hover:bg-dark-200'
          : 'border-light-400 bg-white hover:bg-light-200'
      }`}
    >
      <div className="flex-1 min-w-0">
        <p
          className={`text-xs sm:text-sm leading-snug truncate ${
            isDark ? 'text-gray-200' : 'text-gray-800'
          }`}
          title={entry.content}
        >
          {entry.content}
        </p>
        <div className="flex items-center gap-2 mt-1">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${badge.cls}`}>
            {badge.label}
          </span>
          <span className="text-[10px] text-gray-500">{relativeDate(entry.createdAt)}</span>
          <span className="text-[10px] text-gray-500">{entry.content.length} chars</span>
        </div>
      </div>
      <button
        onClick={() => onDelete(entry.id)}
        className={`flex-shrink-0 opacity-0 group-hover:opacity-100 p-1 rounded transition-all ${
          isDark
            ? 'text-gray-500 hover:text-red-400 hover:bg-red-400/10'
            : 'text-gray-400 hover:text-red-500 hover:bg-red-500/10'
        }`}
        title="Delete memory"
      >
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}
