import { useState, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import type { ReorderCardData, ChunkItem } from '../../types';

interface Props {
  data: ReorderCardData;
  onSubmit: (orderedIds: string[]) => void;
}

export default function ReorderCard({ data, onSubmit }: Props) {
  const [items, setItems] = useState<ChunkItem[]>(() =>
    [...data.chunks].sort(() => Math.random() - 0.5),
  );
  const [submitted, setSubmitted] = useState(false);
  const [correct, setCorrect] = useState<boolean | null>(null);

  const handleSubmit = useCallback(() => {
    const ordered = items.map((c) => c.id);
    const isCorrect =
      ordered.length === data.correctOrder.length &&
      ordered.every((id, i) => id === data.correctOrder[i]);

    setCorrect(isCorrect);
    setSubmitted(true);
    onSubmit(ordered);
  }, [items, data.correctOrder, onSubmit]);

  return (
    <motion.div
      className="reorder-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35 }}
    >
      <p className="reorder-card__prompt">按正确顺序排列句子：</p>

      {!submitted ? (
        <>
          <Reorder.Group
            axis="y"
            values={items}
            onReorder={setItems}
            className="reorder-card__list"
          >
            {items.map((chunk, i) => (
              <Reorder.Item
                key={chunk.id}
                value={chunk}
                className="reorder-card__chunk"
              >
                <span className="reorder-card__chunk-num">{i + 1}</span>
                <span className="reorder-card__chunk-text">{chunk.text}</span>
              </Reorder.Item>
            ))}
          </Reorder.Group>

          <motion.button
            className="reorder-card__submit"
            onClick={handleSubmit}
            whileTap={{ scale: 0.96 }}
          >
            提交
          </motion.button>
        </>
      ) : (
        <div className="reorder-card__result">
          <div className={`reorder-card__verdict ${correct ? 'reorder-card__verdict--correct' : 'reorder-card__verdict--wrong'}`}>
            {correct ? '✓ 正确！' : '✗ 不正确'}
          </div>

          {!correct && (
            <div className="reorder-card__answer">
              <p className="reorder-card__answer-label">正确顺序：</p>
              {data.correctOrder.map((id, i) => {
                const chunk = data.chunks.find((c) => c.id === id)!;
                return (
                  <div key={id} className="reorder-card__answer-chunk">
                    <span className="reorder-card__chunk-num">{i + 1}</span>
                    <span>{chunk.text}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </motion.div>
  );
}
