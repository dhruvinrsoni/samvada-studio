import { useState, useEffect, useCallback } from 'react';
import { useRAG } from '../../context/RAGContext';
import { useToast } from '../../context/ToastContext';
import { formatBytes } from '../../services/ollamaModelService';
import type { RAGDocument } from '../../types';
import DocumentUpload from './DocumentUpload';
import RAGSettingsPanel from './RAGSettingsPanel';

interface KnowledgePanelProps {
  isDark: boolean;
}

export default function KnowledgePanel({ isDark }: KnowledgePanelProps) {
  const {
    ragState,
    refreshCollections,
    createCollection,
    deleteCollection,
    getDocuments,
    removeDocument,
  } = useRAG();
  const { addToast } = useToast();

  const [activeCollectionId, setActiveCollectionId] = useState<string | null>(null);
  const [documents, setDocuments] = useState<RAGDocument[]>([]);
  const [isLoadingDocs, setIsLoadingDocs] = useState(false);
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  const textPrimary = isDark ? 'text-gray-200' : 'text-gray-800';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const cardClass = `rounded-lg p-4 border ${isDark ? 'bg-dark-300 border-dark-100' : 'bg-light-200 border-light-400'}`;
  const inputClass = `w-full p-2 rounded-lg border text-sm ${isDark ? 'bg-dark-200 border-dark-100 text-gray-200 placeholder-gray-500' : 'bg-white border-light-400 text-gray-800 placeholder-gray-400'}`;

  const activeCollection = ragState.collections.find((c) => c.id === activeCollectionId);

  const loadDocuments = useCallback(
    async (cid: string) => {
      setIsLoadingDocs(true);
      try {
        const docs = await getDocuments(cid);
        setDocuments(docs);
      } catch {
        setDocuments([]);
      } finally {
        setIsLoadingDocs(false);
      }
    },
    [getDocuments],
  );

  useEffect(() => {
    if (activeCollectionId) {
      loadDocuments(activeCollectionId);
    }
  }, [activeCollectionId, loadDocuments]);

  const handleCreateCollection = async () => {
    if (!newName.trim()) return;
    try {
      const col = await createCollection(newName.trim(), newDesc.trim());
      setActiveCollectionId(col.id);
      setShowNewCollection(false);
      setNewName('');
      setNewDesc('');
      addToast('success', 'Collection Created', col.name);
    } catch (err: any) {
      addToast('error', 'Failed', err.message);
    }
  };

  const handleDeleteCollection = async (id: string) => {
    try {
      await deleteCollection(id);
      if (activeCollectionId === id) {
        setActiveCollectionId(null);
        setDocuments([]);
      }
      setDeleteConfirm(null);
      addToast('success', 'Collection Deleted');
    } catch (err: any) {
      addToast('error', 'Delete Failed', err.message);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!activeCollectionId) return;
    try {
      await removeDocument(docId, activeCollectionId);
      setDocuments((prev) => prev.filter((d) => d.id !== docId));
      addToast('success', 'Document Removed');
    } catch (err: any) {
      addToast('error', 'Remove Failed', err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`pb-3 border-b ${isDark ? 'border-dark-100' : 'border-light-400'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className={`text-lg font-bold ${textPrimary}`}>Knowledge Base</h3>
            <p className={`text-xs mt-0.5 ${textMuted}`}>
              Upload documents, create collections, and enable RAG for your chats
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowSettings(!showSettings)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isDark ? 'bg-dark-100 hover:bg-dark-50 text-gray-300' : 'bg-light-300 hover:bg-light-400 text-gray-700'
              }`}
            >
              Settings
            </button>
            <button
              onClick={() => setShowNewCollection(true)}
              className="px-3 py-1.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-xs font-medium"
            >
              + New Collection
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel (collapsible) */}
      {showSettings && <RAGSettingsPanel isDark={isDark} />}

      {/* New collection form */}
      {showNewCollection && (
        <div className={cardClass}>
          <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>Create Collection</h4>
          <div className="space-y-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Collection name"
              className={inputClass}
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleCreateCollection(); if (e.key === 'Escape') setShowNewCollection(false); }}
            />
            <input
              type="text"
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Description (optional)"
              className={inputClass}
            />
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => setShowNewCollection(false)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={handleCreateCollection}
                disabled={!newName.trim()}
                className="px-3 py-1.5 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm font-medium disabled:opacity-50"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Collection list */}
      {ragState.isLoading ? (
        <div className="flex items-center justify-center py-8">
          <span className="animate-spin inline-block w-5 h-5 border-2 border-theme-primary border-t-transparent rounded-full" />
          <span className={`ml-2 text-sm ${textMuted}`}>Loading collections...</span>
        </div>
      ) : ragState.collections.length === 0 ? (
        <div className={`text-center py-8 rounded-lg border-2 border-dashed ${isDark ? 'border-dark-100 text-gray-500' : 'border-light-400 text-gray-400'}`}>
          <p className="text-sm mb-2">No knowledge collections yet</p>
          <p className="text-xs mb-4">Create a collection to start uploading documents</p>
          <button
            onClick={() => setShowNewCollection(true)}
            className="px-4 py-2 bg-theme-primary text-white rounded-lg hover:bg-theme-primary-hover text-sm"
          >
            + Create Your First Collection
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {ragState.collections.map((col) => (
            <div
              key={col.id}
              className={`rounded-lg border p-3 transition-colors cursor-pointer ${
                activeCollectionId === col.id
                  ? isDark
                    ? 'bg-dark-300 border-theme-primary/50'
                    : 'bg-light-200 border-theme-primary/50'
                  : isDark
                    ? 'bg-dark-300 border-dark-100 hover:border-gray-600'
                    : 'bg-light-200 border-light-400 hover:border-gray-300'
              }`}
              onClick={() => setActiveCollectionId(activeCollectionId === col.id ? null : col.id)}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`font-medium text-sm ${textPrimary}`}>{col.name}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-100 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
                      {col.documentCount} doc{col.documentCount !== 1 ? 's' : ''}
                    </span>
                    <span className={`text-xs px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-100 text-gray-400' : 'bg-light-300 text-gray-600'}`}>
                      {col.chunkCount} chunk{col.chunkCount !== 1 ? 's' : ''}
                    </span>
                  </div>
                  {col.description && (
                    <p className={`text-xs mt-0.5 ${textMuted}`}>{col.description}</p>
                  )}
                  <div className={`flex items-center gap-2 mt-1 text-xs ${textMuted}`}>
                    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}>
                      <span className="opacity-50 font-medium">Embed</span>
                      {col.embeddingProvider === 'ollama' ? 'Ollama' : 'Transformers.js'}: {col.embeddingModel}
                    </span>
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); setDeleteConfirm(col.id); }}
                  className={`px-2 py-1 rounded text-xs text-red-500 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                  title="Delete collection"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Active collection detail */}
      {activeCollection && (
        <div className="space-y-4">
          <div className={cardClass}>
            <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
              Upload Documents to "{activeCollection.name}"
            </h4>
            <DocumentUpload
              collectionId={activeCollection.id}
              isDark={isDark}
              onComplete={() => {
                loadDocuments(activeCollection.id);
                refreshCollections();
              }}
            />
          </div>

          {/* Document list */}
          <div className={cardClass}>
            <h4 className={`text-sm font-semibold mb-3 ${textPrimary}`}>
              Documents ({documents.length})
            </h4>
            {isLoadingDocs ? (
              <p className={`text-xs ${textMuted}`}>Loading...</p>
            ) : documents.length === 0 ? (
              <p className={`text-xs ${textMuted}`}>No documents yet. Upload files above.</p>
            ) : (
              <div className="space-y-1.5">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}
                  >
                    <div className="min-w-0 flex-1">
                      <span className={`font-medium text-sm truncate block ${textPrimary}`}>{doc.name}</span>
                      <div className={`flex items-center gap-2 text-xs ${textMuted}`}>
                        <span>{formatBytes(doc.size)}</span>
                        <span>{doc.chunkCount} chunks</span>
                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteDoc(doc.id)}
                      className={`px-2 py-1 rounded text-xs text-red-500 flex-shrink-0 ${isDark ? 'hover:bg-red-900/20' : 'hover:bg-red-50'}`}
                    >
                      Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setDeleteConfirm(null)} />
          <div className={`relative w-full max-w-sm rounded-xl shadow-2xl p-5 ${isDark ? 'bg-dark-200' : 'bg-white'}`}>
            <h3 className={`text-base font-bold mb-2 ${textPrimary}`}>Delete Collection</h3>
            <p className={`text-sm mb-4 ${textMuted}`}>
              This will delete the collection and all its documents and embeddings. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium ${isDark ? 'bg-dark-100 text-gray-400 hover:bg-dark-50' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteCollection(deleteConfirm)}
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
