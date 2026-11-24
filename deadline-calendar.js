(() => {
  'use strict';

  const shanghai = 'Asia/Shanghai';
  const dayMilliseconds = 86400000;
  const recurrenceFields = ['RRULE', 'RDATE', 'EXRULE', 'EXDATE', 'RECURRENCE-ID'];
  const formatters = new Map();

  function property(line) {
    const parts = [];
    let start = 0;
    let quoted = false;
    for (let index = 0; index < line.length; index++) {
      const character = line[index];
      if (character === '"') quoted = !quoted;
      if (quoted || (character !== ';' && character !== ':')) continue;
      parts.push(line.slice(start, index));
      start = index + 1;
      if (character !== ':') continue;

      const name = parts.shift().toUpperCase();
      if (!/^[A-Z0-9-]+$/.test(name)) return null;
      const parameters = new Map();
      for (const part of parts) {
        const equal = part.indexOf('=');
        if (equal < 1) continue;
        const parameterValue = part.slice(equal + 1).replace(/^"(.*)"$/, '$1');
        parameters.set(part.slice(0, equal).toUpperCase(), parameterValue);
      }
      return {name, parameters, value: line.slice(start)};
    }
    return null;
  }

  function unescapeText(value = '') {
    return value.replace(/\\([nN\\,;])/g, (_, character) => /[nN]/.test(character) ? '\n' : character);
  }

  function field(fields, name) {
    return unescapeText(fields.get(name)?.value).trim();
  }

  function readCalendars(text, warnings) {
    const calendars = [];
    const stack = [];
    let calendar;
    let currentEvent;
    let eventNumber = 0;
    const lines = String(text).replace(/^\uFEFF/, '').replace(/\r\n?|\n/g, '\n').replace(/\n[ \t]/g, '').split('\n');

    for (const line of lines) {
      const item = property(line);
      if (!item) continue;
      if (item.name === 'BEGIN') {
        const component = item.value.trim().toUpperCase();
        if (stack.length === 0 && component === 'VCALENDAR') calendar = {fields: new Map(), events: []};
        if (calendar && stack.length === 1 && component === 'VEVENT') {
          currentEvent = {fields: new Map(), number: ++eventNumber};
        }
        stack.push(component);
      } else if (item.name === 'END') {
        const component = item.value.trim().toUpperCase();
        if (component !== stack.at(-1)) {
          warnings.add('日历组件不完整，已跳过受影响的日历。');
          stack.length = 0;
          calendar = undefined;
          currentEvent = undefined;
          continue;
        }
        if (component === 'VEVENT' && stack.length === 2 && currentEvent) {
          calendar.events.push(currentEvent);
          currentEvent = undefined;
        }
        if (component === 'VCALENDAR' && stack.length === 1 && calendar) {
          calendars.push(calendar);
          calendar = undefined;
        }
        stack.pop();
      } else {
        const fields = stack.length === 1 ? calendar?.fields : stack.length === 2 ? currentEvent?.fields : null;
        if (fields && !fields.has(item.name)) fields.set(item.name, item);
      }
    }

    if (stack.length) warnings.add('日历组件不完整，已跳过受影响的日历。');
    if (!calendars.length) warnings.add('文件中没有完整的 iCalendar 日历。');
    return calendars;
  }

  function utcTime(year, month, day, hour = 0, minute = 0, second = 0) {
    const date = new Date(0);
    date.setUTCFullYear(year, month - 1, day);
    date.setUTCHours(hour, minute, second);
    return date.getTime();
  }

  function validDate(year, month, day, hour = 0, minute = 0, second = 0) {
    if (year < 1 || hour > 23 || minute > 59 || second > 59) return NaN;
    const time = utcTime(year, month, day, hour, minute, second);
    const date = new Date(time);
    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return NaN;
    return time;
  }

  function zoneFormatter(zone) {
    if (formatters.has(zone)) return formatters.get(zone);
    try {
      const formatter = new Intl.DateTimeFormat('en-GB', {
        timeZone: zone, calendar: 'gregory', numberingSystem: 'latn', hourCycle: 'h23',
        year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit'
      });
      formatters.set(zone, formatter);
      return formatter;
    } catch {
      return null;
    }
  }

  function wallClock(formatter, instant) {
    const parts = Object.fromEntries(formatter.formatToParts(instant).map(({type, value}) => [type, Number(value)]));
    return utcTime(parts.year, parts.month, parts.day, parts.hour, parts.minute, parts.second);
  }

  function zonedTime(wallTime, zone) {
    const formatter = zoneFormatter(zone);
    if (!formatter) return NaN;

    // Offset probes on each side of the time also cover changes in daylight saving.
    const offsets = new Set();
    for (const probe of [wallTime - dayMilliseconds, wallTime, wallTime + dayMilliseconds]) {
      offsets.add(wallClock(formatter, probe) - probe);
    }

    const occurrences = [...offsets].map(offset => wallTime - offset).filter(instant => wallClock(formatter, instant) === wallTime);
    // RFC 5545 uses the first instant for overlaps and the prior offset for gaps.
    return occurrences.length ? Math.min(...occurrences) : wallTime - offsets.values().next().value;
  }

  function readDate(item, defaultZone = shanghai) {
    if (!item) return null;
    const match = item.value.trim().match(/^(\d{4})(\d{2})(\d{2})(?:T(\d{2})(\d{2})(\d{2})(Z)?)?$/i);
    if (!match) return null;
    const [, year, month, day, hour, minute, second, utc] = match;
    const valueType = item.parameters.get('VALUE')?.toUpperCase();
    if (valueType && valueType !== (hour ? 'DATE-TIME' : 'DATE')) return null;
    // Use second 59 for leap seconds in environments without leap-second support.
    const wallTime = validDate(+year, +month, +day, +(hour || 0), +(minute || 0), second === '60' ? 59 : +(second || 0));
    if (!Number.isFinite(wallTime)) return null;
    if (!hour) return {due: `${year}-${month}-${day}`, dateOnly: true, floating: false};

    const zone = item.parameters.get('TZID');
    if (utc && zone) return null;
    const instant = utc ? wallTime : zonedTime(wallTime, zone || defaultZone);
    if (!Number.isFinite(instant)) return null;
    return {due: new Date(instant).toISOString(), dateOnly: false, floating: !utc && !zone};
  }

  function safeCalendarURL(value) {
    if (typeof value !== 'string' || !value || /[\u0000-\u0020\u007F]/.test(value) || !/^https?:\/\//i.test(value)) return null;
    try {
      const link = new URL(value);
      if (link.username || link.password) return null;
      const protectedName = /(?:token|secret|password|passwd|credential|signature|^(?:auth|authorization|session(?:id)?|key|api[-_]?key|access[-_]?key|sig|hash|x-amz-.+)$)/i;
      if ([...link.searchParams.keys()].some(name => protectedName.test(name))) return null;
      const path = decodeURIComponent(link.pathname);
      const fragment = decodeURIComponent(link.hash);
      if (/\/calendar\/export(?:_execute|_get)?\.php(?:\/|$)|\/feeds\/calendars\/|\/private-[^/]+(?:\/|$)|\/(?:token|secret|password)\/[^/]+/i.test(path)) return null;
      if (fragment.split(/[?&#]/).some(part => part.includes('=') && protectedName.test(part.split('=', 1)[0]))) return null;
      return link.href;
    } catch {
      return null;
    }
  }

  function courseCode(value) {
    const matches = [...value.matchAll(/\b([A-Z]{2,6})[ -]?(\d{3,4}[A-Z]?)\b/g)];
    const codes = new Set(matches.map(([, prefix, code]) => prefix + code));
    return codes.size === 1 ? codes.values().next().value : null;
  }

  function eventCourse(fields, calendarFields) {
    const courseFields = ['X-COURSE-CODE', 'X-MOODLE-COURSE-SHORTNAME', 'CATEGORIES', 'SUMMARY', 'DESCRIPTION'];
    for (const name of courseFields) {
      const code = courseCode(field(fields, name));
      if (code) return code;
    }
    return courseCode(field(calendarFields, 'X-WR-CALNAME'));
  }

  function eventVersion(fields) {
    const version = field(fields, 'SEQUENCE');
    const sequence = /^\d+$/.test(version) && Number.isSafeInteger(+version) ? +version : 0;
    const modified = readDate(fields.get('LAST-MODIFIED'));
    const revision = modified && !modified.dateOnly ? modified : readDate(fields.get('DTSTAMP'));
    return {uid: field(fields, 'UID') || null, sequence, revision: revision && !revision.dateOnly ? revision.due : null};
  }

  function newer(current, previous) {
    if (current.sequence !== previous.sequence) return current.sequence > previous.sequence;
    if (current.revision !== previous.revision) return (current.revision || '') > (previous.revision || '');
    return current.cancelled || !previous.cancelled;
  }

  function eventHasDuration(fields, start, zone) {
    const end = readDate(fields.get('DTEND'), zone);
    if (end && start.dateOnly === end.dateOnly) return end.due > start.due;
    const duration = field(fields, 'DURATION').match(/^\+?P(?:(\d+)W|(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?)$/i);
    return Boolean(duration?.slice(1).some(amount => Number(amount) > 0));
  }

  function parse(text) {
    const warnings = new Set();
    const events = new Map();
    for (const calendar of readCalendars(text, warnings)) {
      const calendarZone = field(calendar.fields, 'X-WR-TIMEZONE');
      const defaultZone = calendarZone || shanghai;
      const cancelCalendar = field(calendar.fields, 'METHOD').toUpperCase() === 'CANCEL';
      for (const {fields, number} of calendar.events) {
        if (recurrenceFields.some(name => fields.has(name))) {
          warnings.add(`第 ${number} 条日历事件包含重复规则或例外，未导入。`);
          continue;
        }

        const version = eventVersion(fields);
        const cancelled = cancelCalendar || field(fields, 'STATUS').toUpperCase() === 'CANCELLED';
        let event;
        if (cancelled) {
          if (!version.uid) continue;
          event = {...version, cancelled};
        } else {
          const deadline = readDate(fields.get('DTSTART'), defaultZone);
          if (!deadline) {
            warnings.add(`第 ${number} 条日历事件的日期、时间或时区无法识别，未导入。`);
            continue;
          }
          if (deadline.floating && !calendarZone) warnings.add('未注明时区的日历时间已按北京时间（Asia/Shanghai）处理。');
          const title = field(fields, 'SUMMARY').replace(/[\u0000-\u001F\u007F]+/g, ' ').trim() || '未命名日历事件';
          const {due, dateOnly} = deadline;
          const url = safeCalendarURL(field(fields, 'URL'));
          const course = eventCourse(fields, calendar.fields);
          const hasDuration = eventHasDuration(fields, deadline, defaultZone);
          event = {...version, title, due, dateOnly, url, course, hasDuration, cancelled};
        }

        const key = version.uid ? `uid:${version.uid}` : JSON.stringify([event.title, event.due, event.course, event.url]);
        const previous = events.get(key);
        if (!previous || newer(event, previous)) events.set(key, event);
      }
    }

    const imported = [];
    const cancellations = [];
    for (const {cancelled, ...event} of events.values()) (cancelled ? cancellations : imported).push(event);
    return {events: imported, warnings: [...warnings], cancellations, cancelledUids: cancellations.map(event => event.uid)};
  }

  function timestamp(value) {
    if (typeof value === 'string') {
      const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i);
      if (!match) return NaN;
      const [, year, month, day, hour, minute, second = '0'] = match;
      if (!Number.isFinite(validDate(+year, +month, +day, +hour, +minute, +second))) return NaN;
    } else if (typeof value !== 'number') return NaN;
    const date = new Date(value);
    const year = date.getUTCFullYear();
    return year >= 1 && year <= 9999 ? date.getTime() : NaN;
  }

  function isoDay(value) {
    const match = typeof value === 'string' && value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!match) return null;
    const [, year, month, day] = match;
    return Number.isFinite(validDate(+year, +month, +day)) ? value : null;
  }

  function utcStamp(instant) {
    return new Date(instant).toISOString().replace(/[-:]|\.\d{3}/g, '');
  }

  function escaped(value) {
    return String(value).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
      .replace(/\\/g, '\\\\').replace(/\r\n?|\n/g, '\\n').replace(/([;,])/g, '\\$1');
  }

  function fold(line, encoder) {
    let result = '';
    let length = 0;
    for (const character of line) {
      const bytes = encoder.encode(character).length;
      if (length + bytes > 75) {
        result += '\r\n ';
        length = 1;
      }
      result += character;
      length += bytes;
    }
    return result;
  }

  function exportId(key, encoder) {
    let hash = 14695981039346656037n;
    for (const byte of encoder.encode(key)) hash = BigInt.asUintN(64, (hash ^ BigInt(byte)) * 1099511628211n);
    return `deadline-${hash.toString(16)}`;
  }

  function exportTasks(tasks) {
    const encoder = new TextEncoder();
    const now = Date.now();
    const stamp = utcStamp(now);
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Math Study Planner//Deadlines//ZH-CN', 'CALSCALE:GREGORIAN'];
    for (const task of tasks) {
      const title = String(task.title || '').trim();
      const dateOnly = task.dateOnly === true;
      const dueDay = dateOnly ? isoDay(task.dueDate || task.due) : null;
      const dueAt = dateOnly ? NaN : timestamp(task.due);
      if (!title || !(dueDay || Number.isFinite(dueAt))) continue;
      const id = exportId(task.id == null ? JSON.stringify([title, task.due, dueDay]) : String(task.id), encoder);
      const link = safeCalendarURL(task.url);
      lines.push('BEGIN:VEVENT', `UID:${id}@study-planner.invalid`, `DTSTAMP:${stamp}`, `SUMMARY:${escaped(title)}`);
      if (dueDay) lines.push(`DTSTART;VALUE=DATE:${dueDay.replace(/-/g, '')}`);
      else lines.push(`DTSTART:${utcStamp(dueAt)}`);
      if (link) lines.push(`URL:${link}`);

      const cutoff = dueDay ? zonedTime(Date.parse(`${dueDay}T00:00:00Z`) + dayMilliseconds, shanghai) - 1 : dueAt;
      const reminders = [{at: task.reminderAt, label: task.reminderLabel}, ...(Array.isArray(task.reminders) ? task.reminders : [])];
      const triggerTimes = new Set();
      for (const reminder of reminders) {
        const instant = timestamp(reminder?.at);
        if (!(instant > now && instant <= cutoff) || triggerTimes.has(instant)) continue;
        const trigger = utcStamp(instant);
        if (triggerTimes.has(trigger)) continue;
        triggerTimes.add(trigger);
        lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `TRIGGER;VALUE=DATE-TIME:${trigger}`,
          `DESCRIPTION:${escaped(reminder.label || `截止提醒 · ${title}`)}`, 'END:VALARM');
      }
      lines.push('END:VEVENT');

      const targetAt = timestamp(task.targetAt);
      if (Number.isFinite(targetAt)) {
        const targetTitle = task.targetLabel || '计划完成';
        lines.push('BEGIN:VEVENT', `UID:${id}-target@study-planner.invalid`, `DTSTAMP:${stamp}`,
          `DTSTART:${utcStamp(targetAt)}`, `SUMMARY:${escaped(`${targetTitle} · ${title}`)}`, 'END:VEVENT');
      }
    }
    lines.push('END:VCALENDAR');
    return `${lines.map(line => fold(line, encoder)).join('\r\n')}\r\n`;
  }

  window.DeadlineCalendar = {parse, exportTasks};
})();
