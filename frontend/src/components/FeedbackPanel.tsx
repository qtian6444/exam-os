import { motion } from 'framer-motion';
import type { RuleFeedback } from '../lib/feedback';
import type { CardTeaching } from '../types';

interface FeedbackPanelProps {
  feedback: RuleFeedback;
  teaching?: CardTeaching;
  saving?: boolean;
  onRetry?: () => void;
  onContinue?: () => void;
}

export default function FeedbackPanel({
  feedback,
  teaching,
  saving = false,
  onRetry,
  onContinue,
}: FeedbackPanelProps) {
  return (
    <motion.div
      className="feedback-panel"
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25 }}
      role="region"
      aria-label="答题反馈"
    >
      <div
        className={`feedback-panel__verdict ${
          feedback.correct
            ? 'feedback-panel__verdict--correct'
            : 'feedback-panel__verdict--wrong'
        }`}
      >
        {feedback.correct ? '✓ 正确' : '需要调整'}
      </div>

      <div className="feedback-panel__block">
        <span className="feedback-panel__label">为什么</span>
        <p className="feedback-panel__text">{feedback.why}</p>
      </div>

      {feedback.where.length > 0 && (
        <div className="feedback-panel__block">
          <span className="feedback-panel__label">错在哪</span>
          {feedback.where.map((loc, i) => (
            <p key={i} className="feedback-panel__text">
              {loc.message}
            </p>
          ))}
        </div>
      )}

      {feedback.revealAnswer && feedback.correctAnswerText && (
        <div className="feedback-panel__block feedback-panel__block--answer">
          <span className="feedback-panel__label">正确答案</span>
          <p className="feedback-panel__text">{feedback.correctAnswerText}</p>
        </div>
      )}

      <div className="feedback-panel__block">
        <span className="feedback-panel__label">下一步</span>
        <p className="feedback-panel__text">{feedback.next}</p>
      </div>

      {teaching && onContinue && (
        <div className="feedback-panel__teaching">
          <span className="feedback-panel__label">词块与记忆</span>
          <div className="feedback-panel__teaching-row">
            <span className="feedback-panel__teaching-tag">原句含义</span>
            <p className="feedback-panel__text">{teaching.meaning}</p>
          </div>
          <div className="feedback-panel__teaching-row">
            <span className="feedback-panel__teaching-tag">常见搭配</span>
            <p className="feedback-panel__text">{teaching.collocation}</p>
          </div>
          <div className="feedback-panel__teaching-row">
            <span className="feedback-panel__teaching-tag">记忆钩子</span>
            <p className="feedback-panel__text">{teaching.hook}</p>
          </div>
        </div>
      )}

      {onRetry && (
        <button
          type="button"
          className="feedback-panel__btn"
          onClick={onRetry}
          disabled={saving}
        >
          再试一次
        </button>
      )}

      {onContinue && (
        <button
          type="button"
          className="feedback-panel__btn feedback-panel__btn--primary"
          onClick={onContinue}
          disabled={saving}
        >
          {saving ? '保存中…' : '继续'}
        </button>
      )}
    </motion.div>
  );
}
