import { motion } from 'framer-motion';

interface Props {
  cardsCompleted: number;
  elapsed: number;
  onRestart: () => void;
}

export default function SessionComplete({ cardsCompleted, elapsed, onRestart }: Props) {
  const seconds = Math.floor(elapsed / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  return (
    <motion.div
      className="session-complete"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="session-complete__icon">🎉</div>
      <h2 className="session-complete__title">今日学习完成！</h2>

      <div className="session-complete__stats">
        <div className="session-complete__stat">
          <span className="session-complete__stat-value">{cardsCompleted}</span>
          <span className="session-complete__stat-label">卡片完成</span>
        </div>
        <div className="session-complete__stat">
          <span className="session-complete__stat-value">
            {mins}:{String(secs).padStart(2, '0')}
          </span>
          <span className="session-complete__stat-label">用时</span>
        </div>
      </div>

      <motion.button
        className="session-complete__btn"
        onClick={onRestart}
        whileTap={{ scale: 0.96 }}
      >
        再来一次
      </motion.button>
    </motion.div>
  );
}
