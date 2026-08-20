// ── AI Learning Suggestion (rule-based, V0) ──
//
// A deterministic "learning state → advice" generator. It reads the ability
// snapshot and produces a personalized headline + a short list of concrete
// suggestions, without any network call. This is the demo-grade "AI 理解用户
// 学习状态" layer: the system reasons about the user's scores and confidence to
// decide what to say. Because it is a pure function it can never fail or white-
// screen, and it is trivially unit-testable.
//
// It is deliberately NOT an LLM call: an external model would add latency and a
// failure mode to a page that must always render (see P2 页面稳定要求).

import type { AbilitySnapshot, AbilityKey } from './ability';

export interface LearningSuggestion {
  headline: string;
  items: string[];
}

interface Dimension {
  key: AbilityKey;
  label: string;
  advice: string;
}

const DIMENSIONS: Dimension[] = [
  { key: 'vocabulary', label: '词汇', advice: '阅读时记录高频生词，每天复习一组，词汇量会稳步增长。' },
  { key: 'sentence', label: '长难句', advice: '优先拆解长难句：先找主句，再理清修饰关系，不要逐词翻译。' },
  { key: 'reading', label: '阅读理解', advice: '做阅读时先看题干再回原文定位，练习排除干扰项。' },
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

export function generateSuggestion(snapshot: AbilitySnapshot): LearningSuggestion {
  if (!hasAnyEvidence(snapshot)) {
    return {
      headline: '完成一次学习，我会更了解你',
      items: [
        '先完成 6 道题，建立你的初始能力画像',
        '我会根据你的作答，定位薄弱环节并给出针对性建议',
      ],
    };
  }

  // Weakest dimension by score drives the primary advice; strongest is used to
  // frame the headline. Guard the degenerate single-dimension case so the copy
  // never reads "X is best, focus on X".
  let weakest: Dimension = DIMENSIONS[0];
  let weakestScore = scoreOf(snapshot, DIMENSIONS[0].key);
  let strongest: Dimension = DIMENSIONS[0];
  let strongestScore = weakestScore;
  for (const d of DIMENSIONS) {
    const sc = scoreOf(snapshot, d.key);
    if (sc < weakestScore) {
      weakestScore = sc;
      weakest = d;
    }
    if (sc > strongestScore) {
      strongestScore = sc;
      strongest = d;
    }
  }

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

  // A second-weakest dimension, when there is a meaningful runner-up.
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

  return { headline, items };
}
