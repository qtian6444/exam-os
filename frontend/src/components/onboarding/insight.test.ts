import { describe, expect, it } from 'vitest';
import { buildFirstSessionInsight } from './insight';
import type { FirstSessionContext } from '../../types';

function ctx(overrides: Partial<FirstSessionContext> = {}): FirstSessionContext {
  return {
    purpose: 'cet_exam',
    targetScore: 'pass_425',
    selfBaseline: 'starter',
    primaryObstacle: 'vocabulary_insufficient',
    supportPreference: 'moderate_hints_self_try',
    purposeDetail: null,
    dailyTime: '10min',
    ...overrides,
  };
}

describe('buildFirstSessionInsight', () => {
  it('produces four distinct titles by purpose', () => {
    const titles = [
      buildFirstSessionInsight(ctx({ purpose: 'cet_exam' })).title,
      buildFirstSessionInsight(
        ctx({ purpose: 'long_term', targetScore: null, purposeDetail: 'comprehensive_english' }),
      ).title,
      buildFirstSessionInsight(
        ctx({ purpose: 'ielts_study_abroad', targetScore: null, purposeDetail: 'explore_basis' }),
      ).title,
      buildFirstSessionInsight(
        ctx({ purpose: 'career', targetScore: null, purposeDetail: 'no_fixed_scene' }),
      ).title,
    ];
    expect(titles).toEqual([
      '你的四级第一阶段训练方向',
      '你的长期英语提升方向',
      '你的英语基础准备方向',
      '你的职场英语起步方向',
    ]);
  });

  it('uses purposeDetail to drive the first direction (item 1)', () => {
    const meeting = buildFirstSessionInsight(
      ctx({ purpose: 'career', targetScore: null, purposeDetail: 'meeting_daily_comm' }),
    );
    expect(meeting.items[0].title).toBe('会议沟通优先');

    const listening = buildFirstSessionInsight(
      ctx({ purpose: 'long_term', targetScore: null, purposeDetail: 'listening_comprehension' }),
    );
    expect(listening.items[0].title).toBe('听力理解优先');
  });

  it('uses targetScore for CET (item 1) without promising a score', () => {
    const insight = buildFirstSessionInsight(ctx({ purpose: 'cet_exam', targetScore: 'pass_425' }));
    expect(insight.items[0].title).toBe('围绕四级目标建立训练重点');
    expect(insight.items[0].description).not.toMatch(/一定|保证|425 分|425分/);
  });

  it('turns primaryObstacle into an action title and merges selfBaseline (item 2)', () => {
    const insight = buildFirstSessionInsight(
      ctx({
        purpose: 'career',
        targetScore: null,
        purposeDetail: 'no_fixed_scene',
        selfBaseline: 'functional',
        primaryObstacle: 'writing_expression_hard',
      }),
    );
    expect(insight.items[1].title).toBe('突破写作和表达');
    expect(insight.items[1].description).toBe(
      '你已经具备一定基础，第一阶段更适合强化句子组织、常用表达和错误复盘。',
    );
  });

  it('lets selfBaseline change the item-2 explanation', () => {
    const strong = buildFirstSessionInsight(
      ctx({
        purpose: 'career',
        targetScore: null,
        purposeDetail: 'no_fixed_scene',
        selfBaseline: 'strong',
        primaryObstacle: 'writing_expression_hard',
      }),
    );
    const starter = buildFirstSessionInsight(
      ctx({
        purpose: 'career',
        targetScore: null,
        purposeDetail: 'no_fixed_scene',
        selfBaseline: 'starter',
        primaryObstacle: 'writing_expression_hard',
      }),
    );
    expect(strong.items[1].description).not.toBe(starter.items[1].description);
    expect(starter.items[1].description).toContain('你还在打基础阶段');
  });

  it('lets supportPreference and dailyTime shape the rhythm (item 3)', () => {
    const guided = buildFirstSessionInsight(
      ctx({ purpose: 'cet_exam', supportPreference: 'more_hints_guided', dailyTime: '5min' }),
    );
    const challenge = buildFirstSessionInsight(
      ctx({ purpose: 'cet_exam', supportPreference: 'few_hints_challenge', dailyTime: '30min+' }),
    );
    expect(guided.items[2].title).toBe('引导练习节奏');
    expect(guided.items[2].description).toContain('5 分钟');
    expect(challenge.items[2].title).toBe('主动挑战节奏');
    expect(challenge.items[2].description).toContain('30 分钟以上');
  });

  it('falls back safely when an optional field is missing (no crash)', () => {
    const insight = buildFirstSessionInsight(
      ctx({ purpose: 'long_term', targetScore: null, purposeDetail: null }),
    );
    expect(insight.items).toHaveLength(3);
    expect(insight.items[0].title).toBe('综合能力提升');
  });

  it('never promises a fixed score, deadline, or a false ability judgement', () => {
    const insight = buildFirstSessionInsight(ctx({ purpose: 'cet_exam', targetScore: 'score_500' }));
    const text = insight.items.map((i) => i.title + i.description).join(' ') + insight.notice;
    expect(text).not.toMatch(/三个月|3 个月|保证|一定达到|能力画像|准确判断|永久/);
    expect(insight.notice).toBe('本次体验已根据这些选择形成你的首次学习方向。');
  });

  it('gives non-CET exactly one CET-4 mention, only in the notice', () => {
    const insight = buildFirstSessionInsight(
      ctx({ purpose: 'career', targetScore: null, purposeDetail: 'no_fixed_scene' }),
    );
    const body = insight.items.map((i) => i.title + i.description).join(' ');
    expect(body).not.toContain('CET-4');
    expect(body).not.toContain('四级');
    expect(insight.notice).toContain('CET-4');
    expect((insight.notice.match(/CET-4/g) ?? []).length).toBe(1);
    expect(insight.primaryActionLabel).toBe('先体验当前四级训练');
  });
});
