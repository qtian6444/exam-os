// ── Dashboard data (today count, streak, profile bootstrap) ──
//
// Reads that back the Dashboard homepage. These are additive SELECT-side helpers
// — they do NOT touch the frozen db core (db.ts), the RPC, or any write path.
//
//   - getLearningStats(): today's learning count + consecutive-day streak,
//     derived from learning_record.created_at (owner-bound via RLS). Every
//     failure collapses to `null` ("unavailable"), never a thrown error, so the
//     Dashboard can always render a fallback ("—") instead of white-screening.
//   - ensureProfileReady(): the one bootstrap write. If no user_profile row
//     exists yet (fresh anonymous user), create it with sensible defaults so the
//     first `apply_learning_evidence` call never hits PROFILE_NOT_FOUND.

import { supabase, getAuthUserId } from './supabase';
import { persistUserProfile } from './db';
import type { ExamType, ExamBatch, DailyTime } from '../types';

export interface LearningStats {
  todayCount: number | null; // null = unavailable (network/error)
  streak: number | null;     // null = unavailable (network/error)
}

export const DEFAULT_PROFILE: {
  examType: ExamType;
  examBatch: ExamBatch;
  dailyTime: DailyTime;
} = {
  examType: 'CET4',
  examBatch: 'undecided',
  dailyTime: '10min',
};

// Local calendar day (YYYY-MM-DD). Streak/today are "in the user's own day",
// so we normalize TIMESTAMPTZ → local date client-side rather than filtering in
// UTC, which would shift the day boundary for non-UTC visitors.
function toLocalDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function prevKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() - 1);
  return toLocalDateKey(dt);
}

/**
 * Pure decision: length of the consecutive-day streak ending at `todayKey`.
 * A streak is still "alive" if today hasn't been studied yet but yesterday was
 * (returns the streak ending yesterday). No days → 0.
 */
export function computeStreak(dateKeys: string[], todayKey: string): number {
  const days = new Set(dateKeys);
  let cursor: string | null = null;
  if (days.has(todayKey)) {
    cursor = todayKey;
  } else if (days.has(prevKey(todayKey))) {
    cursor = prevKey(todayKey);
  }
  if (!cursor) return 0;

  let streak = 0;
  while (days.has(cursor)) {
    streak += 1;
    cursor = prevKey(cursor);
  }
  return streak;
}

// Bound the history we pull — more than enough for a meaningful streak, without
// an unbounded SELECT over the whole learning_record table.
const STATS_WINDOW_DAYS = 60;

export async function getLearningStats(): Promise<LearningStats> {
  const todayKey = toLocalDateKey(new Date());
  try {
    const since = new Date(Date.now() - STATS_WINDOW_DAYS * 86_400_000).toISOString();
    // No `.eq('user_id', …)` filter on purpose: learning_record is RLS-scoped to
    // the caller, so this SELECT already returns only the owner's rows.
    const { data, error } = await supabase
      .from('learning_record')
      .select('created_at')
      .gte('created_at', since)
      .order('created_at', { ascending: false });

    if (error) return { todayCount: null, streak: null };

    const rows = (data ?? []) as { created_at: string }[];
    const keys = rows.map((r) => toLocalDateKey(new Date(r.created_at)));
    return {
      todayCount: keys.filter((k) => k === todayKey).length,
      streak: computeStreak(keys, todayKey),
    };
  } catch {
    return { todayCount: null, streak: null };
  }
}

/**
 * Ensure a user_profile row exists before the first learning session. Reads the
 * owner's row (RLS-scoped); if absent, creates it via the existing
 * persistUserProfile (CREATE → UPDATE-on-23505 contract). Returns false only on
 * a real failure — the caller must then block the transition to learning.
 */
export async function ensureProfileReady(): Promise<boolean> {
  try {
    const uid = await getAuthUserId();
    const { data, error } = await supabase
      .from('user_profile')
      .select('user_id')
      .eq('user_id', uid)
      .maybeSingle();

    if (error) return false;
    if (data) return true;

    const created = await persistUserProfile(DEFAULT_PROFILE);
    return created != null;
  } catch {
    return false;
  }
}
