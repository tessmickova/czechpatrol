/**
 * Doména czechpatrol.cz na Cloudflare — nastavení přes API, opakovatelně.
 *
 *   node nastroje/domena.mjs          provede, co chybí, a zapíše stav
 *   node nastroje/domena.mjs --sucho  jen vypíše, co by udělal; nic nemění
 *
 * Potřebuje CLOUDFLARE_API_TOKEN a CLOUDFLARE_ACCOUNT_ID. Spouští ho workflow
 * „Doména" (.github/workflows/domena.yml), kde obojí je v secrets.
 *
 * Proč to existuje
 * ----------------
 * 22. 9. 2026 se doména převedla na Cloudflare: zóna je založená a u
 * registrátora zadané nameservery Cloudflare. Zbytek — záznamy DNS na projekt
 * Pages, vlastní doména projektu, HTTPS, přesměrování www — je klikání
 * v dashboardu, které by nikdo nezapsal a při příští změně by se dělalo znovu
 * z hlavy. Tady je to zapsané jako kód a dá se pustit znovu.
 *
 * Token ke Cloudflare je jen v GitHub secrets; sandbox Claude ani rutiny na
 * něj nedosáhnou a nemají. Skript proto běží na GitHub Actions a výsledek
 * zapíše do data/fronta/domena.json, odkud si ho kdokoli přečte z gitu bez
 * sítě — stejný vzor jako „Stav pro routines".
 *
 * Co nikdy nedělá
 * ---------------
 * Nemaže nic, co nezná. Odstraní jen to, co stojí webu v cestě: záznamy na
 * czechpatrol.cz a www, které neukazují na projekt Pages (parkovací stránka
 * Forpsi, kterou si Cloudflare při založení zóny naimportoval), a hvězdičkový
 * CNAME z téhož importu. Každé smazání vypíše i s obsahem, aby šlo vrátit.
 * MX, TXT a ostatní poddomény nechává být: pošta na doméně je otázka pro
 * člověka, ne pro skript.
 *
 * Když tokenu chybí právo, krok přeskočí, napíše které, a pokračuje dál.
 * Co už je nastavené, pozná a nedělá podruhé.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const koren = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SOUBOR = path.join(koren, "data", "fronta", "domena.json");

export const DOMENA = "czechpatrol.cz";
export const WWW = `www.${DOMENA}`;
/** Projekt Cloudflare Pages a jeho výchozí adresa; na ni doména míří. */
export const PROJEKT = "czechpatrol";
export const CIL = `${PROJEKT}.pages.dev`;
const API = "https://api.cloudflare.com/client/v4";

/** Nastavení zóny, která se zapínají, a proč. */
const NASTAVENI_ZONY = [
  ["ssl", "strict", "šifrování až k Pages, s ověřením certifikátu"],
  ["always_use_https", "on", "http:// se přesměruje na https://"],
  ["automatic_https_rewrites", "on", "odkazy na http:// uvnitř stránek se přepíší"],
  ["min_tls_version", "1.2", "starší TLS se nepřijímá"],
];

/** Pravidlo přesměrování www na holou doménu. Poznává se podle popisu. */
export const PRAVIDLO_WWW = {
  description: `www na ${DOMENA}`,
  expression: `(http.host eq "${WWW}")`,
  action: "redirect",
  action_parameters: {
    from_value: {
      status_code: 301,
      target_url: { expression: `concat("https://${DOMENA}", http.request.uri.path)` },
      preserve_query_string: true,
    },
  },
  enabled: true,
};

const bezTecky = (s) => String(s ?? "").toLowerCase().replace(/\.$/, "");

/**
 * Co se záznamy DNS: které smazat, které založit, které nechat být.
 *
 * Čistá funkce bez sítě, aby ji hlídal test. Maže se jen to, co stojí webu
 * v cestě (adresní záznamy A, AAAA a CNAME na holé doméně a www, které
 * neukazují na projekt Pages), a hvězdičkový CNAME z importu od Forpsi.
 * Všechno ostatní — pošta, TXT, cizí poddomény — se nechává.
 */
