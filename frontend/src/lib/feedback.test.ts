import { describe, it, expect } from 'vitest';
import {
  buildRuleFeedback,
  buildChoiceFeedback,
  buildReorderFeedback,
} from './feedback';

const choiceOptions = [
  { id: 'A', text: '选项A' },
  { id: 'B', text: '选项B' },
  { id: 'C', text: '选项C' },
  { id: 'D', text: '选项D' },
];

const reorderChunks = [
  { id: 'a', text: 'The research' },
  { id: 'b', text: 'was conducted' },
  { id: 'c', text: 'by scientists' },
];

describe('buildChoiceFeedback', () => {
  it('correct on attempt 1 → no reveal, no where', () => {
    const fb = buildChoiceFeedback(
      { cardType: 'choice', selectedOptionId: 'D', correctOptionId: 'D', options: choiceOptions },
      1,
    );
    expect(fb.correct).toBe(true);
    expect(fb.revealAnswer).toBe(false);
    expect(fb.where).toEqual([]);
    expect(fb.correctAnswerText).toBe('');
  });

  it('wrong on attempt 1 → hint (no reveal), marks only selected option', () => {
    const fb = buildChoiceFeedback(
      { cardType: 'choice', selectedOptionId: 'A', correctOptionId: 'D', options: choiceOptions },
      1,
    );
    expect(fb.correct).toBe(false);
    expect(fb.revealAnswer).toBe(false);
    expect(fb.where).toHaveLength(1);
    expect(fb.where[0].id).toBe('A');
    expect(fb.correctAnswerText).toBe('');
  });

  it('wrong on attempt 2 → reveal, shows correct answer', () => {
    const fb = buildChoiceFeedback(
      { cardType: 'choice', selectedOptionId: 'A', correctOptionId: 'D', options: choiceOptions },
      2,
    );
    expect(fb.correct).toBe(false);
    expect(fb.revealAnswer).toBe(true);
    expect(fb.correctAnswerText).toBe('选项D');
    expect(fb.where.some((w) => w.id === 'D')).toBe(true);
  });
});

describe('buildReorderFeedback', () => {
  it('correct order → correct', () => {
    const fb = buildReorderFeedback(
      { cardType: 'reorder', orderedChunkIds: ['a', 'b', 'c'], correctOrder: ['a', 'b', 'c'], chunks: reorderChunks },
      1,
    );
    expect(fb.correct).toBe(true);
  });

  it('wrong attempt 1 → hint, first mismatch index', () => {
    const fb = buildReorderFeedback(
      { cardType: 'reorder', orderedChunkIds: ['b', 'a', 'c'], correctOrder: ['a', 'b', 'c'], chunks: reorderChunks },
      1,
    );
    expect(fb.correct).toBe(false);
    expect(fb.revealAnswer).toBe(false);
    expect(fb.where[0].index).toBe(0);
    expect(fb.where[0].message).toContain('第 1 个');
  });

  it('wrong attempt 2 → reveal with correct joined sentence', () => {
    const fb = buildReorderFeedback(
      { cardType: 'reorder', orderedChunkIds: ['c', 'b', 'a'], correctOrder: ['a', 'b', 'c'], chunks: reorderChunks },
      2,
    );
    expect(fb.revealAnswer).toBe(true);
    expect(fb.correctAnswerText).toBe('The research was conducted by scientists');
  });
});

describe('buildRuleFeedback dimension mapping', () => {
  it('choice → sentence + reading', () => {
    const fb = buildRuleFeedback(
      { cardType: 'choice', selectedOptionId: 'D', correctOptionId: 'D', options: choiceOptions },
      1,
    );
    expect(fb.dimensions).toEqual(['sentence', 'reading']);
  });

  it('reorder → sentence', () => {
    const fb = buildRuleFeedback(
      { cardType: 'reorder', orderedChunkIds: ['a', 'b', 'c'], correctOrder: ['a', 'b', 'c'], chunks: reorderChunks },
      1,
    );
    expect(fb.dimensions).toEqual(['sentence']);
  });
});

describe('buildChoiceFeedback variant-aware explanation', () => {
  it('cloze uses word-choice explanation, not reading', () => {
    const fb = buildChoiceFeedback(
      { cardType: 'choice', selectedOptionId: 'B', correctOptionId: 'A', options: choiceOptions, presentationVariant: 'cloze' },
      1,
    );
    expect(fb.correct).toBe(false);
    expect(fb.why).toContain('词性');
  });

  it('translation uses translation explanation', () => {
    const fb = buildChoiceFeedback(
      { cardType: 'choice', selectedOptionId: 'B', correctOptionId: 'A', options: choiceOptions, presentationVariant: 'translation' },
      1,
    );
    expect(fb.why).toContain('中文');
  });
});

describe('retry succeeds on second attempt', () => {
  it('second-attempt correct → correct true, no reveal', () => {
    const fb = buildChoiceFeedback(
      { cardType: 'choice', selectedOptionId: 'D', correctOptionId: 'D', options: choiceOptions },
      2,
    );
    expect(fb.correct).toBe(true);
    expect(fb.revealAnswer).toBe(false);
  });
});
