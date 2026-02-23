/**
 * llm.ts - Type definitions and formatting functions for QMD embeddings
 *
 * Previously contained node-llama-cpp local model support. Now QMD uses
 * Gemini API exclusively for embeddings (via llm-gemini.ts).
 */

// =============================================================================
// Embedding Formatting Functions
// =============================================================================

/**
 * Format a query for embedding.
 * Uses nomic-style task prefix format.
 */
export function formatQueryForEmbedding(query: string): string {
  return `task: search result | query: ${query}`;
}

/**
 * Format a document for embedding.
 * Uses nomic-style format with title and text fields.
 */
export function formatDocForEmbedding(text: string, title?: string): string {
  return `title: ${title || "none"} | text: ${text}`;
}

// =============================================================================
// Types
// =============================================================================

/**
 * Embedding result
 */
export type EmbeddingResult = {
  embedding: number[];
  model: string;
};

/**
 * Rerank result for a single document
 */
export type RerankDocumentResult = {
  file: string;
  score: number;
  index: number;
};

/**
 * Document to rerank
 */
export type RerankDocument = {
  file: string;
  text: string;
  title?: string;
};
