import type {
  CetTarget,
  DailyTime,
  FirstSessionContext,
  PrimaryObstacle,
  SelfBaseline,
  StudyPurpose,
  SupportPreference,
} from '../../types';

// ── First-session insight (deterministic, no LLM) ──
//
// Turns the structured self-report into three personalised "first learning
// directions". Pure function: same context → same output, no randomness, no
// network, no ability scoring. It must never promise a score, a deadline, or a
// permanent/accurate ability judgement — every line is an honest, session-scoped
// reflection of what the user just chose.

export type InsightIcon = 'target' | 'bolt' | 'clock';

export interface InsightItem {
  icon: InsightIcon;
  title: string;
  description: string;
}

export interface FirstSessionInsight {
  title: string;
  subtitle: string;
  items: InsightItem[];
  notice: string;
  primaryActionLabel: string;
}

const PAGE_TITLES: Record<StudyPurpose, string> = {
  cet_exam: '你的四级第一阶段训练方向',
  long_term: '你的长期英语提升方向',
  ielts_study_abroad: '你的英语基础准备方向',
  career: '你的职场英语起步方向',
};

const PAGE_SUBTITLE = '根据你刚才的选择，我们先抓住这三件事。';

const DAILY_TIME_SHORT: Record<DailyTime, string> = {
  '5min': '5 分钟',
  '10min': '10 分钟',
  '20min': '20 分钟',
  '30min+': '30 分钟以上',
};

// ── Item 1: 核心使用方向 (purpose + purposeDetail / targetScore) ──
// The direction must never promise a specific score or an IELTS ability verdict.

const CET_DIRECTION: Record<Exclude<CetTarget, null>, string> = {
  pass_425: '先把基础词汇和常见题型做扎实，稳步向通过迈进。',
  stable_pass: '强化高频考点，减少压线发挥的不确定性。',
  score_500: '在掌握基础后补充中高难度训练，向更高分数努力。',
  listening_speaking: '在读写之外加强听力与表达，追求更全面的提升。',
};

const LONG_TERM_DIRECTION: Record<string, { title: string; description: string }> = {
  vocab_reading_basis: {
    title: '词汇与阅读基础优先',
    description: '先扩大核心词汇量，再用阅读巩固理解和运用。',
  },
  listening_comprehension: {
    title: '听力理解优先',
    description: '从语速适中的听力素材入手，逐步提升抓取关键信息的能力。',
  },
  daily_expression: {
    title: '日常表达优先',
    description: '积累常见场景的高频表达，先能说、能写、能回应。',
  },
  comprehensive_english: {
    title: '综合能力提升',
    description: '听说读写均衡推进，在真实语境里稳步提高。',
  },
};

const IELTS_DIRECTION: Record<string, { title: string; description: string }> = {
  explore_basis: {
    title: '先夯实英语基础',
    description: '从核心词汇、句子理解和基础信息提取开始，为未来学习做好准备。',
  },
  plan_within_year: {
    title: '一年内打好预备基础',
    description: '用基础阶段补齐词汇与句子能力，为正式备考留出余量。',
  },
  plan_within_half_year: {
    title: '半年内进入预备',
    description: '聚焦高频词汇和学术基础，尽快进入系统准备状态。',
  },
  already_preparing: {
    title: '系统准备优先',
    description: '围绕学术场景巩固词汇、阅读与表达基础。',
  },
};

const CAREER_DIRECTION: Record<string, { title: string; description: string }> = {
  job_interview: {
    title: '面试表达优先',
    description: '积累自我介绍、回答问题和表达优势的高频表达。',
  },
  email_writing: {
    title: '邮件写作优先',
    description: '掌握常用邮件句式，做到清晰、得体的书面沟通。',
  },
  meeting_daily_comm: {
    title: '会议沟通优先',
    description: '先积累表达观点、确认信息和回应他人的高频英语表达。',
  },
  read_work_material: {
    title: '工作阅读优先',
    description: '提升读懂邮件、资料和通知的能力。',
  },
  no_fixed_scene: {
    title: '通用职场英语',
    description: '先建立职场英语的基础语感和常用表达。',
  },
};

