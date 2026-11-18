/* Only this site's static learning files enter the offline cache. */
importScripts('./offline-assets.js');
const VERSION=OFFLINE_ASSETS.version;
const CORE='mth028-core-'+VERSION, RESOURCES='mth028-resources-'+OFFLINE_ASSETS.resourceVersion;
const base=self.registration.scope;
const absolute=path=>new URL(path,base).href;
const coreURLs=new Set([...OFFLINE_ASSETS.core,'offline-assets.js',''].map(absolute));
const resourceURLs=new Set(OFFLINE_ASSETS.resources.map(x=>absolute(x.url)));
async function checked(request){
  const response=await fetch(request);
  if(!response.ok||response.redirected||new URL(response.url||request.url||request,base).origin!==new URL(base).origin)throw Error('Resource unavailable');
  const url=new URL(typeof request==='string'?request:request.url,base);
  // An expired platform session may serve a login page instead of a static asset.
  if(!url.pathname.endsWith('.html')&&!url.pathname.endsWith('/')&&/text\/html/i.test(response.headers.get('content-type')||''))throw Error('Sign-in required');
  if(url.pathname.endsWith('/')||url.pathname.endsWith('index.html')){
    if(!(await response.clone().text()).includes('data-course="MTH028"'))throw Error('Not the learning page');
  }
  return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CORE);
  try{
    for(const url of coreURLs)await cache.put(url,await checked(new Request(url,{cache:'reload',credentials:'same-origin'})));
  }catch(error){await caches.delete(CORE);throw error;}
  // Activation is user-triggered when an older version already controls a page.
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  const keys=await caches.keys();
  for(const prefix of ['mth028-core-','mth028-resources-']){
    const older=keys.filter(key=>key.startsWith(prefix));
    for(const key of older.slice(0,-2))await caches.delete(key);
  }
  for(const client of await self.clients.matchAll())client.postMessage({type:'OFFLINE_VERSION',version:VERSION});
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);
  if(url.origin!==self.location.origin)return;
  url.search='';url.hash='';
  const navigation=event.request.mode==='navigate'&&(url.href===base||url.href===absolute('index.html'));
  if(!navigation&&!coreURLs.has(url.href)&&!resourceURLs.has(url.href))return;
  event.respondWith((async()=>{
    const cache=await caches.open(resourceURLs.has(url.href)?RESOURCES:CORE);
    const key=navigation?absolute('index.html'):url.href;
    const cached=await cache.match(key);
    // Versioned app shell always comes from one atomic installation.
    if(cached)return cached;
    try{const response=await checked(event.request);await cache.put(key,response.clone());return response;}
    catch{return new Response('此资料尚未保存到本机。请联网后在「离线使用」中保存全部资料。',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});}
  })());
});
