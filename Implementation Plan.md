# Implementation Plan — Asset Management System (Phase 1)

## Goal

สร้าง Core Asset Management System ครอบคลุม: Master Data, Asset Register, Check-out/Check-in, QR Code, Basic Reports, RBAC, Audit Trail, i18n (TH/EN)

---

## Phase 1 Sub-phases

| Sub-phase | ขอบเขต | ประมาณการ |
|---|---|---|
| **1A: Foundation** | Project setup, DB schema, Auth, i18n, Layout, Design system | Week 1-2 |
| **1B: Master Data** | Company, Branch, Department, Employee, Location, Category, Brand/Model, Status/Condition, Supplier | Week 3-4 |
| **1C: Asset Register** | Asset CRUD, Asset Tag gen, Custom Fields, Asset Detail, QR Code, Attachments, Movement History | Week 5-6 |
| **1D: Operations** | Check-out, Check-in, Search/Filter, Import/Export, Basic Reports, Dashboard | Week 7-8 |

---

## Proposed Changes

### Phase 1A: Foundation

---

#### [NEW] Project Initialization

```bash
npx create-next-app@latest ./ --typescript --tailwind --eslint --app --src-dir
npx shadcn@latest init
npx prisma init --datasource-provider sqlserver
npm install next-auth@5 next-intl @tanstack/react-table @tanstack/react-query
npm install react-hook-form @hookform/resolvers zod zustand recharts
npm install qrcode.react html5-qrcode react-to-print react-dropzone
npm install exceljs @react-pdf/renderer nodemailer date-fns uuid bcryptjs sonner cmdk
```

---

#### [NEW] Project Structure

```
d:\Antigravity\asset-system\
├── prisma/
│   └── schema.prisma
├── messages/
│   ├── th.json                    # Thai translations
│   └── en.json                    # English translations
├── src/
│   ├── app/
│   │   ├── [locale]/
│   │   │   ├── (auth)/
│   │   │   │   └── login/page.tsx
│   │   │   ├── (dashboard)/
│   │   │   │   ├── layout.tsx          # Sidebar + Topbar
│   │   │   │   ├── dashboard/page.tsx
│   │   │   │   ├── assets/             # Asset Register
│   │   │   │   ├── asset-management/   # Check-out, Check-in
│   │   │   │   ├── master-data/        # Company, Branch, etc.
│   │   │   │   ├── reports/
│   │   │   │   └── admin/             # Users, Roles, Logs
│   │   │   ├── layout.tsx
│   │   │   └── page.tsx               # Redirect to dashboard
│   │   └── api/
│   │       ├── auth/[...nextauth]/route.ts
│   │       ├── companies/route.ts
│   │       ├── branches/route.ts
│   │       ├── departments/route.ts
│   │       ├── employees/route.ts
│   │       ├── locations/route.ts
│   │       ├── categories/route.ts
│   │       ├── assets/route.ts
│   │       ├── assets/[id]/route.ts
│   │       ├── assets/[id]/checkout/route.ts
│   │       ├── assets/[id]/checkin/route.ts
│   │       ├── import/route.ts
│   │       └── export/route.ts
│   ├── components/
│   │   ├── ui/                    # shadcn/ui components
│   │   ├── layout/
│   │   │   ├── sidebar.tsx
│   │   │   ├── topbar.tsx
│   │   │   ├── breadcrumb-nav.tsx
│   │   │   └── mobile-nav.tsx
│   │   ├── data-table/
│   │   │   ├── data-table.tsx     # Reusable TanStack Table
│   │   │   ├── columns.tsx
│   │   │   ├── toolbar.tsx
│   │   │   └── pagination.tsx
│   │   └── shared/
│   │       ├── status-badge.tsx
│   │       ├── condition-badge.tsx
│   │       ├── file-upload.tsx
│   │       ├── qr-code-display.tsx
│   │       └── confirm-dialog.tsx
│   ├── lib/
│   │   ├── db.ts                  # Prisma client
│   │   ├── auth.ts                # NextAuth config
│   │   ├── auth-utils.ts          # RBAC helpers
│   │   ├── utils.ts               # General utilities
│   │   ├── asset-tag.ts           # Asset Tag generator
│   │   └── audit-log.ts           # Audit Trail helper
│   ├── hooks/
│   │   └── use-data-table.ts
│   ├── stores/
│   │   └── filter-store.ts
│   ├── types/
│   │   ├── next-auth.d.ts         # Auth type extensions
│   │   └── index.ts
│   ├── i18n/
│   │   ├── routing.ts
│   │   └── request.ts
│   └── middleware.ts              # Auth + i18n middleware
├── docker/
│   ├── Dockerfile
│   └── nginx.conf
├── .env
├── docker-compose.yml
└── next.config.ts
```

---

#### [NEW] Database Schema (Prisma) — Core Tables

> [!IMPORTANT]
> ด้านล่างนี้คือ schema หลัก 25+ tables สำหรับ Phase 1 ทั้งหมด

