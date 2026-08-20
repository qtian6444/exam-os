import { describe, it, expect } from 'vitest';
import { generateSuggestion, generateDailyGoal, analyzeResult } from './suggestion';
import { blankSnapshot, type AbilitySnapshot } from './ability';

function snap(partial: Partial<AbilitySnapshot>): AbilitySnapshot {
  return { ...blankSnapshot(), ...partial };
}

describe('generateSuggestion (rule-based learning suggestion)', () => {
  it('fresh user (no evidence) → onboarding-style suggestion', () => {
    const s = generateSuggestion(blankSnapshot());
    expect(s.headline).toContain('完成一次学习');
    expect(s.items.length).toBeGreaterThan(0);
  });

  it('weakest dimension drives the primary advice when there is evidence', () => {
    const s = generateSuggestion(
      snap({
        vocabulary: 0.7,
        sentence: 0.2,
        reading: 0.5,
        listening: 0.4,
        writing: 0.3,
      }),
    );
    // sentence (0.2) is the weakest → headline and first item both name it.
    expect(s.headline).toContain('长难句');
    expect(s.items[0]).toContain('长难句');
  });

  it('low overall confidence adds a "keep practicing" note', () => {
    const s = generateSuggestion(
      snap({
        vocabulary: 0.1,
        sentence: 0.1,
        reading: 0.1,
        confidence_vocabulary: 0.1,
        confidence_sentence: 0.1,
        confidence_reading: 0.1,
      }),
    );
    expect(s.items.some((i) => i.includes('多完成几次'))).toBe(true);
  });

  it('all-equal scores do not produce a contradictory "best vs focus" headline', () => {
    const s = generateSuggestion(
      snap({
        vocabulary: 0.4,
        sentence: 0.4,
        reading: 0.4,
        listening: 0.4,
        writing: 0.4,
      }),
    );
    expect(s.headline).not.toMatch(/表现最好.*重点突破/);
  });

  it('never throws and always returns a non-empty item list', () => {
    const s = generateSuggestion(blankSnapshot());
    expect(Array.isArray(s.items)).toBe(true);
    expect(s.items.length).toBeGreaterThan(0);
  });

  it('appends a streak-keep note only when streak >= 2', () => {
    const base = snap({ vocabulary: 0.5, sentence: 0.3, reading: 0.4, listening: 0.4, writing: 0.4 });
    expect(generateSuggestion(base, { streak: 1 }).items.some((i) => i.includes('连续学习'))).toBe(false);
    expect(generateSuggestion(base, { streak: 3 }).items.some((i) => i.includes('连续学习 3 天'))).toBe(true);
    // No context → no streak note (backward compatible).
    expect(generateSuggestion(base).items.some((i) => i.includes('连续学习'))).toBe(false);
  });
});

describe('generateDailyGoal (today goal + next action)', () => {
  it('fresh user → build the profile', () => {
    const g = generateDailyGoal(blankSnapshot());
    expect(g.goal).toContain('能力画像');
    expect(g.action).toContain('6');
  });

  it('weak dimension below 0.4 → targeted breakthrough', () => {
    const g = generateDailyGoal(snap({ vocabulary: 0.6, sentence: 0.2, reading: 0.5, listening: 0.5, writing: 0.5 }));
    expect(g.goal).toContain('长难句');
    expect(g.action).toContain('长难句');
  });

  it('all dimensions solid → consolidate and push higher', () => {
    const g = generateDailyGoal(snap({ vocabulary: 0.7, sentence: 0.6, reading: 0.8, listening: 0.6, writing: 0.6 }));
    expect(g.goal).toContain('巩固');
  });
});

describe('analyzeResult (session feedback from before/after diff)', () => {
  const before = snap({ vocabulary: 0.4, sentence: 0.3, reading: 0.5, listening: 0.4, writing: 0.4 });
  const after = snap({ vocabulary: 0.5, sentence: 0.28, reading: 0.6, listening: 0.4, writing: 0.4 });

  it('lists improved dimensions from a positive delta', () => {
    const r = analyzeResult(before, after, 6);
    expect(r.improvements.some((i) => i.includes('词汇') && i.includes('+10'))).toBe(true);
    expect(r.improvements.some((i) => i.includes('阅读'))).toBe(true);
  });

  it('flags the current weakest dimensions with scores', () => {
    const r = analyzeResult(before, after, 6);
    expect(r.weakPoints.length).toBeGreaterThan(0);
    expect(r.weakPoints[0]).toContain('长难句');
  });

  it('adds a recovery note when a dimension declined', () => {
    const r = analyzeResult(before, after, 6);
    expect(r.nextAction).toContain('略有下降');
  });

  it('falls back to a recorded-profile message when nothing improved', () => {
    const same = snap({ vocabulary: 0.5, sentence: 0.5, reading: 0.5, listening: 0.5, writing: 0.5 });
    const r = analyzeResult(same, same, 6);
    expect(r.improvements.some((i) => i.includes('6 道题'))).toBe(true);
    expect(r.nextAction).not.toContain('略有下降');
  });

  it('reports stability when no dimension is below 0.5', () => {
    const strong = snap({ vocabulary: 0.8, sentence: 0.7, reading: 0.9, listening: 0.7, writing: 0.7 });
    const r = analyzeResult(strong, strong, 6);
    expect(r.weakPoints).toEqual(['各维度表现稳定，继续保持']);
  });
});
