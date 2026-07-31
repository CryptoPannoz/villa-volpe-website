# Villa Volpe — sito (Lake Orta)

Sito di villa-volpe.com.
- **Repo:** github.com/CryptoPannoz/villa-volpe-website
- **Dominio:** villa-volpe.com — **Deploy: GitHub Pages** (push su `origin/main` → workflow `.github/workflows/deploy.yml`).
  - Sito statico servito da GitHub Pages: **niente redirect server-side** (i redirect legacy sono stub `<meta http-equiv="refresh">`), `Cache-Control` fisso a `max-age=600` non configurabile, nessun image CDN. Non esistono `netlify.toml`/`_redirects` e non servirebbero.
- **Foto/video:** auto-ospitati nel repo in `images/` (`images/uploads/`, `images/blog/`). Nessun CDN esterno.
- **Sitemap: non si modifica a mano.** La genera `tools/build-sitemap.py`, che gira dentro `deploy.yml` a ogni push e prende `<lastmod>` dall'ultimo commit di ogni file. Include tutte le `.html` tranne gli stub `<meta http-equiv="refresh">`, le pagine `noindex` e la lista `EXCLUDE` nello script; gli hreflang li legge dal `<head>` della pagina stessa. In locale: `python3 tools/build-sitemap.py` (oppure `--check`, che esce 1 se e' da rigenerare). Il checkout in CI usa `fetch-depth: 0` perche' altrimenti `git log` vedrebbe un solo commit.
  - Per rilanciare a Google **non esiste piu' il ping**: `google.com/ping?sitemap=` risponde 404 dal 2023-24, e l'Indexing API e' riservata a `JobPosting`/`BroadcastEvent`. L'unica leva vera e' il `lastmod` corretto; la sitemap e' dichiarata in `robots.txt` e registrata in Search Console.
- **Clasp:** no (script in villa-volpe-scripts).
---
*Workspace multi-progetto — vedi `PROJECTS.md` nella radice. GitHub: gh=CryptoPannoz. 🔒 Niente credenziali nei file.*
