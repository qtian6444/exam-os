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

export type ChoicePresentationVariant =
  | 'standard'
  | 'dialogue'
  | 'cloze'
  | 'reading'
  | 'translation';

export interface CardTeaching {
  meaning: string;
  collocation: string;
  hook: string;
}

export interface ChoiceCardData {
  cardId: string;
  cardType: CardType.CHOICE;
  flowStep: ChoiceFlowStep;
  sentence: string;
  options: ChoiceOption[];
  correctOptionId: string;
  presentationVariant?: ChoicePresentationVariant;
  prompt?: string;
  source?: string;
  teaching?: CardTeaching;
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
  source?: string;
  teaching?: CardTeaching;
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

// ── First-session self-report (session-scoped goal context — NOT persisted) ──
export type StudyPurpose = 'cet_exam' | 'long_term' | 'ielts_study_abroad' | 'career';
export type CetTarget = 'pass_425' | 'stable_pass' | 'score_500' | 'listening_speaking';
// 当前英语基础感受（共同语义等级，跨 purpose 复用；UI 文案按 purpose 映射）。
// 禁止保存无语义的 1/2/3/4/5。
export type SelfBaseline = 'starter' | 'foundation' | 'developing' | 'functional' | 'strong';

// 当前最想先解决的问题（所有用户共同回答）。语义字符串枚举，禁止用 1/2/3/4 序号。
export type PrimaryObstacle =
  | 'vocabulary_insufficient'
  | 'words_known_sentences_unclear'
  | 'reading_locate_unstable'
  | 'listening_lag'
  | 'writing_expression_hard'
  | 'undecided_comprehensive';

// 希望获得的训练支持程度（所有用户共同回答）。
export type SupportPreference =
  | 'more_hints_guided'
  | 'moderate_hints_self_try'
  | 'few_hints_challenge';

// 按 purpose 的条件问题答案。仅用于三个非 CET 目标（CET 用 targetScore + examBatch）。
// 这只是目标信息采集，不生成雅思能力判断，也不提供对应题目。
export type LongTermFocus =
  | 'vocab_reading_basis'
  | 'listening_comprehension'
  | 'daily_expression'
  | 'comprehensive_english';

export type IeltsStage =
  | 'explore_basis'
  | 'plan_within_year'
  | 'plan_within_half_year'
  | 'already_preparing';

export type WorkplaceNeed =
  | 'job_interview'
  | 'email_writing'
  | 'meeting_daily_comm'
  | 'read_work_material'
  | 'no_fixed_scene';

export type PurposeDetail = LongTermFocus | IeltsStage | WorkplaceNeed;

export interface FirstSessionContext {
  purpose: StudyPurpose;
  targetScore: CetTarget | null; // null unless purpose === cet_exam
  selfBaseline: SelfBaseline;
  primaryObstacle: PrimaryObstacle;
  supportPreference: SupportPreference;
  purposeDetail: PurposeDetail | null; // null for cet_exam; else the per-purpose answer
  dailyTime: DailyTime; // needed by the first-session insight (learning rhythm)
}

// Full onboarding completion payload. examType/examBatch/dailyTime are persisted
// via persistUserProfile; every self-report field stays session-scoped only.
export interface OnboardingProfile {
  examType: ExamType;
  examBatch: ExamBatch;
  dailyTime: DailyTime;
  purpose: StudyPurpose;
  targetScore: CetTarget | null;
  selfBaseline: SelfBaseline;
  primaryObstacle: PrimaryObstacle;
  supportPreference: SupportPreference;
  purposeDetail: PurposeDetail | null;
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
