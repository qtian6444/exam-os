import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AbilitySnapshot, AbilityKey } from '../lib/ability';
import { getAbilityKey, getConfidenceKey, blankSnapshot } from '../lib/ability';
import { getAbilitySnapshot } from '../lib/db';
import { getLearningStats, type LearningStats } from '../lib/dashboard';
import { generateSuggestion, type LearningSuggestion } from '../lib/suggestion';

interface Props {
  onStart: () => Promise<boolean>;
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

export default function Dashboard({ onStart }: Props) {
  const [ability, setAbility] = useState<AbilitySnapshot | null>(null);
  const [stats, setStats] = useState<LearningStats>({ todayCount: null, streak: null });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      // Each read is independently fault-tolerant: a failure leaves its section
      // in a "—" / zero-state, never throws, so the Dashboard always renders.
      try {
        const snap = await getAbilitySnapshot();
        if (!cancelled) setAbility(snap);
      } catch {
        // leave ability null → zero-state card
      }

      try {
        const s = await getLearningStats();
        if (!cancelled) setStats(s);
      } catch {
        // keep nulls → "—" placeholders
      }

      if (!cancelled) setLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const suggestion: LearningSuggestion = generateSuggestion(ability ?? blankSnapshot());
  const hasAbility = ability !== null && DIMENSIONS.some((d) => getAbilityKey(ability, d.key) > 0);

  const handleStart = async () => {
    setStarting(true);
    setStartError(null);
    try {
      const ok = await onStart();
      if (!ok) setStartError('无法准备学习环境，请检查网络后重试。');
      // on success the parent switches stage and this component unmounts
    } catch {
      setStartError('无法准备学习环境，请检查网络后重试。');
    } finally {
      setStarting(false);
    }
  };

  return (
    <motion.div
      className="dashboard"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <header className="dashboard__header">
        <h1 className="dashboard__title">Exam OS</h1>
        <p className="dashboard__subtitle">今天也要进步一点</p>
      </header>

      <div className="dashboard__stats">
        <div className="dashboard__stat">
          <span className="dashboard__stat-value">
            {stats.todayCount === null ? '—' : stats.todayCount}
          </span>
          <span className="dashboard__stat-label">今日学习</span>
        </div>
        <div className="dashboard__stat">
          <span className="dashboard__stat-value">
            {stats.streak === null ? '—' : stats.streak}
          </span>
          <span className="dashboard__stat-label">连续天数</span>
        </div>
      </div>

      <section className="dashboard__section">
        <h2 className="dashboard__section-title">能力评分</h2>
        {loading ? (
          <div className="dashboard__empty">正在读取你的能力画像…</div>
        ) : !hasAbility ? (
          <div className="dashboard__empty">完成一次学习，建立你的能力画像</div>
        ) : (
          <ul className="dashboard__abilities">
            {DIMENSIONS.map((d) => {
              const score = getAbilityKey(ability!, d.key);
              const conf = getConfidenceKey(ability!, d.key);
              return (
                <li key={d.key} className="dashboard__ability">
                  <div className="dashboard__ability-head">
                    <span className="dashboard__ability-label">{d.label}</span>
                    <span className="dashboard__ability-score">{toPercent(score)}</span>
                  </div>
                  <div className="dashboard__ability-track">
                    <div
                      className="dashboard__ability-fill"
                      style={{ width: `${toPercent(score)}%` }}
                    />
                  </div>
                  <div className="dashboard__ability-conf">置信度 {toPercent(conf)}%</div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="dashboard__section dashboard__suggestion">
        <h2 className="dashboard__section-title">学习建议</h2>
        <p className="dashboard__suggestion-headline">{suggestion.headline}</p>
        <ul className="dashboard__suggestion-items">
          {suggestion.items.map((item) => (
            <li key={item} className="dashboard__suggestion-item">
              {item}
            </li>
          ))}
        </ul>
      </section>

      {startError && (
        <p className="dashboard__start-error" role="alert">
          {startError}
        </p>
      )}

      <motion.button
        className="dashboard__start"
        onClick={handleStart}
        disabled={starting}
        whileTap={{ scale: 0.97 }}
      >
        {starting ? '准备中…' : '开始学习'}
      </motion.button>
    </motion.div>
  );
}
