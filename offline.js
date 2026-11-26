/* Offline management stays entirely in this browser; no cloud progress sync. */
const Offline=(()=>{
  const manifest=self.OFFLINE_ASSETS, root=new URL('./',location.href);
  const absolute=path=>new URL(path,root).href;
  const resourcesCache='mth028-resources-'+manifest.resourceVersion;
  const mb=bytes=>(bytes/1048576).toFixed(1)+' MB';
  let registration=null,ready=false,busy=false,stopped=false,done=0,bytes=0,problem='',update=null,newVersion=false;
  const local=location.protocol==='file:';
  // The portable package contains the reassembled PDF, avoiding file:// fetch restrictions.
  if(local)for(const material of MATERIALS)if(material.chunks){material.downloads.push({url:'materials/'+material.id+'/original.pdf',label:'下载完整原始 PDF'});delete material.chunks;}
  function page(){
    return head('','离线使用','把课程留在这台设备，断网后继续阅读、练习和记录。')+`
    <section class="offline-summary" aria-labelledby="offline-title"><span class="offline-dot ${ready||local?'ready':''}" aria-hidden="true"></span><div><h2 id="offline-title">${local?'正在使用本地离线包':ready?'课程与练习已可离线使用':problem?'离线准备尚未完成':'正在准备离线课程'}</h2><p>${local?'请保留整个解压文件夹；用其中的 index.html 打开。':'当前'+(navigator.onLine?'已联网':'处于离线状态')+'。离线内容保存在当前浏览器、当前设备。'}</p></div></section>
    ${update||newVersion?'<div class="callout">有新版本可用。先保存当前作答，再更新页面。<button onclick="Offline.applyUpdate()">更新并重新加载</button></div>':''}
    <section class="card"><h2>保存全部原题与资料</h2><p>${local?'全部课程、原题图片、讲义和原始 PDF 已随离线包提供，无需再次保存。':'课程讲解、训练和文字详解会自动保存。原题图片、讲义扫描页和原始 PDF 需要另外保存。'} 资料共 ${manifest.resources.length} 个文件，约 ${mb(manifest.bytes)}。</p>
    <div id="offline-progress" role="status" aria-live="polite">${progress()}</div>
    <div class="actions"><button class="primary" onclick="Offline.cacheAll()" ${busy||local||!ready?'disabled':''}>${done===manifest.resources.length?'检查全部离线资料':'保存全部资料到本机'}</button>${busy?'<button onclick="Offline.stop()">暂停</button>':''}${!ready&&!local&&!busy?'<button onclick="Offline.repairCore()">重新准备离线课程</button>':''}${!local?'<button onclick="Offline.verify()" '+(busy?'disabled':'')+'>检查保存情况</button>':''}</div><p class="muted">可以暂停后继续，已保存文件无需重复下载。浏览器可能在存储空间不足或清理数据时移除缓存；出门前请检查完整保存并试着断网刷新一次。</p></section>
    <section class="card"><h2>下载完整离线包</h2><p>联网时直接下载已打包的课程、练习、原题图片和 PDF。电脑解压后打开 index.html 即可学习。</p><div class="actions"><a class="button primary" href="https://codeload.github.com/AlexandryAllenFu/learning-mall/zip/refs/tags/MTH028-offline-2026-11-r5">下载完整离线 ZIP</a></div><p class="muted">离线包不包含你的个人进度。请到<a href="#settings">进度与备份</a>导出 JSON，再在本地版导入。新导入资料的原件需另行保留。首次下载离线包仍需联网。</p></section>
    <section class="card"><h2>使用方法</h2><ol><li>在联网时打开本页，等待课程准备完成，再保存全部资料。</li><li>保存后断网，在同一浏览器重新打开原网址；也可通过浏览器菜单将学习室添加到主屏幕。</li><li>本机进度会自动保存。换浏览器、换设备或使用离线包时，请导出并导入进度备份。</li></ol><p>另一个课程的网址需要联网，本课程不自动下载 MTH026。学习助手中的疑问仅保存到本机，发送给 ChatGPT 仍需联网。</p><p class="offline-error">${esc(problem)}</p></section>`;
  }
  function progress(){return `<p>${busy?'正在处理：':''}已保存 ${done} / ${manifest.resources.length} 个文件 · ${mb(bytes)} / ${mb(manifest.bytes)}</p><progress max="${manifest.resources.length}" value="${done}" aria-label="资料保存进度"></progress>${problem?'<p class="offline-error">'+esc(problem)+'</p>':''}`;}
  function repaint(){const el=document.getElementById('offline-progress');if(el)el.innerHTML=progress();}
  function refresh(){if(location.hash==='#offline')render();}
  async function verify(){
    if(local)return;
    try{
      const core=await caches.open('mth028-core-'+manifest.version);
      const missing=[];for(const name of [...manifest.core,'offline-assets.js'])if(!await core.match(absolute(name)))missing.push(name);
      ready=missing.length===0;
      if(!ready)problem='课程缓存不完整。请联网后点击「重新准备离线课程」，再保存资料。';
      const cache=await caches.open(resourcesCache);done=0;bytes=0;
      for(const item of manifest.resources)if(await cache.match(absolute(item.url))){done++;bytes+=item.size;}
      repaint();refresh();return ready;
    }catch{problem='浏览器无法读取离线存储。请使用支持离线缓存的浏览器，或下载离线包。';refresh();}
  }
  async function repairCore(){
    if(busy||local)return;
    if(!registration?.active)return location.reload();
    busy=true;problem='';refresh();
    try{
      const cache=await caches.open('mth028-core-'+manifest.version);
      for(const name of [...manifest.core,'offline-assets.js'])if(!await cache.match(absolute(name))){
        const response=await fetch(absolute(name),{cache:'reload',credentials:'same-origin'});
        if(!response.ok||response.redirected)throw Error('课程下载失败，请确认联网且已登录。');
        const isHTML=name==='index.html';
        if(isHTML?!(await response.clone().text()).includes('data-course="MTH028"'):/text\/html/i.test(response.headers.get('content-type')||''))throw Error('登录可能已失效，请刷新并登录后重试。');
        await cache.put(absolute(name),response);
      }
      await verify();
    }catch(error){problem=error.message;}
    finally{busy=false;refresh();}
  }
  async function validResponse(url){
    const response=await fetch(url,{credentials:'same-origin'});
    if(!response.ok||response.redirected||/text\/html/i.test(response.headers.get('content-type')||''))throw Error('资料下载失败；请联网并确认已登录后重试。');
    return response;
  }
  async function cacheAll(){
    if(busy||!ready||local)return false;
    busy=true;stopped=false;problem='';refresh();
    let success=false;
    try{
      const cache=await caches.open(resourcesCache);
      if(!await verify())throw Error('课程缓存不完整，请先重新准备离线课程。');
      for(const item of manifest.resources){
        if(stopped)break;
        const url=absolute(item.url);
        if(!await cache.match(url)){
          await cache.put(url,await validResponse(url));
          done++;bytes+=item.size;repaint();
        }
      }
      await verify();success=!stopped&&done===manifest.resources.length;
    }catch(error){problem=error.name==='QuotaExceededError'?'设备空间不足。请清理空间后继续；进度和作答不会被删除。':error.message;}
    finally{busy=false;await verify();refresh();}
    return success;
  }
  // Small standards-based ZIP writer. Files are stored without compression to avoid dependencies.
  const crcTable=Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
  function crc(data){let c=0xffffffff;for(const byte of data)c=crcTable[(c^byte)&255]^(c>>>8);return(c^0xffffffff)>>>0;}
  function header(size){const data=new Uint8Array(size);return {data,view:new DataView(data.buffer)};}
  async function exportZip(){
    if(busy||!ready||local)return;
    if(!await cacheAll())return;
    busy=true;problem='';refresh();
    try{
      const cache=await caches.open(resourcesCache), core=await caches.open('mth028-core-'+manifest.version);
      const parts=[],central=[];let offset=0,count=0;
      async function add(name,content){
        const nameBytes=new TextEncoder().encode('MTH028-offline/'+name),data=content instanceof Uint8Array?content:new Uint8Array(await content.arrayBuffer()),checksum=crc(data),file=header(30);
        const v=file.view;v.setUint32(0,0x04034b50,true);v.setUint16(4,20,true);v.setUint16(6,0x800,true);v.setUint16(12,33,true);v.setUint32(14,checksum,true);v.setUint32(18,data.length,true);v.setUint32(22,data.length,true);v.setUint16(26,nameBytes.length,true);
        const dir=header(46),d=dir.view;d.setUint32(0,0x02014b50,true);d.setUint16(4,20,true);d.setUint16(6,20,true);d.setUint16(8,0x800,true);d.setUint16(14,33,true);d.setUint32(16,checksum,true);d.setUint32(20,data.length,true);d.setUint32(24,data.length,true);d.setUint16(28,nameBytes.length,true);d.setUint32(42,offset,true);
        parts.push(file.data,nameBytes,data);central.push(dir.data,nameBytes);offset+=30+nameBytes.length+data.length;count++;
      }
      for(const name of [...manifest.core,'offline-assets.js']){
        const response=await core.match(absolute(name));if(!response)throw Error('课程缓存缺失，请联网刷新后再下载。');await add(name,response);
      }
      const chunks=new Set(MATERIALS.flatMap(m=>m.chunks||[]));
      for(const item of manifest.resources){
        if(chunks.has(item.url))continue;
        const response=await cache.match(absolute(item.url));if(!response)throw Error('资料缓存缺失，请重新保存全部资料。');await add(item.url,response);
      }
      for(const material of MATERIALS)if(material.chunks){
        const buffers=[];for(const path of material.chunks)buffers.push(await(await cache.match(absolute(path))).arrayBuffer());
        await add('materials/'+material.id+'/original.pdf',new Blob(buffers));
      }
      const readme=new TextEncoder().encode('MTH028 离线学习室\n\n解压整个文件夹，然后打开 index.html。无需联网，无需安装软件。\n个人进度：从在线版的「进度与备份」导出 JSON，再在这里导入。\n导入资料的原件请另行保留。不同路径/浏览器可能各自保存进度，请定期备份。\n');
      await add('使用说明.txt',readme);
      const length=central.reduce((n,a)=>n+a.length,0),end=header(22),v=end.view;v.setUint32(0,0x06054b50,true);v.setUint16(8,count,true);v.setUint16(10,count,true);v.setUint32(12,length,true);v.setUint32(16,offset,true);
      download('MTH028-offline.zip',new Blob([...parts,...central,end.data],{type:'application/zip'}),'application/zip');
      toast('离线包已生成，请解压整个文件夹后打开 index.html。');
    }catch(error){problem='离线包未生成：'+error.message;}
    finally{busy=false;refresh();}
  }
  const previousRender=render,previousSettings=settingsPage;
  settingsPage=function(){return `<section class="offline-settings"><a href="#offline">离线使用与完整离线包</a><span>本机自动保存 · 跨设备请导出备份</span></section>`+previousSettings();};
  render=function(){
    if(location.hash==='#offline'){app.innerHTML=page();document.querySelectorAll('nav a').forEach(a=>{a.classList.remove('active');a.removeAttribute('aria-current');});}
    else previousRender();
    const h1=app.querySelector('h1');document.title=(h1?.textContent||'学习')+' · MTH028 线性代数学习室';
  };
  window.addEventListener('hashchange',()=>{if(!location.hash.startsWith('#session/')&&!location.hash.startsWith('#deadlines/'))app.focus({preventScroll:true});});
  window.addEventListener('online',refresh);window.addEventListener('offline',refresh);
  async function init(){
    if(local){ready=true;done=manifest.resources.length;bytes=manifest.bytes;return refresh();}
    if(!('serviceWorker'in navigator)||!('caches'in self)){problem='当前浏览器不支持离线缓存。请在最新版 Chrome、Edge 或 Safari 中打开。';return refresh();}
    try{
      registration=await navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'});
      if(registration.active){ready=true;await verify();refresh();}
      update=registration.waiting;
      const watch=worker=>worker?.addEventListener('statechange',async()=>{
        if(worker.state==='activated'){ready=true;await verify();refresh();}
        if(worker.state==='installed'&&navigator.serviceWorker.controller){update=worker;refresh();}
        if(worker.state==='redundant'&&!ready){problem='离线课程准备失败，请联网刷新重试。';refresh();}
      });
      watch(registration.installing);
      registration.addEventListener('updatefound',()=>watch(registration.installing));
      navigator.serviceWorker.addEventListener('controllerchange',()=>{ready=true;refresh();});
      navigator.serviceWorker.addEventListener('message',event=>{if(event.data?.type==='OFFLINE_VERSION'&&event.data.version!==manifest.version){newVersion=true;refresh();}});
    }catch{problem='离线课程准备失败，可能是浏览器限制或登录已失效。请联网刷新后重试。';refresh();}
  }
  render();init();
  return {cacheAll,verify,repairCore,exportZip,stop(){stopped=true;},applyUpdate(){if(newVersion)return location.reload();if(update){navigator.serviceWorker.addEventListener('controllerchange',()=>location.reload(),{once:true});update.postMessage({type:'ACTIVATE_UPDATE'});}}};
})();
