import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type {
  OnboardingProfile,
  FirstSessionContext,
  StudyPurpose,
  CetTarget,
  SelfBaseline,
  ExamBatch,
  DailyTime,
  PrimaryObstacle,
  SupportPreference,
  PurposeDetail,
  LongTermFocus,
  IeltsStage,
  WorkplaceNeed,
} from '../../types';
import { buildFirstSessionInsight, type InsightIcon } from './insight';

const SLIDE_ANIMATION = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

const PURPOSE_OPTIONS: { value: StudyPurpose; label: string }[] = [
  { value: 'cet_exam', label: '通过四六级考试' },
  { value: 'long_term', label: '提升长期英语能力' },
  { value: 'ielts_study_abroad', label: '为未来雅思·留学准备' },
  { value: 'career', label: '工作和职业发展' },
];

const TARGET_OPTIONS: { value: CetTarget; label: string }[] = [
  { value: 'pass_425', label: '先通过 425 分' },
  { value: 'stable_pass', label: '稳定通过，不想压线' },
  { value: 'score_500', label: '冲击 500 分以上' },
  { value: 'listening_speaking', label: '同时提升听力和实际表达' },
];

// ── selfBaseline (per-purpose) ──
// The same five semantic levels are reused across purposes, but the question text
// and option labels differ per purpose so a non-CET user never sees 四级/分数/过线
// wording. The stored value stays a semantic level, never a bare 1/2/3/4/5.
const BASELINE_LEVELS: SelfBaseline[] = [
  'starter',
  'foundation',
  'developing',
  'functional',
  'strong',
];

const BASELINE_QUESTIONS: Record<StudyPurpose, string> = {
  cet_exam: '现在做四级题时，哪句话更像你？',
  long_term: '现在学习和使用英语时，哪句话更像你？',
  ielts_study_abroad: '面对未来的雅思或留学英语，你现在更接近哪种情况？',
  career: '在工作或职业场景中使用英语时，哪句话更像你？',
};

const BASELINE_LABELS: Record<StudyPurpose, Record<SelfBaseline, string>> = {
  cet_exam: {
    starter: '单词认识得不多，读题比较吃力',
    foundation: '认识一些单词，但句子经常看不懂',
    developing: '简单题能做，但正确率不稳定',
    functional: '已经接近过线，想查缺补漏',
    strong: '基本能通过，想继续提高分数',
  },
  long_term: {
    starter: '常用单词也不太熟悉，需要从基础开始',
    foundation: '认识一些单词，但完整句子经常看不懂',
    developing: '能理解简单内容，但听说读写不够稳定',
    functional: '日常英语基本能理解，想进行系统提升',
    strong: '已经有一定基础，想提高表达和理解深度',
  },
  ielts_study_abroad: {
    starter: '目前基础较弱，想先打好词汇和句子基础',
    foundation: '能理解简单英语，但学术内容比较吃力',
    developing: '阅读有一定基础，听力或表达比较薄弱',
    functional: '已经开始接触相关内容，想系统准备',
    strong: '英语基础较好，想进一步提升学术能力',
  },
  career: {
    starter: '目前很少使用英语，想先建立基础',
    foundation: '能看懂少量单词和简单消息',
    developing: '能阅读简单资料，但写作或交流比较困难',
    functional: '可以完成基础沟通，但还不够稳定',
    strong: '已经能够使用英语工作，想表达得更专业',
  },
};

function baselineQuestion(purpose: StudyPurpose): string {
  return BASELINE_QUESTIONS[purpose];
}

function baselineOptions(purpose: StudyPurpose): { value: SelfBaseline; label: string }[] {
  return BASELINE_LEVELS.map((level) => ({ value: level, label: BASELINE_LABELS[purpose][level] }));
}

const OBSTACLE_OPTIONS: { value: PrimaryObstacle; label: string }[] = [
  { value: 'vocabulary_insufficient', label: '词汇量不足' },
  { value: 'words_known_sentences_unclear', label: '单词认识但句子看不懂' },
  { value: 'reading_locate_unstable', label: '阅读定位和理解不稳定' },
  { value: 'listening_lag', label: '听力跟不上' },
  { value: 'writing_expression_hard', label: '写作和表达困难' },
  { value: 'undecided_comprehensive', label: '暂时不确定，先综合练习' },
];

