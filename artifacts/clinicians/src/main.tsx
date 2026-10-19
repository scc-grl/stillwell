import { createRoot } from 'react-dom/client';
import './clerk.css';
import '@workspace/stillwell-design-system/styles.css';

import App from './App';
import { ErrorBoundary } from '@/components/error-boundary';

createRoot(document.getElementById('root')!, {
  // Keeps caught errors off reportError(), which would raise the dev overlay.
  onCaughtError: (error, errorInfo) => {
    console.error(error, errorInfo.componentStack);
  },
}).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);
