

// This setting is needed to support the custom blend modes used in the lighting shader.
// settings.PREFER_ENV = ENV.WEBGL2; // This is old Pixi.js v6 syntax. Modern versions default to WebGL2 if available.

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import 'uplot/dist/uPlot.min.css';
import 'react-toastify/dist/ReactToastify.css';
import ConvexClientProvider from './components/ConvexClientProvider.tsx';
import { ClerkProvider } from '@clerk/clerk-react';
import ErrorBoundary from './components/ErrorBoundary';

// Fix: Cast import.meta to any to avoid TypeScript errors when accessing environment variables.
const publishableKey = (import.meta as any).env.VITE_CLERK_PUBLISHABLE_KEY;
if (!publishableKey) {
  throw new Error('Missing Clerk publishable key. Make sure to set VITE_CLERK_PUBLISHABLE_KEY in your .env file.');
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary
      fallback={
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <h2>Something went wrong</h2>
          <p>Please refresh the page or try again later.</p>
          <button onClick={() => window.location.reload()}>Refresh Page</button>
        </div>
      }
    >
      <ClerkProvider publishableKey={publishableKey}>
        <ConvexClientProvider>
          <App />
        </ConvexClientProvider>
      </ClerkProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
