# Developer Handoff — Asset Management System

> **Last Updated:** 2026-04-30
> **Phase:** 1C Asset Register (Started)
> **Status:** ✅ Foundation complete, ✅ SQL Server connected, ✅ Phase 1B Master Data complete, 🟨 Asset Register CRUD + detail/QR/timeline started

---

## 1. Project Overview

ระบบบริหารจัดการทรัพย์สิน (Asset Management System) สำหรับองค์กร รองรับ:
- ทะเบียนทรัพย์สิน, เบิก/คืน, QR Code tracking
- ตรวจนับ (Audit) พร้อม reconciliation
- ซ่อมบำรุง, ตัดจำหน่าย
- รายงาน, Import/Export Excel/PDF
- Multi-language (TH/EN), RBAC, Audit Trail

### Development Phases

| Phase | ขอบเขต | สถานะ |
|---|---|---|
| **1A: Foundation** | Project setup, Schema, Auth, i18n, Layout | ✅ Complete |
| **1B: Master Data** | Company, Branch, Dept, Employee, Location, Category, Brand, Supplier | ✅ Complete — Company, Branch, Department, Location, Employee, Category, Brand/Model, Supplier |
| **1C: Asset Register** | Asset CRUD, Tag gen, Custom fields, QR, Attachments | 🟨 In Progress — Asset list/create/edit/detail, tag gen, QR, and movement timeline started |
| **1D: Operations** | Check-out/in, Import/Export, Reports, Dashboard | ⬜ Not started |
| **Phase 2** | Transfer, Audit workflow | ⬜ Planned |
| **Phase 3** | Maintenance, Disposal | ⬜ Planned |
| **Phase 4** | AD/LDAP, HR sync, Advanced dashboard | ⬜ Planned |

---

## 2. Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 16.2.4 |
| Language | TypeScript | 5.x |
| Styling | Tailwind CSS | 4.x |
| UI Components | shadcn/ui (planned) + Lucide React | latest |
| Database | SQL Server 2025 Standard | on-premise |
| ORM | Prisma | 7.8.0 |
| DB Driver | @prisma/adapter-mssql + tedious | 7.8.0 / 19.x |
| Authentication | NextAuth.js (Auth.js) | 5.0.0-beta |
| i18n | next-intl | 4.11.0 |
| Data Table | TanStack Table | 8.x |
| Server State | TanStack Query | 5.x |
| Client State | Zustand | 5.x |
| Forms | React Hook Form + Zod | 7.x / 4.x |
| Charts | Recharts | 3.x |
| QR Code | qrcode.react + html5-qrcode | latest |
| Reports | exceljs + @react-pdf/renderer | latest |
| Toast | Sonner | 2.x |

---

## 3. Project Structure

