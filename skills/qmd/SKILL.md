# qmd - Quick Markdown Search

Fast search for memory files and notes. Supports BM25 keyword search AND vector similarity via Gemini embeddings.

## ⚠️ IMPORTANT: Use qmd-gemini Fork

**DO NOT use the global `qmd` command.** Use the Gemini fork:

```bash
# Always run from the fork with GEMINI_API_KEY
cd ~/openai-demo/qmd-gemini
GEMINI_API_KEY=$(cat ~/KeyApis/Gemini_121725.txt | tr -d '\n\r') ./qmd <command>
```

**Why:** The fork uses Gemini API for embeddings. No local models. No accidental 1.3GB downloads that will kill the MacBook.

## When to Use

**Use `qmd search` (BM25) when:**
- Looking for specific names, dates, projects, or terms
- Keywords are likely in the text exactly
- Fast keyword matching

**Use `qmd vsearch` (vector) when:**
- Semantic/fuzzy queries ("conversations about changing our approach")
- Finding related content even if exact keywords don't match
- Questions phrased naturally

**Fall back to `memory_search` only if:**
- qmd returns nothing useful (rare)

## Collections

Two collections are indexed:
- `clawdbot-memory` — `memory/**/*.md` (daily notes, transcripts, todos)
- `clawdbot-root` — `*.md` in workspace root (MEMORY.md, USER.md, TOOLS.md, etc.)

## Commands

```bash
# Set the key (or inline it)
export GEMINI_API_KEY=$(cat ~/KeyApis/Gemini_121725.txt | tr -d '\n\r')
cd ~/openai-demo/qmd-gemini

# BM25 keyword search
./qmd search "query"
./qmd search "query" -c clawdbot-memory -n 10

# Vector similarity search (uses Gemini embeddings)
./qmd vsearch "query"
./qmd vsearch "what clients does mike work with" -n 5

# Get full document by path or docid
./qmd get "memory/2026-02-06.md"
./qmd get "#abc123"
./qmd get "memory/2026-02-06.md:50" -l 100
```

## Initial Setup (One-Time)

If embeddings haven't been generated yet:

```bash
cd ~/openai-demo/qmd-gemini
GEMINI_API_KEY=$(cat ~/KeyApis/Gemini_121725.txt | tr -d '\n\r') ./qmd embed
```

This embeds all documents via Gemini API (~5 seconds for 50 docs). Run `qmd status` to check.

## How It Works

1. **`qmd embed`** — Chunks documents, generates embeddings via Gemini API (gemini-embedding-001)
2. **`qmd vsearch`** — Embeds your query via Gemini, does vector similarity, returns top N results
3. **No local LLM** — No query expansion, no reranking, no model downloads
4. **You rank results** — Returns top matches, you (the LLM) rank them with context

## Output

Results show:
- File path and line number
- Document ID (use with `qmd get #id`)
- Score (higher = better match)
- Snippet with context

## Examples

```bash
# Find references to a person
./qmd search "Corey Hammond"

# Semantic search for client work
./qmd vsearch "OnBreeze clients and projects"

# Find decisions or preferences
./qmd vsearch "what does mike prefer for design"

# Search today's activity
./qmd search "2026-02-06" -c clawdbot-memory
```

## Index Maintenance

```bash
# Re-index all collections (after adding new files)
./qmd update

# Re-generate embeddings (if needed)
./qmd embed

# Check status
./qmd status
```

## Key Points

- **Always use `~/openai-demo/qmd-gemini`** — not the global qmd
- **Always set GEMINI_API_KEY** — from `~/KeyApis/Gemini_121725.txt`
- **No local models** — Gemini API only, no downloads
- **vsearch > memory_search** — faster, better results for most queries
