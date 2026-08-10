import { useState, useCallback, useEffect } from 'react';
import { AnimatePresence } from 'framer-motion';
import type { LearningCard, CardType } from '../types';
import { getNextCard, getTotalCards } from '../data/mock';
import ChoiceCard from './cards/ChoiceCard';
import ReadingBreakdownCard from './cards/ReadingBreakdownCard';
import ReorderCard from './cards/ReorderCard';
import SessionTimer from './SessionTimer';

interface Props {
  onComplete: (stats: { cardsCompleted: number; elapsed: number }) => void;
}

export default function LearningShell({ onComplete }: Props) {
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

  const handleChoice = useCallback(
    (_optionId: string) => {
      setCardsDone((n) => n + 1);
      advance();
    },
    [advance],
  );

  const handleBreakdownComplete = useCallback(() => {
    setCardsDone((n) => n + 1);
    advance();
  }, [advance]);

  const handleReorderSubmit = useCallback(
    (_orderedIds: string[]) => {
      setCardsDone((n) => n + 1);
      // Wait a bit so user sees result, then advance
      setTimeout(() => advance(), 2000);
    },
    [advance],
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
