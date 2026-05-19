# Deployment Guide: Ubuntu Server + Cloudflare Tunnel

Last verified: 2026-05-19

คู่มือนี้ออกแบบสำหรับโปรเจกต์ Asset Management System นี้โดยตรง:

- Next.js 16.2.4 App Router
- `next.config.ts` ใช้ `output: "standalone"`
- Runtime ใช้ SQL Server ผ่าน `@prisma/adapter-mssql`
- Upload files อยู่ผ่าน `UPLOAD_DIR`
- Public access ผ่าน Cloudflare Tunnel ไปยัง `http://127.0.0.1:3000`

ตัวอย่างในคู่มือนี้ใช้:

| ค่า | ตัวอย่าง |
|---|---|
| Domain | `asset.company.com` |
| App user | `assetapp` |
| App path | `/opt/asset-system/app` |
| Env file | `/etc/asset-system/asset-system.env` |
| Upload path | `/var/lib/asset-system/uploads` |
| Local app port | `3000` |
| Cloudflare Tunnel name | `asset-system` |

เปลี่ยนค่าเหล่านี้ให้ตรงกับ production จริงก่อนรันคำสั่ง

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
nc -vz 192.168.110.106 1433
```

ถ้า SQL Server ใช้ named instance เช่น `alpha` และไม่ได้ fix TCP port ไว้ อาจต้องเปิด SQL Browser UDP 1434 หรือแนะนำให้ตั้ง SQL Server instance เป็น static TCP port แล้วใช้ `DB_PORT` แทน `DB_INSTANCE` ใน production เพื่อให้ deploy บน Linux คาดเดาง่ายกว่า

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

Cloudflare Tunnel ใช้ outbound connection เป็นหลัก จึงไม่ต้องเปิด inbound port `3000`

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
sudo useradd --system --create-home --home-dir /opt/asset-system --shell /bin/bash assetapp
sudo mkdir -p /opt/asset-system/app
sudo mkdir -p /etc/asset-system
sudo mkdir -p /var/lib/asset-system/uploads
sudo chown -R assetapp:assetapp /opt/asset-system /var/lib/asset-system
sudo chmod 750 /etc/asset-system
```

---

## 5. Clone The Repository

ถ้า repo เป็น private ให้ตั้ง deploy key หรือใช้ GitHub token ตาม policy องค์กรก่อน

```bash
sudo -u assetapp git clone https://github.com/iEel/asset-system.git /opt/asset-system/app
cd /opt/asset-system/app
sudo -u assetapp git status
```

---

## 6. Create Production Environment File

สร้าง env file:

```bash
sudo nano /etc/asset-system/asset-system.env
```

ตัวอย่าง:

```env
NODE_ENV=production
HOSTNAME=127.0.0.1
PORT=3000
WEB_PORT=3000

AUTH_URL=https://asset.company.com
NEXTAUTH_URL=https://asset.company.com
AUTH_TRUST_HOST=true
AUTH_SECRET=replace-with-openssl-rand-base64-32
NEXTAUTH_SECRET=replace-with-same-value-as-auth-secret

UPLOAD_DIR=/var/lib/asset-system/uploads

DB_SERVER=192.168.110.106
DB_INSTANCE=
DB_PORT=1433
DB_TLS_SERVER_NAME=WIN-I284TKLAMMD
DB_USER=asset_app_user
DB_PASSWORD=replace-with-db-password
DATABASE_URL=sqlserver://192.168.110.106:1433;database=asset_management;user=asset_app_user;password=replace-with-db-password;encrypt=true;trustServerCertificate=true

LDAP_ENABLED=false
LDAP_URL=
LDAP_BASE_DN=
LDAP_BIND_DN=
LDAP_BIND_PASSWORD=
LDAP_USER_FILTER=(&(objectClass=user)(sAMAccountName={username}))
LDAP_AUTO_PROVISION=false
LDAP_DEFAULT_ROLE=employee
LDAP_SYNC_ENABLED=false
LDAP_SYNC_TOKEN=replace-with-long-random-token
```

