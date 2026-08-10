import { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import OnboardingFlow from './components/onboarding/OnboardingFlow';
import LearningShell from './components/LearningShell';
import SessionComplete from './components/SessionComplete';
import { useSession } from './hooks/useSession';
import type { ExamType, ExamBatch, DailyTime } from './types';

export default function App() {
  const { stage, startLearning, completeSession, session } =
    useSession();

  const handleOnboardingComplete = useCallback(
    (_profile: { examType: ExamType; examBatch: ExamBatch; dailyTime: DailyTime }) => {
      startLearning();
    },
    [startLearning],
  );

  const handleLearningComplete = useCallback(
    (_stats: { cardsCompleted: number; elapsed: number }) => {
      completeSession();
    },
    [completeSession],
  );

  const handleRestart = useCallback(() => {
    window.location.reload();
  }, []);

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {stage === 'onboarding' && (
          <OnboardingFlow
            key="onboarding"
            onComplete={handleOnboardingComplete}
          />
        )}

        {stage === 'learning' && (
          <LearningShell
            key="learning"
            onComplete={handleLearningComplete}
          />
        )}

        {stage === 'complete' && (
          <SessionComplete
            key="complete"
            cardsCompleted={session.current.cardsCompleted}
            elapsed={
              session.current.endTime
                ? session.current.endTime - session.current.startTime
                : 0
            }
            onRestart={handleRestart}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
