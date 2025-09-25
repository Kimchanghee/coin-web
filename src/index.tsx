import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { I18nProvider } from './i18n';
import './styles.css';
import { startLiveMarketCollector } from './components/services/liveMarketCollector';

// Ensure all exchange WebSocket feeds stay connected even if no UI component
// subscribes to live market updates. This eagerly boots the collector during
// application start so spot/futures streams are always active in the
// background.
startLiveMarketCollector();

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <I18nProvider>
      <React.Suspense fallback="Loading...">
        <App />
      </React.Suspense>
    </I18nProvider>
  </React.StrictMode>
);