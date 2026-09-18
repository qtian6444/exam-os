import { describe, expect, it } from 'vitest';
import { buildDeterministicInitialOrder } from './reorderOrder';
import { CardType, type ReorderCardData } from '../../types';

function reorderData(): ReorderCardData {
  return {
    cardId: 'reorder-demo',
    cardType: CardType.REORDER,
    chunks: [
      { id: 'a', text: '第一块' },
      { id: 'b', text: '第二块' },
      { id: 'c', text: '第三块' },
    ],
    correctOrder: ['a', 'b', 'c'],
  };
}

describe('buildDeterministicInitialOrder', () => {
  it('returns the same intentionally out-of-order presentation every time', () => {
    const data = reorderData();

    expect(buildDeterministicInitialOrder(data).map((chunk) => chunk.id)).toEqual(['b', 'c', 'a']);
    expect(buildDeterministicInitialOrder(data).map((chunk) => chunk.id)).toEqual(['b', 'c', 'a']);
  });

  it('keeps all chunks when source data is incomplete', () => {
    const data = { ...reorderData(), correctOrder: ['a', 'missing'] };

    expect(buildDeterministicInitialOrder(data).map((chunk) => chunk.id)).toEqual(['b', 'c', 'a']);
  });
});