Generate secret:

```bash
openssl rand -base64 32
```

ตั้ง permission:

```bash
sudo chown root:assetapp /etc/asset-system/asset-system.env
sudo chmod 640 /etc/asset-system/asset-system.env
```

หมายเหตุสำคัญ:

- Runtime ของระบบอ่าน `DB_SERVER`, `DB_USER`, `DB_PASSWORD`, และชื่อ database ที่ parse จาก `DATABASE_URL`
- ถ้าใช้ named instance ให้ใส่ `DB_INSTANCE=alpha` และให้ SQL Browser/instance port เข้าถึงได้
- ถ้าใช้ static port ให้ปล่อย `DB_INSTANCE=` ว่าง แล้วใช้ `DB_PORT=1433`
- `UPLOAD_DIR` ควรเป็น absolute path เพื่อไม่ผูกกับ `.next/standalone`

---

## 7. Install Dependencies And Build

ติดตั้ง dependencies และ generate Prisma Client:

```bash
cd /opt/asset-system/app
sudo -u assetapp npm ci
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npx prisma generate'
```

Build โดย source production env ภายใต้ user `assetapp`:

```bash
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npm run build'
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
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npx prisma db push'
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npx tsx prisma/seed.ts'
```

ถ้าเป็น DB เดิมที่มีข้อมูลจริง:

```bash
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npx prisma db push'
```

หมายเหตุ:

- ปัจจุบัน repo นี้ใช้ `prisma db push` เป็นหลัก ยังไม่มี migration history production-grade
- ห้ามรัน `npm run cleanup:test-data -- --apply` บน production
- ถ้ามีข้อมูลจริงแล้ว ให้ backup SQL Server และ `/var/lib/asset-system/uploads` ก่อน deploy ทุกครั้ง

---

## 9. Smoke Test Standalone Server

ลองรัน manual ก่อนทำ systemd:

```bash
sudo -u assetapp bash -lc 'cd /opt/asset-system/app/.next/standalone && set -a && . /etc/asset-system/asset-system.env && set +a && node server.js'
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
WorkingDirectory=/opt/asset-system/app/.next/standalone
EnvironmentFile=/etc/asset-system/asset-system.env
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

## 11. Install cloudflared

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

## 12. Create Cloudflare Tunnel

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

## 13. Configure cloudflared

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
    service: http://127.0.0.1:3000
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

## 14. Run cloudflared As A Service

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
cloudflared tunnel info asset-system
```

---

## 15. Configure Public QR Base URL

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

## 16. Optional: Protect With Cloudflare Access

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

## 17. Updating To A New Version

```bash
cd /opt/asset-system/app
sudo -u assetapp git pull origin master

sudo -u assetapp npm ci
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npx prisma generate'

# Run only after DB backup, especially when prisma/schema.prisma changed
sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npx prisma db push'

sudo -u assetapp bash -lc 'cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && npm run build'
sudo -u assetapp mkdir -p .next/standalone/.next
sudo -u assetapp cp -r public .next/standalone/
sudo -u assetapp cp -r .next/static .next/standalone/.next/

sudo systemctl restart asset-system
sudo systemctl status asset-system
```

ตรวจ:

```bash
curl -I http://127.0.0.1:3000/th/login
```

---

## 18. Backup And Restore

ต้อง backup 2 ส่วน:

1. SQL Server database `asset_management`
2. Upload directory `/var/lib/asset-system/uploads`

Backup uploads:

```bash
sudo tar -czf /backup/asset-system-uploads-$(date +%F).tar.gz /var/lib/asset-system/uploads
```

Restore uploads:

```bash
sudo tar -xzf /backup/asset-system-uploads-YYYY-MM-DD.tar.gz -C /
sudo chown -R assetapp:assetapp /var/lib/asset-system/uploads
```

SQL Server backup ให้ใช้ SQL Server Management Studio, maintenance plan, หรือ `sqlcmd` ตาม policy องค์กร

