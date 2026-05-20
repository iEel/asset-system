# Asset Management System

Enterprise asset management system for asset registration, custody, QR/label workflows, audit rounds, maintenance, disposal, reporting, RBAC, LDAP integration, and deployment behind Cloudflare Tunnel.

## Quick Links

| Document | Purpose |
|---|---|
| `DEVELOPER_HANDOFF.md` | Current implementation status, feature index, schema notes, and developer handoff details |
| `DEPLOYMENT_UBUNTU_CLOUDFLARE.md` | Step-by-step Ubuntu + Nginx + Cloudflare Tunnel production deployment guide |
| `AGENTS.md` | Local coding-agent rule: read Next.js 16 docs in `node_modules/next/dist/docs/` before changing Next.js routes/pages |
| `System Requirement (2).md` | Original business/system requirement reference |
| `Enterprise Web UI UX Requirements.md` | UI/UX requirements and enterprise design guidance |
| `Tech Stack.md` | Stack decision reference |
| `Implementation Plan.md` | Original staged implementation plan |

## Stack

- Next.js 16.2.4 App Router with standalone output
- React 19, TypeScript 5, Tailwind CSS 4
- SQL Server via Prisma 7 and `@prisma/adapter-mssql`
- Auth.js / NextAuth credentials auth with RBAC
- next-intl Thai/English routes
- Excel/PDF exports, QR/barcode scanning, file uploads

## Local Development

```powershell
npm install
npx prisma generate
npx prisma db push
npm run dev
```

The app uses `WEB_PORT` from `.env` through `scripts/next-with-env-port.mjs`. Default local URL:

```text
http://localhost:3000/th/login
```

Default seeded admin account:

```text
admin / admin123
```

## Environment

Create `.env` locally. Important keys:

```env
WEB_PORT=3000
AUTH_SECRET=replace-with-random-secret
NEXTAUTH_SECRET=replace-with-same-value
AUTH_URL=http://localhost:3000
NEXTAUTH_URL=http://localhost:3000
UPLOAD_DIR=./uploads
PDF_THAI_FONT_REGULAR=
PDF_THAI_FONT_BOLD=

DB_SERVER=192.168.110.106
DB_INSTANCE=alpha
DB_PORT=1433
DB_TLS_SERVER_NAME=WIN-I284TKLAMMD
DATABASE_URL="sqlserver://..."
```

Production uses `/var/www/asset-system/env/asset-system.env`; see `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`.

PDF exports bundle Noto Sans Thai Regular/Bold under `public/fonts` with `public/fonts/OFL.txt`. Leave `PDF_THAI_FONT_*` blank unless production must use a different Thai font.

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start local Next.js development server using `WEB_PORT` |
| `npm run build` | Production build |
| `npm run start` | Start built app using `WEB_PORT` |
| `npm run lint` | ESLint |
| `npm test` | Run all Node test files under `tests/` |
| `npm run verify` | Run lint, all tests, and production build in one command |
| `npm run ldap:sync` | External/manual LDAP sync runner |
| `npm run ldap:sync:scheduled` | Run LDAP Sync only when the web-configured schedule is due |
| `npm run pm:generate-due` | Generate due preventive-maintenance tickets through the scheduler endpoint |
| `npm run pm:generate-due:scheduled` | Generate PM tickets only when the web-configured schedule is due |
| `npm run scheduler:heartbeat` | Shared scheduler heartbeat for PM auto-generation and LDAP Sync |
| `npm run notifications:digest` | Deliver daily in-app notification digests through the scheduler endpoint |
| `npm run cleanup:test-data` | Guarded trial asset cleanup CLI; dry-run by default |

## Verification

Focused tests can be run with Node's test runner:

```powershell
node --test tests\asset-depreciation.test.ts
node --test tests\design-system.test.ts
```

For the full local regression suite:

```powershell
npm test
```

Before deployment, larger releases, or handoff commits, run:

```powershell
npm run verify
```

## Key Modules

- Asset register: `/th/assets`
- Asset create/edit: `/th/assets/new`
- Scan/search and label tools: `/th/asset-management`
- Audit rounds and scan: `/th/audit/rounds`
- Maintenance: `/th/maintenance`
- Disposal: `/th/disposal`
- Reports: `/th/reports`
- Admin settings, logs, RBAC, readiness, storage: `/th/admin`
- Work Center: `/th/work-center`

## Deployment

Production deployment is documented in `DEPLOYMENT_UBUNTU_CLOUDFLARE.md`. The recommended layout keeps everything under `/var/www/asset-system` while separating:

- `/var/www/asset-system/app`
- `/var/www/asset-system/env`
- `/var/www/asset-system/uploads`

The public route should go through Cloudflare Tunnel to Nginx, then Nginx proxies to the local Next.js standalone server.