```
d:\Antigravity\asset-system\
├── prisma/
│   ├── schema.prisma          # 25+ tables (validated ✅)
│   └── seed.ts                # Seed data script
├── prisma.config.ts           # Prisma 7 config (DB URL here)
├── messages/
│   ├── th.json                # Thai translations (120+ keys)
│   └── en.json                # English translations
├── src/
│   ├── app/
│   │   ├── layout.tsx                      # Root layout (minimal)
│   │   ├── globals.css                     # Theme + Tailwind v4 @theme
│   │   ├── api/
│   │   │   ├── auth/[...nextauth]/route.ts # Auth API
│   │   │   ├── companies/                  # Company CRUD API
│   │   │   ├── branches/                   # Branch CRUD API
│   │   │   ├── departments/                # Department CRUD API
│   │   │   ├── locations/                  # Location CRUD API
│   │   │   ├── employees/                  # Employee CRUD API
│   │   │   ├── categories/                 # Category CRUD API
│   │   │   ├── brands/                     # Brand CRUD API
│   │   │   ├── models/                     # Asset Model CRUD API
│   │   │   ├── suppliers/                  # Supplier CRUD API
│   │   │   └── assets/                     # Asset Register CRUD API
│   │   └── [locale]/
│   │       ├── layout.tsx                  # i18n provider + Sonner
│   │       ├── page.tsx                    # Redirect → /dashboard
│   │       ├── (auth)/login/page.tsx       # Login page
│   │       └── (dashboard)/
│   │           ├── layout.tsx              # Sidebar + Topbar
│   │           ├── dashboard/page.tsx      # KPI cards
│   │           ├── assets/                 # Asset Register list / detail / new / edit
│   │           └── master-data/
│   │               ├── companies/          # List / new / edit
│   │               ├── branches/           # List / new / edit
│   │               ├── departments/        # List / new / edit
│   │               ├── locations/          # List / new / edit
│   │               ├── employees/          # List / new / edit
│   │               ├── categories/         # List / new / edit
│   │               ├── brands/             # Brand + Model list / new / edit
│   │               └── suppliers/          # List / new / edit
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx                 # Collapsible sidebar + menus
│   │   │   └── topbar.tsx                  # Search, notifications, locale, user
│   │   └── master-data/
│   │       ├── master-data-layout.tsx      # Header/Search/Table helpers
│   │       ├── master-data-delete-button.tsx
│   │       ├── company-form.tsx
│   │       ├── branch-form.tsx
│   │       ├── department-form.tsx
│   │       ├── location-form.tsx
│   │       ├── employee-form.tsx
│   │       ├── category-form.tsx
│   │       ├── brand-form.tsx
│   │       ├── asset-model-form.tsx
│   │       └── supplier-form.tsx
│   │   └── assets/
│   │       └── asset-form.tsx
│   ├── i18n/
│   │   ├── routing.ts                      # Locales: th (default), en
│   │   └── request.ts                      # Message loader
│   ├── lib/
│   │   ├── db.ts                           # Prisma client (adapter-mssql)
│   │   ├── db-config.ts                    # SQL Server adapter config from .env
│   │   ├── auth.ts                         # NextAuth config (Credentials)
│   │   ├── auth-utils.ts                   # RBAC helpers
│   │   ├── page-auth.ts                    # Page-level permission guard
│   │   ├── api-response.ts                 # API error response helper
│   │   ├── audit-log.ts                    # Audit trail helper
│   │   ├── validations/                    # Zod schemas
│   │   └── utils.ts                        # cn(), formatDate, formatCurrency
│   ├── types/
│   │   └── next-auth.d.ts                  # Session type extensions
│   └── middleware.ts                       # i18n locale detection
├── scripts/
│   └── next-with-env-port.mjs              # Loads WEB_PORT from .env for dev/start
├── .env                                    # Connection strings
├── next.config.ts                          # next-intl plugin + standalone
├── package.json
└── tsconfig.json
```

---

## 4. Database

### Connection

```
Server: 192.168.110.106
Instance: alpha
Port: 1433
Database: asset_management
User: sa
TLS Server Name: WIN-I284TKLAMMD
```

Connection settings อยู่ใน `.env`:

- `DB_SERVER=192.168.110.106`
- `DB_INSTANCE=alpha`
- `DB_PORT=1433`
- `DB_TLS_SERVER_NAME=WIN-I284TKLAMMD`
- `DATABASE_URL=...`

> Runtime Prisma ใช้ `src/lib/db-config.ts` เพื่อส่ง `options.instanceName` และ `options.serverName` ให้ `@prisma/adapter-mssql`.
> Prisma CLI ใช้ `prisma.config.ts` ซึ่งประกอบ URL แบบ `192.168.110.106\alpha` เพื่อให้ `prisma db push` ไป named instance ถูกต้อง.

### Current DB State

- Database `asset_management` สร้างแล้วบน SQL Server instance `alpha`
- Prisma schema pushed แล้ว
- Seed data รันแล้ว
- Runtime verified against `WIN-I284TKLAMMD\ALPHA / asset_management`

### Schema (25+ tables)

