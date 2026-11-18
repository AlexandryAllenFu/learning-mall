function examAnswer(q){return q.english;}
function objectUI(q,a){return '';}
function freeReview(a,q){
  return `<section class="card"><h3>书写核对与导出</h3><ul><li>写清定义域、极限方向或所用定理的条件。</li><li>保留从原式到结论的关键等号。变化率要写单位。</li><li>结尾逐项回答英文题干所求。</li></ul><button onclick="exportReview('${a.id}')">导出本题过程供逐行批改</button></section>`;
}
function quiz3Lesson(id){
  const lecture=get(id)?.sec;
  const modules={L2:[1],L3:[1],L4:[1,2,3,4],L5:[5,6,7,8,9],L6:[10,11]};
  const matches=QUESTION_INDEX.map((q,i)=>[q,i]).filter(([q])=>modules[lecture]?.includes(QUESTION_SOLUTIONS[q.source+':'+q.number]?.module)).slice(0,3);
  return matches.length?`<section class="card"><h3>Quiz 原题联系</h3><div class="actions">${matches.map(([q,i])=>`<a class="button" href="#questions/${i}">${esc(q.label)} ↗</a>`).join('')}</div></section>`:'';
}
function packet(attempts){let out=['# MTH026 自由过程批改请求','请分别审核数学正确性与考场书写规范。接受所有等价的正确解法，不按参考答案逐字匹配；逐行指出错误、缺失依据与修改方式。无论我的答案是否正确，最后都给一份完整的英文考场参考解答。不要保证未经官方评分细则核验的分数。保留五维 A/B/C/U 的证据限制。'];for(let a of attempts){let q=Engine.generate(a.topic,a.seed,a.level);out.push(`## §${get(a.topic).sec} ${get(a.topic).name}\n记录 ${a.id}\n${stamp(a.at)}`,q.prompt,'### 我的原始过程',a.free||'未提供',a.object||'',`独立=${a.independent}；猜测=${a.guess}；借助帮助=${a.assisted}`, '### 结构化作答',q.fields.map((f,i)=>`${f.label}\n${a.answers[i]||'未作答'}`).join('\n'), '### 网站参考解答（请独立核验）',examAnswer(q));}return out.join('\n\n')}
function exportReview(id){download('MTH026-review-'+id+'.md',packet(state.attempts.filter(a=>a.id===id)),'text/markdown');toast('已导出；需手动附到聊天中，不会自动发送。')}
function exportChapter(sec){let aa=state.attempts.filter(a=>get(a.topic).sec===sec);if(!aa.length)return toast('此节还没有提交记录');download('MTH026-section-'+sec+'.md',packet(aa),'text/markdown');toast('章节过程已导出，请附到聊天中复核。')}
let readerReturn='#sources',readerDoc=null,readerPage=1;
function openMaterial(id,page=1){let d=MATERIALS.find(x=>x.id===id);if(!d)return toast('未找到资料，请通过助手报错。');readerReturn=location.hash;readerDoc=d;readerPage=Math.min(Math.max(1,Math.trunc(Number(page))||1),d.pages.length||1);if(state.active){state.active.assisted=true;save()}showReader()}
function bookPageControls(page) {
  if (!readerDoc.pages.some(p => p.printedPage)) return '';
  const pageLabel = readerPage <= 4 || !page.text ? '书本页序 ' : '书本页 ';
  const label = page.printedPage
    ? pageLabel + esc(page.printedPage) + (page.text ? '' : '（原书空白页）')
    : '原书空白页';
  return `<div class="book-navigation"><span>${label}</span>
    <form onsubmit="return jumpToPrintedPage(event)">
      <label>跳到书本页 <input name="folio" aria-label="书本页码" placeholder="如 33、A-1" required></label>
      <button type="submit">跳转</button>
    </form>
    <button onclick="readerGoto(1)">扉页</button><button onclick="readerGoto(5)">目录</button>
    <button onclick="readerGoto(13)">正文第 1 页</button></div>`;
}
function jumpToPrintedPage(event) {
  event.preventDefault();
  const input = event.currentTarget.elements.folio;
  const value = input.value.normalize('NFKC').trim().toLowerCase().replace(/\s*[-–—−]\s*/g, '-');
  const idx = readerDoc.pages.findIndex(p => p.printedPage?.toLowerCase() === value);
  if (idx >= 0) readerGoto(idx + 1);
  else {
    input.setCustomValidity('未找到这个书本页码，请核对数字或前缀。');
    input.reportValidity();
    input.setCustomValidity('');
  }
  return false;
}

