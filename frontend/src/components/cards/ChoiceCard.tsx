import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChoiceCardData, ChoiceOption } from '../../types';

interface Props {
  data: ChoiceCardData;
  onChoice: (optionId: string) => void;
}

export default function ChoiceCard({ data, onChoice }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  const handleSelect = (option: ChoiceOption) => {
    setSelected(option.id);
    // Brief delay so user sees the selection animation
    setTimeout(() => onChoice(option.id), 300);
  };

  return (
    <motion.div
      className="choice-card"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35 }}
    >
      {data.sentence && (
        <p className="choice-card__sentence">{data.sentence}</p>
      )}

      <div className="choice-card__options">
        <AnimatePresence>
          {data.options.map((opt, i) => (
            <motion.button
              key={opt.id}
              className={`choice-card__option ${selected === opt.id ? 'choice-card__option--selected' : ''}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.3 }}
              onClick={() => handleSelect(opt)}
              disabled={selected !== null}
            >
              {opt.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
