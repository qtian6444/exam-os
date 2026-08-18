// breakdown — POST /functions/v1/breakdown
// Server-side DeepSeek boundary for the ReadingBreakdown card.
//
// The DeepSeek API key is read from the Supabase Edge Function secret
// `DEEPSEEK_API_KEY` (set via: supabase secrets set DEEPSEEK_API_KEY=sk-...).
// The key never reaches the browser and is never returned in any response.
//
// JWT verification is ENABLED (Supabase default). Only a caller with a valid
// Supabase Auth session JWT (e.g. an anonymous sign-in user) may invoke this
// function. Do NOT deploy with --no-verify-jwt: that would expose the paid
// DeepSeek capability to anyone holding only the public anon key.

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const DEEPSEEK_API_KEY = Deno.env.get('DEEPSEEK_API_KEY');
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-v4-flash';

// Paid-resource guards: input caps, upstream timeout, best-effort dedup.
const MAX_SENTENCE_LENGTH = 500;
const MAX_CONTEXT_LENGTH = 2000;
const UPSTREAM_TIMEOUT_MS = 15_000;
const DEDUP_TTL_MS = 60_000;
const DEDUP_MAX_ENTRIES = 500;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const RequestSchema = z.object({
  sentence: z.string().min(1).max(MAX_SENTENCE_LENGTH),
  context: z.string().max(MAX_CONTEXT_LENGTH).optional().default(''),
});

const BreakdownSchema = z
  .object({
    main_clause: z.string().min(1),
    relation: z.string().min(1),
    natural_meaning: z.string().min(1),
  })
  .strict();

const SYSTEM_PROMPT = `你是 Exam OS 的英语句子理解引擎。

Exam OS 面向英语基础较弱、正在准备 CET-4 / CET-6 的中国大学生。

你的任务不是上语法课，也不是展示语言学知识。

你的唯一任务是：
把用户当前看不懂的一句英语，拆成一个基础较弱的学生也能迅速理解的结构。

必须严格输出 JSON，不得输出 Markdown，不得输出解释文字，不得在 JSON 前后添加任何内容。

输出格式严格为：

{
  "main_clause": "...",
  "relation": "...",
  "natural_meaning": "..."
}

三个字段含义：

1. main_clause

找出这句话最核心的意思。

用非常简单的中文说明：
"谁 / 什么东西 → 做了什么 → 得到什么结果"

不需要逐词翻译。
不需要解释全部修饰成分。
不要大量使用语法术语。

目标是让基础较弱的学生第一眼知道：
"这句话骨架其实在说什么。"

2. relation

只解释理解整句话真正需要的一个或几个关系。

例如：
原因
转折
条件
补充说明
结果
对比

优先使用普通中文。

不要优先使用：
定语从句
宾语从句
状语从句
非谓语
同位语从句

等教材式术语。

如果确实需要，可以在自然语言解释以后极轻地补充术语，但术语不能成为解释主体。

如果句子本身很简单，不要强行制造复杂关系。

3. natural_meaning

给出整句话自然、顺畅、符合上下文的中文意思。

不能机械逐词翻译。
不能添加原句没有表达的信息。
不能为了简单而改变原意。

---

总体原则：

先讲人话，再保证准确。

一次只解决当前句子的主要理解障碍。

目标不是让用户"学完一个语法知识点"，
目标是让用户产生：

"哦，原来这句话是在说这个。"

不要：

- 长篇教学
- 展示专业知识
- 给用户出题
- 评价用户能力
- 使用"很简单""你应该知道"等表达
- 输出除规定 JSON 外的任何内容

如果提供了上下文，只能用上下文帮助确定当前句子的真实含义，不得解释其他句子。`;

function buildUserPrompt(sentence: string, context: string): string {
  return `考试类型：CET-4
用户阶段：英语基础较弱

当前句子：
${sentence}

上下文：
${context || '（无额外上下文）'}

请严格按照系统要求，只输出 JSON。`;
}

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders },
  });
}

