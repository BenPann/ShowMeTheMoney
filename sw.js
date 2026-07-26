/*
  ===== Service Worker:確保加到主畫面的 App 每次開啟都拿到最新版本 =====

  策略是「network-first」:
  1. 每次開啟 App(導覽請求),先嘗試連網抓最新的 index.html
  2. 抓到就直接用,並且順便把這份最新版存進快取
  3. 只有真的離線抓不到網路時,才退回使用上一次成功快取的版本

  這樣可以避免瀏覽器自己的 HTTP 快取太激進,導致上傳新版到 GitHub Pages 後,
  手機上的 App 卻遲遲抓不到最新內容的問題。
*/

const CACHE_NAME = "ledger-cache-v1";

// 安裝時立刻生效,不用等使用者關掉所有分頁才切換到新版 Service Worker
self.addEventListener("install", () => {
  self.skipWaiting();
});

// 啟用時立刻接管畫面,同樣是為了讓更新盡快生效
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // 只處理「開啟頁面本身」這個請求,其餘不特別攔截,交給瀏覽器預設處理即可
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      try {
        // cache:"no-store" 確保這次 fetch 不會被瀏覽器自己的 HTTP 快取擋掉
        const networkResponse = await fetch(event.request, { cache: "no-store" });
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        // 連網失敗(真的離線)才退回使用快取
        const cached = await caches.match(event.request);
        return cached || new Response("離線中,且沒有快取版本可用", { status: 503 });
      }
    })()
  );
});
