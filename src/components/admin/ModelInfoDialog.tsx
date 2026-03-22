import React, { useEffect, useState } from 'react';
import { showModelInfo, formatBytes, paramSizeCategory, paramSizeHint, quantQualityLabel, quantHint } from '../../services/ollamaModelService';
import type { OllamaModelShowResponse, OllamaModelInfo } from '../../types';

interface ModelInfoDialogProps {
  baseUrl: string;
  model: OllamaModelInfo;
  isDark: boolean;
  onClose: () => void;
}

export default function ModelInfoDialog({ baseUrl, model, isDark, onClose }: ModelInfoDialogProps) {
  const [info, setInfo] = useState<OllamaModelShowResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showFullModelfile, setShowFullModelfile] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    showModelInfo(baseUrl, model.name)
      .then((data) => { if (!cancelled) setInfo(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [baseUrl, model.name]);

  const cardBg = isDark ? 'bg-dark-200' : 'bg-white';
  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-800';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const borderColor = isDark ? 'border-dark-100' : 'border-light-400';
  const sectionBg = isDark ? 'bg-dark-300' : 'bg-light-200';
  const codeBg = isDark ? 'bg-dark-300 text-gray-300' : 'bg-gray-100 text-gray-700';

  const InfoRow = ({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) => (
    <div className="py-1.5">
      <div className="flex items-start justify-between gap-4">
        <span className={`text-xs font-medium flex-shrink-0 ${textMuted}`}>{label}</span>
        <span className={`text-xs text-right ${textPrimary}`}>{value}</span>
      </div>
      {hint && (
        <p className={`text-[11px] mt-0.5 leading-snug italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{hint}</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative w-full max-w-lg max-h-[80vh] rounded-xl shadow-2xl overflow-hidden flex flex-col ${cardBg}`}>
        {/* Header */}
        <div className={`flex items-center justify-between p-4 border-b ${borderColor} flex-shrink-0`}>
          <div>
            <h3 className={`text-base font-bold ${textPrimary}`}>{model.name}</h3>
            <p className={`text-xs ${textMuted}`}>{formatBytes(model.size)}</p>
          </div>
          <button onClick={onClose} className={`p-1 rounded-lg transition-colors ${isDark ? 'hover:bg-dark-100 text-gray-400' : 'hover:bg-light-300 text-gray-600'}`}>
            ✕
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <span className="animate-spin inline-block w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full" />
              <span className={`ml-2 text-sm ${textMuted}`}>Loading model info...</span>
            </div>
          )}

          {error && (
            <div className={`p-3 rounded-lg text-sm ${isDark ? 'bg-red-900/20 text-red-400' : 'bg-red-50 text-red-600'}`}>
              Failed to load: {error}
            </div>
          )}

          {info && (
            <>
              {/* Details section */}
              <div className={`rounded-lg p-3 border ${borderColor} ${sectionBg}`}>
                <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${textMuted}`}>Details</h4>
                <div className="divide-y divide-opacity-20" style={{ borderColor: isDark ? '#374151' : '#e5e7eb' }}>
                  <InfoRow
                    label="Family"
                    value={info.details.family}
                    hint="The model architecture — each family (Llama, Gemma, Phi, Qwen) is built by a different team and has different strengths"
                  />
                  {info.details.families && info.details.families.length > 1 && (
                    <InfoRow
                      label="Families"
                      value={info.details.families.join(', ')}
                      hint="Some models combine multiple architecture families for broader capabilities"
                    />
                  )}
                  <InfoRow
                    label="Parameters"
                    value={
                      <span>
                        {info.details.parameter_size}
                        {paramSizeCategory(info.details.parameter_size) && (
                          <span className={`ml-1.5 font-medium ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>
                            {paramSizeCategory(info.details.parameter_size)}
                          </span>
                        )}
                      </span>
                    }
                    hint={paramSizeHint(info.details.parameter_size)}
                  />
                  <InfoRow
                    label="Quantization"
                    value={
                      <span>
                        {info.details.quantization_level}
                        {quantQualityLabel(info.details.quantization_level) && (
                          <span className={`ml-1.5 font-medium ${isDark ? 'text-green-400' : 'text-green-600'}`}>
                            {quantQualityLabel(info.details.quantization_level)}
                          </span>
                        )}
                      </span>
                    }
                    hint={quantHint(info.details.quantization_level)}
                  />
                  <InfoRow
                    label="Format"
                    value={info.details.format}
                    hint="The file format used to store model weights (GGUF is the standard for Ollama)"
                  />
                  {info.details.parent_model && (
                    <InfoRow
                      label="Parent Model"
                      value={info.details.parent_model}
                      hint="The base model this was derived from (e.g., via fine-tuning or custom Modelfile)"
                    />
                  )}
                  <InfoRow label="Size on Disk" value={formatBytes(model.size)} hint="Total storage space used by the model file" />
                  <InfoRow label="Digest" value={<span className="font-mono">{model.digest.substring(0, 12)}</span>} hint="Unique fingerprint to verify model integrity" />
                  <InfoRow label="Modified" value={new Date(model.modified_at).toLocaleString()} />
                </div>
              </div>

              {/* Parameters */}
              {info.parameters && (
                <div className={`rounded-lg p-3 border ${borderColor} ${sectionBg}`}>
                  <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${textMuted}`}>Parameters</h4>
                  <pre className={`text-xs p-2 rounded overflow-x-auto ${codeBg}`}>
                    {info.parameters}
                  </pre>
                </div>
              )}

              {/* Template */}
              {info.template && (
                <div className={`rounded-lg p-3 border ${borderColor} ${sectionBg}`}>
                  <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${textMuted}`}>Template</h4>
                  <pre className={`text-xs p-2 rounded overflow-x-auto max-h-32 ${codeBg}`}>
                    {info.template}
                  </pre>
                </div>
              )}

              {/* License */}
              {info.license && (
                <div className={`rounded-lg p-3 border ${borderColor} ${sectionBg}`}>
                  <h4 className={`text-xs font-semibold mb-2 uppercase tracking-wider ${textMuted}`}>License</h4>
                  <pre className={`text-xs p-2 rounded overflow-x-auto max-h-24 ${codeBg}`}>
                    {info.license}
                  </pre>
                </div>
              )}

              {/* Full Modelfile (collapsible) */}
              {info.modelfile && (
                <div className={`rounded-lg p-3 border ${borderColor} ${sectionBg}`}>
                  <button
                    onClick={() => setShowFullModelfile(!showFullModelfile)}
                    className={`flex items-center justify-between w-full text-left`}
                  >
                    <h4 className={`text-xs font-semibold uppercase tracking-wider ${textMuted}`}>Modelfile</h4>
                    <span className={`text-xs ${textMuted}`}>{showFullModelfile ? '▲ Collapse' : '▼ Expand'}</span>
                  </button>
                  {showFullModelfile && (
                    <pre className={`text-xs p-2 rounded overflow-x-auto max-h-48 mt-2 ${codeBg}`}>
                      {info.modelfile}
                    </pre>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className={`flex items-center justify-end p-4 border-t ${borderColor} flex-shrink-0`}>
          <button onClick={onClose} className={`px-4 py-2 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
