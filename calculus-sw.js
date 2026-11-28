/* Only MTH026 files explicitly listed in its manifest enter these caches. */
importScripts('./offline-assets.js');

const assets = globalThis.CalculusOfflineAssets;
const root = self.registration.scope;
const absolute = path => new URL(path, root).href;
const index = absolute('index.html');
const manifestURL = absolute('offline-assets.js');
const coreName = 'mth026-core-' + assets.version;
const materialsName = 'mth026-materials-' + assets.materialVersion;
const core = new Set([...assets.core.map(file => absolute(file.url)), manifestURL]);
const materials = new Set(assets.materials.map(file => absolute(file.url)));
const manifestResponse = () => new Response('globalThis.CalculusOfflineAssets = ' + JSON.stringify(assets) + ';\n', {
  headers: {'Content-Type':'text/javascript; charset=utf-8'}
});

let preparation, download;

async function fetchStatic(file, signal) {
  const url = absolute(file.url);
  const response = await fetch(url, {cache:'no-store', credentials:'same-origin', redirect:'error', signal});
  if (response.status !== 200 || response.url !== url || !response.body) throw new Error('Invalid static response');
  if (file.url !== 'index.html' && /text\/html|application\/xhtml/i.test(response.headers.get('Content-Type') || '')) {
    throw new Error('Unexpected HTML response');
  }
  return response;
}

async function prepareCore() {
  if (preparation) return preparation;
  preparation = (async () => {
    const cache = await caches.open(coreName);
    for (const file of assets.core) {
      const url = absolute(file.url);
      if (await cache.match(url)) continue;
      const response = await fetchStatic(file);
      const buffer = await response.arrayBuffer();
      if (buffer.byteLength !== file.size) throw new Error('Incomplete app file');
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      const hex = Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
      if (hex !== file.sha256) throw new Error('App release is still being deployed');
      const headers = new Headers(response.headers);
      headers.delete('Content-Encoding');
      headers.set('Content-Length', String(buffer.byteLength));
      await cache.put(url, new Response(buffer, {headers}));
    }
    await cache.put(manifestURL, manifestResponse());
  })().finally(() => { preparation = null; });
  return preparation;
}

async function prune(prefix, current) {
  const previous = (await caches.keys()).filter(name => name.startsWith(prefix) && name !== current);
  await Promise.all(previous.slice(0, -1).map(name => caches.delete(name)));
}

self.addEventListener('install', event => {
  event.waitUntil(prepareCore().catch(async error => {
    await caches.delete(coreName);
    throw error;
  }));
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    await Promise.allSettled([prune('mth026-core-', coreName), prune('mth026-materials-', materialsName)]);
    await self.clients.claim();
  })());
});

async function saveMaterial(cache, file, signal) {
  const response = await fetchStatic(file, signal);
  let size = 0;
  const stream = response.body.pipeThrough(new TransformStream({
    transform(chunk, controller) {
      size += chunk.byteLength;
      if (size > file.size) throw new Error('Material size changed');
      controller.enqueue(chunk);
    },
    flush() {
      if (size !== file.size) throw new Error('Incomplete material');
    }
  }));
  const headers = new Headers(response.headers);
  headers.delete('Content-Encoding');
  headers.set('Content-Length', String(file.size));
  await cache.put(absolute(file.url), new Response(stream, {headers}));
}

function failureCode(error) {
  return error?.name === 'QuotaExceededError' ? 'quota' : navigator.onLine === false ? 'offline' : 'fetch';
}

async function saveAll(job) {
  const {port, controller} = job;
  let final = {type:'SAVED'};
  try {
    const cache = await caches.open(materialsName);
    const present = new Set((await cache.keys()).map(request => request.url));
    const missing = [];
    let done = 0, bytes = 0, cursor = 0, firstError = null;
    for (const file of assets.materials) {
      if (!present.has(absolute(file.url))) { missing.push(file); continue; }
      done++;
      bytes += file.size;
    }
    port.postMessage({type:'PROGRESS', done, bytes});
    const saveNext = async () => {
      while (!controller.signal.aborted && cursor < missing.length) {
        const file = missing[cursor++];
        try {
          await saveMaterial(cache, file, controller.signal);
          port.postMessage({type:'PROGRESS', done:++done, bytes:bytes+=file.size});
        } catch (error) {
          if (!controller.signal.aborted) {
            firstError = error;
            controller.abort();
          }
        }
      }
    };
    await Promise.all(Array.from({length:4}, saveNext));
    if (firstError) final = {type:'FAILED', code:failureCode(firstError)};
    else if (job.paused) final = {type:'PAUSED'};
  } catch (error) {
    final = {type:'FAILED', code:failureCode(error)};
  } finally {
    download = null;
    port.postMessage(final);
    port.close();
  }
}

self.addEventListener('message', event => {
  const port = event.ports[0];
  switch (event.data?.type) {
    case 'GET_VERSION':
      if (port) {
        port.postMessage({type:'VERSION', version:assets.version, materialVersion:assets.materialVersion});
        port.close();
      }
      break;
    case 'ACTIVATE_UPDATE':
      event.waitUntil(self.skipWaiting());
      break;
    case 'REPAIR_CORE':
      if (port) event.waitUntil((async () => {
        try { await prepareCore(); port.postMessage({type:'REPAIRED'}); }
        catch (error) { port.postMessage({type:'FAILED', code:failureCode(error)}); }
        finally { port.close(); }
      })());
      break;
    case 'SAVE_MATERIALS':
      if (!port) break;
      if (download) {
        port.postMessage({type:'FAILED', code:'busy'});
        port.close();
        break;
      }
      download = {port, client:event.source?.id, controller:new AbortController(), paused:false};
      event.waitUntil(saveAll(download));
      break;
    case 'PAUSE_MATERIALS':
      if (download && download.client === event.source?.id) {
        download.paused = true;
        download.controller.abort();
      }
      break;
  }
});

async function rangeResponse(request, response) {
  const range = request.headers.get('Range')?.match(/^bytes=(\d*)-(\d*)$/i);
  if (!range || (!range[1] && !range[2])) return response;
  const ifRange = request.headers.get('If-Range');
  if (ifRange && ![response.headers.get('ETag'), response.headers.get('Last-Modified')].includes(ifRange)) return response;
  const blob = await response.blob();
  const size = blob.size;
  const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
  const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
  if (start >= size || start > end) return new Response(null, {
    status:416, headers:{'Content-Range':'bytes */' + size}
  });
  return new Response(blob.slice(start, end + 1), {
    status:206,
    headers: {
      'Accept-Ranges':'bytes',
      'Content-Range':'bytes ' + start + '-' + end + '/' + size,
      'Content-Length':String(end - start + 1),
      'Content-Type':response.headers.get('Content-Type') || 'application/octet-stream'
    }
  });
}

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  url.search = '';
  const navigation = request.mode === 'navigate';
  if (navigation && url.href === root) url.href = index;
  const material = materials.has(url.href);
  if (!core.has(url.href) && !material) return;
  // A resource that belongs to algebra or DDL will fall through to its own worker/network.
  event.respondWith((async () => {
    try {
      const cache = await caches.open(material ? materialsName : coreName);
      const saved = await cache.match(url.href);
      if (saved) return material ? await rangeResponse(request, saved) : saved;
    } catch { /* A blocked or evicted cache must still allow online access. */ }
    try { return await fetch(request); }
    catch {
      return new Response('请联网后打开 MTH026 的「离线使用」，保存未缓存的资料。', {
        status:503, headers:{'Content-Type':'text/plain; charset=utf-8'}
      });
    }
  })());
});