| Group | Tables |
|---|---|
| **Organization** | `companies`, `branches`, `departments`, `employees` |
| **Location** | `locations` (self-referencing hierarchy) |
| **Asset Classification** | `asset_categories`, `asset_brands`, `asset_models` |
| **Reference Data** | `asset_statuses`, `asset_conditions` |
| **Asset Register** | `assets`, `custom_field_definitions`, `custom_field_values` |
| **Transactions** | `asset_checkouts`, `asset_checkins`, `asset_movements` |
| **Supplier** | `suppliers` |
| **Files** | `attachments` |
| **Auth** | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` |
| **System** | `system_logs`, `system_settings`, `notifications` |

### Key Design Decisions

- **Soft delete** ทุก table (`isActive` flag, ไม่ hard delete)
- **NoAction** ทุก FK relation (SQL Server cyclic cascade fix)
- **NVARCHAR** สำหรับทุก text field (รองรับภาษาไทย)
- **Custom Fields** ใช้ EAV pattern (`custom_field_definitions` + `custom_field_values`) + JSON snapshot (`customFieldsJson` ใน assets table)
- **Location hierarchy** ผ่าน `parentId` self-reference
- **Movement tracking** ทุกการเปลี่ยนแปลง asset ถูกบันทึกใน `asset_movements`
- ทุก table มี `createdAt`, `updatedAt`, `createdBy`, `updatedBy`

---

## 5. Authentication & Authorization

### Auth Flow

- **Provider:** Credentials (username + password)
- **Strategy:** JWT (8 ชั่วโมง)
- **Password:** bcrypt (12 rounds)
- Token เก็บ: `userId`, `roles[]`, `permissions[]`, `employeeId`

### RBAC

```typescript
// ตรวจสอบสิทธิ์ใน API route / Server Component:
import { requireAuth, hasPermission, requirePermission } from "@/lib/auth-utils"

const user = await requireAuth()                      // throw ถ้าไม่ login
hasPermission(user, "asset", "create")                // boolean
requirePermission(user, "asset", "delete")            // throw ถ้าไม่มีสิทธิ์
```

### Roles (11 roles)

`system_admin`, `asset_admin`, `it_staff`, `admin_staff`, `branch_staff`, `department_manager`, `auditor`, `audit_reviewer`, `accounting`, `employee`, `viewer`

### Permissions Format

`{module}:{action}` — เช่น `asset:create`, `report:export`, `user:delete`

25 modules × 6 actions = **150 permissions**

---

## 6. Internationalization (i18n)

### Setup

- Library: `next-intl`
- Default locale: `th` (ภาษาไทย)
- Supported: `th`, `en`
- URL pattern: `/th/dashboard`, `/en/assets`

### Usage

```typescript
// Server Component:
import { useTranslations } from "next-intl"
const t = useTranslations("nav")
t("dashboard") // "แดชบอร์ด" or "Dashboard"

// Translation files: messages/th.json, messages/en.json
// Namespaces: common, nav, auth, dashboard, asset, checkout, checkin
```

### Adding New Keys

1. เพิ่มใน `messages/th.json` และ `messages/en.json` พร้อมกัน
2. ใช้ namespace ตาม module เช่น `"masterData": { "companyName": "..." }`

---

## 7. Styling & Theme

### Color Palette (from Enterprise UI Requirements A.3)

| Token | Color | Usage |
|---|---|---|
| `--primary` | `#1E3A5F` | Primary buttons, links, active states |
| `--background` | `#F8FAFC` | Page background |
| `--surface` | `#FFFFFF` | Cards, panels |
| `--success` | `#16A34A` | Active, ready status |
| `--warning` | `#F59E0B` | Pending, caution |
| `--danger` | `#DC2626` | Error, delete, lost |
| `--info` | `#2563EB` | In use, information |
| `--border` | `#E2E8F0` | Borders, dividers |

### Tailwind v4 Note

Tailwind v4 ไม่มี `tailwind.config.ts` — ทุก config อยู่ใน `src/app/globals.css` ผ่าน `@theme inline` directive

---

## 8. Key Files Reference

