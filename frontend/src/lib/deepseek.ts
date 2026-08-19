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
const REQUEST_TIMEOUT_MS = 20_000;
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

async function callBreakdownEdgeFunction(
  sentence: string,
  context: string,
  signal: AbortSignal,
): Promise<BreakdownResult> {
  const token = await getAccessToken();

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

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    if (externalSignal?.aborted) {
      throw new BreakdownError('REQUEST_ABORTED', false, 'Request aborted');
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    const onExternalAbort = () => controller.abort();
    if (externalSignal) {
      externalSignal.addEventListener('abort', onExternalAbort, { once: true });
    }

    try {
      return await callBreakdownEdgeFunction(safeSentence, safeContext, controller.signal);
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
