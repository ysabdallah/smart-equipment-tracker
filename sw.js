// نسخة ذاكرة التخزين المؤقت — تتغيّر تلقائيًا مع أي تحديث للصفحة حتى لا يبقى المستخدم على نسخة قديمة
const CACHE_NAME = 'oh-smart-equipment-230f96bca0';
const APP_SHELL = ['./', './index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if(req.method !== 'GET') return; // لا نتدخل أبدًا في طلبات الحفظ (POST) الخاصة بقاعدة البيانات

  let url;
  try{ url = new URL(req.url); }catch(e){ return; }

  // لا نخزّن مطلقًا استدعاءات قاعدة البيانات الحية (Google Sheets API)
  if(url.hostname.indexOf('script.google.com') !== -1) return;

  const isSameOrigin = url.origin === self.location.origin;

  if(req.mode === 'navigate' || isSameOrigin){
    // شكل التطبيق نفسه: نعرض النسخة المخزّنة فورًا (سريع + يعمل بدون إنترنت)، ونحدّثها في الخلفية
    event.respondWith(
      caches.match(req).then(cached => {
        const fetchPromise = fetch(req).then(res => {
          if(res && res.ok){
            const clone = res.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
          }
          return res;
        }).catch(() => cached);
        return cached || fetchPromise;
      })
    );
    return;
  }

  // ملفات خارجية (خطوط، مكتبة إكسل): نحاول الشبكة أولًا، وإن فشلت نستخدم النسخة المخزّنة
  event.respondWith(
    fetch(req).then(res => {
      if(res && res.ok){
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, clone));
      }
      return res;
    }).catch(() => caches.match(req))
  );
});
