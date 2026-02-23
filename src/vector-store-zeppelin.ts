/**
 * vector-store-zeppelin.ts - Zeppelin vector search engine integration for QMD
 *
 * Provides vector storage and ANN search via a Zeppelin server as an alternative
 * to the default sqlite-vec backend. Zeppelin is an S3-native vector search engine
 * (https://github.com/Ghatage/zeppelin).
 *
 * Usage:
 *   - Set ZEPPELIN_URL env var (defaults to http://localhost:8080)
 *   - Use --store zeppelin with embed/vsearch commands
 *   - Requires a running Zeppelin server (docker compose up)
 */

// =============================================================================
// Types (subset of Zeppelin API types needed for QMD integration)
// =============================================================================

type AttributeValue = string | number | boolean | string[] | number[];
type Attributes = Record<string, AttributeValue>;

interface VectorEntry {
  id: string;
  values: number[];
  attributes?: Attributes;
}

interface ZeppelinSearchResult {
  id: string;
  score: number;
  attributes?: Attributes;
}

interface QueryResponse {
  results: ZeppelinSearchResult[];
  scanned_fragments: number;
  scanned_segments: number;
}

interface Namespace {
  name: string;
  dimensions: number;
  distance_metric: string;
  vector_count: number;
  created_at: string;
  updated_at: string;
}

type Filter =
  | { op: "eq"; field: string; value: AttributeValue }
  | { op: "and"; filters: Filter[] }
  | { op: "or"; filters: Filter[] };

// =============================================================================
// Configuration
// =============================================================================

const DEFAULT_ZEPPELIN_URL = "http://localhost:8080";
const DEFAULT_NAMESPACE = "qmd";
const UPSERT_BATCH_SIZE = 100; // Zeppelin handles batches well

// =============================================================================
// ZeppelinVectorStore
// =============================================================================

export class ZeppelinVectorStore {
  private baseUrl: string;
  private namespace: string;
  private timeout: number;

  constructor(options: { url?: string; namespace?: string; timeout?: number } = {}) {
    this.baseUrl = (options.url || process.env.ZEPPELIN_URL || DEFAULT_ZEPPELIN_URL).replace(/\/$/, "");
    this.namespace = options.namespace || DEFAULT_NAMESPACE;
    this.timeout = options.timeout || 30_000;
  }

  // -- Health --

  async isAvailable(): Promise<boolean> {
    try {
      const resp = await fetch(`${this.baseUrl}/healthz`, {
        signal: AbortSignal.timeout(5_000),
      });
      return resp.ok;
    } catch {
      return false;
    }
  }

  async ready(): Promise<{ status: string; s3_connected: boolean }> {
    return this.get("/readyz");
  }

  // -- Namespace --

  /**
   * Ensure the QMD namespace exists with the correct dimensions.
   * Creates it if missing, validates dimensions if it exists.
   */
  async ensureNamespace(dimensions: number): Promise<void> {
    try {
      const ns = await this.getNamespace();
      if (ns.dimensions !== dimensions) {
        throw new Error(
          `Zeppelin namespace "${this.namespace}" has ${ns.dimensions} dimensions ` +
          `but embeddings have ${dimensions}. Delete the namespace and re-embed, ` +
          `or use a different namespace name.`
        );
      }
    } catch (err: unknown) {
      if (err instanceof ZeppelinNotFoundError) {
        await this.createNamespace(dimensions);
      } else {
        throw err;
      }
    }
  }

  private async createNamespace(dimensions: number): Promise<Namespace> {
    return this.post("/v1/namespaces", {
      name: this.namespace,
      dimensions,
      distance_metric: "cosine",
    });
  }

  async getNamespace(): Promise<Namespace> {
    return this.get(`/v1/namespaces/${encodeURIComponent(this.namespace)}`);
  }

  async deleteNamespace(): Promise<void> {
    await this.request("DELETE", `/v1/namespaces/${encodeURIComponent(this.namespace)}`);
  }

  // -- Vector Operations --

  /**
   * Upsert a single embedding with document metadata as attributes.
   */
  async upsertEmbedding(
    hash: string,
    seq: number,
    pos: number,
    embedding: number[] | Float32Array,
    metadata: {
      collection?: string;
      path?: string;
      title?: string;
      model: string;
    }
  ): Promise<void> {
    const id = `${hash}_${seq}`;
    const values = embedding instanceof Float32Array ? Array.from(embedding) : embedding;

    const attributes: Attributes = {
      hash,
      seq,
      pos,
      model: metadata.model,
    };
    if (metadata.collection) attributes.collection = metadata.collection;
    if (metadata.path) attributes.path = metadata.path;
    if (metadata.title) attributes.title = metadata.title;

    await this.post(`/v1/namespaces/${encodeURIComponent(this.namespace)}/vectors`, {
      vectors: [{ id, values, attributes }],
    });
  }

