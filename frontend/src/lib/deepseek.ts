import { z } from 'zod';
import { getMockBreakdown } from '../data/mock';

// ── DeepSeek API Client ──

const API_KEY = import.meta.env.VITE_DEEPSEEK_API_KEY;
const API_URL = 'https://api.deepseek.com/v1/chat/completions';
const MODEL = 'deepseek-v4-flash';

const BreakdownSchema = z
  .object({
    main_clause: z.string().min(1),
    relation: z.string().min(1),
    natural_meaning: z.string().min(1),
  })
  .strict();

export type BreakdownResult = z.infer<typeof BreakdownSchema>;

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

// ── Core API call ──

async function callDeepSeek(sentence: string, context: string): Promise<BreakdownResult> {
  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
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
  });

  if (!response.ok) {
    throw new Error(`DeepSeek API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  const rawText = data.choices?.[0]?.message?.content;

  if (!rawText || typeof rawText !== 'string') {
    throw new Error('DeepSeek returned empty or invalid response');
  }

  // Try to extract JSON from response (remove markdown fences if any)
  let jsonStr = rawText.trim();
  if (jsonStr.startsWith('```')) {
    jsonStr = jsonStr.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    throw new Error(`DeepSeek returned non-JSON: ${jsonStr.slice(0, 200)}`);
  }

  return BreakdownSchema.parse(parsed);
}

// ── Public API: get breakdown with retry + fallback ──

export async function getBreakdown(
  cardId: string,
  sentence: string,
  context = '',
): Promise<BreakdownResult> {
  // Try 1
  try {
    return await callDeepSeek(sentence, context);
  } catch (err) {
    console.warn('[DeepSeek] First attempt failed:', err);
  }

  // Try 2 (retry once)
  try {
    return await callDeepSeek(sentence, context);
  } catch (err) {
    console.warn('[DeepSeek] Second attempt failed:', err);
  }

  // Fallback: mock data
  console.warn('[DeepSeek] Falling back to mock data for', cardId);
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
