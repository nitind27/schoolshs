# VPS Remote Browser Setup (Client Login)

Use this when Auto Apply runs on VPS and client needs to enter CAPTCHA/OTP from browser.

## 1) Install packages on VPS

```bash
sudo apt update
sudo apt install -y xvfb x11vnc novnc websockify
```

## 2) Start virtual display + VNC

```bash
# Display :99 for Playwright
Xvfb :99 -screen 0 1366x768x24 -ac &

# Expose VNC on localhost only
x11vnc -display :99 -localhost -forever -shared -rfbport 5901 -nopw &
```

## 3) Start web VNC proxy

```bash
websockify --web=/usr/share/novnc/ 6080 localhost:5901 &
```

## 4) Reverse proxy from your domain (Nginx)

```nginx
location /remote-browser/ {
  proxy_pass http://127.0.0.1:6080/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
}
```

Reload nginx after changes.

## Troubleshooting (noVNC error / connect failed)

**Symptom:** `vnc.html` opens but shows *"noVNC encountered an error"* — worked yesterday, fails today.

**Cause:** VPS reboot or process crash stops `x11vnc` / `websockify`. The HTML page may still load (static files) but WebSocket `/remote-browser/websockify` returns **404** or fails.

**Fix on VPS (SSH):**

```bash
cd /path/to/scholarship-portal
chmod +x scripts/remote-browser-start.sh scripts/remote-browser-check.sh
./scripts/remote-browser-check.sh    # see what is down
sudo ./scripts/remote-browser-start.sh   # restart all
DISPLAY=:99 pm2 restart all --update-env
```

**Verify nginx proxies to websockify (not static files only):**

```nginx
location /remote-browser/ {
  proxy_pass http://127.0.0.1:6080/;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection "upgrade";
  proxy_set_header Host $host;
  proxy_read_timeout 86400;
}
```

Do **not** use `alias /usr/share/novnc/` alone — that serves HTML but breaks WebSocket.

**Auto-start after reboot:** add to crontab `@reboot` or systemd service calling `remote-browser-start.sh`.

## Permanent fix — roj restart NAHI (one-time setup)

**Nahi**, har din manually restart karne ki zarurat nahi — agar ek baar systemd service install kar do:

```bash
# VPS par SSH — sirf EK BAAR
cd /path/to/scholarship-portal
sudo bash scripts/install-remote-browser-service.sh
DISPLAY=:99 pm2 restart all --update-env
```

Iske baad:
- **Server reboot** ho → services **khud** start
- **Process crash** ho → **10 sec** me auto-restart
- **Roz** kuch karne ki zarurat **nahi**

| Event | Bina setup | Systemd ke baad |
|-------|------------|-----------------|
| VPS reboot (weekly/monthly) | ❌ Fail | ✅ Auto start |
| x11vnc crash | ❌ Fail | ✅ Auto restart |
| Normal daily use | ✅ Chalta rahega | ✅ Chalta rahega |

**PM2 bhi permanent display ke saath:**

```bash
# ecosystem.config.js ya pm2 start me:
env: { DISPLAY: ":99" }
```

Ya `pm2 save` ke baad startup hook me `DISPLAY=:99` set karo.

## 5) Configure app env

```env
REMOTE_BROWSER_URL=https://school.codeatinfotech.com/remote-browser/vnc.html
REMOTE_BROWSER_LABEL=Open VPS Browser
```

Then restart app process.

## 6) Runtime note

- Run app/PM2 with `DISPLAY=:99` so automation browser opens on virtual display.
- Example: `DISPLAY=:99 pm2 restart school-shs --update-env`
