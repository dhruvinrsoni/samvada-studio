import { v4 as uuidv4 } from 'uuid';
import { parseDocument, cleanMarkdownForEmbedding } from './documentParser';
import { chunkText } from './textChunker';
import { createEmbeddingProvider } from './embeddingService';
import * as vectorStore from './vectorStore';
import type {
  RAGCollection,
  RAGDocument,
  RAGChunk,
  RAGSettings,
  RAGSearchResult,
} from '../types';

// Re-export defaults for convenience
export { DEFAULT_RAG_SETTINGS } from '../types';

export type IngestStage = 'parsing' | 'chunking' | 'embedding' | 'storing' | 'done';

export interface IngestProgress {
  stage: IngestStage;
  detail: string;
  percent: number;
}

// ── Collection Management ──

export async function createCollection(
  name: string,
  description: string,
  settings: RAGSettings,
): Promise<RAGCollection> {
  const provider = createEmbeddingProvider(
    settings.embeddingProvider,
    settings.embeddingModel,
  );
  const dims = await provider.getDimensions();

  const collection: RAGCollection = {
    id: uuidv4(),
    name,
    description,
    embeddingModel: settings.embeddingModel,
    embeddingProvider: settings.embeddingProvider,
    vectorDimensions: dims,
    documentCount: 0,
    chunkCount: 0,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await vectorStore.saveCollection(collection);
  return collection;
}

export async function getCollections(): Promise<RAGCollection[]> {
  return vectorStore.getAllCollections();
}

export async function getCollection(id: string): Promise<RAGCollection | undefined> {
  return vectorStore.getCollection(id);
}

export async function removeCollection(id: string): Promise<void> {
  await vectorStore.deleteCollection(id);
}

export async function getDocuments(collectionId: string): Promise<RAGDocument[]> {
  return vectorStore.getDocumentsByCollection(collectionId);
}

// ── Document Ingestion ──

const EMBED_BATCH_SIZE = 32;

export async function ingestDocument(
  file: File,
  collectionId: string,
  settings: RAGSettings,
  onProgress?: (progress: IngestProgress) => void,
): Promise<RAGDocument> {
  const collection = await vectorStore.getCollection(collectionId);
  if (!collection) throw new Error('Collection not found');

  const provider = createEmbeddingProvider(
    collection.embeddingProvider,
    collection.embeddingModel,
  );

  // 1. Parse
  onProgress?.({ stage: 'parsing', detail: `Parsing ${file.name}...`, percent: 5 });
  const parsed = await parseDocument(file);

  if (!parsed.text.trim()) {
    throw new Error(`No text could be extracted from ${file.name}`);
  }

  // 1b. Clean markdown to strip URLs/badges so embeddings focus on prose
  const isMarkdown = /\.(md|markdown)$/i.test(file.name);
  const cleanedText = isMarkdown ? cleanMarkdownForEmbedding(parsed.text) : parsed.text;

  if (!cleanedText.trim()) {
    throw new Error(`No meaningful text after cleaning ${file.name}`);
  }

  // 2. Chunk
  onProgress?.({ stage: 'chunking', detail: 'Splitting into chunks...', percent: 20 });
  const textChunks = chunkText(
    cleanedText,
    { chunkSize: settings.chunkSize, chunkOverlap: settings.chunkOverlap },
    isMarkdown,
  );

  if (textChunks.length === 0) {
    throw new Error('Document produced no chunks');
  }

  // 3. Embed (in batches)
  onProgress?.({ stage: 'embedding', detail: `Embedding ${textChunks.length} chunks...`, percent: 30 });
  const docId = uuidv4();
  const allVectors: number[][] = [];

  for (let i = 0; i < textChunks.length; i += EMBED_BATCH_SIZE) {
    const batch = textChunks.slice(i, i + EMBED_BATCH_SIZE);
    const vectors = await provider.embed(batch.map((c) => c.text));
    allVectors.push(...vectors);

    const pct = 30 + Math.round(((i + batch.length) / textChunks.length) * 50);
    onProgress?.({
      stage: 'embedding',
      detail: `Embedded ${Math.min(i + batch.length, textChunks.length)}/${textChunks.length} chunks`,
      percent: pct,
    });
  }

  // 4. Store
  onProgress?.({ stage: 'storing', detail: 'Saving to database...', percent: 85 });
  const chunks: RAGChunk[] = textChunks.map((tc, i) => ({
    id: uuidv4(),
    documentId: docId,
    collectionId,
    text: tc.text,
    vector: allVectors[i]!,
    chunkIndex: tc.index,
    metadata: {
      heading: tc.metadata.heading,
      startOffset: tc.metadata.startOffset,
      source: file.name,
    },
  }));

  await vectorStore.addChunks(chunks);

  const doc: RAGDocument = {
    id: docId,
    collectionId,
    name: file.name,
    fileType: file.name.split('.').pop()?.toLowerCase() ?? 'txt',
    size: file.size,
    chunkCount: chunks.length,
    createdAt: new Date().toISOString(),
  };

  await vectorStore.saveDocument(doc);

  // Update collection stats
  const stats = await vectorStore.getCollectionStats(collectionId);
  collection.documentCount = stats.docCount;
  collection.chunkCount = stats.chunkCount;
  collection.updatedAt = new Date().toISOString();
  await vectorStore.saveCollection(collection);

  onProgress?.({ stage: 'done', detail: `Added ${chunks.length} chunks from ${file.name}`, percent: 100 });
  return doc;
}

export async function removeDocument(docId: string, collectionId: string): Promise<void> {
  await vectorStore.deleteDocument(docId);

  const collection = await vectorStore.getCollection(collectionId);
  if (collection) {
    const stats = await vectorStore.getCollectionStats(collectionId);
    collection.documentCount = stats.docCount;
    collection.chunkCount = stats.chunkCount;
    collection.updatedAt = new Date().toISOString();
    await vectorStore.saveCollection(collection);
  }
}

// ── Query / Retrieval ──

export async function queryCollection(
  query: string,
  collectionId: string,
  settings: RAGSettings,
): Promise<RAGSearchResult[]> {
  const collection = await vectorStore.getCollection(collectionId);
  if (!collection) throw new Error('Collection not found');

  const provider = createEmbeddingProvider(
    collection.embeddingProvider,
    collection.embeddingModel,
  );

  const [queryVector] = await provider.embed([query]);
  if (!queryVector) throw new Error('Failed to embed query');

  return vectorStore.searchByVector(
    collectionId,
    queryVector,
    settings.topK,
    settings.similarityThreshold,
  );
}

export async function queryMultipleCollections(
  query: string,
  collectionIds: string[],
  settings: RAGSettings,
): Promise<{ results: RAGSearchResult[]; errors: string[] }> {
  const allResults: RAGSearchResult[] = [];
  const errors: string[] = [];

  for (const cid of collectionIds) {
    try {
      const results = await queryCollection(query, cid, settings);
      allResults.push(...results);
    } catch (err: any) {
      errors.push(err.message ?? String(err));
    }
  }

  allResults.sort((a, b) => b.score - a.score);
  return { results: allResults.slice(0, settings.topK), errors };
}

// ── Formatting ──

export function formatRAGContext(
  results: RAGSearchResult[],
  template: string,
): string {
  if (results.length === 0) return '';

  const contextBlocks = results.map((r, i) => {
    const src = r.chunk.metadata.source;
    const heading = r.chunk.metadata.heading ? ` -- section: ${r.chunk.metadata.heading}` : '';
    return `--- Source ${i + 1}: ${src}${heading} ---\n${r.chunk.text}`;
  });

  const context = contextBlocks.join('\n\n');
  return template.replace('{context}', context);
}
