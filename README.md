# qmd-gemini

[@tobi](https://github.com/tobi) built [qmd](https://github.com/tobi/qmd) — an incredible memory system for Clawdbot that gives your agent real search over your markdown files. BM25 keyword search, vector similarity, the whole deal. It's sick.

One catch: the original runs embeddings locally with node-llama-cpp, which means downloading a 1.3GB model and having a machine beefy enough to chew through it. If you're rocking a maxed-out setup, ride that wave. But for the rest of us on base-model MacBook Airs and budget Linux boxes — that's a no-go.

**qmd-gemini** swaps the local model for the Gemini API. Same great search, pennies a day, runs anywhere. No giant downloads, no GPU, no sweat.

Then we supercharged it with [@Ghatage](https://github.com/Ghatage)'s [Zeppelin](https://github.com/Ghatage/zeppelin) — an S3-native vector search engine that's crazy fast. Instead of stuffing vectors into SQLite, your embeddings live in a proper vector backend built for the job. Stateless nodes, object storage as the source of truth, IVF indexing. It rips.

## Features

- **BM25 search** (`qmd search`) — Fast keyword matching
- **Vector search** (`qmd vsearch`) — Semantic similarity via Gemini embeddings
- **Zeppelin backend** — High-performance vector search powered by [Zeppelin](https://github.com/Ghatage/zeppelin) by [@Ghatage](https://github.com/Ghatage), an S3-native vector search engine
- **No local models** — All embeddings via Gemini API
- **SQLite storage** — Portable, single-file index for documents and BM25

## Quick Start

```bash
# Clone
git clone https://github.com/mikeOnBreeze/qmd-gemini.git
cd qmd-gemini

# Install dependencies
bun install

# Set your Gemini API key
export GEMINI_API_KEY="your-api-key-here"

# Add a collection (your notes/memory folder)
./qmd collection add ~/path/to/your/notes --name my-notes --mask "**/*.md"

# Generate embeddings
./qmd embed

# Search!
./qmd search "exact keywords"      # BM25
./qmd vsearch "semantic query"     # Vector similarity
```

## Clawdbot Setup

### 1. Clone the repo

```bash
cd ~/openai-demo  # or your preferred location
git clone https://github.com/mikeOnBreeze/qmd-gemini.git
cd qmd-gemini
bun install
```

### 2. Get a Gemini API Key

Get one free at [Google AI Studio](https://aistudio.google.com/app/apikey).

Save it somewhere secure:
```bash
echo "your-api-key" > ~/KeyApis/GEMINI_API_KEY
```

### 3. Add your collections

Point qmd at your memory files:

```bash
export GEMINI_API_KEY=$(cat ~/KeyApis/GEMINI_API_KEY)

# Example: Clawdbot memory folder
./qmd collection add ~/openai-demo/clawdbot/memory --name clawdbot-memory --mask "**/*.md"

# Example: Root workspace files
./qmd collection add ~/openai-demo/clawdbot --name clawdbot-root --mask "*.md"

# Add context descriptions (helps with search)
./qmd context add qmd://clawdbot-memory "Daily notes, transcripts, todos, and session logs"
./qmd context add qmd://clawdbot-root "Core agent files: MEMORY.md, USER.md, TOOLS.md"
```

### 4. Generate embeddings

```bash
./qmd embed
```

This sends document chunks to Gemini API and stores vectors locally (~5 seconds for 50 docs).

### 5. Copy the skill to your Clawdbot

```bash
cp -r skills/qmd ~/openai-demo/clawdbot/skills/
```

### 6. Add to AGENTS.md

Add this to your `AGENTS.md` memory lookup section:

```markdown
### 🔍 Memory Lookup Protocol

Before saying "I don't know" or "I don't have context on that":

1. **Current context** — Is it in this conversation? (free, check first)
2. **qmd search** — BM25 keyword search (exact names, dates, terms)
3. **qmd vsearch** — Vector similarity search (semantic/fuzzy queries)
4. **memory_search** — Fallback if qmd misses

**See `skills/qmd/SKILL.md` for setup and usage.** Uses qmd-gemini fork with Gemini API.
```

### 7. Set up nightly cron

Add a cron job to re-index and embed new files nightly:

```bash
# Via Clawdbot CLI
clawdbot cron add --name "qmd-nightly-embed" \
  --schedule "0 2 * * *" \
  --tz "America/Los_Angeles" \
  --text "🔄 QMD NIGHTLY EMBED

Re-index and embed any new memory files:

\`\`\`bash
cd ~/openai-demo/qmd-gemini
export GEMINI_API_KEY=\$(cat ~/KeyApis/GEMINI_API_KEY)
./qmd update
./qmd embed
./qmd status
\`\`\`

Reply HEARTBEAT_OK when done."
```

Or add manually via the Clawdbot dashboard.

## Commands

```bash
# Search
./qmd search "keywords"              # BM25 keyword search
./qmd vsearch "semantic query"       # Vector similarity
./qmd search "query" -n 10           # More results
./qmd search "query" -c my-notes     # Filter by collection

# Documents
./qmd get "path/to/file.md"          # Get full document
./qmd get "#docid"                   # Get by document ID
./qmd get "file.md:50" -l 100        # Get from line 50, max 100 lines

# Maintenance
./qmd status                         # Check index status
./qmd update                         # Re-index collections
./qmd embed                          # Generate/update embeddings
./qmd collection list                # List collections
```

## How It Works

1. **Indexing:** `qmd collection add` indexes markdown files into SQLite
2. **Embedding:** `qmd embed` chunks documents (~800 tokens), sends to Gemini API, stores vectors in [Zeppelin](https://github.com/Ghatage/zeppelin)
3. **BM25 Search:** `qmd search` does fast keyword matching (no API call)
4. **Vector Search:** `qmd vsearch` embeds your query via Gemini, searches nearest neighbors via Zeppelin

Vector search requires `GEMINI_API_KEY` at search time (to embed the query).

### Zeppelin

Vector storage and similarity search is powered by [Zeppelin](https://github.com/Ghatage/zeppelin) by [@Ghatage](https://github.com/Ghatage) — a fully open-source, S3-native vector search engine. Nodes are stateless and object storage is the source of truth, which makes it lightweight and easy to run locally or at scale.

Zeppelin is a standalone server — you can run it however you want (binary, Docker, on a remote box, etc.). Just point qmd at it:

```bash
# Set the Zeppelin URL (default: http://localhost:8080)
export ZEPPELIN_URL=http://localhost:8080

# Embed and search with Zeppelin
./qmd embed --store zeppelin
./qmd vsearch "my query" --store zeppelin
```

You can fall back to local sqlite-vec storage with `--store sqlite` if needed (the default when no Zeppelin server is available).

## Requirements

- [Bun](https://bun.sh/) runtime
- Gemini API key (free tier works fine)
- [Zeppelin](https://github.com/Ghatage/zeppelin) server for vector search (optional — falls back to sqlite-vec)

## Acknowledgments

- [Zeppelin](https://github.com/Ghatage/zeppelin) by [@Ghatage](https://github.com/Ghatage) — the S3-native vector search engine that powers qmd-gemini's vector storage and similarity search
- [qmd](https://github.com/tobi/qmd) by [@tobi](https://github.com/tobi) — the original project this is forked from

## License

MIT
