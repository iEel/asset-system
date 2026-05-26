# Deployment Guide: Ubuntu Server + Cloudflare Tunnel

Last verified: 2026-05-20

คู่มือนี้ออกแบบสำหรับโปรเจกต์ Asset Management System นี้โดยตรง:

- Next.js 16.2.4 App Router
- `next.config.ts` ใช้ `output: "standalone"`
- Runtime ใช้ SQL Server ผ่าน `@prisma/adapter-mssql`
- Upload files อยู่ผ่าน `UPLOAD_DIR`
- Public access ผ่าน Cloudflare Tunnel ไปยัง Nginx reverse proxy ที่ `http://127.0.0.1:8080`
- Nginx proxy ต่อเข้า Next.js standalone ที่ `http://127.0.0.1:3000`

ตัวอย่างในคู่มือนี้ใช้:

| ค่า | ตัวอย่าง |
|---|---|
| Domain | `asset.company.com` |
| App user | `assetapp` |
| App path | `/var/www/asset-system/app` |
| Env file | `/var/www/asset-system/env/asset-system.env` |
| Upload path | `/var/www/asset-system/uploads` |
| Local app port | `3000` |
| Local Nginx proxy port | `8080` |
| Cloudflare Tunnel name | `asset-system` |

เปลี่ยนค่าเหล่านี้ให้ตรงกับ production จริงก่อนรันคำสั่ง

หมายเหตุ: คู่มือนี้วางทุกอย่างไว้ใต้ `/var/www/asset-system` แต่แยกเป็น `app`, `env`, และ `uploads` เพื่อไม่ให้ code, secret, และไฟล์ข้อมูลปนกัน ยังไม่ได้ใช้ `/var/www/html` และไม่ได้ให้ Nginx serve directory นี้โดยตรง เพราะ traffic production จะเข้าผ่าน Cloudflare Tunnel ไปยัง Nginx reverse proxy ที่ `127.0.0.1:8080` แล้ว Nginx ค่อยส่งต่อไป Next.js ที่ `127.0.0.1:3000`

---

## 1. Prerequisites

เตรียมสิ่งเหล่านี้ก่อนเริ่ม:

1. Ubuntu Server 22.04 LTS หรือ 24.04 LTS
2. Domain อยู่ใน Cloudflare แล้ว และ nameserver ชี้เข้า Cloudflare
3. Server เชื่อมต่อ SQL Server ได้
4. มี GitHub access สำหรับ repo `iEel/asset-system`
5. มี Cloudflare account ที่สร้าง Tunnel ได้
6. มีค่า production secret เช่น `AUTH_SECRET`, DB password, LDAP password

ตรวจ network จาก Ubuntu ไป SQL Server:

```bash
nc -vz <DB_SERVER> 1433
```

ถ้า SQL Server ใช้ named instance เช่น `<DB_INSTANCE>` และไม่ได้ fix TCP port ไว้ อาจต้องเปิด SQL Browser UDP 1434 หรือแนะนำให้ตั้ง SQL Server instance เป็น static TCP port แล้วใช้ `DB_PORT` แทน `DB_INSTANCE` ใน production เพื่อให้ deploy บน Linux คาดเดาง่ายกว่า

---

## 2. Prepare Ubuntu

```bash
sudo apt-get update
sudo apt-get upgrade -y
sudo apt-get install -y curl ca-certificates git build-essential ufw netcat-openbsd
```

ตั้ง firewall แบบไม่เปิด port app ออก Internet:

```bash
sudo ufw allow OpenSSH
sudo ufw --force enable
sudo ufw status
```

Cloudflare Tunnel ใช้ outbound connection เป็นหลัก จึงไม่ต้องเปิด inbound port `3000` หรือ `8080`

---

## 3. Install Node.js

ใช้ Node.js LTS รุ่น 22 หรือใหม่กว่า ตัวอย่างนี้ใช้ NodeSource 22.x:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v
npm -v
```

ถ้าองค์กรมี standard package mirror หรือใช้ Node 24 LTS อยู่แล้ว ใช้ตามมาตรฐานองค์กรได้ แต่ต้องตรวจว่า `npm run build` ผ่าน

---

## 4. Create App User And Directories

```bash
sudo useradd --system --create-home --home-dir /var/www/asset-system --shell /bin/bash assetapp
sudo mkdir -p /var/www/asset-system/app
sudo mkdir -p /var/www/asset-system/env
sudo mkdir -p /var/www/asset-system/uploads
sudo chown -R assetapp:assetapp /var/www/asset-system
sudo chown root:assetapp /var/www/asset-system/env
sudo chmod 750 /var/www/asset-system/env
```

---

## 5. Clone The Repository

ถ้า repo เป็น private ให้ตั้ง deploy key หรือใช้ GitHub token ตาม policy องค์กรก่อน

```bash
sudo -u assetapp git clone https://github.com/iEel/asset-system.git /var/www/asset-system/app
cd /var/www/asset-system/app
sudo -u assetapp git status
```

---

## 6. Create Production Environment File

สร้าง env file:

```bash
sudo nano /var/www/asset-system/env/asset-system.env
```

ตัวอย่าง:

```env
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3000
WEB_PORT=3000
NEXT_PUBLIC_APP_NAME="Asset Management System"

