(() => {
  'use strict';

  const linkPrefix = '#study-plan=';
  const storageKey = 'learning-mall-private-study-plan-v1';
  const maxLinkLength = 16000;
  const timestampPattern = /^(\d{4}-\d{2}-\d{2})T(?:[01]\d|2[0-3]):[0-5]\d(?::[0-5]\d(?:\.\d{1,3})?)?(?:Z|[+-](?:[01]\d|2[0-3]):?[0-5]\d)$/i;
  const earliestTime = Date.parse('0001-01-01T00:00:00Z');
  const latestTime = Date.parse('9999-12-31T23:59:59.999Z');

  function storedTime(value) {
    return Number.isSafeInteger(value) && value >= earliestTime && value <= latestTime ? value : NaN;
  }

  function linkTime(value) {
    const day = typeof value === 'string' && value.match(timestampPattern)?.[1];
    if (!day || day.startsWith('0000')) return NaN;
    const midnight = new Date(`${day}T00:00:00Z`);
    if (!Number.isFinite(+midnight) || midnight.toISOString().slice(0, 10) !== day) return NaN;
    return storedTime(Date.parse(value));
  }

  function plainText(value, maxLength) {
    if (typeof value !== 'string') return '';
    const text = value.replace(/[\u0000-\u001F\u007F-\u009F]+/g, ' ').trim();
    return text.length <= maxLength ? text : '';
  }

  function normalize(raw, readTime) {
    if (!raw || typeof raw.id !== 'string' || !/^[A-Za-z0-9._-]{1,100}$/.test(raw.id)) return null;
    const title = plainText(raw.title, 240), course = plainText(raw.course, 120);
    const start = readTime(raw.start), end = readTime(raw.end);
    if (!title || !course || !Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
    if (!Array.isArray(raw.steps) || raw.steps.length > 24 || !Array.isArray(raw.reminders) || raw.reminders.length > 20) return null;
    const steps = raw.steps.map(step => plainText(step, 1000));
    if (steps.some(step => !step) || raw.reminders.some(minutes => !Number.isInteger(minutes) || minutes < 0 || minutes > 10080)) return null;
    const reminders = [...new Set(raw.reminders)].sort((a, b) => b - a);
    return {id: raw.id, title, course, start, end, steps, reminders};
  }

  function order(a, b) {
    return a.start - b.start || a.end - b.end || a.id.localeCompare(b.id);
  }

  function storedSessions() {
    const raw = localStorage.getItem(storageKey);
    if (raw == null) return [];
    let rows;
    try { rows = JSON.parse(raw); }
    catch { return []; }
    return Array.isArray(rows) ? rows.map(row => normalize(row, storedTime)).filter(Boolean) : [];
  }

  function sessions() {
    try { return storedSessions().sort(order); }
    catch { return []; }
  }

  function decodeSessions(fragment) {
    if (fragment.length > maxLinkLength) return null;
    const encoded = decodeURIComponent(fragment);
    if (!/^[A-Za-z0-9_-]+={0,2}$/.test(encoded)) return null;
    const bytes = Uint8Array.from(atob(encoded.replace(/-/g, '+').replace(/_/g, '/')), character => character.charCodeAt(0));
    const plan = JSON.parse(new TextDecoder('utf-8', {fatal: true}).decode(bytes));
    if (plan?.version !== 1 || !Array.isArray(plan.sessions) || !plan.sessions.length || plan.sessions.length > 100) return null;
    const normalized = plan.sessions.map(row => normalize(row, linkTime));
    return normalized.every(Boolean) ? normalized : null;
  }

  function installFromLink() {
    const hash = location.hash;
    if (!hash.startsWith(linkPrefix)) return {status: 'none'};

    let incoming;
    try {
      const clean = new URL(location.href);
      clean.hash = '';
      history.replaceState(history.state, '', clean.href);
      incoming = decodeSessions(hash.slice(linkPrefix.length));
    } catch {
      return {status: 'invalid'};
    }
    if (!incoming) return {status: 'invalid'};

    try {
      const records = new Map(storedSessions().map(row => [row.id, row]));
      for (const row of incoming) records.set(row.id, row);
      localStorage.setItem(storageKey, JSON.stringify([...records.values()].sort(order)));
    } catch {
      return {status: 'invalid', reason: 'storage'};
    }
    return {status: 'added', count: new Set(incoming.map(row => row.id)).size};
  }

  globalThis.PrivatePlan = {installFromLink, sessions};
})();
