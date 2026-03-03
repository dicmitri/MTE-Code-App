import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

// Register the service worker for PWA support
const updateSW = registerSW({
  onNeedRefresh() {
    // Automatically update when new content is available
    updateSW(true);
  },
  onOfflineReady() {
    console.log("App is ready to work offline.");
  },
});

const rootElement = document.getElementById('root');

if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
        <React.StrictMode>
            <App />
        </React.StrictMode>
    );
} else {
    console.error("Could not find root element to mount React app.");
}