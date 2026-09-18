import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import type { AbilitySnapshot, AbilityKey } from '../lib/ability';
import type { FirstSessionContext } from '../types';
import AbilityRadar from './AbilityRadar';
import { getAbilityKey, getConfidenceKey, blankSnapshot } from '../lib/ability';
import { getAbilitySnapshot } from '../lib/db';
import { getLearningStats, type LearningStats } from '../lib/dashboard';
import { generateSuggestion, generateDailyGoal, type LearningSuggestion, type DailyGoal } from '../lib/suggestion';
import { isSupabaseConfigured } from '../lib/supabase';
import {
  getSessionSignalGoal,
  getSessionSignalNextStep,
  readLocalGuestSessionProfile,
  type SessionEvidenceProfile,
} from '../lib/sessionEvidence';
import { buildSessionAbilitySummary, buildSnapshotAbilitySummary } from '../lib/sessionAbility';
import './DashboardV2.css';

interface Props {
  onStart: () => Promise<boolean>;
  /** Session-scoped starting context; self-report only, never a score. */
  profileContext?: FirstSessionContext | null;
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

const PURPOSE_LABELS: Record<FirstSessionContext['purpose'], string> = {
  cet_exam: '四六级备考',
  long_term: '长期英语能力',
  ielts_study_abroad: '雅思 / 留学准备',
  career: '工作与职业发展',
};

const BASELINE_LABELS: Record<FirstSessionContext['selfBaseline'], string> = {
  starter: '正在打基础',
  foundation: '有基础，但句子理解吃力',
  developing: '能做简单内容，但还不稳定',
  functional: '具备一定基础，想查缺补漏',
  strong: '基础较好，想继续提高',
};

const OBSTACLE_LABELS: Record<FirstSessionContext['primaryObstacle'], string> = {
  vocabulary_insufficient: '词汇量',
  words_known_sentences_unclear: '句子理解',
  reading_locate_unstable: '阅读定位',
  listening_lag: '听力反应',
  writing_expression_hard: '写作与表达',
  undecided_comprehensive: '综合定位',
};

const SUPPORT_LABELS: Record<FirstSessionContext['supportPreference'], string> = {
  more_hints_guided: '多提示引导',
  moderate_hints_self_try: '先自主尝试',
  few_hints_challenge: '少提示挑战',
};

export default function Dashboard({ onStart, profileContext = null }: Props) {
  const [ability, setAbility] = useState<AbilitySnapshot | null>(null);
  const [guestProfile, setGuestProfile] = useState<SessionEvidenceProfile | null>(null);
  const [stats, setStats] = useState<LearningStats>({ todayCount: null, streak: null });
  const [loading, setLoading] = useState(true);
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isSupabaseConfigured) {
      // Guest mode reads only the last session summary from this browser tab.
      // It is an observable signal, not a cloud-backed ability estimate.
      setGuestProfile(readLocalGuestSessionProfile());
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

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

  const suggestion: LearningSuggestion = generateSuggestion(ability ?? blankSnapshot(), {
    streak: stats.streak ?? 0,
  });
  const goal: DailyGoal = generateDailyGoal(ability ?? blankSnapshot());
  const hasAbility = ability !== null && DIMENSIONS.some((d) => getAbilityKey(ability, d.key) > 0);
  const recordLabel = isSupabaseConfigured ? '学习档案' : '本机体验';
  const sessionGoal = guestProfile ? getSessionSignalGoal(guestProfile) : null;
  const sessionNextStep = guestProfile ? getSessionSignalNextStep(guestProfile) : null;
  const abilitySummary = guestProfile
    ? buildSessionAbilitySummary(guestProfile)
    : hasAbility
      ? buildSnapshotAbilitySummary(ability!)
      : null;

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
        <div className="dashboard__masthead">
          <div className="dashboard__brand">
            <span aria-hidden="true">考</span>
            <strong>Exam OS</strong>
          </div>
          <span className="dashboard__record-status">{recordLabel}</span>
        </div>
        <p className="dashboard__eyebrow">EXAM ENGLISH · LEARNING RECORD</p>
        <h1 className="dashboard__title">让每一次作答，留下看得见的线索。</h1>
        <p className="dashboard__subtitle">
          从真实语境出发，先理解一句话，再逐步建立自己的英语学习路径。
        </p>
      </header>

      <section className="dashboard__active-module" aria-labelledby="active-module-title">
        <div className="dashboard__active-copy">
          <p>当前开放 · 01</p>
          <h2 id="active-module-title">真题阅读与句法</h2>
          <span>6 道真实语境任务 · 首次错误给线索 · 作答过程可追溯</span>
          <small>
            题源：项目已核对的 2026 年 6 月 CET-4 材料。这里展示的是内容来源，不是官方难度校准。
          </small>
        </div>
        <div className="dashboard__active-action">
          <span>READ · UNDERSTAND · RETRIEVE</span>
          <motion.button
            className="dashboard__start"
            onClick={handleStart}
            disabled={starting}
            whileTap={{ scale: 0.97 }}
          >
            {starting ? '准备中…' : '进入本次训练'}
          </motion.button>
        </div>
      </section>

      {startError && (
        <p className="dashboard__start-error" role="alert">
          {startError}
        </p>
      )}

      <div className="dashboard__overview-grid">
        <section className="dashboard__section dashboard__goal">
          <h2 className="dashboard__section-title">本次练习建议</h2>
          <p className="dashboard__goal-text">{sessionGoal?.title ?? goal.goal}</p>
          <p className="dashboard__goal-action">{sessionGoal?.action ?? goal.action}</p>
        </section>

        <section className="dashboard__section dashboard__record-card">
          <h2 className="dashboard__section-title">本次学习记录</h2>
          <div className="dashboard__stats">
            <div className="dashboard__stat">
              <span className="dashboard__stat-value">
                {guestProfile ? guestProfile.cardsCompleted : stats.todayCount === null ? '—' : stats.todayCount}
              </span>
              <span className="dashboard__stat-label">{guestProfile ? '本次完成' : '今日完成'}</span>
            </div>
            <div className="dashboard__stat">
              <span className="dashboard__stat-value">
                {guestProfile ? guestProfile.firstTryCount : stats.streak === null ? '—' : stats.streak}
              </span>
              <span className="dashboard__stat-label">{guestProfile ? '首次完成' : '连续学习'}</span>
            </div>
          </div>
          <p className="dashboard__record-note">
            {isSupabaseConfigured
              ? '数据以真实作答记录为准。'
              : '当前为游客本机体验，不建立云端长期档案。'}
          </p>
        </section>
      </div>

      {profileContext && (
        <section className="dashboard__section dashboard__starting-profile" aria-labelledby="starting-profile-title">
          <div className="dashboard__starting-profile-head">
            <div>
              <p className="dashboard__starting-profile-kicker">STARTING CONTEXT · SELF REPORT</p>
              <h2 id="starting-profile-title" className="dashboard__section-title">你的学习起点</h2>
            </div>
            <span className="dashboard__starting-profile-badge">已记录</span>
          </div>
          <p className="dashboard__starting-profile-note">
            这是你刚才选择的学习背景，不是能力分；真实能力线索仍以之后的作答证据为准。
          </p>
          <div className="dashboard__starting-profile-grid">
            <div>
              <span>学习方向</span>
              <strong>{PURPOSE_LABELS[profileContext.purpose]}</strong>
            </div>
            <div>
              <span>自述基础</span>
              <strong>{BASELINE_LABELS[profileContext.selfBaseline]}</strong>
            </div>
            <div>
              <span>先解决</span>
              <strong>{OBSTACLE_LABELS[profileContext.primaryObstacle]}</strong>
            </div>
            <div>
              <span>训练节奏</span>
              <strong>{SUPPORT_LABELS[profileContext.supportPreference]}</strong>
            </div>
          </div>
        </section>
      )}

      {abilitySummary && <AbilityRadar summary={abilitySummary} />}

      <div className="dashboard__lower-grid">
        <section className="dashboard__section dashboard__observation">
          <h2 className="dashboard__section-title">{isSupabaseConfigured ? '行为观察' : '本次能力线索'}</h2>
          {loading ? (
            <div className="dashboard__empty">正在读取已有作答记录…</div>
          ) : !isSupabaseConfigured && guestProfile ? (
            <>
              <p className="dashboard__signal-disclaimer">
                只反映本次真实作答，不是长期能力值；下一次训练会单独记录新的会话证据。
              </p>
              <ul className="dashboard__signals">
                {DIMENSIONS.map((dimension) => {
                  const signal = guestProfile.dimensions[dimension.key];
                  const coverage = guestProfile.cardsCompleted > 0
                    ? Math.round((signal.evidenceCount / guestProfile.cardsCompleted) * 100)
                    : 0;
                  const outcomeSummary = signal.evidenceCount > 0
                    ? `首答 ${signal.firstTryCount} · 重试 ${signal.retryCount} · 解析 ${signal.revealedCount}`
                    : '本次未观测，不等于薄弱';
                  return (
                    <li key={dimension.key} className="dashboard__signal">
                      <div className="dashboard__signal-head">
                        <span className="dashboard__ability-label">{dimension.label}</span>
                        <strong className="dashboard__signal-count">
                          {signal.evidenceCount > 0 ? `${signal.evidenceCount} 条证据` : '未观测'}
                        </strong>
                      </div>
                      <div className="dashboard__signal-track" aria-label={`${dimension.label}证据覆盖 ${coverage}%`}>
                        <div className="dashboard__signal-fill" style={{ width: `${coverage}%` }} />
                      </div>
                      <small className="dashboard__signal-meta">{outcomeSummary}</small>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : !hasAbility ? (
            <div className="dashboard__empty">完成一次训练后，系统才会依据真实作答形成观察。</div>
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
                    <div className="dashboard__ability-conf">证据置信度 {toPercent(conf)}%</div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section className="dashboard__section dashboard__suggestion">
          <h2 className="dashboard__section-title">下一步建议</h2>
          <p className="dashboard__suggestion-headline">{sessionNextStep?.headline ?? suggestion.headline}</p>
          <ul className="dashboard__suggestion-items">
            {(sessionNextStep ? [sessionNextStep.action] : suggestion.items).map((item) => (
              <li key={item} className="dashboard__suggestion-item">
                {item}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <section className="dashboard__roadmap" aria-label="产品学习路线">
        <span>学习路线</span>
        <strong>四级 · 六级 · 雅思 · 托福</strong>
        <p>除当前真题阅读与句法外，其余模块为后续逐步开放方向，未在本版本伪装为可用功能。</p>
      </section>
    </motion.div>
  );
}
