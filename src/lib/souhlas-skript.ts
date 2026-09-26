/*
  Lišta souhlasu s měřením se rozhoduje před prvním vykreslením (26. 9. 2026).

  Dřív ji ukazoval až React po načtení všech skriptů. Byla to největší věc
  na obrazovce, takže se stala „největším vykresleným prvkem“ (LCP) — a ten
  pak na telefonu vycházel 2,8 s i víc, přestože stránka byla dávno vidět.
  Teď je lišta v HTML a tenhle skript v <head> jen nastaví
  <html data-souhlas="ptat">, když se máme zeptat. CSS ji podle toho ukáže
  (globals.css, .souhlas-lista).
*/
export const KLIC_SOUHLASU = "cp:analytika";

export const SKRIPT_SOUHLASU =
  `try{var d=document.documentElement;` +
  `if(location.pathname.indexOf("/sprava")!==0&&d.dataset.nahled!=="1"){` +
  `var v=localStorage.getItem("${KLIC_SOUHLASU}");` +
  `if(v!=="ano"&&v!=="ne"&&!navigator.globalPrivacyControl)d.dataset.souhlas="ptat";}` +
  `}catch(e){}`;
