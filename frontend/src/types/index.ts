// ── Card Types ──
export enum CardType {
  CHOICE = 'choice',
  READING_BREAKDOWN = 'reading_breakdown',
  REORDER = 'reorder',
}

// ── Choice Card ──
export enum ChoiceCardState {
  READY = 'ready',
  SELECTED = 'selected',
  SUBMITTING = 'submitting',
  RESULT = 'result',
  ERROR = 'error',
}

export type ChoiceFlowStep = 'initial_choice' | 'confirm_choice' | 'transfer_choice';

export interface ChoiceOption {
  id: string;
  text: string;
}

export interface ChoiceCardData {
  cardId: string;
  cardType: CardType.CHOICE;
  flowStep: ChoiceFlowStep;
  sentence: string;
  options: ChoiceOption[];
  correctOptionId: string;
}

// ── Reading Breakdown Card ──
export enum ReadingBreakdownCardState {
  LOADING = 'loading',
  MAIN_CLAUSE = 'main_clause',
  RELATION = 'relation',
  NATURAL_MEANING = 'natural_meaning',
  COMPLETED = 'completed',
  ERROR = 'error',
}

export interface BreakdownContent {
  main_clause: string;
  relation: string;
  natural_meaning: string;
}

export interface ReadingBreakdownCardData {
  cardId: string;
  cardType: CardType.READING_BREAKDOWN;
  state: ReadingBreakdownCardState;
  sentence: string;
  content: BreakdownContent | null;
}

// ── Reorder Card ──
export enum ReorderCardState {
  READY = 'ready',
  ARRANGING = 'arranging',
  SUBMITTING = 'submitting',
  RESULT = 'result',
  ERROR = 'error',
}

export interface ChunkItem {
  id: string;
  text: string;
}

export interface ReorderCardData {
  cardId: string;
  cardType: CardType.REORDER;
  chunks: ChunkItem[];
  correctOrder: string[]; // ordered chunk IDs
}

// ── Unified Card ──
export type LearningCard =
  | ChoiceCardData
  | ReadingBreakdownCardData
  | ReorderCardData;

// ── API Types ──
export interface CardSubmitRequest {
  sessionId: string;
  cardId: string;
  cardType: CardType;
  flowStep?: ChoiceFlowStep;
  answer?: {
    selectedOptionId?: string;
    orderedChunkIds?: string[];
  };
}

export interface CardActionRequest {
  sessionId: string;
  cardId: string;
  cardType: CardType;
  action: 'complete' | 'continue' | 'retry';
}

export interface NextCard {
  cardId: string;
  cardType: CardType;
  flowStep?: ChoiceFlowStep;
  state?: string;
  content?: BreakdownContent;
}

export interface CardResponse {
  ok: boolean;
  cardId: string;
  cardType: CardType;
  state: string;
  evaluation?: {
    correct: boolean;
    attempt: number;
  };
  feedback?: {
    text: string;
  };
  uiPatch?: {
    lockedChunkIds?: string[];
    revealedOrder?: string[];
  };
  next?: {
    action: 'render_next_card' | 'stay' | 'retry_action' | 'keep_current_card';
    card?: NextCard;
  };
  error?: {
    code: string;
    recoverable: boolean;
  };
  fallback?: {
    action: string;
  };
}

// ── Session Types ──
export type ExamType = 'CET4' | 'CET6';
export type ExamBatch = '2026-12' | '2027-06' | '2027-12' | 'later' | 'undecided';
export type DailyTime = '5min' | '10min' | '20min' | '30min+';

export interface UserProfile {
  examType: ExamType | null;
  examBatch: ExamBatch | null;
  dailyTime: DailyTime | null;
}

export enum AppStage {
  ONBOARDING = 'onboarding',
  DASHBOARD = 'dashboard',
  LEARNING = 'learning',
  RESULT = 'result',
  COMPLETE = 'complete',
}

export interface SessionData {
  sessionId: string;
  startTime: number;
  endTime: number | null;
  cardsCompleted: number;
  actions: SessionAction[];
}

export interface SessionAction {
  cardType: CardType;
  cardId: string;
  correct: boolean | null;
  timestamp: number;
}
