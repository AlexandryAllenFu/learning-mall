const courseInfo = document.body.dataset.course === 'MTH026'
  ? {code:'MTH026', name:'微积分学习室', other:'MTH028', url:'./algebra/', art:'从割线到切线'}
  : {code:'MTH028', name:'线性代数学习室', other:'MTH026', url:'./', art:'看见矩阵变换'};
const calculus = courseInfo.code === 'MTH026';
const sessions = [...new Set(TOPICS.map(t=>t.sec))];
const themeTitles = {
  L1:'函数与反函数', L2:'极限的语言与运算', L3:'无穷远与三角极限', L4:'指数、连续性与介值定理',
  L5:'导数的定义与求导法则', L6:'反函数、隐函数与相关变化率',
  '1.1':'线性方程组', '1.2':'行化简与主元', '1.3':'向量方程', '1.4':'矩阵方程 Ax = b',
  '1.5':'解集与参数向量', '1.7':'线性无关', '1.8':'线性变换', '1.9':'标准矩阵',
  '2.1':'矩阵运算', '2.2':'矩阵的逆', '2.3':'可逆矩阵定理', '2.8':'子空间、列空间与零空间',
  '2.9':'坐标、维数与秩', '3.1':'行列式与余子式展开', '补充':'维数与延伸'
};
const sessionLabel = sec => /^L\d+$/.test(sec)?'Lecture '+sec.slice(1):sec==='补充'?sec:'§'+sec;
const taskLabels = {todo:'待提交',submitted:'已提交',review:'待补学',verified:'已验收',done:'已归档'};
const study = () => state.study ||= {minutes:45, drafts:{}, visits:{}, uploads:[]};
const safeID = value => /^[\w-]{1,100}$/.test(value) ? value : '';
const taskLink = task => '#deadlines/'+safeID(task.id);
const isPending = task => ['todo','submitted','review'].includes(task.status);
const studyPreviousRender = render;
const studyPreviousStart = start;
const studyPreviousLesson = lessonPage;
const studyPreviousLibraryRows = libraryRows;
const studyPreviousResult = resultPage;

function coursePage() {
  const scope = study().scope || 'term';
  const cards = sessions.filter(sec=>scope!=='midterm'||sec!=='补充').map(sec=>{
    const units = TOPICS.filter(t=>t.sec===sec);
    const read = units.filter(t=>state.read[t.id]).length;
    const passed = units.filter(t=>state.attempts.some(a=>a.topic===t.id&&a.grade.passed)).length;
    return `<a class="course-row" href="#session/${encodeURIComponent(sec)}"><span class="course-code">${sessionLabel(sec)}</span>
      <span><strong>${themeTitles[sec]||units[0].name}</strong><small>已读 ${read}/${units.length} · 独立通过 ${passed}/${units.length}</small></span><span aria-hidden="true">›</span></a>`;
  }).join('');
  const next = Object.entries(SEMESTER_LESSONS).map(([sec, item])=>`<a class="course-row" href="#session/${sec}"><span class="course-code">${sessionLabel(sec)}</span><span><strong>${themeTitles[sec]||item.title}</strong><small>讲解与课后自测</small></span><span aria-hidden="true">›</span></a>`).join('');
  return head('', '课程', '先连续读完讲解和例题，再做课后训练。')+
    `<div class="actions scope-switch"><button aria-pressed="${scope==='term'}" onclick="setScope('term')">学期课程</button><button aria-pressed="${scope==='midterm'}" onclick="setScope('midterm')">期中范围</button><a class="button" href="#map">搜索知识点</a></div>
    <section class="study-list">${cards}</section>${scope==='term'?'<h2 class="area-title">后续课程</h2><section class="study-list">'+next+'</section>':''}`;
}

