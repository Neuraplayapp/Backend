// Preload lazy chunks so Vite/Rollup always emits them in dist even if only dynamically imported
// Add **all** lazily-loaded service modules here once. Keeps filenames predictable and prevents 404s in production.

export function preloadChunks(): void {
  // Fire-and-forget dynamic imports – we don’t await them, only hint bundler.
  import('./IntelligentSearchService');
  import('./CoreTools');
  // add future lazy modules below ↓
}
