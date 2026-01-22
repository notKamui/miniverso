# Miniverso

## Environment Configuration

The production Bun server (`serve.ts`) supports several environment variables to control static asset preloading, caching, and optimization features.

### Core

- `PORT` (number, default: `3000`)
  Port the Bun server listens on.

- `DATABASE_URL` (string, required)
  Postgres connection string used for Drizzle migrations and runtime queries.

### Static Asset Preloading

The server can preload smaller static assets into memory for faster responses while serving larger or filtered assets directly from disk on-demand.

- `STATIC_PRELOAD_MAX_BYTES` (number, default: `5242880` / 5MB)
  Maximum file size (in bytes) eligible for in-memory preloading. Files larger than this are served on-demand.

- `STATIC_PRELOAD_INCLUDE` (string, optional)
  Comma-separated list of glob patterns (matched against file names, not full paths). If provided, ONLY matching files are considered for preloading.
  Example: `STATIC_PRELOAD_INCLUDE="*.js,*.css,*.woff2"`

- `STATIC_PRELOAD_EXCLUDE` (string, optional)
  Comma-separated list of glob patterns (matched against file names) to always exclude from preloading. Evaluated after includes.
  Example: `STATIC_PRELOAD_EXCLUDE="*.map,*.txt"`

- `STATIC_PRELOAD_VERBOSE` (boolean, default: `false`)
  When `true`, prints a detailed per-file report including why files were skipped.

### Optional Optimizations

- `STATIC_PRELOAD_ETAG` (boolean, default: `true`)
  When enabled, preloaded assets are served with an `ETag` header and conditional requests using `If-None-Match` can return `304 Not Modified`.

- `STATIC_PRELOAD_GZIP` (boolean, default: `true`)
  Pre-compresses eligible preloaded assets with gzip. Served automatically when the client includes `Accept-Encoding: gzip`.

- `STATIC_PRELOAD_GZIP_MIN_BYTES` (number, default: `1024`)
  Minimum uncompressed size (in bytes) for a file to be considered for precompression. Avoids wasting CPU on tiny files.

- `STATIC_PRELOAD_GZIP_TYPES` (string, default: `text/,application/javascript,application/json,application/xml,image/svg+xml`)
  Comma-separated list of MIME types or type prefixes ending with `/` that are eligible for gzip precompression. Example adds Markdown: `STATIC_PRELOAD_GZIP_TYPES="text/,application/javascript,application/json,application/xml,image/svg+xml,text/markdown"`.

### How It Works (Summary)

1. Files in `dist/client` are scanned using `Bun.Glob` with the composite include patterns (if any).
2. Each file is filtered by include/exclude lists.
3. If within `STATIC_PRELOAD_MAX_BYTES`, it's loaded into memory (and optionally gzipped + ETagged).
4. Larger or filtered files get lightweight on-demand route handlers that stream from disk.
5. Immutable caching headers (`max-age=31536000, immutable`) are applied to preloaded assets. On-demand assets use a shorter cache (`max-age=3600`).

### Quick Start Example

```bash
# Preload only JS/CSS/WOFF2 up to 2MB, enable verbose logging
PORT=3000 \
STATIC_PRELOAD_MAX_BYTES=2097152 \
STATIC_PRELOAD_INCLUDE="*.js,*.css,*.woff2" \
STATIC_PRELOAD_EXCLUDE="*.map" \
STATIC_PRELOAD_VERBOSE=true \
STATIC_PRELOAD_GZIP=true \
STATIC_PRELOAD_ETAG=true \
bun run serve.ts
```

See `.env.example` for an annotated list of available settings.
