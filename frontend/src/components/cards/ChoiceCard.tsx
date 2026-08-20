import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ChoiceCardData, ChoiceOption } from '../../types';

const VARIANT_LABEL: Record<string, string> = {
  cloze: '选词填空',
  dialogue: '对话回应',
  reading: '阅读选择',
  translation: '情境表达',
};

interface Props {
  data: ChoiceCardData;
  onChoice: (optionId: string) => void;
  locked?: boolean;
}

export default function ChoiceCard({ data, onChoice, locked = false }: Props) {
  const [selected, setSelected] = useState<string | null>(null);

  // 解锁（重试）时清空上一轮的选择，避免误提交同一错误答案；
  // 判题锁定时保留高亮，让用户看清自己选的是哪一项。
  useEffect(() => {
    if (!locked) setSelected(null);
  }, [locked]);

  const handleSelect = (option: ChoiceOption) => {
    if (locked) return;
    // Select only updates local state; judgement happens on explicit 提交.
    setSelected(option.id);
  };

  const handleSubmit = () => {
    if (locked || !selected) return;
    onChoice(selected);
  };

  const variant = data.presentationVariant ?? 'standard';
  const variantLabel = VARIANT_LABEL[variant];

  return (
    <motion.div
      className={`choice-card ${locked ? 'choice-card--locked' : ''}`}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -24 }}
      transition={{ duration: 0.35 }}
    >
      {variantLabel && (
        <span className="choice-card__variant">{variantLabel}</span>
      )}

      {data.sentence && (
        <p className={`choice-card__sentence choice-card__sentence--${variant}`}>
          {data.sentence}
        </p>
      )}

      {data.prompt && (
        <p className="choice-card__prompt">{data.prompt}</p>
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
              disabled={locked}
            >
              {opt.text}
            </motion.button>
          ))}
        </AnimatePresence>
      </div>

      <motion.button
        type="button"
        className="choice-card__submit"
        onClick={handleSubmit}
        disabled={locked || selected === null}
        whileTap={{ scale: 0.96 }}
      >
        提交
      </motion.button>
    </motion.div>
  );
}