| File | Purpose |
|---|---|
| `prisma/schema.prisma` | Database schema (แก้ table structure ที่นี่) |
| `prisma/seed.ts` | Seed data (statuses, conditions, roles, admin user) |
| `.env` | Database URL, Auth secret, `WEB_PORT`, TLS server name |
| `scripts/next-with-env-port.mjs` | โหลด `.env` แล้วส่ง `WEB_PORT` เป็น `PORT` ให้ Next dev/start |
| `src/lib/db.ts` | Prisma client singleton (adapter-mssql) |
| `src/lib/db-config.ts` | MSSQL adapter config object จาก `.env` |
| `src/lib/auth.ts` | NextAuth config + login logic |
| `src/lib/auth-utils.ts` | RBAC helpers (hasPermission, requireAuth) |
| `src/lib/page-auth.ts` | Guard หน้า Server Component: redirect login / notFound เมื่อไม่มีสิทธิ์ |
| `src/lib/api-response.ts` | Helper แปลง error เป็น JSON response |
| `src/lib/audit-log.ts` | `logAudit()` — เรียกทุกครั้งที่ CRUD |
| `src/lib/validations/company.ts` | Company Zod schema |
| `src/lib/validations/branch.ts` | Branch Zod schema |
| `src/lib/validations/department.ts` | Department Zod schema |
| `src/lib/validations/location.ts` | Location Zod schema + location type list |
| `src/lib/validations/employee.ts` | Employee Zod schema + employment statuses |
| `src/lib/validations/category.ts` | Asset Category Zod schema |
| `src/lib/validations/brand-model.ts` | Brand and Asset Model Zod schemas |
| `src/lib/validations/supplier.ts` | Supplier Zod schema |
| `src/lib/validations/asset.ts` | Asset Register Zod schema |
| `src/lib/asset-tag.ts` | Auto-generate asset tag from Company/Branch/Category/running |
| `src/lib/asset-form-options.ts` | Server helper for Asset form dropdown data |
| `src/lib/utils.ts` | `cn()`, `formatDate()`, `formatCurrency()` |
| `src/middleware.ts` | i18n locale detection |
| `messages/th.json` | Thai translations |
| `messages/en.json` | English translations |
| `src/components/layout/sidebar.tsx` | Sidebar navigation |
| `src/components/layout/topbar.tsx` | Top bar (search, notifications, user) |
| `src/components/master-data/master-data-layout.tsx` | Reusable master data header/search/table helpers |
| `src/components/master-data/master-data-delete-button.tsx` | Reusable soft-delete button |

---

## 9. Getting Started

### Prerequisites

- Node.js 20+
- SQL Server 2025 (instance `alpha` at `192.168.110.106`)
- Database `asset_management` exists on instance `alpha`

### Setup Commands

```bash
# 1. Install dependencies
npm install

# 2. Push schema to create/update all tables
npx prisma db push

# 3. Generate Prisma client
npx prisma generate

# 4. Run seed data
npx tsx prisma/seed.ts

# 5. Start development server
npm run dev
```

### Web Port

เว็บอ่านพอร์ตจาก `.env`:

```env
WEB_PORT=3000
```

`npm run dev` และ `npm run start` ใช้ `scripts/next-with-env-port.mjs` เพื่อโหลด `WEB_PORT` แล้วส่งเป็น `PORT` ให้ Next.js CLI.

### Default Login

| Field | Value |
|---|---|
| URL | `http://localhost:3000/th/login` |
| Username | `admin` |
| Password | `admin123` |

### Implemented Master Data URLs

| Module | URL |
|---|---|
| Company | `http://localhost:3000/th/master-data/companies` |
| Branch | `http://localhost:3000/th/master-data/branches` |
| Department | `http://localhost:3000/th/master-data/departments` |
| Location | `http://localhost:3000/th/master-data/locations` |
| Employee | `http://localhost:3000/th/master-data/employees` |
| Category | `http://localhost:3000/th/master-data/categories` |
| Brand / Model | `http://localhost:3000/th/master-data/brands` |
| Supplier | `http://localhost:3000/th/master-data/suppliers` |
| Asset Register | `http://localhost:3000/th/assets` |

---

## 10. Seed Data Summary

| Data | Count | Details |
|---|---|---|
| Asset Statuses | 14 | Draft, Ready, In Use, Reserved, Checked Out, In Transit, Under Maintenance, Pending Repair, Under Inspection, Lost, Missing, Pending Disposal, Disposed, Retired |
| Asset Conditions | 8 | New, Excellent, Good, Fair, Poor, Damaged, Non-functional, Salvage |
| System Settings | 5 | Asset tag prefix (AST), separator (-), running digits (5), etc. |
| Roles | 11 | system_admin → viewer |
| Permissions | 150 | 25 modules × 6 actions |
| Admin User | 1 | admin / admin123 (system_admin role) |

---

## 11. Development Patterns

### Adding a New Master Data Module

ทุก module ใช้ pattern เดียวกัน:

```
src/app/[locale]/(dashboard)/master-data/{module}/
├── page.tsx            # List page (Data Table)
├── new/page.tsx        # Create form
└── [id]/edit/page.tsx  # Edit form

src/app/api/{module}/
├── route.ts            # GET (list) + POST (create)
└── [id]/route.ts       # GET (detail) + PUT (update) + DELETE (soft delete)

src/lib/validations/{module}.ts  # Zod schema
```

