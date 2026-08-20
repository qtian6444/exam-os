import { useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Dashboard from './components/Dashboard';
import LearningShell from './components/LearningShell';
import SessionComplete from './components/SessionComplete';
import { useSession } from './hooks/useSession';

export default function App() {
  const {
    stage,
    session,
    beforeSnapshot,
    lastStats,
    startLearning,
    completeSession,
    backToDashboard,
  } = useSession();

  const handleLearningComplete = useCallback(
    (stats: { cardsCompleted: number; elapsed: number }) => {
      completeSession(stats);
    },
    [completeSession],
  );

  return (
    <div className="app">
      <AnimatePresence mode="wait">
        {stage === 'dashboard' && (
          <Dashboard key="dashboard" onStart={startLearning} />
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
            beforeSnapshot={beforeSnapshot}
            onBack={backToDashboard}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
