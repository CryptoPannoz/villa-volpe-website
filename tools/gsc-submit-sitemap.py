#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Reinvia sitemap.xml a Google Search Console dopo il deploy.

Cosa fa davvero, senza illusioni: e' l'equivalente del pulsante "Invia" nella
UI di Search Console su una sitemap gia' registrata. **Non forza una
scansione.** Google ripassa a leggere la sitemap secondo i suoi tempi, e cio'
che gli dice quali pagine rileggere e' il <lastmod> — che tools/build-sitemap.py
tiene onesto. Questo script e' un segnale in piu', non la leva principale.

Perche' non c'e' un modo migliore: l'endpoint di ping (google.com/ping?sitemap=)
e' morto nel 2023 e risponde 404, e l'Indexing API e' riservata a JobPosting e
BroadcastEvent — usarla per articoli di blog viola i termini d'uso.

Credenziali: JSON dell'account di servizio nella variabile d'ambiente
GSC_SERVICE_ACCOUNT_JSON (secret di GitHub Actions). Mai su file nel repo.

L'account di servizio dev'essere aggiunto come **Proprietario** sulla proprieta'
in Search Console: con "Completo" l'API risponde 403.

Uso:
    GSC_SERVICE_ACCOUNT_JSON="$(cat chiave.json)" python3 tools/gsc-submit-sitemap.py
    ... --dry-run     # verifica accesso e proprieta', senza inviare

Dipendenza: google-auth (pip install google-auth)
"""
import json, os, sys, urllib.parse, urllib.request, urllib.error

SITEMAP = "https://www.villa-volpe.com/sitemap.xml"
DOMAIN = "villa-volpe.com"
SCOPE = "https://www.googleapis.com/auth/webmasters"
API = "https://www.googleapis.com/webmasters/v3"


def token():
    raw = os.environ.get("GSC_SERVICE_ACCOUNT_JSON", "").strip()
    if not raw:
        sys.exit("!! GSC_SERVICE_ACCOUNT_JSON non impostata")
    try:
        info = json.loads(raw)
    except json.JSONDecodeError as e:
        sys.exit(f"!! GSC_SERVICE_ACCOUNT_JSON non e' JSON valido: {e}")
    try:
        from google.oauth2 import service_account
        from google.auth.transport.requests import Request
    except ImportError:
        sys.exit("!! manca google-auth — installa con: pip install google-auth")
    creds = service_account.Credentials.from_service_account_info(info, scopes=[SCOPE])
    creds.refresh(Request())
    print(f"autenticato come {info.get('client_email')}")
    return creds.token


def call(method, url, tok):
    req = urllib.request.Request(url, method=method,
                                 headers={"Authorization": f"Bearer {tok}"})
    try:
        with urllib.request.urlopen(req, timeout=30) as r:
            body = r.read().decode() or ""
            return r.status, body
    except urllib.error.HTTPError as e:
        return e.code, e.read().decode(errors="replace")


def pick_property(tok):
    """Trova la proprieta' giusta: preferisce quella Dominio, altrimenti prefisso URL."""
    code, body = call("GET", f"{API}/sites", tok)
    if code == 403:
        sys.exit("!! 403 su sites.list — la Google Search Console API e' abilitata "
                 "sul progetto e l'account di servizio e' stato aggiunto in "
                 "Search Console?")
    if code != 200:
        sys.exit(f"!! sites.list ha risposto {code}: {body[:300]}")
    entries = json.loads(body or "{}").get("siteEntry", [])
    if not entries:
        sys.exit("!! l'account di servizio non vede nessuna proprieta': "
                 "aggiungilo come Proprietario in Search Console "
                 "(Impostazioni -> Utenti e autorizzazioni)")
    print("proprieta' visibili:")
    for e in entries:
        print(f"   {e['siteUrl']}  ({e.get('permissionLevel')})")
    for want in (f"sc-domain:{DOMAIN}", f"https://www.{DOMAIN}/", f"https://{DOMAIN}/"):
        for e in entries:
            if e["siteUrl"] == want:
                if e.get("permissionLevel") != "siteOwner":
                    print(f"!! attenzione: permesso '{e.get('permissionLevel')}', "
                          f"non 'siteOwner' — l'invio probabilmente fallira' con 403")
                return e["siteUrl"]
    sys.exit(f"!! nessuna proprieta' corrisponde a {DOMAIN}")


def main():
    dry = "--dry-run" in sys.argv
    tok = token()
    site = pick_property(tok)
    url = (f"{API}/sites/{urllib.parse.quote(site, safe='')}"
           f"/sitemaps/{urllib.parse.quote(SITEMAP, safe='')}")
    print(f"\nproprieta': {site}\nsitemap:    {SITEMAP}")
    if dry:
        print("\n--dry-run: non inviata")
        return 0
    code, body = call("PUT", url, tok)
    if code in (200, 204):
        print("\nsitemap reinviata (HTTP %d)" % code)
        return 0
    spiega = {
        403: "permessi insufficienti: l'account di servizio dev'essere Proprietario, non Completo",
        404: "proprieta' o sitemap non trovata: controlla che il siteUrl combaci esattamente",
    }
    print(f"\n!! invio fallito, HTTP {code}: {spiega.get(code, '')}\n{body[:300]}")
    return 1


if __name__ == "__main__":
    sys.exit(main())
