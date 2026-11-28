'use strict';

// Notification delivery/click handling only: no fetch interception or timers.
self.addEventListener('install', event => event.waitUntil(self.skipWaiting()));
self.addEventListener('notificationclick', event => {
  event.notification.close();
  const scope = new URL(self.registration.scope);
  let target;
  try { target = new URL(event.notification.data?.url || scope.href, scope); }
  catch { target = scope; }
  if (target.origin !== scope.origin || !target.pathname.startsWith(scope.pathname)) target = scope;
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({type: 'window', includeUncontrolled: true});
    const existing = windows.find(client => {
      try { const url = new URL(client.url); return url.origin === scope.origin && url.pathname.startsWith(scope.pathname); }
      catch { return false; }
    });
    if (existing) return existing.focus();
    return self.clients.openWindow(target.href);
  })());
});
