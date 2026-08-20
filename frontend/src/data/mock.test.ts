import { describe, it, expect, beforeEach } from 'vitest';
import { getNextCard, getTotalCards, resetCardQueue } from './mock';
import { CardType } from '../types';

function readQueue() {
  resetCardQueue();
  const cards = [];
  let card;
  while ((card = getNextCard()) !== null) cards.push(card);
  resetCardQueue();
  return cards;
}

describe('default card queue (P0-LEARNING-INTERACTION-01)', () => {
  beforeEach(() => resetCardQueue());

  it('contains exactly 6 cards', () => {
    expect(readQueue().length).toBe(6);
    expect(getTotalCards()).toBe(6);
  });

  it('contains no reading_breakdown cards', () => {
    const cards = readQueue();
    expect(cards.some((c) => c.cardType === CardType.READING_BREAKDOWN)).toBe(false);
  });

  it('every card is submittable (has a valid correct answer)', () => {
    for (const card of readQueue()) {
      if (card.cardType === CardType.CHOICE) {
        expect(card.correctOptionId).toBeTruthy();
        expect(card.options.some((o) => o.id === card.correctOptionId)).toBe(true);
      } else if (card.cardType === CardType.REORDER) {
        expect(card.correctOrder.length).toBe(card.chunks.length);
      }
    }
  });

  it('has at least three distinct presentation variants', () => {
    const variants = new Set(
      readQueue()
        .filter((c) => c.cardType === CardType.CHOICE)
        .map((c) => c.presentationVariant ?? 'standard'),
    );
    expect(variants.size).toBeGreaterThanOrEqual(3);
  });

  it('never has three consecutive cards of the same type', () => {
    const cards = readQueue();
    for (let i = 0; i + 2 < cards.length; i++) {
      const trio = [cards[i].cardType, cards[i + 1].cardType, cards[i + 2].cardType];
      expect(trio.every((t) => t === trio[0])).toBe(false);
    }
  });

  it('reorder cards have 3-5 chunks, each 1-3 words', () => {
    for (const card of readQueue().filter((c) => c.cardType === CardType.REORDER)) {
      expect(card.chunks.length).toBeGreaterThanOrEqual(3);
      expect(card.chunks.length).toBeLessThanOrEqual(5);
      for (const chunk of card.chunks) {
        const words = chunk.text.trim().split(/\s+/).length;
        expect(words).toBeGreaterThanOrEqual(1);
        expect(words).toBeLessThanOrEqual(3);
      }
    }
  });

  it('every card is marked CET_REAL (source-traceable real-exam material)', () => {
    for (const card of readQueue()) {
      if (card.cardType !== CardType.READING_BREAKDOWN) {
        expect(card.source).toBe('CET_REAL');
      }
    }
  });

  it('contains no legacy placeholder content', () => {
    const queue = readQueue();
    const joined = queue
      .map((c) => {
        if (c.cardType === CardType.CHOICE) {
          return [c.sentence, c.prompt ?? '', ...c.options.map((o) => o.text)].join(' ');
        }
        if (c.cardType === CardType.REORDER) {
          return c.chunks.map((ch) => ch.text).join(' ');
        }
        return '';
      })
      .join(' ');

    for (const placeholder of ['I am Mike', 'The weather is', 'How are you today']) {
      expect(joined).not.toContain(placeholder);
    }
  });

  it('every card carries situational teaching (meaning/collocation/hook)', () => {
    for (const card of readQueue()) {
      if (card.cardType === CardType.READING_BREAKDOWN) continue;
      expect(card.teaching).toBeTruthy();
      expect(card.teaching?.meaning.trim().length).toBeGreaterThan(0);
      expect(card.teaching?.collocation.trim().length).toBeGreaterThan(0);
      expect(card.teaching?.hook.trim().length).toBeGreaterThan(0);
    }
  });
});
