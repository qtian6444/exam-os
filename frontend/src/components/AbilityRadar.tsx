import { motion } from 'framer-motion';
import type { DisplayAbilitySummary } from '../lib/sessionAbility';

interface Props {
  summary: DisplayAbilitySummary;
}

const CENTER = 150;
const RADIUS = 94;
const LABEL_RADIUS = 122;

function pointAt(index: number, radius: number): [number, number] {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / 6;
  return [CENTER + Math.cos(angle) * radius, CENTER + Math.sin(angle) * radius];
}

function pointsFor(values: number[]): string {
  return values
    .map((value, index) => {
      const [x, y] = pointAt(index, RADIUS * (value / 100));
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

function ringPoints(level: number): string {
  return pointsFor(new Array(6).fill(level));
}

export default function AbilityRadar({ summary }: Props) {
  const values = summary.dimensions.map((dimension) => dimension.value ?? 16);
  const chartPoints = pointsFor(values);
  const hasObserved = summary.index !== null;

  return (
    <section className="dashboard__ability-radar" aria-labelledby="ability-radar-title">
      <div className="dashboard__ability-radar-head">
        <div>
          <p className="dashboard__ability-radar-kicker">ABILITY MAP · {summary.basis === 'SESSION_OBSERVATION' ? 'SESSION' : 'RECORD'}</p>
          <h2 id="ability-radar-title" className="dashboard__section-title">你的能力画像</h2>
        </div>
        <div className="dashboard__ability-index" aria-label={hasObserved ? `训练能力指数 ${summary.index} 分` : '等待训练证据'}>
          <strong>{hasObserved ? summary.index : '—'}</strong>
          <span>/ 100</span>
        </div>
      </div>

      <div className="dashboard__ability-radar-body">
        <div className="dashboard__ability-radar-chart">
          <svg viewBox="0 0 300 300" role="img" aria-label="六维能力画像雷达图">
            {[20, 40, 60, 80, 100].map((level) => (
              <polygon key={level} className="dashboard__radar-ring" points={ringPoints(level)} />
            ))}
            {summary.dimensions.map((dimension, index) => {
              const [x, y] = pointAt(index, RADIUS);
              return <line key={dimension.key} className="dashboard__radar-axis" x1={CENTER} y1={CENTER} x2={x} y2={y} />;
            })}
            <motion.polygon
              className="dashboard__radar-area"
              points={chartPoints}
              initial={{ opacity: 0, scale: 0.7, transformOrigin: '150px 150px' }}
              animate={{ opacity: hasObserved ? 1 : 0.38, scale: 1 }}
              transition={{ duration: 0.65, ease: 'easeOut' }}
            />
            <polygon className="dashboard__radar-outline" points={chartPoints} />
            {summary.dimensions.map((dimension, index) => {
              const [x, y] = pointAt(index, LABEL_RADIUS);
              const anchor = x < CENTER - 12 ? 'end' : x > CENTER + 12 ? 'start' : 'middle';
              return (
                <text key={dimension.key} className="dashboard__radar-label" x={x} y={y} textAnchor={anchor}>
                  {dimension.label}
                </text>
              );
            })}
          </svg>
        </div>

        <div className="dashboard__ability-radar-info">
          <div className="dashboard__ability-band">
            <span>四级区间示意</span>
            <strong>{summary.cet4Range?.label ?? '完成训练后生成'}</strong>
          </div>
          <p className="dashboard__ability-radar-note">
            {hasObserved
              ? `当前置信度 ${summary.confidence}%；区间根据本次真实作答表现生成。`
              : '完成一次真实训练后，画像会从空白轮廓开始伸缩。'}
          </p>
          <p className="dashboard__ability-radar-disclaimer">
            这是训练表现指数与区间示意，不是教育部官方成绩预测；未观测维度不会用自评补齐。
          </p>
          <ul className="dashboard__ability-radar-list">
            {summary.dimensions.map((dimension) => (
              <li key={dimension.key}>
                <span className={dimension.observed ? 'is-observed' : ''}>{dimension.label}</span>
                <strong>{dimension.observed ? `${dimension.value}` : '未观测'}</strong>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
