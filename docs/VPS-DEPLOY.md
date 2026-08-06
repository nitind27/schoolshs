# VPS pe Scholarship Portal chalana (Production)

Project: Next.js + custom `server.ts` (Socket.IO) + MySQL + PM2 + Nginx

**Production port:** `3010` (default). Domain Nginx se reverse-proxy hoga.

---

## 0) VPS pe pehle ye install ho

```bash
# Node 20+
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt update
sudo apt install -y nodejs nginx git

# Process manager
sudo npm i -g pm2

node -v   # v20.x+
npm -v
```

MySQL / MariaDB (same VPS pe ya remote Hostinger DB):

```bash
# Agar DB isi VPS pe hai:
sudo apt install -y mysql-server
sudo mysql_secure_installation
```

---

## 1) Code VPS pe lao

```bash
cd /var/www   # ya /home/ubuntu
git clone <YOUR_REPO_URL> scholarship-portal
# ya scp / rsync se folder upload karo
cd scholarship-portal
```

---

## 2) `.env` production values

```bash
nano .env
```

**Zaroori keys:**

```env
NODE_ENV=production
PORT=3010
HOSTNAME=0.0.0.0

# Strong random string (min 32 chars) — SMTP encrypt bhi isi pe depend karta hai
AUTH_SECRET=REPLACE_WITH_LONG_RANDOM_SECRET_32PLUS

# Public domain (localhost mat likho)
APP_URL=https://school.yourdomain.com
NEXT_PUBLIC_APP_URL=https://school.yourdomain.com

# MySQL
DB_PROVIDER=mysql
DB_HOST=127.0.0.1
# ya remote: 82.x.x.x / Hostinger host
DB_PORT=3306
DB_USER=your_db_user
DB_PASSWORD=your_db_password
DB_NAME=your_db_name

DB_CONNECTION_LIMIT=8
DB_CONNECT_TIMEOUT=30000
DB_ACQUIRE_TIMEOUT=30000
DB_IDLE_TIMEOUT=120
DB_MINIMUM_IDLE=1
DB_CHARSET=utf8mb4
DB_COLLATION=utf8mb4_unicode_ci
```

`AUTH_SECRET` generate:

```bash
openssl rand -hex 32
```

---

## 3) Dependencies + DB schema + build

```bash
cd /var/www/scholarship-portal

npm ci
# ya: npm install

# Schema DB pe push / migrate
npx prisma generate
npx prisma db push
# agar migrations folder use karte ho:
# npm run db:migrate-deploy

# Optional seed (sirf pehli baar / test)
# npm run db:seed

# Production build
npm run build
```

Playwright (sirf Auto Apply ke liye):

```bash
npx playwright install chromium
sudo npx playwright install-deps chromium
```

---

## 4) PM2 se app start (always-on)

```bash
cd /var/www/scholarship-portal

# Production start (server.ts → port 3010)
NODE_ENV=production pm2 start npm --name "school-shs" -- start

# Boot pe auto-start
pm2 save
pm2 startup
# jo command print ho use run karo (sudo ...)

pm2 status
pm2 logs school-shs --lines 80
```

Check local:

```bash
curl -I http://127.0.0.1:3010
```

`Ready on http://0.0.0.0:3010` dikhna chahiye logs me.

### Update / restart baad me

```bash
cd /var/www/scholarship-portal
git pull
npm ci
npx prisma generate
npx prisma db push
npm run build
pm2 restart school-shs --update-env
```

---

## 5) Nginx reverse proxy + HTTPS

```bash
sudo nano /etc/nginx/sites-available/school-shs
```

```nginx
server {
    listen 80;
    server_name school.yourdomain.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
    }

    # Socket.IO (chat)
    location /api/socketio/ {
        proxy_pass http://127.0.0.1:3010/api/socketio/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Enable + reload:

```bash
sudo ln -sf /etc/nginx/sites-available/school-shs /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

SSL (Let's Encrypt):

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d school.yourdomain.com
```

Phir `.env` me `APP_URL=https://school.yourdomain.com` set karke:

```bash
pm2 restart school-shs --update-env
```

---

## 6) Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80
sudo ufw allow 443
# 3010 public mat kholo — sirf localhost + Nginx
sudo ufw enable
sudo ufw status
```

---

## 7) Flutter app ke liye

Flutter `.env` / `API_BASE_URL` me **VPS domain** do:

```text
https://school.yourdomain.com
```

Localhost / `10.0.2.2` production me mat use karo.

Teacher holidays:

```http
GET https://school.yourdomain.com/api/teacher/holidays?year=2026
Authorization: Bearer <token>
```

---

## 8) Common problems

| Problem | Fix |
|--------|-----|
| `AUTH_SECRET is required` | `.env` me strong `AUTH_SECRET` + `pm2 restart --update-env` |
| DB connection refused | `DB_HOST` / password / Hostinger IP whitelist |
| `Access denied` holidays | Backend updated APIs; Flutter use `/api/teacher/holidays` |
| Site opens but chat fail | Nginx me `/api/socketio/` upgrade headers |
| 502 Bad Gateway | `pm2 status` — app down? `pm2 logs` |
| Build OOM | `NODE_OPTIONS=--max-old-space-size=4096 npm run build` |
| Auto Apply browser | See `REMOTE_BROWSER_SETUP.md` |

---

## Quick checklist

- [ ] Node 20+ + PM2 + Nginx
- [ ] `.env` — `AUTH_SECRET`, `APP_URL`, MySQL
- [ ] `npm ci` → `prisma generate` → `db push` → `npm run build`
- [ ] `pm2 start` + `pm2 save` + `pm2 startup`
- [ ] Nginx → `127.0.0.1:3010` + SSL
- [ ] Domain browser me login test
- [ ] Flutter `API_BASE_URL` = same HTTPS domain
