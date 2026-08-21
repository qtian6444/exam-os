// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import OnboardingFlow from './OnboardingFlow';
import type { OnboardingProfile } from '../../types';

// framer-motion in jsdom: replace motion.* with passthrough DOM elements and
// AnimatePresence with a plain fragment so step transitions render synchronously.
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ className, children }: { className?: string; children?: ReactNode }) => (
      <div className={className}>{children}</div>
    ),
    button: ({
      className,
      children,
      onClick,
      disabled,
      type,
    }: {
      className?: string;
      children?: ReactNode;
      onClick?: () => void;
      disabled?: boolean;
      type?: 'button' | 'submit' | 'reset';
    }) => (
      <button className={className} onClick={onClick} disabled={disabled} type={type}>
        {children}
      </button>
    ),
  },
  AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

afterEach(cleanup);

function start() {
  fireEvent.click(screen.getByRole('button', { name: '开始了解' }));
}

function completeCetFlow() {
  start();
  fireEvent.click(screen.getByRole('button', { name: '通过四六级考试' }));
  fireEvent.click(screen.getByRole('button', { name: '先通过 425 分' }));
  fireEvent.click(screen.getByRole('button', { name: '2026 年 12 月' }));
  fireEvent.click(screen.getByRole('button', { name: '单词认识得不多，读题比较吃力' }));
  fireEvent.click(screen.getByRole('button', { name: '词汇量不足' }));
  fireEvent.click(screen.getByRole('button', { name: '提示适中，先让我自己尝试' }));
  fireEvent.click(screen.getByRole('button', { name: '5 分钟 · 轻量体验' }));
}

