import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles/index.css';
import { ToastProvider } from './context/ToastContext';
import { LeadProvider } from './context/LeadContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ToastProvider>
      <LeadProvider>
        <App />
      </LeadProvider>
    </ToastProvider>
  </React.StrictMode>
);
