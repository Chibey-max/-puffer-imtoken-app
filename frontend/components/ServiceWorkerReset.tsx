'use client';

import { useEffect } from 'react';

export default function ServiceWorkerReset() {
  useEffect(() => {
    const reset = async () => {
      if (!('serviceWorker' in navigator)) return;

      const hadController = Boolean(navigator.serviceWorker.controller);
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map((registration) => registration.unregister()));

      if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((key) => caches.delete(key)));
      }

      if (hadController && !sessionStorage.getItem('puffer-sw-reset')) {
        sessionStorage.setItem('puffer-sw-reset', '1');
        window.location.reload();
      }
    };

    reset().catch(() => {
      // Cache cleanup should never block the app UI.
    });
  }, []);

  return null;
}
