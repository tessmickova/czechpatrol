#!/usr/bin/env python3
"""
Strojový překlad zachycených zpráv do češtiny.

20. 11. 2026, provozovatelka: „K čemukoliv v jiném jazyce napsat ‚přeloženo:‘
a přeložit do češtiny.“ Zvolila bezplatný strojový překlad: bez klíče, bez
plateb. Placený jazykový model (sber/model.ts) zůstává, kdyby se klíč vrátil.

Jak: otevřené překladové modely z projektu Argos Translate (OPUS-MT převedené
pro CTranslate2) běží přímo v GitHub Actions. Samotný balík argostranslate se
neinstaluje — táhne s sebou torch (přes 5 GB). Tenhle skript dělá totéž co
jeho jádro (SentencePiece → CTranslate2 → SentencePiece, stejné parametry),
jen bez dělení vět přes stanza. Do češtiny vede model jen z angličtiny;
ostatní jazyky jdou přes angličtinu. Jazyk zprávy se pozná z textu (langid).

    python3 -I nastroje/preklad/preloz.py vstup.json vystup.json

Vstup:  [{"id", "titulek", "shrnuti"}]
Výstup: {"id": {"jazyk", "titulek", "shrnuti" | null}}  nebo  {"id": {"chyba": "…"}}

Pravidla (CLAUDE.md, zásady textu): překládá se jen to, co ve zprávě stojí,
nic se nepřidává ani nedomýšlí. Co neprojde kontrolou (prázdné, nepřeložené,
smyčka, výstup není česky), se nezapíše — zpráva zůstane v původním jazyce
a zkusí se příště. Skript nikdy nekončí chybou: překlad nesmí shodit sběr.
"""
from __future__ import annotations

import json
import os
import pathlib
import re
import sys
import time
import urllib.request
import zipfile

INDEX = "https://raw.githubusercontent.com/argosopentech/argospm-index/main/index.json"
ADRESAR = pathlib.Path(os.environ.get("PREKLAD_MODELY", str(pathlib.Path.home() / ".cache" / "czechpatrol-preklad")))
JAZYKY = ["cs", "sk", "en", "pl", "de", "et", "lv", "lt", "fi", "ro", "uk", "ru", "sv", "nb", "no", "nn", "da", "bg", "hu", "fr", "nl", "it", "es"]
# langid zná norštinu jako no/nn/nb, Argos jen jako nb.
NA_ARGOS = {"no": "nb", "nn": "nb"}
# Nejvýš tolik zpráv za běh: zbytek fronty se dopřekládá v dalších bězích.
NEJVIC = int(os.environ.get("PREKLAD_NEJVIC", "60"))


def zaloguj(*casti: object) -> None:
    print("[preklad]", *casti, file=sys.stderr, flush=True)


# ---------- jazyk ----------

_lid = None


def jazyk(text: str) -> str:
    global _lid
    if _lid is None:
        import langid
        langid.set_languages(JAZYKY)
        _lid = langid
    kod = _lid.classify(text)[0]
    return NA_ARGOS.get(kod, kod)


CIZI_ZNAKY = re.compile(r"[ľôŕĺłąęśźżäöüßőűàèêçùâî]", re.I)
PREDLOZKY = re.compile(r"(^|[^\w])(v|ve|na|se|je|z|ze|o|k|do|po|za|pro|při|u)(?=[^\w]|$)", re.I)


def cesky_podle_webu(text: str) -> bool:
    """Stejné pravidlo jako jeCesky v src/lib/jazyk.ts: cizí znaky rozhodnou dřív než společná diakritika."""
    if CIZI_ZNAKY.search(text):
        return False
    if re.search(r"[ěřůňťď]", text, re.I):
        return True
    return bool(re.search(r"[áéíýúž]", text, re.I)) and bool(PREDLOZKY.search(text))


def je_cesky(text: str) -> bool:
    """Výstup překladu musí být česky. Krátkou češtinu langid plete se slovenštinou; slovenská písmena (ľ, ô…) ji vyloučí."""
    if CIZI_ZNAKY.search(text):
        return False
    return cesky_podle_webu(text) or jazyk(text) in ("cs", "sk")


# ---------- modely ----------

def index() -> list[dict]:
    soubor = ADRESAR / "index.json"
    if not soubor.exists() or time.time() - soubor.stat().st_mtime > 7 * 86400:
        ADRESAR.mkdir(parents=True, exist_ok=True)
        with urllib.request.urlopen(INDEX, timeout=60) as r:
            soubor.write_bytes(r.read())
    return json.loads(soubor.read_text("utf-8"))


def adresar_balicku(z: str, do: str) -> pathlib.Path | None:
    """Rozbalený balíček z → do; stáhne ho, když chybí. None, když neexistuje nebo se nestáhne."""
    cil = ADRESAR / f"{z}_{do}"
    if (cil / "hotovo").exists():
        return cil
    balicek = next((b for b in index() if b.get("from_code") == z and b.get("to_code") == do), None)
    if not balicek:
        return None
    cil.mkdir(parents=True, exist_ok=True)
    archiv = cil / "balicek.zip"
    for odkaz in balicek.get("links", []):
        try:
            with urllib.request.urlopen(odkaz, timeout=300) as r:
                archiv.write_bytes(r.read())
            break
        except Exception as e:  # další odkaz, nebo příště
            zaloguj(f"stažení {z}→{do} z {odkaz} selhalo: {e}")
    if not archiv.exists():
        return None
    with zipfile.ZipFile(archiv) as zf:
        zf.extractall(cil)
    archiv.unlink()
    (cil / "hotovo").write_text(json.dumps({"verze": balicek.get("package_version")}), "utf-8")
    return cil


