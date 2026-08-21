// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen } from '@testing-library/react';
import App from './App';

const { useSessionMock } = vi.hoisted(() => ({ useSessionMock: vi.fn() }));

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

vi.mock('./components/onboarding/OnboardingFlow', () => ({
  default: () => <div>Onboarding content</div>,
}));

vi.mock('./hooks/useSession', () => ({
  useSession: useSessionMock,
}));

function defaultSession(overrides: Record<string, unknown> = {}) {
  return {
    stage: 'dashboard',
    session: { current: { sessionId: 'session-1' } },
    beforeSnapshot: null,
    lastStats: null,
    startLearning: vi.fn(),
    completeOnboarding: vi.fn(),
    completeSession: vi.fn(),
    backToDashboard: vi.fn(),
    ...overrides,
  };
}

beforeEach(() => {
  useSessionMock.mockReset();
});

afterEach(cleanup);

describe('App account experience integration', () => {
  it('places the unchanged Learning OS stage tree inside AccountAccess', () => {
    useSessionMock.mockReturnValue(defaultSession());
    render(<App />);

    const accountExperience = screen.getByTestId('account-experience');
    expect(accountExperience.textContent).toContain('Dashboard content');
  });

  it('renders onboarding when the session stage is onboarding', () => {
    useSessionMock.mockReturnValue(defaultSession({ stage: 'onboarding' }));
    render(<App />);

    expect(screen.getByText('Onboarding content')).toBeTruthy();
  });
});
