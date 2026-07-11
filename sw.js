/* OPIc AL 부스 — Service Worker
   버전을 올리면(예: v1 → v2) 사용자 기기에서 캐시가 갱신돼. */
const CACHE = 'opic-al-v1';

/* 여기 파일명은 실제 GitHub에 올린 메인 HTML 이름과 같아야 해.
   메인 파일을 index.html로 올렸다면 './' 만으로 충분해. */
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(ASSETS).catch(() => {})).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

/* 네트워크 우선, 실패하면 캐시 (오프라인 대응).
   외부 요청(폰트, 유튜브 등)은 그냥 통과시킴. */
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return; // 외부 리소스는 건드리지 않음
  e.respondWith(
    fetch(req)
      .then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      })
      .catch(() => caches.match(req).then(r => r || caches.match('./index.html')))
  );
});
