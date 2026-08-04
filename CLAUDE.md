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
- **Promo autunno 2026** (attiva dal 03/08/2026): **tre** settimane a prezzo fisso, 1.540 € a settimana tutto incluso, saldo immediato e non rimborsabile. **Le scadenze sono due, e la differenza è voluta:**
  - 11→18 e 18→25 ottobre: prenotabili **fino al 30/09**.
  - 1→8 novembre (herfstvakantie fiamminga 2-8/11, si arriva la domenica prima): prenotabile **fino al 25/10**, perché le famiglie fiamminghe decidono tardi. Sono 7 notti: 2→8 novembre sarebbero 6.
  - Di conseguenza `PROMO.expires` (26/10) **non coincide** con la data nello snippet inline delle pagine (01/10): la fascia in cima al sito nomina solo le settimane di ottobre, quindi si spegne prima o mentirebbe. Non "allinearle": è una divergenza intenzionale.

  Vive in questi posti, da tenere allineati a mano:
  - *Fascia in cima al sito* — HTML statico in tutte le 130 pagine reali (fuori: `404.html`, `email-signature.html`, gli stub `refresh`). Si vede solo se `<html>` ha `class="has-promo"`; uno snippet inline nel `<head>` la toglie a scadenza. È inline e sincrono di proposito: nasconderla da JS dopo il primo paint farebbe saltare la pagina di 44px e il CLS non sarebbe più 0. Stile in `style.css` (`.promo-bar`, `--promo-h`).
  - *Motore di prenotazione* — oggetto `PROMO` in cima a `booking-engine/calendar.js`: date, prezzo, scadenza. Da lì escono i chip dedicati fra gli "available periods", il prezzo nel riepilogo e il blocco condizioni che **sostituisce** acconto 30% + rimborso a 21 giorni (le condizioni standard restano stampate sotto, non si nascondono).
  - *Contenuti promo dentro le pagine* (dal 04/08/2026, push mercati FR/BE): box `.promo-box` e testi `.promo-only` in `fr/blog/posts/beaches-lake-orta.html`, `fr/blog/posts/vacances-toussaint-lac-orta.html` e `blog/posts/ortameer-stranden-en-zwemplekken.html` (post in neerlandese), stili in `style.css` accanto a `.promo-bar`. Si spengono da soli via `has-promo` come la fascia, ma **alla rimozione della promo vanno tolti anche loro** (`grep -rl "promo-box\|promo-only\|promo-nov-only"`). L'articolo Toussaint resta valido anche senza offerta (è una guida a ottobre), va solo ripulito delle parti promo.
  - *Blocco novembre* — solo nel post NL: classe `has-promo-nov` sull'`<html>` e contenuti `.promo-nov-only`, con un **secondo** snippet inline nel `<head>` che la toglie il 26/10. Serve perché quel blocco deve sopravvivere alla fascia: `.has-promo-nov .promo-nov-only .promo-box` riaccende il box, che di suo dipende da `has-promo`.
  - **Per spegnerla in anticipo:** `PROMO.active = false` **e** togliere `has-promo`/`has-promo-nov` dagli `<html>`.
  - Le richieste arrivano con l'offerta in testa a `specialRequests` (più i campi `promo`/`promoPrice`): così finisce nella mail e nella colonna NOTE del foglio **senza ridistribuire l'Apps Script**, che ignorerebbe campi nuovi.
- **Clasp:** no (script in villa-volpe-scripts).
---
*Workspace multi-progetto — vedi `PROJECTS.md` nella radice. GitHub: gh=CryptoPannoz. 🔒 Niente credenziali nei file.*