const SUPPORT_OPTIONS: { value: SupportPreference; label: string }[] = [
  { value: 'more_hints_guided', label: '多给提示，带着我一步步练' },
  { value: 'moderate_hints_self_try', label: '提示适中，先让我自己尝试' },
  { value: 'few_hints_challenge', label: '少给提示，直接进行挑战' },
];

const LONG_TERM_FOCUS_OPTIONS: { value: LongTermFocus; label: string }[] = [
  { value: 'vocab_reading_basis', label: '词汇和阅读基础' },
  { value: 'listening_comprehension', label: '听力理解' },
  { value: 'daily_expression', label: '日常表达' },
  { value: 'comprehensive_english', label: '综合英语能力' },
];

const IELTS_STAGE_OPTIONS: { value: IeltsStage; label: string }[] = [
  { value: 'explore_basis', label: '先了解和打基础' },
  { value: 'plan_within_year', label: '计划一年内开始准备' },
  { value: 'plan_within_half_year', label: '计划半年内开始准备' },
  { value: 'already_preparing', label: '已经开始准备' },
];

const WORKPLACE_NEED_OPTIONS: { value: WorkplaceNeed; label: string }[] = [
  { value: 'job_interview', label: '求职和面试' },
  { value: 'email_writing', label: '邮件与书面沟通' },
  { value: 'meeting_daily_comm', label: '会议和日常交流' },
  { value: 'read_work_material', label: '阅读工作资料' },
  { value: 'no_fixed_scene', label: '暂时没有固定场景' },
];

const EXAM_BATCH_OPTIONS: { value: ExamBatch; label: string }[] = [
  { value: '2026-12', label: '2026 年 12 月' },
  { value: '2027-06', label: '2027 年 6 月' },
  { value: '2027-12', label: '2027 年 12 月' },
  { value: 'later', label: '更晚' },
  { value: 'undecided', label: '我还不确定' },
];

const DAILY_TIME_OPTIONS: { value: DailyTime; label: string }[] = [
  { value: '5min', label: '5 分钟 · 轻量体验' },
  { value: '10min', label: '10 分钟 · 日常练习' },
  { value: '20min', label: '20 分钟 · 稳定提升' },
  { value: '30min+', label: '30 分钟以上 · 集中训练' },
];

// The single per-purpose conditional question for the three non-CET goals. It
// collects goal context ONLY — no ability judgment, no topic content behind it.
function purposeDetailQuestion(purpose: StudyPurpose): string {
  switch (purpose) {
    case 'long_term':
      return '你最希望长期提升哪方面？';
    case 'ielts_study_abroad':
      return '你目前处于哪个阶段？';
    case 'career':
      return '你最常需要英语完成什么？';
    default:
      return '';
  }
}

function purposeDetailOptions(
  purpose: StudyPurpose,
): { value: PurposeDetail; label: string }[] {
  switch (purpose) {
    case 'long_term':
      return LONG_TERM_FOCUS_OPTIONS;
    case 'ielts_study_abroad':
      return IELTS_STAGE_OPTIONS;
    case 'career':
      return WORKPLACE_NEED_OPTIONS;
    default:
      return [];
  }
}

function purposeDetailTitle(purpose: StudyPurpose): string {
  switch (purpose) {
    case 'long_term':
      return '长期提升方向';
    case 'ielts_study_abroad':
      return '雅思准备阶段';
    case 'career':
      return '职场英语需求';
    default:
      return '';
  }
}

function purposeDetailLabel(value: PurposeDetail | null): string {
  if (!value) return '';
  return (
    LONG_TERM_FOCUS_OPTIONS.find((o) => o.value === value)?.label ??
    IELTS_STAGE_OPTIONS.find((o) => o.value === value)?.label ??
    WORKPLACE_NEED_OPTIONS.find((o) => o.value === value)?.label ??
    ''
  );
}

type Step =
  | 'welcome'
  | 'purpose'
  | 'targetScore'
  | 'examBatch'
  | 'purposeDetail'
  | 'selfBaseline'
  | 'primaryObstacle'
  | 'supportPreference'
  | 'dailyTime'
  | 'confirm';

