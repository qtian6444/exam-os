import { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import LearningShell from './components/LearningShell';
import SessionComplete from './components/SessionComplete';
import AccountAccess from './features/account/AccountAccess';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import { useSession } from './hooks/useSession';
import type { SessionStats } from './types';

export default function App() {
  const {
    stage,
    session,
    profileContext,
    lastStats,
    startLearning,
    startGuestExperience,
    completeOnboarding,
    completeSession,
    backToDashboard,
  } = useSession();

  const handleLearningComplete = useCallback(
    (stats: SessionStats) => {
      completeSession(stats);
    },
    [completeSession],
  );

  return (
    <div className="app">
      <AccountAccess onGuestExperienceStart={startGuestExperience}>
        <AnimatePresence mode="wait">
          {stage === 'onboarding' && (
            <OnboardingFlow
              key="onboarding"
              onComplete={completeOnboarding}
            />
          )}

          {stage === 'dashboard' && (
            <Dashboard
              key="dashboard"
              onStart={startLearning}
              profileContext={profileContext}
            />
          )}

          {stage === 'learning' && (
            <LearningShell
              key="learning"
              sessionId={session.current.sessionId}
              onComplete={handleLearningComplete}
            />
          )}

          {stage === 'result' && (
            <SessionComplete
              key="result"
              cardsCompleted={lastStats?.cardsCompleted ?? 0}
              elapsed={lastStats?.elapsed ?? 0}
              evidence={lastStats?.evidence ?? []}
              onBack={backToDashboard}
            />
          )}
        </AnimatePresence>
      </AccountAccess>
    </div>
  );
}