function setScope(scope){study().scope=scope;save();render();}
function sectionNav(sec,index){
  const path=sessionPath(sec);
  return `<a href="${path}" onclick="jumpToUnit(event,'${encodeURIComponent(sec)}',${index})">${index===-1?'课后训练':esc(TOPICS.filter(t=>t.sec===sec)[index].name)}</a>`;
}
function sessionPath(sec){return '#session/'+encodeURIComponent(sec);}
function sessionPage(sec){
  const units = TOPICS.filter(t=>t.sec===sec);
  const extra = SEMESTER_LESSONS[sec];
  if (!units.length&&!extra) return coursePage();
  if(extra) return head(sessionLabel(sec),themeTitles[sec]||extra.title,extra.intro)+
    `<article class="lesson-paper">${extra.sections.map(([title,body])=>`<section><h2>${esc(title)}</h2><p>${esc(body)}</p></section>`).join('')}
    <section><h2>课后自测</h2><p>${esc(extra.check[0])}</p><details><summary>核对答案</summary><p>${esc(extra.check[1])}</p></details>
    <p class="muted">自测答案供自行核对。独立验收待补。</p><div class="actions">${extra.sources.map(id=>materialAction(id)).join('')}</div></section></article>`;
  const content = units.map((t,i)=>{
    const passed = state.attempts.filter(a=>a.topic===t.id&&a.grade.passed).sort((a,b)=>a.at-b.at);
    const revisit=passed.length>1&&passed.at(-1).at-passed[0].at>=86400000;
    const source=t.src.filter(id=>/^l\d+$/.test(id));
    const context=(LESSON_CONTEXT[sec]?.units||[])[i];
    return `<section id="unit-${i}" class="lesson-unit" data-unit="${i}">
      <p class="unit-tag">${esc(t.section||sessionLabel(t.sec))}</p><h2>${esc(t.name)}</h2>
      <p class="english-bridge"><b>英文题意</b> ${esc(t.bridge)}</p>
      <p>${esc(t.core)}</p>${context?`<p>${esc(context)}</p>`:''}
      <ol>${t.method.filter(x=>x!==t.core&&x!=='写出运算依据和所需条件，再检查结果。').map(x=>`<li>${esc(x)}</li>`).join('')}</ol>
      <p class="lesson-caution"><b>检查：</b>${esc(t.trap)}</p>
      <h3>典型例题</h3><pre>${esc(t.example)}</pre><p class="worked" lang="${calculus?'en':'zh-CN'}">${esc(t.answer)}</p>
      <div class="actions lesson-source">${(source.length?source:t.src.slice(0,1)).map(id=>materialAction(id,sourcePage(id,t.id))).join('')}
      <a href="#learn/${t.id}">知识点详情</a></div>
      <details><summary>${state.read[t.id]?'已读':'未标记已读'} · ${revisit?'间隔复测通过':passed.length?'独立通过':'查看掌握记录'}</summary>
      ${badges(t.id,true)}<a href="#evidence/${t.id}">查看原始作答证据</a></details>
    </section>`;
  }).join('');
  return `<a class="back-link" href="#course">‹ 课程目录</a>`+head(sessionLabel(sec),themeTitles[sec]||units[0].name,LESSON_CONTEXT[sec]?.intro||'沿着下面的知识顺序完成本课，再到课后训练检验。')+
    `<div class="reading-layout"><article class="lesson-paper">${content}
    <section id="unit--1" data-unit="-1"><h2>课后训练</h2><p>${esc(LESSON_CONTEXT[sec]?.summary||'关掉讲解，从题意、方法和计算三个环节检查自己的独立解题过程。')}</p>
    <div class="actions"><button onclick="completeLesson('${encodeURIComponent(sec)}')">标记本课已读</button></div>
    ${units.map(t=>`<div class="training-row"><span>${esc(t.name)}</span><button onclick="start('${t.id}')">做题</button><button onclick="start('${t.id}',true)">限时复测</button></div>`).join('')}</section></article>
    <details class="reading-outline" open><summary>本课目录</summary>${units.map((_,i)=>sectionNav(sec,i)).join('')}${sectionNav(sec,-1)}</details></div>`;
}

