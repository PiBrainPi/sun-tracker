#!/usr/bin/env bash
# deploy_vercel.sh — Deploy des Sun Trackers (sonne.ingenieur-tools.de) nach Vercel (Production).
# Migration 20.09.2026: Sun Tracker lebt auf Vercel (Team pi-brain, Projekt sun-tracker).
#
# Verwendung:
#   bash scripts/deploy_vercel.sh          # Deploy gh-pages-Stand → Production
#
# Voraussetzungen:
#   - Token-Datei ~/.config/vercel_token (chmod 600)
#   - Deploy-Quelle: gh-pages-Stand des Repos (index.html) in einem Ordner mit
#     .vercel/project.json → Projekt "sun-tracker"
#
# Deploy-Reihenfolge (Regel 5): Änderungen prüfen + Freigabe, DANN deployen.

set -euo pipefail
TOKEN_FILE="$HOME/.config/vercel_token"

if [ ! -f "$TOKEN_FILE" ]; then
  echo "❌ Token-Datei fehlt: $TOKEN_FILE" >&2
  exit 1
fi
TOKEN="$(cat "$TOKEN_FILE")"

DEPLOY_DIR="$(mktemp -d)"
git -C "$(cd "$(dirname "$0")/.." && pwd)" archive gh-pages | tar -x -C "$DEPLOY_DIR"
rm -f "$DEPLOY_DIR/CNAME"
mkdir -p "$DEPLOY_DIR/.vercel"
cat > "$DEPLOY_DIR/.vercel/project.json" <<'EOF'
{"projectId":"prj_fMTjPNxqt1etbZ1Abgjrq2JrUxBi","orgId":"team_PIuJWDNsvKdNogMgAPQOUilp","projectName":"sun-tracker"}
EOF

cd "$DEPLOY_DIR"
echo "➜ Vercel-Deploy (Production) …"
npx --yes vercel@latest deploy --prod --yes --token "$TOKEN"

echo ""
echo "✅ Deploy fertig. Verifikation:"
echo "   https://sonne.ingenieur-tools.de/"
