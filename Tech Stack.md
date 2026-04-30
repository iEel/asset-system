# Tech Stack — Asset Management System (Final Decision)

> ✅ **All decisions locked.** พร้อมเริ่ม Implementation Plan

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                    FRONTEND                         │
│  Next.js 15 (App Router) + TypeScript               │
│  Tailwind CSS v4.2 + shadcn/ui + Radix UI           │
│  TanStack Table v8 + Recharts                       │
│  React Hook Form + Zod                              │
│  TanStack Query + Zustand                           │
│  html5-qrcode + qrcode.react                        │
│  next-intl (i18n: TH default + EN)                  │
├─────────────────────────────────────────────────────┤
│                    BACKEND                          │
│  Next.js API Routes (Route Handlers)                │
│  Prisma 6 ORM                                       │
│  NextAuth.js v5 (Auth.js)                            │
│  exceljs + @react-pdf/renderer                       │
│  Nodemailer                                          │
├─────────────────────────────────────────────────────┤
│                   DATABASE                          │
│  SQL Server 2025 Standard (On-premise)               │
│  NVARCHAR for Thai text                              │
│  EAV + JSON column for Custom Fields                 │
├─────────────────────────────────────────────────────┤
│                   STORAGE                           │
│  Local Filesystem (Ubuntu)                           │
├─────────────────────────────────────────────────────┤
│              DEPLOYMENT (Ubuntu Server)              │
│  Docker Compose                                      │
│  Nginx Reverse Proxy + SSL                           │
│  SQL Server 2025 (native or Docker)                  │
└─────────────────────────────────────────────────────┘
```

---

## Detailed Decisions

### 1. Framework — Next.js 15 (App Router) + TypeScript

- Full-stack monolith (frontend + API ในโปรเจคเดียว)
- Server Components สำหรับ data-heavy pages
- Route Handlers สำหรับ REST API
- Middleware สำหรับ auth + RBAC

---

### 2. Database — SQL Server 2025 Standard

- On-premise, Ubuntu Server
- NVARCHAR(MAX) สำหรับ Thai text
- Custom Fields → EAV Table + JSON snapshot column
- SQL Server Agent สำหรับ scheduled backup

---

### 3. ORM — Prisma 6

**เหตุผลที่เลือก Prisma แทน Drizzle:**

| Criteria | Prisma | Drizzle |
|---|---|---|
| Learning curve | ✅ ง่ายกว่า | ยากกว่าเล็กน้อย |
| Documentation | ✅ ครบ, มี tutorial เยอะ | น้อยกว่า |
| Community | ✅ ใหญ่กว่ามาก | เล็กกว่า |
| CRUD simplicity | ✅ เขียนสั้นกว่า | verbose กว่า |
| Relation handling | ✅ `include` ง่ายมาก | ต้อง join เอง |
| Visual tool | ✅ Prisma Studio | ไม่มี |
| AGM experience | ✅ คุ้นเคยบ้าง | เริ่มจากศูนย์ |
| Complex query | Raw SQL ได้ | SQL-like syntax |
| Performance | ช้ากว่าเล็กน้อย | ✅ เร็วกว่า |

> **ผม (AI) จะช่วยเขียน Prisma schema, query, migration ให้ — ไม่ต้องกังวลเรื่องไม่ถนัด**

---

### 4. Authentication — NextAuth.js v5

| Phase | Feature |
|---|---|
| Phase 1 | Credentials Provider, JWT, RBAC |
| Phase 4 | AD/LDAP Provider |

---

### 5. UI — shadcn/ui + Tailwind CSS v4.2

| Component | Library |
|---|---|
| Design System | shadcn/ui |
| Styling | Tailwind CSS v4.2 |
| Icons | Lucide React |
| Toast | Sonner |
| Global Search | cmdk |

---

### 6. Data Table — TanStack Table v8

- Server-side pagination
- Sort, filter, column visibility
- Bulk select/action
- Column freeze
- Status Badge
- Responsive

---

### 7. i18n — next-intl

| Setting | Value |
|---|---|
| Default | `th` (ภาษาไทย) |
| Supported | `th`, `en` |
| Phase | Phase 1 |

---

### 8. QR Code

| Function | Library |
|---|---|
| Generate | `qrcode.react` |
| Scan | `html5-qrcode` |
| Print Label | `react-to-print` |

---

### 9. File Upload

| Component | Choice |
|---|---|
| UI | `react-dropzone` |
| Storage | Local filesystem (`/var/data/asset-system/uploads/`) |
| Structure | `/{module}/{year}/{month}/{filename}` |

---

### 10. Reports

| Function | Library |
|---|---|
| Excel Import/Export | `exceljs` |
| PDF Report | `@react-pdf/renderer` |
| Thai Font | Sarabun (Base64) |

---

### 11. Forms — React Hook Form + Zod

- Multi-section forms (Asset Detail 8 sections)
- Shared validation schema (client + server)
- Searchable dropdown (shadcn/ui Combobox)

---

### 12. Charts — Recharts

- KPI Cards (shadcn/ui)
- Bar/Pie/Line charts (Recharts)

---

### 13. State Management

| Type | Library |
|---|---|
| Server state | TanStack Query |
| Client state | Zustand |

---

### 14. Notifications

| Type | Solution |
|---|---|
| In-app | Custom component + DB table |
| Email | Nodemailer (Phase 3) |
| Toast | Sonner |

---

## Deployment — Ubuntu Server

### Architecture

```text
Ubuntu Server
├── Docker Compose
│   ├── asset-system (Next.js standalone)
│   ├── nginx (reverse proxy + SSL)
│   └── (optional) sql-server-2025
├── SQL Server 2025 Standard
│   └── native install หรือ Docker container
├── /var/data/asset-system/
│   ├── uploads/
│   └── backups/
└── Cron Jobs
    ├── Database backup (daily)
    └── File backup (daily)
```

### Docker Compose Setup

```yaml
# docker-compose.yml (concept)
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=sqlserver://...
    volumes:
      - ./uploads:/app/uploads

  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./certs:/etc/nginx/certs
```

> [!TIP]
> SQL Server 2025 รองรับ Linux native installation — สามารถติดตั้งตรงบน Ubuntu ได้เลย ไม่จำเป็นต้องใช้ Docker สำหรับ SQL Server

---

## Full Library List (package.json)

### Dependencies

```text
# Framework
next
react
react-dom
typescript

# ORM & Database
prisma
@prisma/client

# Authentication
next-auth

# UI Components
tailwindcss
@radix-ui/react-*
lucide-react
class-variance-authority
clsx
tailwind-merge
sonner
cmdk

# Data Table
@tanstack/react-table
@tanstack/react-virtual

# Forms
react-hook-form
@hookform/resolvers
zod

# State Management
@tanstack/react-query
zustand

# Charts
recharts

# i18n
next-intl

# QR Code
qrcode.react
html5-qrcode
react-to-print

# File Upload
react-dropzone

# Reports
exceljs
@react-pdf/renderer

# Email
nodemailer

# Utilities
date-fns
uuid
bcryptjs
```

---

## คำถามสุดท้าย

> [!IMPORTANT]
> **ยืนยัน stack ชุดนี้ได้เลยหรือเปล่าครับ?**
> ถ้า OK ผมจะเริ่มสร้าง **Implementation Plan สำหรับ Phase 1** ต่อเลย ซึ่งจะครอบคลุม:
> - Database schema (Prisma)
> - Project structure
> - Master Data modules
> - Asset Register
> - Check-out / Check-in
> - QR Code
> - RBAC
> - Basic Reports
> - i18n setup
