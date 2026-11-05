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
- **Chiusura invernale 2026/27** (dal 01/11/2026, voluta da Alberto): la villa è chiusa fino al **28/03/2027** e riapre ufficialmente il **29/03/2027**; d'inverno solo richieste su misura e soggiorni di medio termine via email. Si spegne tutto da solo il 29/03/2027, in tre posti:
  - *Card della chiusura* (dal 05/11/2026, prima era la fascia `.promo-bar` in cima, che Alberto trovava brutta e poco chiara) — `<aside class="season-card">` in tutte le pagine col menu, 4 lingue: nelle 4 home sta dentro `.hero__content` (`season-card--hero`, vetro scuro a destra dei bottoni su computer, sopra il titolo su telefono), nelle altre pagine compare in basso a sinistra dopo 1,2 s e si chiude con la × (`main.js` ricorda la chiusura in localStorage `vv-winter-2027-closed`). Si vede solo con la classe `has-winter` sull'`<html>`, che lo snippet inline nel `<head>` toglie dal 29/03/2027: alla riapertura sparisce da sola. Link: «See the calendar» (book.html della lingua) e l'articolo EN sul medio termine. La `.promo-bar` resta solo per `has-promo`. Script che ha fatto il cambio: `site_migrate.py` nello scratchpad della sessione (vale anche per i pacchetti in `scheduled-posts`).
  - *Menu a tre voci* (05/11/2026, Alberto: «non voglio così tanta roba lì dentro»): Home · Discover · Lake Orta (IT Scopri / Lago d'Orta, DE Entdecken / Ortasee, FR Découvrir / Lac d'Orta). Discover apre una tendina con la villa (discover.html), la storia e le FAQ; Lake Orta con Things to do (la voce stessa porta lì) e il Blog. Tendine `.nav__group` > `.nav__sub`, solo CSS (hover e focus-within, in fondo a `style.css`); voce del gruppo attiva con `nav__link--active`, la pagina aperta con `aria-current`. Nel menu del telefono ogni voce grande ha sotto una riga di voci piccole (`.mobile-menu__sub`, un `<p>` per non chiudere prima il `</div>` del menu). Il footer (`footer.js`) tiene tutte le pagine. Script del cambio: `site_menu.py` nello scratchpad della sessione. In home, subito dopo le tre card, la sezione `.home-ttd` con il ventaglio di biglietti e cartoline che porta a `things-to-do-lake-orta.html#drawer`. `style.css` ha `?v=20261105b`, `main.js` e `footer.js` `?v=20261105` in tutte le pagine (max-age 600): cambiarlo quando cambia la card o il menu.
  - *Avviso sopra il calendario* — `.winter-note` nei 4 `book.html` (stili in `booking-engine/styles.css`), visibile solo con `has-winter`.
  - *Motore* — `WINTER.reopen` in `booking-engine/calendar.js`: `addWinterClosure()` blocca ogni notte prima del 29/03/2027, quindi il calendario si apre su marzo e i chip partono dal 29. Dopo quella data non blocca più nulla.
  - Gli articoli che v5 genera dal modello `christmas-new-year-lake-orta` si portano dietro fascia e snippet: fino al 29/03 è giusto, dopo restano nascosti. Per spegnere tutto prima: togliere `has-winter` dagli `<html>` e mettere `WINTER.reopen` a oggi.