AUTH_URL=https://asset.company.com
NEXTAUTH_URL=https://asset.company.com
AUTH_TRUST_HOST=true
AUTH_SECRET=<CHANGE_ME>
NEXTAUTH_SECRET=<CHANGE_ME>

UPLOAD_DIR=/var/www/asset-system/uploads

# Optional PDF Thai font override. Leave blank to use bundled Noto Sans Thai fonts from public/fonts.
PDF_THAI_FONT_REGULAR=
PDF_THAI_FONT_BOLD=

MAINTENANCE_PM_GENERATION_TOKEN=<CHANGE_ME>
NOTIFICATION_DIGEST_TOKEN=<CHANGE_ME>
NOTIFICATION_DIGEST_WEBHOOK_URL=

BACKUP_STATUS=unknown
BACKUP_LAST_RUN_AT=
BACKUP_LAST_RESTORE_TEST_AT=

DB_SERVER=<DB_SERVER>
DB_INSTANCE=<DB_INSTANCE>
DB_PORT=1433
DB_TLS_SERVER_NAME=<DB_TLS_SERVER_NAME>
DB_USER=<DB_USER>
DB_PASSWORD=<DB_PASSWORD>
DATABASE_URL="sqlserver://<DB_SERVER>;instanceName=<DB_INSTANCE>;port=1433;database=<DB_NAME>;user=<DB_USER>;password=<DB_PASSWORD>;encrypt=true;trustServerCertificate=true"

LDAP_ENABLED=false
LDAP_URL="ldap://dc.company.local:389"
LDAP_BASE_DN="DC=company,DC=local"
LDAP_BIND_DN=
LDAP_BIND_PASSWORD=
LDAP_USER_FILTER=(&(objectClass=user)(sAMAccountName={username}))
LDAP_START_TLS=false
LDAP_TLS_REJECT_UNAUTHORIZED=true
LDAP_UPN_DOMAIN=
LDAP_DOMAIN=
LDAP_USER_DN_TEMPLATE=
LDAP_AUTO_PROVISION=false
LDAP_DEFAULT_ROLE=employee
LDAP_SYNC_ENABLED=false
LDAP_SYNC_BASE_DN=
LDAP_SYNC_FILTER=(&(objectCategory=person)(objectClass=user)(employeeID=*)(company=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))
LDAP_SYNC_MODE=preview
LDAP_SYNC_SCHEDULE=0 2 * * *
LDAP_SYNC_TOKEN=<CHANGE_ME>
LDAP_TIMEOUT_MS=8000
LDAP_CONNECT_TIMEOUT_MS=8000
```

Generate secret:

```bash
openssl rand -base64 32
```

ตั้ง permission:

```bash
sudo chown root:assetapp /var/www/asset-system/env/asset-system.env
sudo chmod 640 /var/www/asset-system/env/asset-system.env
```

หมายเหตุสำคัญ:

- Runtime ของระบบใช้ `DB_SERVER`, `DB_INSTANCE` หรือ `DB_PORT`, `DB_TLS_SERVER_NAME`, `DB_USER`, `DB_PASSWORD` เป็นค่าหลักในการต่อ SQL Server
- `DATABASE_URL` ยังจำเป็น เพราะโค้ด parse ชื่อ database จาก `database=...`; ให้ชื่อ database ตรงกับ `DB_*` เสมอ
- ถ้าใช้ named instance เหมือนเครื่อง dev ปัจจุบัน ให้ใส่ `DB_INSTANCE=<DB_INSTANCE>`; runtime จะไม่ใช้ `DB_PORT` เมื่อมี `DB_INSTANCE`
- ถ้าใช้ static TCP port ใน production ให้ปล่อย `DB_INSTANCE=` ว่าง แล้วใช้ `DB_PORT=1433`; ในกรณีนี้ให้เปลี่ยน `DATABASE_URL` เป็นรูปแบบ `sqlserver://<DB_SERVER>:1433;database=<DB_NAME>;...`
- ถ้า `LDAP_AUTO_PROVISION=true`, `LDAP_DEFAULT_ROLE` ต้องเป็น role ที่มีอยู่จริง เช่น `employee`, `viewer`, หรือ role ที่สร้างเองในหน้า Roles; ค่า `asset_user` จะใช้ได้เฉพาะเมื่อสร้าง role นี้แล้ว
- `UPLOAD_DIR` ควรเป็น absolute path เพื่อไม่ผูกกับ `.next/standalone` และ user `assetapp` ต้องอ่าน/เขียนได้ เพราะหน้า Storage Governance จะ scan ไฟล์จริงใน directory นี้
- PDF ภาษาไทยจะหา font ตามลำดับ: `PDF_THAI_FONT_REGULAR`, bundled `public/fonts/NotoSansThai-*.ttf`, bundled `public/fonts/Sarabun-*.ttf`, Ubuntu Noto fonts ถ้ามีติดตั้งไว้, Windows Tahoma, แล้วค่อย fallback เป็น Helvetica
- Repo นี้ bundle `NotoSansThai-Regular.ttf` และ `NotoSansThai-Bold.ttf` ไว้ใน `public/fonts` แล้ว ภายใต้ SIL Open Font License ใน `public/fonts/OFL.txt`; หลัง build ต้อง copy `public` เข้า `.next/standalone/` ตามหัวข้อ 7 เพื่อให้ runtime เห็น font
- ถ้าองค์กรมี font ไทยมาตรฐาน ให้ตั้ง `PDF_THAI_FONT_REGULAR` และ `PDF_THAI_FONT_BOLD` เป็น absolute path ของ `.ttf` บน server
- `MAINTENANCE_PM_GENERATION_TOKEN` และ `LDAP_SYNC_TOKEN` ใช้สำหรับ systemd scheduler heartbeat ควรเป็น random token ยาว ๆ และไม่ซ้ำกับ secret อื่น
- `NOTIFICATION_DIGEST_TOKEN` ใช้สำหรับรัน daily notification digest ผ่าน script/API แยกจาก scheduler heartbeat
- `NOTIFICATION_DIGEST_WEBHOOK_URL` เป็น optional generic webhook สำหรับส่ง digest ออกช่องทางภายนอก เช่น gateway ของ Teams/LINE; ถ้าเว้นว่าง ระบบยังสร้าง in-app notification ได้ตามปกติ
- `BACKUP_STATUS`, `BACKUP_LAST_RUN_AT`, และ `BACKUP_LAST_RESTORE_TEST_AT` เป็น optional readiness signal สำหรับหน้า `/th/admin/readiness` เท่านั้น ไม่ได้ทำ backup/restore ให้เอง ถ้ายังไม่มีระบบรายงานสถานะ backup ให้ปล่อย `unknown`/ว่างไว้ และวางแผนทดสอบ restore ก่อนเปิดใช้งานจริง

