// Bản Hoan: trang chính lấy bản mới nhất khi có mạng (network-first), mất mạng thì mở bản đã lưu; file phụ dùng bộ nhớ trước
const C = "hoan-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", e => e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k)))).then(() => self.clients.claim())));
self.addEventListener("fetch", e => {
  const u = new URL(e.request.url);
  if (e.request.method !== "GET" || u.origin !== location.origin) return;
  const page = e.request.mode === "navigate" || /\/(index\.html)?$/.test(u.pathname) || /\/vb\//.test(u.pathname);
  e.respondWith(caches.open(C).then(c => {
    const net = fetch(e.request, { cache: "no-cache" }).then(r => { if (r.ok) c.put(e.request, r.clone()); return r; });
    if (page) return net.catch(() => c.match(e.request, { ignoreSearch: true }));
    return c.match(e.request, { ignoreSearch: true }).then(hit => hit || net);
  }));
});
