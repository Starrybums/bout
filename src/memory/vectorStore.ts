/**
 * Vector store — PLACEHOLDER.
 *
 * Future home for embedding-based semantic search over news, journal entries,
 * and saved briefs (e.g. "find trades similar to this one" or "find news like
 * this headline"). Not wired up in the MVP — every method here is a stub that
 * falls back to simple keyword matching so the interface is stable for later.
 *
 * Swap-in plan (future):
 *   1. Add an embeddings call to modelRouter.ts (Claude/OpenAI/Ollama embeddings).
 *   2. Persist vectors alongside ids in SQLite (or a dedicated vector DB).
 *   3. Replace `keywordFallbackSearch` below with real cosine-similarity search.
 */

export interface VectorRecord {
  id: string;
  text: string;
  metadata?: Record<string, unknown>;
}

export interface VectorSearchResult {
  id: string;
  score: number;
  metadata?: Record<string, unknown>;
}

export class VectorStore {
  private records: VectorRecord[] = [];

  /** Stub — stores raw text only, no embeddings computed yet. */
  add(record: VectorRecord): void {
    this.records.push(record);
  }

  /**
   * Stub — naive keyword-overlap "search" until real embeddings are added.
   * Good enough to keep the CLI usable; not a substitute for real semantic search.
   */
  search(query: string, topK = 5): VectorSearchResult[] {
    return this.keywordFallbackSearch(query, topK);
  }

  private keywordFallbackSearch(query: string, topK: number): VectorSearchResult[] {
    const queryTokens = new Set(query.toLowerCase().split(/\W+/).filter(Boolean));
    const scored = this.records.map((record) => {
      const recordTokens = new Set(record.text.toLowerCase().split(/\W+/).filter(Boolean));
      let overlap = 0;
      for (const t of queryTokens) {
        if (recordTokens.has(t)) overlap += 1;
      }
      const score = queryTokens.size > 0 ? overlap / queryTokens.size : 0;
      return { id: record.id, score, metadata: record.metadata };
    });
    return scored.sort((a, b) => b.score - a.score).slice(0, topK);
  }
}
