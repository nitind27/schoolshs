#!/bin/bash
# Run on VPS as root or with sudo — restarts Xvfb + x11vnc + websockify for noVNC
set -e

DISPLAY_NUM="${DISPLAY_NUM:-:99}"
VNC_PORT="${VNC_PORT:-5901}"
WS_PORT="${WS_PORT:-6080}"
SCREEN="${SCREEN:-1366x768x24}"

echo "=== Stopping old processes ==="
pkill -f "Xvfb $DISPLAY_NUM" 2>/dev/null || true
pkill -f "x11vnc.*$DISPLAY_NUM" 2>/dev/null || true
pkill -f "websockify.*$WS_PORT" 2>/dev/null || true
sleep 1

echo "=== Starting Xvfb on $DISPLAY_NUM ==="
Xvfb "$DISPLAY_NUM" -screen 0 "$SCREEN" -ac &
sleep 2

echo "=== Starting x11vnc on port $VNC_PORT ==="
x11vnc -display "$DISPLAY_NUM" -localhost -forever -shared -rfbport "$VNC_PORT" -nopw &
sleep 2

echo "=== Starting websockify on port $WS_PORT ==="
if [ -d /usr/share/novnc ]; then
  websockify --web=/usr/share/novnc/ "$WS_PORT" "localhost:$VNC_PORT" &
else
  websockify "$WS_PORT" "localhost:$VNC_PORT" &
fi
sleep 2

echo "=== Status ==="
pgrep -a Xvfb || echo "WARNING: Xvfb not running"
pgrep -a x11vnc || echo "WARNING: x11vnc not running"
pgrep -a websockify || echo "WARNING: websockify not running"

if curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:$WS_PORT/" | grep -q 200; then
  echo "OK: websockify HTTP on $WS_PORT"
else
  echo "FAIL: websockify not responding on $WS_PORT"
fi

echo ""
echo "Restart app with display:"
echo "  DISPLAY=$DISPLAY_NUM pm2 restart all --update-env"
echo ""
echo "Test in browser:"
echo "  https://school.codeatinfotech.com/remote-browser/vnc.html?autoconnect=true&host=school.codeatinfotech.com&port=443&path=remote-browser/websockify"