// Single source of truth for every answer. Held at the top level so forward/back
// navigation never loses a choice; a question step only re-renders the list.
interface Answers {
  purpose: StudyPurpose | null;
  targetScore: CetTarget | null;
  examBatch: ExamBatch | null;
  purposeDetail: PurposeDetail | null;
  selfBaseline: SelfBaseline | null;
  primaryObstacle: PrimaryObstacle | null;
  supportPreference: SupportPreference | null;
  dailyTime: DailyTime | null;
}

const EMPTY_ANSWERS: Answers = {
  purpose: null,
  targetScore: null,
  examBatch: null,
  purposeDetail: null,
  selfBaseline: null,
  primaryObstacle: null,
  supportPreference: null,
  dailyTime: null,
};

interface Props {
  onComplete: (profile: OnboardingProfile) => Promise<boolean>;
}

interface QuestionStepProps<T extends string> {
  stepKey: string;
  question: string;
  options: { value: T; label: string }[];
  selected: T | null;
  onSelect: (value: T) => void;
  onBack: () => void;
  disabled?: boolean;
}

function QuestionStep<T extends string>({
  stepKey,
  question,
  options,
  selected,
  onSelect,
  onBack,
  disabled = false,
}: QuestionStepProps<T>) {
  return (
    <motion.div
      key={stepKey}
      className="onboarding__step"
      {...SLIDE_ANIMATION}
      transition={{ duration: 0.3 }}
    >
      <h2 className="onboarding__question">{question}</h2>
      <div className="onboarding__options">
        {options.map((o) => {
          const isSelected = o.value === selected;
          return (
            <button
              key={o.value}
              type="button"
              className={
                isSelected
                  ? 'onboarding__btn onboarding__btn--selected'
                  : 'onboarding__btn'
              }
              aria-pressed={isSelected}
              onClick={() => onSelect(o.value)}
              disabled={disabled}
            >
              {o.label}
            </button>
          );
        })}
      </div>
      <button
        type="button"
        className="onboarding__back"
        onClick={onBack}
        disabled={disabled}
      >
        返回上一题
      </button>
    </motion.div>
  );
}

