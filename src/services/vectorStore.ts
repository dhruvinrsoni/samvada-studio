import { openDB, type IDBPDatabase } from 'idb';
import type { RAGCollection, RAGDocument, RAGChunk, RAGSearchResult } from '../types';

const DB_NAME = 'samvada-rag';
const DB_VERSION = 1;

let dbPromise: Promise<IDBPDatabase> | null = null;

function getDB(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('collections')) {
          db.createObjectStore('collections', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('documents')) {
          const docs = db.createObjectStore('documents', { keyPath: 'id' });
          docs.createIndex('byCollection', 'collectionId');
        }
        if (!db.objectStoreNames.contains('chunks')) {
          const chunks = db.createObjectStore('chunks', { keyPath: 'id' });
          chunks.createIndex('byCollection', 'collectionId');
          chunks.createIndex('byDocument', 'documentId');
        }
      },
    });
  }
  return dbPromise;
}

// ── Collections ──

export async function saveCollection(collection: RAGCollection): Promise<void> {
  const db = await getDB();
  await db.put('collections', collection);
}

export async function getCollection(id: string): Promise<RAGCollection | undefined> {
  const db = await getDB();
  return db.get('collections', id);
}

export async function getAllCollections(): Promise<RAGCollection[]> {
  const db = await getDB();
  return db.getAll('collections');
}

export async function deleteCollection(id: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['collections', 'documents', 'chunks'], 'readwrite');

  const chunkIndex = tx.objectStore('chunks').index('byCollection');
  let chunkCursor = await chunkIndex.openCursor(id);
  while (chunkCursor) {
    await chunkCursor.delete();
    chunkCursor = await chunkCursor.continue();
  }

  const docIndex = tx.objectStore('documents').index('byCollection');
  let docCursor = await docIndex.openCursor(id);
  while (docCursor) {
    await docCursor.delete();
    docCursor = await docCursor.continue();
  }

  await tx.objectStore('collections').delete(id);
  await tx.done;
}

// ── Documents ──

export async function saveDocument(doc: RAGDocument): Promise<void> {
  const db = await getDB();
  await db.put('documents', doc);
}

export async function getDocumentsByCollection(collectionId: string): Promise<RAGDocument[]> {
  const db = await getDB();
  return db.getAllFromIndex('documents', 'byCollection', collectionId);
}

export async function deleteDocument(docId: string): Promise<void> {
  const db = await getDB();
  const tx = db.transaction(['documents', 'chunks'], 'readwrite');

  const chunkIndex = tx.objectStore('chunks').index('byDocument');
  let cursor = await chunkIndex.openCursor(docId);
  while (cursor) {
    await cursor.delete();
    cursor = await cursor.continue();
  }

  await tx.objectStore('documents').delete(docId);
  await tx.done;
}

// ── Chunks ──

export async function addChunks(chunks: RAGChunk[]): Promise<void> {
  const db = await getDB();
  const tx = db.transaction('chunks', 'readwrite');
  for (const chunk of chunks) {
    await tx.store.put(chunk);
  }
  await tx.done;
}

export async function getChunksByCollection(collectionId: string): Promise<RAGChunk[]> {
  const db = await getDB();
  return db.getAllFromIndex('chunks', 'byCollection', collectionId);
}

export async function getChunksByDocument(documentId: string): Promise<RAGChunk[]> {
  const db = await getDB();
  return db.getAllFromIndex('chunks', 'byDocument', documentId);
}

// ── Vector Search ──

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0;
  let magA = 0;
  let magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i]! * b[i]!;
    magA += a[i]! * a[i]!;
    magB += b[i]! * b[i]!;
  }
  const denom = Math.sqrt(magA) * Math.sqrt(magB);
  return denom === 0 ? 0 : dot / denom;
}

export async function searchByVector(
  collectionId: string,
  queryVector: number[],
  topK: number,
  threshold: number,
): Promise<RAGSearchResult[]> {
  const chunks = await getChunksByCollection(collectionId);

  const scored: RAGSearchResult[] = [];
  for (const chunk of chunks) {
    const score = cosineSimilarity(queryVector, chunk.vector);
    if (score >= threshold) {
      scored.push({ chunk, score });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, topK);
}

// ── Stats ──

export async function getCollectionStats(collectionId: string): Promise<{ docCount: number; chunkCount: number }> {
  const db = await getDB();
  const docs = await db.countFromIndex('documents', 'byCollection', collectionId);
  const chunks = await db.countFromIndex('chunks', 'byCollection', collectionId);
  return { docCount: docs, chunkCount: chunks };
}