export function rozhodniDns(zaznamy, { domena = DOMENA, www = WWW, cil = CIL } = {}) {
  const jmeno = (z) => bezTecky(z.name);
  const naPages = (z) => z.type === "CNAME" && bezTecky(z.content) === cil;
  /* Jen adresní záznamy si s CNAME na Pages překážejí. MX nebo TXT na holé doméně vedle něj stát smějí. */
  const ADRESNI = new Set(["A", "AAAA", "CNAME"]);
  const smazat = [];
  const ponechat = [];
  for (const z of zaznamy) {
    const j = jmeno(z);
    if ((j === domena || j === www) && ADRESNI.has(z.type) && !naPages(z)) smazat.push(z);
    else if (j === `*.${domena}` && z.type === "CNAME" && bezTecky(z.content) === domena) smazat.push(z);
    else ponechat.push(z);
  }
  const zalozit = [domena, www]
    .filter((j) => !zaznamy.some((z) => jmeno(z) === j && naPages(z)))
    .map((j) => ({ type: "CNAME", name: j, content: cil, proxied: true, ttl: 1, comment: "Web na Cloudflare Pages — nastroje/domena.mjs" }));
  return { smazat, zalozit, ponechat };
}

/** Lidsky čitelný souhrn: co je hotové a co zbývá. Čistá funkce, hlídá ji test. */
export function shrnuti(stav) {
  const radky = [];
  const z = stav.zona;
  if (!z?.nalezena) {
    radky.push(`Zóna ${stav.domena} se v účtu Cloudflare nenašla — buď tam není (založit: dash.cloudflare.com → Add a site), nebo ji token nesmí číst (u seznamu zón Cloudflare nevrací chybu, jen prázdný výsledek; právo Zone · Zone · Read).`);
  } else if (z.stav !== "active") {
    radky.push(`Doména zatím míří na původní DNS (${z.puvodniNameservery?.length ? z.puvodniNameservery.join(", ") : "neznámé"}). U registrátora musí být zadané nameservery Cloudflare: ${z.nameserveryCloudflare.join(" a ")}. Cloudflare přepnutí pozná sám, obvykle do hodiny; zóna pak bude „active".`);
  } else {
    radky.push(`Zóna je aktivní, DNS domény ${stav.domena} řídí Cloudflare.`);
  }
  if (stav.dns) {
    if (stav.dns.odstraneno.length) radky.push(`Odstraněné záznamy (stály webu v cestě): ${stav.dns.odstraneno.map((r) => `${r.typ} ${r.jmeno} → ${r.obsah}`).join("; ")}.`);
    if (stav.dns.zalozeno.length) radky.push(`Založené záznamy: ${stav.dns.zalozeno.map((r) => `${r.typ} ${r.jmeno} → ${r.obsah}`).join("; ")}.`);
    if (stav.dns.chyby.length) radky.push(`DNS chyby: ${stav.dns.chyby.join("; ")}.`);
  }
  if (stav.pages) {
    const cekaji = stav.pages.domeny.filter((d) => d.stav !== "active");
    if (stav.pages.chyby.length) radky.push(`Pages chyby: ${stav.pages.chyby.join("; ")}.`);
    if (cekaji.length) radky.push(`Vlastní domény projektu Pages čekají: ${cekaji.map((d) => `${d.jmeno} (${d.stav ?? "neznámý stav"})`).join(", ")}. Aktivují se samy, jakmile bude zóna aktivní a záznamy DNS na místě.`);
    else if (stav.pages.domeny.length) radky.push(`Web běží na https://${stav.domena}. Zbývá přepnout adresy v kódu a v rutinách (docs/PROVOZ.md, část Doména).`);
  }
  if (stav.presmerovaniWww && stav.presmerovaniWww !== "nastaveno") radky.push(`Přesměrování www: ${stav.presmerovaniWww}.`);
  if (stav.web) {
    const w = stav.web;
    if (w.http === 200 && w.commit) radky.push(`Web na https://${stav.domena} odpovídá (commit ${w.commit.slice(0, 7)}).`);
    else if (w.http === 200) radky.push(`Na https://${stav.domena} odpovídá něco jiného než web (HTTP 200, ale bez stav.json) — nejspíš ještě parkovací stránka; záznamy DNS a aktivace v Pages se projeví za pár minut.`);
    else radky.push(`Web na https://${stav.domena} zatím neodpovídá (${w.http ? `HTTP ${w.http}` : w.chyba ?? "bez odpovědi"}); certifikát a aktivace domény v Pages ještě mohou běžet, spustit znovu za pár minut.`);
    if (w.www?.http === 200 && w.www.konecnaAdresa && !w.www.konecnaAdresa.startsWith(`https://${stav.domena}/`)) radky.push(`www zatím nepřesměrovává na holou doménu (skončí na ${w.www.konecnaAdresa}).`);
  }
  if (stav.chybejiciPrava.length) radky.push(`Tokenu CLOUDFLARE_API_TOKEN chybí práva: ${stav.chybejiciPrava.join("; ")}. Doplnit v Cloudflare → My Profile → API Tokens → Edit (u práv zóny vybrat czechpatrol.cz) a spustit znovu.`);
  return radky;
}

