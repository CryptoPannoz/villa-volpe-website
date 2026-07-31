#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Notifica a IndexNow le pagine cambiate in un push.

Chi ascolta: Bing, Yandex, Naver, Seznam e Yep (l'indice di DuckDuckGo).
**Google no** — non ha mai adottato il protocollo, per lui contano solo la
sitemap e il <lastmod>. Quindi questo script e' un di piu', non un
sostituto di tools/build-sitemap.py.

La chiave NON e' un segreto: il protocollo richiede che sia leggibile
pubblicamente su https://www.villa-volpe.com/<chiave>.txt, ed e' proprio
cosi' che il motore verifica che chi invia controlli il dominio. Sta nel
repo apposta.

Uso:
    python3 tools/indexnow.py --range <sha1>..<sha2>   # URL cambiati nel range
    python3 tools/indexnow.py --range HEAD~1..HEAD
    python3 tools/indexnow.py --all                    # tutta la sitemap
    python3 tools/indexnow.py --range ... --dry-run    # stampa e basta

Manda solo URL che compaiono in sitemap.xml: cosi' le esclusioni (stub di
redirect, noindex, pagine di servizio) valgono in automatico e non c'e' una
seconda lista da tenere allineata. Lancialo DOPO che il deploy e' andato
online, altrimenti i motori vengono a leggere la versione vecchia.
"""
import argparse, json, os, re, subprocess, sys, urllib.request, urllib.error

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
HOST = "www.villa-volpe.com"
BASE = f"https://{HOST}"
ENDPOINT = "https://api.indexnow.org/indexnow"   # inoltra a tutti i motori aderenti
MAX_URLS = 10000                                  # limite del protocollo


def find_key():
    """La chiave e' il nome del file <chiave>.txt nella root del sito."""
    for fn in sorted(os.listdir(ROOT)):
        if not fn.endswith(".txt"):
            continue
        stem = fn[:-4]
        if not re.fullmatch(r"[A-Za-z0-9-]{8,128}", stem):
            continue
        content = open(os.path.join(ROOT, fn), encoding="utf-8").read().strip()
        if content == stem:
            return stem
    sys.exit("!! nessun file <chiave>.txt valido nella root: chiave IndexNow assente")


def sitemap_urls():
    p = os.path.join(ROOT, "sitemap.xml")
    if not os.path.exists(p):
        sys.exit("!! sitemap.xml assente: lancia prima tools/build-sitemap.py")
    return set(re.findall(r"<loc>(.*?)</loc>", open(p, encoding="utf-8").read()))


def changed_urls(rng, known):
    out = subprocess.run(["git", "diff", "--name-only", "--diff-filter=ACMRT", rng],
                         cwd=ROOT, capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f"!! git diff {rng} fallito: {out.stderr.strip()}")
    urls = []
    for rel in out.stdout.split():
        if not rel.endswith(".html"):
            continue
        lang_pfx = ""
        key = rel
        for lg in ("it", "de", "fr"):
            if rel.startswith(lg + "/"):
                lang_pfx, key = lg + "/", rel[len(lg) + 1:]
                break
        url = f"{BASE}/{lang_pfx}" + ("" if key == "index.html" else key)
        if url in known:            # la sitemap e' l'unica fonte di verita'
            urls.append(url)
    return sorted(set(urls))


def submit(key, urls):
    payload = json.dumps({
        "host": HOST,
        "key": key,
        "keyLocation": f"{BASE}/{key}.txt",
        "urlList": urls,
    }).encode()
    req = urllib.request.Request(ENDPOINT, data=payload, method="POST",
                                 headers={"Content-Type": "application/json; charset=utf-8"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            code = r.status
    except urllib.error.HTTPError as e:
        code = e.code
    except Exception as e:
        print(f"!! invio fallito: {e}")
        return 1
    spiega = {
        200: "accettati",
        202: "ricevuti, validazione della chiave in corso",
        400: "richiesta malformata",
        403: f"chiave rifiutata — {BASE}/{key}.txt non raggiungibile o contenuto diverso",
        422: "URL non appartenenti all'host, o chiave non corrispondente",
        429: "troppe richieste (rate limit)",
    }
    print(f"IndexNow HTTP {code}: {spiega.get(code, 'risposta inattesa')}")
    return 0 if code in (200, 202) else 1


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    g = ap.add_mutually_exclusive_group(required=True)
    g.add_argument("--range", help="intervallo git, es. HEAD~1..HEAD")
    g.add_argument("--all", action="store_true", help="tutti gli URL della sitemap")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()

    key = find_key()
    known = sitemap_urls()
    urls = sorted(known) if a.all else changed_urls(a.range, known)

    if not urls:
        print("nessuna pagina indicizzabile modificata: niente da notificare")
        sys.exit(0)
    if len(urls) > MAX_URLS:
        print(f"tronco a {MAX_URLS} URL (erano {len(urls)})")
        urls = urls[:MAX_URLS]

    print(f"chiave {key} — {len(urls)} URL:")
    for u in urls[:20]:
        print("   ", u)
    if len(urls) > 20:
        print(f"    … e altri {len(urls) - 20}")

    if a.dry_run:
        print("\n--dry-run: non inviato")
        sys.exit(0)
    sys.exit(submit(key, urls))