function buildDirectionItem(context: FirstSessionContext): InsightItem {
  if (context.purpose === 'cet_exam') {
    const target = context.targetScore;
    const description = target
      ? CET_DIRECTION[target]
      : '以词汇、句子和阅读为主线，为四级打好基础。';
    return {
      icon: 'target',
      title: '围绕四级目标建立训练重点',
      description,
    };
  }

  const detail = context.purposeDetail as string | null;
  let entry: { title: string; description: string } | undefined;
  if (context.purpose === 'long_term') {
    entry = LONG_TERM_DIRECTION[detail ?? 'comprehensive_english'];
  } else if (context.purpose === 'ielts_study_abroad') {
    entry = IELTS_DIRECTION[detail ?? 'explore_basis'];
  } else {
    entry = CAREER_DIRECTION[detail ?? 'no_fixed_scene'];
  }
  return { icon: 'target', title: entry.title, description: entry.description };
}

// ── Item 2: 第一突破口 (selfBaseline + primaryObstacle) ──
// The obstacle is turned into an action, never restated as "你选择了 X 困难".

const OBSTACLE_TITLE: Record<PrimaryObstacle, string> = {
  vocabulary_insufficient: '扩充词汇量',
  words_known_sentences_unclear: '突破句子理解',
  reading_locate_unstable: '稳定阅读定位',
  listening_lag: '跟上听力节奏',
  writing_expression_hard: '突破写作和表达',
  undecided_comprehensive: '综合练习打底',
};

const OBSTACLE_ACTION: Record<PrimaryObstacle, string> = {
  vocabulary_insufficient: '先把高频核心词汇积累起来，在语境里反复使用。',
  words_known_sentences_unclear: '先从读懂完整句子入手，练熟常见句型结构。',
  reading_locate_unstable: '先训练快速定位关键信息，再把握段落主旨。',
  listening_lag: '先从语速适中的材料开始，逐步提高抓取和反应能力。',
  writing_expression_hard: '第一阶段更适合强化句子组织、常用表达和错误复盘。',
  undecided_comprehensive: '先通过综合练习定位薄弱点，再针对性突破。',
};

const BASELINE_FOUNDATION: Record<SelfBaseline, string> = {
  starter: '你还在打基础阶段，',
  foundation: '你已有一定词汇基础，',
  developing: '你能理解简单内容，',
  functional: '你已经具备一定基础，',
  strong: '你的基础已经不错，',
};

function buildBreakthroughItem(context: FirstSessionContext): InsightItem {
  const obstacle = context.primaryObstacle;
  const description = BASELINE_FOUNDATION[context.selfBaseline] + OBSTACLE_ACTION[obstacle];
  return { icon: 'bolt', title: OBSTACLE_TITLE[obstacle], description };
}

// ── Item 3: 学习节奏 (supportPreference + dailyTime) ──

const RHYTHM: Record<SupportPreference, { title: string; description: string }> = {
  more_hints_guided: {
    title: '引导练习节奏',
    description: '把任务拆小，逐步提示，理解后再进入下一题。',
  },
  moderate_hints_self_try: {
    title: '自主尝试节奏',
    description: '先自己尝试，卡住时再给适量提示，逐步建立独立解题能力。',
  },
  few_hints_challenge: {
    title: '主动挑战节奏',
    description: '先独立完成任务，遇到问题后再提供关键提示和针对性复盘。',
  },
};

function buildRhythmItem(context: FirstSessionContext): InsightItem {
  const rhythm = RHYTHM[context.supportPreference];
  return {
    icon: 'clock',
    title: rhythm.title,
    description: `按你选择的每日 ${DAILY_TIME_SHORT[context.dailyTime]}，${rhythm.description}`,
  };
}

// ── Notice + primary action ──
// Honest, session-scoped only. Never "永久记住" / "能力画像" / "准确判断水平".

const HONEST_MEMORY = '本次体验已根据这些选择形成你的首次学习方向。';
const CET_ONLY_NOTICE = '当前体验版先开放 CET-4 基础训练，后续将逐步扩展对应方向。';

export function buildFirstSessionInsight(context: FirstSessionContext): FirstSessionInsight {
  const isCet = context.purpose === 'cet_exam';
  return {
    title: PAGE_TITLES[context.purpose],
    subtitle: PAGE_SUBTITLE,
    items: [
      buildDirectionItem(context),
      buildBreakthroughItem(context),
      buildRhythmItem(context),
    ],
    notice: isCet ? HONEST_MEMORY : `${HONEST_MEMORY}${CET_ONLY_NOTICE}`,
    primaryActionLabel: isCet ? '开始四级训练' : '先体验当前四级训练',
  };
}
