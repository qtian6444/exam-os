import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import styles from './Welcome.module.css';

interface WelcomeProps {
  onEnter: () => void;
}

export default function Welcome({ onEnter }: WelcomeProps) {
  const [clicked, setClicked] = useState(false);
  const [aiLineIndex, setAiLineIndex] = useState(0);

  const aiLines = [
    '欢迎回来。今天，我们只做一点点。',
    '不用担心今天学什么。我已经替你决定好了。',
  ];

  useEffect(() => {
    const timer = setTimeout(() => setAiLineIndex(1), 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleEnter = useCallback(() => {
    if (clicked) return;
    setClicked(true);
    setTimeout(() => onEnter(), 1200);
  }, [clicked, onEnter]);

  return (
    <div className={styles.welcome}>
      <div className={styles.background} />

      <div className={styles.clouds}>
        <motion.div className={styles.cloud}
          animate={{ x: ['-10%', '110%'] }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }} />
      </div>

      <div className={styles.grass}>
        <svg viewBox="0 0 430 100" preserveAspectRatio="none" className={styles.grassSvg}>
          <path d="M0 60 Q 80 20 160 50 Q 240 10 320 55 Q 380 30 430 50 L 430 100 L 0 100 Z"
            fill="#E8F5E9" opacity="0.6" />
          <path d="M0 75 Q 100 45 200 65 Q 300 40 430 70 L 430 100 L 0 100 Z"
            fill="#C8E6C9" opacity="0.4" />
        </svg>
      </div>

      <motion.div className={styles.character}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut', delay: 0.3 }}>
        <motion.div animate={{ y: [0, -6, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}>
          <CharacterSVG />
        </motion.div>
      </motion.div>

      <motion.div className={styles.copy}
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.5 }}>
        <h2 className={styles.heading}>今天，给自己一点新的成长。</h2>
      </motion.div>

      <motion.p className={styles.aiText} key={aiLineIndex}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}>
        {aiLines[aiLineIndex]}
      </motion.p>

      <motion.div className={styles.ctaContainer}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut', delay: 0.7 }}>
        <motion.button
          className={`${styles.cta} ${clicked ? styles.ctaLoading : ''}`}
          onClick={handleEnter}
          whileTap={{ scale: 0.96 }}
          animate={!clicked ? { scale: [1, 1.02, 1] } : { scale: 1 }}
          transition={!clicked ? { duration: 2, repeat: Infinity, ease: 'easeInOut' } : { duration: 0.08 }}>
          {!clicked ? (
            <>
              <span>开始今天</span>
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" className={styles.arrowIcon}>
                <path d="M7 5L13 10L7 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </>
          ) : (
            <>
              <span>正在准备今天……</span>
              <motion.svg width="20" height="20" viewBox="0 0 20 20" fill="none"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="2" strokeDasharray="12 40" strokeLinecap="round"/>
              </motion.svg>
            </>
          )}
        </motion.button>
      </motion.div>
    </div>
  );
}

function CharacterSVG() {
  return (
    <svg width="56" height="72" viewBox="0 0 56 72" fill="none">
      <rect x="18" y="18" width="4" height="20" rx="2" fill="#4A6FA5" />
      <rect x="34" y="18" width="4" height="20" rx="2" fill="#4A6FA5" />
      <ellipse cx="28" cy="40" rx="11" ry="13" fill="#98C1D9" />
      <circle cx="28" cy="24" r="10" fill="#F4D58D" />
      <circle cx="24" cy="22" r="2" fill="#2D3436" />
      <circle cx="32" cy="22" r="2" fill="#2D3436" />
      <path d="M24 28 Q28 31 32 28" stroke="#2D3436" strokeWidth="1.5" fill="none" strokeLinecap="round" />
      <line x1="23" y1="52" x2="21" y2="64" stroke="#4A6FA5" strokeWidth="3.5" strokeLinecap="round" />
      <line x1="33" y1="52" x2="35" y2="64" stroke="#4A6FA5" strokeWidth="3.5" strokeLinecap="round" />
      <ellipse cx="19" cy="66" rx="5" ry="3" fill="#E76F51" />
      <ellipse cx="37" cy="66" rx="5" ry="3" fill="#E76F51" />
    </svg>
  );
}
