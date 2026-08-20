// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('./features/account/AccountAccess', () => ({
  default: ({ children }: { children: ReactNode }) => (
    <section data-testid="account-experience">{children}</section>
  ),
}));

vi.mock('./components/Dashboard', () => ({
  default: () => <div>Dashboard content</div>,
}));

vi.mock('./components/LearningShell', () => ({
  default: () => <div>Learning content</div>,
}));

vi.mock('./components/SessionComplete', () => ({
  default: () => <div>Result content</div>,
}));

vi.mock('./hooks/useSession', () => ({
  useSession: () => ({
    stage: 'dashboard',
    session: { current: { sessionId: 'session-1' } },
    beforeSnapshot: null,
    lastStats: null,
    startLearning: vi.fn(),
    completeSession: vi.fn(),
    backToDashboard: vi.fn(),
  }),
}));

afterEach(cleanup);

describe('App account experience integration', () => {
  it('places the unchanged Learning OS stage tree inside AccountAccess', () => {
    render(<App />);

    const accountExperience = screen.getByTestId('account-experience');
    expect(accountExperience.textContent).toContain('Dashboard content');
  });
});
