import {
  CardType,
  type ChoiceCardData,
  type ReorderCardData,
  type LearningCard,
} from '../types';
import { breakdownSentences } from './content-library';

// ── Card Queue ──
//
// P0-LEARNING-INTERACTION-01 内容层升级：默认训练题使用
// 「来源可追溯的 CET-4 真题素材 + 面向当前用户能力的降阶训练内容」。
//
// 内容来源说明（必须可追溯）：
//   全部六题均取自 2026年6月 大学英语四级考试真题。
//   每张卡上方注释记录：考试年月 / 套题 / 题目或文章位置 / 原始句子 / 改编方式。
//   `source: 'CET_REAL'` 标记其为真题素材（区别于教学例句 TRUSTED_TEACHING）。
//   未在真题资料中找到的句子一律不标注为 CET_REAL。
//
// ReadingBreakdown 不进入默认队列（退为答错后 / 求助支架），默认六题全部要求
// 用户先做一个主动动作（选词 / 排序 / 阅读定位 / 中英对应 / 语境辨义）。

let cardIndex = 0;

function buildCardQueue(): LearningCard[] {
  const cards: LearningCard[] = [];

  // 题面交替：选词填空 → 词块排序 → 阅读选择 → 词块排序 → 中英对应 → 语境辨义。
  // 满足：不连续三道同类型；覆盖四种题面；第一题基础可懂；一道题只考一个动作。

  // ── Card 1: 真题短句选词填空（cloze）────────────────────────────
  // 考试年月：2026年6月；套题：第二套；位置：阅读 Section C Passage 2 开头。
  // 原句："Music is a universal language."
  // 改编：挖空 "universal"，三选一，考查 "universal language"（通用语言）。
  cards.push({
    cardId: 'choice-cloze-01',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: 'Music is a ___ language.',
    options: [
      { id: 'A', text: 'universal' },
      { id: 'B', text: 'popular' },
      { id: 'C', text: 'silent' },
    ],
    correctOptionId: 'A',
    presentationVariant: 'cloze',
    source: 'CET_REAL',
    teaching: {
      meaning: '音乐是一种通用的语言。',
      collocation: 'universal language（通用语言）；universal value（普世价值）',
      hook: 'uni- 表示“一 / 统一”，universal = 全世界“统一”通用 → 通用的。',
    },
  } as ChoiceCardData);

  // ── Card 2: 真题短句词块排序（reorder）────────────────────────────
  // 考试年月：2026年6月；套题：第三套；位置：阅读 Section C Passage 1 开头。
  // 原句："Disgust is a universal human emotion."
  // 改编：按「主语 / be动词 / 表语」拆为三个词块，不机械逐词拆。
  cards.push({
    cardId: 'reorder-disgust-01',
    cardType: CardType.REORDER,
    chunks: [
      { id: 'a', text: 'Disgust' },
      { id: 'b', text: 'is a' },
      { id: 'c', text: 'universal human emotion' },
    ],
    correctOrder: ['a', 'b', 'c'],
    source: 'CET_REAL',
    teaching: {
      meaning: '厌恶是一种普遍的人类情感。',
      collocation: 'a universal human emotion（普遍的人类情感）；feel disgust（感到厌恶）',
      hook: 'disgust = dis-（否定）+ gust（口味），“不合口味” → 厌恶。',
    },
  } as ReorderCardData);

  // ── Card 3: 真题阅读信息选择（reading）────────────────────────────
  // 考试年月：2026年6月；套题：第一套；位置：阅读 Section C Passage 1 开头 + 第46题。
  // 原句："Is organic food worth the higher price? It's the classic grocery
  //        store dilemma."；题干 Q46 "What is the classic grocery store dilemma?"
  //        答案 D) "One wants the best food but their budget is limited."
  // 改编：题干保留原句，选项降阶为三项（正确项沿用真题答案 D）。
  cards.push({
    cardId: 'choice-reading-01',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: "Is organic food worth the higher price? It's the classic grocery store dilemma.",
    prompt: 'What is the classic grocery store dilemma?',
    options: [
      { id: 'A', text: 'One wants the best food but their budget is limited.' },
      { id: 'B', text: 'One always buys the cheapest food without hesitation.' },
      { id: 'C', text: 'One only buys food that is currently on sale.' },
    ],
    correctOptionId: 'A',
    presentationVariant: 'reading',
    source: 'CET_REAL',
    teaching: {
      meaning: '有机食品值得更高的价格吗？这是杂货店里经典的取舍难题。',
      collocation: 'worth the higher price（物有所值）；a classic dilemma（经典两难）',
      hook: 'dilemma = di-（二）+ lemma（假设），“两个选项都为难” → 两难困境。',
    },
  } as ChoiceCardData);

  // ── Card 4: 真题短句词块排序（reorder）────────────────────────────
  // 考试年月：2026年6月；套题：第二套；位置：阅读 Section B 长篇阅读 第36题定位句。
  // 原句："Dementia typically gets worse over time."
  // 改编：按「主语 / 频度副词 / 谓语 / 时间状语」拆为四个词块。
  cards.push({
    cardId: 'reorder-dementia-01',
    cardType: CardType.REORDER,
    chunks: [
      { id: 'a', text: 'Dementia' },
      { id: 'b', text: 'typically' },
      { id: 'c', text: 'gets worse' },
      { id: 'd', text: 'over time' },
    ],
    correctOrder: ['a', 'b', 'c', 'd'],
    source: 'CET_REAL',
    teaching: {
      meaning: '痴呆症通常会随着时间推移而加重。',
      collocation: 'get worse over time（随时间恶化）；typically（通常、一般）',
      hook: 'dementia 记“de-（失去）+ ment（心智）” → 失去心智 → 痴呆。',
    },
  } as ReorderCardData);

  // ── Card 5: 中文提示下的英文词块组句（translation）─────────────────
  // 考试年月：2026年6月；套题：第一套；位置：Part IV 翻译（餐桌礼仪）。
  // 原句："餐桌礼仪是中华传统文化的重要组成部分。"；
  //       参考译文："Dining etiquette is an integral part of traditional
  //       Chinese culture, embodying ..."。
  // 改编：中文作提示，选最贴切的英文；考点为 "integral part"（重要组成部分）。
  cards.push({
    cardId: 'choice-translation-01',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: '餐桌礼仪是中华传统文化的重要组成部分。',
    prompt: '选出最贴切的英文表达',
    options: [
      { id: 'A', text: 'Dining etiquette is an integral part of traditional Chinese culture.' },
      { id: 'B', text: 'Dining etiquette is a minor part of traditional Chinese culture.' },
      { id: 'C', text: 'Dining etiquette is an old part of traditional Chinese culture.' },
    ],
    correctOptionId: 'A',
    presentationVariant: 'translation',
    source: 'CET_REAL',
    teaching: {
      meaning: '餐桌礼仪是中华传统文化的重要组成部分。',
      collocation: 'dining etiquette（餐桌礼仪）；an integral part of（……的重要组成部分）',
      hook: 'integral 记“integr（整体）+ al”，是“整体不可分割的” → 重要的组成部分。',
    },
  } as ChoiceCardData);

  // ── Card 6: 真题语境词义选择（vocabulary）─────────────────────────
  // 考试年月：2026年6月；套题：第三套；位置：阅读 Section B 长篇阅读 第36题定位句。
  // 原句："The question regarding pay is also best avoided."
  // 改编：以原句为语境，考查高频词 "regarding"（关于、对于）的词义。
  cards.push({
    cardId: 'choice-vocab-01',
    cardType: CardType.CHOICE,
    flowStep: 'initial_choice',
    sentence: 'The question regarding pay is also best avoided.',
    prompt: '句中的 “regarding” 最接近哪个意思？',
    options: [
      { id: 'A', text: '关于、对于' },
      { id: 'B', text: '忽略、回避' },
      { id: 'C', text: '反对、拒绝' },
    ],
    correctOptionId: 'A',
    presentationVariant: 'standard',
    source: 'CET_REAL',
    teaching: {
      meaning: '关于薪酬的问题也最好避免（提及）。',
      collocation: 'regarding pay（关于薪酬）；regarding + 名词（关于……）',
      hook: 'regarding 由 regard（看作）+ -ing 而来，把话题“看作” → 关于、就……而言。',
    },
  } as ChoiceCardData);

  return cards;
}

const mockCards = buildCardQueue();

export function getNextCard(): LearningCard | null {
  if (cardIndex >= mockCards.length) return null;
  return mockCards[cardIndex++];
}

export function getTotalCards(): number {
  return mockCards.length;
}

export function resetCardQueue(): void {
  cardIndex = 0;
}

// ── Real Breakdown Content Map ──
// ReadingBreakdown 不再进入默认队列，但组件与内容保留（答错后 / 求助支架用）。
const breakdownMap: Record<string, string[]> = {};
breakdownSentences.forEach((item, i) => {
  const cardId = `breakdown-${String(i + 1).padStart(3, '0')}`;
  breakdownMap[cardId] = [item.mainClause, item.relation, item.naturalMeaning];
});

export function getMockBreakdown(cardId: string): string[] | null {
  return breakdownMap[cardId] || null;
}
