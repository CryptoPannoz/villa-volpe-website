#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Rigenera sitemap.xml scandendo il repo.

Perche' esiste: il `lastmod` scritto a mano si stacca dalla realta' al primo
articolo che modifichi senza ricordarti della sitemap, e Google usa proprio
il `lastmod` per decidere cosa ripassare a leggere (l'endpoint di "ping" e'
morto nel 2023). Qui la data viene dall'ultimo commit che ha toccato il file,
quindi non puo' sbagliare.

Uso:
    python3 tools/build-sitemap.py            # riscrive sitemap.xml
    python3 tools/build-sitemap.py --check    # esce 1 se sitemap.xml e' da rigenerare

Cosa entra nella sitemap: tutte le pagine .html tranne
  - gli stub di redirect legacy (<meta http-equiv="refresh">)
  - le pagine noindex (es. 404.html)
  - la lista EXCLUDE qui sotto (pagine di servizio)
Gli hreflang vengono letti dalla pagina stessa, cosi' sitemap e <head> non
possono divergere.

ATTENZIONE se lo lanci in CI: serve la storia git completa
(actions/checkout con fetch-depth: 0), altrimenti `git log` vede un solo
commit e tutte le date risultano uguali.
"""
import os, re, subprocess, sys, datetime

BASE = "https://www.villa-volpe.com"
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
LANGS = ["en", "fr", "de", "it"]          # ordine in cui compaiono nella sitemap
PREFIX = {"en": "", "fr": "fr/", "de": "de/", "it": "it/"}

SKIP_DIRS = {".git", ".github", "booking-engine", "content", "images", "js", "tools"}
EXCLUDE = {"email-signature.html"}         # pagine di servizio, non da indicizzare

RE_REFRESH = re.compile(r'http-equiv=["\']refresh', re.I)
RE_NOINDEX = re.compile(r'\bnoindex\b', re.I)
RE_ALT = re.compile(r'<link[^>]+rel="alternate"[^>]+hreflang="([^"]+)"[^>]+href="([^"]+)"')


def git_date(relpath):
    """Data dell'ultimo commit che ha toccato il file (YYYY-MM-DD).
    Se il file e' nuovo o ha modifiche non committate, usa oggi."""
    dirty = subprocess.run(["git", "status", "--porcelain", "--", relpath],
                           cwd=ROOT, capture_output=True, text=True).stdout.strip()
    if dirty:
        return datetime.date.today().isoformat()
    out = subprocess.run(["git", "log", "-1", "--format=%ad", "--date=short", "--", relpath],
                         cwd=ROOT, capture_output=True, text=True).stdout.strip()
    return out or datetime.date.today().isoformat()


def collect():
    """-> {page_key: {lang: (relpath, url, lastmod)}}"""
    pages = {}
    for dirpath, dirnames, filenames in os.walk(ROOT):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for fn in filenames:
            if not fn.endswith(".html"):
                continue
            rel = os.path.relpath(os.path.join(dirpath, fn), ROOT).replace(os.sep, "/")
            if rel in EXCLUDE:
                continue
            html = open(os.path.join(ROOT, rel), encoding="utf-8", errors="ignore").read()
            head = html[:html.find("</head>") if "</head>" in html else 4000]
            if RE_REFRESH.search(head) or RE_NOINDEX.search(head):
                continue

            lang, key = "en", rel
            for lg in ("it", "de", "fr"):
                if rel.startswith(lg + "/"):
                    lang, key = lg, rel[len(lg) + 1:]
                    break
            url = BASE + "/" + PREFIX[lang] + ("" if key == "index.html" else key)
            pages.setdefault(key, {})[lang] = (rel, url, git_date(rel))
    return pages


def alternates(relpath):
    """hreflang presi dalla pagina stessa, nell'ordine canonico."""
    html = open(os.path.join(ROOT, relpath), encoding="utf-8", errors="ignore").read()
    found = dict(RE_ALT.findall(html))
    out = []
    for lg in LANGS + ["x-default"]:
        if lg in found:
            out.append((lg, found[lg]))
    return out


def section(key):
    if key == "blog.html":
        return 2, "Blog: indice"
    if key.startswith("blog/posts/"):
        return 3, "Blog: articoli (dal piu' recente)"
    return 1, "Pagine principali"


def build():
    pages = collect()
    rows = []
    for key, langs in pages.items():
        rank, name = section(key)
        newest = max(v[2] for v in langs.values())
        rows.append((rank, name, "9999" if rank < 3 else newest, key, langs))
    # sezioni in ordine; dentro: articoli dal piu' recente, il resto alfabetico
    rows.sort(key=lambda r: (r[0], "" if r[0] < 3 else _inv(r[2]), r[3]))

    out = ['<?xml version="1.0" encoding="UTF-8"?>',
           '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
           '        xmlns:xhtml="http://www.w3.org/1999/xhtml">']
    current = None
    for rank, name, _s, key, langs in rows:
        if name != current:
            out.append(f"\n  <!-- {name} -->")
            current = name
        for lg in LANGS:
            if lg not in langs:
                continue
            rel, url, lastmod = langs[lg]
            out.append("  <url>")
            out.append(f"    <loc>{url}</loc>")
            out.append(f"    <lastmod>{lastmod}</lastmod>")
            for hl, href in alternates(rel):
                out.append(f'    <xhtml:link rel="alternate" hreflang="{hl}" href="{href}"/>')
            out.append("  </url>")
    out.append("</urlset>")
    return "\n".join(out) + "\n"


def _inv(datestr):
    """chiave di ordinamento decrescente per una data YYYY-MM-DD"""
    return "".join(chr(ord("9") - int(c)) if c.isdigit() else c for c in datestr)


if __name__ == "__main__":
    new = build()
    path = os.path.join(ROOT, "sitemap.xml")
    old = open(path, encoding="utf-8").read() if os.path.exists(path) else ""
    n = new.count("<loc>")
    if "--check" in sys.argv:
        if new != old:
            print(f"sitemap.xml da rigenerare ({n} URL) — lancia: python3 tools/build-sitemap.py")
            sys.exit(1)
        print(f"sitemap.xml aggiornata ({n} URL)")
        sys.exit(0)
    open(path, "w", encoding="utf-8").write(new)
    print(f"sitemap.xml scritta: {n} URL" + ("" if new != old else " (nessuna modifica)"))
