/* Source reader, exam solutions, contextual help and review packets. */
function examAnswer(q){
 const k=2+q.seed%7+(q.level-1)*3,b=3+q.seed%5, vec=a=>'('+a.join(', ')+')ᵀ', mat=a=>a.map(r=>'[ '+r.join('  ')+' ]').join('\n');
 const calc=q.fields.filter(f=>f.dim===3&&f.type==='numbers');let s='';
 switch(q.topic){
 case 'systems':s=`Applying R₂ ← R₂ − ${k}R₁ gives\n[ 1  2 | ${b} ]\n[ 0  0 | h − ${k*b} ].\nThe system is consistent if and only if h − ${k*b} = 0.\nTherefore h = ${k*b}. In this case, let x₂=t, t∈ℝ. Then x₁=${b}−2t.\nThus all solutions are x=(${b},0)ᵀ+t(−2,1)ᵀ, t∈ℝ.`;break;
 case 'rowops':s=`R₂ ← R₂ + ${k}R₁:\nR₂ = (−${k},5,−1,−2)+${k}(1,−2,3,${b})\n   = (0,${5-2*k},${3*k-1},${k*b-2}).\nHence the resulting augmented matrix is\n${mat([[1,-2,3,b],[0,5-2*k,3*k-1,k*b-2]])}.\nThis elementary row operation preserves the solution set.`;break;
 case 'rref':{let a=q.seed===0?[[1,1,3,1],[2,1,4,6],[3,2,7,7]]:[[1,k,1,b],[2,2*k,3,2*b+1],[3,3*k,4,3*b+1]];let r2=a[1].map((x,j)=>x-2*a[0][j]),r3=a[2].map((x,j)=>x-3*a[0][j]);s=`Applying R₂ ← R₂−2R₁ and R₃ ← R₃−3R₁ gives\n${mat([a[0],r2,r3])}.\nNext apply R₃ ← R₃−R₂${q.seed===0?', followed by R₂ ← −R₂':''}, then R₁ ← R₁−R₂.\nTherefore rref(A)=\n${mat(Engine.rref(a).matrix)}.\nThe pivot columns of A are ${Engine.rref(a).piv.map(x=>x+1).join(' and ')}.`;break;}
 case 'free':s=`The coefficient part has pivots in columns 1 and 3. Thus x₁ and x₃ are basic variables, and x₂ is the only free variable.\nLet x₂=t, where t∈ℝ. Reading the rows gives\nx₁+${k}t=${b},  x₃=${k}.\nHence x=(${b},0,${k})ᵀ+t(−${k},1,0)ᵀ, t∈ℝ.`;break;
 case 'span':s=`Equating coordinates in c₁u+c₂v=w gives\nc₁=${k},  2c₁+c₂=${2*k-b},  c₂=−${b}.\nThe values c₁=${k} and c₂=−${b} satisfy all three equations.\nThus w=${k}u−${b}v∈Span{u,v}.\nSince the first coordinate of w is ${k}, whereas those of u and v are 1 and 0, w≠u and w≠v. Hence w∉{u,v}.`;break;
 case 'axb':{let x=q.seed===0?[-1,0,-6]:[k,1,-b];s=`A has size 2×3, so its input lies in ℝ³ and its output lies in ℝ².\nAx = (−3(${x[0]})+6(${x[1]})+(${x[2]}),\n      6(${x[0]})+2(${x[1]})+8(${x[2]}))ᵀ\n   = ${vec(calc[1].expected)}.`;break;}
 case 'homogeneous':s=`u−v=(${k+1}−1,−1−${b})ᵀ=(${k},${-1-b})ᵀ.\nBy linearity of matrix multiplication,\nA(u−v)=Au−Av=b−b=0.\nSince u−v≠0, it is a nontrivial solution of Ax=0.`;break;
 case 'param':s=q.seed%2?`Let x₂=s and x₄=t, where s,t∈ℝ are arbitrary.\nThe equations give x₁=${b}−${k}s+t and x₃=−1−${b}t.\nTherefore\nx=(${b},0,−1,0)ᵀ+s(−${k},1,0,0)ᵀ+t(1,0,−${b},1)ᵀ, s,t∈ℝ.\nEvery solution has this form, and substitution shows that every such vector satisfies both equations.`:`Let x₃=t, where t∈ℝ is arbitrary. Then\nx₁=−${b}−${k}t,  x₂=${b}+${k+2}t.\nTherefore x=(−${b},${b},0)ᵀ+t(−${k},${k+2},1)ᵀ, t∈ℝ.\nEvery solution has this form, and substitution verifies both equations for every real t.`;break;
 case 'independent':s=`${k}u−${b}v=(${k},−${b},${k-b})ᵀ=w.\nThus ${k}u−${b}v−w=0.\nThe coefficients (${k},−${b},−1) are not all zero, so {u,v,w} is linearly dependent.\nThe requested coefficients are c₁=${k} and c₂=−${b}.`;break;
 case 'linear':s=`By linearity,\nT(${k}u−${b}v)=${k}T(u)−${b}T(v)\n =${k}(2,1)ᵀ−${b}(−1,3)ᵀ\n =(${2*k+b},${k-3*b})ᵀ.`;break;
 case 'standard':s=`T(e₁)=T(1,0)=(1,0)ᵀ,\nT(e₂)=T(0,1)=(${k},−${b})ᵀ.\nTherefore the standard matrix is\nA=[T(e₁) T(e₂)]=\n${mat([[1,k],[0,-b]])}.`;break;
 case 'onto':s=q.seed%2?`For A, apply R₃ ← R₃−R₁ and then R₃ ← R₃−R₂, followed by R₁ ← R₁−${k}R₂.\nThis gives rref(A)=[[1,0],[0,1],[0,0]].\nThere is a pivot in each column, so Ax=0 has only the trivial solution. Hence T is one-to-one.\nThere is no pivot in the third row, so the columns do not span ℝ³. Hence T is not onto ℝ³.`:`A is already in reduced row echelon form, with pivots in columns 1 and 3.\nThere is a pivot in every row, so the columns span ℝ². Hence T is onto ℝ².\nColumn 2 is free; in particular, A(−${k},1,0)ᵀ=0. Thus the kernel is nontrivial and T is not one-to-one.`;break;
 case 'multiply':s=`Since A is 2×2 and B has three columns, B must be 2×3.\nWrite b₃=(x,y)ᵀ. From Ab₃=(${b},${k})ᵀ,\nx+2y=${b},\n2x+5y=${k}.\nSubtracting twice the first equation from the second gives y=${k-2*b}.\nThen x=${b}−2(${k-2*b})=${5*b-2*k}.\nTherefore b₃=(${5*b-2*k},${k-2*b})ᵀ.`;break;
 case 'transpose':s=`A²=[[0,−1],[1,0]][[0,−1],[1,0]]=[[-1,0],[0,-1]]=−I.\nThus A⁴=(−I)²=I. Since ${4*k+2}=4(${k})+2,\nA^${4*k+2}=(A⁴)^${k}A²=−I.\nFor any conformable A,B, the product transpose formula is (AB)ᵀ=BᵀAᵀ.`;break;
 case 'inverse':s=`ad−bc=1(${k+1})−${k}(1)=1≠0, so A is invertible.\nUsing the 2×2 inverse formula,\nA⁻¹=1/1 [[${k+1},−${k}],[-1,1]].\nHence\nx=A⁻¹(${b},${b+1})ᵀ\n =((${k+1})${b}−${k}(${b+1}),−${b}+(${b+1}))ᵀ\n =(${b-k},1)ᵀ.\nSubstitution gives Ax=(${b},${b+1})ᵀ, as required.`;break;
 case 'elementary':s=`Apply R₂ ← R₂−${k}R₁ to I₂. This gives\nE=[[1,0],[−${k},1]].\nThe inverse row operation is R₂ ← R₂+${k}R₁, so\nE⁻¹=[[1,0],[${k},1]].\nIndeed, EE⁻¹=E⁻¹E=[[1,0],[0,1]]=I₂.`;break;
 case 'imt':s=`A is a ${k}×${k} matrix with ${k} pivots, so every column is a pivot column.\nThere are ${k}−${k}=0 free variables in Ax=0; hence its only solution is x=0.\nBy the Invertible Matrix Theorem, A is invertible. Consequently Ax=b has the unique solution x=A⁻¹b for every b∈ℝ^${k}.`;break;
 case 'subspace':s=`For u=(${k},0)ᵀ and v=(0,${b})ᵀ, the product of the coordinates is zero, so u,v∈H.\nBut u+v=(${k},${b})ᵀ, whose coordinate product is ${k*b}≠0. Hence u+v∉H.\nThus H is not closed under addition and is not a subspace of ℝ².`;break;
 case 'col':s=`Apply R₂ ← R₂−2R₁, then R₃ ← R₃−R₂. This yields\n[[1,${k},0],[0,0,1],[0,0,0]].\nThe pivot columns are 1 and 3. Taking these columns from the original matrix gives\nB={(1,2,0)ᵀ,(0,1,1)ᵀ}.\nThey are linearly independent, and the second column is ${k} times the first. Thus B spans Col A and is a basis for Col A.`;break;
 case 'null':s=`R₂ ← R₂−2R₁ reduces Ax=0 to x₁+${k}x₂+${b}x₃=0.\nLet x₂=s and x₃=t, with s,t∈ℝ. Then x₁=−${k}s−${b}t, so\nx=s(−${k},1,0)ᵀ+t(−${b},0,1)ᵀ.\nTherefore B={(−${k},1,0)ᵀ,(−${b},0,1)ᵀ} spans Nul A.\nIf α(−${k},1,0)ᵀ+β(−${b},0,1)ᵀ=0, the second and third coordinates give α=β=0.\nHence B is linearly independent and is a basis for Nul A.`;break;
 case 'dimension':s=`There are two pivot columns, so rank(A)=dim Col A=2.\nThere are 5−2=3 free variables in Ax=0. By the rank–nullity theorem, dim Nul A=3.`;break;
 }
 return s||q.english;
}
// A deterministic check of explicitly entered mathematical objects, not prose semantics.
function checkObject(q,text){
 let obj;try{if(text.trim().startsWith('{'))obj=JSON.parse(text);else{let blocks=text.trim().split(/\n\s*\n/),rows=text.trim().split(/\n/).filter(x=>x.trim()).map(Engine.numbers);obj=q.topic==='param'?{point:rows[0],directions:rows.slice(1)}:q.topic==='rref'?{matrices:blocks.map(b=>b.split(/\n/).filter(x=>x.trim()).map(Engine.numbers))}:{basis:rows};}}catch(e){return {ok:null,message:'格式未确认，不判错。请按提示输入数字，也可以保留自由书写并导出复核。'}}
 const finite=a=>Array.isArray(a)&&a.length>0&&a.every(x=>typeof x==='number'&&Number.isFinite(x));
 const eq=(a,b)=>a.length===b.length&&a.every((x,i)=>Math.abs(x-b[i])<1e-8);
 const rank=rows=>Engine.rref(rows).piv.length;
 const same=(a,b)=>a.length&&b.length&&a[0].length===b[0].length&&rank(a)===rank(b)&&rank([...a,...b])===rank(a);
 const k=2+q.seed%7+(q.level-1)*3,b=3+q.seed%5;
 try{
 if(q.topic==='col'||q.topic==='null'){
 const n=3,v=obj.basis;if(!Array.isArray(v)||!v.length||!v.every(x=>finite(x)&&x.length===n))throw Error('请每行输入一个三维向量');
 const expected=q.topic==='col'?[[1,2,0],[0,1,1]]:[[-k,1,0],[-b,0,1]];
 const independent=rank(v)===v.length,span=same(v,expected),original=q.topic!=='col'||v.every(x=>[[1,2,0],[k,2*k,0],[0,1,1]].some(c=>eq(x,c)));
 return {ok:independent&&span&&original,message:`线性无关：${independent?'通过':'未通过'}；张成目标空间：${span?'通过':'未通过'}；${q.topic==='col'?'取自原矩阵列（本题明确要求）：'+(original?'通过':'未通过'):'允许换序、非零倍数及其他等价基'}。这只核验所填基，正文论证仍待复核。`};
 }
 if(q.topic==='param'){
 let p=q.seed%2?[b,0,-1,0]:[-b,b,0],vs=q.seed%2?[[-k,1,0,0],[1,0,-b,1]]:[[-k,k+2,1]],v=obj.directions;
 if(!finite(obj.point)||obj.point.length!==p.length||!Array.isArray(v)||!v.length||!v.every(x=>finite(x)&&x.length===p.length))throw Error('请检查特解和方向向量的分量个数');
 let diff=obj.point.map((x,i)=>x-p[i]),span=same(v,vs),inspace=rank([...vs,diff])===rank(vs),ind=rank(v)===v.length;
 return{ok:span&&inspace&&ind,message:`特解属于原解集：${inspace?'通过':'未通过'}；方向张成完整零空间：${span?'通过':'未通过'}；方向无关：${ind?'通过':'未通过'}。允许更换特解、参数名称、方向的倍数及基。参数取遍实数与完整论证仍需复核。`};
 }
 if(q.topic==='rref'){
 let a=q.seed===0?[[1,1,3,1],[2,1,4,6],[3,2,7,7]]:[[1,k,1,b],[2,2*k,3,2*b+1],[3,3*k,4,3*b+1]],chain=obj.matrices;
 if(!Array.isArray(chain)||!chain.length||!chain.every(m=>Array.isArray(m)&&m.length===3&&m.every(r=>finite(r)&&r.length===4)))throw Error('每个矩阵应有 3 行、4 列；矩阵之间留一空行');
 let results=chain.map((m,i)=>same(a,m)),last=chain.at(-1),canonical=Engine.rref(a).matrix,final=eq(last.flat(),canonical.flat());
 return {ok:results.every(Boolean)&&final,message:results.map((ok,i)=>`第 ${i+1} 个矩阵与原矩阵行等价：${ok?'通过':'未通过'}`).join('；')+`；最终为 RREF：${final?'是':'否'}。允许不同消元顺序；所写行操作标签与论证仍待复核。`};
 }
 return{ok:null,message:'此题的自由数学对象尚无可靠自动核验器。已保留完整作答，请导出本题或章节复核；不会按措辞判错。'};
 }catch(e){return{ok:null,message:e.message+'。格式未确认，不判数学错误。'}}
}
function objectUI(q,a){if(!['col','null','param','rref'].includes(q.topic))return '';let hint=q.topic==='param'?'第一行填你的特解；之后每行填一个方向向量。分量用逗号分隔，支持 1/2 这样的分数。':q.topic==='rref'?'每行填矩阵的一行，分量用逗号分隔。不同步骤的矩阵之间留一空行，最后一个矩阵应为 RREF。':'每行填一个基向量，分量用逗号分隔。支持分数，向量顺序可以不同。';return `<details class="card"><summary>可选：核验我的另一种数学表示（允许等价解法）</summary><p>${hint}</p><textarea aria-label="等价数学对象" placeholder="填入你的数值；完整文字推导写在上方" oninput="state.active.object=this.value;save()">${esc(a.object||'')}</textarea><small>提交后核验数学对象。完整论证另行复核，检查不会直接提高掌握等级。</small></details>`}
function freeReview(a,q){let checks=['每个新符号有定义，矩阵与向量的维数明确。','行操作写清目标行、系数与中间结果；不能省略关键等号。','结论回答题目全部要求，并给出支持结论的依据。'];if(['param','free','null'].includes(q.topic))checks.push('自由参数明确声明属于 ℝ，并覆盖全部解。');if(['col','null'].includes(q.topic))checks.push('说明线性无关和张成，不能只列出向量。');let c=a.object?checkObject(q,a.object):null;return `<section class="card"><h3>自由过程复核</h3><p>完整语义：<b>待复核</b>。不同正确方法与措辞均可接受；自动检查不代替逐行论证审核。</p>${c?`<div class="callout">数学对象核验：${c.ok===null?'未确认':c.ok?'通过':'发现问题'}<br>${esc(c.message)}</div><pre>${esc(a.object)}</pre>`:''}<h4>本题书写规范核对表</h4><ul>${checks.map(x=>`<li>${x}</li>`).join('')}</ul><p>以下是核对标准，尚未声称你的文字已满足这些标准。</p><button onclick="exportReview('${a.id}')">导出本题，交给 ChatGPT 逐行复核</button><button onclick="exportChapter('${get(a.topic).sec}')">导出 §${get(a.topic).sec} 全部过程</button></section>`}
function packet(attempts){let out=['# MTH028 自由过程批改请求','请分别审核数学正确性与考场书写规范。接受所有等价的正确解法，不按参考答案逐字匹配；逐行指出错误、缺失依据与修改方式。无论我的答案是否正确，最后都给一份完整的英文考场参考解答。不要保证未经官方评分细则核验的分数。保留五维 A/B/C/U 的证据限制。'];for(let a of attempts){let q=Engine.generate(a.topic,a.seed,a.level);out.push(`## §${get(a.topic).sec} ${get(a.topic).name}\n记录 ${a.id}\n${stamp(a.at)}`,q.prompt,'### 我的原始过程',a.free||'未提供',a.object||'',`独立=${a.independent}；猜测=${a.guess}；借助帮助=${a.assisted}`, '### 结构化作答',q.fields.map((f,i)=>`${f.label}\n${a.answers[i]||'未作答'}`).join('\n'), '### 网站参考解答（请独立核验）',examAnswer(q));}return out.join('\n\n')}
function exportReview(id){download('MTH028-review-'+id+'.md',packet(state.attempts.filter(a=>a.id===id)),'text/markdown');toast('已导出；需手动附到聊天中，不会自动发送。')}
function exportChapter(sec){let aa=state.attempts.filter(a=>get(a.topic).sec===sec);if(!aa.length)return toast('此节还没有提交记录');download('MTH028-section-'+sec+'.md',packet(aa),'text/markdown');toast('章节过程已导出，请附到聊天中复核。')}
let readerReturn='#sources',readerDoc=null,readerPage=1;
function openMaterial(id,page=1){let d=MATERIALS.find(x=>x.id===id);if(!d)return toast('未找到资料，请通过助手报错。');readerReturn=location.hash;readerDoc=d;readerPage=Math.min(Math.max(1,Math.trunc(Number(page))||1),d.pages.length||1);if(state.active)markAssisted();showReader()}
function showReader(){document.querySelector('#material-reader')?.remove();let d=readerDoc,el=document.createElement('dialog');el.id='material-reader';el.className='material-reader';el.innerHTML=`<div class="reader-top"><div><b>${esc(d.name)}</b><small>${esc(d.filename)}</small></div><button onclick="document.querySelector('#material-reader').close()">关闭 · 返回原位置 ×</button></div><div class="actions">${d.pages.length?`<button onclick="readerMove(-1)" ${readerPage===1?'disabled':''}>上一页</button><label>PDF 第 <input aria-label="资料页码" type="number" min="1" max="${d.pages.length}" value="${readerPage}" onchange="readerGoto(this.value)"> / ${d.pages.length} 页</label><button onclick="readerMove(1)" ${readerPage===d.pages.length?'disabled':''}>下一页</button>`:''}${d.downloads.map(x=>`<a class="button" href="${esc(x.url)}" download target="_blank" rel="noopener">${esc(x.label)}</a>`).join('')}${d.chunks?`<button onclick="downloadLarge('${d.id}',this)">下载完整原始 PDF</button>`:''}</div>${d.pages.length?`<div class="reader-canvas"><img src="${d.pages[readerPage-1].image}" alt="${esc(d.name)} 第 ${readerPage} 页原文"><details><summary>本页可检索文本（公式以原图为准）</summary><pre>${esc(d.pages[readerPage-1].text||'此页以扫描图片为主，请查看上方原文。')}</pre></details></div>`:`<pre>${esc(d.text)}</pre>`}`;document.body.append(el);el.showModal();el.addEventListener('close',()=>el.remove())}
function readerGoto(n){readerPage=Math.min(readerDoc.pages.length,Math.max(1,Math.trunc(Number(n))||1));showReader()}
function readerMove(n){readerGoto(readerPage+n)}
async function downloadLarge(id,btn){let d=MATERIALS.find(x=>x.id===id);btn.disabled=true;btn.textContent='正在准备完整文件…';try{let parts=[];for(let path of d.chunks){let r=await fetch(path);if(!r.ok)throw Error('下载失败');parts.push(await r.arrayBuffer())}download(d.filename,new Blob(parts,{type:'application/pdf'}),'application/pdf');btn.textContent='已下载'}catch(e){toast('下载未完成，请重试。');btn.textContent='重试下载'}finally{btn.disabled=false}}
function libraryPage(){const indexed=new Set(QUESTION_INDEX.map(q=>q.source));const summary=MATERIALS.map(d=>({name:d.name,n:QUESTION_INDEX.filter(q=>q.source===d.id).length}));return head('COURSE LIBRARY','资料与出处','每条题目保留原题图、资料名称和页码。打开资料后，关闭阅读器会返回当前题目。')+`<section class="card"><p>期中范围为 §1.1–1.5、§1.7–1.9、§2.1–2.3、§2.8。</p><p id="library-count">题库共 ${QUESTION_INDEX.length} 条。已从 ${indexed.size} 份资料抽取题目，另有 ${MATERIALS.length-indexed.size} 份资料作为讲义、反馈或未编号补充材料保留原文。</p><input id="library-search" aria-label="搜索资料" placeholder="搜索 Lecture、Assignment、Quiz 或原文关键词" oninput="filterLibrary(this.value)"><div id="library-list">${libraryRows('')}</div></section>`}
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
['c','c 是什么 / 0=c','这里的小写 c 是一个数，表示消元后某一行的右端项，不是掌握状态 C。例如 0x₁+0x₂=c 简写成 0=c。c 可以为零或不为零；接下来由你判断等式何时成立。它不是新增的未知数。'],
['pivot','pivot / 主元','主元位置是矩阵化成阶梯形后每个非零行的第一个非零项所在位置。变量列有主元，对应基本变量；没有主元，对应自由变量。'],
['parameter','parameter / 参数','参数用来表示可以自由选择的数。s,t∈ℝ 表示 s 和 t 可以分别取任意实数；它们不是只能取某几个数。'],
['span','Span / 张成','Span{u,v} 是所有 au+bv（a,b 为任意实数）构成的集合；{u,v} 只是指定的两个向量。'],
['nul','Nul / kernel / 零空间','Nul A={x:Ax=0}，收集被 A 映到零向量的全部输入。对 T(x)=Ax，kernel 就是 Nul A。'],
['col','Col / 列空间','Col A 是 A 的列向量的所有线性组合构成的集合，属于输出空间。'],
['consistent','consistent / 相容','consistent 表示至少有一个解，可能唯一，也可能有无穷多个。inconsistent 表示无解。'],
['rref','RREF / 简化行阶梯形','RREF 是 reduced row echelon form。除阶梯形条件外，每个主元是 1，且是所在列唯一的非零项。']
];
let helperContext=null;
function currentContext(){
 const [page,rawID]=location.hash.slice(1).split('/');
 let id=rawID||'';try{id=decodeURIComponent(id)}catch{id=''}
 if(page==='questions'){
  let stored;try{stored=localStorage.getItem('mth028-last-question')}catch{}
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
function helperTab(mode){let el=document.querySelector('#helper-content');if(mode==='history'){el.innerHTML=`<p>记录保存在本机，尚未自动发送。导出后附到聊天中，我才能看到并处理。</p><button onclick="exportIssues()">导出全部疑问与报错</button>${(state.notes||[]).filter(n=>n.kind).slice().reverse().map(n=>`<section class="card"><b>${esc(n.kind)} · ${esc(n.section)} · ${esc(n.status||'待处理')}</b><p>${esc(n.message)}</p><small>${stamp(n.at)}</small><button onclick="resolveIssue('${n.id}')">${n.status==='已解决'?'重新打开':'标记已解决'}</button></section>`).join('')||'<p>还没有记录。</p>'}`;return}el.innerHTML=(mode==='ask'?`<p>常见符号直接查看；开放问题可连同题目一起导出。这里不是实时 AI 对话。</p><div>${GLOSSARY.map(g=>`<details><summary>${g[1]}</summary><p>${g[2]}</p></details>`).join('')}</div>`:'<p>不必抄题号。会附上章节、题目、当前作答和所在页面。</p>')+`<label for="helper-message">${mode==='ask'?'你的疑问':'错误现象 / 改进建议'}</label><textarea id="helper-message" placeholder="例如：我不明白为什么这里要设参数" oninput="state.helperDraft=this.value;save()"></textarea><div class="actions"><button class="primary" onclick="saveIssue('${mode==='ask'?'学习疑问':'报错建议'}')">保存记录</button><button onclick="saveIssue('${mode==='ask'?'学习疑问':'报错建议'}',true)">保存并导出给 ChatGPT</button></div>`;document.querySelector('#helper-message').value=state.helperDraft||readStored('mth028-helper-draft')||''}
function saveIssue(kind,exportNow=false){let message=document.querySelector('#helper-message').value.trim();if(!message)return toast('请先写下疑问或错误。');let n={...helperContext,kind,message,status:'待处理',id:newID()};state.notes.push(n);save();state.helperDraft='';removeStored('mth028-helper-draft');save();if(exportNow)exportIssues([n]);helperTab('history');toast('已保存到本机，未自动发送。')}
function resolveIssue(id){let n=state.notes.find(n=>n.id===id);if(!n)return;n.status=n.status==='已解决'?'待处理':'已解决';save();helperTab('history')}
function exportIssues(notes=state.notes.filter(n=>n.kind)){download('MTH028-questions-and-bugs.md',notes.map(n=>`## ${n.kind} · §${n.section} ${n.title}\n状态：${n.status}\n时间：${stamp(n.at)}\n页面：${n.route}\n题目：\n${n.question}\n我的问题：\n${n.message}\n我的过程：\n${n.draft}\n检查点作答：\n${JSON.stringify(n.answers)}`).join('\n\n'),'text/markdown')}
function installEnhancements(){let b=document.createElement('button');b.id='helper-launcher';b.textContent='? 提问 / 报错';b.onclick=()=>openHelper();document.body.append(b)}
installEnhancements();

function sourcePage(id,topicID=currentContext().topic){
 // All values are 1-based physical pages verified against the original PDFs.
 const pages={
  systems:{l1:8,review:2},rowops:{l1:21,review:2},
  rref:{l2:6,review:3},free:{l2:15,review:3},
  span:{l3:4,review:4},axb:{l3:9,review:5},
  homogeneous:{l4:5,review:6},param:{l4:9,review:6},
  independent:{l5:4,review:7},linear:{l5:18,review:8},
  standard:{l6:8,review:9},onto:{l6:18,review:9},
  multiply:{l7:13,review:10},transpose:{l7:21,l6:44,review:10},
  inverse:{l8:4,review:11},elementary:{l8:9,review:11},imt:{l8:15,review:12},
  subspace:{extra27:6,review:13},col:{extra27:16,review:13},null:{extra27:10,review:13},
  dimension:{review:13}
 };
 return pages[topicID]?.[id]||1;
}
// Opening a substantive explanation is assistance, not an independent attempt.
document.addEventListener('toggle',e=>{if(e.target.tagName==='DETAILS'&&e.target.open&&e.target.closest('#study-helper')&&state.active){markAssisted()}},true);

// Render nested numeric arrays as conventional bracketed matrices.
function renderMatrices(root){
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),nodes=[];
 while(walker.nextNode()){
  const node=walker.currentNode;
  if(!node.parentElement.closest('textarea,input,script,style,option,.math-matrix')&&/\[\s*\[/.test(node.nodeValue))nodes.push(node);
 }
 const pattern=/\[\s*\[[\d\s,.+−\-]+\](?:\s*,\s*\[[\d\s,.+−\-]+\])+\s*\]/g;
 for(const node of nodes){
  const text=node.nodeValue,fragment=document.createDocumentFragment();let last=0,changed=false;
  for(const match of text.matchAll(pattern)){
   let rows;try{rows=JSON.parse(match[0].replaceAll('−','-'))}catch{continue}
   if(!rows.length||!rows.every(r=>Array.isArray(r)&&r.length===rows[0].length&&r.every(Number.isFinite)))continue;
   fragment.append(document.createTextNode(text.slice(last,match.index)));
   const matrix=document.createElement('span');matrix.className='math-matrix';matrix.setAttribute('role','math');matrix.setAttribute('aria-label',rows.map(r=>r.join(', ')).join('; '));
   const grid=document.createElement('span');grid.className='matrix-grid';grid.style.gridTemplateColumns=`repeat(${rows[0].length}, minmax(1.4em, auto))`;
   rows.flat().forEach(value=>{const cell=document.createElement('span');cell.textContent=String(value).replace('-','−');grid.append(cell)});
   matrix.append(grid);fragment.append(matrix);last=match.index+match[0].length;changed=true;
  }
  if(changed){fragment.append(document.createTextNode(text.slice(last)));node.replaceWith(fragment)}
 }
}

const QUIZ3_LESSONS={multiply:[['1.1–1.8',1,'矩阵对应位置的运算、转置与内外积。例：1.1 的 (3,1) 元素为 3×9−5×2=17；内积得到标量，外积得到矩阵。']],transpose:[['1.3–1.6',1,'转置后 (i,j) 项等于原矩阵的 (j,i) 项；计算 AᵀB 的某项，用 A 的相应列与 B 的相应列点乘。'],['2.1–2.2',2,'矩阵幂：先用已知周期化简指数，再计算需要的元素。例 2.1：2027=3×675+2，故 A²⁰²⁷=A²，其 (1,2) 元素为 2。']],elementary:[['3.1–3.2',3,'乘积求逆必须逆序：(E₁E₂E₃)⁻¹=E₃⁻¹E₂⁻¹E₁⁻¹；逐个反转行变换。']],inverse:[['4.1–4.2',3,'矩阵方程 C⁻¹(A+X)B⁻¹=I：左乘 C、右乘 B，得到 X=CB−A。矩阵乘法不能调换顺序。'],['5.1–5.2',4,'候选逆矩阵应验证乘积为单位矩阵；检查少数元素可以排除选项，但完整确认需核验乘积。'],['6.1–6.2',5,'若已给出 A⁻¹，方程 Ax=b 的解为 x=A⁻¹b，再按行与列计算。']],imt:[['8.1–8.2',6,'参数导致不可逆：将行化简得到主元条件；方阵不可逆等价于主元不足。']],col:[['9.1–9.2',7,'判断 b 是否属于 Col A：把 b 放在增广列，检查 Ax=b 是否相容。']],null:[['10.1–10.2',8,'求 Nul A 的基：解 Ax=0，将自由参数系数拆成方向向量，说明这些方向张成零空间且线性无关。']],onto:[['11.1–11.2',9,'m×n 矩阵且 n>m 时，主元数最多为 m，因此必有自由变量，齐次系统有非零解；不能仅凭此判断满射。']]};
function quiz3Lesson(id){let items=QUIZ3_LESSONS[id]||[];return items.length?`<section class="card"><h3>Quiz 3 原题联系</h3>${items.map(([range,page,explanation])=>`<p><b>题 ${range}</b>　${esc(explanation)}</p><button class="source-link" onclick="openMaterial('quiz3',${page})">打开对应原题 · 第 ${page} 页 ↗</button>`).join('')}<p class="muted">原文件提供两套题及参考答案；未逐题独立复核的内容以原文为线索，使用前仍需核验。</p></section>`:''}