  /**
   * Batch upsert embeddings. Chunks into batches of UPSERT_BATCH_SIZE.
   */
  async upsertEmbeddingBatch(
    entries: Array<{
      hash: string;
      seq: number;
      pos: number;
      embedding: number[] | Float32Array;
      collection?: string;
      path?: string;
      title?: string;
      model: string;
    }>
  ): Promise<number> {
    let total = 0;

    for (let i = 0; i < entries.length; i += UPSERT_BATCH_SIZE) {
      const batch = entries.slice(i, i + UPSERT_BATCH_SIZE);

      const vectors: VectorEntry[] = batch.map((entry) => {
        const values = entry.embedding instanceof Float32Array
          ? Array.from(entry.embedding)
          : entry.embedding;

        const attributes: Attributes = {
          hash: entry.hash,
          seq: entry.seq,
          pos: entry.pos,
          model: entry.model,
        };
        if (entry.collection) attributes.collection = entry.collection;
        if (entry.path) attributes.path = entry.path;
        if (entry.title) attributes.title = entry.title;

        return {
          id: `${entry.hash}_${entry.seq}`,
          values,
          attributes,
        };
      });

      const result = await this.post<{ upserted: number }>(
        `/v1/namespaces/${encodeURIComponent(this.namespace)}/vectors`,
        { vectors }
      );
      total += result.upserted;
    }

    return total;
  }

  /**
   * Delete all vectors for a given document hash (all chunks).
   */
  async deleteByHash(hash: string, maxSeq: number = 100): Promise<number> {
    const ids: string[] = [];
    for (let seq = 0; seq < maxSeq; seq++) {
      ids.push(`${hash}_${seq}`);
    }
    try {
      const result = await this.request<{ deleted: number }>(
        "DELETE",
        `/v1/namespaces/${encodeURIComponent(this.namespace)}/vectors`,
        { ids }
      );
      return result.deleted;
    } catch {
      return 0;
    }
  }

  // -- Search --

  /**
   * Vector similarity search. Returns results with document metadata.
   */
  async search(
    queryEmbedding: number[] | Float32Array,
    options: {
      topK?: number;
      collection?: string;
      consistency?: "strong" | "eventual";
    } = {}
  ): Promise<Array<{
    id: string;
    hash: string;
    seq: number;
    pos: number;
    score: number;
    collection?: string;
    path?: string;
    title?: string;
  }>> {
    const vector = queryEmbedding instanceof Float32Array
      ? Array.from(queryEmbedding)
      : queryEmbedding;

    const body: Record<string, unknown> = {
      vector,
      top_k: options.topK || 20,
    };

    // Filter by collection if specified
    if (options.collection) {
      body.filter = {
        op: "eq",
        field: "collection",
        value: options.collection,
      } satisfies Filter;
    }

    if (options.consistency) {
      body.consistency = options.consistency;
    }

    const response = await this.post<QueryResponse>(
      `/v1/namespaces/${encodeURIComponent(this.namespace)}/query`,
      body
    );

    return response.results.map((r) => ({
      id: r.id,
      hash: (r.attributes?.hash as string) || r.id.split("_")[0] || "",
      seq: (r.attributes?.seq as number) ?? 0,
      pos: (r.attributes?.pos as number) ?? 0,
      score: r.score,
      collection: r.attributes?.collection as string | undefined,
      path: r.attributes?.path as string | undefined,
      title: r.attributes?.title as string | undefined,
    }));
  }

  // -- Internal HTTP --

  private async get<T>(path: string): Promise<T> {
    return this.request("GET", path);
  }

  private async post<T>(path: string, body: unknown): Promise<T> {
    return this.request("POST", path, body);
  }

  private async request<T>(method: string, path: string, body?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const init: RequestInit = {
      method,
      headers: {
        ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(this.timeout),
    };

    const resp = await fetch(url, init);
    return this.handleResponse(resp);
  }

  private async handleResponse<T>(resp: Response): Promise<T> {
    if (resp.status < 300) {
      if (resp.status === 204) return undefined as T;
      const text = await resp.text();
      if (!text) return undefined as T;
      return JSON.parse(text) as T;
    }

    let message: string;
    try {
      const body = await resp.json();
      message = (body as { error?: string }).error ?? resp.statusText;
    } catch {
      message = resp.statusText;
    }

    const status = resp.status;
    if (status === 404) throw new ZeppelinNotFoundError(message);
    if (status === 409) throw new ZeppelinConflictError(message);
    if (status >= 500) throw new ZeppelinServerError(message, status);
    throw new ZeppelinError(message, status);
  }
}

// =============================================================================
// Error Classes
// =============================================================================

export class ZeppelinError extends Error {
  status: number;
  constructor(message: string, status: number = 0) {
    super(message);
    this.name = "ZeppelinError";
    this.status = status;
  }
}

export class ZeppelinNotFoundError extends ZeppelinError {
  constructor(message: string) {
    super(message, 404);
    this.name = "ZeppelinNotFoundError";
  }
}

export class ZeppelinConflictError extends ZeppelinError {
  constructor(message: string) {
    super(message, 409);
    this.name = "ZeppelinConflictError";
  }
}

export class ZeppelinServerError extends ZeppelinError {
  constructor(message: string, status: number) {
    super(message, status);
    this.name = "ZeppelinServerError";
  }
}

// =============================================================================
// Factory / Singleton
// =============================================================================

let defaultStore: ZeppelinVectorStore | null = null;

/**
 * Get the default Zeppelin vector store instance.
 * Configures from ZEPPELIN_URL and ZEPPELIN_NAMESPACE env vars.
 */
export function getZeppelinStore(): ZeppelinVectorStore {
  if (!defaultStore) {
    defaultStore = new ZeppelinVectorStore({
      url: process.env.ZEPPELIN_URL,
      namespace: process.env.ZEPPELIN_NAMESPACE,
    });
  }
  return defaultStore;
}

/**
 * Reset the default store (useful for testing).
 */
export function resetZeppelinStore(): void {
  defaultStore = null;
}