const kratce = (z) => ({ typ: z.type, jmeno: z.name, obsah: z.content, proxy: Boolean(z.proxied) });

/**
 * Odpovídá na doméně opravdu web? Ptá se toho, co uvidí čtenář, ne Cloudflare
 * API: stáhne stav.json z domény a z www. Z běžce GitHubu, kde doména není
 * blokovaná; ze sandboxu by tenhle krok nešel.
 */
export async function overWeb(domena = DOMENA, www = WWW) {
  const vysledek = { adresa: `https://${domena}/stav.json`, http: 0, commit: null, generovano: null, chyba: null, www: { http: 0, konecnaAdresa: null, chyba: null } };
  try {
    const r = await fetch(vysledek.adresa, { redirect: "follow", signal: AbortSignal.timeout(20_000), headers: { Accept: "application/json" } });
    vysledek.http = r.status;
    if (r.ok) {
      const data = await r.json().catch(() => null);
      vysledek.commit = data?.commit ?? null;
      vysledek.generovano = data?.generovano ?? null;
    }
  } catch (e) {
    vysledek.chyba = e instanceof Error ? e.message : String(e);
  }
  try {
    const r = await fetch(`https://${www}/`, { redirect: "follow", signal: AbortSignal.timeout(20_000) });
    vysledek.www.http = r.status;
    vysledek.www.konecnaAdresa = r.url;
  } catch (e) {
    vysledek.www.chyba = e instanceof Error ? e.message : String(e);
  }
  return vysledek;
}

function klient(token) {
  return async (metoda, cesta, telo) => {
    const r = await fetch(`${API}${cesta}`, {
      method: metoda,
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json", Accept: "application/json" },
      body: telo === undefined ? undefined : JSON.stringify(telo),
    });
    let data = null;
    try {
      data = await r.json();
    } catch {
      /* prázdná nebo ne-JSON odpověď; stačí stavový kód */
    }
    return {
      ok: r.ok && data?.success !== false,
      http: r.status,
      vysledek: data?.result ?? null,
      chyby: (data?.errors ?? []).map((e) => `${e.code}: ${e.message}`),
      /* 401 a 403 = token to nesmí. Cloudflare u chybějícího práva vrací 403 a kód 10000. */
      chybiPravo: r.status === 401 || r.status === 403,
    };
  };
}

