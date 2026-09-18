// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import LearningShell from './LearningShell';
import { CardType, type ChoiceCardData } from '../types';

const { getNextCardMock, getTotalCardsMock, applyLearningEvidenceMock } = vi.hoisted(() => ({
  getNextCardMock: vi.fn(),
  getTotalCardsMock: vi.fn(),
  applyLearningEvidenceMock: vi.fn(),
}));

vi.mock('framer-motion', () => {
  const Div = ({ children, className }: { children?: ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  );
  const Button = ({
    children,
    className,
    disabled,
    onClick,
    type,
  }: {
    children?: ReactNode;
    className?: string;
    disabled?: boolean;
    onClick?: () => void;
    type?: 'button' | 'submit' | 'reset';
  }) => (
    <button className={className} disabled={disabled} onClick={onClick} type={type}>
      {children}
    </button>
  );
  return {
    AnimatePresence: ({ children }: { children?: ReactNode }) => <>{children}</>,
    motion: { div: Div, button: Button },
    Reorder: {
      Group: Div,
      Item: Div,
    },
  };
});

vi.mock('../data/mock', () => ({
  getNextCard: getNextCardMock,
  getTotalCards: getTotalCardsMock,
}));

vi.mock('../lib/db', () => ({
  applyLearningEvidence: applyLearningEvidenceMock,
}));

vi.mock('../lib/deepseek', () => ({
  getBreakdown: vi.fn(),
}));

vi.mock('./SessionTimer', () => ({
  default: () => <span>timer</span>,
}));

function choice(cardId: string, sentence: string): ChoiceCardData {
  return {
    cardId,
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence,
    options: [
      { id: 'A', text: '正确答案' },
      { id: 'B', text: '干扰项' },
    ],
    correctOptionId: 'A',
    presentationVariant: 'cloze',
  };
}

describe('LearningShell training loop', () => {
  const first = choice('choice-1', 'First sentence');
  const second = choice('choice-2', 'Second sentence');

  beforeEach(() => {
    getNextCardMock.mockReset();
    getTotalCardsMock.mockReturnValue(2);
    applyLearningEvidenceMock.mockReset().mockResolvedValue(true);
    const queue = [first, second];
    getNextCardMock.mockImplementation(() => queue.shift() ?? null);
  });

  afterEach(cleanup);

  it('runs wrong → retry → correct, then reveals after a second wrong answer and counts all cards', async () => {
    const onComplete = vi.fn();
    render(<LearningShell sessionId="session-1" onComplete={onComplete} />);

    expect(await screen.findByText('First sentence')).toBeTruthy();
    expect((screen.getByRole('button', { name: '提交' }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByRole('button', { name: '干扰项' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(screen.getByText('需要调整')).toBeTruthy();
    expect(screen.getByText('本题涉及')).toBeTruthy();
    expect(screen.getByText('长难句、阅读')).toBeTruthy();
    expect(screen.getByRole('button', { name: '再试一次' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '干扰项' }).className).toContain(
      'choice-card__option--feedback-wrong',
    );
    expect(screen.queryByText('正确答案', { selector: 'p' })).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '再试一次' }));
    fireEvent.click(screen.getByRole('button', { name: '正确答案' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    expect(screen.getByText('✓ 正确')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '继续' }));

    expect(await screen.findByText('Second sentence')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '干扰项' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));
    fireEvent.click(screen.getByRole('button', { name: '再试一次' }));
    fireEvent.click(screen.getByRole('button', { name: '干扰项' }));
    fireEvent.click(screen.getByRole('button', { name: '提交' }));

    expect(screen.getByText('正确答案', { selector: 'p' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '正确答案' }).className).toContain(
      'choice-card__option--feedback-correct',
    );
    fireEvent.click(screen.getByRole('button', { name: '继续' }));

    await waitFor(() => expect(onComplete).toHaveBeenCalledWith(expect.objectContaining({
      cardsCompleted: 2,
      elapsed: expect.any(Number),
      evidence: [
        expect.objectContaining({
          cardId: 'choice-1',
          outcome: 'RETRY_CORRECT',
          attempts: 2,
          dimensions: ['sentence', 'reading'],
        }),
        expect.objectContaining({
          cardId: 'choice-2',
          outcome: 'REVEALED_AFTER_RETRY',
          attempts: 2,
          dimensions: ['sentence', 'reading'],
        }),
      ],
    })));
    expect(applyLearningEvidenceMock).toHaveBeenCalledTimes(2);
    expect(applyLearningEvidenceMock).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sessionId: 'session-1',
      cardId: 'choice-1',
      correct: true,
      userAnswer: { selectedOptionId: 'A' },
    }));
    expect(applyLearningEvidenceMock).toHaveBeenNthCalledWith(2, expect.objectContaining({
      sessionId: 'session-1',
      cardId: 'choice-2',
      correct: false,
      userAnswer: { selectedOptionId: 'B' },
    }));
  });

  it('only dequeues the initial card once when mounted under StrictMode', async () => {
    const { StrictMode } = await import('react');
    render(
      <StrictMode>
        <LearningShell sessionId="strict-session" onComplete={vi.fn()} />
      </StrictMode>,
    );

    expect(await screen.findByText('First sentence')).toBeTruthy();
    expect(getNextCardMock).toHaveBeenCalledTimes(1);
  });
});
