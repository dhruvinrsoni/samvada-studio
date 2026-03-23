import { useState, useRef, useEffect } from 'react';
import { useRAG } from '../../context/RAGContext';
import type { Chat } from '../../types';

interface RAGAttachmentSelectorProps {
  chat: Chat;
  isDark: boolean;
  onUpdate: (collectionIds: string[]) => void;
}

export default function RAGAttachmentSelector({ chat, isDark, onUpdate }: RAGAttachmentSelectorProps) {
  const { ragState } = useRAG();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const attached = chat.ragCollectionIds ?? [];
  const hasCollections = ragState.collections.length > 0;

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!hasCollections) return null;

  const toggle = (id: string) => {
    const next = attached.includes(id)
      ? attached.filter((c) => c !== id)
      : [...attached, id];
    onUpdate(next);
  };

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs transition-colors ${
          attached.length > 0
            ? 'bg-theme-primary/20 text-theme-primary font-medium'
            : isDark
              ? 'text-gray-500 hover:text-gray-300 hover:bg-dark-100'
              : 'text-gray-400 hover:text-gray-600 hover:bg-light-300'
        }`}
        title={attached.length > 0 ? `RAG: ${attached.length} collection(s) attached` : 'Attach knowledge collections'}
      >
        RAG
        {attached.length > 0 && (
          <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-theme-primary text-white text-[10px] font-bold">
            {attached.length}
          </span>
        )}
      </button>

      {open && (
        <div
          className={`absolute bottom-full left-0 mb-1 w-64 rounded-lg shadow-xl border z-50 ${
            isDark ? 'bg-dark-200 border-dark-100' : 'bg-white border-light-400'
          }`}
        >
          <div className={`px-3 py-2 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
            <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
              Attach Knowledge
            </p>
            <p className={`text-[11px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Selected collections provide context for this chat
            </p>
          </div>
          <div className="max-h-48 overflow-y-auto p-1.5">
            {ragState.collections.map((col) => {
              const isAttached = attached.includes(col.id);
              return (
                <button
                  key={col.id}
                  onClick={() => toggle(col.id)}
                  className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors ${
                    isAttached
                      ? 'bg-theme-primary/15 text-theme-primary'
                      : isDark
                        ? 'text-gray-400 hover:bg-dark-100'
                        : 'text-gray-600 hover:bg-light-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium truncate">{col.name}</span>
                    <span className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {col.chunkCount} chunks
                    </span>
                  </div>
                  {col.description && (
                    <p className={`text-[10px] truncate mt-0.5 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                      {col.description}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
          {attached.length > 0 && (
            <div className={`px-3 py-1.5 border-t ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
              <button
                onClick={() => { onUpdate([]); setOpen(false); }}
                className="text-[11px] text-red-500 hover:text-red-400"
              >
                Detach all
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
