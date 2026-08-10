import {
  CardType,
  type ChoiceCardData,
  type ReadingBreakdownCardData,
  type ReorderCardData,
  type LearningCard,
} from '../types';

// ── Mock Card Queue ──
// This drives the first vertical slice. Later replaced by Edge Function calls.

const mockCards: LearningCard[] = [
  // Card 1: Choice — initial_choice (reading preference/style)
  {
    cardId: 'choice-001',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: '',
    options: [
      { id: 'opt-short', text: '我喜欢短句，一段一段来' },
      { id: 'opt-long', text: '我敢挑战长句，一口气读完' },
    ],
    correctOptionId: '', // preference card, no right/wrong
  } as ChoiceCardData,

  // Card 2: Reading Breakdown
  {
    cardId: 'breakdown-001',
    cardType: CardType.READING_BREAKDOWN,
    state: 'loading',
    sentence:
      'The researchers found that students who regularly engaged in collaborative problem-solving activities demonstrated significantly higher levels of critical thinking ability compared to those who worked individually.',
    content: null,
  } as ReadingBreakdownCardData,

  // Card 3: Choice — initial_choice (goal)
  {
    cardId: 'choice-002',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: '',
    options: [
      { id: 'opt-pass', text: '我只要过线就好' },
      { id: 'opt-excel', text: '我想考一个好分数' },
    ],
    correctOptionId: '',
  } as ChoiceCardData,

  // Card 4: Reorder
  {
    cardId: 'reorder-001',
    cardType: CardType.REORDER,
    chunks: [
      { id: 'c1', text: 'The researchers found' },
      { id: 'c2', text: 'that students who regularly engaged' },
      { id: 'c3', text: 'in collaborative problem-solving activities' },
      { id: 'c4', text: 'demonstrated significantly higher levels' },
      { id: 'c5', text: 'of critical thinking ability' },
    ],
    correctOrder: ['c1', 'c2', 'c3', 'c4', 'c5'],
  } as ReorderCardData,

  // Card 5: Reading Breakdown (second sentence)
  {
    cardId: 'breakdown-002',
    cardType: CardType.READING_BREAKDOWN,
    state: 'loading',
    sentence:
      'Despite the widespread adoption of digital learning platforms, many educators argue that face-to-face interaction remains an irreplaceable component of effective education.',
    content: null,
  } as ReadingBreakdownCardData,
];

let cardIndex = 0;

export function getNextCard(): LearningCard | null {
  if (cardIndex >= mockCards.length) return null;
  return mockCards[cardIndex++];
}

export function resetCardQueue(): void {
  cardIndex = 0;
}

// ── Mock Breakdown Responses (no DeepSeek API for now) ──
const mockBreakdowns: Record<string, string[]> = {
  'breakdown-001': [
    'The researchers found that students demonstrated higher levels of critical thinking ability.',
    'who regularly engaged in collaborative problem-solving activities → compared to those who worked individually',
    '经常参与小组解决问题的学生，批判性思维能力明显更强。',
  ],
  'breakdown-002': [
    'Many educators argue that face-to-face interaction remains an irreplaceable component.',
    'Despite the widespread adoption of digital learning platforms → this is the contrast to the main argument',
    '虽然大家都在用在线平台，但很多老师认为面对面交流还是不可替代的。',
  ],
};

export function getMockBreakdown(cardId: string): string[] | null {
  return mockBreakdowns[cardId] || null;
}
