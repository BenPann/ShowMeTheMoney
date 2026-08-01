/*
  ===== Service Worker:手動更新策略 =====

  策略改成「cache-first」:
  1. 平常開啟 App,一律優先使用快取裡的版本,不會主動連網比對、不會有額外的網路延遲
  2. 只有快取裡完全沒有東西時(例如第一次造訪),才會連網抓一次並存進快取
  3. 之後要更新版本,必須透過 App 內「設定 → App 版本 → 立即更新」按鈕主動觸發,
     由 App 自己的程式碼把新版寫回這裡用的同一個快取(CACHE_NAME 要跟 App 裡寫的一致)

  這樣平常開啟速度不會被「每次都要連網」拖慢,但也保留了「需要時可以手動更新」的彈性。
*/

const CACHE_NAME = "ledger-cache-v1";

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // 只處理「開啟頁面本身」這個請求,其餘不特別攔截,交給瀏覽器預設處理即可
  if (event.request.mode !== "navigate") return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request);
      if (cached) return cached;

      // 快取裡沒有東西(通常只有第一次造訪會發生),才連網抓一次並存進快取
      try {
        const networkResponse = await fetch(event.request);
        const cache = await caches.open(CACHE_NAME);
        cache.put(event.request, networkResponse.clone());
        return networkResponse;
      } catch (err) {
        return new Response("離線中,且沒有快取版本可用", { status: 503 });
      }
    })()
  );
});
