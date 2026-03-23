import { useState, useEffect } from 'react';
import { useRAG } from '../../context/RAGContext';
import { detectBestProvider } from '../../services/embeddingService';
import type { RAGEmbeddingProvider } from '../../types';

interface RAGSettingsPanelProps {
  isDark: boolean;
}

export default function RAGSettingsPanel({ isDark }: RAGSettingsPanelProps) {
  const { ragState, ragDispatch } = useRAG();
  const { settings } = ragState;
  const [detectedProvider, setDetectedProvider] = useState<string | null>(null);

  useEffect(() => {
    detectBestProvider().then((p) =>
      setDetectedProvider(`${p.provider}: ${p.model}`),
    );
  }, []);

  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-800';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const inputClass = `w-full p-2 rounded-lg border text-sm ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200' : 'bg-white border-light-400 text-gray-800'}`;
  const cardClass = `rounded-lg p-4 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`;

  const update = (partial: Record<string, unknown>) => {
    ragDispatch({ type: 'UPDATE_SETTINGS', payload: partial as any });
  };

  return (
    <div className={cardClass}>
      <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>RAG Settings</h4>

      {detectedProvider && (
        <p className={`text-xs mb-3 ${textMuted}`}>
          Auto-detected embedding provider: <span className="font-medium">{detectedProvider}</span>
        </p>
      )}

      <div className="space-y-4">
        {/* Embedding provider */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Embedding Provider</label>
          <select
            value={settings.embeddingProvider}
            onChange={(e) => update({ embeddingProvider: e.target.value as RAGEmbeddingProvider })}
            className={inputClass}
          >
            <option value="ollama">Ollama (requires running Ollama with an embedding model)</option>
            <option value="transformers">Transformers.js (in-browser, ~23MB download)</option>
          </select>
          <p className={`text-[11px] mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {settings.embeddingProvider === 'ollama'
              ? 'Uses your local Ollama instance. Install an embedding model like nomic-embed-text.'
              : 'Runs entirely in the browser using WebAssembly. First use downloads the model.'}
          </p>
        </div>

        {/* Embedding model */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>Embedding Model</label>
          <input
            type="text"
            value={settings.embeddingModel}
            onChange={(e) => update({ embeddingModel: e.target.value })}
            placeholder={settings.embeddingProvider === 'ollama' ? 'nomic-embed-text' : 'Xenova/all-MiniLM-L6-v2'}
            className={inputClass}
          />
        </div>

        {/* Chunk size */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
            Chunk Size <span className="font-normal opacity-60">{settings.chunkSize} chars</span>
          </label>
          <input
            type="range"
            min={128}
            max={2048}
            step={64}
            value={settings.chunkSize}
            onChange={(e) => update({ chunkSize: Number(e.target.value) })}
            className="w-full"
          />
          <p className={`text-[11px] mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            How large each text chunk is. Smaller chunks are more precise but produce more results.
          </p>
        </div>

        {/* Chunk overlap */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
            Chunk Overlap <span className="font-normal opacity-60">{settings.chunkOverlap} chars</span>
          </label>
          <input
            type="range"
            min={0}
            max={200}
            step={10}
            value={settings.chunkOverlap}
            onChange={(e) => update({ chunkOverlap: Number(e.target.value) })}
            className="w-full"
          />
          <p className={`text-[11px] mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            How much adjacent chunks overlap. Overlap prevents losing context at chunk boundaries.
          </p>
        </div>

        {/* Top K */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
            Top-K Results <span className="font-normal opacity-60">{settings.topK}</span>
          </label>
          <input
            type="range"
            min={1}
            max={20}
            step={1}
            value={settings.topK}
            onChange={(e) => update({ topK: Number(e.target.value) })}
            className="w-full"
          />
          <p className={`text-[11px] mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            How many matching chunks to inject into each prompt. More context = better answers but uses more tokens.
          </p>
        </div>

        {/* Similarity threshold */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>
            Similarity Threshold <span className="font-normal opacity-60">{settings.similarityThreshold.toFixed(2)}</span>
          </label>
          <input
            type="range"
            min={0}
            max={0.9}
            step={0.05}
            value={settings.similarityThreshold}
            onChange={(e) => update({ similarityThreshold: Number(e.target.value) })}
            className="w-full"
          />
          <p className={`text-[11px] mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            Minimum relevance score (0-1). Higher = only very relevant chunks. Lower = broader but noisier results.
          </p>
        </div>

        {/* RAG template */}
        <div>
          <label className={`block text-xs font-medium mb-1 ${textMuted}`}>RAG Prompt Template</label>
          <textarea
            value={settings.ragTemplate}
            onChange={(e) => update({ ragTemplate: e.target.value })}
            rows={4}
            className={`${inputClass} resize-y font-mono text-xs`}
          />
          <p className={`text-[11px] mt-0.5 italic ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
            {'Template prepended to prompts when RAG is active. Use {context} as placeholder for retrieved chunks.'}
          </p>
        </div>
      </div>
    </div>
  );
}
