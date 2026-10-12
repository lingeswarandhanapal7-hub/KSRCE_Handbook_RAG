import React, { useState } from 'react';
import { AppShell } from './components/layout/AppShell';
import { SplashIntro } from './components/ui/SplashIntro';
import { ErrorBoundary } from './components/ui/ErrorBoundary';

export const App: React.FC = () => {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      {showSplash ? (
        <SplashIntro onComplete={() => setShowSplash(false)} />
      ) : (
        <AppShell />
      )}
    </ErrorBoundary>
  );
};

export default App;
