# Villa Volpe — sito (Lake Orta)

Sito di villa-volpe.com.
- **Repo:** github.com/CryptoPannoz/villa-volpe-website
- **Dominio:** villa-volpe.com — **Deploy: GitHub Pages** (push su `origin/main` → workflow `.github/workflows/deploy.yml`).
  - Sito statico servito da GitHub Pages: **niente redirect server-side** (i redirect legacy sono stub `<meta http-equiv="refresh">`), `Cache-Control` fisso a `max-age=600` non configurabile, nessun image CDN. Non esistono `netlify.toml`/`_redirects` e non servirebbero.
- **Foto/video:** auto-ospitati nel repo in `images/` (`images/uploads/`, `images/blog/`). Nessun CDN esterno.
- **Sitemap: non si modifica a mano.** La genera `tools/build-sitemap.py`, che gira dentro `deploy.yml` a ogni push e prende `<lastmod>` dall'ultimo commit di ogni file. Include tutte le `.html` tranne gli stub `<meta http-equiv="refresh">`, le pagine `noindex` e la lista `EXCLUDE` nello script; gli hreflang li legge dal `<head>` della pagina stessa. In locale: `python3 tools/build-sitemap.py` (oppure `--check`, che esce 1 se e' da rigenerare). Il checkout in CI usa `fetch-depth: 0` perche' altrimenti `git log` vedrebbe un solo commit.
  - Per rilanciare a Google **non esiste piu' il ping**: `google.com/ping?sitemap=` risponde 404 dal 2023-24, e l'Indexing API e' riservata a `JobPosting`/`BroadcastEvent`. L'unica leva vera e' il `lastmod` corretto; la sitemap e' dichiarata in `robots.txt` e registrata in Search Console.
- **IndexNow:** `tools/indexnow.py`, lanciato da `deploy.yml` dopo il deploy, notifica le pagine cambiate a Bing/Yandex/Naver/Seznam/Yep (**Google non aderisce**). Manda solo URL presenti in `sitemap.xml`, quindi le esclusioni valgono in automatico. La chiave e' il file `<chiave>.txt` nella root: **non e' un segreto**, il protocollo pretende che sia pubblico — non spostarlo e non rinominarlo o le notifiche tornano 403.
- **Search Console:** `tools/gsc-submit-sitemap.py` reinvia la sitemap a ogni push (e su avvio manuale). Attivo dal 31/07/2026.
  - Proprieta': **Dominio** (`sc-domain:villa-volpe.com`), non prefisso URL — lo script la rileva da solo con `sites.list`, non c'e' niente da configurare.
  - Account di servizio `gsc-sitemap-submit@villa-volpe-seo.iam.gserviceaccount.com` (progetto GCP `villa-volpe-seo`), aggiunto come **Proprietario** in Search Console: con "Completo" l'API risponde 403.
  - 🔒 La chiave privata sta **solo** nel secret GitHub `GSC_SERVICE_ACCOUNT_JSON`. Per ruotarla: crea la chiave nuova, verificala con `--dry-run`, aggiorna il secret, **poi** cancella la vecchia. Invertire l'ordine da `invalid_grant: Invalid JWT Signature`.
  - Serve `google-auth[requests]`: `google-auth` da solo non basta, il transport vuole `requests`.
  - Non illudersi: `sitemaps.submit` **non forza una scansione**, e' il pulsante "Invia" della UI. Cio' che conta resta il `<lastmod>`.
- **Clasp:** no (script in villa-volpe-scripts).
---
*Workspace multi-progetto — vedi `PROJECTS.md` nella radice. GitHub: gh=CryptoPannoz. 🔒 Niente credenziali nei file.*
