import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { AuthGate } from './app/AuthGate.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import { ToastProvider } from './ui/Toast.jsx';
import './styles/index.css';
createRoot(document.getElementById('root')).render(<AppErrorBoundary><ToastProvider><AuthGate><App/></AuthGate></ToastProvider></AppErrorBoundary>);
