import React from 'react';
import { useToast } from '../../context/ToastContext';
import { copyToClipboard } from '../../utils/clipboard';

export interface CopyableItem {
  id?: string | number;
  text: string; // primary text to copy
  title?: string; // small caption/title
  subtitle?: string; // secondary line
  trailing?: React.ReactNode; // optional trailing element (e.g., version badge)
  onRemove?: () => void;
}

interface Props {
  items: CopyableItem[];
  compact?: boolean;
}

// uses shared clipboard util

export const CopyableList: React.FC<Props> = ({ items, compact = false }) => {
  const { addToast } = useToast();

  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    if (ok) addToast('success', 'Copied', text);
    else addToast('error', 'Copy failed', 'Unable to copy to clipboard');
  };

  if (!items || items.length === 0) return null;

  return (
    <div className={`space-y-2 ${compact ? 'text-sm' : ''}`}>
      {items.map((it, idx) => (
        <div key={it.id ?? idx} className="p-3 rounded bg-gray-900 border border-gray-800">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {it.title && <div className="text-xs text-gray-400 mb-1">{it.title}</div>}
              <div className="font-mono text-sm text-white break-all">{it.text}</div>
              {it.subtitle && <div className="text-xs text-gray-400 mt-1">{it.subtitle}</div>}
            </div>
            <div className="flex-shrink-0 ml-3 flex items-center gap-2">
              {it.trailing}
              <button
                onClick={() => handleCopy(it.text)}
                className="text-xs bg-gray-700 hover:bg-gray-600 px-2 py-1 rounded text-white"
                title="Copy"
              >
                📋
              </button>
              {it.onRemove && (
                <button
                  onClick={it.onRemove}
                  className="text-xs text-red-400 hover:text-red-300"
                  title="Remove"
                >
                  Remove
                </button>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default CopyableList;