function showReader(){document.querySelector('#material-reader')?.remove();let d=readerDoc,el=document.createElement('dialog');el.id='material-reader';el.className='material-reader';el.innerHTML=`<div class="reader-top"><div><b>${esc(d.name)}</b><small>${esc(d.filename)}</small></div><button onclick="document.querySelector('#material-reader').close()">关闭 · 返回原位置 ×</button></div><div class="actions">${d.pages.length?`<button onclick="readerMove(-1)" ${readerPage===1?'disabled':''}>上一页</button><label>PDF 第 <input aria-label="资料页码" type="number" min="1" max="${d.pages.length}" value="${readerPage}" onchange="readerGoto(this.value)"> / ${d.pages.length} 页</label><button onclick="readerMove(1)" ${readerPage===d.pages.length?'disabled':''}>下一页</button>`:''}${d.downloads.map(x=>`<a class="button" href="${esc(x.url)}" download target="_blank" rel="noopener">${esc(x.label)}</a>`).join('')}${d.chunks?`<button onclick="downloadLarge('${d.id}',this)">下载完整原始 PDF</button>`:''}</div>${d.pages.length?`${d.id==='book'?bookPageControls(d.pages[readerPage-1]):''}<div class="reader-canvas"><img src="${d.pages[readerPage-1].image}" alt="${esc(d.name)} 第 ${readerPage} 页原文"><details><summary>本页可检索文本（公式以原图为准）</summary><pre>${esc(d.pages[readerPage-1].text||(d.id==='book'?'原始 PDF 在此处留白。':'此页以扫描图片为主，请查看上方原文。'))}</pre></details></div>`:`<pre>${esc(d.text)}</pre>`}`;document.body.append(el);el.showModal();el.addEventListener('close',()=>el.remove())}
function readerGoto(n){readerPage=Math.min(readerDoc.pages.length,Math.max(1,Math.trunc(Number(n))||1));showReader()}
function readerMove(n){readerGoto(readerPage+n)}
async function downloadLarge(id,btn){let d=MATERIALS.find(x=>x.id===id);btn.disabled=true;btn.textContent='正在准备完整文件…';try{let parts=[];for(let path of d.chunks){let r=await fetch(path);if(!r.ok)throw Error('下载失败');parts.push(await r.arrayBuffer())}download(d.filename,new Blob(parts,{type:'application/pdf'}),'application/pdf');btn.textContent='已下载'}catch(e){toast('下载未完成，请重试。');btn.textContent='重试下载'}finally{btn.disabled=false}}
function libraryPage(){const indexed=new Set(QUESTION_INDEX.map(q=>q.source));const summary=MATERIALS.map(d=>({name:d.name,n:QUESTION_INDEX.filter(q=>q.source===d.id).length}));return head('COURSE LIBRARY','资料与出处','每条题目保留原题图、资料名称和页码。打开资料后，关闭阅读器会返回当前题目。')+`<section class="card"><p>期中范围为 Lecture 1–6。</p><p id="library-count">题库共 ${QUESTION_INDEX.length} 条。已从 ${indexed.size} 份资料抽取题目，另有 ${MATERIALS.length-indexed.size} 份资料作为讲义、反馈或未编号补充材料保留原文。</p><input id="library-search" aria-label="搜索资料" placeholder="搜索 Lecture、Assignment、Quiz 或原文关键词" oninput="filterLibrary(this.value)"><div id="library-list">${libraryRows('')}</div></section>`}
function libraryRows(search = '') {
  const query = search.trim().toLowerCase();
  const rows = [];
  for (const doc of MATERIALS) {
    const nameMatch = (doc.name + ' ' + doc.filename).toLowerCase().includes(query);
    const hit = query ? doc.pages.findIndex(page => page.text.toLowerCase().includes(query)) : -1;
    if (!nameMatch && hit < 0 && !(doc.text || '').toLowerCase().includes(query)) continue;
    const count = QUESTION_INDEX.filter(q => q.source === doc.id).length;
    const matchedPage = hit < 0 ? '' : `<button class="source-link" onclick="openMaterial('${doc.id}',${hit+1})">打开匹配的 PDF 第 ${hit+1} 页</button>`;
    rows.push(`<div class="source-item"><h3><button class="source-link" onclick="openMaterial('${doc.id}',1)">${esc(doc.name)} ↗</button></h3>
      <p>${doc.pages.length ? 'PDF 共 ' + doc.pages.length + ' 页' : '文本资料'} · ${count ? '题库已收录 ' + count + ' 条' : '作为资料阅读'}</p>
      ${matchedPage}<small>${esc(SOURCES.find(s=>s.id===doc.id)?.note || '原文件已收录。')}</small></div>`);
  }
  return rows.join('') || '<p>没有匹配的资料。</p>';
}
function filterLibrary(v){document.querySelector('#library-list').innerHTML=libraryRows(v)}
const GLOSSARY=[
['domain','domain / 定义域','把原表达式中分母、根号、对数等条件同时满足的输入收集起来。'],
['limit','limit / 极限','观察靠近目标点时的输出行为，保留题目中的方向。'],
['inverse','inverse / 反函数','由输出找原像。反函数的导数先找原像，再取原导数的倒数。'],
['chain','chain rule / 链式法则','先对外层求导并保留内层表达式，再乘内层导数。'],
['implicit','implicit / 隐式','把 y 视为 y(x)，每次对含 y 的量求 x 导数时要考虑链式。'],
['rate','with respect to time / 对时间求导','先列变量关系，再求时间导数，最后代入该时刻的数据。']
];
let helperContext=null;
function currentContext(){
 const [page,rawID]=location.hash.slice(1).split('/');
 let id=rawID||'';try{id=decodeURIComponent(id)}catch{id=''}
 if(page==='questions'){
  let stored;try{stored=localStorage.getItem('mth026-last-question')}catch{}
  const index=Math.max(0,Math.min(QUESTION_INDEX.length-1,Math.trunc(Number(rawID??state.lastQuestion??stored))||0)),q=QUESTION_INDEX[index];
  if(q){const source=MATERIALS.find(m=>m.id===q.source);return {route:location.hash,topic:null,title:(source?.name||q.source)+' · 第 '+q.page+' 页 · '+q.number,section:'',question:[q.label,...q.images.map(path=>new URL(path,location.href).href)].join('\n'),draft:questionStudyRecord(q).draft||'',answers:{},at:Date.now()};}
 }
 // A draft only supplies the context on its own training/result screen.
 // Reading another topic must keep that topic's sources and helper context.
 const a=page==='result'?state.attempts.find(a=>a.id===id):page==='train'?state.active:null;
 let t=a?get(a.topic):['learn','example','evidence'].includes(page)?get(id):null;
 if(page==='session'){
  const units=TOPICS.filter(t=>t.sec===id),index=state.study?.visits?.[id]??0;
  t=Number.isInteger(index)&&index>=0?units[index]||units[0]:null;
 }
 return {route:location.hash,topic:t?.id||null,section:t?.sec||(page==='session'?id:''),title:t?.name||(page==='session'?id+' · 整课':'资料 / 全站'),attempt:a?.id||null,question:a?Engine.generate(a.topic,a.seed,a.level).prompt:'',draft:a?.free||'',answers:a?{...a.answers}:{},at:Date.now()};
}
function openHelper(mode='ask'){helperContext=currentContext();document.querySelector('#study-helper')?.remove();let e=document.createElement('dialog');e.id='study-helper';e.className='study-helper';e.innerHTML=`<div class="row"><h2>学习助手</h2><button onclick="document.querySelector('#study-helper').close()" aria-label="关闭助手">×</button></div><p class="muted">${esc(helperContext.section?'§'+helperContext.section+' · ':'')}${esc(helperContext.title)} · 自动附带当前题目</p><div class="actions"><button onclick="helperTab('ask')">符号与提问</button><button onclick="helperTab('report')">报错 / 建议</button><button onclick="helperTab('history')">我的记录</button></div><div id="helper-content"></div>`;document.body.append(e);e.showModal();e.addEventListener('close',()=>e.remove());helperTab(mode)}
function helperTab(mode){let el=document.querySelector('#helper-content');if(mode==='history'){el.innerHTML=`<p>记录保存在本机，尚未自动发送。导出后附到聊天中，我才能看到并处理。</p><button onclick="exportIssues()">导出全部疑问与报错</button>${(state.notes||[]).filter(n=>n.kind).slice().reverse().map(n=>`<section class="card"><b>${esc(n.kind)} · ${esc(n.section)} · ${esc(n.status||'待处理')}</b><p>${esc(n.message)}</p><small>${stamp(n.at)}</small><button onclick="resolveIssue('${n.id}')">${n.status==='已解决'?'重新打开':'标记已解决'}</button></section>`).join('')||'<p>还没有记录。</p>'}`;return}el.innerHTML=(mode==='ask'?`<p>常见符号直接查看；开放问题可连同题目一起导出。这里不是实时 AI 对话。</p><div>${GLOSSARY.map(g=>`<details><summary>${g[1]}</summary><p>${g[2]}</p></details>`).join('')}</div>`:'<p>不必抄题号。会附上章节、题目、当前作答和所在页面。</p>')+`<label for="helper-message">${mode==='ask'?'你的疑问':'错误现象 / 改进建议'}</label><textarea id="helper-message" placeholder="例如：我不明白为什么这里要设参数" oninput="localStorage.setItem('mth026-helper-draft',this.value)"></textarea><div class="actions"><button class="primary" onclick="saveIssue('${mode==='ask'?'学习疑问':'报错建议'}')">保存记录</button><button onclick="saveIssue('${mode==='ask'?'学习疑问':'报错建议'}',true)">保存并导出给 ChatGPT</button></div>`;document.querySelector('#helper-message').value=localStorage.getItem('mth026-helper-draft')||''}
function saveIssue(kind,exportNow=false){let message=document.querySelector('#helper-message').value.trim();if(!message)return toast('请先写下疑问或错误。');let n={...helperContext,kind,message,status:'待处理',id:crypto.randomUUID()};state.notes.push(n);save();localStorage.removeItem('mth026-helper-draft');if(exportNow)exportIssues([n]);helperTab('history');toast('已保存到本机，未自动发送。')}
function resolveIssue(id){let n=state.notes.find(n=>n.id===id);n.status=n.status==='已解决'?'待处理':'已解决';save();helperTab('history')}
function exportIssues(notes=state.notes.filter(n=>n.kind)){download('MTH026-questions-and-bugs.md',notes.map(n=>`## ${n.kind} · §${n.section} ${n.title}\n状态：${n.status}\n时间：${stamp(n.at)}\n页面：${n.route}\n题目：\n${n.question}\n我的问题：\n${n.message}\n我的过程：\n${n.draft}\n检查点作答：\n${JSON.stringify(n.answers)}`).join('\n\n'),'text/markdown')}
function installEnhancements(){let b=document.createElement('button');b.id='helper-launcher';b.textContent='? 提问 / 报错';b.onclick=()=>openHelper();document.body.append(b)}
installEnhancements();

function sourcePage(id,topicID=currentContext().topic){
 const t=get(topicID);
 return t&&id===t.sec.toLowerCase()&&Number.isInteger(t.page)?t.page:1;
}
// Opening a substantive explanation is assistance, not an independent attempt.
document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open&&e.target.closest('#study-helper')&&state.active){state.active.assisted=true;save()}},true);

