import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import './i18n/il8n';

// Suppress MUI aria-hidden accessibility warning in development
if (import.meta.env.DEV) {
  // Override console methods to suppress aria-hidden warnings
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('aria-hidden') || message.includes('Blocked aria-hidden') || message.includes('ariaHidden')) {
      return; // Suppress MUI aria-hidden warnings
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: any[]) => {
    const message = args.join(' ');
    if (message.includes('aria-hidden') || message.includes('Blocked aria-hidden') || message.includes('ariaHidden')) {
      return; // Suppress MUI aria-hidden warnings
    }
    originalWarn.apply(console, args);
  };
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AuthProvider>
      <NotificationProvider>
        <App />
      </NotificationProvider>
    </AuthProvider>
  </React.StrictMode>,
);
