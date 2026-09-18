import type { ReorderCardData, ChunkItem } from '../../types';

/**
 * Keep the first presentation deterministic so a demo recording can be
 * repeated. The list is still intentionally out of order: we rotate the
 * verified answer sequence by one position instead of using Math.random().
 */
export function buildDeterministicInitialOrder(data: Pick<ReorderCardData, 'chunks' | 'correctOrder'>): ChunkItem[] {
  const chunksById = new Map(data.chunks.map((chunk) => [chunk.id, chunk]));
  const ordered = data.correctOrder
    .map((chunkId) => chunksById.get(chunkId))
    .filter((chunk): chunk is ChunkItem => Boolean(chunk));

  // Fall back safely if content is incomplete or temporarily malformed.
  const completeOrder = ordered.length === data.chunks.length
    ? ordered
    : [...data.chunks];

  if (completeOrder.length < 2) return completeOrder;
  return [...completeOrder.slice(1), completeOrder[0]];
}
