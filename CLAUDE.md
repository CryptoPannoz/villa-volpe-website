# Villa Volpe — sito (Lake Orta)

Sito di villa-volpe.com.
- **Repo:** github.com/CryptoPannoz/villa-volpe-website
- **Dominio:** villa-volpe.com — **Deploy: GitHub Pages** (push su `origin/main` → workflow `.github/workflows/deploy.yml`).
  - Sito statico servito da GitHub Pages: **niente redirect server-side** (i redirect legacy sono stub `<meta http-equiv="refresh">`), `Cache-Control` fisso a `max-age=600` non configurabile, nessun image CDN. Non esistono `netlify.toml`/`_redirects` e non servirebbero.
- **Foto/video:** auto-ospitati nel repo in `images/` (`images/uploads/`, `images/blog/`). Nessun CDN esterno.
- **Clasp:** no (script in villa-volpe-scripts).
---
*Workspace multi-progetto — vedi `PROJECTS.md` nella radice. GitHub: gh=CryptoPannoz. 🔒 Niente credenziali nei file.*