function dokonci(stav, sucho) {
  stav.poznamka = shrnuti(stav).join(" ");
  stav.vysvetleni = "Zapsáno workflow Doména (nastroje/domena.mjs). Rutiny a session tenhle soubor jen čtou; na Cloudflare API ze sandboxu nedosáhnou. Nejnovější stav dá nový běh workflow.";
  console.log("\n[doména] souhrn:");
  for (const r of shrnuti(stav)) console.log(`  - ${r}`);
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `## Doména ${stav.domena}\n\n${shrnuti(stav).map((r) => `- ${r}`).join("\n")}\n`);
  }
  if (sucho) {
    console.log("\n[doména] nasucho — nic se nezapsalo.");
    return;
  }
  fs.mkdirSync(path.dirname(SOUBOR), { recursive: true });
  fs.writeFileSync(SOUBOR, `${JSON.stringify(stav, null, 2)}\n`);
  console.log(`\n[doména] stav zapsán do ${path.relative(koren, SOUBOR)}`);
}

async function main() {
  const sucho = process.argv.includes("--sucho");
  const token = process.env.CLOUDFLARE_API_TOKEN;
  const ucet = process.env.CLOUDFLARE_ACCOUNT_ID;
  if (!token || !ucet) {
    console.error("[doména] chybí CLOUDFLARE_API_TOKEN nebo CLOUDFLARE_ACCOUNT_ID — skript běží ve workflow Doména, kde obojí je.");
    process.exit(1);
  }
  const cf = klient(token);
  const stav = {
    kontrolovano: new Date().toISOString(),
    domena: DOMENA,
    cil: CIL,
    nasucho: sucho,
    zona: null,
    dns: null,
    pages: null,
    https: null,
    presmerovaniWww: null,
    web: null,
    chybejiciPrava: [],
    kroky: [],
  };
  const krok = (co, text) => {
    stav.kroky.push({ krok: co, text });
    console.log(`[doména] ${co}: ${text}`);
  };
  const pravo = (jake, kCemu) => {
    if (!stav.chybejiciPrava.includes(jake)) stav.chybejiciPrava.push(jake);
    krok("právo", `token nesmí ${kCemu} — chybí ${jake}`);
    if (process.env.GITHUB_ACTIONS) console.log(`::warning::Tokenu CLOUDFLARE_API_TOKEN chybí právo ${jake} (${kCemu}).`);
  };

  /* 1. Zóna: existuje, je aktivní, jaké má nameservery? */
  const z = await cf("GET", `/zones?name=${DOMENA}`);
  if (z.chybiPravo) pravo("Zone · Zone · Read", "přečíst zónu");
  const zona = z.ok ? z.vysledek?.[0] : null;
  if (!zona) {
    stav.zona = { nalezena: false };
    krok("zóna", `zóna ${DOMENA} se nenašla${z.chyby.length ? ` (${z.chyby.join("; ")})` : ""}; bez ní se nedá pokračovat`);
    return dokonci(stav, sucho);
  }
  stav.zona = {
    nalezena: true,
    stav: zona.status,
    nameserveryCloudflare: zona.name_servers ?? [],
    puvodniNameservery: zona.original_name_servers ?? [],
    registrator: zona.original_registrar ?? null,
    puvodniDnsHost: zona.original_dnshost ?? null,
    zalozeno: zona.created_on ?? null,
    aktivovano: zona.activated_on ?? null,
  };
  krok("zóna", `${zona.status}; nameservery Cloudflare: ${stav.zona.nameserveryCloudflare.join(", ") || "žádné"}; původní: ${stav.zona.puvodniNameservery.join(", ") || "neznámé"}`);
  /* Zóna čeká na nameservery: požádat o novou kontrolu. Příliš brzy po minulé, nebo bez práva, to Cloudflare odmítne a nic se neděje. */
  if (zona.status !== "active" && !sucho) {
    const a = await cf("PUT", `/zones/${zona.id}/activation_check`);
    krok("kontrola nameserverů", a.ok ? "Cloudflare je ověří znovu" : `neproběhla (${a.chyby.join("; ") || `HTTP ${a.http}`})`);
  }

  /* 2. Záznamy DNS: pryč s parkováním, CNAME na projekt Pages. */
  const d = await cf("GET", `/zones/${zona.id}/dns_records?per_page=500`);
  if (d.chybiPravo) pravo("Zone · DNS · Edit", "číst a měnit záznamy DNS");
  else if (!d.ok) krok("dns", `záznamy se nepodařilo přečíst: ${d.chyby.join("; ") || `HTTP ${d.http}`}`);
  else {
    const { smazat, zalozit, ponechat } = rozhodniDns(d.vysledek ?? []);
    const dns = { odstraneno: [], zalozeno: [], ponechano: ponechat.map(kratce), chyby: [] };
    krok("dns", `záznamů ${d.vysledek.length}: smazat ${smazat.length}, založit ${zalozit.length}, nechat ${ponechat.length}`);
    for (const r of smazat) {
      krok("dns", `${sucho ? "smazal by" : "mažu"} ${r.type} ${r.name} → ${r.content}`);
      if (sucho) continue;
      const o = await cf("DELETE", `/zones/${zona.id}/dns_records/${r.id}`);
      if (o.chybiPravo) {
        pravo("Zone · DNS · Edit", "mazat záznamy DNS");
        break;
      }
      if (o.ok) dns.odstraneno.push(kratce(r));
      else dns.chyby.push(`smazání ${r.type} ${r.name}: ${o.chyby.join("; ") || `HTTP ${o.http}`}`);
    }
    for (const r of zalozit) {
      krok("dns", `${sucho ? "založil by" : "zakládám"} ${r.type} ${r.name} → ${r.content} (proxy)`);
      if (sucho) continue;
      const o = await cf("POST", `/zones/${zona.id}/dns_records`, r);
      if (o.chybiPravo) {
        pravo("Zone · DNS · Edit", "zakládat záznamy DNS");
        break;
      }
      if (o.ok) dns.zalozeno.push(kratce(r));
      else dns.chyby.push(`založení ${r.type} ${r.name}: ${o.chyby.join("; ") || `HTTP ${o.http}`}`);
    }
    stav.dns = dns;
  }

  /* 3. Vlastní domény projektu Pages. */
  const cestaDomen = `/accounts/${ucet}/pages/projects/${PROJEKT}/domains`;
  const p = await cf("GET", cestaDomen);
  if (p.chybiPravo) pravo("Account · Cloudflare Pages · Edit", "spravovat vlastní domény projektu Pages");
  else if (!p.ok) krok("pages", `domény projektu se nepodařilo přečíst: ${p.chyby.join("; ") || `HTTP ${p.http}`}`);
  else {
    const existujici = new Map((p.vysledek ?? []).map((x) => [bezTecky(x.name), x]));
    const pages = { domeny: [], pridano: [], chyby: [] };
    for (const jmeno of [DOMENA, WWW]) {
      let dom = existujici.get(jmeno);
      if (!dom) {
        krok("pages", `${sucho ? "přidal by" : "přidávám"} vlastní doménu ${jmeno}`);
        if (sucho) continue;
        const o = await cf("POST", cestaDomen, { name: jmeno });
        if (o.chybiPravo) {
          pravo("Account · Cloudflare Pages · Edit", "přidávat vlastní domény projektu Pages");
          break;
        }
        if (!o.ok) {
          pages.chyby.push(`${jmeno}: ${o.chyby.join("; ") || `HTTP ${o.http}`}`);
          continue;
        }
        dom = o.vysledek ?? { name: jmeno, status: "initializing" };
        pages.pridano.push(jmeno);
      } else if (dom.status !== "active" && !sucho) {
        /* Zadaná, ale neaktivní: říct Cloudflare, ať ověření zkusí znovu. */
        const o = await cf("PATCH", `${cestaDomen}/${jmeno}`);
        if (o.ok && o.vysledek) dom = o.vysledek;
      }
      const zaznam = {
        jmeno,
        stav: dom.status ?? null,
        overeni: dom.verification_data?.status ?? null,
        certifikat: dom.validation_data?.status ?? null,
        chyba: dom.validation_data?.error_message ?? dom.verification_data?.error_message ?? null,
      };
      pages.domeny.push(zaznam);
      krok("pages", `${jmeno}: ${zaznam.stav ?? "?"}${zaznam.certifikat ? `, certifikát ${zaznam.certifikat}` : ""}${zaznam.chyba ? `, ${zaznam.chyba}` : ""}`);
    }
    stav.pages = pages;
  }

  /* 4. HTTPS a TLS na zóně. Nejdřív přečíst — co už platí, se nepřepisuje. */
  const https = {};
  for (const [klic, hodnota, proc] of NASTAVENI_ZONY) {
    const g = await cf("GET", `/zones/${zona.id}/settings/${klic}`);
    if (g.chybiPravo) {
      pravo("Zone · Zone Settings · Edit", "číst a měnit nastavení HTTPS zóny");
      break;
    }
    const ted = g.ok ? g.vysledek?.value : null;
    if (ted === hodnota) {
      https[klic] = hodnota;
      krok("https", `${klic} = ${hodnota} (už nastaveno)`);
      continue;
    }
    krok("https", `${sucho ? "nastavil by" : "nastavuji"} ${klic}: ${ted ?? "?"} → ${hodnota} — ${proc}`);
    if (sucho) {
      https[klic] = `nasucho: ${hodnota}`;
      continue;
    }
    const o = await cf("PATCH", `/zones/${zona.id}/settings/${klic}`, { value: hodnota });
    if (o.chybiPravo) {
      pravo("Zone · Zone Settings · Edit", "měnit nastavení HTTPS zóny");
      break;
    }
    https[klic] = o.ok ? (o.vysledek?.value ?? hodnota) : `nepodařilo se: ${o.chyby.join("; ") || `HTTP ${o.http}`}`;
  }
  stav.https = https;

  /* 5. www → holá doména. Pravidlo přesměrování na zóně; poznává se podle popisu. */
  const faze = `/zones/${zona.id}/rulesets/phases/http_request_dynamic_redirect/entrypoint`;
  const e = await cf("GET", faze);
  if (e.chybiPravo) pravo("Zone · Dynamic Redirect (Single Redirects) · Edit", "nastavit přesměrování www");
  else if (!e.ok && e.http !== 404) stav.presmerovaniWww = `nepodařilo se přečíst: ${e.chyby.join("; ") || `HTTP ${e.http}`}`;
  else {
    const sada = e.ok ? e.vysledek : null; /* 404 = na zóně zatím žádné přesměrování */
    if (sada?.rules?.some((r) => r.description === PRAVIDLO_WWW.description)) {
      stav.presmerovaniWww = "nastaveno";
      krok("www", "přesměrování už je nastavené");
    } else if (sucho) {
      stav.presmerovaniWww = "nasucho: nastavilo by se";
      krok("www", "nastavil by přesměrování www → holá doména");
    } else {
      const o = sada
        ? await cf("POST", `/zones/${zona.id}/rulesets/${sada.id}/rules`, PRAVIDLO_WWW)
        : await cf("PUT", faze, { description: "Přesměrování www", rules: [PRAVIDLO_WWW] });
      if (o.chybiPravo) pravo("Zone · Dynamic Redirect (Single Redirects) · Edit", "nastavit přesměrování www");
      else stav.presmerovaniWww = o.ok ? "nastaveno" : `nepodařilo se: ${o.chyby.join("; ") || `HTTP ${o.http}`}`;
      krok("www", stav.presmerovaniWww ?? "bez práva");
    }
  }

  /* 6. A odpovídá na doméně web? Nezávisle na API — tak, jak to uvidí čtenář. */
  stav.web = await overWeb();
  krok("web", stav.web.commit ? `https://${DOMENA}/stav.json odpovídá, commit ${stav.web.commit.slice(0, 7)}` : `https://${DOMENA}/stav.json: ${stav.web.http ? `HTTP ${stav.web.http}` : stav.web.chyba}`);
  krok("www", stav.web.www.konecnaAdresa ? `https://${WWW}/ → ${stav.web.www.konecnaAdresa} (HTTP ${stav.web.www.http})` : `https://${WWW}/: ${stav.web.www.chyba}`);

  return dokonci(stav, sucho);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => {
    console.error("[doména] selhalo:", e);
    process.exit(1);
  });
}
