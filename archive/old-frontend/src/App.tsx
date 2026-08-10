import { useState, useCallback } from 'react';
import { AnimatePresence } from 'framer-motion';
import Splash from './pages/Splash';
import Welcome from './pages/Welcome';

type Stage = 'splash' | 'welcome' | 'login';

export default function App() {
  const [stage, setStage] = useState<Stage>('splash');

  const goToWelcome = useCallback(() => setStage('welcome'), []);
  const goToLogin = useCallback(() => setStage('login'), []);

  return (
    <div className="app-shell">
      <AnimatePresence mode="wait">
        {stage === 'splash' && (
          <Splash key="splash" onBegin={goToWelcome} />
        )}
        {stage === 'welcome' && (
          <Welcome key="welcome" onEnter={goToLogin} />
        )}
        {stage === 'login' && (
          <div key="login" style={{ /* placeholder for Journey 03 */ }} />
        )}
      </AnimatePresence>
    </div>
  );
}
