import { useState, useCallback, useEffect, useRef } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { LearningCard, CardType } from '../types';
import { getNextCard, getTotalCards } from '../data/mock';
import { applyLearningEvidence } from '../lib/db';
import { executeSave } from '../lib/saveExecutor';
import ChoiceCard from './cards/ChoiceCard';
import ReadingBreakdownCard from './cards/ReadingBreakdownCard';
import ReorderCard from './cards/ReorderCard';
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

export default function LearningShell({ onComplete, sessionId }: Props) {
  const [currentCard, setCurrentCard] = useState<LearningCard | null>(null);
  const [cardKey, setCardKey] = useState(0);
  const [cardsDone, setCardsDone] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [totalCards] = useState(() => getTotalCards());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const savingRef = useRef(false);
  const pendingRef = useRef<{ payload: PersistPayload; advanceFn: () => void } | null>(null);

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

  const handleChoice = useCallback(
    (optionId: string) => {
      const card = currentCard as any;
      const isCorrect =
        card.correctOptionId && card.correctOptionId !== ''
          ? optionId === card.correctOptionId
          : null; // preference cards: null

      saveAndAdvance(
        {
          cardType: 'choice',
          cardId: card.cardId,
          correct: isCorrect,
          userAnswer: { selectedOptionId: optionId },
        },
        () => {
          setCardsDone((n) => n + 1);
          advance();
        },
      );
    },
    [currentCard, saveAndAdvance, advance],
  );

  const handleBreakdownComplete = useCallback(() => {
    const card = currentCard as any;
    // ReadingBreakdown: no correctness, just log
    saveAndAdvance(
      { cardType: 'reading_breakdown', cardId: card.cardId, correct: null, userAnswer: null },
      () => {
        setCardsDone((n) => n + 1);
        advance();
      },
    );
  }, [currentCard, saveAndAdvance, advance]);

  const handleReorderSubmit = useCallback(
    (orderedIds: string[]) => {
      const card = currentCard as any;
      const isCorrect =
        orderedIds.length === card.correctOrder.length &&
        orderedIds.every((id: string, i: number) => id === card.correctOrder[i]);

      saveAndAdvance(
        {
          cardType: 'reorder',
          cardId: card.cardId,
          correct: isCorrect,
          userAnswer: { orderedChunkIds: orderedIds },
        },
        () => {
          setCardsDone((n) => n + 1);
          // Wait so user sees result, then advance
          setTimeout(() => advance(), 2000);
        },
      );
    },
    [currentCard, saveAndAdvance, advance],
  );

  if (!currentCard) {
    return (
      <div className="learning-shell learning-shell--loading">
        <p>Loading...</p>
      </div>
    );
  }

  const renderCard = () => {
    switch (currentCard.cardType) {
      case 'choice' as CardType:
        return (
          <ChoiceCard
            key={cardKey}
            data={currentCard as any}
            onChoice={handleChoice}
          />
        );
      case 'reading_breakdown' as CardType:
        return (
          <ReadingBreakdownCard
            key={cardKey}
            data={currentCard as any}
            onComplete={handleBreakdownComplete}
          />
        );
      case 'reorder' as CardType:
        return (
          <ReorderCard
            key={cardKey}
            data={currentCard as any}
            onSubmit={handleReorderSubmit}
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
      </div>
    </div>
  );
}
