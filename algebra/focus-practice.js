// Both course pages use the same short-practice flow. Its attempts stay separate
// from the full course assessments, which test several dimensions in one sitting.
const FocusPractice = (() => {
  const bank = FocusQuestions;
  const firstCause = () => document.body.dataset.course === 'MTH026' ? 't35.inner' : 'rowops.rhs';
  const empty = () => ({plans: {}, turns: {}, session: null});
  const data = () => study().focus ||= empty();
  const validKey = key => typeof key === 'string' && /^[\w.-]{1,90}$/.test(key) && !!bank.topic(key);
  const validSeed = seed => Number.isSafeInteger(seed) && seed >= 0 && seed <= 10000000;
  const time = n => Number.isFinite(n) && n > 0 && n <= 8640000000000000;
  const unfinished = s => s?.items.some(i => !i.submitted);
  const current = s => s?.items.find(i => !i.submitted);
  const dayAfter = at => { const d = new Date(at); d.setHours(24, 0, 0, 0); return d.getTime(); };
  const dateLabel = at => new Date(at).toLocaleDateString('zh-CN', {month:'long', day:'numeric'});
  const title = '针对错因练 10 分钟';

  function clean(raw) {
    const out = empty();
    if (!raw || typeof raw !== 'object') return out;
    for (const [key, p] of Object.entries(raw.plans || {})) {
      if (!validKey(key) || !time(p?.changed) || !['practice','review','passed'].includes(p.stage)) continue;
      if (p.stage === 'review' && !time(p.due)) continue;
      out.plans[key] = {stage:p.stage, changed:p.changed, due:p.stage === 'review' ? p.due : 0,
        origin:typeof p.origin === 'string' ? p.origin.slice(0,100) : ''};
    }
    for (const [key, n] of Object.entries(raw.turns || {})) {
      if (validKey(key) && validSeed(n)) out.turns[key] = n;
    }
    const s = raw.session;
    if (!s || !['diagnosis','target','mixed'].includes(s.mode) || !time(s.started) ||
        !Array.isArray(s.items) || s.items.length !== (s.mode === 'mixed' ? 2 : 1)) return out;
    if (!s.items.every(i => i && validKey(i.key) && validSeed(i.seed))) return out;
    if (s.mode === 'mixed' && (bank.topic(s.items[0].key) === bank.topic(s.items[1].key) ||
        (!s.items[0].submitted && s.items[1].submitted))) return out;
    out.session = {mode:s.mode, started:s.started, finished:time(s.finished) ? s.finished : 0, items:s.items.map(i => ({
      key:i.key, seed:i.seed, answer:String(i.answer ?? '').slice(0,500),
      helped:i.helped === true, consulted:i.consulted === true, submitted:i.submitted === true, tracked:i.tracked === true
    }))};
    return out;
  }

  function merge(local, imported) {
    const a = clean(local), b = clean(imported);
    for (const [key, p] of Object.entries(b.plans)) {
      if (!a.plans[key] || p.changed > a.plans[key].changed) a.plans[key] = p;
    }
    for (const [key, n] of Object.entries(b.turns)) a.turns[key] = Math.max(a.turns[key] || 0, n);
    if (!a.session || (!unfinished(a.session) && b.session?.started > a.session.started)) a.session = b.session;
    return a;
  }
  function queues() {
    const all = Object.entries(data().plans);
    return {
      due:all.filter(([,p]) => p.stage === 'review' && p.due <= Date.now()).sort((a,b) => a[1].due - b[1].due),
      waiting:all.filter(([,p]) => p.stage === 'review' && p.due > Date.now()).sort((a,b) => a[1].due - b[1].due),
      practice:all.filter(([,p]) => p.stage === 'practice').sort((a,b) => b[1].changed - a[1].changed)
    };
  }
  function hasMistake(a) { return !!a?.grade?.results?.some(r => r.state === 'C'); }
  function recentMistake() {
    const seen = new Set();
    const plans = Object.entries(data().plans);
    for (const a of [...state.attempts].sort((a,b) => b.at - a.at)) {
      if (seen.has(a.topic)) continue;
      if (hasMistake(a) || a.grade?.passed) seen.add(a.topic);
      if (hasMistake(a) && !plans.some(([k,p]) => bank.topic(k) === a.topic && p.changed >= a.at)) return a;
    }
    return null;
  }
  function redraw() {
    save();
    if (location.hash === '#focus') render();
    else location.hash = 'focus';
  }
  function makeItem(key, tracked, avoid = '', blind = false) {
    const f = data();
    let seed = f.turns[key] || 0;
    // Seed zero is the square-derivative diagnostic; normal training also uses that form.
    if (key === 't35.inner' && avoid && !seed) seed = 1;
    // A regular course attempt and its follow-up may share a question generator.
    // Advance past an already displayed prompt before presenting the transfer task.
    for (let n=0; avoid && n<32 && bank.make(key,seed,blind).prompt === avoid; n++) seed++;
    f.turns[key] = seed+1;
    return {key, seed, tracked, answer:'', helped:false, consulted:false, submitted:false};
  }
  function start(mode, items) {
    data().session = {mode, items, started:Date.now()};
    redraw();
  }
  function diagnose() {
    if (unfinished(data().session)) return redraw();
    start('diagnosis', [makeItem(firstCause(), false)]);
  }
  function pick(key, origin = '') {
    if (!validKey(key)) return;
    const f = data(), attempt = state.attempts.find(a => a.id === origin);
    const avoid = attempt ? Engine.generate(attempt.topic,attempt.seed,attempt.level).prompt : '';
    f.plans[key] = {stage:'practice', changed:Date.now(), due:0, origin:attempt?.id || f.plans[key]?.origin || ''};
    if (unfinished(f.session)) { redraw(); toast('已记下错因，当前小练的草稿已保留。'); return; }
    start('target', [makeItem(key, true, avoid)]);
  }
  function mixed() {
    if (unfinished(data().session)) return redraw();
    const due = queues().due;
    if (!due.length) return redraw();
    const key = due[0][0], topic = bank.topic(key);
    const second = due.find(([k]) => bank.topic(k) !== topic)?.[0];
    // Prefer another due or familiar topic. With no history, use a neighbouring unit.
    const familiar = [...state.attempts].sort((a,b) => b.at-a.at).map(a => get(a.topic));
    const companions = document.body.dataset.course === 'MTH026' ? ['t33','t35'] : ['systems','rowops'];
    const candidates = [...familiar, ...TOPICS.filter(t => state.read[t.id]),
      ...companions.map(get).filter(t => t.sec === get(topic).sec), ...TOPICS.filter(t => t.sec === get(topic).sec), ...TOPICS];
    const other = candidates.find(t => t && t.id !== topic && t.sec !== '补充');
    const filler = second || bank.options(other.id).find(c => Array.isArray(bank.make(c.id,0).expected))?.id || bank.options(other.id)[0].id;
    const items = [key, filler].map((k, i) => {
      const previous = (data().turns[k] || 0) - 1;
      const avoid = previous < 0 ? '' : bank.make(k, previous).prompt;
      return makeItem(k, i === 0 || !!second, avoid, true);
    });
    if (Math.random() < .5) items.reverse();
    start('mixed', items);
  }
  function today() {
    const f = data(), q = queues();
    let message = '从一道诊断题开始，或选一个自己常犯的错。', action = '开始';
    if (unfinished(f.session)) { message = '上次的小练已保存。'; action = '继续作答'; }
    else if (q.due.length) { message = '隔天复测已到期，做两道混合题。'; action = '开始混合复测'; }
    else if (q.practice.length) { message = '这次练习 · ' + bank.label(q.practice[0][0]); action = '换题验证'; }
    else if (recentMistake()) { message = '上次训练有一道错题，选出卡住的步骤再练。'; action = '查看错题'; }
    else if (q.waiting.length) { message = dateLabel(q.waiting[0][1].due) + '起可做混合复测。'; action = '查看安排'; }
    return `<a class="focus-today" href="#focus" onclick="FocusPractice.enter(event)"><span><strong>${title}</strong><small>${esc(message)}</small></span><span class="focus-cta">${action} ›</span></a>`;
  }
  function enter(event) {
    if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    if (unfinished(data().session)) return redraw();
    data().session = null;
    const q = queues();
    if (q.due.length) return mixed();
    if (q.practice.length) return pick(q.practice[0][0]);
    redraw();
  }
  function resultLink(a) {
    if (!hasMistake(a)) return '';
    return `<a class="focus-today" href="#focus/${esc(encodeURIComponent(a.id))}"><span><strong>找出这道题的错因</strong><small>对照答错的步骤，选一个错因，换题验证。</small></span><span class="focus-cta">去小练 ›</span></a>`;
  }
  function dimensionFor(key) {
    const kind = key.split('.')[1];
    return {read:0, concept:1, method:2}[kind] ?? 3;
  }
  function choices(topic, origin = '', dimensions = null) {
    const options = bank.options(topic).filter(c => !dimensions || dimensions.includes(dimensionFor(c.id)));
    return `<div class="focus-actions">${options.map(c => `<button type="button" data-origin="${esc(origin)}" onclick="FocusPractice.pick('${c.id}', this.dataset.origin)">${esc(c.label)}</button>`).join('')}</div>`;
  }
  function manual() {
    return `<details class="card focus-card"><summary>自己选知识点和错因</summary><label>知识点
    <select onchange="FocusPractice.changeTopic(this)"><option value="">选择知识点</option>${TOPICS.map(t => `<option value="${t.id}">${esc(t.name)}</option>`).join('')}</select></label><div data-causes></div></details>`;
  }
  function changeTopic(select) {
    select.closest('details').querySelector('[data-causes]').innerHTML = get(select.value) ? choices(select.value) : '';
  }
  function fromAttempt(a) {
    const q = Engine.generate(a.topic,a.seed,a.level);
    const wrong = q.fields.flatMap((field,i) => a.grade.results[i]?.state === 'C'
      ? [`<li><b>${esc(field.label)}</b><p>你的答案　${esc(a.answers[i])}</p><p>核对　${esc(field.explain)}</p></li>`] : []);
    return `<section class="card focus-card"><h2>上次卡在哪一步？</h2><pre>${esc(q.prompt)}</pre><ul>${wrong.join('')}</ul>
      <h3>选择符合你解题过程的错因</h3>${choices(a.topic,a.id,a.grade.results.filter(r => r.state==='C').flatMap(r => r.dim === 3 ? [2,3] : [r.dim]))}</section>`;
  }
  function hub() {
    const q = queues();
    let body;
    if (q.due.length) body = '<h2>隔天混合复测</h2><p>两道题，全部提交后一起核对。</p><button class="primary" onclick="FocusPractice.mixed()">开始混合复测</button>';
    else if (q.practice.length) {
      const key = q.practice[0][0];
      body = `<h2>${esc(bank.label(key))}</h2><button class="primary" onclick="FocusPractice.pick('${key}')">做一道新题</button>`;
    } else {
      const a = recentMistake();
      if (a) return fromAttempt(a) + manual();
      body = q.waiting.length
        ? `<h2>下次混合复测</h2><p>${dateLabel(q.waiting[0][1].due)}起，回到「今天」就能开始。</p>`
        : '<h2>先找出一个值得练的步骤</h2><p>做一道短题，提交后对照解法选择错因。</p>';
      body += '<button onclick="FocusPractice.diagnose()">做一道诊断题</button>';
    }
    return `<section class="card focus-card">${body}</section>` + manual();
  }
  function questionFor(item) {
    return bank.make(item.key,item.seed,data().session.mode === 'mixed');
  }
  function correct(item) {
    const q = questionFor(item);
    if (!Array.isArray(q.expected)) return item.answer === q.expected;
    const values = Engine.numbers(item.answer.normalize('NFKC'));
    return values.length === q.expected.length && values.every((n,j) =>
      Number.isFinite(n) && Math.abs(n-q.expected[j]) < 1e-7);
  }
  function question(s) {
    const item = current(s), i = s.items.indexOf(item), q = questionFor(item);
    const heading = s.mode === 'mixed' ? '混合复测' : s.mode === 'target' ? '换题验证' : '诊断题';
    const control = q.options
      ? `<select id="focus-answer" name="answer" required onchange="FocusPractice.draft(this.value)"><option value="">请选择</option>${q.options.map(v => `<option ${item.answer===v?'selected':''} value="${esc(v)}">${esc(v)}</option>`).join('')}</select>`
      : `<input id="focus-answer" name="answer" required maxlength="500" autocomplete="off" inputmode="text" value="${esc(item.answer)}" oninput="FocusPractice.draft(this.value)">`;
    return `<section class="card focus-card"><h2>${heading}${s.mode === 'mixed' ? ' · 第 '+(i+1)+' / 2 题' : ''}</h2>
      ${s.mode==='target' ? '<p class="muted">这次练习 · '+esc(bank.label(item.key))+'</p>' : ''}
      <pre>${esc(q.prompt)}</pre>
      <form id="focus-form" data-index="${i}" data-started="${s.started}" onsubmit="FocusPractice.submit(event)">
      ${q.label === '你的答案' ? '' : '<p>'+esc(q.label)+'</p>'}<label for="focus-answer">你的答案</label>${control}
      <label class="check"><input type="checkbox" name="consulted" ${item.consulted || item.helped?'checked':''} ${item.helped?'disabled':''} onchange="FocusPractice.consult(this.checked)">我查了资料或猜了答案</label>
      <div class="focus-actions"><button class="primary" type="submit">提交答案</button><a href="#next">保存并返回今天</a></div></form></section>`;
  }
  function draft(value) {
    const item = current(data().session);
    if (item) { item.answer = value.slice(0,500); save(); }
  }
  function consult(used) {
    const item = current(data().session);
    if (item) { item.consulted = used; save(); }
  }
  function markHelp() {
    const item = current(state.study?.focus?.session);
    if (item && !item.helped) { item.helped = true; save(); }
  }
  function independent(item) { return correct(item) && !item.consulted && !item.helped; }
  function submit(event) {
    event.preventDefault();
    const s = data().session, item = current(s), form = event.currentTarget;
    if (!item || Number(form.dataset.started) !== s.started || Number(form.dataset.index) !== s.items.indexOf(item)) return;
    const answer = form.elements.answer.value.trim();
    if (!answer) { toast('请先填写答案'); return; }
    item.answer = answer; item.consulted = form.elements.consulted.checked; item.submitted = true;
    if (!unfinished(s)) s.finished = Date.now();
    if (s.finished && s.mode !== 'diagnosis') {
      const now = Date.now();
      for (const entry of s.items.filter(x => x.tracked)) {
        const p = data().plans[entry.key];
        if (!p) continue;
        p.stage = independent(entry) ? (s.mode === 'mixed' ? 'passed' : 'review') : 'practice';
        p.due = p.stage === 'review' ? dayAfter(now) : 0;
        p.changed = now;
      }
    }
    redraw();
    document.querySelector('#focus-answer, #focus-feedback')?.focus();
  }
  function feedback(s) {
    const rows = s.items.map((item,i) => {
      const q = questionFor(item);
      const status = independent(item) ? '独立答对' : correct(item) ? '借助资料或猜测后答对' : '需要再练';
      const explanation = `<h3>${s.mode === 'mixed' ? '第 '+(i+1)+' 题 · ' : ''}${status}</h3><pre>${esc(q.prompt)}</pre>
        <p>你的答案　${esc(item.answer)}<br>参考答案　${esc([].concat(q.expected).join(', '))}</p><p>${esc(q.explain)}</p>`;
      const select = !independent(item) && (s.mode === 'diagnosis' || !item.tracked)
        ? '<h3>你卡在哪一步？选好后做一道新题</h3>' + choices(bank.topic(item.key), '', [dimensionFor(item.key), 2, 3]) : '';
      return '<div>'+explanation+select+'</div>';
    }).join('');
    let next = '';
    if (s.mode === 'target') {
      const item = s.items[0];
      next = independent(item)
        ? `<p class="focus-summary">已安排隔天混合复测，${dateLabel(dayAfter(s.finished || s.started))}起可做。</p>`
        : `<button class="primary" onclick="FocusPractice.pick('${item.key}')">换一道再试</button>`;
    } else if (s.mode === 'mixed') {
      const failed = s.items.find(i => i.tracked && !independent(i));
      next = failed ? `<p>这一步已放回针对训练。</p><button class="primary" onclick="FocusPractice.pick('${failed.key}')">再练这个错因</button>`
        : '<p class="focus-summary">本轮已通过隔天复测 · '+s.items.filter(i=>i.tracked).map(i=>esc(bank.label(i.key))).join('、')+'</p>';
    }
    return `<section id="focus-feedback" tabindex="-1" class="card focus-card"><h2>${s.mode === 'mixed' ? '混合复测结果' : '核对这一步'}</h2>${rows}${next}
      <div class="focus-actions"><a class="button" href="#next">返回今天</a></div></section>` + manual();
  }
  function page(value) {
    const s = data().session;
    let id = ''; try { id = decodeURIComponent(value || ''); } catch {}
    const a = id && state.attempts.find(entry => entry.id === id);
    let body;
    if (a && hasMistake(a)) body = fromAttempt(a) + manual();
    else if (unfinished(s)) body = question(s);
    else if (s && Date.now() < dayAfter(s.finished || s.started)) body = feedback(s);
    else body = hub();
    return '<a class="back-link" href="#next">‹ 今天</a><h1>'+title+'</h1>'+body;
  }
  return {clean,merge,today,enter,resultLink,page,changeTopic,diagnose,pick,mixed,draft,consult,markHelp,submit};
})();