- **Motion 2026** (ottobre 2026): transizioni, foto e loop video. Tutta la logica sta in fondo a `style.css` (blocco "MOTION 2026") e in `main.js`, quindi vale per tutte le pagine e le lingue senza toccare l'HTML:
  - *Transizioni fra pagine*: View Transitions cross-document (`@view-transition`), solo Chrome/Edge/Safari recenti; la nav resta ferma, la foto della card del blog "vola" nella testata dell'articolo (`vv-hero`, nome assegnato al clic da `main.js`). Partono solo su clic vero: una navigazione da script viene saltata dal browser (e' normale).
  - *Rivelazioni*: `.vv-pre`/`.vv-in` messe da `main.js` solo sugli elementi sotto la piega (mai su cio' che e' gia' visibile: LCP invariato). Nav che si nasconde scendendo, barra di lettura negli articoli, visore a schermo intero per le foto degli articoli.
  - *Sezioni cinema* (`.vv-cinema`, `.page-header--cinema`, `.cta-banner--cinema`): loop video in `images/cinema/<nome>-{1920,1280,sq}.mp4` + poster AVIF/JPG. Sono **foto vere animate con Higgsfield (Seedance 2.0)** — si muovono solo acqua, foglie, nebbia — e montate in loop senza stacco (dissolvenza o avanti/indietro). Il video parte solo in vista (`video[data-vv-video]`), mai con Risparmio dati, 2G o `prefers-reduced-motion`. Nei post portano il badge "Foto animata".
  - *Foto nel blog*: `images/photos/<slug>-{800,1200,1800}.{avif,webp}` + `-1200.jpg`, dalla cartella Drive `VILLA VOLPE/FOTO` (Diego Cadei 2025, Vitti 2023, droni 2021). Markup: `<figure class="post-photo [post-photo--wide]"><div class="post-photo__frame"><picture>...</picture></div><figcaption>`. La testata degli articoli e' `<div class="post-hero [post-hero--compact|--narrow]"><div class="post-hero__frame">` (compact = foto di 800 px, che non vanno ingrandite).
  - Gli articoli che arrivano dal branch `scheduled-posts` o da v5 con la vecchia testata inline continuano a funzionare: per dar loro il nuovo look basta avvolgere la foto in `.post-hero` come sopra.
- **Soggiorno minimo** (dal 04/11/2026, deciso da Alberto): **5 notti tutto l'anno**, niente soggiorni da 3 o 4 notti (prima, dal 03/11, era 4 notti e 5 dal 1/8 al 21/10). Sta in `MIN_STAY` / `minNightsFor()` di `booking-engine/calendar.js` (validazione, periodi liberi e chip). v5 `/api/booking` rifiuta anche lui le richieste sotto le 5 notti (`RULES.minNights`). La scritta `.subtitle` sopra il calendario nei 4 `book.html` va cambiata insieme.
- **Anti-bot del modulo di prenotazione** (ottobre 2026): Cloudflare Turnstile. Sitekey pubblica in `BOOKING_CONFIG.turnstileSiteKey` (`booking-engine/calendar.js`), secret solo su Vercel (`TURNSTILE_SECRET_KEY` di v5), che senza token valido risponde 403 `code: "turnstile"`. Il widget (`#turnstile-widget` dentro `#guest-form` nei 4 `book.html`) nasce al passo «Dati ospite», e' invisibile salvo quando Cloudflare chiede un click (`appearance: 'interaction-only'`, `compact` sotto i 300px). Il token va nel corpo del POST come `turnstileToken` e dopo ogni invio si rinnova. Se lo script non si carica o il widget va in errore l'ospite vede un messaggio con l'email (`showBookingNotice`), mai un errore muto. **Ordine dei rilasci:** prima il sito con la sitekey vera, poi (dopo 15-20 minuti di cache) v5 che pretende il token; al contrario si bloccano tutte le richieste.
- **Feed Instagram sopra il footer** (ottobre 2026): `js/ig-feed.js`, caricato in async da `footer.js` (quindi su tutte le pagine con `#site-footer`, nelle 4 lingue), stili nel blocco "INSTAGRAM" in fondo a `style.css`. Legge `GET https://villa-volpe-v5.vercel.app/api/public/instagram` (v5 fa da proxy alle immagini) solo quando il footer arriva a ~600px dallo schermo, e crea la sezione **solo a dati arrivati**: errore, timeout di 5 s o meno di 3 post = non compare nulla. 6 riquadri (3 se i post validi sono 3-5). Per provarlo in locale: `window.VV_IG_FEED_URL = '<url del JSON finto>'` prima di scendere al footer. Per spegnerlo: togliere le righe che caricano `js/ig-feed.js` in fondo a `footer.js`.
- **Pianta interattiva** (dal 04/11/2026, voluta da Alberto): sezione `#floor-plan` in cima alle 4 `discover.html`
  (prima di «Esterni», `section--alt`; le gallerie hanno ora gli id `outdoor`, `bedrooms`, `living`, `bathroom`).
  Immagine `images/plan/villa-volpe-plan.webp` (2048×1638): la pianta di `scripts/villa-plan.py` del repo v5
  (planimetria del manuale 2025 + foto + correzioni di Alberto del 04/11/2026) resa da `scripts/villa-plan-render.py`
  di v5; dal 05/11/2026 l'esterno segue la foto del drone (parcheggio sul tetto lastricato a est, senza auto, giardino triangolare
  con l'albero, muro di pietra in diagonale, scala di pietra al lago, vialetto e tavolo di legno a nord) e la lavatrice
  non è più disegnata. L'inquadratura sta in `xy()`, quindi le coordinate dei punti restano quelle della planimetria
  (come `planXY` in v5); immagine, script e `style.css` hanno `?v=` nei link delle `discover.html`, da cambiare a ogni
  nuova pianta (cache di 10 minuti). Punti (Alberto, 05/11/2026): 1 parcheggio, 2 soggiorno (due foto, `photos`, da
  scorrere con i puntini), 3 cucina (foto della cucina ad angolo), 4 camera 1 = nord-est col quadro dei pesci, 5 camera
  2 = sud con la portafinestra sul lago, 6 bagno, 7 ingresso con vista lago all'angolo dove scende la rampa (al posto
  della terrazza), 8 doccia esterna vicino all'angolo della casa (foto vera, `outdoor-shower-stone-sink`), 9 accesso
  privato al lago. Visore `js/vv-plan.js` (punti, testi nelle 4 lingue
  e foto delle gallerie, scheda accanto; la lente è stata tolta su richiesta di Alberto) e stili nel blocco «PIANTA INTERATTIVA» in fondo a `style.css`. Sul sito solo
  stanze ed esterni: niente punti tecnici (caldaia, quadro, router), che stanno solo nella guida ospiti di v5.
