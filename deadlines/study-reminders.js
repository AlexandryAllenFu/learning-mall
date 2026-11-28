(function (root) {
  'use strict';

  // This module sends notifications only when the open page calls update().
  // It does not schedule background alarms or run after the page is closed.
  let base;
  try {
    base = new URL('./', root.document?.currentScript?.src || root.location.href);
  } catch {
    base = null;
  }
  const namespace = 'study-reminders-v1:' + (base?.pathname || 'deadlines');
  const enabledKey = namespace + ':enabled';
  const sentKey = namespace + ':sent';
  const memory = new Map();
  let optedIn = false;
  let workerPromise = null;
  let generation = 0;
  let serial = Promise.resolve();

  function read(key) {
    try { return {ok: true, value: root.localStorage.getItem(key)}; }
    catch { return {ok: false, value: null}; }
  }
  function write(key, value) {
    try { root.localStorage.setItem(key, value); return true; }
    catch { return false; }
  }
  optedIn = read(enabledKey).value === '1';

  function permission() {
    if (!base || root.isSecureContext === false || !root.Notification ||
        typeof root.Notification.requestPermission !== 'function') return 'unsupported';
    return ['granted', 'denied', 'default'].includes(root.Notification.permission)
      ? root.Notification.permission : 'unsupported';
  }
  function enabled() {
    const stored = read(enabledKey);
    if (stored.ok && stored.value !== null) optedIn = stored.value === '1';
    return optedIn && permission() === 'granted';
  }
  function waitForActive(registration) {
    if (registration.active) return Promise.resolve(registration);
    const worker = registration.installing || registration.waiting;
    if (!worker) return Promise.resolve(null);
    return new Promise(resolve => {
      let timer;
      const finish = value => {
        root.clearTimeout(timer);
        worker.removeEventListener('statechange', changed);
        resolve(value);
      };
      const changed = () => {
        if (registration.active || worker.state === 'activated') finish(registration);
        else if (worker.state === 'redundant') finish(null);
      };
      worker.addEventListener('statechange', changed);
      timer = root.setTimeout(() => finish(registration.active ? registration : null), 4000);
      changed();
    });
  }
  function prepareWorker() {
    if (!base || !root.navigator?.serviceWorker || permission() !== 'granted') return Promise.resolve(null);
    if (!workerPromise) {
      const attempt = Promise.resolve().then(() => root.navigator.serviceWorker.register(
        new URL('reminder-sw.js', base).href, {scope: base.href}
      )).then(waitForActive).catch(() => null);
      workerPromise = new Promise(resolve => {
        const timer = root.setTimeout(() => resolve(null), 5000);
        attempt.then(registration => { root.clearTimeout(timer); resolve(registration); });
      }).then(registration => {
        if (!registration) workerPromise = null;
        return registration;
      });
    }
    return workerPromise;
  }
  async function enable() {
    let result = permission();
    if (result === 'default') {
      // Request before any await so the button's user gesture is preserved.
      try { result = await root.Notification.requestPermission(); }
      catch { result = permission(); }
    }
    optedIn = result === 'granted';
    write(enabledKey, optedIn ? '1' : '0');
    if (optedIn) void prepareWorker();
    return ['granted', 'denied', 'default'].includes(result) ? result : 'unsupported';
  }
  function disable() {
    optedIn = false;
    write(enabledKey, '0');
    generation++;
  }

  function ledger(now) {
    const stored = read(sentKey);
    let records = [];
    try {
      const parsed = JSON.parse(stored.value || '[]');
      if (Array.isArray(parsed)) records = parsed;
    } catch { /* Recover a malformed local ledger using this session's records. */ }
    for (const item of records) {
      if (Array.isArray(item) && typeof item[0] === 'string' && Number.isFinite(item[1]) && item[1] >= now) {
        memory.set(item[0], item[1]);
      }
    }
    for (const [key, expires] of memory) if (expires < now) memory.delete(key);
    return stored.ok;
  }
  async function display(entry, key, registration) {
    const options = {body: entry.body, tag: 'study-reminder:' + key,
      data: {url: base.href, reminderId: entry.id}};
    if (registration && typeof registration.showNotification === 'function') {
      try { await registration.showNotification(entry.title, options); return true; }
      catch { /* Desktop Notification is still useful if a worker is unavailable. */ }
    }
    try {
      const notification = new root.Notification(entry.title, options);
      notification.onclick = () => {
        try { root.focus(); notification.close(); } catch { /* Already closed. */ }
      };
      return true;
    } catch { return false; }
  }

  function update(entries, now = Date.now()) {
    const revision = ++generation;
    const liveClock = arguments.length < 2;
    const list = Array.isArray(entries) ? entries.filter(entry => entry &&
      typeof entry.id === 'string' && entry.id && Number.isFinite(entry.at) &&
      Number.isFinite(entry.expires) && entry.expires >= entry.at).map(entry => ({
        id: entry.id, title: String(entry.title || '学习提醒').slice(0, 160),
        body: String(entry.body || '').slice(0, 1000), at: entry.at, expires: entry.expires
      })).sort((a, b) => a.at - b.at || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)) : [];
    const result = () => ({permission: permission(), enabled: enabled(), sent: [], failed: [], persistent: true});
    if (!Number.isFinite(now)) return Promise.resolve({...result(), reason: 'invalid-time'});
    const execute = async () => {
      const out = result();
      if (revision !== generation) return {...out, reason: 'superseded'};
      if (!out.enabled) return {...out, reason: out.permission === 'granted' ? 'disabled' : out.permission};
      const registration = await prepareWorker();
      const work = async () => {
        if (revision !== generation) return {...out, reason: 'superseded'};
        if (!enabled()) return {...out, permission: permission(), enabled: false, reason: 'disabled'};
        // Recheck real time after activation/locks. An explicit clock remains
        // deterministic for callers that supply one (including tests).
        const clock = () => liveClock ? Math.max(now, Date.now()) : now;
        out.persistent = ledger(clock());
        for (const entry of list) {
          if (revision !== generation || !enabled()) break;
          const current = clock();
          if (current < entry.at || current > entry.expires) continue;
          const key = JSON.stringify([entry.id, entry.at]);
          if (memory.has(key)) continue;
          if (await display(entry, key, registration)) {
            memory.set(key, entry.expires);
            out.persistent = write(sentKey, JSON.stringify([...memory])) && out.persistent;
            out.sent.push(entry.id);
          } else out.failed.push(entry.id);
        }
        if (out.failed.length) out.reason = 'display-unavailable';
        return out;
      };
      if (typeof root.navigator?.locks?.request === 'function') {
        let entered = false;
        try {
          return await root.navigator.locks.request(namespace, {mode: 'exclusive'}, () => {
            entered = true;
            return work();
          });
        } catch {
          if (entered) return {...out, reason: 'display-unavailable'};
        }
      }
      // Without Web Locks, storage plus a stable notification tag is best
      // effort across tabs. This promise chain still serializes this page.
      return work();
    };
    const pending = serial.then(execute, execute);
    serial = pending.catch(() => {});
    return pending;
  }

  const api = {update, enable, permission, enabled, disable};
  root.StudyReminders = api;
  if (typeof module === 'object' && module.exports) module.exports = api;
})(typeof globalThis === 'object' ? globalThis : this);
