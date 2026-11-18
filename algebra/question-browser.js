const QUIZ3_GUIDE = {
  '1': '先辨认题目要的是一个元素还是整个乘积。(i,j)-entry 指第 i 行、第 j 列。矩阵加减和数乘逐项进行。转置交换行列。计算 AᵀB 时，把 A 的第 i 列和 B 的第 j 列点乘。外积 uvᵀ 的第 i 行是 uᵢvᵀ，内积 uᵀv 则只得到一个数。',
  '2': '用带余除法把指数写成 3q+r。A³=I 意味着 A³ 的 q 次幂是 I，因此只需算 Aʳ。余数为 2 时，把 A 的指定行与指定列点乘即可，不必算完整的 A²。',
  '3': '先给每个初等矩阵写出逆操作。换行的逆是再次换行，乘非零数的逆是乘倒数，加某行倍数的逆是减去同样的倍数。从单位矩阵开始依次左乘 E₁⁻¹、E₂⁻¹、E₃⁻¹，最后得到 E₃⁻¹E₂⁻¹E₁⁻¹。把结果乘回原矩阵可检查。',
  '4': '先左乘 C 消掉 C⁻¹，再右乘 B 消掉 B⁻¹。于是 A+X=CB，所以 X=CB−A。题目给的是 B⁻¹ 和 C⁻¹，分别求逆后，只需算 C 对应行与 B 对应列的点积，再减去 A 的同位置元素。',
  '5': '把候选矩阵记作 M。若 M=A⁻¹，AM 的对角元素必须为 1，其余元素为 0。先挑原矩阵中零较多的行，计算少数元素来排除选项。若要求写完整证明，检查 AM=I，或把增广矩阵 [A | I] 行化简成 [I | M]。',
  '6': '给定 A⁻¹ 时，Ax=b 两边左乘 A⁻¹，得到 x=A⁻¹b。输出第 i 个分量就是逆矩阵第 i 行与 b 的点积。保持 b 的坐标顺序，特别注意两个负数相乘的符号。',
  '7': 'T⁻¹(e₂) 是被 T 映到 e₂ 的输入。直接设输入为 (a,b)ᵀ，解 A(a,b)ᵀ=(0,1)ᵀ。可先用第一行把 a 表示为 b，再代入第二行。两个方程都满足时，就是 A⁻¹ 的第二列。',
  '8': '方阵不可逆等价于行列式为零。沿零元素较多的行展开，保留代数余子式符号，再求使结果为零的参数。也可用行消元找主元消失的条件，避免在未讨论参数为零时除以含参数的式子。',
  '9': 'b 属于 Col A 当且仅当 Ax=b 有解。找 A 各行之间的线性关系可以快速筛选，因为 Ax 的各坐标也必须服从同一关系。若有多条独立行关系，必须全部检查，也可以直接化简 [A | b]。',
  '10': '从 Ax=0 读出主元变量和自由变量。将每个主元变量写成自由变量的式子，然后一次取一个自由变量为 1，其余为 0。得到的向量张成全部解，也因为自由坐标分别是单位向量而线性无关。',
  '11': '先数主元。每列有主元等价于单射和零空间只有零向量。每行有主元等价于满射和对每个 b 方程都相容。单射时列向量线性无关，可把它们扩充为陪域的一组基，再定义左逆将原列向量送到对应标准基向量。'
};

function questionBrowser(id) {
  const stored = state.lastQuestion??readStored('mth028-last-question');
  const index = Math.max(0, Math.min(QUESTION_INDEX.length - 1, Math.trunc(Number(id ?? stored)) || 0));
  const question = QUESTION_INDEX[index];
  if (!question) return head('','全部题目','暂无题目。');
  if(state.lastQuestion!==index){state.lastQuestion=index;save();}
  const source = MATERIALS.find(item => item.id === question.source);

  const controls = `<div class="actions">${index > 0 ? `<a class="button" href="#questions/${index-1}">← 上一题</a>` : ''}${index + 1 < QUESTION_INDEX.length ? `<a class="button primary" href="#questions/${index+1}">下一题 →</a>` : ''}</div>`;
  return head(`第 ${index+1} / ${QUESTION_INDEX.length} 题`, '全部题目', `${esc(source.name)} · 第 ${esc(question.number)} 题 · 原文第 ${question.page} 页`) +
    `<div class="toolbar"><select aria-label="选择题目" onchange="location.hash='questions/'+this.value">${QUESTION_INDEX.map((q,i)=>`<option value="${i}" ${i===index?'selected':''}>${i+1}. ${esc(MATERIALS.find(m=>m.id===q.source).name)} · ${esc(q.number)}（第 ${q.page} 页）</option>`).join('')}</select></div>` +
    controls +
    `<section class="card question-sheet"><h3>原题</h3>${question.images.map(path=>`<img src="${esc(path)}" alt="第 ${esc(question.number)} 题原文">`).join('')}<button onclick="openMaterial('${question.source}',${question.page})">查看完整资料</button></section>` +
    questionStudyPanel(index, question) +
    controls;
}