Current implemented modules: `companies`, `branches`, `departments`, `locations`, `employees`, `categories`, `brands`, `models`, `suppliers`.

Current reusable helpers:
- `src/components/master-data/master-data-layout.tsx` — page header, search bar, column header, active badge
- `src/components/master-data/master-data-delete-button.tsx` — generic soft-delete button
- `src/lib/api-response.ts` — API error response helper
- `src/lib/page-auth.ts` — page-level RBAC guard

### API Route Pattern

```typescript
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { logAudit } from "@/lib/audit-log"
import { errorResponse } from "@/lib/api-response"
import { companySchema } from "@/lib/validations/company"

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "view")

    const data = await prisma.company.findMany({
      where: { isActive: true },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(data)
  } catch (error) {
    return errorResponse(error)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "company", "create")

    const input = companySchema.parse(await request.json())
    const record = await prisma.company.create({ data: input })

    await logAudit({
      userId: user.id,
      action: "create",
      module: "company",
      recordId: record.id,
      newValue: input,
    })

    return NextResponse.json(record, { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
```

### Audit Trail

ทุก action ที่เปลี่ยนแปลงข้อมูลต้องเรียก `logAudit()`:

```typescript
await logAudit({
  userId: user.id,
  action: "create" | "update" | "delete" | "checkout" | "checkin",
  module: "asset" | "company" | ...,
  recordId: "uuid",
  oldValue: { ... },  // สำหรับ update/delete
  newValue: { ... },   // สำหรับ create/update
})
```

---

## 12. Known Issues & Notes

| Issue | Detail |
|---|---|
| **Next.js 16 middleware deprecation** | `middleware.ts` แสดง warning "use proxy instead" — ยังทำงานได้ปกติ อาจต้อง migrate ในอนาคต |
| **Prisma 7 breaking changes** | ต้องใช้ driver adapter (`@prisma/adapter-mssql`), ไม่มี `url` ใน schema แล้ว, config อยู่ใน `prisma.config.ts` |
| **shadcn/ui** | ยังไม่ได้ init — ต้อง run `npx shadcn@latest init` แล้วเพิ่ม components ตามต้องการ |
| **Lint warnings** | `npm run lint` ผ่านแต่ยังมี warning unused imports เดิม 8 จุดใน layout/sidebar/topbar |
| **Next.js 16 docs** | โปรเจกต์นี้มี AGENTS.md ระบุให้อ่าน docs ใน `node_modules/next/dist/docs/` ก่อนแก้โค้ด Next.js |
| **SQL Server TLS warning** | แก้แล้วด้วย `DB_TLS_SERVER_NAME=WIN-I284TKLAMMD` เพื่อไม่ให้ tedious ใช้ IP เป็น TLS ServerName |

---

## 13. Next Steps (Phase 1C: Asset Register)

### Completed

1. Company CRUD
2. Branch CRUD
3. Department CRUD
4. Location CRUD with Branch FK, parent location hierarchy, and location type
5. Employee CRUD with Company, Branch, Department, Manager, and employment status
6. Category CRUD with model, asset, and custom field counts
7. Brand / Model CRUD with category and brand relationships
8. Supplier CRUD with asset count
9. Reusable master data header/search/delete helpers
10. Page-level and API-level RBAC for implemented master data modules
11. Audit trail logging for create/update/delete

### Recommended Next Order

1. **Attachments** — upload/download/delete with validation
2. **Asset Register refinements** — advanced filters, server-side pagination/sort, duplicate serial checks
3. **QR label print layout** — printable asset label with QR, tag, name, serial
4. Upgrade master data tables to server-side pagination/sort once data volume grows

### Phase 1C Started

1. Asset Register list page with search and 200-row cap
2. Asset create/edit form with master data dropdowns
3. Auto asset tag generation using `[Company]-[Branch]-[Category]-[Running No.]`
4. Asset create/update/delete APIs with RBAC and audit log
5. Initial `asset_movements` logging for create and key field changes
6. Asset detail page with summary, QR Code, attachments section, and movement timeline

---

## 14. Reference Documents

| Document | Location |
|---|---|
| System Requirements | `System Requirement (2).md` |
| UI/UX Requirements | `Enterprise Web UI UX Requirements.md` |
| Tech Stack Decision | `Tech Stack.md` |
| Implementation Plan | `Implementation Plan.md` |