function materialAction(id, page=1){
  const item=MATERIALS.find(m=>m.id===id);
  return item?`<button class="source-link" onclick="openMaterial('${id}',${Number(page)||1})">${esc(item.name)}${page>1?' · PDF 第 '+page+' 页':''}</button>`:'';
}
function completeLesson(encoded){
  const sec=decodeURIComponent(encoded);
  for(const t of TOPICS.filter(t=>t.sec===sec)){state.read[t.id]=true;state.examples[t.id]=true;}
  save();
  toast('已记录阅读进度，掌握度仍以独立作答为准');
}
function jumpToUnit(event,encoded,index){
  event.preventDefault();
  const sec=decodeURIComponent(encoded);
  study().visits[sec]=index;
  study().last=sec;
  save();
  document.getElementById('unit-'+index)?.scrollIntoView();
}
let scrollSave;
window.addEventListener('scroll',()=>{
  if(!location.hash.startsWith('#session/'))return;
  clearTimeout(scrollSave);
  const hash=location.hash;
  scrollSave=setTimeout(()=>{
    if(location.hash!==hash)return;
    const units=[...app.querySelectorAll('[data-unit]')];
    if(!units.length)return;
    const sec=decodeURIComponent(hash.slice(9));
    const visible=units.filter(el=>el.getBoundingClientRect().top<innerHeight*.5).at(-1);
    const index=Number(visible?.dataset.unit||0);
    if(study().visits[sec]!==index){study().visits[sec]=index;save();}
  },150);
},{passive:true});

function mathArt(){
  return `<figure class="study-art"><figcaption>${courseInfo.art}</figcaption>
    <canvas id="math-art" width="720" height="420" role="img" aria-label="${courseInfo.art}坐标图"></canvas>
    <label class="art-slider">${calculus?'移动割线上的点':'调整剪切系数'}
      <input type="range" min="${calculus?'0':'-100'}" max="100" value="65" oninput="drawStudyArt(this.value)">
    </label><output id="art-value"></output></figure>`;
}
function drawStudyArt(value=65){
  const canvas=document.getElementById('math-art');if(!canvas)return;
  const ctx=canvas.getContext('2d'), color=calculus?'#78b8ff':'#c3a0ff';
  const w=canvas.width,h=canvas.height;
  const x0=calculus?290:350,y0=280,unit=100;
  const plot=(points,stroke,width=2)=>{
    ctx.beginPath();ctx.strokeStyle=stroke;ctx.lineWidth=width;
    points.forEach(([x,y],i)=>ctx[i?'lineTo':'moveTo'](x0+x*unit,y0-y*unit));ctx.stroke();
  };
  ctx.clearRect(0,0,w,h);
  for(let x=-4;x<=5;x+=.5)plot([[x,-3],[x,4]],'#ffffff19',1);
  for(let y=-2;y<=3;y+=.5)plot([[-5,y],[5,y]],'#ffffff19',1);
  plot([[-5,0],[5,0]],'#ffffff55');plot([[0,-3],[0,4]],'#ffffff55');
  const dot=(x,y)=>{ctx.beginPath();ctx.arc(x0+x*unit,y0-y*unit,7,0,Math.PI*2);ctx.fillStyle='#fff';ctx.fill();};
  let label;
  if(calculus){
    const h=Number(value)/100*1.55, f=x=>x*x/3;
    plot(Array.from({length:100},(_,i)=>{const x=-3+i*.065;return[x,f(x)];}),color,5);
    const slope=(2+h)/3;
    plot([[-4,f(1)-5*slope],[5,f(1)+4*slope]],'#fff',3);
    dot(1,f(1));dot(1+h,f(1+h));
    label=h===0?'切线斜率 '+slope.toFixed(2):'Δx = '+h.toFixed(2)+' · 割线斜率 '+slope.toFixed(2);
  }else{
    const k=Number(value)/100;
    const shape=[[0,0],[1.7,0],[1.7,1.5],[0,1.5],[0,0]];
    plot(shape,'#ffffff75',3);
    plot(shape.map(([x,y])=>[x+k*y,y]),color,5);
    plot([[0,0],[k*1.5,1.5]],color,4);dot(k*1.5,1.5);
    label='A(x, y) = (x '+(k<0?'−':'+')+' '+Math.abs(k).toFixed(2)+'y, y)';
  }
  document.getElementById('art-value').textContent=label;
}