---

## 7. Install Dependencies And Build

ติดตั้ง dependencies และ generate Prisma Client:

```bash
cd /var/www/asset-system/app
sudo -u assetapp npm ci
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npx prisma generate'
```

Build โดย source production env ภายใต้ user `assetapp`:

```bash
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npm run build'
```

โปรเจกต์นี้ใช้ Next.js standalone output ดังนั้นหลัง build ให้ copy static assets เข้า standalone runtime:

```bash
sudo -u assetapp mkdir -p .next/standalone/.next
sudo -u assetapp cp -r public .next/standalone/
sudo -u assetapp cp -r .next/static .next/standalone/.next/
```

---

## 8. Prepare Or Update Database Schema

ก่อนแตะ production database ให้ backup ก่อนทุกครั้ง

ถ้าเป็น DB ใหม่:

```bash
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npx prisma db push'
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npx tsx prisma/seed.ts'
```

ถ้าเป็น DB เดิมที่มีข้อมูลจริง:

```bash
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npx prisma db push'
```

หมายเหตุ:

- ปัจจุบัน repo นี้ใช้ `prisma db push` เป็นหลัก ยังไม่มี migration history production-grade
- ห้ามรัน `npm run cleanup:test-data -- --apply` บน production
- ถ้ามีข้อมูลจริงแล้ว ให้ backup SQL Server และ `/var/www/asset-system/uploads` ก่อน deploy ทุกครั้ง

---

## 9. Smoke Test Standalone Server

ลองรัน manual ก่อนทำ systemd:

```bash
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app/.next/standalone && set -a && . /var/www/asset-system/env/asset-system.env && set +a && node server.js'
```

เปิด shell อีกอันแล้วทดสอบ:

```bash
curl -I http://127.0.0.1:3000/th/login
```

หยุด manual server ด้วย `Ctrl+C`

---

## 10. Create systemd Service For The App

สร้าง service:

```bash
sudo nano /etc/systemd/system/asset-system.service
```

ใส่:

```ini
[Unit]
Description=Asset Management System
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=assetapp
Group=assetapp
WorkingDirectory=/var/www/asset-system/app/.next/standalone
EnvironmentFile=/var/www/asset-system/env/asset-system.env
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=5
TimeoutStopSec=30

[Install]
WantedBy=multi-user.target
```

เริ่ม service:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now asset-system
sudo systemctl status asset-system
```

ดู log:

```bash
journalctl -u asset-system -f
```

ทดสอบ local:

```bash
curl -I http://127.0.0.1:3000/th/login
```

---

## 11. Configure Web-Controlled Scheduler Heartbeat With systemd Timer

ระบบใช้ script `npm run scheduler:heartbeat` เป็นตัวปลุกงานอัตโนมัติกลาง โดยตัว timer ไม่ได้เป็นคนตัดสินเวลา PM/LDAP เองแล้ว แต่จะเรียกแอปทุก 5 นาที จากนั้นแอปอ่านค่าที่ตั้งในหน้าเว็บ `/th/admin/settings` เพื่อเช็คว่า PM auto-generation หรือ LDAP Sync ถึงรอบตาม `cron` ในฐานข้อมูลหรือยัง

ก่อนตั้ง timer ให้แน่ใจว่า env มี token ที่ต้องใช้:

```env
MAINTENANCE_PM_GENERATION_TOKEN=<CHANGE_ME>
LDAP_SYNC_TOKEN=<CHANGE_ME>
```

หมายเหตุ: heartbeat นี้ดูแล PM auto-generation และ LDAP Sync ตาม schedule ที่ตั้งจากหน้าเว็บ ส่วน Notification Digest ใช้ script/timer แยกตามหัวข้อ 22 เพื่อไม่ให้การส่งแจ้งเตือนภายนอกผูกกับรอบ PM/LDAP โดยตรง

สร้าง oneshot service:

```bash
sudo nano /etc/systemd/system/asset-system-scheduler.service
```

ใส่:

```ini
[Unit]
Description=Run Asset System scheduler heartbeat
Wants=network-online.target asset-system.service
After=network-online.target asset-system.service

