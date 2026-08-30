#!/usr/bin/env bash
# deploy.sh — Ein-Klick-Deployment der Sun-Tracker-App auf einen VPS (statisches Hosting)
# Aufruf:  ./deploy.sh USER@VPS_IP [domain]
# Beispiel: ./deploy.sh root@203.0.113.10 suntracker.deine-domain.de

set -euo pipefail

REMOTE="${1:?Usage: $0 USER@HOST [domain]}"
DOMAIN="${2:-deine-domain.de}"
SRC="../src/Sun_Tracker_V01.html"
DEST_DIR="/var/www/suntracker"

echo "==> Deploy Sun Tracker an ${REMOTE}"

# 1. Remote-Verzeichnis anlegen
ssh "${REMOTE}" "sudo mkdir -p ${DEST_DIR} && sudo chown \$USER ${DEST_DIR}" 2>/dev/null || \
ssh "${REMOTE}" "mkdir -p ${DEST_DIR}"

# 2. App hochladen (wird zu index.html)
scp "${SRC}" "${REMOTE}:${DEST_DIR}/index.html"
echo "==> index.html hochgeladen"

# 3. nginx-Config installieren
scp nginx/suntracker.conf "${REMOTE}:/tmp/suntracker.conf"
ssh "${REMOTE}" "sudo cp /tmp/suntracker.conf /etc/nginx/sites-available/suntracker && \
  sudo sed -i 's/deine-domain.de/${DOMAIN}/g' /etc/nginx/sites-available/suntracker && \
  sudo ln -sf /etc/nginx/sites-available/suntracker /etc/nginx/sites-enabled/suntracker"

# 4. nginx testen und neu laden
ssh "${REMOTE}" "sudo nginx -t && sudo systemctl reload nginx"
echo "==> nginx aktiviert"

echo ""
echo "Fertig! App läuft: http://${DOMAIN}/"
echo "Hinweis: Für HTTPS ausführen:  certbot --nginx -d ${DOMAIN}"