- **Things to do: «il cassetto dei biglietti»** (dal 04/11/2026, voluto da Alberto): le 14 «scelte di casa» sono i
  biglietti da visita veri che Alberto teneva in villa (scansione `VILLA VOLPE/volpe biglietti visita.pdf`).
  - *Cassetto* (`#drawer`, sopra la mappa): `js/ttd-drawer.js` costruisce il tavolo dalle
    schede `article[data-pick]` che hanno `img.ttd-card__img--card` (`images/things-to-do/cards/<id>.webp`). Desktop:
    carte sparse, trascinabili, «Mescola», filtri per categoria; telefono: fila da scorrere. Tocco → la carta si gira
    (`<dialog>`): distanza dalla villa, Chiama, Indicazioni, Sito, Sulla mappa (`window.VVTtd.focus(id)` di
    `things-to-do.js`), Condividi. Link diretto `#card-<id>`. Etichette nelle 4 lingue in `data-t-*` della sezione.
  - Sulla scheda: `data-maps` (Google Maps `?cid=`), `data-walk` / `data-drive` (minuti dalla villa), `data-pickup`
    (il taxi), `data-drawer-cat` (scheda in un'altra scheda del cassetto: i motoscafi stanno «sul lago»).
  - Scansioni: ritagliate e ridotte; coperti col colore della carta il vecchio sito di Venus (oggi un casinò) e il
    vecchio numero dell'e-bike; tagliato dal taxi il numero di Marcello (ditta chiusa). Esclusi Nordic Walking e la
    fotografa (non confermati) e i tre locali di Verbania (sono nella guida ospiti v5, non su questa pagina).
  - **La nostra n.1** (Alberto, 04/11/2026): Taverna Antico Agnello (Villa Nigra, Miasino; Lilli è amica di Alberto e
    accoglie gli ospiti di Villa Volpe). Scheda con `data-top`, prima di «Dove mangiare», a tutta riga; la sua foto
    della limonaia (dal sito di Villa Nigra, «Foto: Villa Nigra») fa da carta al centro del tavolo e riempie il
    riquadro `[data-top-slot]` in testa al cassetto. Tolto Hotel San Rocco
    (Alberto), L'Ustaria Cà dal Rat è «scelta di casa» (9 minuti a piedi lungo la riva).
  - **Testata** (`header.ttd-hero`, 04/11/2026 sera, Alberto: «troppo testo, doppia scritta»): solo l'H1 piccolo
    in alto («Things to do on Lake Orta», resta per Google), una frase grande («Our lake, card by card»), il pulsante
    «Open the drawer» e il ventaglio `[data-fan]` di 5 biglietti veri che spuntano dal bordo (ids nell'attributo,
    costruito da `ttd-drawer.js`, tocco = la carta si gira). Il vecchio paragrafo d'introduzione è in fondo
    (`p.ttd-about`, prima del link al blog); il cassetto apre con una riga sola (`h2.ttd-drawer__line`) e i numeri.
  - **Cartoline nel cassetto** (04/11/2026, Alberto: niente farmacia e officina sul tavolo, più posti belli): le schede
    con `data-postcard` (isola, Sacro Monte, Madonna del Sasso, Anello Indaco, Torre di Buccione, Qualba) vanno sul
    tavolo come cartoline, scheda «Cartoline»; i servizi `practical` (taxi) restano solo nella lista; farmacia e
    officina non sono più «scelte di casa». Tolta «Una giornata da locale» (Alberto: non ha senso). Immagine social
    `og-cartoline.jpg` (solo foto nostre o senza diritti, niente crediti da mettere).
  - Foto nelle schede `img.ttd-card__img` (`images/things-to-do/photos/`), solo dove la foto è davvero quel posto.
    Dal 04/11/2026 sono «cartoline»: `figure.ttd-postcard` (cornice, francobollo 🦊, timbro «Lago d'Orta»). Quelle
    prese da Wikimedia Commons (Sacro Monte CC0, Madonna del Sasso pubblico dominio, Torre di Buccione, Monte Mesma,
    Monte Falò, Mottarone, Villa Crespi, kayak, Anello Indaco: CC BY-SA) hanno il credito obbligatorio nel
    `figcaption` (autore → pagina del file, licenza → testo della licenza): non toglierlo. Senza foto vera, niente foto
    (museo dell'ombrello, Pescone, Cappella del Vago, parco Le Pigne).
    Immagine social `images/things-to-do/og-cassetto.jpg`. Filtri della mappa fissi in alto con i conteggi.
- **Clasp:** no (script in villa-volpe-scripts).
---
*Workspace multi-progetto — vedi `PROJECTS.md` nella radice. GitHub: gh=CryptoPannoz. 🔒 Niente credenziali nei file.*
