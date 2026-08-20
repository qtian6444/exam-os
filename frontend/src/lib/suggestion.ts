// ── AI Learning Suggestion (rule-based, V0) ──
//
// A deterministic "learning state → advice" generator. It reads the ability
// snapshot and produces a personalized headline + concrete suggestions, without
// any network call. This is the demo-grade "AI 理解用户学习状态" layer: the
// system reasons about the user's scores and confidence to decide what to say.
//
// Because it is a pure function it can never fail or white-screen, and it is
// trivially unit-testable. It is deliberately NOT an LLM call: an external model
// would add latency and a failure mode to a page that must always render.
//
// Three public entry points, one shared reasoning core:
//   generateSuggestion(snapshot, context?)  — "你现在是什么状态，该怎么练"
//   generateDailyGoal(snapshot)             — "今天该学什么"
//   analyzeResult(before, after, done)      — "这次学完，系统怎么看你"

import type { AbilitySnapshot, AbilityKey } from './ability';

export interface LearningSuggestion {
  headline: string;
  items: string[];
}

export interface DailyGoal {
  goal: string;
  action: string;
}

export interface ResultFeedback {
  improvements: string[]; // 本次提升点
  weakPoints: string[];   // 当前薄弱点
  nextAction: string;     // 下一次学习建议
}

interface Dimension {
  key: AbilityKey;
  label: string;
  advice: string;
}

const DIMENSIONS: Dimension[] = [
  { key: 'vocabulary', label: '词汇', advice: '阅读时记录高频生词，每天复习一组，词汇量会稳步增长。' },
  { key: 'sentence', label: '长难句', advice: '优先拆解长难句：先找主句，再理清修饰关系，不要逐词翻译。' },
  { key: 'reading', label: '阅读', advice: '做阅读时先看题干再回原文定位，练习排除干扰项。' },
  { key: 'listening', label: '听力', advice: '每天精听一段真题音频，先盲听再对照原文。' },
  { key: 'writing', label: '写作', advice: '积累常用句型模板，每周写一篇并复盘语法错误。' },
];

function scoreOf(s: AbilitySnapshot, key: AbilityKey): number {
  switch (key) {
    case 'vocabulary': return s.vocabulary;
    case 'sentence': return s.sentence;
    case 'reading': return s.reading;
    case 'listening': return s.listening;
    case 'writing': return s.writing;
  }
}

function confidenceOf(s: AbilitySnapshot, key: AbilityKey): number {
  switch (key) {
    case 'vocabulary': return s.confidence_vocabulary;
    case 'sentence': return s.confidence_sentence;
    case 'reading': return s.confidence_reading;
    case 'listening': return s.confidence_listening;
    case 'writing': return s.confidence_writing;
  }
}

function averageConfidence(s: AbilitySnapshot): number {
  const values = DIMENSIONS.map((d) => confidenceOf(s, d.key));
  return values.reduce((a, b) => a + b, 0) / values.length;
}

function hasAnyEvidence(s: AbilitySnapshot): boolean {
  return DIMENSIONS.some((d) => scoreOf(s, d.key) > 0 || confidenceOf(s, d.key) > 0);
}

function weakestDimension(s: AbilitySnapshot): { dim: Dimension; score: number } {
  let dim = DIMENSIONS[0];
  let score = scoreOf(s, DIMENSIONS[0].key);
  for (const d of DIMENSIONS) {
    const sc = scoreOf(s, d.key);
    if (sc < score) {
      score = sc;
      dim = d;
    }
  }
  return { dim, score };
}

function strongestDimension(s: AbilitySnapshot): { dim: Dimension; score: number } {
  let dim = DIMENSIONS[0];
  let score = scoreOf(s, DIMENSIONS[0].key);
  for (const d of DIMENSIONS) {
    const sc = scoreOf(s, d.key);
    if (sc > score) {
      score = sc;
      dim = d;
    }
  }
  return { dim, score };
}

function toPercent(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100);
}