function nextPage(){
  const now=Date.now();
  const due=TOPICS.filter(t=>state.due[t.id]&&state.due[t.id]<=now).sort((a,b)=>state.due[a.id]-state.due[b.id]);
  const queue=tasks().filter(isPending).sort((a,b)=>a.due-b.due);
  const urgent=queue.find(t=>t.pinned)||queue.find(t=>t.status==='todo'&&t.due<=now+86400000);
  const last=study().last;
  const sec=sessions.includes(last)||SEMESTER_LESSONS[last]?last:sessions.find(s=>TOPICS.some(t=>t.sec===s&&!state.read[t.id]))||sessions[0];
  const title=urgent?.title||get(state.active?.topic)?.name||due[0]?.name||themeTitles[sec]||sec;
  const route=urgent?taskLink(urgent):state.active?'#train':due.length?'#review':sessionPath(sec);
  const label=urgent?'打开任务':state.active?'继续作答':due.length?'查看到期复测':last?'继续上课':'开始上课';
  return `<div class="today-title"><h1>今天</h1><label>学习时间 <select onchange="study().minutes=Number(this.value);save();render()">${[15,25,45,60,90,120].map(n=>`<option value="${n}" ${study().minutes===n?'selected':''}>${n} 分钟</option>`).join('')}</select></label></div>
    ${FocusPractice.today()}
    <section class="study-hero"><div class="hero-study-copy"><p class="unit-tag">${urgent?'当前优先':state.active?'已保存草稿':due.length?'复习到期':sessionLabel(sec)}</p>
      <h2>${esc(title)}</h2><p>${urgent?(urgent.status==='todo'?'截止 '+stamp(urgent.due):taskLabels[urgent.status]):state.active?'从上次作答的位置继续。':due.length?'完成一次独立复测，检查上次的漏洞。':'完整讲解、典型例题和课后训练。'}</p>
      <a class="button primary" href="${route}">${label} <span aria-hidden="true">→</span></a></div>${mathArt()}</section>
    <div class="today-secondary"><section class="study-list"><div class="list-heading"><h2>近期 DDL</h2><div class="row"><a href="#deadlines">管理</a><a href="./deadlines/">全部课程 DDL</a></div></div>${queue.slice(0,3).map(t=>`<a class="study-line" href="${taskLink(t)}"><span>${esc(t.title)}<small>${taskLabels[t.status]} · ${stamp(t.due)}</small></span><span class="${t.status==='todo'&&t.due<now?'overdue':''}">${t.minutes?t.minutes+' 分钟':''}${t.status==='todo'&&t.due<now?' · 逾期':''}</span></a>`).join('')||'<p class="empty-state">还没有安排。<a href="#deadlines/new">添加作业或考试</a></p>'}
    ${queue.filter(t=>t.status==='todo'&&t.due<=now+86400000).reduce((total,t)=>total+(t.minutes||0),0)>study().minutes?'<p class="empty-state overdue">近期任务预计用时超过你设置的学习时间。</p>':''}</section>
    <section class="study-list"><div class="list-heading"><h2>待复习</h2><a href="#review">错题与复习</a></div>${due.slice(0,3).map(t=>`<a class="study-line" href="${sessionPath(t.sec)}"><span>${esc(t.name)}</span><span>›</span></a>`).join('')||'<p class="empty-state">当前没有到期复测。</p>'}</section></div>`;
}

