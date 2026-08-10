import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import type { ReadingBreakdownCardData, BreakdownContent } from '../../types';
import { getMockBreakdown } from '../../data/mock';

interface Props {
  data: ReadingBreakdownCardData;
  onComplete: () => void;
}

const STEPS: { key: keyof BreakdownContent; label: string }[] = [
  { key: 'main_clause', label: '主句' },
  { key: 'relation', label: '关系' },
  { key: 'natural_meaning', label: '自然语义' },
];

export default function ReadingBreakdownCard({ data, onComplete }: Props) {
  const [content, setContent] = useState<BreakdownContent | null>(data.content);
  const [revealStep, setRevealStep] = useState(0);
  const [loading, setLoading] = useState(!data.content);

  useEffect(() => {
    if (data.content) {
      setContent(data.content);
      setLoading(false);
      return;
    }

    // Mock: simulate API delay then return breakdown
    const breakdown = getMockBreakdown(data.cardId);
    if (breakdown) {
      const timer = setTimeout(() => {
        setContent({
          main_clause: breakdown[0],
          relation: breakdown[1],
          natural_meaning: breakdown[2],
        });
        setLoading(false);
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [data.cardId, data.content]);

  const handleReveal = () => {
    if (!content) return;
    if (revealStep < STEPS.length) {
      setRevealStep((s) => s + 1);
    }
  };

  const allRevealed = revealStep >= STEPS.length;

  return (
    <motion.div
      className="reading-breakdown-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35 }}
    >
      <div className="breakdown__sentence-box">
        <p className="breakdown__sentence">{data.sentence}</p>
      </div>

      {loading ? (
        <div className="breakdown__loading">
          <motion.span
            animate={{ opacity: [0.4, 1, 0.4] }}
            transition={{ repeat: Infinity, duration: 1.4 }}
          >
            AI is reading...
          </motion.span>
        </div>
      ) : (
        <div className="breakdown__steps">
          {STEPS.map((step, i) => (
            <motion.div
              key={step.key}
              className={`breakdown__step ${i < revealStep ? 'breakdown__step--visible' : ''}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: i < revealStep ? 1 : 0.3 }}
              transition={{ duration: 0.4 }}
            >
              <span className="breakdown__step-label">{step.label}</span>
              <span className="breakdown__step-text">
                {i < revealStep ? content![step.key] : '???'}
              </span>
            </motion.div>
          ))}
        </div>
      )}

      {!loading && !allRevealed && (
        <motion.button
          className="breakdown__reveal-btn"
          onClick={handleReveal}
          whileTap={{ scale: 0.96 }}
        >
          点击展开
        </motion.button>
      )}

      {allRevealed && (
        <motion.button
          className="breakdown__continue-btn"
          onClick={onComplete}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          whileTap={{ scale: 0.96 }}
        >
          继续
        </motion.button>
      )}
    </motion.div>
  );
}
