// 딴짓메이트 서비스워커 — 설치형 PWA + 오프라인 셸.
// 네비게이션은 network-first(+오프라인 캐시 폴백), 정적 자산은 cache-first.
// API(/api/*)·외부(Supabase/실시간/애드센스)는 캐시하지 않는다.
const CACHE = 'ddanjit-v1';
const SHELL = ['/', '/solo'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // 외부(Supabase/CDN) 패스
  if (url.pathname.startsWith('/api/')) return; // API 는 캐시하지 않음

  // 네비게이션: network-first, 실패 시 캐시 → 최후엔 홈 셸.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match('/'))),
    );
    return;
  }

  // 정적 자산: cache-first (빌드 산출물·아이콘만 캐시에 채움).
  event.respondWith(
    caches.match(req).then(
      (cached) =>
        cached ||
        fetch(req).then((res) => {
          if (res.ok && (url.pathname.startsWith('/_next/') || url.pathname.startsWith('/icons/'))) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        }),
    ),
  );
});

// 재참여 푸시 수신 → 알림 표시.
self.addEventListener('push', (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    /* 페이로드 없음/비JSON */
  }
  const title = data.title || '딴짓메이트';
  const options = {
    body: data.body || '',
    icon: '/icons/192',
    badge: '/icons/192',
    data: { url: data.url || '/' },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

// 알림 클릭 → 해당 URL 로 포커스/오픈(딥링크).
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const target = event.notification.data && event.notification.data.url ? event.notification.data.url : '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((wins) => {
      const hit = wins.find((w) => w.url.includes(target));
      if (hit) return hit.focus();
      return self.clients.openWindow(target);
    }),
  );
});