function getQuestionSolution(q){
  let source=q.source;
  if(source==='a4' && q.page===6 && /Compute the area|Compute the determinant of the 2|Replace|Draw/.test(q.label)) source='a4app';
  return QUESTION_SOLUTIONS[source+':'+q.number+':'+q.page] || QUESTION_SOLUTIONS[source+':'+q.number];
}
function solutionText(text){
  return esc(text).replace(/\[([^\[\]\n]*;[^\[\]\n]*)\]/g,(_,body)=>{
    const rows=body.split(';').map(row=>row.trim().split(',').map(cell=>cell.trim()));
    if(!rows.every(row=>row.length===rows[0].length))return '['+body+']';
    return '<span class="solution-matrix" role="math" aria-label="matrix"><span>'+rows.map(row=>'<span class="solution-matrix-row">'+row.map(cell=>'<span>'+cell+'</span>').join('')+'</span>').join('')+'</span></span>';
  });
}
function renderQuestionSolution(q){
  const s=getQuestionSolution(q);
  if(!s)return '<section class="card"><h3>逐题详解待补充</h3><p>此条保留原题，尚未完成独立解答。</p></section>';
  return `<section class="card question-solution"><h3>① 考了什么知识点</h3><p>${solutionText(s.topic)}</p></section>
  <section class="card question-solution"><h3>② 这题该怎么写</h3><h4>中文逐步推导</h4><ol>${s.steps.map(step=>`<li>${solutionText(step)}</li>`).join('')}</ol><h4>英文考场参考答案</h4><div class="exam-answer" lang="en">${solutionText(s.english)}</div></section>
  <section class="card question-solution"><h3>③ 下次遇到该怎么办</h3><ol>${s.method.map(step=>`<li>${solutionText(step)}</li>`).join('')}</ol></section>`;
}

function questionStudyKey(q) {
  return 'mth028-bank:' + q.source + ':' + q.page + ':' + q.number + ':' + (q.legacyLabel||q.label);
}
function questionStudyRecord(q) {
  state.bank ||= {};
  const key=questionStudyKey(q);
  if(state.bank[key])return state.bank[key];
  try {const old=JSON.parse(readStored(key));if(recordObject(old))return state.bank[key]={draft:String(old.draft||''),status:old.status||'未标记',independent:old.independent===true};}catch{}
  return {};
}
function updateQuestionStudy(index, changes) {
  const q=QUESTION_INDEX[index];if(!q)return {};
  const record={...questionStudyRecord(q),...changes};state.bank[questionStudyKey(q)]=record;save();return record;
}
// Include legacy per-question drafts in the complete progress backup.
function migrateQuestionRecords(){for(const q of QUESTION_INDEX)questionStudyRecord(q);}
function questionStudyPanel(index, q) {
  const record = questionStudyRecord(q);
  return `<section class="card"><h3>原题练习与复习记录</h3>
    <label>阅读状态 <select onchange="updateQuestionStudy(${index},{status:this.value})">
    ${['未标记','看过','待复习'].map(x=>`<option ${record.status===x?'selected':''}>${x}</option>`).join('')}</select></label>
    <label><input type="checkbox" ${record.independent?'checked':''} onchange="updateQuestionStudy(${index},{independent:this.checked})"> 独立做对（自评）</label>
    <details open ontoggle="if(this.open)this.nextElementSibling.open=false"><summary>独立作答</summary>
    <label>我的解题过程<textarea oninput="updateQuestionStudy(${index},{draft:this.value})">${esc(record.draft||'')}</textarea></label>
    <button onclick="exportBankReview(${index})">导出题目与作答供逐行批改</button>
    <button onclick="openHelper('report')">报告这道题的问题</button>
    </details>
    <details ontoggle="if(this.open){this.previousElementSibling.open=false;markAssisted()}"><summary>查看或收起详解</summary>${renderQuestionSolution(q)}</details></section>`;
}
function exportBankReview(index) {
  const q=QUESTION_INDEX[index], source=MATERIALS.find(m=>m.id===q.source);
  const answer=getQuestionSolution(q);
  const lines=['# MTH028 原题批改','请接受所有正确解法，分别审核数学正确性、推导完整性与英文考场表达。逐行反馈，最后给出完整英文参考答案。请根据原题图独立核对参考解。',
    source.name+' · 第 '+q.page+' 页 · '+q.number,location.href,
    ...q.images.map(path=>new URL(path,location.href).href),
    '### 我的过程',questionStudyRecord(q).draft||'未填写',
    '### 网站英文参考解',answer?.english||'待补充'];
  download('MTH028-bank-review-'+(index+1)+'.md',lines.join('\n\n'),'text/markdown');
}
