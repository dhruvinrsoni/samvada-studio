import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { ollamaDiscovery } from '../../services/ollamaDiscovery';
import { ollamaAvailability, type OllamaStatus } from '../../services/ollamaAvailability';
import * as modelService from '../../services/ollamaModelService';
import { getRegistryModels, refreshFromRemote, isLiveData, formatBytes, type RegistryModel } from '../../services/ollamaRegistryService';
import { useChat } from '../../context/ChatContext';
import { useToast } from '../../context/ToastContext';
import { generateId } from '../../utils/helpers';
import type { OllamaModelInfo, OllamaRunningModel, LLMProviderConfig } from '../../types';
import ModelPullDialog from './ModelPullDialog';
import type { ModelPullDialogHandle } from './ModelPullDialog';
import ModelInfoDialog from './ModelInfoDialog';

type SortField = 'name' | 'size' | 'family' | 'params' | 'quantization' | 'modified';
type SortDirection = 'asc' | 'desc';

function parseParamSize(s: string | undefined): number {
  if (!s) return 0;
  const match = s.match(/([\d.]+)\s*([BMK]?)/i);
  if (!match) return 0;
  const num = parseFloat(match[1]!);
  const unit = (match[2] ?? '').toUpperCase();
  if (unit === 'B') return num * 1e9;
  if (unit === 'M') return num * 1e6;
  if (unit === 'K') return num * 1e3;
  return num;
}

