import { useState, useRef, useCallback } from 'react';
import { useRAG } from '../../context/RAGContext';
import { useToast } from '../../context/ToastContext';
import { getAcceptString } from '../../services/documentParser';
import type { IngestProgress } from '../../services/ragService';

interface DocumentUploadProps {
  collectionId: string;
  isDark: boolean;
  onComplete?: () => void;
}

export default function DocumentUpload({ collectionId, isDark, onComplete }: DocumentUploadProps) {
  const { ingestDocument } = useRAG();
  const { addToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [uploads, setUploads] = useState<
    Map<string, { name: string; progress: IngestProgress | null; error?: string }>
  >(new Map());

  const processFile = useCallback(
    async (file: File) => {
      const key = `${file.name}-${Date.now()}`;
      setUploads((prev) => {
        const next = new Map(prev);
        next.set(key, { name: file.name, progress: null });
        return next;
      });

      try {
        await ingestDocument(file, collectionId, (progress) => {
          setUploads((prev) => {
            const next = new Map(prev);
            next.set(key, { name: file.name, progress });
            return next;
          });
        });

        setUploads((prev) => {
          const next = new Map(prev);
          next.delete(key);
          return next;
        });
        addToast('success', 'Document Ingested', `${file.name} added successfully`);
        onComplete?.();
      } catch (err: any) {
        setUploads((prev) => {
          const next = new Map(prev);
          next.set(key, { name: file.name, progress: null, error: err.message });
          return next;
        });
        addToast('error', 'Ingestion Failed', `${file.name}: ${err.message}`);
      }
    },
    [collectionId, ingestDocument, addToast, onComplete],
  );

  const handleFiles = useCallback(
    (files: FileList | File[]) => {
      for (const file of Array.from(files)) {
        processFile(file);
      }
    },
    [processFile],
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length) {
        handleFiles(e.dataTransfer.files);
      }
    },
    [handleFiles],
  );

  const textMuted = isDark ? 'text-gray-400' : 'text-gray-600';
  const activeUploads = Array.from(uploads.entries());

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`rounded-lg border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${
          isDragging
            ? 'border-theme-primary bg-theme-primary/10'
            : isDark
              ? 'border-dark-100 hover:border-gray-600'
              : 'border-light-400 hover:border-gray-300'
        }`}
      >
        <p className={`text-sm font-medium ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
          Drop files here or click to browse
        </p>
        <p className={`text-xs mt-1 ${textMuted}`}>
          Supports TXT, MD, PDF, DOCX, CSV, JSON, code files, and more
        </p>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={getAcceptString()}
          className="hidden"
          onChange={(e) => {
            if (e.target.files?.length) {
              handleFiles(e.target.files);
              e.target.value = '';
            }
          }}
        />
      </div>

      {/* Active uploads */}
      {activeUploads.length > 0 && (
        <div className="space-y-2">
          {activeUploads.map(([key, upload]) => (
            <div
              key={key}
              className={`rounded-lg p-3 text-sm ${isDark ? 'bg-dark-200' : 'bg-light-300'}`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className={`font-medium truncate ${isDark ? 'text-gray-200' : 'text-gray-800'}`}>
                  {upload.name}
                </span>
                {upload.error ? (
                  <span className="text-red-500 text-xs">Failed</span>
                ) : (
                  <span className={`text-xs ${textMuted}`}>
                    {upload.progress?.stage ?? 'Queued'}
                  </span>
                )}
              </div>
              {upload.error ? (
                <p className="text-xs text-red-400">{upload.error}</p>
              ) : upload.progress ? (
                <>
                  <div className={`w-full rounded-full h-1.5 ${isDark ? 'bg-dark-100' : 'bg-gray-200'}`}>
                    <div
                      className="bg-theme-primary h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${upload.progress.percent}%` }}
                    />
                  </div>
                  <p className={`text-xs mt-1 ${textMuted}`}>{upload.progress.detail}</p>
                </>
              ) : null}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
