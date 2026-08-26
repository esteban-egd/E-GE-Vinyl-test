import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.jsx'
import { ErrorBoundary } from './components/common/ErrorBoundary.jsx'
import './index.css'

// Auto-detection of Native Platform Target (Electron / Capacitor)
const isWebView = /Android|wv|WebView/i.test(navigator.userAgent);
const isNativeApp = import.meta.env.VITE_IS_APP === 'true' || 
                    !!window.ipcRenderer || 
                    !!window.Capacitor || 
                    !!window.android || 
                    isWebView ||
                    (window.process && window.process.versions && !!window.process.versions.electron);

// Register Service Worker in production only to avoid stale caching in dev/preview, but disable on native targets
if (import.meta.env.PROD && 'serviceWorker' in navigator && !isNativeApp) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        // Monitor for updates and reload on activation
        registration.addEventListener('updatefound', () => {
          const installingWorker = registration.installing;
          if (installingWorker) {
            installingWorker.addEventListener('statechange', () => {
              if (installingWorker.state === 'activated' && navigator.serviceWorker.controller) {
                // Instantly reload client pages to pick up the new build
                window.location.reload();
              }
            });
          }
        });
      })
      .catch((err) => {
        console.warn('SW registration failed:', err);
      });

    // Proactively check for Service Worker updates when the app is resumed or focused
    window.addEventListener('focus', () => {
      navigator.serviceWorker.getRegistration().then((reg) => {
        if (reg) {
          reg.update();
        }
      });
    });
  });
} else if ('serviceWorker' in navigator) {
  // Proactively unregister any active service worker in dev/preview
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      registration.unregister();
    }
  }).catch((err) => {
    console.warn('Failed to unregister SW:', err);
  });
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)

