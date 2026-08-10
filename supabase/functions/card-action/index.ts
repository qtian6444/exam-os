// card-action — POST /functions/v1/card-action
// Handles card lifecycle actions: complete, continue, retry.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const CardActionSchema = z.object({
  sessionId: z.string(),
  cardId: z.string(),
  cardType: z.enum(['choice', 'reading_breakdown', 'reorder']),
  action: z.enum(['complete', 'continue', 'retry']),
});

// ── Mock next cards ──
const NEXT_CARD_MAP: Record<string, { cardId: string; cardType: string; flowStep?: string }> = {
  'choice-001': { cardId: 'breakdown-001', cardType: 'reading_breakdown' },
  'breakdown-001': { cardId: 'choice-002', cardType: 'choice', flowStep: 'initial_choice' },
  'choice-002': { cardId: 'reorder-001', cardType: 'reorder' },
  'reorder-001': { cardId: 'breakdown-002', cardType: 'reading_breakdown' },
  'breakdown-002': { cardId: '', cardType: 'choice' }, // signals session end
};

serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 });
  }

  try {
    const body = await req.json();
    const parsed = CardActionSchema.safeParse(body);

    if (!parsed.success) {
      return new Response(JSON.stringify({
        ok: false,
        error: { code: 'INVALID_PAYLOAD', recoverable: false },
      }), { status: 400 });
    }

    const { cardId, action } = parsed.data;
    const nextCard = NEXT_CARD_MAP[cardId] || null;

    if (action === 'retry') {
      return new Response(JSON.stringify({
        ok: true,
        cardId,
        cardType: parsed.data.cardType,
        state: 'ready',
        next: { action: 'retry_action' },
      }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({
      ok: true,
      cardId,
      cardType: parsed.data.cardType,
      state: 'completed',
      next: nextCard
        ? { action: 'render_next_card', card: nextCard }
        : { action: 'session_complete' },
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
