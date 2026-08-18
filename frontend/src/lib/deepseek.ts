import { z } from 'zod';
import { supabase, getAccessToken } from './supabase';

// ── ReadingBreakdown via server-side Edge Function ──
//
// The DeepSeek API key never reaches the browser. The frontend only calls our
// own Supabase Edge Function (`breakdown`), which reads the secret server-side
// and verifies the caller's session JWT.

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

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Breakdown request timed out')), ms);
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
): Promise<BreakdownResult> {
  const token = await getAccessToken();

  const { data, error } = await withTimeout(
    supabase.functions.invoke('breakdown', {
      body: { sentence, context },
      headers: { Authorization: `Bearer ${token}` },
    }),
    REQUEST_TIMEOUT_MS,
  );

  if (error) {
    throw new Error(`Breakdown edge function error: ${error.message}`);
  }

  if (!data || data.ok !== true || !data.breakdown) {
    const code = data?.error?.code ?? 'UNKNOWN';
    throw new Error(`Breakdown failed: ${code}`);
  }

  return BreakdownSchema.parse(data.breakdown);
}

// ── Public API: get breakdown with bounded retry, NO silent mock fallback ──
//
// If the AI call ultimately fails, we propagate the error so the UI shows a
// clear "temporarily unavailable / retry" state. We must never substitute mock
// data as if it were a real AI result.

export async function getBreakdown(
  sentence: string,
  context = '',
): Promise<BreakdownResult> {
  const safeSentence = sentence.slice(0, MAX_SENTENCE_LENGTH);
  const safeContext = context.slice(0, MAX_CONTEXT_LENGTH);

  let lastError: unknown;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await callBreakdownEdgeFunction(safeSentence, safeContext);
    } catch (err) {
      lastError = err;
      if (attempt < MAX_ATTEMPTS) {
        console.warn(`[Breakdown] attempt ${attempt} failed, retrying:`, err);
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Breakdown failed');
}
