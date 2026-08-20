import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AbilitySnapshot, AbilityKey } from '../lib/ability';
import { getAbilityKey, blankSnapshot } from '../lib/ability';
import { getAbilitySnapshot } from '../lib/db';
import { generateSuggestion, analyzeResult } from '../lib/suggestion';

interface Props {
  cardsCompleted: number;
  elapsed: number;
  beforeSnapshot: AbilitySnapshot | null;
  onBack: () => void;
}

const DIMENSIONS: { key: AbilityKey; label: string }[] = [
  { key: 'vocabulary', label: '词汇' },
  { key: 'sentence', label: '长难句' },
  { key: 'reading', label: '阅读' },
  { key: 'listening', label: '听力' },
  { key: 'writing', label: '写作' },
];

function toPercent(v: number): number {
  return Math.round(Math.max(0, Math.min(1, v)) * 100);
}

export default function SessionComplete({ cardsCompleted, elapsed, beforeSnapshot, onBack }: Props) {
  const [afterSnapshot, setAfterSnapshot] = useState<AbilitySnapshot | null>(null);
  const [afterFailed, setAfterFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const snap = await getAbilitySnapshot();
        if (!cancelled) setAfterSnapshot(snap);
      } catch {
        if (!cancelled) setAfterFailed(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const seconds = Math.floor(elapsed / 1000);
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;

  // Fallback chain keeps the page renderable: missing post-read → diff vs the
  // pre-snapshot (all-zero deltas), never a throw.
  const before = beforeSnapshot ?? blankSnapshot();
  const after = afterSnapshot ?? before;
  const suggestion = generateSuggestion(after);
  const feedback = analyzeResult(before, after, cardsCompleted);

  return (
    <motion.div
      className="session-complete"
      initial={{ opacity: 0, scale: 0.92 }}
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

      <section className="result__section">
        <h3 className="result__section-title">能力变化</h3>
        {afterFailed ? (
          <p className="result__note">能力已更新，返回首页可查看最新评分。</p>
        ) : (
          <ul className="result__deltas">
            {DIMENSIONS.map((d) => {
              const b = getAbilityKey(before, d.key);
              const a = getAbilityKey(after, d.key);
              const dp = Math.round((a - b) * 100);
              const deltaText = dp > 0 ? `+${dp}` : dp < 0 ? `${dp}` : '—';
              const cls = dp > 0 ? 'result__delta--up' : dp < 0 ? 'result__delta--down' : 'result__delta--flat';
              return (
                <li key={d.key} className="result__delta">
                  <span className="result__delta-label">{d.label}</span>
                  <span className="result__delta-range">
                    {toPercent(b)} → {toPercent(a)}
                  </span>
                  <span className={`result__delta-badge ${cls}`}>{deltaText}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="result__section">
        <h3 className="result__section-title">AI 小结</h3>
        <p className="result__suggestion-headline">{suggestion.headline}</p>

        <div className="result__feedback">
          <span className="result__feedback-label">本次提升</span>
          <ul className="result__suggestion-items">
            {feedback.improvements.map((item) => (
              <li key={item} className="result__suggestion-item">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="result__feedback">
          <span className="result__feedback-label">当前薄弱</span>
          <ul className="result__suggestion-items">
            {feedback.weakPoints.map((item) => (
              <li key={item} className="result__suggestion-item">
                {item}
              </li>
            ))}
          </ul>
        </div>

        <div className="result__feedback">
          <span className="result__feedback-label">下一步</span>
          <p className="result__feedback-action">{feedback.nextAction}</p>
        </div>
      </section>

      <motion.button
        className="session-complete__btn"
        onClick={onBack}
        whileTap={{ scale: 0.96 }}
      >
        返回首页
      </motion.button>
    </motion.div>
  );
}
