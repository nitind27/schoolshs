#!/bin/bash
# One-time install on VPS — auto-start remote browser on boot + auto-restart on crash
# Usage: sudo bash scripts/install-remote-browser-service.sh /actual/path/to/scholarship-portal

set -e

APP_DIR="${1:-$(cd "$(dirname "$0")/.." && pwd)}"
SERVICE_NAME="school-remote-browser"
SERVICE_FILE="/etc/systemd/system/${SERVICE_NAME}.service"

echo "App directory: $APP_DIR"

# Patch service file with actual path
sed "s|/opt/scholarship-portal|$APP_DIR|g" "$APP_DIR/scripts/remote-browser.service" > /tmp/${SERVICE_NAME}.service
cp /tmp/${SERVICE_NAME}.service "$SERVICE_FILE"

chmod +x "$APP_DIR/scripts/remote-browser-start.sh"
chmod +x "$APP_DIR/scripts/remote-browser-check.sh"

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
systemctl restart "$SERVICE_NAME"

echo ""
echo "=== Installed & started: $SERVICE_NAME ==="
systemctl status "$SERVICE_NAME" --no-pager || true

echo ""
echo "PM2: set DISPLAY in ecosystem or run once:"
echo "  DISPLAY=:99 pm2 restart all --update-env"
echo ""
echo "Test: https://school.codeatinfotech.com/remote-browser/vnc.html"