start = function(id,timed=false){
  if(!get(id))return;
  const queue=study().drafts;
  if(state.active?.topic!==id){
    if(state.active)queue[state.active.topic]=state.active;
    state.active=queue[id]||null;
    delete queue[id];
  }
  if(!state.active&&calculus){
    let seed=state.attempts.filter(a=>a.topic===id).reduce((m,a)=>Math.max(m,a.seed+1),1000);
    state.active={topic:id,seed,level:Engine.difficulty(id,state.attempts),started:Date.now(),timed,limit:240,answers:{},free:'',guess:false,independent:false,assisted:false};
  }
  if(state.active){
    save();
    if(location.hash==='#train')render();
    else location.hash='train';
    return;
  }
  studyPreviousStart(id,timed);
}

function practicePage(){
  const drafts=[state.active,...Object.values(study().drafts)].filter(a=>a&&get(a.topic));
  return head('', '练习', '原题、独立训练和错题复测。')+`<div class="study-list">
   <a class="course-row" href="#questions"><span class="course-code">题库</span><span><strong>作业与 Quiz 原题</strong><small>${QUESTION_INDEX.length} 条 · 查看原题出处与解答</small></span><span>›</span></a>
   <a class="course-row" href="#course"><span class="course-code">训练</span><span><strong>按课程做题与限时验收</strong><small>在课后训练中选择具体知识点</small></span><span>›</span></a>
   <a class="course-row" href="#review"><span class="course-code">复习</span><span><strong>错题与到期复测</strong><small>查看当前薄弱点与下一次测试</small></span><span>›</span></a></div>
   ${drafts.length?`<h2 class="area-title">作答草稿</h2><div class="study-list">${drafts.map(a=>`<div class="study-line"><span>${esc(get(a.topic).name)}<small>${a.timed?'限时题 · 计时从首次开始算起':'独立训练'}</small></span><button onclick="start('${a.topic}')">继续</button></div>`).join('')}</div>`:''}`;
}

render = function(){
  const [raw='',value='']=location.hash.slice(1).split('/');
  const page=raw||'next';
  const section=({'next':'next','focus':'next','deadlines':'next','course':'course','session':'course','map':'course','learn':'course','example':'course','practice':'practice','questions':'practice','train':'practice','result':'practice','review':'practice','sources':'sources'})[page];
  const pages={focus:()=>FocusPractice.page(value),course:coursePage,session:()=>sessionPage(decodeURIComponent(value)),practice:practicePage};
  if (state.study?.focus && ['learn','example','session','sources','questions','result','evidence'].includes(page)) FocusPractice.markHelp();
  if(pages[page]){
    if(state.active&&page==='session'){state.active.assisted=true;save();}
    app.innerHTML=pages[page]();
    if(typeof renderMatrices==='function')renderMatrices(app);
  }else studyPreviousRender();
  document.querySelectorAll('nav a').forEach(a=>{
    const active=a.hash==='#'+section;
    a.classList.toggle('active',active);
    if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
  });
  if(page==='next')drawStudyArt();
  if(page==='session'){
    const sec=decodeURIComponent(value);
    if((sessions.includes(sec)||SEMESTER_LESSONS[sec])&&study().last!==sec){study().last=sec;save();}
  }
  if(page==='deadlines'&&value==='new')document.querySelector('#new-task')?.setAttribute('open','');
}
window.addEventListener('hashchange',()=>{
  if(location.hash.startsWith('#session/')){
    const sec=decodeURIComponent(location.hash.slice(9));
    const index=study().visits[sec];
    if(index!==undefined)requestAnimationFrame(()=>document.getElementById('unit-'+index)?.scrollIntoView());
  }
});

