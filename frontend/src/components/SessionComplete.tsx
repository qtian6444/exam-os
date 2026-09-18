import { motion } from 'framer-motion';
import type { EvidenceDimension, SessionEvidenceItem } from '../types';
import './CompletionV2.css';

interface Props {
  cardsCompleted: number;
  elapsed: number;
  evidence: SessionEvidenceItem[];
  onBack: () => void;
}

const DIMENSION_LABELS: Record<EvidenceDimension, string> = {
  vocabulary: '词汇',
  sentence: '句子结构',
  reading: '阅读定位',
  listening: '听力',
  writing: '写作',
};

const OUTCOME_COPY: Record<SessionEvidenceItem['outcome'], { label: string; detail: string }> = {
  FIRST_TRY_CORRECT: {
    label: '首次完成',
    detail: '本题首次作答即与参考答案一致。',
  },
  RETRY_CORRECT: {
    label: '调整后完成',
    detail: '本题在提示后再次尝试，与参考答案一致。',
  },
  REVEALED_AFTER_RETRY: {
    label: '已查看解析',
    detail: '两次尝试后展示了解析，后续需要无提示验证。',
  },
};

function formatElapsed(elapsed: number): string {
  const seconds = Math.floor(elapsed / 1000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}

function buildNextDecision(evidence: SessionEvidenceItem[]) {
  const revealed = evidence.filter((item) => item.outcome === 'REVEALED_AFTER_RETRY');
  const retried = evidence.filter((item) => item.outcome === 'RETRY_CORRECT');

  if (revealed.length > 0) {
    const target = revealed[0];
    return {
      title: '先做一次无提示验证',
      reason: `本次有 ${revealed.length} 题在两次尝试后查看了解析；这只说明当下需要再验证，不等于长期薄弱。`,
      action: `下次优先用同类任务回测${target.dimensions
        .map((dimension) => DIMENSION_LABELS[dimension])
        .join('、')}线索。`,
    };
  }

  if (retried.length > 0) {
    const target = retried[0];
    return {
      title: '把“调整后会做”变成独立完成',
      reason: `本次有 ${retried.length} 题在提示后完成，说明这类线索值得安排一次独立回测。`,
      action: `下次先给一道不带提示的${target.dimensions
        .map((dimension) => DIMENSION_LABELS[dimension])
        .join('、')}任务。`,
    };
  }

  return {
    title: '进入下一组真实语境任务',
    reason: '本次已完成的题目均为首次作答一致；仍需要换语境验证，不能据此宣称掌握。',
    action: '下一步选择同一能力维度、不同语境的真题素材继续训练。',
  };
}

export default function SessionComplete({ cardsCompleted, elapsed, evidence, onBack }: Props) {
  const firstTry = evidence.filter((item) => item.outcome === 'FIRST_TRY_CORRECT').length;
  const retried = evidence.filter((item) => item.outcome === 'RETRY_CORRECT').length;
  const revealed = evidence.filter((item) => item.outcome === 'REVEALED_AFTER_RETRY').length;
  const decision = buildNextDecision(evidence);

  return (
    <motion.div
      className="session-complete"
      initial={{ opacity: 0, scale: 0.92 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="session-complete__icon">✦</div>
      <p className="session-complete__eyebrow">SESSION EVIDENCE RECORDED</p>
      <h2 className="session-complete__title">本次学习已形成可追溯证据</h2>
      <p className="session-complete__subtitle">
        这里总结的是本次真实作答行为，不把一次训练写成长期能力结论。
      </p>

      <div className="session-complete__stats">
        <div className="session-complete__stat">
          <span className="session-complete__stat-value">{cardsCompleted}</span>
          <span className="session-complete__stat-label">完成卡片</span>
        </div>
        <div className="session-complete__stat">
          <span className="session-complete__stat-value">{formatElapsed(elapsed)}</span>
          <span className="session-complete__stat-label">真实用时</span>
        </div>
        <div className="session-complete__stat">
          <span className="session-complete__stat-value">{firstTry}</span>
          <span className="session-complete__stat-label">首次完成</span>
        </div>
      </div>

      <section className="result__section result__section--evidence">
        <div className="result__section-heading">
          <h3 className="result__section-title">本次行为证据</h3>
          <span className="result__evidence-count">{evidence.length} 条</span>
        </div>
        <div className="result__outcome-summary" aria-label="本次作答结果汇总">
          <span>首次完成 {firstTry}</span>
          <span>调整后完成 {retried}</span>
          <span>查看解析 {revealed}</span>
        </div>
        <ul className="result__evidence-list">
          {evidence.map((item, index) => {
            const copy = OUTCOME_COPY[item.outcome];
            const source = item.sourceDetail;
            return (
              <li key={item.cardId} className="result__evidence-item">
                <div className="result__evidence-item-head">
                  <span className="result__evidence-index">{String(index + 1).padStart(2, '0')}</span>
                  <strong>{copy.label}</strong>
                </div>
                <p>{copy.detail}</p>
                <p className="result__evidence-meta">
                  涉及：{item.dimensions.map((dimension) => DIMENSION_LABELS[dimension]).join('、')}
                  {source ? ` · ${source.examDate} ${source.exam} ${source.paper}` : ''}
                </p>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="result__section result__section--decision">
        <span className="result__decision-kicker">NEXT BEST LEARNING ACTION</span>
        <h3 className="result__section-title">{decision.title}</h3>
        <p className="result__decision-reason">依据：{decision.reason}</p>
        <p className="result__decision-action">{decision.action}</p>
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
