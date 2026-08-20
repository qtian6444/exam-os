import { useState, useCallback, useRef } from 'react';
import type { SessionData, AppStage } from '../types';
import { getAbilitySnapshot } from '../lib/db';
import { blankSnapshot, type AbilitySnapshot } from '../lib/ability';
import { ensureProfileReady } from '../lib/dashboard';
import { resetCardQueue } from '../data/mock';

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

export interface SessionStats {
  cardsCompleted: number;
  elapsed: number;
}

export function useSession() {
  const [stage, setStage] = useState<AppStage>('dashboard' as AppStage);
  // Ability snapshot captured just BEFORE this session. The Result page diffs it
  // against a fresh post-session read to show the ability delta.
  const [beforeSnapshot, setBeforeSnapshot] = useState<AbilitySnapshot | null>(null);
  const [lastStats, setLastStats] = useState<SessionStats | null>(null);

  const sessionRef = useRef<SessionData>({
    sessionId: generateId(),
    startTime: Date.now(),
    endTime: null,
    cardsCompleted: 0,
    actions: [],
  });

  const startLearning = useCallback(async (): Promise<boolean> => {
    // Ensure a profile row exists (fresh anonymous user → create defaults) so
    // the first apply_learning_evidence never hits PROFILE_NOT_FOUND.
    const ready = await ensureProfileReady();
    if (!ready) return false;

    // Capture the ability snapshot BEFORE this session for the result delta.
    let before: AbilitySnapshot;
    try {
      before = await getAbilitySnapshot();
    } catch {
      before = blankSnapshot();
    }
    setBeforeSnapshot(before);

    // A new session starts a fresh card queue (no full-page reload needed).
    resetCardQueue();
    sessionRef.current = {
      sessionId: generateId(),
      startTime: Date.now(),
      endTime: null,
      cardsCompleted: 0,
      actions: [],
    };
    setLastStats(null);
    setStage('learning' as AppStage);
    return true;
  }, []);

  const completeSession = useCallback((stats: SessionStats) => {
    sessionRef.current.endTime = Date.now();
    sessionRef.current.cardsCompleted = stats.cardsCompleted;
    setLastStats(stats);
    setStage('result' as AppStage);
  }, []);

  const backToDashboard = useCallback(() => {
    resetCardQueue();
    setStage('dashboard' as AppStage);
  }, []);

  return {
    stage,
    session: sessionRef,
    beforeSnapshot,
    lastStats,
    startLearning,
    completeSession,
    backToDashboard,
  };
}
