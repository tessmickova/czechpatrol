/*
  Service worker CzechPatrol.

  Zásada: data nikdy ze staré mezipaměti, když je síť. Stránky se berou
  nejdřív ze sítě a kopie se uloží jen pro případ výpadku; hashované soubory
  buildu (_next/static) se naopak berou z mezipaměti rovnou, protože se
  s každou změnou přejmenují.
*/
// Změna verze = nová mezipaměť. Stará se smaže při aktivaci a stránka
// dostane zprávu, ať nabídne obnovení — nikdy nepřepínáme obsah potichu.
const VERZE = "cp-v4"; // v4 (30. 9. 2026): pryč z mezipaměti chybové a přesměrované odpovědi
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
            // Ukládá se jen úspěšná odpověď — 404 z doby nasazení by jinak zůstala „navždy“.
            if (odpoved.ok) {
              const kopie = odpoved.clone();
              caches.open(VERZE).then((c) => c.put(request, kopie));
            }
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
          /*
            Přesměrovanou odpověď Chrome u navigace odmítne jako síťovou
            chybu — prohlížeč proto pošleme na cílovou adresu. Do mezipaměti
            jde jen úspěšná a nepřesměrovaná stránka (30. 9. 2026).
          */
          if (odpoved.redirected) return Response.redirect(odpoved.url, 301);
          if (odpoved.ok) {
            const kopie = odpoved.clone();
            caches.open(VERZE).then((c) => c.put(request, kopie));
          }
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

/*
  Upozornění do telefonu (29. 9. 2026, api/src/push.ts). Zpráva přijde
  zašifrovaná, prohlížeč ji rozbalí a tady se jen ukáže. Klepnutí otevře
  web — jen na naší adrese, nikam jinam.
*/
self.addEventListener("push", (u) => {
  let d = {};
  try { d = u.data ? u.data.json() : {}; } catch { d = { b: u.data ? u.data.text() : "" }; }
  const cesta = typeof d.u === "string" && d.u.startsWith("/") && !d.u.startsWith("//") ? d.u : "/";
  u.waitUntil(
    self.registration.showNotification(String(d.t || "CzechPatrol").slice(0, 120), {
      body: String(d.b || "").slice(0, 300),
      icon: "/ikona-192.png",
      tag: typeof d.tag === "string" ? d.tag : undefined,
      lang: "cs",
      data: { cesta },
    }),
  );
});

self.addEventListener("notificationclick", (u) => {
  u.notification.close();
  const cil = new URL((u.notification.data && u.notification.data.cesta) || "/", self.location.origin).href;
  u.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((okna) => {
      for (const o of okna) {
        if (new URL(o.url).origin === self.location.origin && "focus" in o) {
          return o.focus().then((f) => (f && "navigate" in f ? f.navigate(cil) : f));
        }
      }
      return self.clients.openWindow(cil);
    }),
  );
});
