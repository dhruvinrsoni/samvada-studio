import { useState, useEffect } from 'react';
import { useChat } from '../../context/ChatContext';
import { useMemory } from '../../context/MemoryContext';
import { useConfirmDialog } from '../../context/ConfirmDialogContext';
import MemoryIndicator from './MemoryIndicator';
import MemoryEntryItem from './MemoryEntryItem';

export default function MemoryPanel() {
  const { state } = useChat();
  const { memoryState, memoryDispatch, compactMemories, fetchAvailableModels } = useMemory();
  const { confirm } = useConfirmDialog();

  const isDark =
    state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' &&
      window.matchMedia('(prefers-color-scheme: dark)').matches);

  const { settings, entries, isExtracting, isCompacting } = memoryState;

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);

  const loadModels = async (endpoint: string) => {
    if (!endpoint) return;
    setIsLoadingModels(true);
    try {
      const models = await fetchAvailableModels(endpoint);
      setAvailableModels(models);
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Load models on mount if endpoint is set
  useEffect(() => {
    if (settings.extractionModelEndpoint) {
      loadModels(settings.extractionModelEndpoint);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCompact = async () => {
    if (entries.length < 10) {
      const ok = await confirm({
        title: 'Compact Memories',
        message: `Only ${entries.length} entries — compaction may not significantly reduce count. Continue anyway?`,
        confirmText: 'Compact',
        cancelText: 'Cancel',
        type: 'info',
      });
      if (!ok) return;
    } else {
      const ok = await confirm({
        title: 'Compact Memories',
        message: 'This will merge similar entries using your extraction model. This cannot be undone.',
        confirmText: 'Compact',
        cancelText: 'Cancel',
        type: 'info',
      });
      if (!ok) return;
    }
    await compactMemories();
  };

  const handleClearAll = async () => {
    const ok = await confirm({
      title: 'Clear All Memories',
      message: `This will permanently delete all ${entries.length} memory entries. This cannot be undone.`,
      confirmText: 'Clear All',
      cancelText: 'Cancel',
      type: 'danger',
    });
    if (ok) {
      memoryDispatch({ type: 'CLEAR_ALL_ENTRIES' });
    }
  };

  const inputCls = `w-full px-2.5 py-1.5 rounded-lg border text-sm ${
    isDark
      ? 'bg-dark-200 border-dark-100 text-gray-200 placeholder-gray-500'
      : 'bg-white border-light-400 text-gray-800 placeholder-gray-400'
  }`;

  const labelCls = `block text-xs font-medium mb-1 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  const sectionCls = `rounded-lg border p-3 sm:p-4 space-y-3 ${
    isDark ? 'border-dark-100 bg-dark-300' : 'border-light-400 bg-light-100'
  }`;

  return (
    <div className="space-y-4">
      {/* Header + global toggle */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className={`text-sm sm:text-base font-semibold ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
            🧠 AI Memory
          </h3>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
            Learns your preferences and personalises responses over time.
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
          <input
            type="checkbox"
            className="sr-only peer"
            checked={settings.isEnabled}
            onChange={e =>
              memoryDispatch({ type: 'UPDATE_SETTINGS', payload: { isEnabled: e.target.checked } })
            }
          />
          <div
            className={`relative w-11 h-6 rounded-full transition-colors peer-checked:bg-theme-primary ${
              isDark ? 'bg-dark-100' : 'bg-light-400'
            }`}
          >
            <div className="absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
          </div>
        </label>
      </div>

      {!settings.isEnabled ? (
        <div
          className={`rounded-lg border border-dashed p-6 text-center ${
            isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-400'
          }`}
        >
          <p className="text-sm">Enable Memory to start learning your preferences.</p>
        </div>
      ) : (
        <>
          {/* Settings section */}
          <div className={sectionCls}>
            <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Extraction Model
            </h4>

            {/* Ollama endpoint */}
            <div>
              <label className={labelCls}>Ollama Endpoint</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  className={inputCls}
                  value={settings.extractionModelEndpoint}
                  onChange={e =>
                    memoryDispatch({
                      type: 'UPDATE_SETTINGS',
                      payload: { extractionModelEndpoint: e.target.value },
                    })
                  }
                  onBlur={e => loadModels(e.target.value)}
                  placeholder="http://localhost:11434"
                />
                <button
                  onClick={() => loadModels(settings.extractionModelEndpoint)}
                  disabled={isLoadingModels}
                  className={`px-2.5 py-1.5 text-xs rounded-lg border flex-shrink-0 transition-colors ${
                    isDark
                      ? 'border-dark-100 text-gray-400 hover:bg-dark-100'
                      : 'border-light-400 text-gray-600 hover:bg-light-300'
                  } disabled:opacity-50`}
                  title="Refresh model list"
                >
                  {isLoadingModels ? '⟳' : '↻'}
                </button>
              </div>
            </div>

            {/* Model selector */}
            <div>
              <label className={labelCls}>Extraction Model</label>
              {availableModels.length > 0 ? (
                <select
                  className={inputCls}
                  value={settings.extractionModelName}
                  onChange={e =>
                    memoryDispatch({
                      type: 'UPDATE_SETTINGS',
                      payload: { extractionModelName: e.target.value },
                    })
                  }
                >
                  <option value="">— select a model —</option>
                  {availableModels.map(m => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              ) : (
                <div className={`text-xs px-2.5 py-2 rounded-lg border ${isDark ? 'border-dark-100 text-gray-500 bg-dark-200' : 'border-light-400 text-gray-400 bg-light-200'}`}>
                  {isLoadingModels
                    ? 'Loading models…'
                    : 'No models found — is Ollama running? Enter the endpoint and click ↻.'}
                </div>
              )}
            </div>

            <h4 className={`text-xs font-semibold uppercase tracking-wide pt-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              Limits
            </h4>

            {/* Max entries slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label className={labelCls}>Max memories</label>
                <span className={`text-xs font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {settings.maxEntries}
                </span>
              </div>
              <input
                type="range"
                min={10}
                max={500}
                step={10}
                value={settings.maxEntries}
                onChange={e =>
                  memoryDispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { maxEntries: Number(e.target.value) },
                  })
                }
                className="w-full accent-theme-primary"
              />
              <div className={`flex justify-between text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <span>10</span><span>500</span>
              </div>
            </div>

            {/* Max chars per entry slider */}
            <div>
              <div className="flex justify-between mb-1">
                <label className={labelCls}>Chars per entry</label>
                <span className={`text-xs font-mono ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  {settings.maxCharsPerEntry}
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={500}
                step={10}
                value={settings.maxCharsPerEntry}
                onChange={e =>
                  memoryDispatch({
                    type: 'UPDATE_SETTINGS',
                    payload: { maxCharsPerEntry: Number(e.target.value) },
                  })
                }
                className="w-full accent-theme-primary"
              />
              <div className={`flex justify-between text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                <span>50</span><span>500</span>
              </div>
            </div>

            {/* Auto-compact toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-xs font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
                  Auto-compact when full
                </p>
                <p className={`text-[10px] ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                  Automatically merges entries when memory reaches its limit.
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer ml-3 flex-shrink-0">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={settings.autoCompact}
                  onChange={e =>
                    memoryDispatch({
                      type: 'UPDATE_SETTINGS',
                      payload: { autoCompact: e.target.checked },
                    })
                  }
                />
                <div
                  className={`relative w-9 h-5 rounded-full transition-colors peer-checked:bg-theme-primary ${
                    isDark ? 'bg-dark-100' : 'bg-light-400'
                  }`}
                >
                  <div className="absolute top-0.5 left-0.5 h-4 w-4 rounded-full bg-white shadow transition-transform peer-checked:translate-x-4" />
                </div>
              </label>
            </div>
          </div>

          {/* Memory indicator */}
          <MemoryIndicator
            count={entries.length}
            maxEntries={settings.maxEntries}
            isDark={isDark}
          />

          {/* Action buttons */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={handleCompact}
              disabled={isCompacting || entries.length === 0 || !settings.extractionModelName}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
                isDark
                  ? 'border-dark-100 text-gray-300 hover:bg-dark-100'
                  : 'border-light-400 text-gray-700 hover:bg-light-300'
              }`}
              title={
                !settings.extractionModelName
                  ? 'Select an extraction model first'
                  : 'Merge similar memories to reduce size'
              }
            >
              {isCompacting ? (
                <span className="animate-spin">⟳</span>
              ) : (
                <span>🗜</span>
              )}
              {isCompacting ? 'Compacting…' : 'Compact & Shrink'}
            </button>

            <button
              onClick={handleClearAll}
              disabled={entries.length === 0}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-colors disabled:opacity-40 disabled:cursor-not-allowed border-red-500/30 text-red-400 hover:bg-red-500/10"
            >
              🗑 Clear All
            </button>

            {(isExtracting || isCompacting) && (
              <span className={`text-xs flex items-center gap-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                <span className="animate-spin inline-block">⟳</span>
                {isCompacting ? 'Compacting…' : 'Extracting…'}
              </span>
            )}
          </div>

          {/* Memory entries list */}
          <div className={sectionCls}>
            <div className="flex items-center justify-between">
              <h4 className={`text-xs font-semibold uppercase tracking-wide ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Memories ({entries.length})
              </h4>
            </div>

            {entries.length === 0 ? (
              <p className={`text-xs text-center py-4 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                No memories yet. Start chatting to build your memory.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
                {[...entries]
                  .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                  .map(entry => (
                    <MemoryEntryItem
                      key={entry.id}
                      entry={entry}
                      isDark={isDark}
                      onDelete={id => memoryDispatch({ type: 'DELETE_ENTRY', payload: id })}
                    />
                  ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
