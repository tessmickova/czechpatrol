#!/usr/bin/env python3
"""
Strojový překlad zachycených zpráv do češtiny.

20. 11. 2026, provozovatelka: „K čemukoliv v jiném jazyce napsat ‚přeloženo:‘
a přeložit do češtiny.“ Zvolila bezplatný strojový překlad: bez klíče, bez
plateb. Placený jazykový model (sber/model.ts) zůstává, kdyby se klíč vrátil.

Jak: otevřené překladové modely OPUS-MT Helsinské univerzity (Hugging Face,
Helsinki-NLP) převedené pro CTranslate2 běží přímo v GitHub Actions. Do
češtiny vede model z angličtiny; ostatní jazyky jdou přes angličtinu. Jazyk
zprávy se pozná z textu (langid). Modely Argos Translate (argos-net.com) se
nepoužívají: server stahování z GitHubu odmítá (403, 20. 11. 2026).

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

ADRESAR = pathlib.Path(os.environ.get("PREKLAD_MODELY", str(pathlib.Path.home() / ".cache" / "czechpatrol-preklad")))
JAZYKY = ["cs", "sk", "en", "pl", "de", "et", "lv", "lt", "fi", "ro", "uk", "ru", "sv", "nb", "no", "nn", "da", "bg", "hu", "fr", "nl", "it", "es"]
# langid zná norštinu jako no/nn/nb; modely OPUS-MT jako „no“.
NA_ARGOS = {"nb": "no", "nn": "no"}
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
#
# Modely OPUS-MT Helsinské univerzity (Helsinki-NLP/opus-mt-X-Y na Hugging
# Face, licence CC-BY 4.0). Pro CTranslate2 se převedou jednou (int8) a drží
# se v ADRESAR — v GitHub Actions v mezipaměti. Převod potřebuje transformers
# a torch; když chybí, skript zapíše do PREKLAD_CHYBI, co chybí, a workflow je
# doinstaluje a pustí skript znovu. Běžný běh je bez nich.

def repozitare(z: str, do: str) -> list[str]:
    """Kde model vzít: přímý směr, u překladu do angličtiny záložně vícejazyčný mul→en."""
    if (z, do) == ("en", "cs"):
        return ["Helsinki-NLP/opus-mt-en-cs"]
    if do == "en":
        return [f"Helsinki-NLP/opus-mt-{z}-en", "Helsinki-NLP/opus-mt-mul-en"]
    return []


def _prevodnik():
    try:
        import transformers  # noqa: F401
        from ctranslate2.converters import TransformersConverter
        return TransformersConverter
    except ImportError:
        return None


def adresar_modelu(z: str, do: str) -> pathlib.Path | None:
    for repo in repozitare(z, do):
        nazev = repo.split("/")[-1]
        cil = ADRESAR / nazev
        if (cil / "hotovo").exists():
            return cil
        if (ADRESAR / f"{nazev}.neexistuje").exists():
            continue
        prevodnik = _prevodnik()
        if prevodnik is None:
            if os.environ.get("PREKLAD_CHYBI"):
                with open(os.environ["PREKLAD_CHYBI"], "a", encoding="utf-8") as f:
                    f.write(f"{repo}\n")
            return None
        try:
            ADRESAR.mkdir(parents=True, exist_ok=True)
            prevodnik(repo, copy_files=["source.spm", "target.spm"]).convert(str(cil), quantization="int8", force=True)
            (cil / "hotovo").write_text(json.dumps({"repo": repo, "prevedeno": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}), "utf-8")
            zaloguj(f"převeden {repo}")
            return cil
        except Exception as e:
            zprava = str(e)
            zaloguj(f"{repo} nejde převést: {zprava[:200]}")
            if "not a valid model identifier" in zprava or "Repository Not Found" in zprava or "404" in zprava:
                (ADRESAR / f"{nazev}.neexistuje").write_text(zprava[:500], "utf-8")
    return None


class Model:
    """Jeden směr překladu: SentencePiece (source.spm) → CTranslate2 → SentencePiece (target.spm), jako MarianTokenizer."""

    def __init__(self, adresar: pathlib.Path):
        import ctranslate2
        import sentencepiece as spm
        self.zdroj = spm.SentencePieceProcessor(model_file=str(adresar / "source.spm"))
        self.cil = spm.SentencePieceProcessor(model_file=str(adresar / "target.spm"))
        self.prekladac = ctranslate2.Translator(str(adresar), device="cpu", compute_type="int8", inter_threads=1, intra_threads=0)

    def preloz(self, vety: list[str]) -> list[str]:
        tokeny = [self.zdroj.encode(v, out_type=str) + ["</s>"] for v in vety]
        vysledky = self.prekladac.translate_batch(tokeny, beam_size=4, num_hypotheses=1, replace_unknowns=True, max_decoding_length=256)
        vystup = []
        for v in vysledky:
            kusy = [t for t in v.hypotheses[0] if t not in ("</s>", "<pad>", "<unk>")]
            vystup.append(self.cil.decode_pieces(kusy).replace("▁", " ").strip())
        return vystup


_modely: dict[tuple[str, str], Model | None] = {}


def model(z: str, do: str) -> Model | None:
    if (z, do) not in _modely:
        try:
            a = adresar_modelu(z, do)
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


class ModelChybi(Exception):
    """Model se nestáhl nebo nenačetl. Není to chyba překladu: zpráva se nezapíše jako nepovedená a zkusí se příští běh."""


def preloz_text(text: str, z: str) -> str | None:
    cesta = [("en", "cs")] if z == "en" else [(z, "en"), ("en", "cs")]
    casti = vety(text)
    for krok in cesta:
        m = model(*krok)
        if m is None:
            raise ModelChybi(f"{krok[0]}→{krok[1]}")
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
    statistika = {"prelozeno": 0, "cesky": 0, "selhalo": 0, "bez_modelu": 0}
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
        except ModelChybi:
            statistika["bez_modelu"] += 1
        except Exception as e:
            vysledky[z.get("id", "?")] = {"chyba": str(e)[:200]}
            statistika["selhalo"] += 1
    pathlib.Path(vystup).write_text(json.dumps(vysledky, ensure_ascii=False, indent=2), "utf-8")
    # Ukázky do logu: kvalita se dá zkontrolovat bez stahování dat.
    puvodni = {z["id"]: z for z in zpravy}
    for i, (id_, v) in enumerate((k, v) for k, v in vysledky.items() if "titulek" in v):
        if i >= int(os.environ.get("PREKLAD_UKAZEK", "15")):
            break
        zaloguj(f"ukázka [{v['jazyk']}] {puvodni.get(id_, {}).get('titulek', '')!r} → {v['titulek']!r}")
    zaloguj(f"{statistika} za {time.time() - zacatek:.0f} s; modely: {sorted(k for k, v in _modely.items() if v)}")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        zaloguj("použití: preloz.py vstup.json vystup.json")
        sys.exit(0)
    try:
        main(sys.argv[1], sys.argv[2])
    except Exception as e:  # nikdy neshodit sběr
        zaloguj(f"překlad přeskočen: {e}")
