// ── Rule-based per-question feedback ──
// Deterministic feedback generator. No LLM, no per-question content fields.
// "why" comes from a card-type + presentation-variant rule table, "where" from
// the diff between the user's answer and the correct answer, "next" from the
// ability-dimension map. This mirrors the existing getSkillMapping in ability.ts
// without importing it, so this file stays self-contained and touches no frozen layer.

export type AbilityDimension =
  | 'vocabulary'
  | 'sentence'
  | 'reading'
  | 'listening'
  | 'writing';

export interface FeedbackLocation {
  kind: 'option' | 'block' | 'character' | 'pair' | 'evidence_span';
  id?: string;
  index?: number;
  message: string;
}

export interface RuleFeedback {
  correct: boolean;
  attemptIndex: number;
  why: string;
  where: FeedbackLocation[];
  next: string;
  dimensions: AbilityDimension[];
  revealAnswer: boolean;
  correctAnswerText: string;
}

export interface ChoiceAnswer {
  cardType: 'choice';
  selectedOptionId: string;
  correctOptionId: string;
  options: Array<{ id: string; text: string }>;
  presentationVariant?: string;
}

export interface ReorderAnswer {
  cardType: 'reorder';
  orderedChunkIds: string[];
  correctOrder: string[];
  chunks: Array<{ id: string; text: string }>;
}

export type CardAnswer = ChoiceAnswer | ReorderAnswer;

const DIMENSION_MAP: Record<'choice' | 'reorder', AbilityDimension[]> = {
  choice: ['sentence', 'reading'],
  reorder: ['sentence'],
};

// 选择题型按 presentationVariant 分规则文案，避免对 cloze/dialogue/translation
// 套用「阅读定位证据」这类错误的解释。
const CHOICE_RULE: Record<string, { whyWrong: string; next: string }> = {
  cloze: {
    whyWrong: '先看空格前后，判断这里需要什么词性，再选词义最贴切的词。',
    next: '继续练选词填空：先判断词性，再排除干扰项。',
  },
  dialogue: {
    whyWrong: '先确认对方问句在问什么，再选最自然的回应。',
    next: '继续练对话回应：抓关键词，选衔接最自然的回答。',
  },
  reading: {
    whyWrong: '先读懂题干问什么，再回到短文定位关键词对应的信息。',
    next: '继续练阅读定位：回到短文找题干关键词对应的证据。',
  },
  translation: {
    whyWrong: '先抓中文主干（谁 / 做什么），再选语义最贴近、语序正确的英文。',
    next: '继续练翻译表达：先定主干，再对应英文语序。',
  },
  standard: {
    whyWrong: '根据题干与选项的对应关系，选最合适的一项。',
    next: '继续练习：先读题干，再逐项排除不符的选项。',
  },
};

const REORDER_RULE = {
  whyWrong: '这是句子排序，先找主干（主谓宾），修饰语要紧跟被修饰词。',
  next: '继续练组句：先找主语和谓语，再放修饰语。',
};

export function buildChoiceFeedback(
  answer: ChoiceAnswer,
  attemptIndex: number,
): RuleFeedback {
  const correct = answer.selectedOptionId === answer.correctOptionId;
  const reveal = !correct && attemptIndex >= 2;
  const correctText =
    answer.options.find((o) => o.id === answer.correctOptionId)?.text ??
    answer.correctOptionId;

  const where: FeedbackLocation[] = [];
  if (!correct) {
    where.push({ kind: 'option', id: answer.selectedOptionId, message: '你选择了这一项' });
    if (reveal) {
      where.push({ kind: 'option', id: answer.correctOptionId, message: '正确答案是这一项' });
    }
  }

  const rule = CHOICE_RULE[answer.presentationVariant ?? 'standard'] ?? CHOICE_RULE.standard;

  return {
    correct,
    attemptIndex,
    why: correct ? '你选对了正确答案。' : rule.whyWrong,
    where,
    next: rule.next,
    dimensions: DIMENSION_MAP.choice,
    revealAnswer: reveal,
    correctAnswerText: reveal ? correctText : '',
  };
}

export function buildReorderFeedback(
  answer: ReorderAnswer,
  attemptIndex: number,
): RuleFeedback {
  const correct =
    answer.orderedChunkIds.length === answer.correctOrder.length &&
    answer.orderedChunkIds.every((id, i) => id === answer.correctOrder[i]);
  const reveal = !correct && attemptIndex >= 2;

  let firstMismatch = -1;
  if (!correct) {
    const len = Math.max(answer.orderedChunkIds.length, answer.correctOrder.length);
    for (let i = 0; i < len; i++) {
      if (answer.orderedChunkIds[i] !== answer.correctOrder[i]) {
        firstMismatch = i;
        break;
      }
    }
  }

  const correctText = answer.correctOrder
    .map((id) => answer.chunks.find((c) => c.id === id)?.text ?? id)
    .join(' ');

  const where: FeedbackLocation[] = [];
  if (!correct && firstMismatch >= 0) {
    where.push({
      kind: 'block',
      index: firstMismatch,
      message: `第 ${firstMismatch + 1} 个词块位置不对`,
    });
  }

  return {
    correct,
    attemptIndex,
    why: correct ? '你排出了正确的句子顺序。' : REORDER_RULE.whyWrong,
    where,
    next: REORDER_RULE.next,
    dimensions: DIMENSION_MAP.reorder,
    revealAnswer: reveal,
    correctAnswerText: reveal ? correctText : '',
  };
}

export function buildRuleFeedback(
  answer: CardAnswer,
  attemptIndex: number,
): RuleFeedback {
  return answer.cardType === 'choice'
    ? buildChoiceFeedback(answer, attemptIndex)
    : buildReorderFeedback(answer, attemptIndex);
}
