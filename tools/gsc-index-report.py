#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Stato di indicizzazione su Google di ogni pagina della sitemap (URL Inspection API di Search Console).

Perche' esiste: sitemap, <lastmod>, IndexNow e reinvio della sitemap dicono a Google cosa leggere, ma non dicono se
poi una pagina e' finita nell'indice. Questo resoconto risponde per ogni URL: indicizzata o no, perche' (es.
"Rilevata, attualmente non indicizzata"), quando Google l'ha letta l'ultima volta e se ha scelto un canonical
diverso dal nostro. Non cambia niente in Search Console: solo letture.

Credenziali: le stesse di tools/gsc-submit-sitemap.py (GSC_SERVICE_ACCOUNT_JSON, account di servizio Proprietario
della proprieta'). Quota Google: 2000 ispezioni al giorno per proprieta', la sitemap ne usa ~140.

Uso:
    GSC_SERVICE_ACCOUNT_JSON="$(cat chiave.json)" python3 tools/gsc-index-report.py
    ... --only blog/posts/     # solo gli URL che contengono questo testo
In GitHub Actions il resoconto va anche nel riepilogo del run ($GITHUB_STEP_SUMMARY).
"""
import importlib.util, json, os, re, sys, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

HERE = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("gsc", os.path.join(HERE, "gsc-submit-sitemap.py"))
gsc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gsc)

INSPECT = "https://searchconsole.googleapis.com/v1/urlInspection/index:inspect"
INDEXED = "Submitted and indexed"


def sitemap_urls():
    with urllib.request.urlopen(urllib.request.Request(gsc.SITEMAP, headers={"User-Agent": "vv-index-report"}), timeout=30) as r:
        return re.findall(r"<loc>([^<]+)</loc>", r.read().decode())


def inspect(tok, site, url):
    body = json.dumps({"inspectionUrl": url, "siteUrl": site, "languageCode": "it"}).encode()
    req = urllib.request.Request(INSPECT, data=body, method="POST",
                                 headers={"Authorization": f"Bearer {tok}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            res = json.loads(r.read().decode()).get("inspectionResult", {}).get("indexStatusResult", {})
    except urllib.error.HTTPError as e:
        return {"url": url, "coverage": f"errore API {e.code}", "detail": e.read().decode(errors="replace")[:200]}
    return {"url": url, "coverage": res.get("coverageState", "?"), "verdict": res.get("verdict"),
            "lastCrawl": (res.get("lastCrawlTime") or "")[:10], "google": res.get("googleCanonical"),
            "ours": res.get("userCanonical")}


def main():
    only = sys.argv[sys.argv.index("--only") + 1] if "--only" in sys.argv else ""
    tok = gsc.token()
    site = gsc.pick_property(tok)
    urls = [u for u in sitemap_urls() if only in u]
    print(f"proprieta' {site}: ispeziono {len(urls)} URL")
    with ThreadPoolExecutor(4) as ex:
        rows = list(ex.map(lambda u: inspect(tok, site, u), urls))

    counts = {}
    for r in rows:
        counts[r["coverage"]] = counts.get(r["coverage"], 0) + 1
    todo = sorted((r for r in rows if r["coverage"] != INDEXED), key=lambda r: (r["coverage"], r["url"]))
    other_canonical = [r for r in rows if r.get("google") and r.get("ours") and r["google"] != r["ours"]]

    out = ["## Indicizzazione su Google", "", f"{len(rows)} URL della sitemap, ispezionati con l'URL Inspection API.", ""]
    out += [f"- **{n}** {c}" for c, n in sorted(counts.items(), key=lambda x: -x[1])]
    if todo:
        out += ["", "### Non (ancora) indicizzate", "", "| URL | Stato | Ultima lettura |", "|---|---|---|"]
        out += [f"| {r['url'].replace(gsc.SITEMAP.rsplit('/', 1)[0], '')} | {r['coverage']} | {r.get('lastCrawl') or '—'} |" for r in todo]
    if other_canonical:
        out += ["", "### Canonical scelto da Google diverso dal nostro", "", "| URL | Canonical di Google |", "|---|---|"]
        out += [f"| {r['url']} | {r['google']} |" for r in other_canonical]
    report = "\n".join(out) + "\n"
    print(report)
    if os.environ.get("GITHUB_STEP_SUMMARY"):
        with open(os.environ["GITHUB_STEP_SUMMARY"], "a", encoding="utf-8") as f:
            f.write(report)


if __name__ == "__main__":
    main()
