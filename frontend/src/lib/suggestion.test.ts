import { describe, it, expect } from 'vitest';
import { generateSuggestion } from './suggestion';
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
});
