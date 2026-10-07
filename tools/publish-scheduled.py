#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Pubblica gli articoli programmati del blog quando arriva la loro data.

Il sito e' statico su GitHub Pages: un articolo non puo' "accendersi" da solo
a una certa data. Gli articoli pronti aspettano quindi nel branch
`scheduled-posts`, ognuno in un pacchetto

    scheduled/AAAA-MM-GG-<slug>.tar.gz

e ogni mattina .github/workflows/publish-scheduled.yml lancia questo script,
che pubblica quelli con data <= oggi (ora italiana), poi committa su main e
avvia il deploy.

Perche' pacchetti .tar.gz e non HTML in chiaro: il repo e' pubblico, e
l'HTML in chiaro su github.com potrebbe finire indicizzato prima della pagina
vera sul dominio. Un archivio compresso no.

Contenuto di un pacchetto:
    publish.json      metadati (vedi sotto)
    site/...          i file da copiare, con il percorso che avranno nel sito
                      (es. site/blog/posts/x.html, site/images/blog/x-hero.jpg)

publish.json:
    {
      "slug":   "where-to-eat-lake-orta",
      "date":   "2026-10-21",
      "commit": "feat(blog): ...",            # messaggio di commit
      "cards":  {"blog.html": "<article ...>...</article>",
                 "it/blog.html": "...", ...}, # card da mettere in cima all'indice
      "links":  [{"file": "blog/posts/a.html",  # link interni facoltativi da
                  "find": "testo esatto",       # aggiungere a pagine esistenti:
                  "replace": "testo con link"}] # applicati solo se "find" compare
    }                                           # una volta sola, altrimenti avviso

Comandi:
    python3 tools/publish-scheduled.py list    --ref origin/scheduled-posts
    python3 tools/publish-scheduled.py publish --ref origin/scheduled-posts [--today AAAA-MM-GG] [--dry-run]
    python3 tools/publish-scheduled.py pack    <cartella> <out.tar.gz>
        (la cartella contiene publish.json e site/: crea il pacchetto)