function tasks(){return state.tasks ||= [];}
function deadlineForm(task={}){
  const date=task.due?new Date(task.due+28800000).toISOString().slice(0,16):'';
  return `<form class="ddl-form" onsubmit="saveDeadline(event,'${safeID(task.id||'')}')">
    <label>任务名称<input name="title" required maxlength="160" value="${esc(task.title||'')}"></label>
    <div class="ddl-fields"><label>截止时间（北京时间）<input name="due" type="datetime-local" required value="${date}"></label>
    <label>预计用时（分钟）<input name="minutes" type="number" min="0" max="1440" value="${task.minutes||''}"></label></div>
    <label>关联知识点<select name="topic"><option value="">自定义任务</option>${TOPICS.map(t=>`<option value="${t.id}" ${task.topic===t.id?'selected':''}>${esc(sessionLabel(t.sec)+' · '+t.name)}</option>`).join('')}</select></label>
    <label>关联资料<select name="resource"><option value="">选择资料</option>${MATERIALS.map(m=>`<option value="${esc(m.id)}" ${task.resource===m.id?'selected':''}>${esc(m.name)}</option>`).join('')}</select></label>
    <label>题号或要求<textarea name="note" maxlength="4000">${esc(task.note||'')}</textarea></label>
    <label>子任务（每行一项）<textarea name="items" maxlength="1800" placeholder="完成第 1–3 题&#10;复习错题">${esc((task.items||[]).map(x=>x.text).join('\n'))}</textarea></label>
    <button class="primary">保存任务</button></form>`;
}
function saveDeadline(event,id){
  event.preventDefault();
  const data=new FormData(event.currentTarget), old=tasks().find(t=>t.id===id);
  const title=data.get('title').trim(), due=new Date(data.get('due')+'+08:00').getTime();
  if(!title||!Number.isFinite(due))return toast('请填写任务名称和截止时间');
  const items=data.get('items').split('\n').map(s=>s.trim()).filter(Boolean).slice(0,30)
    .map(text=>({text,done:old?.items?.some(x=>x.text===text&&x.done)||false}));
  const updated={...old,id:old?.id||crypto.randomUUID(),title,due,topic:data.get('topic'),
    resource:data.get('resource'),note:data.get('note').trim(),minutes:Number(data.get('minutes'))||0,
    items,status:old?.status||'todo',updated:Date.now()};
  if(old)Object.assign(old,updated);else tasks().push(updated);
  save();
  if(location.hash===taskLink(updated))render();else location.hash=taskLink(updated);
}
function changeDeadline(id,status){
  const task=tasks().find(t=>t.id===id);
  if(!task||!Object.hasOwn(taskLabels,status))return;
  task.status=status;task.updated=Date.now();
  if(status==='review'&&get(task.topic))state.due[task.topic]=Date.now();
  if(!isPending(task))task.pinned=false;
  save();render();
}
function togglePin(id){
  const task=tasks().find(t=>t.id===id);if(!task)return;
  const pin=!task.pinned;
  tasks().forEach(t=>{t.pinned=t===task&&pin;});
  save();render();
}
function toggleTaskItem(id,index,checked){
  const item=tasks().find(t=>t.id===id)?.items?.[index];if(!item)return;
  item.done=checked;save();
}
function deadlinesPage(){
  const id=location.hash.split('/')[1], sorted=[...tasks()].sort((a,b)=>a.due-b.due);
  const selected=sorted.find(t=>t.id===id);
  return `<a class="back-link" href="#next">‹ 今天</a>`+head('', '截止任务', '按北京时间安排提交，交完后可以继续跟踪补学。')+
    `<details class="card" id="new-task"><summary>添加 DDL</summary>${deadlineForm()}</details>
    <section class="study-list">${sorted.map(t=>`<a class="study-line" href="${taskLink(t)}"><span>${esc(t.title)}<small>${stamp(t.due)} · ${taskLabels[t.status]||'待提交'}</small></span><span>›</span></a>`).join('')||'<p class="empty-state">暂时没有任务</p>'}</section>`+
    (selected?deadlineDetail(selected):'');
}
function deadlineDetail(task){
  const id=safeID(task.id), t=get(task.topic);
  return `<section class="card deadline-focus" id="task-${id}">
    <div class="row"><h2>${esc(task.title)}</h2><span class="pill">${taskLabels[task.status]||'待提交'}</span></div>
    <p>${stamp(task.due)}${task.minutes?' · 预计 '+task.minutes+' 分钟':''}</p>
    <p class="task-note">${esc(task.note)}</p>
    ${(task.items||[]).map((item,i)=>`<label class="check"><input type="checkbox" ${item.done?'checked':''} onchange="toggleTaskItem('${id}',${i},this.checked)">${esc(item.text)}</label>`).join('')}
    <div class="actions">${t?`<a class="button" href="#learn/${t.id}">学习关联知识点</a><button onclick="start('${t.id}',true)">独立复测</button><a href="#evidence/${t.id}">查看作答证据</a>`:''}${materialAction(task.resource)}</div>
    <div class="actions"><label>任务状态<select onchange="changeDeadline('${id}',this.value)">${Object.entries(taskLabels).map(([s,n])=>`<option value="${s}" ${s===task.status?'selected':''}>${n}</option>`).join('')}</select></label>
    ${isPending(task)?`<button aria-pressed="${!!task.pinned}" onclick="togglePin('${id}')">${task.pinned?'取消置顶':'置顶至今天'}</button>`:''}</div>
    <small>任务状态由你管理，独立作答结果另行记录。</small>
    <details><summary>编辑任务</summary>${deadlineForm(task)}</details></section>`;
}