[Service]
Type=oneshot
User=assetapp
Group=assetapp
WorkingDirectory=/var/www/asset-system/app
EnvironmentFile=/var/www/asset-system/env/asset-system.env
Environment=AUTH_URL=http://127.0.0.1:3000
Environment=NEXTAUTH_URL=http://127.0.0.1:3000
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/npm run scheduler:heartbeat
```

เหตุผลที่ override `AUTH_URL`/`NEXTAUTH_URL` เป็น `127.0.0.1:3000` เฉพาะ service นี้: job หลังบ้านจะเรียกแอปในเครื่องโดยตรง ไม่ต้องวนออก Cloudflare Tunnel แต่ web app หลักยังใช้ `https://asset.company.com` ตาม env production เดิม

สร้าง timer:

```bash
sudo nano /etc/systemd/system/asset-system-scheduler.timer
```

ใส่ตัวอย่างให้ heartbeat รันทุก 5 นาที:

```ini
[Unit]
Description=Run Asset System scheduler heartbeat

[Timer]
OnCalendar=*:0/5
Persistent=true
Unit=asset-system-scheduler.service

[Install]
WantedBy=timers.target
```

เปิดใช้งาน:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now asset-system-scheduler.timer
```

ทดสอบ heartbeat ผ่าน local app:

```bash
cd /var/www/asset-system/app
sudo -u assetapp bash -lc 'set -a && . /var/www/asset-system/env/asset-system.env && set +a && AUTH_URL=http://127.0.0.1:3000 NEXTAUTH_URL=http://127.0.0.1:3000 npm run scheduler:heartbeat'
```

ทดสอบ service จริงแบบ manual:

```bash
sudo systemctl start asset-system-scheduler.service
sudo journalctl -u asset-system-scheduler.service -n 80 --no-pager
```

ตรวจ timer:

```bash
systemctl list-timers asset-system-scheduler.timer
sudo systemctl status asset-system-scheduler.timer
```

ตั้งเวลาจริงที่หน้าเว็บ:

1. ไปที่ `/th/admin/settings`
2. แท็บ `Automation`: เปิด `Preventive Maintenance อัตโนมัติ`, ตั้งโหมดเป็น `Scheduled`, เลือกรอบเวลา PM
3. แท็บ `LDAP Sync`: เปิด Sync, ตั้งโหมดเป็น `Scheduled`, เลือกรอบเวลา Sync
4. กดบันทึก แล้วรอ heartbeat รอบถัดไปหรือสั่ง `sudo systemctl start asset-system-scheduler.service`

ถ้า service รายงาน `skippedMissingReporter` ให้กลับไปตั้งค่าแผน PM ในหน้า `/th/maintenance?view=pm` โดยเลือก `ผู้รับผิดชอบภายใน` ให้ครบ เพราะระบบต้องใช้เป็นผู้แจ้งงานของใบงาน PM ที่สร้างอัตโนมัติ

---

## 12. Install And Configure Nginx Reverse Proxy

ติดตั้ง Nginx:

```bash
sudo apt-get update
sudo apt-get install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
sudo systemctl status nginx
```

สร้าง site config:

```bash
sudo nano /etc/nginx/sites-available/asset-system
```

ใส่ config นี้ โดยเปลี่ยน `asset.company.com` ให้เป็น domain production จริง:

```nginx
server {
    listen 127.0.0.1:8080;
    server_name asset.company.com;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;

        # Auth.js can return large Set-Cookie headers after login.
        proxy_buffer_size 16k;
        proxy_buffers 8 16k;
        proxy_busy_buffers_size 32k;

        proxy_set_header Host asset.company.com;
        proxy_set_header X-Forwarded-Host asset.company.com;
        proxy_set_header X-Forwarded-Proto https;
        proxy_set_header X-Forwarded-Port 443;

        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

เปิดใช้งาน config:

```bash
sudo ln -s /etc/nginx/sites-available/asset-system /etc/nginx/sites-enabled/asset-system
sudo nginx -t
sudo systemctl reload nginx
```

ทดสอบว่า Nginx ส่งต่อไปหา Next.js ได้:

```bash
curl -sS -D- -o /dev/null http://127.0.0.1:8080/
```

ถ้า redirect จาก `/` ไปภาษา default ถูกต้อง ต้องเห็น `Location` ไม่มี port `:3000`:

```text
location: https://asset.company.com/th
```

ถ้ายังเห็น `https://asset.company.com:3000/th` ให้ตรวจว่า config มีบรรทัดนี้ครบและ reload Nginx แล้ว:

```nginx
proxy_set_header X-Forwarded-Port 443;
```

ถ้า login แล้วเจอ 502 และ `/var/log/nginx/error.log` มีข้อความ `upstream sent too big header while reading response header from upstream` ให้ตรวจว่า config มี buffer settings นี้ครบ:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

ถ้ายังไม่พอสำหรับ cookie/header ที่ใหญ่ผิดปกติ ให้เพิ่มเป็น:

```nginx
proxy_buffer_size 32k;
proxy_buffers 8 32k;
proxy_busy_buffers_size 64k;
```

---

## 13. Install cloudflared

ติดตั้งจาก Cloudflare APT repository:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared
cloudflared --version
```

---

## 14. Create Cloudflare Tunnel

Login:

```bash
cloudflared tunnel login
```

Create tunnel:

```bash
cloudflared tunnel create asset-system
cloudflared tunnel list
```

จดค่า Tunnel UUID จาก output เช่น:

```text
12345678-abcd-1234-abcd-1234567890ab
```

สร้าง DNS route:

```bash
cloudflared tunnel route dns asset-system asset.company.com
```

---

## 15. Configure cloudflared

สร้าง config:

```bash
sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/<TUNNEL-UUID>.json /etc/cloudflared/
sudo nano /etc/cloudflared/config.yml
```

ตัวอย่าง:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /etc/cloudflared/<TUNNEL-UUID>.json

originRequest:
  connectTimeout: 30s

ingress:
  - hostname: asset.company.com
    service: http://127.0.0.1:8080
  - service: http_status:404
```

ตั้ง permission:

```bash
sudo chmod 600 /etc/cloudflared/config.yml /etc/cloudflared/<TUNNEL-UUID>.json
```

Validate config:

```bash
cloudflared tunnel ingress validate --config /etc/cloudflared/config.yml
cloudflared tunnel ingress rule --config /etc/cloudflared/config.yml https://asset.company.com/th/login
```

Run test:

```bash
cloudflared tunnel --config /etc/cloudflared/config.yml run asset-system
```

ลองเปิด:

```text
https://asset.company.com/th/login
```

หยุด test ด้วย `Ctrl+C`

---

ถ้าใช้ Cloudflare Zero Trust dashboard แบบ Published application routes แทน config file ให้ตั้งค่า route แบบนี้:

| Field | Value |
|---|---|
| Hostname | `asset.company.com` |
| Path | เว้นว่าง |
| Service Type | `HTTP` |
| Service URL | `127.0.0.1:8080` |

สำคัญ: อย่าใส่ path เช่น `^/blog` เพราะจะทำให้ route ไม่ครอบทุกหน้า และให้ Tunnel วิ่งเข้า Nginx port `8080` ไม่ใช่ Next.js port `3000`

---

## 16. Run cloudflared As A Service

ติดตั้ง service โดยระบุ config path ชัดเจน:

```bash
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

ดู log:

```bash
journalctl -u cloudflared -f
```

ทดสอบจากเครื่องผู้ใช้:

```text
https://asset.company.com/th/login
```

ถ้าเข้าไม่ได้:

```bash
sudo systemctl status asset-system
sudo systemctl status cloudflared
curl -I http://127.0.0.1:3000/th/login
curl -I http://127.0.0.1:8080/th/login
cloudflared tunnel info asset-system
```

---

## 17. Configure Public QR Base URL

หลัง domain ใช้งานได้แล้ว ให้เข้า:

```text
https://asset.company.com/th/admin/settings
```

ตั้งค่า Public QR Base URL:

```text
https://asset.company.com
```

เหตุผล:

- QR label จะใช้ stable URL ผ่าน `/q/a/{assetId}`
- ถ้า IP/server ภายในเปลี่ยน QR ยังใช้งานได้ เพราะผู้ใช้เข้าผ่าน domain ถาวร
- Cloudflare Tunnel map domain ไปหา server ใหม่ได้โดยไม่ต้องพิมพ์ QR ใหม่

---

## 18. Optional: Protect With Cloudflare Access

ถ้าระบบใช้เฉพาะภายในองค์กร แนะนำเปิด Cloudflare Access หน้า hostname นี้:

1. Cloudflare Zero Trust
2. Access > Applications
3. Add application > Self-hosted
4. Domain: `asset.company.com`
5. Policy: อนุญาตเฉพาะ email domain หรือ IdP องค์กร

ข้อควรระวัง:

- ถ้าใช้มือถือ scan QR จากนอกองค์กร ต้องแน่ใจว่า policy ของ Access อนุญาตผู้ใช้กลุ่มนั้น
- ถ้าใช้ LDAP login ภายในแอปอยู่แล้ว สามารถใช้ Cloudflare Access เป็นชั้นหน้าเพิ่มได้

---

## 19. Updating To A New Version

```bash
cd /var/www/asset-system/app
sudo -u assetapp git pull origin master

sudo -u assetapp npm ci
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npx prisma generate'

# Run only after DB backup, especially when prisma/schema.prisma changed
sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npx prisma db push'

sudo -u assetapp bash -lc 'cd /var/www/asset-system/app && set -a && . /var/www/asset-system/env/asset-system.env && set +a && npm run build'
sudo -u assetapp mkdir -p .next/standalone/.next
sudo -u assetapp cp -r public .next/standalone/
sudo -u assetapp cp -r .next/static .next/standalone/.next/

sudo systemctl restart asset-system
sudo systemctl reload nginx
sudo systemctl status asset-system
```

ตรวจ:

```bash
curl -I http://127.0.0.1:3000/th/login
curl -I http://127.0.0.1:8080/th/login
```

---

## 20. Backup And Restore

ทุกอย่างอยู่ใต้ `/var/www/asset-system` แล้ว แต่เวลา backup ควรแยก code/config/data เพื่อ restore ได้ง่ายกว่า

ต้อง backup 3 ส่วน:

1. SQL Server database `<DB_NAME>`
2. Env file `/var/www/asset-system/env/asset-system.env`
3. Upload directory `/var/www/asset-system/uploads`

Backup env + uploads:

```bash
sudo mkdir -p /backup
sudo cp /var/www/asset-system/env/asset-system.env /backup/asset-system.env.$(date +%F)
sudo tar -czf /backup/asset-system-uploads-$(date +%F).tar.gz /var/www/asset-system/uploads
```

Restore env + uploads:

```bash
sudo cp /backup/asset-system.env.YYYY-MM-DD /var/www/asset-system/env/asset-system.env
sudo tar -xzf /backup/asset-system-uploads-YYYY-MM-DD.tar.gz -C /
sudo chown root:assetapp /var/www/asset-system/env/asset-system.env
sudo chmod 640 /var/www/asset-system/env/asset-system.env
sudo chown -R assetapp:assetapp /var/www/asset-system/uploads
```

SQL Server backup ให้ใช้ SQL Server Management Studio, maintenance plan, หรือ `sqlcmd` ตาม policy องค์กร

ถ้ามี backup job ที่ตรวจสถานะได้ ให้สะท้อนสถานะลง env เพื่อให้หน้า `/th/admin/readiness` เห็นภาพรวม production ชัดขึ้น:

```env
BACKUP_STATUS=success
BACKUP_LAST_RUN_AT=2026-05-20T01:00:00.000Z
BACKUP_LAST_RESTORE_TEST_AT=2026-05-21T01:00:00.000Z
```

ค่าที่รองรับสำหรับ `BACKUP_STATUS` คือ `success`, `failed`, `missing`, หรือ `unknown`; `BACKUP_LAST_RESTORE_TEST_AT` ควรเป็น ISO timestamp ของวันที่ทดสอบ restore ล่าสุด ถ้าแก้ env file หลัง service รันอยู่ ให้ restart `asset-system.service` เพื่อให้ process อ่านค่าใหม่

---

## 21. LDAP Sync Scheduling From The Web UI

LDAP Sync ใช้ scheduler heartbeat เดียวกับ PM แล้ว ไม่ต้องตั้ง crontab แยก

สิ่งที่ต้องมี:

- `LDAP_SYNC_TOKEN` ใน `/var/www/asset-system/env/asset-system.env`
- `asset-system-scheduler.timer` enabled ตามหัวข้อ 11
- หน้า `/th/admin/settings` แท็บ `LDAP Sync` ตั้ง `เปิดใช้ Sync`, `โหมด Sync = Scheduled`, และ `รอบเวลา Sync`
- ตั้งค่า `Max scheduled deactivations per run` ในแท็บ `LDAP Sync` เพื่อจำกัดจำนวนพนักงานที่ scheduled sync จะปิดใช้งานต่อรอบ ถ้ารอบอัตโนมัติพบพนักงานที่หายจาก AD เกิน threshold นี้ ระบบจะ block รอบนั้นเพื่อให้ตรวจ manual ก่อน

ถ้าต้องการทดสอบเฉพาะ LDAP scheduled endpoint:

```bash
cd /var/www/asset-system/app
sudo -u assetapp bash -lc 'set -a && . /var/www/asset-system/env/asset-system.env && set +a && AUTH_URL=http://127.0.0.1:3000 NEXTAUTH_URL=http://127.0.0.1:3000 npm run ldap:sync:scheduled'
```

---

## 22. Optional Notification Digest Scheduling

Notification Digest เป็นงานสรุปแจ้งเตือนรายวัน เช่น งานอนุมัติค้าง, งานซ่อม, audit follow-up หรือรายการที่ต้องติดตาม ระบบสร้าง in-app notification ได้ และถ้าตั้ง `NOTIFICATION_DIGEST_WEBHOOK_URL` จะพยายามส่งออก generic webhook เพิ่มด้วย

สิ่งที่ต้องมีใน env:

```env
NOTIFICATION_DIGEST_TOKEN=<CHANGE_ME>
NOTIFICATION_DIGEST_WEBHOOK_URL=
```

ทดสอบแบบ dry-run ผ่าน local app:

```bash
cd /var/www/asset-system/app
sudo -u assetapp bash -lc 'set -a && . /var/www/asset-system/env/asset-system.env && set +a && AUTH_URL=http://127.0.0.1:3000 NEXTAUTH_URL=http://127.0.0.1:3000 npm run notifications:digest -- --dry-run'
```

ถ้าต้องการให้รันอัตโนมัติทุกวัน ให้ใช้ systemd timer แยกจาก scheduler heartbeat:

```bash
sudo nano /etc/systemd/system/asset-system-notification-digest.service
```

ใส่:

```ini
[Unit]
Description=Send Asset System notification digest
Wants=network-online.target asset-system.service
After=network-online.target asset-system.service

[Service]
Type=oneshot
User=assetapp
Group=assetapp
WorkingDirectory=/var/www/asset-system/app
EnvironmentFile=/var/www/asset-system/env/asset-system.env
Environment=AUTH_URL=http://127.0.0.1:3000
Environment=NEXTAUTH_URL=http://127.0.0.1:3000
Environment=PATH=/usr/local/bin:/usr/bin:/bin
ExecStart=/usr/bin/npm run notifications:digest
```

สร้าง timer ตัวอย่างให้ส่งทุกวัน 07:30:

```bash
sudo nano /etc/systemd/system/asset-system-notification-digest.timer
```

ใส่:

```ini
[Unit]
Description=Send Asset System notification digest daily

[Timer]
OnCalendar=*-*-* 07:30:00
Persistent=true
Unit=asset-system-notification-digest.service

[Install]
WantedBy=timers.target
```

เปิดใช้งานและตรวจสอบ:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now asset-system-notification-digest.timer
sudo systemctl start asset-system-notification-digest.service
sudo journalctl -u asset-system-notification-digest.service -n 80 --no-pager
systemctl list-timers asset-system-notification-digest.timer
```

---

## 23. Production Checklist

ก่อน Go Live:

- [ ] `AUTH_SECRET` เป็น random secret จริง
- [ ] `AUTH_URL` และ `NEXTAUTH_URL` เป็น `https://asset.company.com`
- [ ] `AUTH_TRUST_HOST=true`
- [ ] `UPLOAD_DIR` เป็น absolute path และมี backup
- [ ] ตรวจว่า `.next/standalone/public/fonts/NotoSansThai-Regular.ttf` และ `NotoSansThai-Bold.ttf` ถูก copy ไปพร้อม standalone แล้ว หรือกำหนด `PDF_THAI_FONT_REGULAR`/`PDF_THAI_FONT_BOLD` เป็น font ไทยอื่น
- [ ] `MAINTENANCE_PM_GENERATION_TOKEN` เป็น random token จริง
- [ ] `LDAP_SYNC_TOKEN` เป็น random token จริงถ้าเปิด LDAP scheduled sync
- [ ] `NOTIFICATION_DIGEST_TOKEN` เป็น random token จริง เพื่อให้ Notification Digest พร้อมใช้งานและหน้า `/th/admin/readiness` ผ่านครบ 3 scheduler tokens
- [ ] `NOTIFICATION_DIGEST_WEBHOOK_URL` ตั้งค่าแล้วถ้าต้องการส่ง digest ออกช่องทางภายนอก
- [ ] `BACKUP_STATUS`, `BACKUP_LAST_RUN_AT`, และ `BACKUP_LAST_RESTORE_TEST_AT` ตั้งตามระบบ backup/restore drill หรือปล่อยเป็น `unknown`/ว่างอย่างตั้งใจ
- [ ] SQL Server connection ใช้ production user ที่สิทธิ์เหมาะสม
- [ ] SQL Server มี backup schedule
- [ ] `npm run build` ผ่านบน Ubuntu
- [ ] `asset-system.service` restart แล้วใช้งานได้
- [ ] `asset-system-scheduler.timer` enabled และ `list-timers` แสดงเวลารันถัดไป
- [ ] `nginx.service` proxy ไป `127.0.0.1:3000` ได้
- [ ] `cloudflared.service` connected
- [ ] Cloudflare DNS route ไป Tunnel ถูกต้อง และ Tunnel service ชี้ไป `http://127.0.0.1:8080`
- [ ] Public QR Base URL ตั้งเป็น `https://asset.company.com`
- [ ] ทดสอบ `npm run scheduler:heartbeat` ผ่าน local app URL แล้ว
- [ ] ตั้ง PM/LDAP schedule ที่หน้า `/th/admin/settings` แล้ว
- [ ] ตั้ง `Max scheduled deactivations per run` สำหรับ LDAP scheduled sync แล้ว
- [ ] เปิด `/th/admin/readiness` แล้วไม่มี blocker สำคัญก่อน Go Live
- [ ] เปิด `/th/admin/storage` แล้ว filesystem dry-run ของ `UPLOAD_DIR` ไม่มี orphan/missing file ที่ต้องจัดการก่อน Go Live
- [ ] ไม่เปิด inbound port `3000` หรือ `8080` ออก Internet
- [ ] ไม่รัน cleanup test-data บน production
- [ ] ทดสอบ login, asset create, upload, QR scan, export Excel/PDF

---

## 24. Common Troubleshooting

### เข้า domain แล้วเจอ Cloudflare 1016

Tunnel DNS route มีปัญหา หรือ tunnel ไม่ได้รัน:

```bash
cloudflared tunnel info asset-system
sudo systemctl status cloudflared
```

### Cloudflare เข้าได้แต่แอป 502/504

App local ไม่รันหรือ port ไม่ตรง:

```bash
sudo systemctl status asset-system
curl -I http://127.0.0.1:3000/th/login
curl -I http://127.0.0.1:8080/th/login
```

ถ้าเกิดเฉพาะตอน login ให้ดู Nginx error log:

```bash
sudo tail -n 80 /var/log/nginx/error.log
```

ถ้าเจอข้อความนี้:

```text
upstream sent too big header while reading response header from upstream
```

ให้เพิ่ม buffer ใน `/etc/nginx/sites-available/asset-system` ภายใน `location /`:

```nginx
proxy_buffer_size 16k;
proxy_buffers 8 16k;
proxy_busy_buffers_size 32k;
```

แล้ว reload:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Login callback หรือ session ผิด domain

ตรวจ env:

```bash
sudo systemctl cat asset-system
sudo cat /var/www/asset-system/env/asset-system.env
```

ค่าที่ควรถูก:

```env
AUTH_URL=https://asset.company.com
NEXTAUTH_URL=https://asset.company.com
AUTH_TRUST_HOST=true
```

### เข้า `https://asset.company.com` แล้ว redirect ไป `https://asset.company.com:3000/th`

สาเหตุหลักคือ request ที่เข้า Next.js ไม่มี `X-Forwarded-Port: 443` ทำให้ Next.js ใช้ local app port `3000` ตอนสร้าง absolute redirect จาก `/` ไป `/th`

ทดสอบ origin โดยตรง:

```bash
curl -sS -D- -o /dev/null http://127.0.0.1:3000/ \
  -H 'Host: asset.company.com' \
  -H 'X-Forwarded-Host: asset.company.com' \
  -H 'X-Forwarded-Proto: https' \
  -H 'X-Forwarded-Port: 443'
```

ผลที่ถูกต้อง:

```text
location: https://asset.company.com/th
```

ถ้าใช้ Nginx ตามคู่มือนี้ ให้ตรวจ:

```bash
sudo nginx -t
sudo systemctl reload nginx
curl -sS -D- -o /dev/null http://127.0.0.1:8080/
```

และตรวจว่า Cloudflare Tunnel service ชี้ไป Nginx:

```yaml
service: http://127.0.0.1:8080
```

### Upload ไม่ได้

ตรวจ path และ permission:

```bash
grep UPLOAD_DIR /var/www/asset-system/env/asset-system.env
sudo ls -ld /var/www/asset-system/uploads
sudo chown -R assetapp:assetapp /var/www/asset-system/uploads
sudo -u assetapp test -r /var/www/asset-system/uploads
sudo -u assetapp test -w /var/www/asset-system/uploads
```

ถ้าหน้า `/th/admin/storage` แสดง orphan/missing files ให้ตรวจว่าค่า `UPLOAD_DIR` ใน env ชี้ path เดียวกับที่แอปใช้จริง และไฟล์แนบเก่าถูก restore มาครบ

### Prisma ต่อ SQL Server ไม่ได้

ตรวจ firewall/port:

```bash
nc -vz <DB_SERVER> 1433
journalctl -u asset-system -n 100 --no-pager
```

ถ้าใช้ named instance แล้วต่อไม่ได้ ให้เปลี่ยน SQL Server เป็น static TCP port แล้วใช้:

```env
DB_INSTANCE=
DB_PORT=1433
```

### PDF ภาษาไทยบน Ubuntu แสดงผลไม่ถูก

ตรวจว่า bundled font ถูก copy ไปกับ standalone runtime:

```bash
ls -l /var/www/asset-system/app/.next/standalone/public/fonts/NotoSansThai-Regular.ttf
ls -l /var/www/asset-system/app/.next/standalone/public/fonts/NotoSansThai-Bold.ttf
```

ถ้าไม่พบ ให้ copy `public` เข้า standalone ใหม่ตามหัวข้อ 7 แล้ว restart service:

```bash
cd /var/www/asset-system/app
sudo -u assetapp cp -r public .next/standalone/
sudo systemctl restart asset-system
```

ถ้าองค์กรใช้ font ไทยชุดอื่น หรือไม่ต้องการใช้ bundled font ให้ตั้งค่า env เป็น absolute path:

```env
PDF_THAI_FONT_REGULAR=/usr/share/fonts/truetype/custom/YourThaiFont-Regular.ttf
PDF_THAI_FONT_BOLD=/usr/share/fonts/truetype/custom/YourThaiFont-Bold.ttf
```

หลังแก้ไขให้ทดสอบ export PDF จากหน้า Audit Findings หรือ Audit Round อีกครั้ง

---

## References

- Next.js standalone output: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Cloudflare Tunnel install/create local tunnel: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/
- Cloudflare Tunnel as Linux service: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/as-a-service/linux/