**Organization Tables:** `companies`, `branches`, `departments`, `employees`

**Location Tables:** `locations` (self-referencing parent_id for hierarchy)

**Asset Tables:** `asset_categories`, `asset_brands`, `asset_models`, `assets`, `asset_custom_field_definitions`, `asset_custom_field_values`

**Reference Tables:** `asset_statuses`, `asset_conditions`, `suppliers`

**Transaction Tables:** `asset_checkouts`, `asset_checkins`, `asset_movements`

**File Tables:** `attachments`

**Auth Tables:** `users`, `roles`, `permissions`, `role_permissions`, `user_roles`

**System Tables:** `system_logs`, `notifications`

Key design decisions:
- ทุก table มี `is_active`, `created_at`, `updated_at`, `created_by`, `updated_by`
- Soft delete ทุก table (ไม่ hard delete)
- `assets` table มี `custom_fields_json` (NVARCHAR(MAX)) สำหรับ snapshot + EAV table สำหรับ query
- `locations` มี `parent_id` self-reference สำหรับ hierarchy
- `asset_movements` เก็บทุก change: location, custodian, department, status, condition
- NVARCHAR สำหรับทุก text field (รองรับ Thai)

---

#### [NEW] Authentication & RBAC

- NextAuth.js v5 Credentials Provider
- JWT strategy เก็บ `userId`, `role`, `companyIds`, `branchIds`
- Middleware ตรวจ auth ทุก route ยกเว้น `/login` และ `/api/auth`
- RBAC helper function: `checkPermission(session, module, action)`
- Initial roles: `system_admin`, `asset_admin`, `it_staff`, `admin_staff`, `branch_staff`, `department_manager`, `auditor`, `audit_reviewer`, `accounting`, `employee`, `viewer`

---

#### [NEW] i18n Setup (next-intl)

- Default locale: `th`
- Supported: `th`, `en`
- `messages/th.json` และ `messages/en.json` — structured by namespace
- Locale switcher ใน Topbar
- URL pattern: `/th/dashboard`, `/en/dashboard`

---

#### [NEW] Layout — Enterprise Dashboard