lessonPage = function(id, example){
  const t=get(id);
  if(!t)return studyPreviousLesson(id,example);
  return `<a class="back-link" href="${sessionPath(t.sec)}">‹ 回到整课</a>`+studyPreviousLesson(id,example);
};
resultPage = function(id){
  const a=state.attempts.find(a=>a.id===id), t=get(a?.topic);
  return studyPreviousResult(id)+(t?`<div class="actions"><a class="button" href="${sessionPath(t.sec)}">返回整课</a><a href="#practice">查看其他草稿</a></div>`:'');
};
libraryRows = function(query){
  const fallback=studyPreviousLibraryRows(query);
  const linked = [...new Set(MATERIALS.map(m=>m.id))].filter(id=>/^l\d+$/.test(id)||['a8','a9'].includes(id));
  const index = linked.map(id=>{
    const material=MATERIALS.find(m=>m.id===id);
    if(!material.name.toLowerCase().includes(query.toLowerCase()))return '';
    const sec=calculus?id.toUpperCase():id==='a8'?'2.9':id==='a9'?'3.1':null;
    const first=QUESTION_INDEX.findIndex(q=>q.source===id);
    return (sessions.includes(sec)||SEMESTER_LESSONS[sec]||first>=0)?
      `<li>${esc(material.name)} ${sec&&(sessions.includes(sec)||SEMESTER_LESSONS[sec])?`<a href="${sessionPath(sec)}">上课</a>`:''}
      ${first>=0?`<a href="#questions/${first}">原题</a>`:''}</li>`:'';
  }).join('');
  const rows=study().uploads.filter(f=>f.name.toLowerCase().includes(query.toLowerCase())).map(f=>
    `<div class="source-item"><h3>${esc(f.name)}</h3><p>本机资料 · 讲解待补</p><div class="actions"><button onclick="readUpload('${safeID(f.id)}')">打开原件</button><button onclick="deleteUpload('${safeID(f.id)}')">移除</button></div></div>`).join('');
  return (index?`<details class="source-crosslinks"><summary>课件与课程对照</summary><ul>${index}</ul></details>`:'')+rows+(rows&&fallback==='<p>没有匹配的资料。</p>'?'':fallback);
};
const studyPreviousLibrary = libraryPage;
libraryPage = function(){
  return `<section class="card local-material"><h2>导入新资料</h2><p>在当前浏览器保存 PDF、PPTX 或图片原件，可在资料库搜索文件名。</p>
    <label>选择文件<input type="file" accept=".pdf,.pptx,.png,.jpg,.jpeg,.webp" onchange="addUpload(this.files[0])"></label></section>`+
    studyPreviousLibrary();
};
function uploadDB(){
  return new Promise((resolve,reject)=>{
    const req=indexedDB.open(KEY+'-files',1);
    req.onupgradeneeded=()=>req.result.createObjectStore('files');
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error);
  });
}
async function uploadOperation(mode,action){
  const db=await uploadDB();
  try{
    return await new Promise((resolve,reject)=>{
      const tx=db.transaction('files',mode), req=action(tx.objectStore('files'));
      tx.oncomplete=()=>resolve(req.result);
      tx.onabort=()=>reject(tx.error);
      tx.onerror=()=>reject(tx.error);
    });
  }finally{db.close();}
}
async function addUpload(file){
  if(!file)return;
  if(!/\.(pdf|pptx|png|jpe?g|webp)$/i.test(file.name)||file.size>35*1024*1024)return toast('请选择 35 MB 以下的 PDF、PPTX 或图片');
  try{
    const id=crypto.randomUUID();
    await uploadOperation('readwrite',store=>store.add(file,id));
    study().uploads.unshift({id,name:file.name});
    save();render();toast('已保存资料原件');
  }catch{toast('本机资料无法保存，请检查浏览器储存空间');}
}
async function readUpload(id){
  try{
    const file=await uploadOperation('readonly',store=>store.get(id));
    if(!file)return toast('此浏览器没有该文件原件');
    download(file.name,file,file.type||'application/octet-stream');
  }catch{toast('无法读取原件');}
}
async function deleteUpload(id){
  if(!confirm('从当前浏览器移除这份资料？'))return;
  try{
    await uploadOperation('readwrite',store=>store.delete(id));
    study().uploads=study().uploads.filter(f=>f.id!==id);
    save();render();
  }catch{toast('移除失败');}
}

