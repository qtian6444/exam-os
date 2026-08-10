import { useState, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import styles from './Splash.module.css';
import bgImage from './splash-bg.jpg';

interface SplashProps {
  onBegin: () => void;
}

export default function Splash({ onBegin }: SplashProps) {
  const [clicked, setClicked] = useState(false);

  const stars = useMemo(() =>
    Array.from({ length: 28 }, () => ({
      x: Math.random() * 90,
      y: Math.random() * 48,
      r: Math.random() * 1.2 + 0.5,
      dur: Math.random() * 2.5 + 2,
      delay: Math.random() * 4,
      baseOp: Math.random() * 0.22 + 0.18,
    })), []
  );

  const handleClick = useCallback(() => {
    if (clicked) return;
    setClicked(true);
    setTimeout(() => onBegin(), 800);
  }, [clicked, onBegin]);

  return (
    <AnimatePresence>
      {!clicked && (
        <motion.div className={styles.splash}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.6, ease: 'easeInOut' }}>

          {/* 背景：参考图 */}
          <img src={bgImage} alt="" className={styles.bg} />

          {/* 星光闪烁层 */}
          <div className={styles.stars}>
            {stars.map((s, i) => (
              <motion.div key={i} className={styles.star}
                style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.r * 2, height: s.r * 2, opacity: s.baseOp }}
                animate={{ opacity: [s.baseOp, s.baseOp + 0.35, s.baseOp] }}
                transition={{ duration: s.dur, repeat: Infinity, delay: s.delay, ease: 'easeInOut' }} />
            ))}
          </div>

          {/* 云层漂浮 */}
          <div className={styles.clouds}>
            <motion.div className={styles.cloud}
              style={{ top: '48%', left: '-10%', width: 120 }}
              animate={{ x: ['0%', '120%'] }}
              transition={{ duration: 32, repeat: Infinity, ease: 'linear' }} />
            <motion.div className={styles.cloud}
              style={{ top: '54%', left: '-15%', width: 100 }}
              animate={{ x: ['0%', '125%'] }}
              transition={{ duration: 38, repeat: Infinity, ease: 'linear', delay: 6 }} />
          </div>

          {/* Logo 居中 */}
          <div className={styles.header}>
            <div className={styles.logo}>
              <span className={styles.logoExam}>Exam</span>
              <span className={styles.logoOS}> OS</span>
            </div>
            <span className={styles.slogan}>今天，也会发生一点成长。</span>
          </div>

          {/* 按钮 */}
          <div className={styles.ctaWrap}>
            <motion.button className={styles.cta}
              animate={{ scale: [1, 1.02, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              whileTap={{ scale: 0.96 }}
              onClick={handleClick}>
              开始今天
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none">
                <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </motion.button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
