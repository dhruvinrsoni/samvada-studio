import { v4 as uuidv4 } from 'uuid';
import { parseDocument, cleanMarkdownForEmbedding } from './documentParser';
import { chunkText, chunkTextParentChild } from './textChunker';
import { createEmbeddingProvider, rerank } from './embeddingService';
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
  const useParentChild = (settings.chunkingStrategy ?? 'fixed') === 'parent-child';
  const textChunks = useParentChild
    ? chunkTextParentChild(
        cleanedText,
        {
          chunkSize: settings.chunkSize,
          chunkOverlap: settings.chunkOverlap,
          childChunkSize: settings.childChunkSize ?? 256,
        },
        isMarkdown,
      )
    : chunkText(
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
      parentText: tc.metadata.parentText,
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

const FIRST_PASS_K = 30;

export async function queryCollection(
  query: string,
  collectionId: string,
  settings: RAGSettings,
): Promise<RAGSearchResult[]> {
  const collection = await vectorStore.getCollection(collectionId);
  if (!collection) throw new Error('Collection not found');

  const mode = settings.searchMode ?? 'hybrid';
  const chunks = await vectorStore.getChunksByCollection(collectionId);
  if (chunks.length === 0) return [];

  if (mode === 'keyword') {
    return vectorStore.searchByBM25(chunks, query, settings.topK);
  }

  const provider = createEmbeddingProvider(
    collection.embeddingProvider,
    collection.embeddingModel,
  );
  const [queryVector] = await provider.embed([query]);
  if (!queryVector) throw new Error('Failed to embed query');

  if (mode === 'vector') {
    return vectorStore.searchByVector(
      collectionId,
      queryVector,
      settings.topK,
      settings.similarityThreshold,
    );
  }

  // hybrid: run BM25 + vector in parallel, fuse with RRF
  const vectorResults = await vectorStore.searchByVector(
    collectionId,
    queryVector,
    FIRST_PASS_K,
    settings.similarityThreshold,
  );
  const bm25Results = vectorStore.searchByBM25(chunks, query, FIRST_PASS_K);

  const fused = vectorStore.reciprocalRankFusion(
    [vectorResults, bm25Results],
    settings.rerankEnabled ? FIRST_PASS_K : settings.topK,
  );

  if (settings.rerankEnabled && fused.length > 0) {
    return rerankResults(query, fused, settings);
  }

  return fused;
}

async function rerankResults(
  query: string,
  candidates: RAGSearchResult[],
  settings: RAGSettings,
): Promise<RAGSearchResult[]> {
  const passages = candidates.map((r) => r.chunk.text);
  const ranked = await rerank(query, passages, settings.rerankModel);

  return ranked
    .slice(0, settings.topK)
    .map(({ index, score }) => ({
      chunk: candidates[index]!.chunk,
      score,
    }));
}

export type LLMCallerFn = (prompt: string, systemInstruction: string) => Promise<string>;

export async function queryMultipleCollections(
  query: string,
  collectionIds: string[],
  settings: RAGSettings,
  llmCaller?: LLMCallerFn,
): Promise<{ results: RAGSearchResult[]; errors: string[] }> {
  const errors: string[] = [];

  let queries = [query];
  if (settings.queryExpansionEnabled && llmCaller) {
    try {
      const expanded = await expandQueries(query, settings.queryExpansionMode, llmCaller);
      queries = [query, ...expanded];
    } catch (err: any) {
      errors.push(`Query expansion failed: ${err.message ?? String(err)}`);
    }
  }

  const perQueryResults: RAGSearchResult[][] = [];
  for (const q of queries) {
    const queryResults: RAGSearchResult[] = [];
    for (const cid of collectionIds) {
      try {
        const results = await queryCollection(q, cid, settings);
        queryResults.push(...results);
      } catch (err: any) {
        errors.push(err.message ?? String(err));
      }
    }
    perQueryResults.push(queryResults);
  }

  let finalResults: RAGSearchResult[];
  if (perQueryResults.length > 1) {
    finalResults = vectorStore.reciprocalRankFusion(perQueryResults, settings.topK);
  } else {
    const all = perQueryResults[0] ?? [];
    all.sort((a, b) => b.score - a.score);
    finalResults = all.slice(0, settings.topK);
  }

  return { results: finalResults, errors };
}

const MULTI_QUERY_SYSTEM = `You are a search query generator. Given a user question, generate 2-3 alternative phrasings that capture different semantic angles of the same intent. Output ONLY the alternative queries, one per line. Do not number them or add any explanation.`;

const HYDE_SYSTEM = `You are a helpful assistant. Given a user question, write a short paragraph (3-5 sentences) that would be a plausible answer to the question. Do not say "I don't know." Write as if you know the answer, even if you are guessing. Output ONLY the hypothetical answer paragraph.`;

async function expandQueries(
  query: string,
  mode: 'multi-query' | 'hyde',
  llmCaller: LLMCallerFn,
): Promise<string[]> {
  if (mode === 'hyde') {
    const hypothetical = await llmCaller(query, HYDE_SYSTEM);
    return hypothetical.trim() ? [hypothetical.trim()] : [];
  }

  const response = await llmCaller(query, MULTI_QUERY_SYSTEM);
  return response
    .split('\n')
    .map((l) => l.replace(/^\d+[.)]\s*/, '').trim())
    .filter((l) => l.length > 3 && l !== query);
}

// ── Formatting ──

export function formatRAGContext(
  results: RAGSearchResult[],
  template: string,
): string {
  if (results.length === 0) return '';

  const seen = new Set<string>();
  const grouped = new Map<string, { heading?: string; text: string }[]>();
  for (const r of results) {
    const src = r.chunk.metadata.source;
    const contextText = r.chunk.metadata.parentText ?? r.chunk.text;
    const dedupKey = `${src}::${contextText}`;
    if (seen.has(dedupKey)) continue;
    seen.add(dedupKey);

    if (!grouped.has(src)) grouped.set(src, []);
    grouped.get(src)!.push({
      heading: r.chunk.metadata.heading?.replace(/^#{1,6}\s+/, ''),
      text: contextText,
    });
  }

  const contextBlocks: string[] = [];
  for (const [filename, chunks] of grouped) {
    const sections = chunks.map((c) => {
      const hdr = c.heading ? `[Section: ${c.heading}]\n` : '';
      return `${hdr}${c.text}`;
    });
    contextBlocks.push(
      `=== File: ${filename} ===\n"""\n${sections.join('\n\n')}\n"""`,
    );
  }

  const context = contextBlocks.join('\n\n');
  return template.replace('{context}', context);
}