describe('OnboardingFlow', () => {
  it('shows the welcome screen first', () => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);

    expect(screen.getByText('Exam OS')).toBeTruthy();
    expect(screen.getByRole('button', { name: '开始了解' })).toBeTruthy();
    // Purpose not chosen yet → non-CET branch default (8 steps).
    expect(screen.getByText(/共 8 步/)).toBeTruthy();
  });

  it.each([
    ['通过四六级考试', '这次四级，你最希望达到什么目标？'],
    ['提升长期英语能力', '你最希望长期提升哪方面？'],
    ['为未来雅思·留学准备', '你目前处于哪个阶段？'],
    ['工作和职业发展', '你最常需要英语完成什么？'],
  ])('shows the correct conditional question after choosing %s', (purposeLabel, question) => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: purposeLabel }));
    expect(screen.getByText(question)).toBeTruthy();
  });

  it('collects every answer for a CET goal and submits the full profile', async () => {
    const onComplete = vi.fn(async (): Promise<boolean> => true);
    render(<OnboardingFlow onComplete={onComplete} />);

    completeCetFlow();

    expect(screen.getByText('你的四级第一阶段训练方向')).toBeTruthy();
    expect(screen.getByText(/共 9 步/)).toBeTruthy();
    // CET branch shows its two extra fields in the collapsed raw-answer list.
    expect(screen.getByText('四级目标：先通过 425 分')).toBeTruthy();
    expect(screen.getByText('考试时间：2026 年 12 月')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '开始四级训练' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith<[OnboardingProfile]>({
      examType: 'CET4',
      examBatch: '2026-12',
      dailyTime: '5min',
      purpose: 'cet_exam',
      targetScore: 'pass_425',
      selfBaseline: 'starter',
      primaryObstacle: 'vocabulary_insufficient',
      supportPreference: 'moderate_hints_self_try',
      purposeDetail: null,
    });
  });

  it('skips CET questions for a non-CET goal and states that only CET-4 training is open', async () => {
    const onComplete = vi.fn(async (): Promise<boolean> => true);
    render(<OnboardingFlow onComplete={onComplete} />);

    start();
    fireEvent.click(screen.getByRole('button', { name: '提升长期英语能力' }));

    // The conditional is the long-term focus question — NOT 四级目标 / 考试时间.
    expect(screen.getByText('你最希望长期提升哪方面？')).toBeTruthy();
    expect(screen.queryByText('这次四级，你最希望达到什么目标？')).toBeNull();
    expect(screen.queryByText('你打算什么时候考试？')).toBeNull();
    expect(screen.getByText(/共 8 步/)).toBeTruthy();

    // Continue through the shared questions. The selfBaseline option label is now
    // the long_term wording, never the CET "四级题" wording.
    fireEvent.click(screen.getByRole('button', { name: '听力理解' }));
    fireEvent.click(screen.getByRole('button', { name: '认识一些单词，但完整句子经常看不懂' }));
    fireEvent.click(screen.getByRole('button', { name: '单词认识但句子看不懂' }));
    fireEvent.click(screen.getByRole('button', { name: '多给提示，带着我一步步练' }));
    fireEvent.click(screen.getByRole('button', { name: '10 分钟 · 日常练习' }));

    // Result page omits the CET-only fields and states the honest CET-4-only
    // notice (CET-4 appears exactly once, in that transparent notice).
    expect(screen.getByText('你的长期英语提升方向')).toBeTruthy();
    expect(screen.queryByText(/四级目标/)).toBeNull();
    expect(screen.queryByText(/考试时间/)).toBeNull();
    expect(screen.getByText(/当前体验版先开放 CET-4 基础训练/)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: '先体验当前四级训练' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith<[OnboardingProfile]>({
      examType: 'CET4',
      examBatch: 'undecided',
      dailyTime: '10min',
      purpose: 'long_term',
      targetScore: null,
      selfBaseline: 'foundation',
      primaryObstacle: 'words_known_sentences_unclear',
      supportPreference: 'more_hints_guided',
      purposeDetail: 'listening_comprehension',
    });
  });

  it('keeps the selected answer highlighted on back, and uses the modified answer', async () => {
    const onComplete = vi.fn(async (): Promise<boolean> => true);
    render(<OnboardingFlow onComplete={onComplete} />);

    start();
    fireEvent.click(screen.getByRole('button', { name: '通过四六级考试' }));
    fireEvent.click(screen.getByRole('button', { name: '先通过 425 分' }));

    // Back to the target-score question: the earlier choice is still selected.
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    expect(screen.getByRole('button', { name: '先通过 425 分', pressed: true })).toBeTruthy();

    // Modify the answer, then continue to the end.
    fireEvent.click(screen.getByRole('button', { name: '冲击 500 分以上' }));
    fireEvent.click(screen.getByRole('button', { name: '2026 年 12 月' }));
    fireEvent.click(screen.getByRole('button', { name: '单词认识得不多，读题比较吃力' }));
    fireEvent.click(screen.getByRole('button', { name: '词汇量不足' }));
    fireEvent.click(screen.getByRole('button', { name: '提示适中，先让我自己尝试' }));
    fireEvent.click(screen.getByRole('button', { name: '5 分钟 · 轻量体验' }));
    fireEvent.click(screen.getByRole('button', { name: '开始四级训练' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith<[OnboardingProfile]>(
      expect.objectContaining({ targetScore: 'score_500' }),
    );
  });

  it('clears CET answers when switching away, and the summary omits the old branch fields', async () => {
    const onComplete = vi.fn(async (): Promise<boolean> => true);
    render(<OnboardingFlow onComplete={onComplete} />);

    start();
    fireEvent.click(screen.getByRole('button', { name: '通过四六级考试' }));
    fireEvent.click(screen.getByRole('button', { name: '先通过 425 分' }));
    fireEvent.click(screen.getByRole('button', { name: '2026 年 12 月' }));

    // Walk back to purpose and switch to a non-CET goal (selfBaseline → examBatch →
    // targetScore → purpose = three steps back).
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '提升长期英语能力' }));

    // Non-CET conditional immediately (no target-score step).
    expect(screen.getByText('你最希望长期提升哪方面？')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '听力理解' }));
    fireEvent.click(screen.getByRole('button', { name: '认识一些单词，但完整句子经常看不懂' }));
    fireEvent.click(screen.getByRole('button', { name: '单词认识但句子看不懂' }));
    fireEvent.click(screen.getByRole('button', { name: '多给提示，带着我一步步练' }));
    fireEvent.click(screen.getByRole('button', { name: '10 分钟 · 日常练习' }));

    // Result page shows the non-CET detail, not the stale CET fields.
    expect(screen.getByText('你的长期英语提升方向')).toBeTruthy();
    expect(screen.getByText(/长期提升方向/)).toBeTruthy();
    expect(screen.queryByText(/四级目标/)).toBeNull();
    expect(screen.queryByText(/考试时间/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '先体验当前四级训练' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
    expect(onComplete).toHaveBeenCalledWith<[OnboardingProfile]>(
      expect.objectContaining({
        purpose: 'long_term',
        purposeDetail: 'listening_comprehension',
        targetScore: null,
      }),
    );
  });

  it('clears the previous purposeDetail when switching between non-CET goals', () => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);

    start();
    fireEvent.click(screen.getByRole('button', { name: '提升长期英语能力' }));
    fireEvent.click(screen.getByRole('button', { name: '听力理解' }));

    // Back to purpose, switch to a different non-CET goal.
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '工作和职业发展' }));

    expect(screen.getByText('你最常需要英语完成什么？')).toBeTruthy();
    // The long-term detail must not linger as a selected choice.
    expect(
      screen.queryByRole('button', { name: '听力理解', pressed: true }),
    ).toBeNull();
  });

  it('shows an error and allows retry after a failed save', async () => {
    const onComplete = vi
      .fn<() => Promise<boolean>>()
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);
    render(<OnboardingFlow onComplete={onComplete} />);

    completeCetFlow();
    fireEvent.click(screen.getByRole('button', { name: '开始四级训练' }));

    await waitFor(() =>
      expect(screen.getByText('保存失败，请检查网络后重试。')).toBeTruthy(),
    );

    const retry = screen.getByRole('button', { name: '开始四级训练' });
    expect((retry as HTMLButtonElement).disabled).toBe(false);

    fireEvent.click(retry);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(2));
  });

  it('disables submit while a save is in-flight (no double submit)', async () => {
    let resolve!: (v: boolean) => void;
    const onComplete = vi.fn(
      () =>
        new Promise<boolean>((res) => {
          resolve = res;
        }),
    );
    render(<OnboardingFlow onComplete={onComplete} />);

    completeCetFlow();
    fireEvent.click(screen.getByRole('button', { name: '开始四级训练' }));

    expect(onComplete).toHaveBeenCalledTimes(1);
    const inFlight = screen.getByRole('button', { name: '正在进入训练…' });
    expect((inFlight as HTMLButtonElement).disabled).toBe(true);

    resolve(true);
    await waitFor(() => expect(onComplete).toHaveBeenCalledTimes(1));
  });

  it('shows the CET selfBaseline question and options', () => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '通过四六级考试' }));
    fireEvent.click(screen.getByRole('button', { name: '先通过 425 分' }));
    fireEvent.click(screen.getByRole('button', { name: '2026 年 12 月' }));

    expect(screen.getByText('现在做四级题时，哪句话更像你？')).toBeTruthy();
    expect(screen.getByRole('button', { name: '单词认识得不多，读题比较吃力' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '基本能通过，想继续提高分数' })).toBeTruthy();
  });

  it.each([
    [
      '提升长期英语能力',
      '综合英语能力',
      '现在学习和使用英语时，哪句话更像你？',
      '常用单词也不太熟悉，需要从基础开始',
      '已经有一定基础，想提高表达和理解深度',
    ],
    [
      '为未来雅思·留学准备',
      '先了解和打基础',
      '面对未来的雅思或留学英语，你现在更接近哪种情况？',
      '目前基础较弱，想先打好词汇和句子基础',
      '英语基础较好，想进一步提升学术能力',
    ],
    [
      '工作和职业发展',
      '暂时没有固定场景',
      '在工作或职业场景中使用英语时，哪句话更像你？',
      '目前很少使用英语，想先建立基础',
      '已经能够使用英语工作，想表达得更专业',
    ],
  ])(
    'shows the correct selfBaseline wording for %s',
    (purposeLabel, detailLabel, question, firstOpt, lastOpt) => {
      render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);
      start();
      fireEvent.click(screen.getByRole('button', { name: purposeLabel }));
      fireEvent.click(screen.getByRole('button', { name: detailLabel }));

      expect(screen.getByText(question)).toBeTruthy();
      expect(screen.getByRole('button', { name: firstOpt })).toBeTruthy();
      expect(screen.getByRole('button', { name: lastOpt })).toBeTruthy();
    },
  );

  it('never shows 四级/分数/过线 wording in a non-CET collection question', () => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '为未来雅思·留学准备' }));
    fireEvent.click(screen.getByRole('button', { name: '先了解和打基础' }));

    const step = screen
      .getByText('面对未来的雅思或留学英语，你现在更接近哪种情况？')
      .closest('.onboarding__step');
    expect(step?.textContent).not.toMatch(/四级|分数|过线|真题/);
  });

  it('shows CET-4 exactly once on a non-CET result page, only in the notice', () => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '工作和职业发展' }));
    fireEvent.click(screen.getByRole('button', { name: '暂时没有固定场景' }));
    fireEvent.click(screen.getByRole('button', { name: '目前很少使用英语，想先建立基础' }));
    fireEvent.click(screen.getByRole('button', { name: '暂时不确定，先综合练习' }));
    fireEvent.click(screen.getByRole('button', { name: '少给提示，直接进行挑战' }));
    fireEvent.click(screen.getByRole('button', { name: '5 分钟 · 轻量体验' }));

    const text = document.querySelector('.onboarding')?.textContent ?? '';
    expect((text.match(/CET-4/g) ?? []).length).toBe(1);
  });

  it('clears selfBaseline when the purpose changes', () => {
    render(<OnboardingFlow onComplete={vi.fn(async () => true)} />);
    start();
    fireEvent.click(screen.getByRole('button', { name: '通过四六级考试' }));
    fireEvent.click(screen.getByRole('button', { name: '先通过 425 分' }));
    fireEvent.click(screen.getByRole('button', { name: '2026 年 12 月' }));
    fireEvent.click(screen.getByRole('button', { name: '单词认识得不多，读题比较吃力' }));

    // Walk back to purpose (primaryObstacle → selfBaseline → examBatch →
    // targetScore → purpose) and switch branch.
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '返回上一题' }));
    fireEvent.click(screen.getByRole('button', { name: '工作和职业发展' }));
    fireEvent.click(screen.getByRole('button', { name: '暂时没有固定场景' }));

    // The selfBaseline step now shows the career wording; the CET option is gone.
    expect(screen.getByText('在工作或职业场景中使用英语时，哪句话更像你？')).toBeTruthy();
    expect(screen.queryByRole('button', { name: '单词认识得不多，读题比较吃力' })).toBeNull();
  });
});
