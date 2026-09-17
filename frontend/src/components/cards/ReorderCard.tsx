import { useState, useCallback } from 'react';
import { motion, Reorder } from 'framer-motion';
import type { ReorderCardData, ChunkItem } from '../../types';
import type { RuleFeedback } from '../../lib/feedback';

interface Props {
  data: ReorderCardData;
  onSubmit: (orderedIds: string[]) => void;
  locked?: boolean;
  feedback?: RuleFeedback | null;
}

export default function ReorderCard({ data, onSubmit, locked = false, feedback = null }: Props) {
  const [items, setItems] = useState<ChunkItem[]>(() =>
    [...data.chunks].sort(() => Math.random() - 0.5),
  );

  const handleSubmit = useCallback(() => {
    if (locked) return;
    const ordered = items.map((c) => c.id);
    onSubmit(ordered);
  }, [items, locked, onSubmit]);

  return (
    <motion.div
      className={`reorder-card ${locked ? 'reorder-card--locked' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35 }}
    >
      <p className="reorder-card__prompt">按正确顺序排列句子：</p>

      <Reorder.Group
        axis="y"
        values={items}
        onReorder={locked ? () => {} : setItems}
        className="reorder-card__list"
      >
        {items.map((chunk, i) => (
          <Reorder.Item
            key={chunk.id}
            value={chunk}
            className={`reorder-card__chunk ${feedback?.where.some((loc) => loc.kind === 'block' && loc.index === i) ? 'reorder-card__chunk--mismatch' : ''}`}
          >
            <span className="reorder-card__chunk-num">{i + 1}</span>
            <span className="reorder-card__chunk-text">{chunk.text}</span>
          </Reorder.Item>
        ))}
      </Reorder.Group>

      <motion.button
        type="button"
        className="reorder-card__submit"
        onClick={handleSubmit}
        disabled={locked}
        whileTap={{ scale: 0.96 }}
      >
        提交
      </motion.button>
    </motion.div>
  );
}
