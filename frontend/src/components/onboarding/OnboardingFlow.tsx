import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ExamType, ExamBatch, DailyTime } from '../../types';

const SLIDE_ANIMATION = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

interface Props {
  onComplete: (profile: {
    examType: ExamType;
    examBatch: ExamBatch;
    dailyTime: DailyTime;
  }) => Promise<boolean>;
}

export default function OnboardingFlow({ onComplete }: Props) {
  const [step, setStep] = useState(0);
  const [examType, setExamType] = useState<ExamType | null>(null);
  const [examBatch, setExamBatch] = useState<ExamBatch | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const next = () => setStep((s) => s + 1);

  const handleExamType = (v: ExamType) => {
    setExamType(v);
    next();
  };

  const handleExamBatch = (v: ExamBatch) => {
    setExamBatch(v);
    next();
  };

  const handleDailyTime = async (v: DailyTime) => {
    setSubmitting(true);
    setError(null);
    try {
      const ok = await onComplete({ examType: examType!, examBatch: examBatch!, dailyTime: v });
      if (!ok) {
        setError('保存失败，请检查网络后重试。');
      }
      // On success, the parent switches stage and this component unmounts.
    } catch {
      // A rejection here must never leave the button permanently disabled.
      setError('保存失败，请检查网络后重试。');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="onboarding">
      <AnimatePresence mode="wait">
        {step === 0 && (
          <motion.div key="step-0" className="onboarding__step" {...SLIDE_ANIMATION} transition={{ duration: 0.3 }}>
            <h1 className="onboarding__title">Exam OS</h1>
            <p className="onboarding__subtitle">你的 AI 英语学习伙伴</p>
            <motion.button
              className="onboarding__btn onboarding__btn--primary"
              onClick={next}
              whileTap={{ scale: 0.96 }}
            >
              开始
            </motion.button>
          </motion.div>
        )}

        {step === 1 && (
          <motion.div key="step-1" className="onboarding__step" {...SLIDE_ANIMATION} transition={{ duration: 0.3 }}>
            <h2 className="onboarding__question">你准备考哪一个？</h2>
            <div className="onboarding__options">
              <button className="onboarding__btn" onClick={() => handleExamType('CET4')}>
                四级 CET-4
              </button>
              <button className="onboarding__btn" onClick={() => handleExamType('CET6')}>
                六级 CET-6
              </button>
            </div>
          </motion.div>
        )}

        {step === 2 && (
          <motion.div key="step-2" className="onboarding__step" {...SLIDE_ANIMATION} transition={{ duration: 0.3 }}>
            <h2 className="onboarding__question">你打算什么时候考试？</h2>
            <div className="onboarding__options">
              {([
                ['2026-12', '2026 年 12 月'],
                ['2027-06', '2027 年 6 月'],
                ['2027-12', '2027 年 12 月'],
                ['later', '更晚'],
                ['undecided', '我还不确定'],
              ] as [ExamBatch, string][]).map(([k, label]) => (
                <button key={k} className="onboarding__btn" onClick={() => handleExamBatch(k)}>
                  {label}
                </button>
              ))}
            </div>
          </motion.div>
        )}

        {step === 3 && (
          <motion.div key="step-3" className="onboarding__step" {...SLIDE_ANIMATION} transition={{ duration: 0.3 }}>
            <h2 className="onboarding__question">你每天有多少时间学习？</h2>
            <div className="onboarding__options">
              {([
                ['5min', '5 分钟'],
                ['10min', '10 分钟'],
                ['20min', '20 分钟'],
                ['30min+', '30 分钟以上'],
              ] as [DailyTime, string][]).map(([k, label]) => (
                <button key={k} className="onboarding__btn" disabled={submitting} onClick={() => handleDailyTime(k)}>
                  {label}
                </button>
              ))}
            </div>
            {error && <p className="onboarding__error">{error}</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