// Extracts the auth.uid() ("sub" claim) from the session JWT in the
// Authorization header. Signature verification is done by the Supabase
// platform (verify_jwt=true); this is a cheap in-function read of the caller
// identity for ownership/rate/dedup purposes, not a substitute for it.
function getCallerUserId(req: Request): string | null {
  const auth = req.headers.get('authorization') ?? '';
  if (!auth.startsWith('Bearer ')) return null;
  const token = auth.slice('Bearer '.length);
  const payloadPart = token.split('.')[1];
  if (!payloadPart) return null;
  try {
    const payload = JSON.parse(atob(payloadPart.replace(/-/g, '+').replace(/_/g, '/')));
    return typeof payload.sub === 'string' ? payload.sub : null;
  } catch {
    return null;
  }
}

// Best-effort in-memory dedup (single-isolate lifetime, not cross-instance).
const dedup = new Map<string, { at: number; breakdown: unknown }>();

function dedupKey(userId: string, sentence: string, context: string): string {
  return `${userId}::${sentence}::${context}`;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return json({ ok: false, error: { code: 'METHOD_NOT_ALLOWED', recoverable: false } }, 405);
  }

  const userId = getCallerUserId(req);
  if (!userId) {
    // Defense-in-depth: the platform already rejects missing/invalid JWTs when
    // verify_jwt is on, but fail explicitly here too.
    return json({ ok: false, error: { code: 'UNAUTHENTICATED', recoverable: false } }, 401);
  }

  // Secret not configured → fail explicitly, never silently.
  if (!DEEPSEEK_API_KEY) {
    return json({ ok: false, error: { code: 'MISSING_SECRET', recoverable: true } }, 500);
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ ok: false, error: { code: 'INVALID_PAYLOAD', recoverable: false } }, 400);
  }

  const parsed = RequestSchema.safeParse(body);
  if (!parsed.success) {
    return json({ ok: false, error: { code: 'INVALID_PAYLOAD', recoverable: false } }, 400);
  }

  const { sentence, context } = parsed.data;

  // Dedup: return the cached result for an obvious repeat within the TTL.
  const key = dedupKey(userId, sentence, context);
  const hit = dedup.get(key);
  if (hit && Date.now() - hit.at < DEDUP_TTL_MS) {
    return json({ ok: true, breakdown: hit.breakdown }, 200);
  }

  // Upstream call with an explicit timeout — a hung DeepSeek response must not
  // hold the request open indefinitely.
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  let resp: Response;
  try {
    resp = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${DEEPSEEK_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: buildUserPrompt(sentence, context) },
        ],
        temperature: 0.3,
        max_tokens: 1024,
      }),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if ((err as Error)?.name === 'AbortError') {
      return json({ ok: false, error: { code: 'DEEPSEEK_TIMEOUT', recoverable: true } }, 504);
    }
    // Never include err.message in the response (may leak internals).
    console.error('[breakdown] upstream network error:', err);
    return json({ ok: false, error: { code: 'INTERNAL', recoverable: true } }, 500);
  }
  clearTimeout(timer);

  if (!resp.ok) {
    // Stable, safe error code — never echo upstream body / headers.
    return json({ ok: false, error: { code: 'DEEPSEEK_UPSTREAM_ERROR', recoverable: true } }, 502);
  }

  let data: unknown;
  try {
    data = await resp.json();
  } catch {
    return json({ ok: false, error: { code: 'EMPTY_RESPONSE', recoverable: true } }, 502);
  }

  const rawText = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]
    ?.message?.content;

  if (!rawText || typeof rawText !== 'string') {
    return json({ ok: false, error: { code: 'EMPTY_RESPONSE', recoverable: true } }, 502);
  }

  let jsonStr = rawText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsedJson: unknown;
  try {
    parsedJson = JSON.parse(jsonStr);
  } catch {
    return json({ ok: false, error: { code: 'NON_JSON_RESPONSE', recoverable: true } }, 502);
  }

  const breakdown = BreakdownSchema.parse(parsedJson);

  // Cache successful result for dedup; keep the map bounded.
  if (dedup.size >= DEDUP_MAX_ENTRIES) {
    const oldestKey = dedup.keys().next().value;
    if (oldestKey !== undefined) dedup.delete(oldestKey);
  }
  dedup.set(key, { at: Date.now(), breakdown });

  return json({ ok: true, breakdown }, 200);
});
