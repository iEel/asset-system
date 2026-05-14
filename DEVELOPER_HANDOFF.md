# Developer Handoff — Asset Management System

> **Last Updated:** 2026-05-14
> **Phase:** Phase 4 AD/LDAP + Mobile Optimization (Started)
> **Status:** ✅ Foundation complete, ✅ SQL Server connected, ✅ Phase 1B Master Data complete, ✅ Phase 1C mostly complete, 🟨 Phase 1D Operations/Reports started, 🟨 Phase 2 audit workflow mostly built with Excel/PDF audit exports and scan QA hardening, 🟨 Phase 3 maintenance/disposal mostly built with export polish, 🟨 Admin RBAC polish started, 🟨 Phase 4 AD/LDAP login + sync workflow validated, 🟨 Mobile optimization pass complete, ✅ Table row navigation UX pass complete, ✅ Searchable dropdown UX pass complete for high-volume operational forms, ✅ Handover/return evidence and readable operation document numbers added, ✅ Asset movement custody timeline enriched, ✅ Handover history compacted for repeated transactions

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
| **1C: Asset Register** | Asset CRUD, Tag gen, Custom fields, QR, Attachments | 🟨 Mostly Complete — CRUD, tag gen, QR labels, detail, movements, attachments/photos, shared PO/Invoice documents, category custom-field templates, asset components/assembly, import/export, duplicate UX |
| **1D: Operations** | Check-out/in, Import/Export, Reports, Dashboard | 🟨 Started — Check-out/in, drag/drop photo/signature evidence, printable handover/return forms, stricter checkout/checkin status mapping, basic reports, system logs, and live KPI dashboard added |
| **Phase 2** | Transfer, Audit workflow | 🟨 Started — transfer/bulk move, audit round generation, QR/manual scan capture, immediate location/custodian correction from scan, finding review, pending/not-found and found-later workflow, approved reconciliation, granular multi-finding review status, and Excel/PDF exports |
| **Phase 3** | Maintenance, Disposal | 🟨 Started — maintenance ticket flow mostly built with drag/drop attachment uploads and previews; disposal request create/list, approval/reject, detail, and print document added |
| **Phase 4** | AD/LDAP, HR sync, Advanced dashboard | 🟨 Started — scope narrowed to AD/LDAP login and mobile optimization |

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
│   │   │   ├── assets/                     # Asset Register CRUD + export/template API
│   │   │   └── maintenance-tickets/        # Maintenance ticket list/create API
│   │   └── [locale]/
│   │       ├── layout.tsx                  # i18n provider + Sonner
│   │       ├── page.tsx                    # Redirect → /dashboard
│   │       ├── (auth)/login/page.tsx       # Login page
│   │       ├── (dashboard)/
│   │           ├── layout.tsx              # Sidebar + Topbar
│   │           ├── dashboard/page.tsx      # KPI cards
│   │           ├── maintenance/page.tsx    # Maintenance ticket list/create
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
│   │       └── (print)/
│   │           └── assets/[id]/label/page.tsx # Printable asset QR label
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
│   │       ├── asset-form.tsx
│   │       ├── asset-import-preview-panel.tsx
│   │       ├── asset-register-table.tsx
│   │       └── asset-label-print.tsx
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
- Maintenance schema pushed; `maintenance_tickets` table exists on SQL Server `alpha`
- Disposal schema pushed; `disposal_requests` table exists on SQL Server `alpha`
- Operation document number schema pushed; `asset_checkouts.documentNo` and `asset_checkins.documentNo` exist and existing records were backfilled to readable monthly sequences
- Check-in custody schema pushed; `asset_checkins.returnByEmployeeId` and `asset_checkins.receiveByEmployeeId` exist as nullable employee references for new return transactions while legacy text names remain supported

### Schema (25+ tables)

| Group | Tables |
|---|---|
| **Organization** | `companies`, `branches`, `departments`, `employees` |
| **Location** | `locations` (self-referencing hierarchy) |
| **Asset Classification** | `asset_categories`, `asset_brands`, `asset_models` |
| **Reference Data** | `asset_statuses`, `asset_conditions` |
| **Asset Register** | `assets`, `asset_components`, `custom_field_definitions`, `custom_field_values` |
| **Transactions** | `asset_checkouts`, `asset_checkins`, `asset_movements` |
| **Maintenance** | `maintenance_tickets` |
| **Disposal** | `disposal_requests` |
| **Supplier** | `suppliers` |
| **Files** | `attachments` |
| **Auth** | `users`, `roles`, `permissions`, `user_roles`, `role_permissions` |
| **System** | `system_logs`, `system_settings`, `notifications` |

### Key Design Decisions

