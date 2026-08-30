# Deploy — VPS-Deployment für Sun Tracker

Die App ist ein **Single-File-HTML** — reines statisches Hosting.

## Voraussetzungen
- VPS mit nginx (oder Apache/Caddy)
- Domain + SSL (Let's Encrypt / Certbot)
- SSH-Zugang

## Deployment
```bash
# 1. Datei auf VPS kopieren
scp ../src/Sun_Tracker_V0X.html user@vps:/var/www/suntracker/index.html

# 2. nginx-Konfiguration aktivieren
scp nginx/suntracker.conf user@vps:/etc/nginx/sites-available/
ssh user@vps "ln -sf /etc/nginx/sites-available/suntracker.conf /etc/nginx/sites-enabled/ && nginx -t && systemctl reload nginx"
```

## Struktur
```
deploy/
├── nginx/
│   └── suntracker.conf   # nginx-Server-Block (wird erstellt)
└── scripts/
    └── deploy.sh          # Automatisiertes Deploy-Skript (wird erstellt)
```

## Hinweise
- SSL-Zertifikat via Certbot: `certbot --nginx -d deinedomain.de`
- Caching-Header für die HTML-Datei sinnvoll (max-age kurz halten, da App weiterentwickelt wird)