export function generateSuggestion(
  snapshot: AbilitySnapshot,
  context?: { streak?: number | null },
): LearningSuggestion {
  if (!hasAnyEvidence(snapshot)) {
    return {
      headline: '完成一次学习，我会更了解你',
      items: [
        '先完成 6 道题，建立你的初始能力画像',
        '我会根据你的作答，定位薄弱环节并给出针对性建议',
      ],
    };
  }

  const { dim: weakest } = weakestDimension(snapshot);
  const { dim: strongest } = strongestDimension(snapshot);
  const conf = averageConfidence(snapshot);

  let headline: string;
  if (strongest.key === weakest.key) {
    headline = conf < 0.3
      ? `我还在认识你的水平，从「${weakest.label}」开始`
      : `继续巩固「${weakest.label}」`;
  } else if (conf < 0.3) {
    headline = `我还在认识你的水平，先从「${weakest.label}」开始`;
  } else {
    headline = `你的「${strongest.label}」表现最好，重点突破「${weakest.label}」`;
  }

  const items: string[] = [weakest.advice];

  const second = DIMENSIONS
    .filter((d) => d.key !== weakest.key)
    .reduce<Dimension | null>((acc, d) => {
      if (acc === null || scoreOf(snapshot, d.key) < scoreOf(snapshot, acc.key)) return d;
      return acc;
    }, null);
  if (second) {
    items.push(second.advice);
  }

  if (conf < 0.3) {
    items.push('多完成几次练习，我对你的判断会越来越准。');
  }

  // 连续学习 → 鼓励保持（只在有 streak 上下文时生效）。
  if (context?.streak && context.streak >= 2) {
    items.push(`已连续学习 ${context.streak} 天，坚持就是最大的进步。`);
  }

  return { headline, items };
}

export function generateDailyGoal(snapshot: AbilitySnapshot): DailyGoal {
  if (!hasAnyEvidence(snapshot)) {
    return {
      goal: '建立你的能力画像',
      action: '完成 6 道题，让系统了解你的起点',
    };
  }

  const { dim, score } = weakestDimension(snapshot);
  if (score < 0.4) {
    return {
      goal: `重点突破「${dim.label}」`,
      action: `完成今日练习，我会围绕「${dim.label}」给出针对性建议`,
    };
  }

  return {
    goal: `巩固「${dim.label}」，挑战更高难度`,
    action: '完成今日练习，保持状态并持续提升',
  };
}

export function analyzeResult(
  before: AbilitySnapshot,
  after: AbilitySnapshot,
  cardsCompleted: number,
): ResultFeedback {
  const improved: string[] = [];
  const declined: string[] = [];
  for (const d of DIMENSIONS) {
    const delta = scoreOf(after, d.key) - scoreOf(before, d.key);
    const pct = Math.round(delta * 100);
    if (pct > 0) improved.push(`「${d.label}」+${pct}`);
    else if (pct < 0) declined.push(`「${d.label}」${pct}`);
  }

  const weakDims = DIMENSIONS
    .filter((d) => scoreOf(after, d.key) < 0.5)
    .sort((a, b) => scoreOf(after, a.key) - scoreOf(after, b.key))
    .slice(0, 2);

  const improvements = improved.length > 0
    ? improved
    : [`完成 ${cardsCompleted} 道题，画像已记录`, '多做对几题，能力会明显上升'];

  const weakPoints = weakDims.length > 0
    ? weakDims.map((d) => `「${d.label}」${toPercent(scoreOf(after, d.key))}分`)
    : ['各维度表现稳定，继续保持'];

  const { dim: weakest } = weakestDimension(after);
  let nextAction = weakest.advice;
  if (declined.length > 0) {
    // 能力下降 → 恢复建议（基于真实 delta，非虚构）。
    nextAction += `（${declined.join('、')} 略有下降，别灰心，再来几题就能回升）`;
  }

  return { improvements, weakPoints, nextAction };
}
