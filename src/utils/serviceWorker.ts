/**
 * Service Worker registration utilities
 */

const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
    window.location.hostname === '[::1]' ||
    window.location.hostname.match(/^127(?:\.(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)){3}$/)
);

/**
 * Register service worker
 */
export const registerServiceWorker = (): void => {
  if ('serviceWorker' in navigator) {
    const swUrl = '/sw.js';

    if (isLocalhost) {
      // Check if service worker still exists
      checkValidServiceWorker(swUrl);
    } else {
      // Production environment
      registerValidSW(swUrl);
    }
  }
};

/**
 * Register valid service worker
 */
const registerValidSW = (swUrl: string): void => {
  navigator.serviceWorker
    .register(swUrl)
    .then((registration) => {
      registration.onupdatefound = () => {
        const installingWorker = registration.installing;
        if (installingWorker == null) {
          return;
        }
        installingWorker.onstatechange = () => {
          if (installingWorker.state === 'installed') {
            if (navigator.serviceWorker.controller) {
              // New content available, inform user
              console.log('New content is available; please refresh.');
            } else {
              // Content cached for offline use
              console.log('Content cached for offline use.');
            }
          }
        };
      };
    })
    .catch((error) => {
      console.error('Error during service worker registration:', error);
    });
};

/**
 * Check if service worker is valid
 */
const checkValidServiceWorker = (swUrl: string): void => {
  fetch(swUrl, {
    headers: { 'Service-Worker': 'script' },
  })
    .then((response) => {
      const contentType = response.headers.get('content-type');
      if (response.status === 404 || (contentType != null && !contentType.includes('javascript'))) {
        navigator.serviceWorker.ready.then((registration) => {
          registration.unregister().then(() => {
            window.location.reload();
          });
        });
      } else {
        registerValidSW(swUrl);
      }
    })
    .catch(() => {
      console.log('No internet connection found. App is running in offline mode.');
    });
};

/**
 * Unregister service worker
 */
export const unregisterServiceWorker = (): void => {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready
      .then((registration) => {
        registration.unregister();
      })
      .catch((error) => {
        console.error(error.message);
      });
  }
};

