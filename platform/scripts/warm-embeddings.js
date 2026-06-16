/**
 * Warm Embeddings
 *
 * Backfills embeddings for all active indexed_sites that do not yet have one.
 * Run manually or on a schedule after bulk crawls.
 */

const { warmEmbeddings } = require('../api/embeddings');

async function main() {
  console.log('Warming site embeddings...');
  const result = await warmEmbeddings();
  console.log(`Processed ${result.processed}/${result.total} sites without embeddings.`);
}

main().catch((err) => {
  console.error('warm-embeddings failed:', err);
  process.exit(1);
});
