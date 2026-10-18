import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { LazyMotion, MotionConfig } from 'motion/react';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import { queryClient } from './lib/queryClient';
import { initTheme } from './lib/theme';
import './styles/index.css';

initTheme(); // paint the last-used theme before React renders (no flash)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        {/* reducedMotion="user": visitors who ask their OS for less motion get no transform animations */}
        <MotionConfig reducedMotion="user">
          {/* The animation features load after first paint; `strict` makes any accidental use of the heavier
              `motion.*` components fail loudly in development — the code uses the light `m.*` components. */}
          <LazyMotion features={() => import('./lib/motionFeatures').then((mod) => mod.default)} strict>
            <BrowserRouter>
              <App />
            </BrowserRouter>
          </LazyMotion>
        </MotionConfig>
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