- **Soft delete** ทุก table (`isActive` flag, ไม่ hard delete)
- **NoAction** ทุก FK relation (SQL Server cyclic cascade fix)
- **NVARCHAR** สำหรับทุก text field (รองรับภาษาไทย)
- **Custom Fields** ใช้ EAV pattern (`custom_field_definitions` + `custom_field_values`) + JSON snapshot (`customFieldsJson` ใน assets table); UI ล่าสุดให้ตั้ง template ที่ Category และ render field อัตโนมัติใน Asset Form
- **Asset/Model Photos** ใช้ตาราง `attachments` เดิม: `module=asset` สำหรับรูปทรัพย์สินจริง, `module=asset_model` สำหรับรูปกลางของรุ่น, ไฟล์อยู่ใต้ `UPLOAD_DIR`; หน้า Brand/Model แสดง thumbnail รุ่นในคอลัมน์ชื่อรุ่นโดยไม่เพิ่มคอลัมน์ใหม่ และ preview รูปใช้ `object-contain` เพื่อไม่ตัดรูป
- **Asset Model Specs** เก็บใน field `asset_models.specs` เดิม แต่ UI ใหม่ serialize เป็น JSON ผ่าน `src/lib/model-specs.ts`; parser ยังรองรับ legacy plain text และใช้สรุปแบบ key/value ใน table/detail
- **Purchase Documents** ใช้ตารางกลาง `purchase_documents` + `purchase_document_assets` เพื่อให้ PO/Invoice/ใบส่งของ/ประกัน 1 ใบผูกหลาย Asset ได้; ไฟล์ของเอกสารกลางเก็บใน `attachments` ด้วย `module=purchase_document` และยังรองรับ legacy `module=asset_purchase`
- **Operation Document Numbers** ใบส่งมอบ/ใบรับคืนมี `documentNo` แยกจาก UUID; ค่า default คือ `HO-{yyyyMM}-{running}` และ `RT-{yyyyMM}-{running}` โดยแก้ Template และจำนวนหลัก running ได้ที่ `/admin/settings`; UUID ยังใช้เป็น internal id/URL
- **Asset Components / Assembly** ใช้ตาราง `asset_components` เพื่อผูก parent asset กับ component asset แบบมีประวัติ install/remove, `componentRole`, `slotNo`, reference fields, movement ทั้งสองฝั่ง และ audit log
- **Location hierarchy** ผ่าน `parentId` self-reference
- **Movement tracking** ทุกการเปลี่ยนแปลง asset ถูกบันทึกใน `asset_movements`; หน้า Asset Detail แสดง timeline แบบอ่านง่ายพร้อมประเภท movement, summary, document link, และ chain-of-custody ว่าใครส่งมอบ/ใครรับ/ไปที่ไหน
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
| `src/lib/asset-tag.ts` | Auto-generate asset tag from Company/Asset Tag Code/Branch/Category/running |
| `src/lib/asset-form-options.ts` | Server helper for Asset form dropdown data |
| `src/lib/asset-excel.ts` | Shared Excel workbook helpers for asset export/import template |
| `src/lib/asset-import-preview.ts` | Excel import parser, reference lookup, date/number parsing, and row-level validation helpers |
| `src/components/assets/asset-import-preview-panel.tsx` | Upload Excel, display validation preview, and confirm import |
| `src/components/assets/asset-register-table.tsx` | Asset Register table with column visibility, row selection, and CSV export |
| `src/components/assets/asset-label-print.tsx` | Printable QR asset label layout + print action |
| `src/components/assets/asset-components-panel.tsx` | Asset component/assembly panel for install/remove, current components, and history |
| `src/components/assets/asset-purchase-documents.tsx` | Purchase document list/download/delete panel for PO, invoice, delivery note, warranty, and related files |
| `src/components/ui/file-dropzone.tsx` | Reusable drag-and-drop file picker used by asset/model/maintenance uploads |
| `src/components/ui/searchable-select.tsx` | Reusable searchable combobox for high-volume dropdowns such as Asset, Employee, Location, Supplier, and active checkout selection |
| `src/components/ui/clickable-table-row.tsx` | Reusable accessible table row navigation wrapper; ignores nested buttons/links/inputs while allowing whole-row click/keyboard navigation |
| `src/lib/category-photo-checklist.ts` | Category photo checklist helpers stored in `system_settings` by category ID |
| `src/lib/asset-components.ts` | Component install validation helper: active asset checks, duplicate parent/slot guard, and cycle prevention |
| `src/lib/purchase-documents.ts` | Shared purchase document file-save and Asset linking helpers |
| `src/lib/model-specs.ts` | Parser/serializer/summarizer สำหรับ structured Asset Model specs พร้อม preset ตาม category |
| `src/lib/asset-operation-options.ts` | Dropdown data helper for check-out/check-in flows |
| `src/lib/operation-document-number.ts` | Generate/validate/render checkout/checkin document numbers from system-setting templates |
| `src/lib/validations/asset-operations.ts` | Zod schemas for asset checkout/checkin |
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

### AD / LDAP Login

LDAP login is optional and uses the same `/th/login` screen as local credentials. Local user login remains available as fallback. Configure it from `/th/admin/settings`.

**Config precedence:** values saved in `system_settings` from `/th/admin/settings` are used first. Environment variables below are fallback/bootstrap values only when the DB setting is missing or blank.

```env
LDAP_ENABLED=true
LDAP_URL="ldap://dc.company.local:389"
LDAP_BASE_DN="DC=company,DC=local"
LDAP_BIND_DN="CN=ldap-reader,OU=Service Accounts,DC=company,DC=local"
LDAP_BIND_PASSWORD="change-me"
LDAP_USER_FILTER="(&(objectClass=user)(sAMAccountName={username}))"
LDAP_AUTO_PROVISION=false
LDAP_DEFAULT_ROLE="asset_user"
LDAP_SYNC_ENABLED=false
LDAP_SYNC_BASE_DN=""
LDAP_SYNC_FILTER="(&(objectCategory=person)(objectClass=user)(employeeID=*)(company=*)(!(userAccountControl:1.2.840.113556.1.4.803:=2)))"
LDAP_SYNC_MODE="preview"
LDAP_SYNC_SCHEDULE="0 2 * * *"
LDAP_SYNC_TOKEN="long-random-token-for-scheduler"
```

Alternative direct bind options when no service bind account is used:

```env
LDAP_UPN_DOMAIN="company.local"
LDAP_DOMAIN="COMPANY"
LDAP_USER_DN_TEMPLATE="CN={username},OU=Users,DC=company,DC=local"
```

If `LDAP_AUTO_PROVISION=true`, the default role in `LDAP_DEFAULT_ROLE` must exist in `/admin/roles`; otherwise LDAP-authenticated users without an existing app account will be rejected.

LDAP sync should be implemented as a separate controlled workflow, not hidden inside login:

1. **Preview**: query LDAP with `ldap_sync_base_dn` / `ldap_sync_filter` and show create/update/deactivate counts without writing DB.
2. **Manual Sync**: admin reviews preview, confirms, then writes Employee/User changes and audit logs.
3. **Scheduled Sync**: enable only after branch/department/company mapping rules are stable. Use `npm run ldap:sync` from Windows Task Scheduler/Cron with `LDAP_SYNC_TOKEN`. Never hard-delete users; mark inactive/resigned instead.

