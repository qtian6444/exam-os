import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { LearningCard, CardType } from '../types';
import { getNextCard, getTotalCards } from '../data/mock';
import {
  insertLearningRecord,
  processAbilityEvidence,
  shouldSkipEvidence,
  getCardDifficulty,
} from '../lib/db';
import ChoiceCard from './cards/ChoiceCard';
import ReadingBreakdownCard from './cards/ReadingBreakdownCard';
import ReorderCard from './cards/ReorderCard';
import SessionTimer from './SessionTimer';

interface Props {
  onComplete: (stats: { cardsCompleted: number; elapsed: number }) => void;
  sessionId: string;
}

export default function LearningShell({ onComplete, sessionId }: Props) {
  const [currentCard, setCurrentCard] = useState<LearningCard | null>(null);
  const [cardKey, setCardKey] = useState(0);
  const [cardsDone, setCardsDone] = useState(0);
  const [startTime] = useState(() => Date.now());
  const [totalCards] = useState(() => getTotalCards());

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

  // Persist card result + compute ability evidence (async, fire-and-forget)
  const persistCard = useCallback(
    async (
      cardType: string,
      cardId: string,
      correct: boolean | null,
      userAnswer?: unknown,
    ) => {
      const recordId = await insertLearningRecord({
        sessionId,
        cardId,
        cardType: cardType as 'choice' | 'reading_breakdown' | 'reorder',
        correct,
        userAnswer,
      });

      // If card should produce ability evidence, compute and write
      if (recordId && !shouldSkipEvidence(cardType, cardId) && correct !== null) {
        const difficulty = getCardDifficulty(cardType);
        await processAbilityEvidence(recordId, cardType, correct, difficulty);
      }
    },
    [sessionId],
  );

  const handleChoice = useCallback(
    (optionId: string) => {
      const card = currentCard as any;
      const isCorrect =
        card.correctOptionId && card.correctOptionId !== ''
          ? optionId === card.correctOptionId
          : null; // preference cards: null

      persistCard('choice', card.cardId, isCorrect, { selectedOptionId: optionId });
      setCardsDone((n) => n + 1);
      advance();
    },
    [currentCard, advance, persistCard],
  );

  const handleBreakdownComplete = useCallback(() => {
    const card = currentCard as any;
    // ReadingBreakdown: no correctness, just log
    persistCard('reading_breakdown', card.cardId, null, null);
    setCardsDone((n) => n + 1);
    advance();
  }, [currentCard, advance, persistCard]);

  const handleReorderSubmit = useCallback(
    (orderedIds: string[]) => {
      const card = currentCard as any;
      const isCorrect =
        orderedIds.length === card.correctOrder.length &&
        orderedIds.every((id: string, i: number) => id === card.correctOrder[i]);

      persistCard('reorder', card.cardId, isCorrect, { orderedChunkIds: orderedIds });
      setCardsDone((n) => n + 1);
      // Wait so user sees result, then advance
      setTimeout(() => advance(), 2000);
    },
    [currentCard, advance, persistCard],
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

      <div className="learning-shell__card-area">
        <AnimatePresence mode="wait">{renderCard()}</AnimatePresence>
      </div>
    </div>
  );
}
