import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import type {
  LearningCard,
  CardType,
  ChoiceCardData,
  ReorderCardData,
  ReadingBreakdownCardData,
} from '../types';
import { getNextCard, getTotalCards } from '../data/mock';
import { applyLearningEvidence } from '../lib/db';
import { executeSave } from '../lib/saveExecutor';
import { buildRuleFeedback, type CardAnswer, type RuleFeedback } from '../lib/feedback';
import ChoiceCard from './cards/ChoiceCard';
import ReadingBreakdownCard from './cards/ReadingBreakdownCard';
import ReorderCard from './cards/ReorderCard';
import FeedbackPanel from './FeedbackPanel';
import SessionTimer from './SessionTimer';

interface Props {
  onComplete: (stats: { cardsCompleted: number; elapsed: number }) => void;
  sessionId: string;
}

type PersistPayload = {
  cardType: 'choice' | 'reading_breakdown' | 'reorder';
  cardId: string;
  correct: boolean | null;
  userAnswer?: unknown;
};

// 训练闭环状态机：answering → (correct | hint) → [retry] → (correct | explained) → 保存并继续。
// 首次错误只给提示不揭示答案；二次仍错揭示完整解析；每张原始卡片最多写一次证据。
type FlowPhase = 'answering' | 'correct' | 'hint' | 'explained';