ตาม requirement A.4:
- **Topbar:** System name, Global search (cmdk), Notification bell, Language switcher, User profile dropdown
- **Sidebar:** Collapsible, menu groups ตาม Section 24 ของ requirement
- **Main content:** Breadcrumb + Page title + Content area
- **Mobile:** Hamburger menu, sidebar เป็น drawer
- **Color theme:** ตาม A.3 (Primary #1E3A5F, Background #F8FAFC, etc.)

---

### Phase 1B: Master Data

---

#### Pattern สำหรับทุก Master Data Module

ทุก module ใช้ pattern เดียวกัน:

| Component | File |
|---|---|
| List page | `src/app/[locale]/(dashboard)/master-data/{module}/page.tsx` |
| Create form | `src/app/[locale]/(dashboard)/master-data/{module}/new/page.tsx` |
| Edit form | `src/app/[locale]/(dashboard)/master-data/{module}/[id]/edit/page.tsx` |
| API routes | `src/app/api/{module}/route.ts` + `[id]/route.ts` |
| Zod schema | `src/lib/validations/{module}.ts` |
| Table columns | `src/components/{module}/columns.tsx` |

Features ทุก module:
- Data Table (sort, filter, pagination, search)
- Create / Edit form (React Hook Form + Zod)
- Active/Inactive toggle (soft delete)
- Audit Trail logging
- i18n labels

#### Modules (8 modules):

1. **Company** — code, name TH/EN, tax ID, address, active
2. **Branch** — code, name, company FK, address, contact, active
3. **Department** — code, name, company FK, active
4. **Employee** — code, name TH/EN, email, company/branch/department FK, position, employment status, manager
5. **Location** — code, name, branch FK, parent location FK, location type, description, active
6. **Category** — code, name, description, custom field template
7. **Brand/Model** — brand (name), model (name, category FK, brand FK, specs)
8. **Supplier** — code, name, contact, address, active

---

### Phase 1C: Asset Register

---

#### [NEW] Asset List Page
`src/app/[locale]/(dashboard)/assets/page.tsx`

- TanStack Table with server-side pagination
- Columns: Asset Tag, Name, Category, Company, Branch, Location, Custodian, Status badge, Condition badge
- Advanced filters: Company, Branch, Department, Location, Category, Status, Condition
- Bulk actions: Change status, Export selected
- Column visibility toggle
- Freeze Asset Tag column

#### [NEW] Asset Create/Edit
`src/app/[locale]/(dashboard)/assets/new/page.tsx`
`src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx`

Multi-section form (ตาม A.8):
1. Basic Info (tag, name, category, brand, model, serial)
2. Ownership (company, branch, department)
3. Location & Custodian
4. Purchase & Warranty
5. Custom Fields (dynamic ตาม category)
6. Attachments (drag & drop)

#### [NEW] Asset Detail Page
`src/app/[locale]/(dashboard)/assets/[id]/page.tsx`

ตาม requirement A.9:
- Summary card + Photo + QR Code
- Status/Condition badges
- Ownership info
- Location info
- Purchase/Warranty info
- Custom fields
- Attachments
- Movement Timeline
- Quick Action buttons: Check-out, Check-in, Print Label

#### [NEW] Asset Tag Generator
`src/lib/asset-tag.ts`

Format: `[Company]-[Branch]-[Category]-[Running No.]`
- Running number แยกตาม Company/Branch/Category
- ห้ามซ้ำ (unique constraint)
- Serial Number duplicate check

#### [NEW] QR Code
- Generate: `qrcode.react` แสดงใน Asset Detail
- Print Label: `react-to-print` with custom label layout (Asset Tag, Name, Serial, QR)
- Scan: จะใช้เต็มที่ใน Phase 2 (Audit) แต่ Phase 1 สร้าง component ไว้

#### [NEW] Attachments
- Drag & drop upload (react-dropzone)
- Server-side validation (type, size)
- Storage: `/var/data/asset-system/uploads/{module}/{year}/{month}/`
- Multiple files per record
- Download/Delete with permission check

---

### Phase 1D: Operations

---

#### [NEW] Check-out Asset
`src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx`

- Select asset (search/scan)
- Checkout type: User / Department / Location / Asset
- Condition before
- Photo before (optional)
- Expected return date
- Remark + Receiver signature (optional)
- On submit: Status → In Use, update custodian/location, create movement, audit trail

#### [NEW] Check-in Asset
`src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx`

- Select asset (search/scan)
- Return date, condition after
- Missing accessories, damage note
- Next status (Ready/Repair/Disposal)
- Next location
- On submit: Clear custodian, update location/status/condition, create movement, audit trail

#### [NEW] Import from Excel
`src/app/api/import/route.ts`

- Upload Excel template
- Server-side validation (required fields, duplicates, FK existence, date format, number format)
- Error report per row
- Download error file
- Support: Company, Branch, Department, Employee, Location, Asset

#### [NEW] Export
- Excel (exceljs): All data tables + filtered results
- PDF (@react-pdf/renderer): Asset Register, Handover Form, Return Form
- CSV: Simple exports
- Thai font: Sarabun Base64

#### [NEW] Dashboard
`src/app/[locale]/(dashboard)/dashboard/page.tsx`

- KPI Cards: Total Assets, In Use, Ready, Pending Repair, Warranty Expiring
- Charts (Recharts): Asset by Company, Branch, Category, Status
- Alert Panel: Warranty expiring, Overdue return
- Recent Activity feed
- Quick filters: Company, Branch

#### [NEW] Basic Reports
`src/app/[locale]/(dashboard)/reports/page.tsx`

Phase 1 reports:
- Asset Register Report (Excel/PDF)
- Asset by Company/Branch/Department/Location (Excel)
- Asset by Custodian (Excel)
- Employee Asset Holding Report (PDF)
- Asset Handover Form (PDF)
- Asset Return Form (PDF)

#### [NEW] System Logs (Audit Trail)
`src/app/[locale]/(dashboard)/admin/logs/page.tsx`

- Log viewer with filters: date range, user, action, module
- Logged events: all CRUD, checkout, checkin, status/condition change, file upload/delete, login, permission change

---

## Verification Plan

### Automated Tests
```bash
# Prisma schema validation
npx prisma validate

# Type checking
npx tsc --noEmit

# Build check
npm run build
```

### Manual Verification (Browser)
- Login flow (correct/incorrect credentials)
- RBAC: different roles see different menus
- i18n: switch TH↔EN, verify labels
- Master Data: full CRUD cycle for each module
- Asset: create with auto-tag, view detail, QR code display
- Check-out → Check-in flow
- Import Excel → verify data
- Export Excel/PDF → verify Thai font
- Dashboard: KPI cards load correctly
- Responsive: mobile sidebar, tablet table
- Audit trail: verify log entries after each action

### Performance
- Asset list with 1,000+ test records — pagination works under 3s
- Global search responds within 2s

---

## Resolved Questions

| # | คำถาม | คำตอบ |
|---|---|---|
| 1 | Asset Tag Prefix | ✅ ทำเป็น **System Setting** — กำหนด prefix ได้ผ่านหน้า admin |
| 2 | Check-out/Check-in Approval | ✅ **ไม่ต้องมี approval** — Asset Admin ทำได้เลย |
| 3 | Employee Import | ✅ ยังไม่มี Excel — จะเชื่อม AD/LDAP ใน Phase 4 |
| 4 | Seed Data | ✅ **สร้างไว้ก่อน** — Status 14 รายการ, Condition 8 รายการ, Location Types 12 รายการ แก้ไขได้ทีหลังผ่าน admin |
