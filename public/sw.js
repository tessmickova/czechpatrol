/*
  Service worker CzechPatrol.

  Zásada: data nikdy ze staré mezipaměti, když je síť. Stránky se berou
  nejdřív ze sítě a kopie se uloží jen pro případ výpadku; hashované soubory
  buildu (_next/static) se naopak berou z mezipaměti rovnou, protože se
  s každou změnou přejmenují.
*/
// Změna verze = nová mezipaměť. Stará se smaže při aktivaci a stránka
// dostane zprávu, ať nabídne obnovení — nikdy nepřepínáme obsah potichu.
const VERZE = "cp-v3";
const SKORAPKA = ["/", "/offline/", "/manifest.webmanifest", "/ikona-192.png"];

self.addEventListener("install", (u) => {
  u.waitUntil(
    caches.open(VERZE).then((c) => c.addAll(SKORAPKA)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (u) => {
  u.waitUntil(
    caches
      .keys()
      .then((klice) => Promise.all(klice.filter((k) => k !== VERZE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() => self.clients.matchAll({ type: "window" }))
      .then((okna) => { for (const o of okna) o.postMessage({ typ: "nova-verze", verze: VERZE }); }),
  );
});

self.addEventListener("message", (u) => {
  if (u.data && u.data.typ === "aktivuj") self.skipWaiting();
});

self.addEventListener("fetch", (u) => {
  const { request } = u;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Snímek Rychlého přehledu jde vždy rovnou na síť a nikam se neukládá:
  // kopie z cache by po výpadku sběru vypadala jako čerstvá odpověď.
  if (url.pathname === "/prehled.json") return;

  if (url.pathname.startsWith("/_next/static/")) {
    u.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ||
          fetch(request).then((odpoved) => {
            const kopie = odpoved.clone();
            caches.open(VERZE).then((c) => c.put(request, kopie));
            return odpoved;
          }),
      ),
    );
    return;
  }

  if (request.mode === "navigate" || request.headers.get("accept")?.includes("text/html")) {
    // Schválně přes adresu a s „no-cache“: kdybychom pustili původní
    // požadavek, mohl by ho vyřídit HTTP cache prohlížeče starou kopií
    // stránky — a ta by odkazovala na staré soubory buildu.
    u.respondWith(
      fetch(request.url, { cache: "no-cache", credentials: "same-origin" })
        .then((odpoved) => {
          const kopie = odpoved.clone();
          caches.open(VERZE).then((c) => c.put(request, kopie));
          return odpoved;
        })
        .catch(() => caches.match(request).then((hit) => hit || caches.match("/offline/"))),
    );
    return;
  }

  u.respondWith(
    fetch(request)
      .then((odpoved) => {
        if (odpoved.ok) {
          const kopie = odpoved.clone();
          caches.open(VERZE).then((c) => c.put(request, kopie));
        }
        return odpoved;
      })
      .catch(() => caches.match(request)),
  );
});
