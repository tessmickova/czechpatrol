/**
 * Slepí statický export do jediné HTML stránky, kterou jde publikovat
 * jako náhled. Odkazy v navigaci přepínají sekce, takže náhled je klikací
 * i bez serveru. Slouží jen k posouzení — ostrý web je normální statický
 * export z out/.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = "out";
const STRANKY = [
  ["/", "index.html", "Přehled"],
  ["/dnes/", "dnes/index.html", "Dnes"],
  ["/udalosti/", "udalosti/index.html", "Události"],
  ["/osa/", "osa/index.html", "Časová osa"],
  ["/cr/", "cr/index.html", "ČR"],
  ["/nato/", "nato/index.html", "NATO"],
  ["/trend/", "trend/index.html", "Trend"],
  ["/metodika/", "metodika/index.html", "Metodika"],
  ["/zdroje/", "zdroje/index.html", "Zdroje"],
];

for (const d of fs.readdirSync(path.join(OUT, "incident"))) {
  const p = path.join(OUT, "incident", d, "index.html");
  if (fs.existsSync(p)) STRANKY.push([`/incident/${d}/`, `incident/${d}/index.html`, d]);
}

/** Vrátí celý prvek včetně otevírací značky (a tím i jejích tříd). */
const cely = (html, znacka) => {
  const zac = html.indexOf(`<${znacka}`);
  if (zac < 0) return "";
  const konec = html.lastIndexOf(`</${znacka}>`) + znacka.length + 3;
  return html.slice(zac, konec);
};

const vyrizni = (html, znacka) => {
  const zac = html.indexOf(`<${znacka}`);
  if (zac < 0) return "";
  const otvirak = html.indexOf(">", zac) + 1;
  // Najdi odpovídající uzavírací značku (vnořené stejné značky se tu nevyskytují).
  const konec = html.lastIndexOf(`</${znacka}>`);
  return html.slice(otvirak, konec);
};

const prvni = fs.readFileSync(path.join(OUT, "index.html"), "utf-8");
const css = fs.readFileSync(
  path.join(OUT, "_next/static/css", fs.readdirSync(path.join(OUT, "_next/static/css"))[0]),
  "utf-8",
);

const header = cely(prvni, "header").replace(/<script[\s\S]*?<\/script>/g, "");
const footer = cely(prvni, "footer").replace(/<script[\s\S]*?<\/script>/g, "");
// Pruhy mezi hlavičkou a obsahem (beta + ukázka) jsou mimo <header> i <main>.
const meziPruhy = prvni.slice(prvni.indexOf("</header>") + 9, prvni.indexOf("<main")).replace(/<script[\s\S]*?<\/script>/g, "");

const sekce = STRANKY.map(([cesta, soubor]) => {
  const html = fs.readFileSync(path.join(OUT, soubor), "utf-8");
  // Zbytky běhového kódu Next.js jsou v náhledu k ničemu — pryč s nimi.
  const telo = vyrizni(html, "main").replace(/<script[\s\S]*?<\/script>/g, "");
  return `<section class="nahled-strana" data-cesta="${cesta}" hidden>${telo}</section>`;
}).join("\n");

const stranka = `<title>Bezpečnostní přehled ČR</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
${css}
:root { --font-inter: "Inter"; }
.nahled-strana[hidden] { display: none !important; }
/* Zvýraznění aktivní položky řídí v náhledu aria-current, ne třída z buildu. */
header nav a { background: transparent !important; color: var(--color-tlum) !important; }
header nav a[aria-current="page"] { background: var(--color-linka2) !important; color: var(--color-inkoust) !important; }
</style>

${header}
${meziPruhy}
<main>
${sekce}
</main>
${footer}

<script>
(function () {
  var strany = Array.prototype.slice.call(document.querySelectorAll(".nahled-strana"));
  function zobraz(cesta) {
    var nasel = false;
    strany.forEach(function (s) {
      var shoda = s.dataset.cesta === cesta;
      s.hidden = !shoda;
      if (shoda) nasel = true;
    });
    if (!nasel) { strany[0].hidden = false; cesta = strany[0].dataset.cesta; }
    document.querySelectorAll("a[href]").forEach(function (a) {
      var h = a.getAttribute("href");
      if (h && h.charAt(0) === "/") {
        if (h === cesta) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      }
    });
    window.scrollTo(0, 0);
  }
  document.addEventListener("click", function (e) {
    var a = e.target.closest ? e.target.closest("a[href]") : null;
    if (!a) return;
    var h = a.getAttribute("href");
    if (!h || h.charAt(0) !== "/") return;
    e.preventDefault();
    zobraz(h);
    if (history.replaceState) history.replaceState(null, "", "#" + h);
  });
  zobraz((location.hash || "#/").slice(1) || "/");
})();
</script>`;

fs.writeFileSync("nahled.html", stranka, "utf-8");
console.log("nahled.html:", (stranka.length / 1024 | 0) + " KB, sekcí:", STRANKY.length);