Current AD mapping rules:

- Login username uses `sAMAccountName`, so users can sign in with the User logon name only and do not need to append `@domain`.
- Employee code uses LDAP `employeeID`, which is the key for asset custodian mapping and audit ownership.
- LDAP `company` maps to Company by code/name.
- `distinguishedName` OU order maps as `OU[0]` = Department and `OU[1]` = Branch, e.g. `CN=Sonsawan Kongmani,OU=Account,OU=LeamChabang,DC=soniclocal,DC=com` maps Department `Account` and Branch `LeamChabang`.
- If a DN has only one OU, the sync treats that OU as Branch and falls back Department from LDAP `department` or `ldap_sync_default_department_code`.
- The default Company/Branch/Department settings are fallback values only when LDAP organization mapping cannot be matched to master data.
- Current local validation: Preview Sync found 320 LDAP users. Manual Sync created 320 employee records initially. Re-running Manual Sync now completes without error and shows applied counts separately from preview counts.
- Known internal exclusion: DNs under `OU=Allow TeamViwer` are filtered in application code after LDAP search because AD substring matching on `distinguishedName` was not reliable for this directory.

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
| Asset Label Print | `http://localhost:3000/th/assets/{assetId}/label` |
| Check-out Asset | `http://localhost:3000/th/asset-management/checkout` |
| Check-out Handover Print | `http://localhost:3000/th/asset-management/checkouts/{checkoutId}` |
| Check-in Asset | `http://localhost:3000/th/asset-management/checkin` |
| Check-in Return Print | `http://localhost:3000/th/asset-management/checkins/{checkinId}` |
| Transfer Asset | `http://localhost:3000/th/asset-management/transfer` |
| Bulk Move Location | `http://localhost:3000/th/asset-management/bulk-move` |
| Maintenance Tickets | `http://localhost:3000/th/maintenance` |
| Maintenance Ticket Detail | `http://localhost:3000/th/maintenance/{ticketId}` |
| Maintenance Repair Print | `http://localhost:3000/th/maintenance/{ticketId}/print` |
| Maintenance Ticket API | `GET/POST /api/maintenance-tickets` |
| Maintenance Ticket Close API | `PATCH /api/maintenance-tickets/{ticketId}` |
| Maintenance Attachment API | `POST /api/maintenance-tickets/{ticketId}/attachments` |
| Maintenance Ticket Export | `GET /api/maintenance-tickets/export` |
| Asset Model Photo API | `POST /api/models/{modelId}/attachments` |
| Purchase Documents API | `GET/POST /api/purchase-documents` |
| Asset Purchase Document Link API | `POST /api/assets/{assetId}/purchase-documents` |
| Asset Component Install API | `POST /api/assets/{assetId}/components` |
| Asset Component Remove API | `DELETE /api/assets/{assetId}/components/{componentId}` |
| Disposal Requests | `http://localhost:3000/th/disposal` |
| Disposal Request Detail | `http://localhost:3000/th/disposal/{requestId}` |
| Disposal Approval Print | `http://localhost:3000/th/disposal/{requestId}/print` |
| Disposal Request API | `GET/POST /api/disposal-requests` |
| Disposal Decision API | `PATCH /api/disposal-requests/{requestId}` |
| Disposal Request Export | `GET /api/disposal-requests/export` |
| Audit Rounds | `http://localhost:3000/th/audit/rounds` |
| Create Audit Round | `http://localhost:3000/th/audit/rounds/new` |
| Audit Scan Capture | `http://localhost:3000/th/audit/rounds/{auditRoundId}/scan` |
| Audit Pending Assets | `http://localhost:3000/th/audit/rounds/{auditRoundId}/pending` |
| Audit Findings | `http://localhost:3000/th/audit/findings` |
| Audit Result Export | `GET /api/audit-rounds/{auditRoundId}/export` |
| Audit Result PDF Export | `GET /api/audit-rounds/{auditRoundId}/export-pdf` |
| Audit Finding Export | `GET /api/audit-findings/export?status=pending` |
| Audit Finding PDF Export | `GET /api/audit-findings/export-pdf?status=pending` |
| Reports | `http://localhost:3000/th/reports` |
| System Log | `http://localhost:3000/th/admin/logs` |
| User Management | `http://localhost:3000/th/admin/users` |
| Create User | `http://localhost:3000/th/admin/users/new` |
| Edit User | `http://localhost:3000/th/admin/users/{userId}/edit` |
| Roles & Permissions | `http://localhost:3000/th/admin/roles` |
| Create Role | `http://localhost:3000/th/admin/roles/new` |
| Edit Role Permissions | `http://localhost:3000/th/admin/roles/{roleId}/edit` |
| System Settings | `http://localhost:3000/th/admin/settings` |

---

## 10. Seed Data Summary