class Model:
    """Jeden směr překladu. Postup a parametry jako argostranslate.translate.apply_packaged_translation."""

    def __init__(self, adresar: pathlib.Path):
        import ctranslate2
        import sentencepiece as spm
        koren = next(p.parent for p in adresar.rglob("metadata.json"))
        meta = json.loads((koren / "metadata.json").read_text("utf-8"))
        sp = koren / "sentencepiece.model"
        if not sp.exists():
            raise RuntimeError("balíček nemá sentencepiece.model (BPE se nepodporuje)")
        self.sp = spm.SentencePieceProcessor(model_file=str(sp))
        self.prefix = meta.get("target_prefix", "")
        self.prekladac = ctranslate2.Translator(str(koren / "model"), device="cpu", compute_type="auto", inter_threads=1, intra_threads=0)

    def preloz(self, vety: list[str]) -> list[str]:
        tokeny = [self.sp.encode(v, out_type=str) for v in vety]
        vysledky = self.prekladac.translate_batch(
            tokeny,
            target_prefix=[[self.prefix]] * len(tokeny) if self.prefix else None,
            replace_unknowns=True,
            beam_size=4,
            num_hypotheses=1,
            length_penalty=0.2,
        )
        vystup = []
        for v in vysledky:
            text = self.sp.decode_pieces(v.hypotheses[0]).replace("▁", " ").replace("_", " ")
            if self.prefix and text.startswith(self.prefix):
                text = text[len(self.prefix):]
            vystup.append(text.strip())
        return vystup


_modely: dict[tuple[str, str], Model | None] = {}


def model(z: str, do: str) -> Model | None:
    if (z, do) not in _modely:
        try:
            a = adresar_balicku(z, do)
            _modely[(z, do)] = Model(a) if a else None
        except Exception as e:
            zaloguj(f"model {z}→{do} nejde načíst: {e}")
            _modely[(z, do)] = None
    return _modely[(z, do)]


# ---------- text ----------

def vety(text: str) -> list[str]:
    """Shrnutí po větách: kratší vstup = věrnější překlad. Dělí se jen na . ! ? … před velkým písmenem."""
    casti = re.split(r"(?<=[.!?…])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽĄĆĘŁŃŚŹŻÄÖÜÕŠŽĀĒĪŪĶĻŅ\"„“'(])", text.strip())
    return [c for c in casti if c]


def uprav(text: str) -> str:
    """Typografie podle zásad webu: české uvozovky, bez mezer před interpunkcí, velké první písmeno. Obsah se nemění."""
    t = re.sub(r"\s+", " ", text).strip()
    t = re.sub(r"\s+([,.;:!?…])", r"\1", t)
    t = re.sub(r"[\"“”]([^\"“”]+)[\"“”]", r"„\1“", t)
    t = re.sub(r"\s+-\s+", " – ", t)
    return t[:1].upper() + t[1:] if t else t


def smycka(text: str) -> bool:
    slova = text.lower().split()
    return any(slova[i] == slova[i + 1] == slova[i + 2] == slova[i + 3] for i in range(len(slova) - 3))


def preloz_text(text: str, z: str) -> str | None:
    cesta = [("en", "cs")] if z == "en" else [(z, "en"), ("en", "cs")]
    casti = vety(text)
    for krok in cesta:
        m = model(*krok)
        if m is None:
            return None
        casti = m.preloz(casti)
    vysledek = uprav(" ".join(casti))
    if not vysledek or vysledek.casefold() == text.strip().casefold():
        return None
    if len(vysledek) > 3 * len(text) + 40 or smycka(vysledek) or not je_cesky(vysledek):
        return None
    return vysledek


def main(vstup: str, vystup: str) -> None:
    try:
        zpravy = json.loads(pathlib.Path(vstup).read_text("utf-8"))[:NEJVIC]
    except Exception as e:
        zaloguj(f"vstup nejde přečíst: {e}")
        zpravy = []
    vysledky: dict[str, dict] = {}
    statistika = {"prelozeno": 0, "cesky": 0, "selhalo": 0}
    zacatek = time.time()
    for z in zpravy:
        try:
            titulek = (z.get("titulek") or "").strip()
            shrnuti = (z.get("shrnuti") or "").strip()
            kod = jazyk(f"{titulek}. {shrnuti}")
            if kod == "cs" or cesky_podle_webu(titulek):
                statistika["cesky"] += 1
                continue
            t = preloz_text(titulek, kod)
            if not t:
                vysledky[z["id"]] = {"chyba": f"titulek z {kod} neprošel"}
                statistika["selhalo"] += 1
                continue
            s = preloz_text(shrnuti, kod) if shrnuti else None
            vysledky[z["id"]] = {"jazyk": kod, "titulek": t, "shrnuti": s}
            statistika["prelozeno"] += 1
        except Exception as e:
            vysledky[z.get("id", "?")] = {"chyba": str(e)[:200]}
            statistika["selhalo"] += 1
    pathlib.Path(vystup).write_text(json.dumps(vysledky, ensure_ascii=False, indent=2), "utf-8")
    zaloguj(f"{statistika} za {time.time() - zacatek:.0f} s; modely: {sorted(k for k, v in _modely.items() if v)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        zaloguj("použití: preloz.py vstup.json vystup.json")
        sys.exit(0)
    try:
        main(sys.argv[1], sys.argv[2])
    except Exception as e:  # nikdy neshodit sběr
        zaloguj(f"překlad přeskočen: {e}")
