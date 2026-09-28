import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { AuthGate } from './app/AuthGate.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import './home.css';
createRoot(document.getElementById('root')).render(<AppErrorBoundary><AuthGate><App/></AuthGate></AppErrorBoundary>);
