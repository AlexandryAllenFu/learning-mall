'use strict';

(() => {
  const key = 'learning-mall-all-deadlines-v1';
  const sourceNames = {core: 'CORE', ebridge: 'eBridge', mail: '学校邮箱', manual: '手动记录', course: '课程任务'};
  const estimates = {assignment: 90, exam: 240, project: 360, admin: 30};
  const courseStores = [
    ['mth026-evidence-v1', 'MTH026 · 微积分', '../'],
    ['mth028-evidence-v1', 'MTH028 · 线性代数', '../algebra/']
  ];
  const hour = 3600000;
  const dateTime = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  });
  const $ = id => document.getElementById(id);
  const datePattern = /^\d{4}-\d{2}-\d{2}$/;
  const localDatePattern = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2})(?::(\d{2}))?$/;
  const absoluteDatePattern = /^(\d{4}-\d{2}-\d{2})T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,3})?)?(?:Z|[+-]\d{2}:\d{2})$/i;

  let data, editId, importBatch;
  let storageHealthy = true;

  function read(keyName) {
    try { return JSON.parse(localStorage.getItem(keyName)); }
    catch { storageHealthy = false; return null; }
  }

  function dueDate(input) {
    const value = String(input || '').trim();
    const local = value.match(localDatePattern), absolute = value.match(absoluteDatePattern);
    const day = datePattern.test(value) ? value : (local || absolute)?.[1];
    if (!day) return null;
    const utcDay = new Date(day + 'T00:00:00Z');
    if (!Number.isFinite(+utcDay) || utcDay.toISOString().slice(0, 10) !== day) return null;
    if (datePattern.test(value)) return value;
    const instant = new Date(local ? local[1] + 'T' + local[2] + ':' + (local[3] || '00') + '+08:00' : value);
    if (Number(value.slice(11,13)) > 23 || !Number.isFinite(+instant)) return null;
    return instant.toISOString();
  }

  function officialUrl(value) {
    try {
      const url = new URL(value);
      if (url.protocol !== 'https:' || url.username || url.password ||
          !['core.xjtlu.edu.cn','ebridge.xjtlu.edu.cn','mail.xjtlu.edu.cn'].includes(url.hostname)) return '';
      url.hash = '';
      for (const name of [...url.searchParams.keys()]) if (!['id','course','view'].includes(name)) url.searchParams.delete(name);
      for (const [name,v] of url.searchParams) if (!/^[a-z0-9_-]{1,25}$/i.test(v)) url.searchParams.delete(name);
      return url.href;
    } catch { return ''; }
  }

  function normalize(raw) {
    if (!raw || typeof raw.title !== 'string' || !raw.title.trim()) return null;
    const due = dueDate(raw.due);
    if (!due || typeof raw.id !== 'string' || !/^[a-z0-9.-]{1,100}$/i.test(raw.id)) return null;
    const kind = Object.hasOwn(estimates, raw.kind) ? raw.kind : 'assignment';
    const minutes = Number(raw.minutes);
    return {
      id: raw.id, title: raw.title.trim().slice(0, 160), course: String(raw.course || '').trim().slice(0, 80) || '未分课程',
      due, kind, minutes: Number.isInteger(minutes) && minutes >= 5 && minutes <= 10080 ? minutes : estimates[kind],
      source: Object.hasOwn(sourceNames, raw.source) ? raw.source : 'manual', url: officialUrl(raw.url),
      done: raw.done === true, since: Number.isFinite(raw.since) && raw.since > 0 ? raw.since : Date.now(),
      uid: typeof raw.uid === 'string' ? raw.uid.slice(0, 500) : '',
      sequence: Number.isInteger(raw.sequence) && raw.sequence >= 0 ? raw.sequence : 0,
      revision: typeof raw.revision === 'string' ? (dueDate(raw.revision) || '') : ''
    };
  }

  function ownTasks() {
    const stored = read(key);
    return Array.isArray(stored) ? stored.map(normalize).filter(Boolean) : [];
  }

  function save(records) {
    try {
      localStorage.setItem(key, JSON.stringify(records));
      data = records;
      storageHealthy = true;
      return true;
    } catch {
      say('保存失败。浏览器可能已禁止本地存储，或存储空间已满。');
      return false;
    }
  }

  function fromCourses() {
    return courseStores.flatMap(([store, course, url]) => {
      const tasks = read(store)?.tasks;
      if (!Array.isArray(tasks)) return [];
      return tasks.flatMap(t => {
        if (!t || typeof t.id !== 'string' || !/^[\w-]{1,100}$/.test(t.id) ||
            !Number.isFinite(t.due) || !Number.isFinite(+new Date(t.due))) return [];
        const record = normalize({...t, id: (course.startsWith('MTH026') ? 'mth026.' : 'mth028.') + t.id, course, source: 'course',
          due: new Date(t.due).toISOString(), since: Number.isFinite(t.updated) ? t.updated : t.due - 4*24*hour,
          done: ['submitted','verified','done'].includes(t.status)});
        return record ? [{...record, legacy: url + '#deadlines/' + encodeURIComponent(t.id)}] : [];
      });
    });
  }

  function dueTime(record) {
    return Date.parse(datePattern.test(record.due) ? record.due + 'T00:00:00+08:00' : record.due);
  }

  function plan(record) {
    const due = dueTime(record);
    const preferred = (record.kind === 'project' || record.minutes >= 360 ? 72 :
      record.kind === 'exam' || record.minutes >= 180 ? 48 : 24) * hour;
    const work = record.minutes * 60000;
    const remaining = Math.max(0, due - record.since);
    // Long tasks clear more buffer. Tight deadlines reserve roughly a quarter of the time left.
    const buffer = remaining >= preferred + work ? preferred : Math.min(preferred, Math.max(60000, remaining/4));
    const targetAt = Math.floor((due - buffer)/60000) * 60000;
    const lead = Math.min(24*hour, Math.max(60000, (targetAt - record.since)/2));
    const reminderAt = Math.floor((targetAt - lead)/60000) * 60000;
    return {due, targetAt, reminderAt};
  }

  const fmt = date => dateTime.format(new Date(date));
  function status(record, times, now) {
    if (record.done) return ['已完成','done'];
    if (datePattern.test(record.due)) {
      if (times.due + 24*hour <= now) return ['日期已过','urgent'];
      if (times.due <= now) return ['今天 · 时刻待确认','urgent'];
    } else if (times.due <= now) return ['已到截止','urgent'];
    if (times.targetAt <= now) return ['建议时间已到','urgent'];
    if (times.reminderAt <= now) return ['该着手了','urgent'];
    return ['待完成',''];
  }

  function node(tag, text, properties = {}) {
    const el = document.createElement(tag);
    Object.assign(el, properties);
    if (text !== undefined) el.textContent = text;
    return el;
  }
  function time(at) { return node('time', fmt(at), {dateTime:new Date(at).toISOString()}); }
  function say(message) { $('notice').textContent = message; }

  function tableRow(record, now) {
    const times = plan(record);
    const tr = node('tr');
    const name = node('td');
    name.append(node('strong', record.title), node('small', record.course + ' · ' + sourceNames[record.source] +
      ' · 约 ' + record.minutes + ' 分钟'));
    if (record.url) name.append(node('a', '查看来源', {href: record.url, target: '_blank', rel: 'noopener noreferrer'}));
    tr.append(name);
    const official = node('td'), finish = node('td'), reminder = node('td'), progress = node('td');
    official.dataset.label = '截止时间';
    if (datePattern.test(record.due)) {
      official.append(node('time', record.due, {dateTime:record.due}), node('small', '时刻待确认'));
    } else official.append(time(times.due));
    finish.dataset.label = '建议完成';
    finish.append(time(times.targetAt));
    reminder.dataset.label = '提前提醒';
    reminder.append(time(times.reminderAt));
    progress.dataset.label = '状态';
    const [label, tone] = status(record,times,now);
    const badge = node('span', label, {className:'tag'});
    badge.dataset.tone = tone;
    const actions = node('div', undefined, {className:'row-actions'});
    if (record.legacy) actions.append(node('a', '查看课程任务', {href:record.legacy}));
    else {
      for (const [action, label] of [['toggle',record.done?'恢复待办':'标为完成'],['edit','编辑']]) {
        const button = node('button', label, {type:'button'});
        button.dataset[action] = record.id;
        button.setAttribute('aria-label', label + ' · ' + record.title);
        actions.append(button);
      }
    }
    progress.append(badge,actions);
    tr.append(official,finish,reminder,progress);
    return tr;
  }

  function allRecords() {
    return [...data, ...fromCourses()].sort((a,b) => dueTime(a) - dueTime(b) || a.title.localeCompare(b.title,'zh-CN'));
  }

  function render() {
    const now = Date.now(), all = allRecords(), pending = all.filter(t => !t.done).sort((a,b) => plan(a).targetAt - plan(b).targetAt);
    const done = all.length - pending.length;
    $('completion-count').textContent = all.length ? '已完成 ' + done + ' / ' + all.length + ' 项' : '还没有任务';
    $('completion').max = all.length || 1;
    $('completion').value = done;
    const next = pending[0];
    $('first-task').textContent = next ? next.title : all.length ? '目前的任务已全部完成' : '导入学校日历或添加任务，开始安排';
    $('first-time').textContent = next ? next.course + ' · 建议 ' + fmt(plan(next).targetAt) + ' 完成' : '';
    const alert = pending.filter(t => plan(t).reminderAt <= now);
    $('reminders').hidden = !alert.length;
    $('reminder-list').replaceChildren(...alert.slice(0,5).map(t => {
      const times = plan(t);
      return node('li', status(t,times,now)[0] + ' · ' + t.course + ' · ' + t.title);
    }));
    if (alert.length > 5) $('reminder-list').append(node('li', '还有 ' + (alert.length - 5) + ' 项，见截止清单。'));
    const course = $('course-filter').value, stateFilter = $('status-filter').value;
    const courses = [...new Set(all.map(t=>t.course))].sort((a,b)=>a.localeCompare(b,'zh-CN'));
    $('course-filter').replaceChildren(node('option','全部课程',{value:''}), ...courses.map(name=>node('option',name,{value:name})));
    $('course-filter').value = courses.includes(course) ? course : '';
    const visible = all.filter(t => (!$('course-filter').value || t.course === $('course-filter').value) &&
      (stateFilter === 'all' || (stateFilter === 'done' ? t.done : !t.done)));
    $('rows').replaceChildren(...visible.map(t=>tableRow(t,now)));
    $('table-wrap').hidden = !visible.length;
    $('empty').hidden = !!visible.length;
    $('empty-message').textContent = all.length ? '这个筛选条件下没有任务。' : '尚未导入任务。可以先上传 CORE 日历或添加第一项。';
    $('calendar-export').disabled = !pending.some(t=>plan(t).due > now || t.due === shanghaiDay(now));
  }

  function shanghaiDay(instant) {
    return new Date(instant + 8*hour).toISOString().slice(0,10);
  }

  function editTask(record) {
    editId = record?.id;
    const form = $('task-form');
    form.reset();
    $('edit-title').textContent = record ? '编辑任务' : '添加任务';
    if (record) {
      const dateOnly = datePattern.test(record.due);
      const local = dateOnly ? record.due : new Date(Date.parse(record.due) + 8*hour).toISOString();
      for (const name of ['title','course','kind','minutes','source']) form.elements[name].value = record[name];
      form.elements.day.value = local.slice(0,10);
      form.elements.clock.value = dateOnly ? '' : local.slice(11,16);
    }
    $('task-dialog').showModal();
  }

  function id() {
    return globalThis.crypto.randomUUID();
  }

  function kindFor(title) {
    if (/(?:registration|enrol[l]?ment|注册|选课)/i.test(title)) return 'admin';
    if (/(?:\bexam\b|\bmidterm\b|考试|期中|期末)/i.test(title)) return 'exam';
    if (/(?:\bproject\b|\breport\b|论文|报告|项目)/i.test(title)) return 'project';
    return 'assignment';
  }

  function parseCSV(text) {
    const rows = [];
    let row = [], cell = '', quoted = false;
    for (let i=0; i<=text.length; i++) {
      const char = text[i] ?? '\n';
      if (char === '"') {
        if (quoted && text[i+1] === '"') { cell += '"'; i++; }
        else quoted = !quoted;
      } else if (!quoted && (char === ',' || char === '\n' || char === '\r')) {
        row.push(cell.trim());
        cell = '';
        if (char !== ',') {
          if (row.some(Boolean)) rows.push(row);
          row = [];
          if (char === '\r' && text[i+1] === '\n') i++;
        }
      } else cell += char;
    }
    if (quoted) throw Error('CSV 有一处引号没有闭合。');
    const header = (rows.shift() || []).map(s=>s.toLowerCase());
    if (!header.includes('title') || !header.includes('due')) throw Error('CSV 须至少包含 title 和 due 两列。');
    const events = rows.map(values => {
      const fields = Object.fromEntries(header.map((k,i)=>[k,values[i] || '']));
      return {title:fields.title, due:fields.due, course:fields.course, kind:fields.type};
    });
    return {events, warnings:[], cancellations:[]};
  }

  function importSelection(parsed, source, course) {
    const events = [];
    let invalid = 0;
    for (const event of parsed.events) {
      if (!event?.title || events.length >= 4000) { invalid++; continue; }
      const row = normalize({...event, id:id(), course: course || event.course, kind: event.kind || kindFor(event.title), source});
      if (row) events.push({row, checked: !event.hasDuration});
      else invalid++;
    }
    importBatch = {source, events, cancellations:parsed.cancellations || []};
    const notes = [];
    if (parsed.warnings?.length) notes.push('日历有 ' + parsed.warnings.length + ' 条导入提示，请对照原页面');
    if (invalid) notes.push('已跳过 ' + invalid + ' 条无效或超出上限的记录');
    if (events.some(e=>!e.checked)) notes.push('跨时段活动默认未选中，考试等截止事项可以勾选');
    if (importBatch.cancellations.length) notes.push('原日历有 ' + importBatch.cancellations.length + ' 个取消标记');
    $('import-summary').textContent = '共 ' + events.length + ' 项可以核对。' + (notes.length ? ' ' + notes.join('。') + '。' : '');
    const rows = events.map(({row,checked}, index) => {
      const check = node('input',undefined,{type:'checkbox',value:String(index),checked});
      const label = node('label',undefined,{className:'import-row'});
      label.append(check,node('span',row.title + ' · ' + row.course + ' · ' + (datePattern.test(row.due)?row.due+'（时刻待确认）':fmt(row.due))));
      const line = node('li');
      line.append(label);
      return line;
    });
    $('import-preview').replaceChildren(...rows);
    $('confirm-import').disabled = !events.length && !importBatch.cancellations.length;
    $('import-dialog').showModal();
  }

  function signature(t) {
    return [t.course,t.title,t.due].map(x=>String(x).trim().toLocaleLowerCase()).join('\u001f');
  }
  function atLeast(incoming, current) {
    return incoming.sequence > current.sequence || (incoming.sequence === current.sequence &&
      (!current.revision || Boolean(incoming.revision && incoming.revision >= current.revision)));
  }

  $('add-task').addEventListener('click',()=>editTask());
  for (const control of document.querySelectorAll('[data-close]')) {
    control.addEventListener('click',()=>control.closest('dialog').close());
  }
  for (const id of ['course-filter','status-filter']) $(id).addEventListener('change',render);

  $('task-form').addEventListener('submit',event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const records = ownTasks(), previous = editId && records.find(t=>t.id===editId);
    const entry = normalize({...previous,...Object.fromEntries(form),id:previous?.id || id(),
      due: form.get('day') + (form.get('clock') ? ' ' + form.get('clock') : '')});
    if (!entry) { say('请检查日期、时刻和任务名称。'); return; }
    if (previous && (entry.due !== previous.due || entry.kind !== previous.kind || entry.minutes !== previous.minutes)) entry.since=Date.now();
    if (save(previous ? records.map(t=>t.id===entry.id?entry:t) : [...records,entry])) {
      $('task-dialog').close();
      say('已保存任务。');
      render();
    }
  });

  $('rows').addEventListener('click',event => {
    const button = event.target.closest('button');
    if (!button) return;
    const records = ownTasks();
    const record = records.find(t=>t.id===(button.dataset.edit || button.dataset.toggle));
    if (!record) return;
    if (button.dataset.edit) return editTask(record);
    record.done = !record.done;
    if (!save(records)) return;
    say(record.done?'已标为完成。':'已恢复待办。');
    render();
    $('status-filter').focus();
  });

  $('import-form').addEventListener('submit',async event => {
    event.preventDefault();
    const fields = new FormData(event.currentTarget), file = fields.get('file');
    if (!file?.size) { say('请选择日历或表格文件。'); return; }
    if (file.size > 5*1024*1024) { say('请导入小于 5 MB 的文件。'); return; }
    try {
      const text = (await file.text()).replace(/^\uFEFF/,'');
      const parsed = /\.csv$/i.test(file.name) ? parseCSV(text) : DeadlineCalendar.parse(text);
      importSelection(parsed,fields.get('source'),fields.get('course'));
    } catch (error) { say(error.message || '无法识别文件。'); }
  });

  $('confirm-import').addEventListener('click',() => {
    if (!importBatch) return;
    const source = importBatch.source;
    const records = ownTasks(), selected = new Set([...$('import-preview').querySelectorAll(':checked')].map(c=>Number(c.value)));
    let added = 0, updated = 0;
    const allSignatures = new Map([...records,...fromCourses()].map(t=>[signature(t),t]));
    for (const [i,{row}] of importBatch.events.entries()) {
      if (!selected.has(i)) continue;
      const existing = records.find(t => row.uid && t.source===source && t.uid===row.uid);
      if (existing) {
        if (!atLeast(row,existing) && (existing.sequence !== row.sequence || row.revision)) continue;
        if (existing.due !== row.due) { existing.due=row.due; existing.since=Date.now(); updated++; }
        existing.sequence=row.sequence;
        existing.revision=row.revision || existing.revision;
        existing.url=row.url || existing.url;
        continue;
      }
      if (allSignatures.has(signature(row))) continue;
      records.push(row);
      allSignatures.set(signature(row),row);
      added++;
    }
    // An explicit cancellation can update an existing match after preview approval.
    const roster = records.filter(t => !(t.source===source && t.uid &&
      importBatch.cancellations.some(c=>c.uid===t.uid && atLeast(c,t))));
    const cancelled = records.length - roster.length;
    if (!save(roster)) return;
    $('import-dialog').close();
    $('import-form').reset();
    importBatch = null;
    say('新增 ' + added + ' 项，更新截止 ' + updated + ' 项，移除已取消 ' + cancelled + ' 项。');
    render();
  });

  $('calendar-export').addEventListener('click',() => {
    const now = Date.now();
    const rows = allRecords().filter(t=>!t.done && (dueTime(t)>now || t.due===shanghaiDay(now))).map(t => {
      const {targetAt,reminderAt} = plan(t);
      return {...t, title:t.course+' · '+t.title,dateOnly:datePattern.test(t.due),
        targetAt:targetAt>now?targetAt:undefined, reminderAt:reminderAt>now?reminderAt:undefined};
    });
    const blob = new Blob([DeadlineCalendar.exportTasks(rows)],{type:'text/calendar;charset=utf-8'});
    const url = URL.createObjectURL(blob);
    const link = node('a',undefined,{href:url,download:'learning-mall-reminders.ics'});
    link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000);
    say('已准备日历文件。导入后请核对提醒时间。');
  });

  window.addEventListener('storage',event => {
    if (event.key===key || event.key===null || courseStores.some(([k])=>k===event.key)) {
      data = ownTasks();
      render();
    }
  });
  // Update the timing indicators while the page remains open.
  setInterval(()=>{ if (document.visibilityState==='visible' && !document.querySelector('dialog[open]')) render(); },60000);
  data = ownTasks();
  render();
  if (!storageHealthy) say('部分本机数据无法读取。请确认浏览器允许本地存储。');
})();
