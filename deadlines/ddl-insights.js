'use strict';

globalThis.DDLInsights = (() => {
  const minute = 60000;
  const day = 1440 * minute;
  const offset = 480 * minute;
  const completedKey = 'learning-mall-study-sessions-completed-v1';
  const daysOfWeek = ['周日','周一','周二','周三','周四','周五','周六'];
  const $ = id => document.getElementById(id);
  const local = instant => new Date(instant + offset).toISOString();
  const date = instant => local(instant).slice(0,10);
  const time = instant => local(instant).slice(11,16);
  const dateTime = instant => local(instant).slice(0,16).replace('T',' ');
  const dayStart = instant => Date.parse(date(instant) + 'T00:00:00+08:00');
  const minutes = n => n >= 60 ? Math.floor(n/60) + ' 小时' + (n%60 ? ' ' + n%60 + ' 分钟' : '') : n + ' 分钟';
  const loadedPlan = PrivatePlan.installFromLink();
  let now = Date.now(), selected = '', records = [], sessions = [], agenda = [], completed = loadChecks();

  function node(tag,text,props={}) {
    const element = document.createElement(tag);
    if (text !== undefined) element.textContent = text;
    Object.assign(element,props);
    return element;
  }

  function loadChecks() {
    try {
      const value = JSON.parse(localStorage.getItem(completedKey));
      return new Set(Array.isArray(value) ? value.filter(id => typeof id === 'string') : []);
    } catch { return new Set(); }
  }

  function status(message) {
    $('study-plan-status').hidden = !message;
    $('study-plan-status').textContent = message;
  }

  if (loadedPlan.status === 'added') {
    status('已把 ' + loadedPlan.count + ' 段学习计划保存到这个浏览器。');
    requestAnimationFrame(() => $('study-plan').scrollIntoView());
  } else if (loadedPlan.status === 'invalid') {
    status(loadedPlan.reason === 'storage' ? '浏览器无法保存计划。请确认本地存储权限。' : '这条计划链接无效。');
  }

  function showPermission(permission = StudyReminders.permission()) {
    const button = $('study-notify');
    const enabled = StudyReminders.enabled();
    button.disabled = permission === 'denied' || permission === 'unsupported';
    button.textContent = enabled ? '关闭网页通知' : '开启网页通知';
    $('study-notify-status').textContent = enabled ? '网页通知已开启。关闭网页后可用已设置的日历提醒。' : ({
      denied:'浏览器通知已被阻止。可在网站权限里打开通知后刷新。',
      unsupported:'此浏览器无法在此页面发送系统通知。页面仍显示提醒，关闭网页后可用日历提醒。'
    })[permission] || '网页开启时可接收学习计划和 DDL 通知。关闭网页后可用日历提醒。';
  }

  function checkReminders(at = Date.now()) {
    if (!StudyReminders.enabled()) return;
    const due = records.map(task => ({
      id:'ddl-' + task.id + '-' + task.reminderAt,
      title:'该着手了 · ' + task.title,
      body:task.course + ' · ' + (task.dateOnly ? date(task.due) + ' 截止，时刻待确认' : dateTime(task.due) + ' 截止'),
      at:task.reminderAt,
      expires:Math.min(task.due, task.reminderAt + 60 * minute)
    }));
    const practice = sessions.filter(session => !completed.has(session.id)).flatMap(session => {
      const times = [...new Set(session.reminders)].sort((a,b)=>b-a);
      return times.map((lead,i) => ({
        id:'practice-' + session.id + '-' + session.start + '-' + lead,
        title:session.title,
        body:dateTime(session.start) + ' · ' + (session.steps[0] || '打开学习计划查看步骤。'),
        at:session.start - lead * minute,
        expires:i + 1 < times.length ? session.start - times[i+1] * minute - 1 : session.end
      }));
    });
    return StudyReminders.update([...practice,...due], at);
  }

  function showDay(key) {
    const entry = agenda.find(item => item.key === key);
    if (!entry) return;
    selected = key;
    for (const button of $('insights-days').querySelectorAll('button')) {
      button.setAttribute('aria-pressed', String(button.dataset.date === key));
    }
    $('insights-day-title').textContent = entry.label + ' · ' + key;
    const items = [...entry.due.map(task => ({at:task.due,row:deadlineRow(task)})),
      ...entry.practice.map(session => ({at:session.start,row:practiceRow(session)}))].sort((a,b)=>a.at-b.at);
    $('insights-day-items').replaceChildren(...(items.length ? items.map(item=>item.row) :
      [node('p','这一天没有已记录的截止任务或学习计划。',{className:'fine'})]));
  }

  function deadlineRow(task) {
    const item = node('div',undefined,{className:'insights-item'});
    item.dataset.type = 'due';
    item.append(node('strong',task.title), node('small',(task.dateOnly ? '时刻待确认' : time(task.due) + ' 截止') + ' · ' + task.course),
      node('a','查看截止清单',{href:'#task-title'}));
    return item;
  }

  function practiceRow(session) {
    const item = node('article',undefined,{className:'insights-item'});
    item.dataset.type = 'practice';
    item.dataset.session = session.id;
    const done = completed.has(session.id);
    const summary = node('small', dateTime(session.start) + '–' + time(session.end) + ' · ' + session.course +
      (done ? ' · 已完成' : session.end <= now ? ' · 时段已过' : ''));
    const steps = node('ol');
    steps.append(...session.steps.map(step => node('li',step)));
    const button = node('button',done?'恢复待办':'标为完成',{type:'button'});
    button.dataset.completeSession = session.id;
    item.append(node('strong',session.title),summary,steps,button);
    return item;
  }

  function dayButton(entry,max) {
    const button = node('button',undefined,{type:'button',className:'insights-day'});
    button.dataset.date = entry.key;
    const scale = node('span',undefined,{className:'insights-scale'});
    scale.setAttribute('aria-hidden','true');
    const bar = node('span',undefined,{className:'insights-bar'});
    for (const [type,count] of [['due',entry.due.length],['practice',entry.practice.filter(s=>!completed.has(s.id)).length]]) {
      const segment = node('span');
      segment.dataset.type = type;
      segment.style.width = (100*count/max) + '%';
      if (count) bar.append(segment);
    }
    scale.append(bar);
    const total = entry.due.length + entry.practice.filter(s=>!completed.has(s.id)).length;
    button.append(node('span',entry.label),node('time',entry.key.slice(5),{dateTime:entry.key}),scale,node('small',total + ' 项待办'));
    return button;
  }

  function render(tasks, at = Date.now()) {
    records = tasks;
    now = at;
    sessions = PrivatePlan.sessions().sort((a,b)=>a.start-b.start);
    const today = dayStart(now), horizon = today + 7*day;
    agenda = Array.from({length:7},(_,i)=>{
      const current = today+i*day, key = date(current);
      return {key,label:i===0?'今天':daysOfWeek[new Date(current+offset).getUTCDay()],
        due:records.filter(task=>date(task.due)===key),
        practice:sessions.filter(session=>date(session.start)===key)};
    });
    const upcoming = sessions.filter(session=>session.start<horizon && session.end>now && !completed.has(session.id));
    const expired = records.filter(task=>task.dateOnly ? task.due+day<=now : task.due<=now).length;
    const due = records.filter(task=>task.due>=today && task.due<horizon).length;
    $('insights-summary').textContent = upcoming.length
      ? '接下来 ' + dateTime(upcoming[0].start) + ' · ' + upcoming[0].title
      : '按北京时间查看未来七天的截止事项与学习计划。';
    $('insights-metrics').replaceChildren(...[
      [String(due),'七天内截止'],[String(expired),'已过截止'],[minutes(Math.round(upcoming.reduce((sum,s)=>sum+s.end-s.start,0)/minute)),'近期学习计划']
    ].map(([value,label])=>{
      const cell=node('div');cell.append(node('strong',value),node('small',label));return cell;
    }));
    const max = Math.max(1, ...agenda.map(entry=>entry.due.length + entry.practice.filter(s=>!completed.has(s.id)).length));
    const focus = document.activeElement?.dataset?.date;
    $('insights-days').replaceChildren(...agenda.map(entry=>dayButton(entry,max)));
    showDay(agenda.some(entry=>entry.key===selected) ? selected : agenda[0].key);
    if (focus) $('insights-days').querySelector('button[data-date="' + focus + '"]')?.focus({preventScroll:true});
    $('study-all').hidden = !sessions.length;
    $('study-all-items').replaceChildren(...sessions.map(practiceRow));
    showPermission();
    void checkReminders(now);
  }

  $('insights-days').addEventListener('click',event=>{
    const button = event.target.closest('[data-date]');
    if (button) showDay(button.dataset.date);
  });

  $('study-plan').addEventListener('click',event=>{
    const button = event.target.closest('[data-complete-session]');
    if (!button) return;
    const id = button.dataset.completeSession, next = new Set(completed);
    if (next.has(id)) next.delete(id); else next.add(id);
    try { localStorage.setItem(completedKey,JSON.stringify([...next])); }
    catch { status('本机无法保存完成状态。');return; }
    completed = next;
    const area = button.closest('#study-all-items') ? $('study-all-items') : $('insights-day-items');
    render(records);
    [...area.querySelectorAll('[data-complete-session]')].find(candidate=>candidate.dataset.completeSession===id)?.focus({preventScroll:true});
  });

  $('study-notify').addEventListener('click',async ()=>{
    const button = $('study-notify');
    if (StudyReminders.enabled()) {
      StudyReminders.disable();
      showPermission();
      return;
    }
    button.disabled = true;
    try {
      showPermission(await StudyReminders.enable());
      await checkReminders();
    } catch {
      showPermission();
      status('暂时无法开启网页通知。可以检查浏览器权限后重试。');
    }
  });

  window.addEventListener('storage',event=>{
    if (event.key===completedKey || event.key==='learning-mall-private-study-plan-v1' || event.key===null) {
      completed = loadChecks();
      render(records);
    }
  });
  window.addEventListener('hashchange',()=>{
    const result=PrivatePlan.installFromLink();
    if (result.status==='none') return;
    status(result.status==='added' ? '已把 ' + result.count + ' 段学习计划保存到这个浏览器。' : '未能保存此计划链接。');
    render(records);
    if (result.status==='added') $('study-plan').scrollIntoView();
  });
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')render(records);});
  setInterval(()=>{if(document.visibilityState==='hidden')void checkReminders();}, 30000);
  return {render};
})();
