import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AuthProvider } from './context/AuthContext';
import { NotificationProvider } from './context/NotificationContext';
import { ConfirmProvider } from './context/ConfirmContext';
import ErrorBoundary from './components/common/ErrorBoundary';
import './i18n/il8n';
// import { registerSW } from 'virtual:pwa-register';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <AuthProvider>
        <NotificationProvider>
          <ConfirmProvider>
            <App />
          </ConfirmProvider>
        </NotificationProvider>
      </AuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
);