---

## 19. LDAP Sync Scheduler Optional

ถ้าเปิด LDAP sync แล้ว ต้องตั้ง `LDAP_SYNC_TOKEN` ใน env ก่อน

ตัวอย่าง cron:

```bash
sudo crontab -u assetapp -e
```

เพิ่ม:

```cron
0 2 * * * cd /opt/asset-system/app && set -a && . /etc/asset-system/asset-system.env && set +a && /usr/bin/node scripts/ldap-sync.mjs >> /var/log/asset-system-ldap-sync.log 2>&1
```

ถ้าให้ script sync ผ่าน public domain ให้ `AUTH_URL=https://asset.company.com`
ถ้าให้ sync ผ่าน local app โดยไม่ออก Internet ให้ override ใน cron เป็น `AUTH_URL=http://127.0.0.1:3000`

---

## 20. Production Checklist

ก่อน Go Live:

- [ ] `AUTH_SECRET` เป็น random secret จริง
- [ ] `AUTH_URL` และ `NEXTAUTH_URL` เป็น `https://asset.company.com`
- [ ] `AUTH_TRUST_HOST=true`
- [ ] `UPLOAD_DIR` เป็น absolute path และมี backup
- [ ] SQL Server connection ใช้ production user ที่สิทธิ์เหมาะสม
- [ ] SQL Server มี backup schedule
- [ ] `npm run build` ผ่านบน Ubuntu
- [ ] `asset-system.service` restart แล้วใช้งานได้
- [ ] `cloudflared.service` connected
- [ ] Cloudflare DNS route ไป Tunnel ถูกต้อง
- [ ] Public QR Base URL ตั้งเป็น `https://asset.company.com`
- [ ] ไม่เปิด inbound port `3000` ออก Internet
- [ ] ไม่รัน cleanup test-data บน production
- [ ] ทดสอบ login, asset create, upload, QR scan, export Excel/PDF

---

## 21. Common Troubleshooting

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
```

### Login callback หรือ session ผิด domain

ตรวจ env:

```bash
sudo systemctl cat asset-system
sudo cat /etc/asset-system/asset-system.env
```

ค่าที่ควรถูก:

```env
AUTH_URL=https://asset.company.com
NEXTAUTH_URL=https://asset.company.com
AUTH_TRUST_HOST=true
```

### Upload ไม่ได้

ตรวจ path และ permission:

```bash
grep UPLOAD_DIR /etc/asset-system/asset-system.env
sudo ls -ld /var/lib/asset-system/uploads
sudo chown -R assetapp:assetapp /var/lib/asset-system/uploads
```

### Prisma ต่อ SQL Server ไม่ได้

ตรวจ firewall/port:

```bash
nc -vz 192.168.110.106 1433
journalctl -u asset-system -n 100 --no-pager
```

ถ้าใช้ named instance แล้วต่อไม่ได้ ให้เปลี่ยน SQL Server เป็น static TCP port แล้วใช้:

```env
DB_INSTANCE=
DB_PORT=1433
```

### PDF ภาษาไทยบน Ubuntu แสดงผลไม่ถูก

โค้ด PDF ปัจจุบัน register Tahoma เฉพาะเมื่อรันบน Windows ถ้าต้องใช้ PDF ภาษาไทยบน Ubuntu แบบสมบูรณ์ ควรเพิ่ม font Thai เช่น Noto Sans Thai เข้าโปรเจกต์และ register ใน PDF renderer ในรอบพัฒนาแยกต่างหาก

---

## References

- Next.js standalone output: https://nextjs.org/docs/app/api-reference/config/next-config-js/output
- Cloudflare Tunnel install/create local tunnel: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/create-local-tunnel/
- Cloudflare Tunnel routing: https://developers.cloudflare.com/tunnel/routing/
- Cloudflare Tunnel configuration file: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/configuration-file/
- Cloudflare Tunnel as Linux service: https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/local-management/as-a-service/linux/
