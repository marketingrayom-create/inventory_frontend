import React from 'react';
import { createRoot } from 'react-dom/client';
import AuthGate from './components/auth/AuthGate.jsx';
import './styles.css';

createRoot(document.getElementById('root')).render(<AuthGate />);
