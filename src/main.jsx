import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './app/App.jsx';
import { AccessGate } from './app/AccessGate.jsx';
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx';
import './home.css';
createRoot(document.getElementById('root')).render(<AppErrorBoundary><AccessGate><App/></AccessGate></AppErrorBoundary>);
