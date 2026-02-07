import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider } from './contexts/ThemeContext';
import { UserProvider } from './contexts/UserContext';
import { AIAgentProvider } from './contexts/AIAgentContext';
import ErrorBoundary from './components/ErrorBoundary';
import App from './App';
import './index.css';
import './i18n';
import { registerServiceWorker } from './utils/serviceWorker';
import { PostProvider } from './contexts/PostContext';

// Register service worker in production
if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
  registerServiceWorker();
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider>
          <UserProvider>
            <PostProvider>
            <AIAgentProvider>
            <App />
            </AIAgentProvider>
            </PostProvider>
          </UserProvider>
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
