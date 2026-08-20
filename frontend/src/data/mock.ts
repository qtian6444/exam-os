import {
  CardType,
  type ChoiceCardData,
  type ReadingBreakdownCardData,
  type ReorderCardData,
  type LearningCard,
} from '../types';
import { breakdownSentences, reorderSentences } from './content-library';

// ── Card Queue (Real CET-4 Content) ──

let cardIndex = 0;

function buildCardQueue(): LearningCard[] {
  const cards: LearningCard[] = [];

  // Card 1: Choice — welcome preference
  cards.push({
    cardId: 'choice-welcome',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: '',
    options: [
      { id: 'opt-short', text: '我喜欢短句，一段一段来' },
      { id: 'opt-long', text: '我敢挑战长句，一口气读完' },
    ],
    correctOptionId: '',
  } as ChoiceCardData);

  // Card 2: Reading Breakdown — first real CET-4 sentence (Pandas)
  cards.push({
    cardId: 'breakdown-001',
    cardType: CardType.READING_BREAKDOWN,
    state: 'loading',
    sentence: breakdownSentences[0].sentence,
    content: null,
  } as ReadingBreakdownCardData);

  // Card 3: Choice — real CET-4 comprehension question (Pandas Q46)
  cards.push({
    cardId: 'choice-q46',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: 'What do we learn from new research about pandas?',
    options: [
      { id: 'A', text: 'They are losing habitat due to the building of roads and houses.' },
      { id: 'B', text: 'They have stopped seeking new mates for reproduction.' },
      { id: 'C', text: 'They may not adapt to the fragmentation of their habitat.' },
      { id: 'D', text: 'They may cease to exist as a result of enjoying too good a life.' },
    ],
    correctOptionId: 'D',
  } as ChoiceCardData);

  // Card 4: Reorder — real CET-4 sentence (Dress)
  cards.push({
    cardId: 'reorder-001',
    cardType: CardType.REORDER,
    chunks: reorderSentences[2].chunks.map((text, i) => ({
      id: String.fromCharCode(97 + i), // a, b, c, d...
      text,
    })),
    correctOrder: ['a', 'b', 'c', 'd'],
  } as ReorderCardData);

  // Card 5: Reading Breakdown — Grit sentence
  cards.push({
    cardId: 'breakdown-002',
    cardType: CardType.READING_BREAKDOWN,
    state: 'loading',
    sentence: breakdownSentences[2].sentence,
    content: null,
  } as ReadingBreakdownCardData);

  // Card 6: Reorder — Grit sentence
  cards.push({
    cardId: 'reorder-002',
    cardType: CardType.REORDER,
    chunks: reorderSentences[1].chunks.map((text, i) => ({
      id: String.fromCharCode(97 + i),
      text,
    })),
    correctOrder: ['a', 'b', 'c'],
  } as ReorderCardData);

  return cards;
}

const mockCards = buildCardQueue();

export function getNextCard(): LearningCard | null {
  if (cardIndex >= mockCards.length) return null;
  return mockCards[cardIndex++];
}

export function getTotalCards(): number {
  return mockCards.length;
}

export function resetCardQueue(): void {
  cardIndex = 0;
}

// ── Real Breakdown Content Map ──
const breakdownMap: Record<string, string[]> = {};
breakdownSentences.forEach((item, i) => {
  const cardId = `breakdown-${String(i + 1).padStart(3, '0')}`;
  breakdownMap[cardId] = [item.mainClause, item.relation, item.naturalMeaning];
});

export function getMockBreakdown(cardId: string): string[] | null {
  return breakdownMap[cardId] || null;
}
