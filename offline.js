// The worker owns downloads, including interrupted transfers. This page displays
// what the worker and the browser's cache can actually serve on this device.
const CalculusOffline = (() => {
  const assets = CalculusOfflineAssets;
  const root = new URL('./', location.href);
  const workerURL = new URL('calculus-sw.js', root).href;
  const coreCache = 'mth026-core-' + assets.version;
  const materialsCache = 'mth026-materials-' + assets.materialVersion;
  const portable = location.protocol === 'file:' ||
    document.body.dataset.portable === 'true' || document.documentElement.dataset.portable === 'true';
  const supported = !portable && 'serviceWorker' in navigator && 'caches' in window;
  const zip = 'https://codeload.github.com/AlexandryAllenFu/learning-mall/zip/refs/tags/MTH026-offline-2026-11-r1';
  const total = assets.materials.length;
  const mb = n => (n / 1048576).toFixed(1) + ' MB';
  const statuses = {
    preparing: '正在准备离线课程',
    ready: '课程与练习已可离线使用',
    incomplete: '离线课程缓存不完整',
    changed: '离线课程版本已更新',
    failed: '离线课程尚未准备好',
    unsupported: '当前浏览器无法保存离线课程'
  };
  const errors = {
    offline: '网络已断开。重新联网后可继续保存。',
    quota: '设备可用空间不足。腾出空间后可继续保存。',
    fetch: '有资料未能保存。请检查网络后继续。',
    busy: '另一项保存任务正在运行。稍后可检查保存情况。',
    timeout: '暂时无法联系离线服务。请重新打开本站并检查保存情况。'
  };
  let registration, status = 'preparing', transfer = 'idle', notice = '', repairing = false;
  let updateRequested = false, verification = 0, done = portable ? total : 0, bytes = portable ? assets.bytes : 0;
  const watched = new WeakSet();

  function controller() {
    const worker = supported && navigator.serviceWorker.controller;
    return worker?.scriptURL === workerURL ? worker : null;
  }

  function request(worker, type, timeout, onProgress) {
    return new Promise((resolve, reject) => {
      const port = new MessageChannel();
      let timer;
      function finish(callback, value) {
        clearTimeout(timer);
        port.port1.close();
        callback(value);
      }
      function armTimer() {
        clearTimeout(timer);
        timer = setTimeout(() => finish(reject, Error('timeout')), timeout);
      }
      port.port1.onmessage = ({data}) => {
        if (data?.type === 'PROGRESS') {
          armTimer();
          onProgress?.(data);
        } else finish(resolve, data);
      };
      port.port1.onmessageerror = () => finish(reject, Error('timeout'));
      armTimer();
      try { worker.postMessage({type}, [port.port2]); }
      catch (error) { finish(reject, error); }
    });
  }

  function cacheURL(path) {
    const url = new URL(path, root);
    url.search = ''; url.hash = '';
    return url.href;
  }
  async function cachedURLs(name, cacheNames) {
    if (!cacheNames.includes(name)) return new Set();
    const cache = await caches.open(name);
    return new Set((await cache.keys()).map(request => request.url));
  }

  function refresh() {
    if (location.hash !== '#offline') return;
    const id = app.contains(document.activeElement) && document.activeElement?.id;
    render();
    if (id) {
      const control = document.getElementById(id);
      (control && !control.disabled ? control : document.getElementById('offline-check'))?.focus({preventScroll:true});
    }
  }
  function updateProgress() {
    const view = document.querySelector('#offline-progress');
    if (!view) return;
    view.querySelector('progress').value = done;
    view.querySelector('span').textContent = progressText();
  }
  function progressText() {
    return '已保存 ' + done + ' / ' + total + ' 个文件 · ' + mb(bytes) + ' / ' + mb(assets.bytes);
  }

  async function verify() {
    if (!supported) return portable;
    const ticket = ++verification, worker = controller();
    try {
      const names = await caches.keys();
      const [info, shell, materials] = await Promise.all([
        worker ? request(worker, 'GET_VERSION', 8000) : null,
        cachedURLs(coreCache, names),
        location.hash === '#offline' ? cachedURLs(materialsCache, names) : null
      ]);
      if (ticket !== verification || controller() !== worker) return false;
      if (materials && transfer === 'idle') {
        const saved = assets.materials.filter(file => materials.has(cacheURL(file.url)));
        done = saved.length;
        bytes = saved.reduce((size, file) => size + file.size, 0);
      }
      if (worker) {
        if (info?.type !== 'VERSION') status = 'failed';
        else if (info.version !== assets.version || info.materialVersion !== assets.materialVersion) status = 'changed';
        else status = shell.has(cacheURL('offline-assets.js')) &&
          assets.core.every(file => shell.has(cacheURL(file.url))) ? 'ready' : 'incomplete';
      }
    } catch {
      if (ticket === verification) status = 'failed';
    }
    if (ticket === verification) refresh();
    return ticket === verification && status === 'ready' && !!worker;
  }

  async function saveMaterials() {
    if (portable || transfer !== 'idle' || repairing || status !== 'ready' || done === total) return;
    const worker = controller();
    if (!worker) return verify();
    transfer = 'saving';
    notice = '';
    refresh();
    try { navigator.storage?.persist?.()?.catch(() => {}); }
    catch { /* The cache can still be used without persistent-storage permission. */ }
    try {
      const result = await request(worker, 'SAVE_MATERIALS', 180000, p => {
        done = p.done;
        bytes = p.bytes;
        updateProgress();
      });
      if (result?.type === 'PAUSED') notice = '已暂停，保存好的文件可以继续使用。';
      else if (result?.type !== 'SAVED') notice = errors[result?.code] || errors.fetch;
    } catch { notice = errors.timeout; }
    finally {
      transfer = 'idle';
      await verify();
    }
  }
  function pause() {
    if (transfer !== 'saving') return;
    const worker = controller();
    if (!worker) return;
    try {
      worker.postMessage({type:'PAUSE_MATERIALS'});
      transfer = 'pausing';
    } catch { notice = errors.timeout; }
    refresh();
  }

  function onControllerChange() {
    if (updateRequested && controller()) return location.reload();
    status = 'preparing';
    verify();
  }
  function watchWorker(worker) {
    if (!worker || watched.has(worker)) return;
    watched.add(worker);
    worker.addEventListener('statechange', () => {
      if (worker.state === 'installed' && updateRequested) worker.postMessage({type:'ACTIVATE_UPDATE'});
      if (worker.state === 'redundant') {
        if (!controller()) status = 'failed';
        if (updateRequested) {
          updateRequested = false;
          notice = '更新未完成，请联网后重试。';
        }
      }
      if (worker.state === 'activated') verify();
      refresh();
    });
  }
  function watchRegistration(reg) {
    if (!reg || reg.scope !== root.href || registration === reg) return;
    registration = reg;
    watchWorker(reg.installing);
    reg.addEventListener('updatefound', () => {
      watchWorker(reg.installing);
      refresh();
    });
  }
  async function init() {
    if (portable) return;
    if (!supported) { status = 'unsupported'; refresh(); return; }
    try {
      const workers = navigator.serviceWorker;
      const saved = await workers.getRegistration(root.href);
      if (saved?.scope === root.href && [saved.active,saved.installing,saved.waiting].some(w => w?.scriptURL === workerURL)) {
        watchRegistration(saved);
        await verify();
      }
      if (!registration?.active || navigator.onLine) {
        watchRegistration(await workers.register(workerURL, {scope:root.href, updateViaCache:'none'}));
      }
      await verify();
    } catch {
      if (controller()) await verify();
      else { status = 'failed'; refresh(); }
    }
  }
  async function retry() {
    if (!supported || repairing || transfer !== 'idle') return;
    repairing = true; notice = ''; refresh();
    try {
      if (status === 'incomplete' && controller()) {
        const result = await request(controller(), 'REPAIR_CORE', 180000);
        if (result?.type !== 'REPAIRED') notice = errors[result?.code] || '恢复课程缓存失败，请联网后重试。';
      } else if (registration) {
        status = 'preparing';
        await registration.update();
      } else await init();
    } catch { notice = '离线课程准备失败，请联网后重试。'; status = 'failed'; }
    finally { repairing = false; await verify(); }
  }
  async function applyUpdate() {
    if (!supported || updateRequested || transfer !== 'idle') return;
    updateRequested = true; refresh();
    try {
      if (!registration?.waiting && status === 'changed' && navigator.onLine) await registration?.update();
      if (registration?.waiting) registration.waiting.postMessage({type:'ACTIVATE_UPDATE'});
      else if (!registration?.installing && status === 'changed' && controller()) location.reload();
      else if (!registration?.installing) { updateRequested = false; await verify(); }
    } catch {
      updateRequested = false;
      notice = '更新还未完成，请联网后重试。';
      refresh();
    }
  }

  function page() {
    const heading = portable ? '正在使用本地离线包' : statuses[status];
    const complete = done === total;
    const waiting = registration?.waiting || status === 'changed';
    return head('', '离线使用', '') +
      `<section class="offline-summary" aria-labelledby="offline-title"><span aria-hidden="true" class="offline-dot ${portable || status === 'ready' ? 'ready' : ''}"></span><div>
      <h2 id="offline-title">${heading}</h2><p>${portable ? '保留整个解压文件夹，通过其中的 index.html 打开课程。' :
      (navigator.onLine ? '当前已联网。' : '当前处于离线状态。') + '课程保存在当前设备的这个浏览器里。'}</p></div></section>
      ${!portable && waiting ? `<div class="callout"><p>有新版本可用。可以完成当前作答后再更新。</p><button id="offline-update" onclick="CalculusOffline.applyUpdate()" ${updateRequested || transfer !== 'idle' ? 'disabled' : ''}>${updateRequested ? '正在更新…' : '更新并重新加载'}</button></div>` : ''}
      <section class="card"><h2>保存全部原题与资料</h2><p>${portable ? '教材、讲义、原题图和完整 PDF 已随离线包保存。' :
      '课程与文字练习会自动准备。要在断网时翻阅教材页图、原题图片和原始 PDF，请另外保存全部资料。'}</p>
      <div id="offline-progress" class="offline-progress"><progress aria-label="资料保存进度" value="${done}" max="${total}"></progress><span>${progressText()}</span></div>
      <p role="status" class="offline-notice ${notice ? 'offline-error' : ''}">${esc(notice || (complete ? '全部资料文件已保存在本机。' : ''))}</p>
      ${portable ? '' : `<div class="actions">
        ${!complete ? `<button class="primary" id="offline-save" onclick="CalculusOffline.saveMaterials()" ${status !== 'ready' || transfer !== 'idle' || repairing || !navigator.onLine ? 'disabled' : ''}>${transfer !== 'idle' ? '正在保存…' : done ? '继续保存资料' : '保存全部资料到本机'}</button>` : ''}
        ${transfer !== 'idle' ? `<button id="offline-pause" onclick="CalculusOffline.pause()" ${transfer === 'pausing' ? 'disabled' : ''}>${transfer === 'pausing' ? '正在暂停…' : '暂停'}</button>` : ''}
        ${['incomplete','failed'].includes(status) ? `<button id="offline-retry" onclick="CalculusOffline.retry()" ${repairing || !navigator.onLine ? 'disabled' : ''}>${repairing ? '正在准备…' : '重新准备离线课程'}</button>` : ''}
        ${supported && transfer === 'idle' ? '<button id="offline-check" onclick="CalculusOffline.verify()">检查保存情况</button>' : ''}
      </div>`}</section>
      ${portable ? '' : `<section class="card"><h2>手机断网使用</h2><ol><li>首次联网打开本站，等待上方显示「课程与练习已可离线使用」。如需从主屏幕启动，先添加到主屏幕，再从图标打开并检查保存情况。</li>
      <li>需要教材或原题时，点「保存全部资料到本机」。可以暂停后继续。断网前，检查所需内容已保存。</li>
      <li>断网后，在同一浏览器或同一主屏幕入口打开原网址。浏览器清理存储后，需要联网重新准备。</li></ol></section>
      <section class="card"><h2>下载完整离线包</h2><p>联网下载 ZIP，解压整个文件夹后打开 index.html，即可在电脑上离线学习。</p>
      <a class="button primary" href="${zip}">下载完整离线 ZIP</a></section>`}
      <p>个人作答和进度保存在本机。换设备或改用离线包时，请到<a href="#settings">进度与备份</a>导出和导入 JSON。自行导入的资料原件请另行保留。打开个人 DDL 或切换到线性代数课程时，请先联网。</p>`;
  }

  const originalRender = render, originalSettings = settingsPage;
  settingsPage = () => '<section class="offline-settings"><a href="#offline">离线使用与完整离线包</a></section>' + originalSettings();
  render = function() {
    const open = location.hash === '#offline';
    if (open) {
      app.innerHTML = page();
      document.querySelectorAll('nav a').forEach(a => { a.classList.remove('active'); a.removeAttribute('aria-current'); });
    } else originalRender();
    const link = document.querySelector('header a[href="#offline"]');
    if (open) link?.setAttribute('aria-current','page'); else link?.removeAttribute('aria-current');
  };
  if (supported) navigator.serviceWorker.addEventListener('controllerchange', onControllerChange);
  window.addEventListener('online', () => { refresh(); if (status === 'failed') init(); });
  window.addEventListener('offline', refresh);
  window.addEventListener('hashchange', () => { if (location.hash === '#offline') verify(); });
  render();
  init();
  return {page, verify, saveMaterials, pause, retry, applyUpdate};
})();