| Data | Count | Details |
|---|---|---|
| Asset Statuses | 14 | Draft, Ready, In Use, Reserved, Checked Out, In Transit, Under Maintenance, Pending Repair, Under Inspection, Lost, Missing, Pending Disposal, Disposed, Retired |
| Asset Conditions | 8 | New, Excellent, Good, Fair, Poor, Damaged, Non-functional, Salvage |
| System Settings | 7 | Asset tag format template, prefix (AST), category prefix mapping, separator (-), running digits (5), etc. |
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
| **Lint/build verification** | ล่าสุด `npm run lint`, `npx tsc --noEmit`, และ `npm run build` ผ่านหลังปรับ table row navigation UX |
| **Next.js 16 docs** | โปรเจกต์นี้มี AGENTS.md ระบุให้อ่าน docs ใน `node_modules/next/dist/docs/` ก่อนแก้โค้ด Next.js |
| **SQL Server TLS warning** | แก้แล้วด้วย `DB_TLS_SERVER_NAME=WIN-I284TKLAMMD` เพื่อไม่ให้ tedious ใช้ IP เป็น TLS ServerName |
| **LDAP Manual Sync MSSQL transaction** | แก้แล้ว: Manual Sync ไม่ใช้ Prisma interactive transaction กับ MSSQL แล้ว เพราะเคยเจอ `Transaction has not begun`; ปัจจุบันใช้ idempotent preview-driven writes + small batches และแสดง applied counts บน UI |
| **Phase 2 audit schema** | เพิ่ม `audit_rounds`, `audit_items`, `audit_findings`, `audit_scan_history` และ push schema ไป SQL Server `alpha` แล้ว |
| **Audit scan behavior** | Scan API อัปเดต `audit_items`, เพิ่ม `scanCount`, บันทึก `audit_scan_history`, ตรวจ mismatch location/custodian/department/condition และสร้าง `audit_findings`; location/custodian mismatch สามารถ apply correction ทันทีจากหน้า scan ได้ โดยสร้าง approved finding + `asset_movements` และอัปเดต master asset |
| **QR scanner integration** | หน้า `/audit/rounds/{id}/scan` รองรับกล้องผ่าน `html5-qrcode` และ fallback paste URL/Asset ID/Asset Tag; QR label URL `/assets/{id}` จะ map กลับ audit item ได้ |
| **Audit exports** | เพิ่ม Excel export สำหรับ Audit Result รายรอบ และ Audit Findings ตาม filter/search ปัจจุบัน |
| **Audit PDF exports** | เพิ่ม PDF export สำหรับ Audit Result รายรอบ และ Audit Findings ตาม filter/search ปัจจุบัน โดยใช้ `@react-pdf/renderer` และ font Tahoma runtime เมื่อรันบน Windows |
| **Audit finding review** | หน้า `/audit/findings` รองรับ approve/reject; approve จะอัปเดต master asset เฉพาะ field ที่ finding ระบุและสร้าง `asset_movements` แบบ `audit_*_correction` |
| **Audit multi-finding review** | Review finding ทีละรายการแล้วคำนวณสถานะ `audit_items` ใหม่จาก findings ทั้งหมดของ item นั้น เพื่อไม่ปิด item เป็น reconciled/rejected ถ้ายังมี finding pending อื่น |
| **Audit finding labels** | หน้า Finding และ Excel export resolve expected/actual value จาก raw IDs เป็น label ของ Location/Employee/Department/Condition เพื่อให้ reviewer อ่านง่ายขึ้น |
| **Audit pending/not found** | หน้า `/audit/rounds/{id}/pending` แสดง audit items ที่ยัง `pending`; Mark Not Found ใช้สิทธิ์ `audit:edit`, ตั้ง item เป็น `reviewed/not_found`, สร้าง finding `not_found` pending investigation และไม่แก้ master asset เป็น Lost |
| **Audit found-later recovery** | ถ้า item เคยถูก Mark Not Found แล้ว scan เจอทีหลังใน audit round เดียวกัน Scan API จะปิด finding `not_found` pending เดิมเป็น `rejected` พร้อม `actionTaken=found_later_by_audit_scan` แล้วบันทึก scan/mismatch/correction ใหม่ตามปกติ |
| **Audit scan QA hardening** | หน้า `/audit/rounds/{id}/scan` เพิ่ม camera support detection, camera device picker, responsive QR scan box, last decoded value, camera status/error panel, และ manual fallback guidance สำหรับ browser/mobile QA |
| **Operation print forms** | หลัง checkout/checkin สำเร็จจะ redirect ไปหน้าเอกสารพิมพ์ A4 สำหรับใบส่งมอบ/ใบรับคืน พร้อมข้อมูลทรัพย์สิน เงื่อนไข รายละเอียดธุรกรรม และช่องลายเซ็น |
| **Operation status mapping** | Checkout ตั้ง asset status เป็น `Checked Out` แบบ exact จาก master status; Check-in อนุญาต next status เฉพาะ `Ready`, `Pending Repair`, `Pending Disposal` ทั้งใน dropdown และ API validation |
| **Operation evidence upload** | Checkout รองรับรูปก่อนส่งมอบและไฟล์ลายเซ็นผู้รับ; Check-in รองรับรูปหลังรับคืน โดยบันทึกลง `UPLOAD_DIR/operations/...`, สร้าง `attachments`, และเก็บ path ใน transaction record |
| **Checkout on-screen signature** | หน้า Checkout เปลี่ยนลายเซ็นผู้รับจาก file upload เป็น signature pad บนหน้าจอ; client แปลงเป็น PNG evidence อัตโนมัติ และใบส่งมอบจะแสดงลายเซ็นผู้รับในช่อง signature |
| **Checkout before-photo UX** | หน้า Checkout ใช้ `FileDropzone` สำหรับรูปก่อนส่งมอบ รองรับ drag/drop บน desktop และ `capture="environment"` เพื่อถ่ายรูปจากกล้องหลังบนมือถือ |
| **Check-in after-photo UX** | หน้า Check-in ใช้ `FileDropzone` สำหรับรูปหลังรับคืน รองรับ drag/drop บน desktop และ `capture="environment"` เพื่อถ่ายรูปจากกล้องหลังบนมือถือ |
| **Master data scaling** | Employees, Locations, และ Suppliers ใช้ server-side pagination, page size, search count, และ sortable columns ผ่าน helper กลาง `src/lib/master-data-query.ts` |
| **Admin users foundation** | เพิ่มหน้า `/admin/users` สำหรับดูบัญชีผู้ใช้ บทบาท พนักงานที่ผูก สถานะ และ last login พร้อม search/pagination/sort และ RBAC `user:view` |
| **Admin user edit flow** | เพิ่ม API `GET/POST /api/admin/users`, `PUT /api/admin/users/{id}` และหน้า `/admin/users/new`, `/admin/users/{id}/edit` สำหรับสร้าง/แก้ไข user, password, employee link, active flag, และ role assignments |
| **Admin roles foundation** | เพิ่มหน้า `/admin/roles` สำหรับดู role summary และ permission matrix แยก module/action พร้อม RBAC `role:view` |
| **Role permission edit flow** | เพิ่ม `PUT /api/admin/roles/{id}` และหน้า `/admin/roles/{id}/edit` สำหรับแก้ role permission matrix พร้อม transaction และ audit log |
| **Role management polish** | เพิ่มหน้า `/admin/roles/new`, API `POST /api/admin/roles`, metadata form สำหรับ role key/display name/description/status, select whole module, และ guard rails สำหรับ system roles โดยล็อก `system_admin` permission |
| **Admin settings foundation** | เพิ่มหน้า `/admin/settings` และ API `/api/admin/settings` สำหรับแก้ `system_settings` พร้อม RBAC `setting:view/edit`, audit log, และ asset tag prefix mapping ตามประเภทสินค้า |
| **Maintenance foundation** | เพิ่ม schema/table `maintenance_tickets`, API `GET/POST /api/maintenance-tickets`, หน้า `/maintenance`, create ticket form, audit log, movement log, และอัปเดต asset เป็น `Pending Repair` เมื่อเปิดใบซ่อม |
| **Maintenance close flow** | เพิ่ม `PATCH /api/maintenance-tickets/{id}` และปุ่มปิดงานในหน้า `/maintenance` สำหรับบันทึก root cause, resolution, return date, repair cost, warranty claim, อัปเดต ticket เป็น closed และเลือกสถานะ asset หลังซ่อม |
| **Maintenance detail/attachments** | เพิ่มหน้า `/maintenance/{id}`, upload attachment สำหรับ ticket, ใช้ endpoint download/delete attachment เดิมแบบเช็ค permission ตาม module, และเพิ่ม maintenance history ในหน้า Asset Detail |
| **Maintenance attachment previews** | เพิ่ม inline preview สำหรับไฟล์แนบงานซ่อม รองรับรูปภาพและ PDF, preview modal, thumbnail/card preview, และ `?inline=1` ใน attachment API โดยยังใช้ permission เดิม |
| **Maintenance polish** | เพิ่ม search/status/type/evidence/date filters ในหน้า `/maintenance`, clear filter, result count, Excel export `GET /api/maintenance-tickets/export`, และหน้า print A4 `/maintenance/{id}/print` สำหรับใบซ่อม |
| **Disposal foundation** | เพิ่ม schema/table `disposal_requests`, API `GET/POST /api/disposal-requests`, หน้า `/disposal`, create request form, audit log, movement log, และอัปเดต asset เป็น `Pending Disposal` เมื่อเปิดคำขอ |
| **Disposal approval flow** | เพิ่ม `PATCH /api/disposal-requests/{id}` และปุ่มพิจารณาในหน้า `/disposal` สำหรับ approve/reject, บันทึก sale/salvage value และ remark, อัปเดตสถานะ asset หลังพิจารณา, พร้อม movement/audit log |
| **Disposal detail/print** | เพิ่มหน้า `/disposal/{id}` สำหรับดูคำขอ, ทรัพย์สิน, ผลพิจารณา, movement history และหน้า `/disposal/{id}/print` สำหรับใบอนุมัติตัดจำหน่าย A4 พร้อมช่องลงชื่อ |
| **Disposal polish** | หน้า `/disposal` เพิ่ม search, status/type/date filters, clear filter, result count, และ Excel export `GET /api/disposal-requests/export` ตามตัวกรองเดียวกับหน้าจอ |
| **Asset tag category prefixes** | หน้า `/admin/settings` เพิ่ม section สำหรับจับคู่ประเภทสินค้ากับ prefix เช่น IT = COM, Furniture = FUR; asset tag generation จะใช้ prefix ตาม category ก่อน fallback เป็น category code |
| **Flexible asset tag format** | หน้า `/admin/settings` เพิ่ม `asset_tag_format_template` พร้อม token เช่น `{companyCode}`, `{assetCompanyCode}`, `{assetPrefix}`, `{month}`, `{running}` เพื่อกำหนดรูปแบบรหัสทรัพย์สินเอง |
| **Asset Tag Company Code** | เพิ่ม `companies.assetTagCode` และช่อง “รหัสบริษัทสำหรับ Asset Tag” ใน master บริษัท; `{assetCompanyCode}` ใช้ค่านี้ก่อน fallback เป็น `company.code` เพื่อแยกรหัสทรัพย์สินออกจากรหัสบริษัท/AD LDAP |
| **System settings UX polish** | ปรับหน้า `/admin/settings` จากตาราง key/value เป็น section เฉพาะงาน ได้แก่รูปแบบ Asset Tag พร้อม preset, ตัวเลือกเลขรันนิ่ง, prefix ตามประเภท, ค่าองค์กร และ advanced settings เฉพาะค่าที่ไม่มี editor |
| **Operational mutation QA pass** | สร้าง QA fixture จริง, ตรวจ asset tag format `QA-COM-05-0001`, checkout/checkin เอกสารพิมพ์, แก้ duplicate React key ในเอกสารรับคืน และปรับ maintenance create validation ให้ `returnDate` optional |
| **Phase 4 narrowed scope** | ตามคำขอล่าสุด Phase 4 จะทำเฉพาะ AD/LDAP Login และ Mobile Optimization; HR Sync, Accounting Asset Code, Power BI/Dashboard API, n8n/Workflow API, และ Advanced Approval Workflow ถูกตัดออกจากลำดับนี้ |
| **AD/LDAP login foundation** | เพิ่ม `ldapts`, helper `src/lib/ldap-auth.ts`, optional LDAP bind/search ผ่าน `.env`, local-login fallback, และ auto-provision user แบบกำหนด role เริ่มต้นได้ |
| **Mobile shell polish** | ปรับ viewport, dashboard shell, sidebar, topbar, login form, touch target, safe viewport height, และ sidebar width ให้เหมาะกับ mobile มากขึ้น |
| **LDAP settings UI** | หน้า `/admin/settings` เพิ่ม section ตั้งค่า AD/LDAP, test connection API, และค่าควบคุม sync strategy โดย auth อ่านค่าจาก `system_settings` ก่อน fallback ไป `.env` |
| **LDAP sync recommendation** | แนวทาง sync ที่แนะนำคือ Preview → Manual → Scheduled: เริ่มจากดู diff create/update/deactivate, map Company/Branch/Department ให้พร้อม, แล้วค่อยเปิดรอบเวลาอัตโนมัติ |
| **LDAP sync workflow** | เพิ่ม `POST /api/admin/settings/ldap-sync` สำหรับ preview/apply, UI Preview Sync/Manual Sync, AD mapping จาก `employeeID`/`company`/`distinguishedName`, fallback Company/Branch/Department mapping, deactivate-missing guard, audit log เมื่อ apply, persistent error panel, applied-count result panel, และ script `npm run ldap:sync` สำหรับ scheduler ภายนอก |
| **Asset custom detail templates** | หน้า Category ตั้ง custom field template ได้ (`text/number/date/select/boolean`, required, options); Asset Form render field ตาม category และยังเก็บ snapshot ใน `customFieldsJson` พร้อม key/value fallback |
| **Asset/model photo workflow** | เพิ่มรูปกลางของ Asset Model ผ่าน `POST /api/models/{id}/attachments`, หน้า Asset Detail แสดงรูปรุ่น + รูปทรัพย์สินจริง, หน้า Brand/Model list แสดง thumbnail 48x48 ในคอลัมน์ชื่อรุ่น, และใช้ `attachments` เดิมพร้อม permission-aware `/api/attachments/{id}?inline=1` |
| **Category photo checklist** | เพิ่ม checklist รูปตามประเภท เก็บใน `system_settings` ด้วย key `asset_category_photo_checklist:{categoryId}`; ใช้ใน Asset Detail, หน้าเพิ่มทรัพย์สินช่วงรับเข้า, และ Audit Scan เพื่อเลือก label รูป เช่น Asset Tag / Serial Number / สภาพเครื่อง โดยไฟล์ถูกบันทึกเป็น attachment ของ asset; UX ล่าสุดใช้ปุ่ม checklist แทน dropdown พร้อม auto-label รายการแรกเมื่อผู้ใช้ไม่เลือกเอง |
| **Drag/drop uploads** | เพิ่ม `src/components/ui/file-dropzone.tsx` และใช้งานใน Asset photos/files, Asset receiving photos, Asset Model photos, Maintenance attachments, และ Audit photo evidence; หน้าที่มี record แล้ว เช่น Asset Detail, Maintenance Detail, และ Brand/Model Edit จะ drag/drop หรือ click เลือกไฟล์แล้ว auto-upload ทันทีโดยไม่ต้องกดปุ่มอัปโหลดซ้ำ ส่วนหน้า create/transaction ยัง queue ไฟล์ไว้ก่อนแล้ว upload หลังบันทึกสำเร็จ; ยังรองรับ click-to-select, mobile camera capture, เลือกไฟล์เดิมซ้ำได้หลัง retry, และ validation รองรับรูป `jpeg/png/webp/gif/avif/heic/heif` |
| **Structured asset model specs** | หน้า Brand/Model form เปลี่ยนจาก textarea spec เดียวเป็น rows แบบ label/value + notes พร้อมปุ่มเติมหัวข้อแนะนำ; table/list และ Asset Detail summarize specs จาก JSON หรือ legacy text ได้ |
| **Receiving/Audit photo capture** | หน้า `/assets/new` เพิ่ม section `รูปแรกเข้าทรัพย์สิน` เพื่อ queue รูปตาม checklist ก่อนบันทึก asset; หน้า `/audit/rounds/{id}/scan` เพิ่ม `รูปยืนยันการตรวจนับ` เพื่อแนบรูปพร้อมผล scan และบันทึกกลับเข้า asset attachments; ทั้งสองจุดใช้ checklist buttons และ fallback label อัตโนมัติเพื่อลดการลืมเลือกประเภท/มุมรูป |
| **Shared purchase documents** | เพิ่มตาราง `purchase_documents` และ `purchase_document_assets`; Asset Form เลือกเอกสารกลางเดิมหรือสร้างเอกสารใหม่พร้อมไฟล์ได้ หลังบันทึกจะ link กับ Asset ผ่าน `/api/assets/{id}/purchase-documents`; Asset Detail แสดงเอกสารกลางพร้อมไฟล์แนบ และยังแสดง legacy `asset_purchase` attachments |
| **Purchase document DB sync** | Local DB sync แล้วด้วย `npx prisma db push`; environment อื่นต้อง sync schema/generate Prisma ก่อนใช้ shared PO/Invoice workflow |
| **Asset components / assembly** | เพิ่มตาราง `asset_components`, API install/remove, UI ใน Asset Detail/Edit สำหรับส่วนควบปัจจุบันและประวัติ, และ flow หน้าเพิ่มทรัพย์สินที่เลือกติดตั้งเป็นส่วนควบหลังบันทึกได้; validation กัน self-link, cycle, component ที่ติดตั้งอยู่แล้ว, และ slot ซ้ำ |
| **Asset component DB sync** | Local DB sync แล้วด้วย `npx prisma db push`; environment อื่นต้อง sync schema/generate Prisma ก่อนเปิดใช้งานหน้า component section หรือ API ใหม่ |
| **Clickable table rows** | เพิ่ม `ClickableTableRow` กลางและปรับตารางหลักให้คลิกทั้งแถวเพื่อเข้า detail/edit ได้ ได้แก่ Asset register, Maintenance, Disposal, Audit rounds/findings/pending/detail, Master Data หลัก, Admin Users/Roles และ maintenance history ใน Asset Detail; nested actions เช่น edit/delete/download/checkbox ยังไม่โดน row navigation แทรก |
| **Searchable dropdowns** | เพิ่ม `SearchableSelect` กลางแทน native select สำหรับรายการยาวใน operational forms: checkout asset/destination, checkin active checkout/maintenance reporter, transfer asset/location/custodian/department, bulk move location + asset list search, maintenance asset/reporter/assignee/vendor, และ disposal asset/requester/approver; รองรับค้นหา, empty state, disabled option, clear optional value และ keyboard Enter/Escape |
| **Asset detail handover evidence** | หน้า Asset Detail เพิ่ม section ส่งมอบ/รับคืนพร้อมเลขเอกสาร, link ใบส่งมอบ/ใบรับคืน, รูปก่อนส่งมอบ, รูปหลังรับคืน และลายเซ็นแบบ preview รูปจริง; รูป/ลายเซ็น operation ถูกแยกจากรูปทรัพย์สินหลักด้วย `attachments.module`; รายการล่าสุดแสดงหลักฐานครบ ส่วนประวัติเก่าถูกยุบเป็น summary row ที่กดดูหลักฐานได้เพื่อรองรับ asset ที่ส่งมอบ/รับคืนหลายรอบ |
| **Operation document numbering** | เพิ่ม `documentNo` ใน `asset_checkouts` และ `asset_checkins`, generator กลาง `src/lib/operation-document-number.ts`, default format `HO-{yyyyMM}-{running}` / `RT-{yyyyMM}-{running}`, และ System Settings UI สำหรับแก้ template เช่น `{yyyyMM}-{running}` เพื่อให้ได้ `YYYYMM-0001` |
| **Asset movement custody timeline** | หน้า Asset Detail movement section แสดงชื่อ movement แบบ localize, badge/dot แยกสีตามประเภท, summary สั้น, link ไปเอกสารส่งมอบ/รับคืน, และรายละเอียด chain-of-custody เช่น ผู้ส่งมอบ ผู้รับ ผู้คืน ผู้รับคืน ปลายทาง และหมายเหตุ; check-in form/API บันทึก `returnByEmployeeId` และ `receiveByEmployeeId` เพิ่มเติมโดยยัง fallback ไปชื่อ legacy ได้; local DB sync แล้วด้วย `npx prisma db push` และ environment อื่นต้อง `prisma generate` หลัง sync |

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