const studyOriginalSettings=settingsPage;
settingsPage=function(){
  return studyOriginalSettings()+`<section class="card"><h2>本机学习数据</h2>
    <p>本浏览器已保存 ${Object.keys(study().drafts).length+Number(!!state.active)} 份作答草稿。JSON 备份可在另一台设备导入。同一账号目前仍按浏览器保存，导入资料的原件需另行保留。</p></section>`;
};
window.addEventListener('storage',e=>{
  if(e.key!==KEY||!e.newValue)return;
  try{const value=JSON.parse(e.newValue);if(value?.version===1&&value.course===courseInfo.code){state=value;if(state.study?.focus)state.study.focus=FocusPractice.clean(state.study.focus);render();}}catch{}
});
window.addEventListener('hashchange',()=>{
  if(location.hash.startsWith('#deadlines/')&&location.hash!=='#deadlines/new'){
    requestAnimationFrame(()=>document.getElementById('task-'+safeID(location.hash.split('/')[1]))?.scrollIntoView());
  }
});
function restoreStudyState(data){
  if(!data||typeof data!=='object')return;
  const local=study();
  if(data.focus)local.focus=FocusPractice.merge(local.focus,data.focus);
  if([15,25,45,60,90,120].includes(data.minutes))local.minutes=data.minutes;
  for(const sec of sessions){
    const index=data.visits?.[sec], max=TOPICS.filter(t=>t.sec===sec).length;
    if(local.visits[sec]===undefined&&Number.isInteger(index)&&index>=-1&&index<max)local.visits[sec]=index;
  }
  if(!local.last&&(sessions.includes(data.last)||Object.hasOwn(SEMESTER_LESSONS,data.last)))local.last=data.last;
  for(const t of TOPICS){
    const draft=data.drafts?.[t.id];
    if(!draft||draft.topic!==t.id||state.active?.topic===t.id||local.drafts[t.id])continue;
    if(!Number.isInteger(draft.seed)||draft.seed<0||draft.seed>100000||![1,2].includes(draft.level)||!Number.isFinite(draft.started))continue;
    local.drafts[t.id]={...draft,answers:draft.answers||{},free:String(draft.free||'').slice(0,12000)};
  }
}
render();
if(location.hash.startsWith('#session/')){
  const index=study().visits[location.hash.slice(9)];
  if(index!==undefined)requestAnimationFrame(()=>document.getElementById('unit-'+index)?.scrollIntoView());
}
