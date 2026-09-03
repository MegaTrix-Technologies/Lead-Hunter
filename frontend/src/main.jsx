import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App.jsx';
import './styles/index.css';
import { ToastProvider } from './context/ToastContext';
import { AuthProvider } from './context/AuthContext';
import { LeadProvider } from './context/LeadContext';
import ErrorBoundary from './components/common/ErrorBoundary';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ToastProvider>
          <AuthProvider>
            <LeadProvider>
              <App />
            </LeadProvider>
          </AuthProvider>
        </ToastProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>
);
