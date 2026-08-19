import { z } from 'zod';
import { getAccessToken } from './supabase';

// ── ReadingBreakdown via server-side Edge Function ──
//
// The DeepSeek API key never reaches the browser. The frontend only calls our
// own Supabase Edge Function (`breakdown`), which reads the secret server-side
// and verifies the caller's session JWT.
//
// We use a raw `fetch` (not supabase.functions.invoke) so the request has real
// lifecycle control: a per-attempt AbortController bounds a hung request, and
// the caller can pass its own AbortSignal to cancel on unmount.

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const FUNCTION_URL = `${supabaseUrl}/functions/v1/breakdown`;

const MAX_SENTENCE_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 2000;

// ONE user action = ONE wall-clock deadline. This budget spans token acquisition
// AND all retry attempts — a retry uses the *remaining* budget, never a fresh
// full timeout.
export const TOTAL_TIMEOUT_MS = 20_000;
const MAX_ATTEMPTS = 2;

const BreakdownSchema = z
  .object({
    main_clause: z.string().min(1),
    relation: z.string().min(1),
    natural_meaning: z.string().min(1),
  })
  .strict();

export type BreakdownResult = z.infer<typeof BreakdownSchema>;

class BreakdownError extends Error {
  readonly code: string;
  readonly recoverable: boolean;
  constructor(code: string, recoverable: boolean, message?: string) {
    super(message ?? `Breakdown failed: ${code}`);
    this.name = 'BreakdownError';
    this.code = code;
    this.recoverable = recoverable;
  }
}

function isRecoverable(err: unknown): boolean {
  return err instanceof BreakdownError && err.recoverable;
}

/**
 * Bounds `promise` to `ms` milliseconds at the Promise level. Unlike an
 * AbortController this cannot cancel the underlying work, but it guarantees the
 * caller-observable Promise settles by the deadline — which is what matters for
 * a value read (like getAccessToken) that has no AbortSignal hook. A late
 * resolution of the wrapped promise is simply dropped.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new BreakdownError('TIMEOUT', true, 'Deadline exceeded')),
      ms,
    );
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function callBreakdownEdgeFunction(
  sentence: string,
  context: string,
  token: string,
  signal: AbortSignal,
): Promise<BreakdownResult> {
  let resp: Response;
  try {
    resp = await fetch(FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: supabaseAnonKey,
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ sentence, context }),
      signal,
    });
  } catch (err) {
    if ((err as Error)?.name === 'AbortError') {
      // Caller distinguishes timeout vs unmount via its own signal.
      throw new BreakdownError('ABORTED', true, 'Request aborted');
    }
    throw new BreakdownError('NETWORK_ERROR', true, (err as Error)?.message ?? 'Network error');
  }

  if (!resp.ok) {
    let code = 'UPSTREAM_ERROR';
    let recoverable = true;
    try {
      const body = (await resp.json()) as {
        error?: { code?: string; recoverable?: boolean };
      };
      code = body.error?.code ?? code;
      recoverable = body.error?.recoverable ?? recoverable;
    } catch {
      // Non-JSON error body → fall back to the defaults above.
    }
    throw new BreakdownError(code, recoverable);
  }

  const data = (await resp.json()) as {
    ok?: boolean;
    breakdown?: unknown;
    error?: { code?: string; recoverable?: boolean };
  };
  if (!data || data.ok !== true || !data.breakdown) {
    throw new BreakdownError(data?.error?.code ?? 'UNKNOWN', data?.error?.recoverable ?? true);
  }

  return BreakdownSchema.parse(data.breakdown);
}

// ── Public API: get breakdown with bounded retry, NO silent mock fallback ──
//
// Retry only on recoverable errors (network / upstream 5xx / timeout), and only
// a bounded number of times. A definite rejection (unauthenticated, invalid
// payload) or an unmount abort is surfaced immediately. If the call ultimately
// fails, the error propagates so the UI shows a clear retry state — never mock
// data substituted for a real AI result.

export async function getBreakdown(
  sentence: string,
  context = '',
  options?: { signal?: AbortSignal },
): Promise<BreakdownResult> {
  const safeSentence = sentence.slice(0, MAX_SENTENCE_LENGTH);
  const safeContext = context.slice(0, MAX_CONTEXT_LENGTH);
  const externalSignal = options?.signal;

  // One total deadline for the whole action (token acquisition + all retries).
  const deadline = Date.now() + TOTAL_TIMEOUT_MS;

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const remaining = deadline - Date.now();
    if (remaining <= 0) {
      throw new BreakdownError('TIMEOUT', true, 'Deadline exceeded');
    }

    if (externalSignal?.aborted) {
      throw new BreakdownError('REQUEST_ABORTED', false, 'Request aborted');
    }

    // Token acquisition is INSIDE the deadline. getAccessToken() has no
    // AbortSignal hook, so bound it at the Promise level — the observable
    // promise ends at the deadline even if the underlying read hangs. A TIMEOUT
    // (whole budget exhausted) or any other token error propagates directly.
    const token = await withTimeout(getAccessToken(), remaining);

    // The fetch attempt is bounded by the REMAINING budget, not a fresh timeout.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), remaining);
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      return await callBreakdownEdgeFunction(safeSentence, safeContext, token, controller.signal);
    } catch (err) {
      // Abort caused by the caller (unmount) → non-recoverable, stop now.
      if (err instanceof BreakdownError && err.code === 'ABORTED' && externalSignal?.aborted) {
        throw new BreakdownError('REQUEST_ABORTED', false, 'Request aborted');
      }
      lastError = err;
      if (!isRecoverable(err) || attempt >= MAX_ATTEMPTS) {
        throw err;
      }
      console.warn(`[Breakdown] attempt ${attempt} failed, retrying:`, err);
    } finally {
      clearTimeout(timer);
      if (externalSignal) {
        externalSignal.removeEventListener('abort', onExternalAbort);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new BreakdownError('UNKNOWN', true);
}