export default function LearningShell({ onComplete, sessionId }: Props) {
  const [currentCard, setCurrentCard] = useState<LearningCard | null>(null);
  const [cardKey, setCardKey] = useState(0);
  const [cardsDone, setCardsDone] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [totalCards] = useState(() => getTotalCards());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [phase, setPhase] = useState<FlowPhase>('answering');
  const [attemptIndex, setAttemptIndex] = useState(1);
  const [feedback, setFeedback] = useState<RuleFeedback | null>(null);
  const savingRef = useRef(false);
  const pendingRef = useRef<{ payload: PersistPayload; advanceFn: () => void } | null>(null);
  const lastAnswerRef = useRef<CardAnswer | null>(null);

  const advance = useCallback(() => {
    const next = getNextCard();
    if (!next) {
      const elapsed = Date.now() - startTime;
      onComplete({ cardsCompleted: cardsDone, elapsed });
    } else {
      setCurrentCard(next);
      setCardKey((k) => k + 1);
    }
  }, [cardsDone, onComplete, startTime]);

  // Load first card
  useEffect(() => {
    advance();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Persist a card result + ability evidence in ONE atomic RPC call. Returns
  // true only if the RPC reports a definitive APPLIED status — otherwise
  // progression must be blocked, never silently treated as saved.
  const persist = useCallback(
    async (payload: PersistPayload): Promise<boolean> => {
      return applyLearningEvidence({
        sessionId,
        cardId: payload.cardId,
        cardType: payload.cardType,
        correct: payload.correct,
        userAnswer: payload.userAnswer,
      });
    },
    [sessionId],
  );

  const saveAndAdvance = useCallback(
    async (payload: PersistPayload, advanceFn: () => void) => {
      if (savingRef.current) return; // guard against rapid double-fire
      savingRef.current = true;
      pendingRef.current = { payload, advanceFn };
      setSaving(true);

      // executeSave guarantees the failure handler runs on BOTH a `false` return
      // and a thrown exception, so savingRef can never be left stuck true.
      await executeSave(
        () => persist(payload),
        {
          onSuccess: () => {
            pendingRef.current = null;
            savingRef.current = false;
            setSaving(false);
            setSaveError(false);
            advanceFn();
          },
          onFailure: () => {
            savingRef.current = false;
            setSaving(false);
            setSaveError(true);
          },
        },
      );
    },
    [persist],
  );

  const retrySave = useCallback(() => {
    const pending = pendingRef.current;
    if (!pending) return;
    saveAndAdvance(pending.payload, pending.advanceFn);
  }, [saveAndAdvance]);

  // 前端闭环核心：判题只用本地答案与正确答案的差异，不写库、不落 attempts。
  const handleAnswer = useCallback(
    (answer: CardAnswer) => {
      const fb = buildRuleFeedback(answer, attemptIndex);
      lastAnswerRef.current = answer;
      setFeedback(fb);
      if (fb.correct) setPhase('correct');
      else if (attemptIndex === 1) setPhase('hint');
      else setPhase('explained');
    },
    [attemptIndex],
  );

  const handleChoice = useCallback(
    (optionId: string) => {
      const card = currentCard as ChoiceCardData;
      const hasCorrect = card.correctOptionId && card.correctOptionId !== '';
      if (!hasCorrect) {
        // 偏好卡（welcome/goal）：无正误判断，直接保存并跳题，不进反馈闭环。
        saveAndAdvance(
          {
            cardType: 'choice',
            cardId: card.cardId,
            correct: null,
            userAnswer: { selectedOptionId: optionId },
          },
          () => {
            setCardsDone((n) => n + 1);
            advance();
          },
        );
        return;
      }
      handleAnswer({
        cardType: 'choice',
        selectedOptionId: optionId,
        correctOptionId: card.correctOptionId,
        options: card.options,
        presentationVariant: card.presentationVariant ?? 'standard',
      });
    },
    [currentCard, saveAndAdvance, advance, handleAnswer],
  );

  const handleReorderSubmit = useCallback(
    (orderedIds: string[]) => {
      const card = currentCard as ReorderCardData;
      handleAnswer({
        cardType: 'reorder',
        orderedChunkIds: orderedIds,
        correctOrder: card.correctOrder,
        chunks: card.chunks,
      });
    },
    [currentCard, handleAnswer],
  );

  const handleBreakdownComplete = useCallback(() => {
    const card = currentCard as LearningCard;
    // ReadingBreakdown: no correctness, just log
    saveAndAdvance(
      { cardType: 'reading_breakdown', cardId: card.cardId, correct: null, userAnswer: null },
      () => {
        setCardsDone((n) => n + 1);
        advance();
      },
    );
  }, [currentCard, saveAndAdvance, advance]);

  // 首次错误后同题重试：保持卡片挂载（Reorder 保留用户排列可编辑），仅解锁并重置判题。
  const handleRetry = useCallback(() => {
    setAttemptIndex(2);
    setFeedback(null);
    setPhase('answering');
  }, []);

  // 进入下一题前重置闭环状态（当前卡已保存，流状态回到初始）。
  const resetFlow = useCallback(() => {
    setPhase('answering');
    setAttemptIndex(1);
    setFeedback(null);
    lastAnswerRef.current = null;
  }, []);

  // 「继续」：正确或揭示后，才做唯一一次证据写入；保存成功才进入下一题。
  const handleContinue = useCallback(() => {
    const card = currentCard as LearningCard;
    const fb = feedback;
    const answer = lastAnswerRef.current;
    if (!fb || !answer) return;

    const userAnswer =
      answer.cardType === 'choice'
        ? { selectedOptionId: answer.selectedOptionId }
        : { orderedChunkIds: answer.orderedChunkIds };

    saveAndAdvance(
      {
        cardType: answer.cardType,
        cardId: card.cardId,
        correct: fb.correct,
        userAnswer,
      },
      () => {
        setCardsDone((n) => n + 1);
        resetFlow();
        advance();
      },
    );
  }, [currentCard, feedback, saveAndAdvance, advance, resetFlow]);

  if (!currentCard) {
    return (
      <div className="learning-shell learning-shell--loading">
        <p>Loading...</p>
      </div>
    );
  }

  const locked = phase !== 'answering';

  // 情景化词块教学（原句含义 / 搭配 / 记忆钩子）只在答题定局后随反馈展示，
  // 首次错误的提示阶段不泄露答案。
  const teaching =
    'teaching' in currentCard ? currentCard.teaching : undefined;

  const renderCard = () => {
    switch (currentCard.cardType) {
      case 'choice' as CardType:
        return (
          <ChoiceCard
            key={cardKey}
            data={currentCard as ChoiceCardData}
            onChoice={handleChoice}
            locked={locked}
          />
        );
      case 'reading_breakdown' as CardType:
        return (
          <ReadingBreakdownCard
            key={cardKey}
            data={currentCard as ReadingBreakdownCardData}
            onComplete={handleBreakdownComplete}
          />
        );
      case 'reorder' as CardType:
        return (
          <ReorderCard
            key={cardKey}
            data={currentCard as ReorderCardData}
            onSubmit={handleReorderSubmit}
            locked={locked}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="learning-shell">
      <div className="learning-shell__header">
        <SessionTimer startTime={startTime} />
        <span className="learning-shell__progress">
          {cardsDone + 1}/{totalCards}
        </span>
      </div>

      {saveError && (
        <div className="learning-shell__save-error">
          <p>保存失败，请检查网络后重试。</p>
          <button onClick={retrySave} disabled={saving}>
            {saving ? '保存中…' : '重试'}
          </button>
        </div>
      )}

      <div className="learning-shell__card-area">
        <AnimatePresence mode="wait">{renderCard()}</AnimatePresence>

        {feedback && phase !== 'answering' && (
          <FeedbackPanel
            feedback={feedback}
            teaching={teaching}
            saving={saving}
            onRetry={phase === 'hint' ? handleRetry : undefined}
            onContinue={
              phase === 'correct' || phase === 'explained' ? handleContinue : undefined
            }
          />
        )}
      </div>
    </div>
  );
}