1. **Phase 4 planning** — AD/LDAP, HR sync, and advanced dashboard scoping
2. **Advanced dashboard** — richer drill-down KPIs once reporting scope is confirmed
3. **Operational QA follow-up** — deeper workflow checks with realistic data mutations across asset, audit, maintenance, disposal, and admin modules

### Phase 1C Started

1. Asset Register list page with search and 200-row cap
2. Asset create/edit form with master data dropdowns
3. Auto asset tag generation using `[Company]-[Branch]-[Category]-[Running No.]`
4. Asset create/update/delete APIs with RBAC and audit log
5. Initial `asset_movements` logging for create and key field changes
6. Asset detail page with summary, QR Code, attachments section, and movement timeline
7. Attachment upload/download/delete with file validation and `UPLOAD_DIR` storage
8. Asset Register advanced filters, server-side pagination/sort, and duplicate serial validation
9. Dedicated printable QR label page linked from asset detail
10. Asset Register table column visibility, row selection, and CSV export for selected current-page assets
11. Asset Excel export for filtered results and import template download with reference-data sheets
12. Asset import validation preview: upload `.xlsx`, validate references/required/duplicates/date/price, and show row-level errors without writing DB
13. Asset import confirmation: persist validated rows, generate missing tags, write movement records, and audit each imported asset
14. Duplicate UX in asset form with pre-submit asset tag and serial checks
15. Check-out/check-in API and pages with movement and audit logging
16. Basic reports page, system log viewer, and live KPI dashboard
17. Asset transfer API/page with destination location, custodian, department, movement logging, and audit trail
18. Bulk location move API/page for moving multiple active, non-checked-out assets with movement and system log entries
19. Audit schema foundation: `audit_rounds`, `audit_items`, `audit_findings`, `audit_scan_history`
20. Audit Round API/page with scope filters and automatic expected asset list generation
21. Audit Round detail page with progress metrics and first 100 expected asset items
22. Audit Scan Capture API/page with manual/QR scan entry, scan history logging, mismatch detection, immediate location/custodian correction option, pending/approved finding creation, and found-later recovery for items previously marked not found
23. Audit Finding list and review API with approve/reject; approved findings update master asset and write movement/audit trail
24. Pending Audit Items page and Mark Not Found API; auditors with `audit:edit` can create `not_found` finding without changing asset status to Lost
25. QR scanner integration on Audit Scan page using `html5-qrcode` plus manual URL/Asset ID/Asset Tag fallback
26. Excel exports for Audit Result and Audit Finding reports
27. Audit Finding label resolver for UI/export expected/actual values
28. Granular Audit Finding review state: item reconciliation remains pending while other findings for the same audit item are still pending, and the finding list now shows item/reconcile status columns
29. PDF exports for Audit Result and Audit Findings, with UI download actions beside existing Excel exports
30. Printable handover and return forms for checkout/checkin transactions, with automatic redirect after successful operation
31. Stricter checkout/checkin status mapping using canonical master statuses and API-side return status validation
32. Checkout/checkin evidence upload for before/after photos and receiver signature files, persisted as operation attachments
33. Server-side pagination and sortable columns for high-volume master data pages: Employees, Locations, Suppliers
34. System Settings admin page/API for editing seeded `system_settings` with audit logging
35. User Management admin list page with search, pagination, sortable columns, role chips, status, employee link, and last login visibility
36. Roles & Permissions admin matrix page with role summary counts and module/action permission visibility
37. Maintenance ticket foundation with Prisma schema/table, list/create page, GET/POST API, audit log, movement log, and automatic Pending Repair asset status update
38. Maintenance ticket close flow with PATCH API, close modal, root cause/resolution/return date capture, movement/audit logging, and selectable post-repair asset status
39. Maintenance detail and attachments: ticket detail page, ticket attachment upload/download/delete, and asset-level maintenance history section
40. Maintenance polish with server-side search/status/type filters and printable A4 repair document page
41. Admin user create/edit flow with password hashing, employee linking, active flag, role assignment, and audit logging
42. Role permission edit flow with editable module/action permission matrix and audit logging
43. Disposal request foundation with Prisma schema/table, list/create page, GET/POST API, audit log, movement log, and automatic Pending Disposal asset status update
44. Disposal approval/reject flow with PATCH API, review modal, selectable post-review asset status, value/remark capture, movement logging, and audit trail
45. Audit scan QA hardening with camera support detection, device picker, responsive QR scan box, decoded-value visibility, camera status/errors, and manual fallback guidance
46. Disposal detail and print flow with request detail page, asset/decision/movement sections, list deep link, and printable A4 approval document
47. Maintenance attachment previews with image/PDF inline rendering, preview modal, thumbnail cards, download/delete actions, and inline attachment API mode
48. Role management polish with role create API/page, metadata editing, whole-module permission selection, system role metadata guards, and protected system administrator permissions
49. Disposal polish with shared filter query, search/status/type/date filtering, clear filters, result count, and Excel export matching current filters
50. Maintenance polish with shared filter query, search/status/type/evidence/date filtering, clear filters, result count, and Excel export with attachment counts
51. Asset tag category prefix mapping in System Settings, with category-specific prefixes used during new asset tag generation
52. Flexible asset tag format template in System Settings, including company/asset-company/category/prefix/date/running tokens
53. System Settings UX polish with task-oriented sections and format presets instead of raw key/value editing
54. Operational QA smoke pass across 24 core pages, clean lint warnings, and migrated Next.js `middleware.ts` to `proxy.ts`
55. Operational mutation QA with real QA master data/asset, checkout/checkin verification, print document key fix, and maintenance create validation hardening
56. Phase 4 scope narrowed to AD/LDAP Login and Mobile Optimization only
57. AD/LDAP login foundation with optional env-driven directory authentication, local fallback, and default-role auto-provision support
58. Mobile optimization pass for viewport, dashboard shell spacing, sidebar behavior, topbar density, logout action, and login form touch targets
59. LDAP settings UI in System Settings with DB-backed config, bind connection test endpoint, and sync strategy controls
60. LDAP sync preview/manual workflow with employee create/update/deactivate preview, guarded apply, audit logging, external scheduler script, and AD mapping from `employeeID`, `company`, and `distinguishedName` OU order
61. Asset custom detail templates by category, rendered automatically in Asset Form while preserving `customFieldsJson`
62. Asset Model photos and Asset Detail photo workflow with category photo checklist backed by `system_settings`
63. Reusable drag-and-drop upload zone for asset files/photos, model photos, and maintenance attachments, with auto-upload on existing-record pages and queued upload on create/transaction pages
64. Asset Components schema/API/UI for parent-child assembly, install/remove, current/history display, validation, movement logs, and audit trail
65. Asset create optional install-after-save flow that creates the new asset first, then links it as a component of the selected parent asset
66. Asset purchase document uploads for PO, invoice, delivery note, warranty, quotation, contract, and other files, separated as `asset_purchase` attachments
67. Checkout receiver signature pad replacing signature file upload, with saved PNG evidence and printed handover signature rendering
68. Checkout before-handover photo picker upgraded to drag/drop plus mobile camera capture through shared `FileDropzone`
69. Check-in after-return photo picker upgraded to drag/drop plus mobile camera capture through shared `FileDropzone`
70. Shared Purchase Document workflow with central PO/Invoice records, many-to-many Asset linking, central file attachment, Asset Form selection/create flow, and Asset Detail display
71. Structured Asset Model specs UX with label/value rows, category presets, notes, legacy text parsing, and summarized display in model list and Asset Detail
72. Asset Model photo upload/display polish: broader image MIME support, retryable file picker, non-cropping previews, and compact model thumbnails in the Brand/Model table
73. Receiving and audit photo capture using category checklist labels: `/assets/new` queues photos before create, and Audit Scan can save photo evidence with scan results; both use checklist button UX with automatic fallback labels
74. Asset Tag Company Code for separating generated asset tags from AD/LDAP company codes, with `{assetCompanyCode}` template token and company master-data field
75. Audit scan correction workflow: scan page exposes an "update location/custodian to actual" checkbox only when those fields mismatch; API creates approved findings, writes `audit_*_correction` movement logs, updates master asset, and closes stale `not_found` findings if the asset is found later in the same round
76. Table row navigation UX: reusable `ClickableTableRow` enables whole-row click and keyboard Enter/Space navigation across asset, maintenance, disposal, audit, master data, and admin list tables while preserving nested action controls
77. Searchable dropdown UX: reusable `SearchableSelect` replaces long native select controls in checkout/checkin/transfer/bulk move/maintenance/disposal forms, and bulk move asset selection now has a quick filter input for large asset lists
78. Asset Detail handover/return section with document links, operation photo evidence previews, and signature previews; asset photo gallery now filters to `module=asset` so operation signatures/photos no longer appear as asset photos
79. Readable checkout/checkin document numbers with DB columns, generator, print-page display, Asset Detail display, configurable System Settings templates, and local SQL Server backfill for existing operation records
80. Asset Detail movement custody timeline with human-readable movement titles, color-coded badges/dots, summary text, checkout/checkin document deep links, destination/custody actor details, and nullable employee references for check-in return/receive actors
81. Asset Detail handover/return history compact layout: latest transaction remains fully expanded with evidence previews, while older checkout/checkin rounds are collapsed into summary rows with document links and expandable evidence panels

---

## 14. Reference Documents

| Document | Location |
|---|---|
| System Requirements | `System Requirement (2).md` |
| UI/UX Requirements | `Enterprise Web UI UX Requirements.md` |
| Tech Stack Decision | `Tech Stack.md` |
| Implementation Plan | `Implementation Plan.md` |
