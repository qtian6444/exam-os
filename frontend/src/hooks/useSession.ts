import { useState, useCallback, useRef } from 'react';
import type { UserProfile, SessionData, AppStage } from '../types';
import { upsertUserProfile } from '../lib/db';

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export function useSession() {
  const [stage, setStage] = useState<AppStage>('onboarding' as AppStage);
  const [profile, setProfile] = useState<UserProfile>({
    examType: null,
    examBatch: null,
    dailyTime: null,
  });

  const sessionRef = useRef<SessionData>({
    sessionId: generateId(),
    startTime: Date.now(),
    endTime: null,
    cardsCompleted: 0,
    actions: [],
  });

  const updateProfile = useCallback((patch: Partial<UserProfile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  const startLearning = useCallback(
    async (finalProfile: { examType: string; examBatch: string; dailyTime: string }) => {
      // Persist user profile to Supabase
      await upsertUserProfile({
        examType: finalProfile.examType as any,
        examBatch: finalProfile.examBatch as any,
        dailyTime: finalProfile.dailyTime as any,
      });

      sessionRef.current = {
        sessionId: generateId(),
        startTime: Date.now(),
        endTime: null,
        cardsCompleted: 0,
        actions: [],
      };
      setStage('learning' as AppStage);
    },
    [],
  );

  const completeSession = useCallback(() => {
    sessionRef.current.endTime = Date.now();
    setStage('complete' as AppStage);
  }, []);

  const recordAction = useCallback(
    (action: SessionData['actions'][number]) => {
      sessionRef.current.actions.push(action);
      sessionRef.current.cardsCompleted += 1;
    },
    [],
  );

  return {
    stage,
    profile,
    session: sessionRef,
    updateProfile,
    startLearning,
    completeSession,
    recordAction,
  };
}
