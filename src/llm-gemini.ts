/**
 * llm-gemini.ts - Google Gemini embedding provider for QMD
 *
 * Uses the @google/genai SDK (GA May 2025) with gemini-embedding-001 model.
 * Provides embeddings as an alternative to local GGUF models.
 */

import { GoogleGenAI } from "@google/genai";

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_MODEL = "gemini-embedding-001";
const DEFAULT_DIMENSIONS = 768; // Reduced from 3072 for efficiency

// Task types for embedding - affects how the model optimizes the embedding
type TaskType = "RETRIEVAL_DOCUMENT" | "RETRIEVAL_QUERY";

// =============================================================================
// Types (matching llm.ts interface where applicable)
// =============================================================================

export type GeminiEmbedOptions = {
  model?: string;
  dimensions?: number;
  isQuery?: boolean;
  title?: string;
};

export type EmbeddingResult = {
  embedding: number[];
  model: string;
};

// =============================================================================
// GeminiEmbedder Class
// =============================================================================

export class GeminiEmbedder {
  private ai: GoogleGenAI;
  private model: string;
  private dimensions: number;

  constructor(apiKey: string, options: { model?: string; dimensions?: number } = {}) {
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is required for GeminiEmbedder");
    }

    this.ai = new GoogleGenAI({ apiKey });
    this.model = options.model || DEFAULT_MODEL;
    this.dimensions = options.dimensions || DEFAULT_DIMENSIONS;
  }

  /**
   * Get the configured dimensions for this embedder.
   * Useful for ensuring vector storage matches.
   */
  getDimensions(): number {
    return this.dimensions;
  }

  /**
   * Get the model name.
   */
  getModel(): string {
    return this.model;
  }

  /**
   * Embed a single text.
   *
   * @param text - Text to embed
   * @param isQuery - If true, use RETRIEVAL_QUERY task type (optimized for queries)
   *                  If false, use RETRIEVAL_DOCUMENT task type (optimized for documents)
   */
  async embed(text: string, isQuery = false): Promise<EmbeddingResult | null> {
    try {
      const taskType: TaskType = isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";

      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: [{ text }],
        config: {
          taskType,
          outputDimensionality: this.dimensions,
        },
      });

      if (!response.embeddings || response.embeddings.length === 0) {
        console.error("Gemini API returned no embeddings");
        return null;
      }

      const values = response.embeddings[0]?.values;
      if (!values) {
        console.error("Gemini API returned empty embedding values");
        return null;
      }

      return {
        embedding: values,
        model: this.model,
      };
    } catch (error) {
      console.error("Gemini embedding error:", error);
      return null;
    }
  }

  /**
   * Batch embed multiple texts.
   * Gemini supports batch embedding via array of contents.
   *
   * @param texts - Array of texts to embed
   * @param isQuery - Task type for all texts (usually false for batch document embedding)
   */
  async embedBatch(texts: string[], isQuery = false): Promise<(EmbeddingResult | null)[]> {
    if (texts.length === 0) return [];

    try {
      const taskType: TaskType = isQuery ? "RETRIEVAL_QUERY" : "RETRIEVAL_DOCUMENT";

      // Gemini supports batch embedding with multiple content items
      const response = await this.ai.models.embedContent({
        model: this.model,
        contents: texts.map((text) => ({ text })),
        config: {
          taskType,
          outputDimensionality: this.dimensions,
        },
      });

      if (!response.embeddings) {
        console.error("Gemini API returned no embeddings for batch");
        return texts.map(() => null);
      }

      return response.embeddings.map((emb) => {
        if (!emb?.values) return null;
        return {
          embedding: emb.values,
          model: this.model,
        };
      });
    } catch (error) {
      console.error("Gemini batch embedding error:", error);
      return texts.map(() => null);
    }
  }
}

// =============================================================================
// Factory function
// =============================================================================

/**
 * Create a GeminiEmbedder from environment variable.
 * Throws if GEMINI_API_KEY is not set.
 */
export function createGeminiEmbedder(options: { model?: string; dimensions?: number } = {}): GeminiEmbedder {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GEMINI_API_KEY environment variable is required.\n" +
        "Set it with: export GEMINI_API_KEY=your-api-key"
    );
  }
  return new GeminiEmbedder(apiKey, options);
}

// =============================================================================
// Default instance (lazy initialization)
// =============================================================================

let defaultGeminiEmbedder: GeminiEmbedder | null = null;

/**
 * Get the default GeminiEmbedder instance.
 * Creates one if it doesn't exist.
 */
export function getDefaultGeminiEmbedder(): GeminiEmbedder {
  if (!defaultGeminiEmbedder) {
    defaultGeminiEmbedder = createGeminiEmbedder();
  }
  return defaultGeminiEmbedder;
}

/**
 * Reset the default embedder (useful for testing).
 */
export function resetDefaultGeminiEmbedder(): void {
  defaultGeminiEmbedder = null;
}

// =============================================================================
// Exports
// =============================================================================

export { DEFAULT_MODEL as GEMINI_DEFAULT_MODEL, DEFAULT_DIMENSIONS as GEMINI_DEFAULT_DIMENSIONS };
