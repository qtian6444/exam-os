import { useEffect, useState, useCallback, useRef } from 'react';
import type {
  SessionData,
  AppStage,
  OnboardingProfile,
  FirstSessionContext,
  StudyPurpose,
  CetTarget,
  SelfBaseline,
  PrimaryObstacle,
  SupportPreference,
  PurposeDetail,
  DailyTime,
} from '../types';
import { getAbilitySnapshot, persistUserProfile } from '../lib/db';
import { getAuthUserId } from '../lib/supabase';
import { blankSnapshot, type AbilitySnapshot } from '../lib/ability';
import { ensureProfileReady } from '../lib/dashboard';
import { resetCardQueue } from '../data/mock';

function generateId(): string {
  return `sess_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// Session-scoped, identity-scoped "onboarding done" marker. Deliberately NOT
// localStorage: it only means "this browser session, for THIS auth uid, has
// completed onboarding" — never "permanently done". Scoping by auth.uid() keeps a
// guest's onboarding state from leaking to a logged-in account (and vice versa).
const ONBOARDING_DONE_PREFIX = 'exam_os.onboarding.done.';

function onboardingDoneKey(uid: string): string {
  return `${ONBOARDING_DONE_PREFIX}${uid}`;
}

function hasCompletedOnboarding(uid: string): boolean {
  try {
    return sessionStorage.getItem(onboardingDoneKey(uid)) === '1';
  } catch {
    return false;
  }
}

// ── First-session goal context (session-scoped, uid-scoped) ──
//
// The full self-report is persisted to sessionStorage under a uid-scoped key so a
// reload restores it without re-asking. It is NOT localStorage and NOT a database
// write — it only means "this browser session, for THIS auth uid". Written BEFORE
// the "done" marker so a reload can never reach "done" while the context is lost.

const ONBOARDING_CONTEXT_PREFIX = 'exam_os.onboarding.context.';

function onboardingContextKey(uid: string): string {
  return `${ONBOARDING_CONTEXT_PREFIX}${uid}`;
}

const VALID_PURPOSES: readonly StudyPurpose[] = ['cet_exam', 'long_term', 'ielts_study_abroad', 'career'];
const VALID_TARGETS: readonly CetTarget[] = ['pass_425', 'stable_pass', 'score_500', 'listening_speaking'];
const VALID_BASELINES: readonly SelfBaseline[] = ['starter', 'foundation', 'developing', 'functional', 'strong'];
const VALID_DAILY_TIMES: readonly DailyTime[] = ['5min', '10min', '20min', '30min+'];
const VALID_OBSTACLES: readonly PrimaryObstacle[] = [
  'vocabulary_insufficient',
  'words_known_sentences_unclear',
  'reading_locate_unstable',
  'listening_lag',
  'writing_expression_hard',
  'undecided_comprehensive',
];
const VALID_SUPPORT: readonly SupportPreference[] = ['more_hints_guided', 'moderate_hints_self_try', 'few_hints_challenge'];
const VALID_DETAILS: readonly PurposeDetail[] = [
  'vocab_reading_basis',
  'listening_comprehension',
  'daily_expression',
  'comprehensive_english',
  'explore_basis',
  'plan_within_year',
  'plan_within_half_year',
  'already_preparing',
  'job_interview',
  'email_writing',
  'meeting_daily_comm',
  'read_work_material',
  'no_fixed_scene',
];

function isOneOf<T extends string>(value: unknown, allowed: readonly T[]): value is T {
  return typeof value === 'string' && (allowed as readonly string[]).includes(value);
}

// A corrupt / partial / malformed payload must read as "no context" (→ re-onboard)
// rather than crash or silently route on bad data. Every field is validated
// against its string enum; numeric codes (1/2/3/4) are never accepted.
function isValidFirstSessionContext(value: unknown): value is FirstSessionContext {
  if (!value || typeof value !== 'object') return false;
  const c = value as Record<string, unknown>;
  return (
    isOneOf(c.purpose, VALID_PURPOSES) &&
    (c.targetScore === null || isOneOf(c.targetScore, VALID_TARGETS)) &&
    isOneOf(c.selfBaseline, VALID_BASELINES) &&
    isOneOf(c.primaryObstacle, VALID_OBSTACLES) &&
    isOneOf(c.supportPreference, VALID_SUPPORT) &&
    (c.purposeDetail === null || isOneOf(c.purposeDetail, VALID_DETAILS)) &&
    isOneOf(c.dailyTime, VALID_DAILY_TIMES)
  );
}

function readOnboardingContext(uid: string): FirstSessionContext | null {
  try {
    const raw = sessionStorage.getItem(onboardingContextKey(uid));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    return isValidFirstSessionContext(parsed) ? parsed : null;
  } catch {
    return null; // corrupt JSON / storage unavailable → treat as missing
  }
}

function writeOnboardingContext(uid: string, context: FirstSessionContext): boolean {
  try {
    sessionStorage.setItem(onboardingContextKey(uid), JSON.stringify(context));
    return true;
  } catch {
    return false;
  }
}

export interface SessionStats {
  cardsCompleted: number;
  elapsed: number;
}

export function useSession() {
  // Starts at dashboard (safe for returning users) and flips to onboarding only
  // once the auth identity is known AND no identity-scoped "done" marker exists.
  // The identity read is a local getSession() that resolves before AccountAccess's
  // network getUser() renders children, so returning users never flash onboarding.
  const [stage, setStage] = useState<AppStage>('dashboard' as AppStage);
  // Ability snapshot captured just BEFORE this session. The Result page diffs it
  // against a fresh post-session read to show the ability delta.
  const [beforeSnapshot, setBeforeSnapshot] = useState<AbilitySnapshot | null>(null);
  const [lastStats, setLastStats] = useState<SessionStats | null>(null);

  // auth.uid() is the data-ownership identity; both guest (anonymous) and
  // permanent (phone) sessions have one. Used to scope the onboarding marker.
  const identityRef = useRef<string | null>(null);
  // Session-scoped goal context collected during onboarding. Persisted to
  // sessionStorage (uid-scoped) for refresh recovery, but never written to the
  // DB and never feeds the ability model — the ability model is driven exclusively
  // by real training behaviour. Exposed for future personalization.
  const selfReportRef = useRef<FirstSessionContext | null>(null);

  const sessionRef = useRef<SessionData>({
    sessionId: generateId(),
    startTime: Date.now(),
    endTime: null,
    cardsCompleted: 0,
    actions: [],
  });

  useEffect(() => {
    let cancelled = false;
    getAuthUserId()
      .then((uid) => {
        if (cancelled) return;
        identityRef.current = uid;
        const context = readOnboardingContext(uid);
        const done = hasCompletedOnboarding(uid);
        if (context && done) {
          // Restore the structured self-report for future personalization; the
          // user already finished onboarding this session, so stay on dashboard.
          selfReportRef.current = context;
        } else {
          // Missing/corrupt context OR missing done marker → re-onboard. This is
          // the "context 缺失或损坏时重新进入 onboarding" rule.
          setStage('onboarding' as AppStage);
        }
      })
      .catch(() => {
        // No authenticated identity (unexpected post-bootstrap). Stay on
        // dashboard — onboarding is skipped rather than mis-scoped.
      });
    return () => {
      cancelled = true;
    };
  }, []);

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

  const completeOnboarding = useCallback(
    async (profile: OnboardingProfile): Promise<boolean> => {
      // Persist only the USER_EDITABLE profile columns; every self-report field
      // stays session-scoped and never reaches the database or ability model.
      const persisted = await persistUserProfile({
        examType: profile.examType,
        examBatch: profile.examBatch,
        dailyTime: profile.dailyTime,
      });
      if (!persisted) return false;

      const context: FirstSessionContext = {
        purpose: profile.purpose,
        targetScore: profile.targetScore,
        selfBaseline: profile.selfBaseline,
        primaryObstacle: profile.primaryObstacle,
        supportPreference: profile.supportPreference,
        purposeDetail: profile.purposeDetail,
        dailyTime: profile.dailyTime,
      };

      const uid = identityRef.current;
      if (!uid) {
        // No identity yet — the context cannot be uid-scoped. Fail so the flow
        // doesn't silently enter learning with an unscoped goal.
        return false;
      }

      // Write the full context FIRST, and only mark onboarding "done" once the
      // context actually persisted. A failed context write leaves the done marker
      // absent, so a reload re-enters onboarding instead of losing the goal.
      if (!writeOnboardingContext(uid, context)) {
        return false;
      }
      try {
        sessionStorage.setItem(onboardingDoneKey(uid), '1');
      } catch {
        // Storage unavailable — onboarding just won't survive a reload.
      }

      selfReportRef.current = context;

      await startLearning();
      return true;
    },
    [startLearning],
  );

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
    selfReport: selfReportRef,
    startLearning,
    completeOnboarding,
    completeSession,
    backToDashboard,
  };
}
