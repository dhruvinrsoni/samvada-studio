import React, { useState, useRef, useCallback } from 'react';
import { pullModel, formatBytes } from '../../services/ollamaModelService';
import type { OllamaPullProgress } from '../../types';

interface ModelPullDialogProps {
  baseUrl: string;
  isDark: boolean;
  onClose: () => void;
  onMinimize?: () => void;
  onPullComplete: (modelName: string) => void;
  onProgressUpdate?: (info: { modelName: string; percent: number; pulling: boolean }) => void;
}

type PullState = 'idle' | 'pulling' | 'success' | 'error' | 'cancelled';

export default function ModelPullDialog({ baseUrl, isDark, onClose, onMinimize, onPullComplete, onProgressUpdate }: ModelPullDialogProps) {
  const [modelName, setModelName] = useState('');
  const [pullState, setPullState] = useState<PullState>('idle');
  const [statusText, setStatusText] = useState('');
  const [currentDigest, setCurrentDigest] = useState('');
  const [completed, setCompleted] = useState(0);
  const [total, setTotal] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const controllerRef = useRef<AbortController | null>(null);

  const progressPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const handleProgress = useCallback((progress: OllamaPullProgress) => {
    setStatusText(progress.status);
    if (progress.digest) setCurrentDigest(progress.digest.substring(0, 12));
    if (progress.total != null) setTotal(progress.total);
    if (progress.completed != null) setCompleted(progress.completed);
    if (onProgressUpdate) {
      const pct = progress.total && progress.total > 0
        ? Math.round(((progress.completed ?? 0) / progress.total) * 100) : 0;
      onProgressUpdate({ modelName: modelName.trim(), percent: pct, pulling: true });
    }
  }, [onProgressUpdate, modelName]);

  const handlePull = () => {
    const name = modelName.trim();
    if (!name) return;

    // Basic client-side validation
    if (/[^a-zA-Z0-9._:/-]/.test(name)) {
      setPullState('error');
      setErrorMessage(`Invalid model name "${name}". Use only letters, numbers, dots, colons, slashes, and hyphens (e.g. llama3.2, mistral:7b).`);
      return;
    }

    setPullState('pulling');
    setStatusText('Starting pull...');
    setCurrentDigest('');
    setCompleted(0);
    setTotal(0);
    setErrorMessage('');

    controllerRef.current = pullModel(
      baseUrl,
      name,
      handleProgress,
      () => {
        setPullState('success');
        setStatusText('success');
        onPullComplete(name);
        onProgressUpdate?.({ modelName: name, percent: 100, pulling: false });
        window.dispatchEvent(new Event('ollama-models-changed'));
      },
      (err) => {
        if (err.message === 'Pull cancelled') {
          setPullState('cancelled');
          setStatusText('Cancelled');
        } else {
          setPullState('error');
          setErrorMessage(err.message);
        }
        onProgressUpdate?.({ modelName: name, percent: 0, pulling: false });
      },
    );
  };

  const handleCancel = () => {
    controllerRef.current?.abort();
    controllerRef.current = null;
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && pullState === 'idle') handlePull();
    if (e.key === 'Escape') onClose();
  };

  const cardBg = isDark ? 'bg-dark-200' : 'bg-white';
  const inputClass = `w-full p-2.5 rounded-lg border text-sm ${isDark ? 'bg-dark-300 border-dark-100 text-gray-200 placeholder-gray-500' : 'bg-white border-light-400 text-gray-800 placeholder-gray-400'}`;
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-800';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={pullState === 'pulling' ? (onMinimize ?? onClose) : onClose} />
      <div className={`relative w-full max-w-md rounded-xl shadow-2xl overflow-hidden ${cardBg}`} onKeyDown={handleKeyDown}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          <h3 className={`text-base font-bold ${textPrimary}`}>Pull Model</h3>
          <button onClick={pullState === 'pulling' ? (onMinimize ?? onClose) : onClose} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}>
            {pullState === 'pulling' ? '─' : '✕'}
          </button>
        </div>

        <div className="p-4 space-y-4">
          {/* Model name input */}
          <div>
            <label className={`block text-xs font-medium mb-1.5 ${textMuted}`}>Model Name</label>
            <input
              type="text"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              placeholder="e.g. llama3.2, mistral:7b, gemma2:2b"
              className={inputClass}
              disabled={pullState === 'pulling'}
              autoFocus
            />
            <p className={`text-xs mt-1.5 ${textMuted}`}>
              Browse models at{' '}
              <a href="https://ollama.com/library" target="_blank" rel="noreferrer" className="text-theme-primary hover:underline">
                ollama.com/library
              </a>
            </p>
          </div>

          {/* Progress area */}
          {pullState !== 'idle' && (
            <div className={`rounded-lg p-3 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`}>
              {/* Status text */}
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-medium ${textPrimary}`}>{statusText}</span>
                {currentDigest && (
                  <span className={`text-xs font-mono ${textMuted}`}>{currentDigest}</span>
                )}
              </div>

              {/* Progress bar */}
              {total > 0 && pullState === 'pulling' && (
                <>
                  <div className={`w-full h-2 rounded-full overflow-hidden ${isDark ? 'bg-dark-100' : 'bg-light-400'}`}>
                    <div
                      className="h-full bg-theme-primary rounded-full transition-all duration-300"
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className={`text-xs ${textMuted}`}>
                      {formatBytes(completed)} / {formatBytes(total)}
                    </span>
                    <span className={`text-xs font-medium ${textPrimary}`}>{progressPercent}%</span>
                  </div>
                </>
              )}

              {/* Indeterminate spinner for non-download phases */}
              {total === 0 && pullState === 'pulling' && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="animate-spin inline-block w-3.5 h-3.5 border-2 border-theme-primary border-t-transparent rounded-full" />
                  <span className={`text-xs ${textMuted}`}>Please wait...</span>
                </div>
              )}

              {/* Success */}
              {pullState === 'success' && (
                <div className={`flex items-center gap-2 mt-1 text-xs font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                  <span>✓</span>
                  <span>Model pulled successfully!</span>
                </div>
              )}

              {/* Error */}
              {pullState === 'error' && (
                <div className={`mt-1 text-xs ${isDark ? 'text-red-400' : 'text-red-600'}`}>
                  <span>✗ {errorMessage}</span>
                </div>
              )}

              {pullState === 'cancelled' && (
                <div className={`mt-1 text-xs ${isDark ? 'text-yellow-400' : 'text-yellow-600'}`}>
                  <span>Pull was cancelled.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className={`flex items-center justify-end gap-2 p-4 border-t ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
          {pullState === 'pulling' ? (
            <>
              {onMinimize && (
                <button onClick={onMinimize} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                  Minimize
                </button>
              )}
              <button onClick={handleCancel} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                Cancel Pull
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
                {pullState === 'success' ? 'Done' : 'Close'}
              </button>
              {(pullState === 'idle' || pullState === 'error' || pullState === 'cancelled') && (
                <button
                  onClick={handlePull}
                  disabled={!modelName.trim()}
                  className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm font-medium disabled:opacity-50"
                >
                  Pull Model
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
