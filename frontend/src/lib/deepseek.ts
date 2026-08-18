import { z } from 'zod';
import { supabase } from './supabase';
import { getMockBreakdown } from '../data/mock';

// ── ReadingBreakdown via server-side Edge Function ──
//
// The DeepSeek API key never reaches the browser. The frontend only calls our
// own Supabase Edge Function (`breakdown`), which reads the secret server-side.

const BreakdownSchema = z
  .object({
    main_clause: z.string().min(1),
    relation: z.string().min(1),
    natural_meaning: z.string().min(1),
  })
  .strict();

export type BreakdownResult = z.infer<typeof BreakdownSchema>;

async function callBreakdownEdgeFunction(sentence: string, context: string): Promise<BreakdownResult> {
  const { data, error } = await supabase.functions.invoke('breakdown', {
    body: { sentence, context },
  });

  if (error) {
    throw new Error(`Breakdown edge function error: ${error.message}`);
  }

  if (!data || data.ok !== true || !data.breakdown) {
    const code = data?.error?.code ?? 'UNKNOWN';
    throw new Error(`Breakdown failed: ${code}`);
  }

  return BreakdownSchema.parse(data.breakdown);
}

// ── Public API: get breakdown with retry + fallback ──

export async function getBreakdown(
  cardId: string,
  sentence: string,
  context = '',
): Promise<BreakdownResult> {
  // Try 1
  try {
    return await callBreakdownEdgeFunction(sentence, context);
  } catch (err) {
    console.warn('[Breakdown] First attempt failed:', err);
  }

  // Try 2 (retry once)
  try {
    return await callBreakdownEdgeFunction(sentence, context);
  } catch (err) {
    console.warn('[Breakdown] Second attempt failed:', err);
  }

  // Fallback: mock data
  console.warn('[Breakdown] Falling back to mock data for', cardId);
  const mock = getMockBreakdown(cardId);
  if (mock) {
    return {
      main_clause: mock[0],
      relation: mock[1],
      natural_meaning: mock[2],
    };
  }

  // Last resort — should never reach here if mock data exists
  return {
    main_clause: '无法解析此句子',
    relation: '（AI 暂时不可用）',
    natural_meaning: '请稍后重试，或选择更简单的句子。',
  };
}