// Simple built-in glyphs for the three insight items — no third-party icon
// library, no external asset. Inherits the accent colour via currentColor.
function InsightGlyph({ icon }: { icon: InsightIcon }) {
  if (icon === 'target') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
        <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      </svg>
    );
  }
  if (icon === 'bolt') {
    return (
      <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
        <path d="M13 2 L5 13 h5 l-1.5 9 L18 10 h-5 z" fill="currentColor" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      <circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 7 v5 l3.5 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function OnboardingFlow({ onComplete }: Props) {
  const [answers, setAnswers] = useState<Answers>(EMPTY_ANSWERS);
  const [stepIndex, setStepIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCetExam = answers.purpose === 'cet_exam';

  // The branch (and thus total step count) is derived from the purpose. Only the
  // CET goal shows 四级目标 + 考试时间; the other three show one purposeDetail
  // question. Everything else is a common question for every user.
  const steps: Step[] = [
    'welcome',
    'purpose',
    ...(isCetExam
      ? (['targetScore', 'examBatch'] as Step[])
      : (['purposeDetail'] as Step[])),
    'selfBaseline',
    'primaryObstacle',
    'supportPreference',
    'dailyTime',
    'confirm',
  ];
  const step = steps[stepIndex];
  const totalSteps = steps.length;

  const goNext = () => {
    setError(null);
    setStepIndex((i) => Math.min(i + 1, steps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  // Changing the purpose invalidates every purpose-scoped answer (CET 目标/考试
  // 时间, 非 CET 的条件题, 以及 selfBaseline —— 后者题干随 purpose 变), so
  // switching branches never carries a stale choice. Re-selecting the SAME purpose
  // keeps them (back/forward never clears).
  const selectPurpose = (value: StudyPurpose) => {
    setAnswers((prev) =>
      prev.purpose === value
        ? prev
        : {
            ...prev,
            purpose: value,
            targetScore: null,
            examBatch: null,
            purposeDetail: null,
            selfBaseline: null,
          },
    );
    goNext();
  };

  const selectTargetScore = (value: CetTarget) => {
    setAnswers((prev) => ({ ...prev, targetScore: value }));
    goNext();
  };

  const selectExamBatch = (value: ExamBatch) => {
    setAnswers((prev) => ({ ...prev, examBatch: value }));
    goNext();
  };

  const selectPurposeDetail = (value: PurposeDetail) => {
    setAnswers((prev) => ({ ...prev, purposeDetail: value }));
    goNext();
  };

  const selectSelfBaseline = (value: SelfBaseline) => {
    setAnswers((prev) => ({ ...prev, selfBaseline: value }));
    goNext();
  };

  const selectPrimaryObstacle = (value: PrimaryObstacle) => {
    setAnswers((prev) => ({ ...prev, primaryObstacle: value }));
    goNext();
  };

  const selectSupportPreference = (value: SupportPreference) => {
    setAnswers((prev) => ({ ...prev, supportPreference: value }));
    goNext();
  };

  const selectDailyTime = (value: DailyTime) => {
    setAnswers((prev) => ({ ...prev, dailyTime: value }));
    goNext();
  };

  // The full self-report, with fallback defaults so a half-built state can never
  // crash the insight generator (item 16: 缺失字段兜底).
  const buildContext = (): FirstSessionContext => ({
    purpose: answers.purpose ?? 'cet_exam',
    targetScore: isCetExam ? answers.targetScore : null,
    selfBaseline: answers.selfBaseline ?? 'starter',
    primaryObstacle: answers.primaryObstacle ?? 'undecided_comprehensive',
    supportPreference: answers.supportPreference ?? 'moderate_hints_self_try',
    purposeDetail: isCetExam ? null : (answers.purposeDetail ?? null),
    dailyTime: answers.dailyTime ?? '10min',
  });

  const buildProfile = (): OnboardingProfile => ({
    // This flow is CET-4 focused; examType is not asked and defaults to CET4.
    ...buildContext(),
    examType: 'CET4',
    examBatch: isCetExam ? (answers.examBatch ?? 'undecided') : 'undecided',
  });

  const handleComplete = async () => {
    if (submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ok = await onComplete(buildProfile());
      if (!ok) {
        setError('保存失败，请检查网络后重试。');
      }
      // On success the parent switches stage and this component unmounts.
    } catch {
      setError('保存失败，请检查网络后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  const purposeLabel = PURPOSE_OPTIONS.find((o) => o.value === answers.purpose)?.label ?? '';
  const targetLabel = TARGET_OPTIONS.find((o) => o.value === answers.targetScore)?.label ?? '';
  const batchLabel = EXAM_BATCH_OPTIONS.find((o) => o.value === answers.examBatch)?.label ?? '';
  const baselineLabel =
    answers.selfBaseline && answers.purpose
      ? BASELINE_LABELS[answers.purpose][answers.selfBaseline]
      : '';
  const obstacleLabel = OBSTACLE_OPTIONS.find((o) => o.value === answers.primaryObstacle)?.label ?? '';
  const supportLabel = SUPPORT_OPTIONS.find((o) => o.value === answers.supportPreference)?.label ?? '';
  const dailyTimeLabel = DAILY_TIME_OPTIONS.find((o) => o.value === answers.dailyTime)?.label ?? '';
  const progressPct = Math.round(((stepIndex + 1) / totalSteps) * 100);
  const insight = buildFirstSessionInsight(buildContext());

  return (
    <div className="onboarding">
      <div
        className="onboarding__progress"
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={totalSteps}
        aria-valuenow={stepIndex + 1}
      >
        <div className="onboarding__progress-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <p className="onboarding__progress-label">
        第 {stepIndex + 1} 步 / 共 {totalSteps} 步
      </p>

      <AnimatePresence mode="wait">
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            className="onboarding__step"
            {...SLIDE_ANIMATION}
            transition={{ duration: 0.3 }}
          >
            <h1 className="onboarding__title">Exam OS</h1>
            <p className="onboarding__subtitle">
              先用一分钟了解你的英语目标，接下来训练会更适合你。
            </p>
            <motion.button
              className="onboarding__btn onboarding__btn--primary"
              onClick={goNext}
              whileTap={{ scale: 0.96 }}
            >
              开始了解
            </motion.button>
          </motion.div>
        )}

        {step === 'purpose' && (
          <QuestionStep
            stepKey="purpose"
            question="你现在学习英语主要为了什么？"
            options={PURPOSE_OPTIONS}
            selected={answers.purpose}
            onSelect={selectPurpose}
            onBack={goBack}
          />
        )}

        {step === 'targetScore' && (
          <QuestionStep
            stepKey="targetScore"
            question="这次四级，你最希望达到什么目标？"
            options={TARGET_OPTIONS}
            selected={answers.targetScore}
            onSelect={selectTargetScore}
            onBack={goBack}
          />
        )}

        {step === 'examBatch' && (
          <QuestionStep
            stepKey="examBatch"
            question="你打算什么时候考试？"
            options={EXAM_BATCH_OPTIONS}
            selected={answers.examBatch}
            onSelect={selectExamBatch}
            onBack={goBack}
          />
        )}

        {step === 'purposeDetail' && (
          <QuestionStep
            stepKey="purposeDetail"
            question={purposeDetailQuestion(answers.purpose ?? 'cet_exam')}
            options={purposeDetailOptions(answers.purpose ?? 'cet_exam')}
            selected={answers.purposeDetail}
            onSelect={selectPurposeDetail}
            onBack={goBack}
          />
        )}

        {step === 'selfBaseline' && (
          <QuestionStep
            stepKey="selfBaseline"
            question={baselineQuestion(answers.purpose ?? 'cet_exam')}
            options={baselineOptions(answers.purpose ?? 'cet_exam')}
            selected={answers.selfBaseline}
            onSelect={selectSelfBaseline}
            onBack={goBack}
          />
        )}

        {step === 'primaryObstacle' && (
          <QuestionStep
            stepKey="primaryObstacle"
            question="你当前最想先解决什么问题？"
            options={OBSTACLE_OPTIONS}
            selected={answers.primaryObstacle}
            onSelect={selectPrimaryObstacle}
            onBack={goBack}
          />
        )}

        {step === 'supportPreference' && (
          <QuestionStep
            stepKey="supportPreference"
            question="你希望获得什么样的训练支持？"
            options={SUPPORT_OPTIONS}
            selected={answers.supportPreference}
            onSelect={selectSupportPreference}
            onBack={goBack}
          />
        )}

        {step === 'dailyTime' && (
          <QuestionStep
            stepKey="dailyTime"
            question="你每天有多少时间学习？"
            options={DAILY_TIME_OPTIONS}
            selected={answers.dailyTime}
            onSelect={selectDailyTime}
            onBack={goBack}
          />
        )}

        {step === 'confirm' && (
          <motion.div
            key="confirm"
            className="onboarding__step onboarding__confirm"
            {...SLIDE_ANIMATION}
            transition={{ duration: 0.3 }}
          >
            <h2 className="onboarding__result-title">{insight.title}</h2>
            <p className="onboarding__result-subtitle">{insight.subtitle}</p>

            <div className="onboarding__insights">
              {insight.items.map((item) => (
                <div key={item.title} className="onboarding__insight-item">
                  <span className="onboarding__insight-icon" aria-hidden="true">
                    <InsightGlyph icon={item.icon} />
                  </span>
                  <div className="onboarding__insight-body">
                    <h3 className="onboarding__insight-title">{item.title}</h3>
                    <p className="onboarding__insight-desc">{item.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <p className="onboarding__notice">{insight.notice}</p>

            <button
              type="button"
              className="onboarding__btn onboarding__btn--primary"
              onClick={handleComplete}
              disabled={submitting}
            >
              {submitting ? '正在进入训练…' : insight.primaryActionLabel}
            </button>
            {error && <p className="onboarding__error">{error}</p>}

            <details className="onboarding__choices">
              <summary>查看我的选择</summary>
              <div className="onboarding__choices-body">
                <p>学习目标：{purposeLabel}</p>
                {isCetExam ? (
                  <>
                    <p>四级目标：{targetLabel}</p>
                    <p>考试时间：{batchLabel}</p>
                  </>
                ) : (
                  <p>
                    {purposeDetailTitle(answers.purpose ?? 'cet_exam')}：
                    {purposeDetailLabel(answers.purposeDetail)}
                  </p>
                )}
                <p>当前基础：{baselineLabel}</p>
                <p>最想先解决：{obstacleLabel}</p>
                <p>训练支持：{supportLabel}</p>
                <p>每日节奏：{dailyTimeLabel}</p>
              </div>
            </details>

            <button
              type="button"
              className="onboarding__back"
              onClick={goBack}
              disabled={submitting}
            >
              返回上一题
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