export default function ModelManagerPanel() {
  const { state, dispatch } = useChat();
  const { addToast } = useToast();
  const isDark =
    state.themeSettings.mode === 'dark' ||
    (state.themeSettings.mode === 'auto' && window.matchMedia('(prefers-color-scheme: dark)').matches);

  // Available hosts
  const [hosts, setHosts] = useState<string[]>([]);
  const [selectedHost, setSelectedHost] = useState<string>('');
  const [models, setModels] = useState<OllamaModelInfo[]>([]);
  const [runningModels, setRunningModels] = useState<OllamaRunningModel[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');

  // Sorting -- single state object so field+direction update atomically
  const [sortConfig, setSortConfig] = useState<{ field: SortField; dir: SortDirection }>({ field: 'name', dir: 'asc' });

  // Dialogs
  const [showPullDialog, setShowPullDialog] = useState(false);
  const [infoModel, setInfoModel] = useState<OllamaModelInfo | null>(null);
  const [copySource, setCopySource] = useState<string | null>(null);
  const [copyDestination, setCopyDestination] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showRunning, setShowRunning] = useState(true);
  const [ollamaStatus, setOllamaStatus] = useState<OllamaStatus>('unknown');
  const [bgPulls, setBgPulls] = useState<Record<string, { percent: number; pulling: boolean; status?: string; digest?: string; completed?: number; total?: number }>>({}); 
  const bgPullControllersRef = useRef<Record<string, AbortController>>({});
  const pullDialogRef = useRef<ModelPullDialogHandle>(null);
  const [expandedBgPulls, setExpandedBgPulls] = useState<Set<string>>(new Set());

  // Browse & Pull (registry)
  const [showBrowse, setShowBrowse] = useState(false);
  const [registryModels, setRegistryModels] = useState<RegistryModel[]>([]);
  const [registryLoading, setRegistryLoading] = useState(false);
  const [registryError, setRegistryError] = useState<string | null>(null);
  const [browseFilter, setBrowseFilter] = useState('');
  const [pullingFromBrowse, setPullingFromBrowse] = useState<Record<string, { percent: number; status: string }>>({});
  const pullControllersRef = useRef<Record<string, AbortController>>({});

  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-800';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardClass = `rounded-lg p-4 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`;
  const inputClass = `w-full p-2 rounded-lg border text-sm ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200 placeholder-gray-500' : 'bg-white border-light-400 text-gray-800 placeholder-gray-400'}`;

  // Resolve which host to use
  const resolveHost = useCallback((): string => {
    const activeHost = ollamaDiscovery.getActiveBaseUrl();
    if (activeHost) return activeHost;
    if (selectedHost) return selectedHost;
    const urls = ollamaDiscovery.getConfiguredEndpointUrls();
    return urls[0] ?? 'http://localhost:11434';
  }, [selectedHost]);

  // Load available hosts
  useEffect(() => {
    const urls = ollamaDiscovery.getConfiguredEndpointUrls();
    setHosts(urls);
    if (!selectedHost && urls.length > 0) {
      const active = ollamaDiscovery.getActiveBaseUrl();
      setSelectedHost(active ?? urls[0] ?? '');
    }
  }, [selectedHost]);

  // Check Ollama availability before loading models
  const refreshModels = useCallback(async () => {
    const availability = await ollamaAvailability.getStatus();
    setOllamaStatus(availability.status);

    if (availability.status === 'unreachable') {
      setModels([]);
      setRunningModels([]);
      setIsLoading(false);
      return;
    }

    const host = resolveHost();
    if (!host) return;
    setIsLoading(true);
    try {
      const [modelList, running] = await Promise.all([
        modelService.listModels(host),
        modelService.listRunningModels(host).catch(() => [] as OllamaRunningModel[]),
      ]);
      setModels(modelList);
      setRunningModels(running);
    } catch (err: any) {
      addToast('error', 'Failed to load models', err.message);
      setModels([]);
      setRunningModels([]);
    } finally {
      setIsLoading(false);
    }
  }, [resolveHost, addToast]);

  useEffect(() => {
    refreshModels();
    const unsub = ollamaAvailability.subscribe((result) => {
      setOllamaStatus(result.status);
    });
    return unsub;
  }, [refreshModels]);

  // Load registry (bundled data is synchronous, live refresh is async)
  useEffect(() => {
    if (showBrowse && registryModels.length === 0) {
      setRegistryModels(getRegistryModels());
    }
  }, [showBrowse, registryModels.length]);

  const handleLiveRefresh = useCallback(async () => {
    setRegistryLoading(true);
    setRegistryError(null);
    const ok = await refreshFromRemote();
    if (ok) {
      setRegistryModels(getRegistryModels());
    } else {
      setRegistryError('Could not fetch live data (CORS). Showing bundled catalog.');
    }
    setRegistryLoading(false);
  }, []);

  const installedNames = useMemo(
    () => new Set(models.map(m => m.name.split(':')[0])),
    [models],
  );

  // navigator.deviceMemory returns an approximate RAM value in GiB (capped at 8 by most browsers).
  // Returns undefined on Firefox/Safari or insecure contexts.
  const deviceRamBytes = useMemo(() => {
    const gb = (navigator as any).deviceMemory as number | undefined;
    return gb ? gb * 1024 * 1024 * 1024 : undefined;
  }, []);

  const ramThreshold = deviceRamBytes ? deviceRamBytes * 0.75 : undefined;

  const filteredRegistry = useMemo(() => {
    let list = registryModels;
    if (browseFilter) {
      const q = browseFilter.toLowerCase();
      list = list.filter(m => m.name.toLowerCase().includes(q));
    }
    if (ramThreshold) {
      list = [...list].sort((a, b) => {
        const aExceeds = a.size > ramThreshold ? 1 : 0;
        const bExceeds = b.size > ramThreshold ? 1 : 0;
        if (aExceeds !== bExceeds) return aExceeds - bExceeds;
        return 0;
      });
    }
    return list;
  }, [registryModels, browseFilter, ramThreshold]);

  const pullFromBrowse = useCallback((modelName: string) => {
    const host = resolveHost();
    setPullingFromBrowse(prev => ({ ...prev, [modelName]: { percent: 0, status: 'starting...' } }));

    const controller = modelService.pullModel(
      host,
      modelName,
      (progress) => {
        const pct = (progress.total ?? 0) > 0
          ? Math.round(((progress.completed ?? 0) / progress.total!) * 100)
          : 0;
        setPullingFromBrowse(prev => ({ ...prev, [modelName]: { percent: pct, status: progress.status } }));
      },
      () => {
        setPullingFromBrowse(prev => {
          const next = { ...prev };
          delete next[modelName];
          return next;
        });
        delete pullControllersRef.current[modelName];
        addToast('success', 'Model Ready', `${modelName} is now available`);
        refreshModels();
        window.dispatchEvent(new Event('ollama-models-changed'));
      },
      (error) => {
        setPullingFromBrowse(prev => {
          const next = { ...prev };
          delete next[modelName];
          return next;
        });
        delete pullControllersRef.current[modelName];
        addToast('error', 'Pull Failed', `${modelName}: ${error.message}`);
      },
    );
    if (controller) pullControllersRef.current[modelName] = controller;
  }, [resolveHost, addToast, refreshModels]);

  const filteredAndSortedModels = useMemo(() => {
    let list = models.filter((m) =>
      m.name.toLowerCase().includes(searchFilter.toLowerCase()),
    );

    const { field, dir } = sortConfig;
    list.sort((a, b) => {
      let cmp = 0;
      switch (field) {
        case 'name':
          cmp = a.name.localeCompare(b.name);
          break;
        case 'size':
          cmp = a.size - b.size;
          break;
        case 'family':
          cmp = (a.details?.family ?? '').localeCompare(b.details?.family ?? '');
          break;
        case 'params':
          cmp = parseParamSize(a.details?.parameter_size) - parseParamSize(b.details?.parameter_size);
          break;
        case 'quantization':
          cmp = (a.details?.quantization_level ?? '').localeCompare(b.details?.quantization_level ?? '');
          break;
        case 'modified':
          cmp = new Date(a.modified_at).getTime() - new Date(b.modified_at).getTime();
          break;
      }
      if (cmp === 0 && field !== 'name') {
        cmp = a.name.localeCompare(b.name);
      }
      return dir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [models, searchFilter, sortConfig]);

  const totalDiskUsage = useMemo(() => models.reduce((sum, m) => sum + m.size, 0), [models]);

  const handleSortToggle = (field: SortField) => {
    setSortConfig((prev) => {
      if (prev.field === field) {
        return { field, dir: prev.dir === 'asc' ? 'desc' : 'asc' };
      }
      return { field, dir: field === 'modified' ? 'desc' : 'asc' };
    });
  };

  // Actions
  const handleDelete = async (name: string) => {
    try {
      await modelService.deleteModel(resolveHost(), name);
      addToast('success', 'Model Deleted', `${name} has been removed`);
      setDeleteConfirm(null);
      refreshModels();
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  const handleCopy = async () => {
    if (!copySource || !copyDestination.trim()) return;
    try {
      await modelService.copyModel(resolveHost(), copySource, copyDestination.trim());
      addToast('success', 'Model Copied', `${copySource} → ${copyDestination.trim()}`);
      setCopySource(null);
      setCopyDestination('');
      refreshModels();
    } catch (err: any) {
      addToast('error', 'Copy Failed', err.message);
    }
  };

  const handleAddAsProvider = (modelName: string) => {
    const host = resolveHost();
    const existing = state.providers.find(
      (p) => p.type === 'ollama' && p.apiEndpoint === `${host}/api/generate` && p.model === modelName,
    );
    if (existing) {
      addToast('info', 'Already Added', `${modelName} is already a configured provider`);
      return;
    }
    const newProvider: LLMProviderConfig = {
      id: generateId(),
      name: `Ollama · ${modelName}`,
      type: 'ollama',
      apiEndpoint: `${host}/api/generate`,
      model: modelName,
      isEnabled: true,
      isDefault: state.providers.length === 0,
      settings: { temperature: 0.7, maxTokens: 4096 },
      testStatus: 'untested',
    };
    dispatch({ type: 'ADD_PROVIDER', payload: newProvider });
    addToast('success', 'Provider Added', `${modelName} added as LLM provider`);
  };

  const isProviderConfigured = (modelName: string): boolean => {
    const host = resolveHost();
    return state.providers.some(
      (p) => p.type === 'ollama' && p.apiEndpoint === `${host}/api/generate` && p.model === modelName,
    );
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`pb-3 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${textPrimary}`}>📦 Model Manager</h3>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Pull, inspect, copy, and delete Ollama models
            </p>
          </div>
          <div className="flex items-center gap-2">
            {totalDiskUsage > 0 && (
              <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-dark-100 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
                {modelService.formatBytes(totalDiskUsage)} total
              </span>
            )}
            <span className={`text-xs px-2 py-1 rounded-full ${isDark ? 'bg-dark-100 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
              {models.length} model{models.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Background pull progress — dialog-initiated pulls (detached / minimized) */}
      {Object.entries(bgPulls).filter(([, info]) => info.pulling).length > 0 && (
        <div className="space-y-2">
          {Object.entries(bgPulls).filter(([, info]) => info.pulling).map(([name, info]) => {
            const isExpanded = expandedBgPulls.has(name);
            return (
              <div key={name} className={`rounded-lg p-3 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className={`text-xs font-medium ${textPrimary}`}>
                    Pulling {name}...
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-medium ${textPrimary}`}>{info.percent}%</span>
                    <button
                      onClick={() => setExpandedBgPulls(prev => {
                        const next = new Set(prev);
                        if (next.has(name)) next.delete(name); else next.add(name);
                        return next;
                      })}
                      className="text-xs text-theme-primary hover:text-theme-primary-hover font-medium"
                    >
                      {isExpanded ? 'Collapse' : 'Show Details'}
                    </button>
                    <button
                      onClick={() => {
                        bgPullControllersRef.current[name]?.abort();
                        delete bgPullControllersRef.current[name];
                        setBgPulls(prev => { const next = { ...prev }; delete next[name]; return next; });
                        setExpandedBgPulls(prev => { const next = new Set(prev); next.delete(name); return next; });
                      }}
                      className="text-xs text-red-500 hover:text-red-400 font-medium"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
                <div className={`w-full ${isExpanded ? 'h-2' : 'h-1.5'} rounded-full overflow-hidden ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
                  <div
                    className="h-full bg-theme-primary rounded-full transition-all duration-300"
                    style={{ width: `${info.percent}%` }}
                  />
                </div>
                {isExpanded && (
                  <div className="mt-2 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className={`text-xs ${textMuted}`}>{info.status || 'Downloading...'}</span>
                      {info.digest && (
                        <span className={`text-xs font-mono ${textMuted}`}>{info.digest.substring(0, 12)}</span>
                      )}
                    </div>
                    {(info.total ?? 0) > 0 && (
                      <div className="flex items-center justify-between">
                        <span className={`text-xs ${textMuted}`}>
                          {formatBytes(info.completed ?? 0)} / {formatBytes(info.total!)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Background pull progress — browse-initiated pulls (always visible when browse section is collapsed or scrolled) */}
      {Object.keys(pullingFromBrowse).length > 0 && !showBrowse && (
        <div className="space-y-2">
          {Object.entries(pullingFromBrowse).map(([name, info]) => (
            <div key={name} className={`rounded-lg p-3 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`}>
              <div className="flex items-center justify-between mb-1.5">
                <span className={`text-xs font-medium ${textPrimary}`}>
                  Pulling {name}...
                </span>
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium ${textPrimary}`}>{info.percent}%</span>
                  <button
                    onClick={() => setShowBrowse(true)}
                    className="text-xs text-theme-primary hover:text-theme-primary-hover font-medium"
                  >
                    Show in Browse
                  </button>
                  <button
                    onClick={() => {
                      pullControllersRef.current[name]?.abort();
                      delete pullControllersRef.current[name];
                      setPullingFromBrowse(prev => { const next = { ...prev }; delete next[name]; return next; });
                    }}
                    className="text-xs text-red-500 hover:text-red-400 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </div>
              <div className={`w-full h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
                <div
                  className="h-full bg-theme-primary rounded-full transition-all duration-300"
                  style={{ width: `${info.percent}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Ollama unreachable info card */}
      {ollamaStatus === 'unreachable' && (
        <div className={`rounded-lg p-5 border ${isDark ? 'bg-yellow-500/10 border-yellow-600/30' : 'bg-yellow-50 border-yellow-300'}`}>
          <div className="flex items-start gap-3">
            <span className="text-xl flex-shrink-0">⚠️</span>
            <div className="space-y-2">
              <h4 className={`font-semibold ${isDark ? 'text-yellow-300' : 'text-yellow-900'}`}>
                Ollama is not reachable
              </h4>
              <p className={`text-sm ${isDark ? 'text-yellow-400/90' : 'text-yellow-800'}`}>
                We cannot detect whether Ollama is installed from the browser — only whether it is responding on the network. This could mean:
              </p>
              <ol className={`text-sm list-decimal list-inside space-y-1 ${isDark ? 'text-yellow-400/80' : 'text-yellow-700'}`}>
                <li>Ollama is <strong>not installed</strong> — <a href="https://ollama.ai" target="_blank" rel="noreferrer" className="underline hover:no-underline">Download from ollama.ai</a></li>
                <li>Ollama is installed but <strong>not running</strong> — run <code className={`px-1 py-0.5 rounded text-xs ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>ollama serve</code></li>
                <li>CORS is not configured — run <code className={`px-1 py-0.5 rounded text-xs ${isDark ? 'bg-yellow-500/20' : 'bg-yellow-100'}`}>OLLAMA_ORIGINS=* ollama serve</code></li>
              </ol>
              <button
                onClick={() => { ollamaAvailability.invalidate(); refreshModels(); }}
                className={`mt-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  isDark ? 'bg-yellow-600/30 text-yellow-300 hover:bg-yellow-600/50' : 'bg-yellow-200 text-yellow-900 hover:bg-yellow-300'
                }`}
              >
                Re-check Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Host selector + actions bar */}
      <div className={cardClass}>
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Host selector */}
          <div className="flex-1">
            <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Ollama Host</label>
            <select
              value={selectedHost}
              onChange={(e) => setSelectedHost(e.target.value)}
              className={inputClass}
            >
              {hosts.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>

          {/* Action buttons */}
          <div className="flex items-end gap-2">
            <button
              onClick={() => {
                pullDialogRef.current?.resetForNewPull();
                setShowPullDialog(true);
              }}
              className="px-3 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm font-medium whitespace-nowrap"
            >
              ⬇ Pull Model
            </button>
            <button
              onClick={refreshModels}
              disabled={isLoading}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                isDark ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' : 'bg-light-300 hover:bg-light-400 text-gray-700'
              } disabled:opacity-50`}
            >
              {isLoading ? '⟳ Loading...' : '⟳ Refresh'}
            </button>
          </div>
        </div>
      </div>

      {/* ─── Browse & Pull from Registry ─── */}
      <div>
        <button
          onClick={() => setShowBrowse(prev => !prev)}
          className={`flex items-center gap-2 text-sm font-semibold ${textPrimary} hover:text-theme-primary transition-colors`}
        >
          <svg className={`w-4 h-4 transition-transform ${showBrowse ? 'rotate-90' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
          Browse & Pull from Ollama Registry
        </button>

        {showBrowse && (
          <div className="mt-3 space-y-3">
            {/* Filter + Refresh */}
            <div className="flex gap-2">
              <input
                type="text"
                value={browseFilter}
                onChange={e => setBrowseFilter(e.target.value)}
                placeholder="Search models..."
                className={`flex-1 ${inputClass}`}
              />
              <button
                onClick={handleLiveRefresh}
                disabled={registryLoading}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isDark ? 'bg-dark-100 text-gray-300 hover:bg-dark-50' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                } disabled:opacity-50`}
                title="Fetch latest from ollama.com"
              >
                {registryLoading ? '...' : '🔄 Refresh'}
              </button>
            </div>

            {registryError && (
              <div className={`p-2 rounded-lg text-xs ${isDark ? 'bg-yellow-900/20 text-yellow-300' : 'bg-yellow-50 text-yellow-700'}`}>
                {registryError}{' '}
                <a href="https://ollama.com/library" target="_blank" rel="noreferrer" className="text-theme-primary hover:underline">
                  Open ollama.com/library
                </a>
              </div>
            )}

            {filteredRegistry.length === 0 && (
              <p className={`text-sm text-center py-4 ${textMuted}`}>
                {browseFilter
                  ? <>No models match "{browseFilter}".{' '}
                      <a href={`https://ollama.com/search?q=${encodeURIComponent(browseFilter)}`} target="_blank" rel="noreferrer" className="text-theme-primary hover:underline">
                        Search on ollama.com
                      </a>
                    </>
                  : 'No models available'}
              </p>
            )}

            {filteredRegistry.length > 0 && (
              <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
                {filteredRegistry.map(m => {
                  const baseName = m.name.split(':')[0];
                  const isInstalled = installedNames.has(baseName);
                  const exceedsRam = ramThreshold ? m.size > ramThreshold : false;
                  const pulling = pullingFromBrowse[m.name];
                  const updated = m.modified_at
                    ? new Date(m.modified_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })
                    : '';

                  return (
                    <div
                      key={m.name}
                      className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                        exceedsRam
                          ? isDark ? 'bg-dark-300 border-orange-700/40 opacity-70' : 'bg-white border-orange-300 opacity-70'
                          : isDark ? 'bg-dark-300 border-dark-100 hover:border-dark-50' : 'bg-white border-light-400 hover:border-light-300'
                      }`}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-sm font-semibold truncate ${textPrimary}`}>{m.name}</span>
                          {isInstalled && (
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-300 flex-shrink-0">
                              Installed
                            </span>
                          )}
                          {exceedsRam && (
                            <span
                              className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-orange-100 text-orange-800 dark:bg-orange-900/40 dark:text-orange-300 flex-shrink-0"
                              title={`This model (${formatBytes(m.size)}) may exceed 75% of your detected RAM (~${deviceRamBytes ? formatBytes(deviceRamBytes) : '?'}). Performance may be poor.`}
                            >
                              May exceed RAM
                            </span>
                          )}
                        </div>
                        <div className={`flex items-center gap-3 mt-0.5 text-xs ${textMuted}`}>
                          <span>{formatBytes(m.size)}</span>
                          {updated && <span>{updated}</span>}
                        </div>
                      </div>

                      {pulling ? (
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <div className="flex items-center gap-1.5 w-28">
                            <div className={`flex-1 h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-dark-100' : 'bg-gray-200'}`}>
                              <div
                                className="h-full bg-theme-primary rounded-full transition-all"
                                style={{ width: `${pulling.percent}%` }}
                              />
                            </div>
                            <span className={`text-xs font-medium w-8 text-right ${textMuted}`}>{pulling.percent}%</span>
                          </div>
                          <button
                            onClick={() => {
                              pullControllersRef.current[m.name]?.abort();
                              delete pullControllersRef.current[m.name];
                              setPullingFromBrowse(prev => { const next = { ...prev }; delete next[m.name]; return next; });
                            }}
                            className="p-1 rounded text-red-500 hover:text-red-400 hover:bg-red-900/20 transition-colors"
                            title="Cancel pull"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => pullFromBrowse(m.name)}
                          disabled={ollamaStatus === 'unreachable'}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg bg-theme-primary text-white hover:bg-theme-primary-hover disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                        >
                          Pull
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <p className={`text-xs ${textMuted}`}>
              {isLiveData() ? 'Live data from' : 'Bundled catalog from'}{' '}
              <a href="https://ollama.com/library" target="_blank" rel="noreferrer" className="text-theme-primary hover:underline">
                ollama.com/library
              </a>
              {!isLiveData() && ' — click Refresh for latest'}. Use "Pull Model" above for any model by name.
              {deviceRamBytes && (
                <> · Detected ~{formatBytes(deviceRamBytes)} RAM — models exceeding 75% are pushed to bottom.</>
              )}
            </p>
          </div>
        )}
      </div>

      {/* Search + Sort bar */}
      {models.length > 0 && (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1 relative">
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter models..."
                className={inputClass}
              />
              {searchFilter && (
                <button
                  onClick={() => setSearchFilter('')}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 text-xs px-1 rounded ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  ✕
                </button>
              )}
            </div>
            {models.some((m) => !isProviderConfigured(m.name)) && (
              <button
                onClick={() => {
                  let added = 0;
                  const host = resolveHost();
                  for (const m of models) {
                    if (!state.providers.some(p => p.type === 'ollama' && p.apiEndpoint === `${host}/api/generate` && p.model === m.name)) {
                      const np: LLMProviderConfig = {
                        id: generateId(),
                        name: `Ollama · ${m.name}`,
                        type: 'ollama',
                        apiEndpoint: `${host}/api/generate`,
                        model: m.name,
                        isEnabled: true,
                        isDefault: state.providers.length === 0 && added === 0,
                        settings: { temperature: 0.7, maxTokens: 4096 },
                        testStatus: 'untested',
                      };
                      dispatch({ type: 'ADD_PROVIDER', payload: np });
                      added++;
                    }
                  }
                  if (added > 0) addToast('success', 'Providers Added', `${added} model${added > 1 ? 's' : ''} added`);
                  else addToast('info', 'No New Models', 'All models are already configured as providers');
                }}
                className={`px-3 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  isDark ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' : 'bg-light-300 hover:bg-light-400 text-gray-700'
                }`}
                title="Add all models as LLM providers"
              >
                + Add All
              </button>
            )}
          </div>

          {/* Sort pills */}
          <div className="flex flex-wrap gap-1.5">
            {([
              ['name', 'Name'],
              ['size', 'Size'],
              ['family', 'Family'],
              ['params', 'Params'],
              ['quantization', 'Quant'],
              ['modified', 'Modified'],
            ] as [SortField, string][]).map(([field, label]) => (
              <button
                key={field}
                onClick={() => handleSortToggle(field)}
                className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium transition-colors ${
                  sortConfig.field === field
                    ? 'bg-theme-primary/20 text-theme-primary'
                    : isDark
                      ? 'bg-dark-100 text-gray-400 hover:text-gray-200'
                      : 'bg-light-300 text-gray-600 hover:text-gray-800'
                }`}
              >
                {label}
                <span className={`ml-0.5 ${sortConfig.field !== field ? 'opacity-30' : ''}`}>
                  {sortConfig.field === field ? (sortConfig.dir === 'asc' ? '↑' : '↓') : '↕'}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Running models */}
      {runningModels.length > 0 && (
        <div className={cardClass}>
          <button
            onClick={() => setShowRunning(!showRunning)}
            className="flex items-center justify-between w-full text-left"
          >
            <h4 className={`font-semibold text-sm ${textPrimary}`}>
              🟢 Running Models ({runningModels.length})
            </h4>
            <span className={`text-xs ${textMuted}`}>{showRunning ? '▲' : '▼'}</span>
          </button>
          {showRunning && (
            <div className="mt-3 space-y-2">
              {runningModels.map((rm) => (
                <div
                  key={rm.name}
                  className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                    isDark ? 'bg-dark-200' : 'bg-light-300'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`font-medium truncate ${textPrimary}`}>{rm.name}</span>
                    <span className={`text-xs ${textMuted}`}>
                      VRAM: {modelService.formatBytes(rm.size_vram)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`text-xs ${textMuted}`}>
                      expires {modelService.formatRelativeTime(rm.expires_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Model list */}
      {isLoading && models.length === 0 ? (
        <div className="flex items-center justify-center py-8">
          <span className="animate-spin inline-block w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full" />
          <span className={`ml-2 text-sm ${textMuted}`}>Loading models...</span>
        </div>
      ) : filteredAndSortedModels.length === 0 ? (
        <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-400'}`}>
          {models.length === 0 ? (
            <>
              <p className="text-sm mb-2">No models found on this host</p>
              <p className="text-xs mb-4">Pull a model to get started</p>
              <button
                onClick={() => {
                  pullDialogRef.current?.resetForNewPull();
                  setShowPullDialog(true);
                }}
                className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm"
              >
                ⬇ Pull Your First Model
              </button>
            </>
          ) : (
            <p className="text-sm">No models matching "{searchFilter}"</p>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredAndSortedModels.map((model) => {
            const isRunning = runningModels.some((rm) => rm.name === model.name);
            const isConfigured = isProviderConfigured(model.name);
            return (
              <div
                key={model.name}
                className={`rounded-lg border p-3 transition-colors ${
                  isDark ? 'bg-dark-300 border-dark-100 hover:border-gray-600' : 'bg-light-200 border-light-400 hover:border-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  {/* Model info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`font-medium text-sm truncate ${textPrimary}`}>{model.name}</span>
                      {isRunning && (
                        <span className="w-2 h-2 rounded-full bg-green-500 flex-shrink-0" title="Currently loaded" />
                      )}
                      {isConfigured && (
                        <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-theme-primary/20 text-theme-primary' : 'bg-theme-primary/10 text-theme-primary'}`}>
                          provider
                        </span>
                      )}
                    </div>
                    <div className={`flex flex-wrap items-center gap-x-1.5 gap-y-1 mt-1.5 text-xs`}>
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-200 text-gray-400' : 'bg-light-300 text-gray-600'}`}
                        title="Storage space this model uses on disk"
                      >
                        <span className="opacity-50 font-medium">Disk</span>
                        {modelService.formatBytes(model.size)}
                      </span>
                      {model.details && (
                        <>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-200 text-gray-400' : 'bg-light-300 text-gray-600'}`}
                            title={`Architecture family\nDifferent families (Llama, Gemma, Phi, Qwen) come from different research teams and excel at different tasks`}
                          >
                            <span className="opacity-50 font-medium">Family</span>
                            {model.details.family}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-200 text-gray-400' : 'bg-light-300 text-gray-600'}`}
                            title={`${model.details.parameter_size} parameters\n${modelService.paramSizeHint(model.details.parameter_size)}`}
                          >
                            <span className="opacity-50 font-medium">Params</span>
                            {model.details.parameter_size}
                            {modelService.paramSizeCategory(model.details.parameter_size) && (
                              <span className={`font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                                {modelService.paramSizeCategory(model.details.parameter_size)}
                              </span>
                            )}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-200 text-gray-400' : 'bg-light-300 text-gray-600'}`}
                            title={modelService.quantHint(model.details.quantization_level)}
                          >
                            <span className="opacity-50 font-medium">Quant</span>
                            {model.details.quantization_level}
                            {modelService.quantQualityLabel(model.details.quantization_level) && (
                              <span className={`font-medium ${
                                (() => {
                                  const lvl = modelService.quantQualityLevel(model.details.quantization_level);
                                  if (lvl >= 4) return isDark ? 'text-green-400' : 'text-green-600';
                                  if (lvl >= 3) return isDark ? 'text-yellow-400' : 'text-yellow-600';
                                  return isDark ? 'text-orange-400' : 'text-orange-600';
                                })()
                              }`}>
                                {modelService.quantQualityLabel(model.details.quantization_level)}
                              </span>
                            )}
                          </span>
                        </>
                      )}
                      <span
                        className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-200 text-gray-400' : 'bg-light-300 text-gray-600'}`}
                        title="When this model was last downloaded or modified"
                      >
                        {modelService.formatRelativeTime(model.modified_at)}
                      </span>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => setInfoModel(model)}
                      className={`px-2 py-1 rounded text-xs transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
                      title="View details"
                    >
                      ℹ️
                    </button>
                    {!isConfigured && (
                      <button
                        onClick={() => handleAddAsProvider(model.name)}
                        className={`px-2 py-1 rounded text-xs transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
                        title="Add as provider"
                      >
                        ➕
                      </button>
                    )}
                    <button
                      onClick={() => { setCopySource(model.name); setCopyDestination(''); }}
                      className={`px-2 py-1 rounded text-xs transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}
                      title="Copy model"
                    >
                      📋
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(model.name)}
                      className={`px-2 py-1 rounded text-xs transition-colors text-red-500 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                      title="Delete model"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pull Dialog — always mounted so state survives minimize/restore */}
      <ModelPullDialog
        ref={pullDialogRef}
        baseUrl={resolveHost()}
        isDark={isDark}
        visible={showPullDialog}
        onClose={() => setShowPullDialog(false)}
        onMinimize={() => setShowPullDialog(false)}
        onPullComplete={(name) => {
          setBgPulls(prev => { const next = { ...prev }; delete next[name]; return next; });
          delete bgPullControllersRef.current[name];
          addToast('success', 'Model Ready', `${name} is now available`);
          refreshModels();
        }}
        onProgressUpdate={(info) => {
          setBgPulls(prev => ({ ...prev, [info.modelName]: { percent: info.percent, pulling: info.pulling, status: info.status, digest: info.digest, completed: info.completed, total: info.total } }));
          if (!info.pulling) {
            delete bgPullControllersRef.current[info.modelName];
            setExpandedBgPulls(prev => { const next = new Set(prev); next.delete(info.modelName); return next; });
          }
        }}
        onDetachPull={(info) => {
          bgPullControllersRef.current[info.modelName] = info.controller;
          setBgPulls(prev => ({ ...prev, [info.modelName]: { percent: info.percent, pulling: true } }));
        }}
      />

      {/* Info Dialog */}
      {infoModel && (
        <ModelInfoDialog
          baseUrl={resolveHost()}
          model={infoModel}
          isDark={isDark}
          onClose={() => setInfoModel(null)}
        />
      )}

      {/* Copy Dialog */}
      {copySource && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCopySource(null)} />
          <div className={`relative w-full max-w-sm rounded-xl shadow-2xl p-5 ${isDark ? 'bg-dark-200' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-3 ${textPrimary}`}>Copy Model</h3>
            <p className={`text-xs mb-3 ${textMuted}`}>
              Create a copy of <strong>{copySource}</strong> with a new name.
            </p>
            <input
              type="text"
              value={copyDestination}
              onChange={(e) => setCopyDestination(e.target.value)}
              placeholder="New model name"
              className={inputClass}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCopy(); if (e.key === 'Escape') setCopySource(null); }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => setCopySource(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCopy}
                disabled={!copyDestination.trim()}
                className="px-3 py-1.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm font-medium disabled:opacity-50"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className={`relative w-full max-w-sm rounded-xl shadow-2xl p-5 ${isDark ? 'bg-dark-200' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-2 ${textPrimary}`}>Delete Model</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>
              Are you sure you want to delete <strong>{deleteConfirm}</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="px-3 py-1.5 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
