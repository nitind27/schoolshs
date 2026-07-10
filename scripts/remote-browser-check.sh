#!/bin/bash
# Quick health check — run on VPS
WS_PORT="${WS_PORT:-6080}"
VNC_PORT="${VNC_PORT:-5901}"

echo "--- Processes ---"
pgrep -a Xvfb || echo "Xvfb: NOT RUNNING"
pgrep -a x11vnc || echo "x11vnc: NOT RUNNING"
pgrep -a websockify || echo "websockify: NOT RUNNING"

echo ""
echo "--- Ports ---"
ss -tlnp | grep -E ":$WS_PORT|:$VNC_PORT" || echo "Ports $WS_PORT / $VNC_PORT not listening"

echo ""
echo "--- HTTP checks ---"
curl -s -o /dev/null -w "localhost:$WS_PORT/ => %{http_code}\n" "http://127.0.0.1:$WS_PORT/" || echo "websockify HTTP failed"
curl -s -o /dev/null -w "localhost:$WS_PORT/websockify => %{http_code}\n" "http://127.0.0.1:$WS_PORT/websockify" || echo "websockify path failed"