Lo script e' idempotente: un pacchetto i cui file esistono gia' tutti nel sito
viene saltato, una card gia' presente non viene duplicata, un link gia'
inserito non viene reinserito. Non tocca mai file fuori da site/.
"""
import argparse, datetime, io, json, os, re, subprocess, sys, tarfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RE_BUNDLE = re.compile(r"^scheduled/(\d{4}-\d{2}-\d{2})-([a-z0-9-]+)\.tar\.gz$")
GRID_MARK = 'id="blogGrid"'


def today_rome():
    """Data di oggi in Italia, senza dipendere dal fuso del runner (UTC)."""
    try:
        from zoneinfo import ZoneInfo
        return datetime.datetime.now(ZoneInfo("Europe/Rome")).date()
    except Exception:
        # ripiego: CET/CEST con la regola UE (ultima domenica di marzo/ottobre)
        now = datetime.datetime.utcnow()
        y = now.year
        def last_sunday(month):
            d = datetime.date(y, month, 31)
            return d - datetime.timedelta(days=(d.weekday() + 1) % 7)
        dst = last_sunday(3) <= now.date() < last_sunday(10)
        return (now + datetime.timedelta(hours=2 if dst else 1)).date()


def git(*args, binary=False):
    out = subprocess.run(["git", *args], cwd=ROOT, capture_output=True)
    if out.returncode != 0:
        sys.exit(f"!! git {' '.join(args)}: {out.stderr.decode(errors='replace').strip()}")
    return out.stdout if binary else out.stdout.decode()


def bundles(ref):
    names = git("ls-tree", "-r", "--name-only", ref, "--", "scheduled/").split()
    found = []
    for name in sorted(names):
        m = RE_BUNDLE.match(name)
        if m:
            found.append((datetime.date.fromisoformat(m.group(1)), m.group(2), name))
        elif name.endswith(".tar.gz"):
            print(f"?? nome non valido, ignorato: {name}")
    return found


def open_bundle(ref, name):
    blob = git("show", f"{ref}:{name}", binary=True)
    tar = tarfile.open(fileobj=io.BytesIO(blob), mode="r:gz")
    manifest = json.load(tar.extractfile("publish.json"))
    files = []
    for member in tar.getmembers():
        if not member.isfile() or not member.name.startswith("site/"):
            continue
        rel = os.path.normpath(member.name[len("site/"):])
        if rel.startswith("..") or os.path.isabs(rel):
            sys.exit(f"!! percorso non ammesso nel pacchetto {name}: {member.name}")
        files.append((rel, member))
    if not files:
        sys.exit(f"!! pacchetto {name} senza file in site/")
    return tar, manifest, files


def insert_card(index_rel, card, href, dry):
    path = os.path.join(ROOT, index_rel)
    html = open(path, encoding="utf-8").read()
    if f'href="{href}"' in html:
        print(f"   = card gia' presente in {index_rel}")
        return False
    lines = html.split("\n")
    for i, line in enumerate(lines):
        if GRID_MARK in line:
            lines[i + 1:i + 1] = card.rstrip("\n").split("\n") + [""]
            break
    else:
        sys.exit(f"!! {index_rel}: griglia {GRID_MARK} non trovata")
    if not dry:
        open(path, "w", encoding="utf-8").write("\n".join(lines))
    print(f"   + card in {index_rel}")
    return True


def apply_link(link, dry):
    path = os.path.join(ROOT, link["file"])
    if not os.path.exists(path):
        print(f"   ?? link saltato, file assente: {link['file']}")
        return
    html = open(path, encoding="utf-8").read()
    if link["replace"] in html:
        print(f"   = link gia' presente in {link['file']}")
        return
    count = html.count(link["find"])
    if count != 1:
        print(f"   ?? link saltato in {link['file']}: testo trovato {count} volte (atteso 1)")
        return
    if not dry:
        open(path, "w", encoding="utf-8").write(html.replace(link["find"], link["replace"]))
    print(f"   + link in {link['file']}")


def cmd_list(args):
    today = today_rome()
    for date, slug, name in bundles(args.ref):
        state = "da pubblicare oggi" if date <= today else f"tra {(date - today).days} giorni"
        print(f"{date}  {slug}  ({state})")


def cmd_publish(args):
    today = datetime.date.fromisoformat(args.today) if args.today else today_rome()
    print(f"oggi (Europe/Rome): {today}")
    published, messages = [], []
    for date, slug, name in bundles(args.ref):
        if date > today:
            print(f"-- {slug}: in programma il {date}, non ancora")
            continue
        tar, manifest, files = open_bundle(args.ref, name)
        if all(os.path.exists(os.path.join(ROOT, rel)) for rel, _ in files):
            print(f"-- {slug}: gia' pubblicato, salto")
            continue
        print(f">> {slug} ({date}): {len(files)} file")
        for rel, member in files:
            dest = os.path.join(ROOT, rel)
            if not args.dry_run:
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                with open(dest, "wb") as fh:
                    fh.write(tar.extractfile(member).read())
            print(f"   + {rel}")
        for index_rel, card in manifest.get("cards", {}).items():
            m = re.search(r'<a href="([^"]+)" class="btn', card)
            insert_card(index_rel, card, m.group(1) if m else slug, args.dry_run)
        for link in manifest.get("links", []):
            apply_link(link, args.dry_run)
        published.append(slug)
        messages.append(manifest.get("commit") or f"feat(blog): pubblica {slug}")

    if not published:
        print("niente da pubblicare")
    out = os.environ.get("GITHUB_OUTPUT")
    if out and published and not args.dry_run:
        with open(out, "a") as fh:
            fh.write(f"published={' '.join(published)}\n")
        tmp = os.environ.get("RUNNER_TEMP", ROOT)
        with open(os.path.join(tmp, "commit-msg.txt"), "w", encoding="utf-8") as fh:
            if len(messages) == 1:
                fh.write(messages[0] + "\n\nPubblicato in automatico da publish-scheduled.yml.\n")
            else:
                fh.write("feat(blog): pubblica " + ", ".join(published) + "\n\n"
                         + "\n".join(f"- {m}" for m in messages)
                         + "\n\nPubblicato in automatico da publish-scheduled.yml.\n")


def cmd_pack(args):
    src = os.path.abspath(args.folder)
    manifest = json.load(open(os.path.join(src, "publish.json"), encoding="utf-8"))
    if not os.path.isdir(os.path.join(src, "site")):
        sys.exit("!! manca la cartella site/")
    with tarfile.open(args.out, "w:gz") as tar:
        tar.add(os.path.join(src, "publish.json"), arcname="publish.json")
        tar.add(os.path.join(src, "site"), arcname="site")
    print(f"pacchetto {args.out}: {manifest.get('slug')} del {manifest.get('date')}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)
    p = sub.add_parser("list"); p.add_argument("--ref", default="origin/scheduled-posts"); p.set_defaults(fn=cmd_list)
    p = sub.add_parser("publish")
    p.add_argument("--ref", default="origin/scheduled-posts")
    p.add_argument("--today", help="forza la data (AAAA-MM-GG), per provare")
    p.add_argument("--dry-run", action="store_true")
    p.set_defaults(fn=cmd_publish)
    p = sub.add_parser("pack"); p.add_argument("folder"); p.add_argument("out"); p.set_defaults(fn=cmd_pack)
    args = ap.parse_args()
    args.fn(args)


if __name__ == "__main__":
    main()
