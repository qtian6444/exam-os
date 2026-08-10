// card-submit — POST /functions/v1/card-submit
// Receives user's answer on a card and returns evaluation + next action.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const CardSubmitSchema = z.object({
  sessionId: z.string(),
  cardId: z.string(),
  cardType: z.enum(['choice', 'reading_breakdown', 'reorder']),
  flowStep: z.enum(['initial_choice', 'confirm_choice', 'transfer_choice']).optional(),
  answer: z.object({
    selectedOptionId: z.string().optional(),
    orderedChunkIds: z.array(z.string()).optional(),
  }).optional(),
});

// ── Mock answer keys ──
const REORDER_ANSWERS: Record<string, string[]> = {
  'reorder-001': ['c1', 'c2', 'c3', 'c4', 'c5'],
};

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const parsed = CardSubmitSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({
        ok: false,
        error: { code: 'INVALID_PAYLOAD', recoverable: false },
      }), { status: 400 });
    }

    const { cardId, cardType, answer } = parsed.data;
    let correct = false;

    if (cardType === 'reorder' && answer?.orderedChunkIds) {
      const key = REORDER_ANSWERS[cardId] || [];
      correct =
        answer.orderedChunkIds.length === key.length &&
        answer.orderedChunkIds.every((id, i) => id === key[i]);
    }
    // choice cards are preference-based, always "correct"

    return new Response(JSON.stringify({
      ok: true,
      cardId,
      cardType,
      state: 'result',
      evaluation: { correct, attempt: 1 },
      next: { action: 'render_next_card' },
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch {
    return new Response(JSON.stringify({
      ok: false,
      error: { code: 'INTERNAL', recoverable: true },
    }), { status: 500 });
  }
});
