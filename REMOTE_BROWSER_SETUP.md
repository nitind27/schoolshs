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

## 5) Configure app env

```env
REMOTE_BROWSER_URL=https://school.codeatinfotech.com/remote-browser/vnc.html
REMOTE_BROWSER_LABEL=Open VPS Browser
```

Then restart app process.

## 6) Runtime note

- Run app/PM2 with `DISPLAY=:99` so automation browser opens on virtual display.
- Example: `DISPLAY=:99 pm2 restart school-shs --update-env`
