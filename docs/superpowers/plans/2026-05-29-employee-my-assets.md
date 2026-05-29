# Employee My Assets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let a signed-in employee see the active assets they personally hold, without granting broad Asset Register visibility.

**Architecture:** Add a dedicated server-rendered dashboard route at `/{locale}/my-assets` that is scoped by `session.user.employeeId` and hard-filters `assets.custodianId` on the server. Add a small pure helper for query/summaries, a sidebar entry that only appears for linked employee users, and regression tests that prove employee users can see "My Assets" without `asset:view`.

**Tech Stack:** Next.js 16 App Router, React 19 server components, Prisma SQL Server, next-intl messages, Tailwind CSS 4, Node test runner.

---

## Product / UX Direction

**Visual thesis:** A quiet self-service asset ledger: official, compact, and easy for an employee to scan on desktop or mobile.

**Content plan:** Start with employee ownership summary, then status chips, then the read-only asset list with photo, asset tag, serial, status, location, and last updated context.

**Interaction thesis:** Keep the first version read-only. Use server-side filters and responsive table/cards rather than a complex dashboard; every action should either open a permitted asset detail page or return the user to Work Center.

**Non-goals for v1:**
- Do not grant employee users broad `asset:view`.
- Do not expose purchase price, supplier, accounting, disposal, audit, or admin fields.
- Do not add checkout/checkin actions for employees in this pass.
- Do not create a new API route unless the server component cannot satisfy the page.

---

## File Map

- Create `src/lib/my-assets.ts`
  - Owns the employee-scoped asset where clause and pure summary helpers.
- Create `tests/my-assets.test.ts`
  - Unit tests for safe scoping and summary behavior.
- Create `src/app/[locale]/(dashboard)/my-assets/page.tsx`
  - Server page for `/{locale}/my-assets`.
  - Reads the current session user, handles no linked employee, queries only assets where `custodianId = user.employeeId`.
- Modify `src/components/layout/sidebar.tsx`
  - Add "My Assets" near Dashboard / Work Center when `user.employeeId` exists.
- Modify `messages/th.json` and `messages/en.json`
  - Add `nav.myAssets` and a new `myAssets` message namespace.
- Modify `tests/permission-aware-navigation.test.ts`
  - Cover helper behavior if the navigation helper needs a linked-employee condition.
- Create `tests/my-assets-route-ui.test.ts`
  - Source-level regression test for the route, sidebar condition, and no broad `asset:view` requirement.
- Modify `DEVELOPER_HANDOFF.md`, `docs/04_AUTH_RBAC.md`, `docs/07_UAT_CHECKLIST.md`, and `docs/99_CHANGELOG.md`
  - Document employee self-service asset visibility and testing expectations.

---

### Task 1: Add Scoped Helper And Unit Tests

**Files:**
- Create: `src/lib/my-assets.ts`
- Create: `tests/my-assets.test.ts`

- [ ] **Step 1: Write failing helper tests**

Create `tests/my-assets.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  buildMyAssetsWhere,
  summarizeMyAssets,
  type MyAssetSummaryItem,
} from "../src/lib/my-assets.ts"

test("builds an employee-only asset scope", () => {
  assert.deepEqual(buildMyAssetsWhere({ employeeId: "emp-001" }), {
    isActive: true,
    custodianId: "emp-001",
  })
})

test("uses an impossible scope when the session is not linked to an employee", () => {
  assert.deepEqual(buildMyAssetsWhere({ employeeId: null }), {
    id: "__my_assets_no_employee__",
  })
  assert.deepEqual(buildMyAssetsWhere({}), {
    id: "__my_assets_no_employee__",
  })
})

test("summarizes employee assets by status and attention state", () => {
  const items: MyAssetSummaryItem[] = [
    { statusName: "Ready", hasPhoto: true },
    { statusName: "Under Maintenance", hasPhoto: true },
    { statusName: "Pending Repair", hasPhoto: false },
  ]

  assert.deepEqual(summarizeMyAssets(items), {
    total: 3,
    ready: 1,
    needsAttention: 2,
    missingPhoto: 1,
  })
})
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
node --test tests/my-assets.test.ts
```

Expected: fails because `src/lib/my-assets.ts` does not exist.

- [ ] **Step 3: Implement the helper**

Create `src/lib/my-assets.ts`:

```ts
import type { Prisma } from "@prisma/client"

export type MyAssetsUser = {
  employeeId?: string | null
}

export type MyAssetSummaryItem = {
  statusName: string | null
  hasPhoto: boolean
}

export function buildMyAssetsWhere(user: MyAssetsUser): Prisma.AssetWhereInput {
  const employeeId = user.employeeId?.trim()
  if (!employeeId) return { id: "__my_assets_no_employee__" }
  return { isActive: true, custodianId: employeeId }
}

export function summarizeMyAssets(items: MyAssetSummaryItem[]) {
  return {
    total: items.length,
    ready: items.filter((item) => normalizeStatus(item.statusName) === "ready").length,
    needsAttention: items.filter((item) => {
      const status = normalizeStatus(item.statusName)
      return status === "under maintenance" || status === "pending repair"
    }).length,
    missingPhoto: items.filter((item) => !item.hasPhoto).length,
  }
}

function normalizeStatus(value: string | null) {
  return (value ?? "").trim().toLocaleLowerCase()
}
```

- [ ] **Step 4: Run the helper test and confirm it passes**

Run:

```powershell
node --test tests/my-assets.test.ts
```

Expected: 3 tests pass.

- [ ] **Step 5: Commit the helper**

```powershell
git add src/lib/my-assets.ts tests/my-assets.test.ts
git commit -m "Add employee my assets scope helper"
```

---

### Task 2: Build The My Assets Page

**Files:**
- Create: `src/app/[locale]/(dashboard)/my-assets/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Create: `tests/my-assets-route-ui.test.ts`

- [ ] **Step 1: Write route/UI source regression tests**

Create `tests/my-assets-route-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("my assets page is employee scoped and does not require broad asset view", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/my-assets/page.tsx", "utf8")

  assert.match(page, /buildMyAssetsWhere\(\{ employeeId: user\.employeeId \}\)/)
  assert.match(page, /custodianId/)
  assert.doesNotMatch(page, /requirePagePermission\(locale,\s*"asset",\s*"view"\)/)
  assert.doesNotMatch(page, /purchasePrice|supplier|fixedAssetCode/)
})

test("my assets route has Thai and English translations", () => {
  const th = readFileSync("messages/th.json", "utf8")
  const en = readFileSync("messages/en.json", "utf8")

  assert.match(th, /"myAssets"/)
  assert.match(th, /"ทรัพย์สินของฉัน"/)
  assert.match(en, /"myAssets"/)
  assert.match(en, /"My Assets"/)
})
```

- [ ] **Step 2: Run the route/UI test and confirm it fails**

Run:

```powershell
node --test tests/my-assets-route-ui.test.ts
```

Expected: fails because the route and translations do not exist yet.

- [ ] **Step 3: Add translations**

Add to `messages/th.json` under `nav`:

```json
"myAssets": "ทรัพย์สินของฉัน"
```

Add a top-level `myAssets` namespace in `messages/th.json`:

```json
"myAssets": {
  "title": "ทรัพย์สินของฉัน",
  "subtitle": "รายการทรัพย์สินที่ผูกกับโปรไฟล์พนักงานของคุณในปัจจุบัน",
  "total": "ทั้งหมด",
  "ready": "พร้อมใช้งาน",
  "needsAttention": "ต้องติดตาม",
  "missingPhoto": "ยังไม่มีรูป",
  "asset": "ทรัพย์สิน",
  "serialNumber": "Serial Number",
  "status": "สถานะ",
  "condition": "สภาพ",
  "location": "ที่ตั้ง",
  "companyBranch": "บริษัท / สาขา",
  "category": "หมวดหมู่",
  "noLinkedEmployeeTitle": "บัญชีนี้ยังไม่ได้ผูกกับพนักงาน",
  "noLinkedEmployeeHelp": "ติดต่อผู้ดูแลระบบให้ผูกบัญชีผู้ใช้กับข้อมูลพนักงานก่อน จึงจะแสดงทรัพย์สินที่ถือครองได้",
  "emptyTitle": "ยังไม่มีทรัพย์สินที่คุณถือครอง",
  "emptyHelp": "ถ้าคุณควรถือครองทรัพย์สิน ให้ตรวจสอบกับผู้ดูแลทรัพย์สินว่ามีการส่งมอบหรือโอนผู้ถือครองแล้วหรือยัง",
  "openWorkCenter": "เปิดศูนย์งานค้าง",
  "updatedAt": "อัปเดตล่าสุด"
}
```

Add to `messages/en.json` under `nav`:

```json
"myAssets": "My Assets"
```

Add a top-level `myAssets` namespace in `messages/en.json`:

```json
"myAssets": {
  "title": "My Assets",
  "subtitle": "Assets currently linked to your employee profile.",
  "total": "Total",
  "ready": "Ready",
  "needsAttention": "Needs attention",
  "missingPhoto": "Missing photo",
  "asset": "Asset",
  "serialNumber": "Serial Number",
  "status": "Status",
  "condition": "Condition",
  "location": "Location",
  "companyBranch": "Company / Branch",
  "category": "Category",
  "noLinkedEmployeeTitle": "This account is not linked to an employee",
  "noLinkedEmployeeHelp": "Ask an administrator to link your user account to an employee record before personal assets can be shown.",
  "emptyTitle": "You do not currently hold any assets",
  "emptyHelp": "If you should hold assets, ask the asset administrator to confirm the handover or custodian transfer.",
  "openWorkCenter": "Open Work Center",
  "updatedAt": "Last updated"
}
```

- [ ] **Step 4: Implement the server page**

Create `src/app/[locale]/(dashboard)/my-assets/page.tsx` using this structure:

```tsx
import Image from "next/image"
import Link from "next/link"
import { PackageCheck, ShieldAlert } from "lucide-react"
import { getTranslations } from "next-intl/server"
import { prisma } from "@/lib/db"
import { getSessionUser } from "@/lib/auth-utils"
import { buildMyAssetsWhere, summarizeMyAssets } from "@/lib/my-assets"
import { ContentPanel } from "@/components/ui/content-panel"
import {
  getDesktopTableOnlyClasses,
  getEmptyStateClasses,
  getMobileCardListClasses,
  getResponsiveTableScrollClasses,
  getSafeActionLinkClasses,
} from "@/lib/design-system"
import { formatDateTime } from "@/lib/utils"

type MyAssetsPageProps = {
  params: Promise<{ locale: string }>
}

export default async function MyAssetsPage({ params }: MyAssetsPageProps) {
  const { locale } = await params
  const user = await getSessionUser()
  const t = await getTranslations("myAssets")

  if (!user?.employeeId) {
    return (
      <div className="space-y-6">
        <header>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </header>
        <ContentPanel>
          <div className={getEmptyStateClasses()}>
            <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-warning" />
            <div className="font-medium text-foreground">{t("noLinkedEmployeeTitle")}</div>
            <p className="mt-1">{t("noLinkedEmployeeHelp")}</p>
          </div>
        </ContentPanel>
      </div>
    )
  }

  const assets = await prisma.asset.findMany({
    where: buildMyAssetsWhere({ employeeId: user.employeeId }),
    include: {
      category: { select: { code: true, name: true } },
      company: { select: { code: true } },
      branch: { select: { code: true } },
      currentLocation: { select: { code: true, name: true } },
      status: { select: { name: true, nameTh: true, colorCode: true } },
      condition: { select: { nameTh: true, colorCode: true } },
      attachments: {
        where: { module: "asset", fileType: { startsWith: "image/" }, isActive: true },
        select: { id: true, originalName: true },
        orderBy: { uploadedAt: "desc" },
        take: 1,
      },
    },
    orderBy: [{ status: { sortOrder: "asc" } }, { updatedAt: "desc" }],
  })

  const summary = summarizeMyAssets(
    assets.map((asset) => ({
      statusName: asset.status.name,
      hasPhoto: asset.attachments.length > 0,
    }))
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">{t("title")}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link href={`/${locale}/work-center?view=mine`} className={getSafeActionLinkClasses("secondary")}>
          {t("openWorkCenter")}
        </Link>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label={t("total")} value={summary.total} />
        <Metric label={t("ready")} value={summary.ready} />
        <Metric label={t("needsAttention")} value={summary.needsAttention} />
        <Metric label={t("missingPhoto")} value={summary.missingPhoto} />
      </div>

      <ContentPanel>
        {assets.length === 0 ? (
          <div className={getEmptyStateClasses()}>
            <PackageCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" />
            <div className="font-medium text-foreground">{t("emptyTitle")}</div>
            <p className="mt-1">{t("emptyHelp")}</p>
          </div>
        ) : (
          <>
            <div className={getMobileCardListClasses()}>
              {assets.map((asset) => (
                <MobileAssetCard key={asset.id} locale={locale} labels={t} asset={asset} />
              ))}
            </div>
            <div className={getDesktopTableOnlyClasses()}>
              <div className={getResponsiveTableScrollClasses()}>
                <table className="min-w-full divide-y divide-border text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <Head>{t("asset")}</Head>
                      <Head>{t("serialNumber")}</Head>
                      <Head>{t("status")}</Head>
                      <Head>{t("condition")}</Head>
                      <Head>{t("location")}</Head>
                      <Head>{t("updatedAt")}</Head>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border bg-surface">
                    {assets.map((asset) => (
                      <tr key={asset.id} className="hover:bg-accent/40">
                        <td className="px-4 py-3">
                          <AssetIdentity locale={locale} asset={asset} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{asset.serialNumber || "-"}</td>
                        <td className="px-4 py-3">
                          <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
                        </td>
                        <td className="px-4 py-3">
                          <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {asset.currentLocation.code} - {asset.currentLocation.name}
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{formatDateTime(asset.updatedAt, locale)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </ContentPanel>
    </div>
  )
}
```

Add these local component definitions under the page component in the same file:

```tsx
type MyAssetRow = {
  id: string
  assetTag: string
  name: string
  serialNumber: string | null
  updatedAt: Date
  category: { code: string; name: string }
  company: { code: string }
  branch: { code: string }
  currentLocation: { code: string; name: string }
  status: { name: string; nameTh: string; colorCode: string | null }
  condition: { nameTh: string; colorCode: string | null }
  attachments: Array<{ id: string; originalName: string }>
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
      <div className="text-sm text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value.toLocaleString("th-TH")}</div>
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}

function StatusPill({ label, color }: { label: string; color: string | null }) {
  return (
    <span
      className="inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{
        borderColor: color ?? "var(--border)",
        color: color ?? "var(--foreground)",
        backgroundColor: color ? `${color}12` : "var(--muted)",
      }}
    >
      {label}
    </span>
  )
}

function AssetIdentity({ locale, asset }: { locale: string; asset: MyAssetRow }) {
  const photo = asset.attachments[0]

  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border bg-muted">
        {photo ? (
          <Image
            src={`/api/attachments/${photo.id}?inline=1`}
            alt={photo.originalName}
            width={48}
            height={48}
            className="h-full w-full object-contain"
          />
        ) : (
          <PackageCheck className="h-5 w-5 text-muted-foreground" />
        )}
      </div>
      <div className="min-w-0">
        <div className="font-semibold text-foreground">{asset.assetTag}</div>
        <div className="truncate text-sm text-foreground">{asset.name}</div>
        <div className="truncate text-xs text-muted-foreground">
          {asset.category.code} - {asset.category.name}
        </div>
      </div>
    </div>
  )
}

function MobileAssetCard({
  locale,
  labels,
  asset,
}: {
  locale: string
  labels: (key: string) => string
  asset: MyAssetRow
}) {
  return (
    <div className="rounded-md border border-border bg-surface p-4 shadow-sm">
      <AssetIdentity locale={locale} asset={asset} />
      <div className="mt-3 grid gap-2 text-sm">
        <MobileField label={labels("serialNumber")} value={asset.serialNumber || "-"} />
        <MobileField label={labels("location")} value={`${asset.currentLocation.code} - ${asset.currentLocation.name}`} />
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{labels("status")}</span>
          <StatusPill label={asset.status.nameTh} color={asset.status.colorCode} />
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">{labels("condition")}</span>
          <StatusPill label={asset.condition.nameTh} color={asset.condition.colorCode} />
        </div>
      </div>
    </div>
  )
}

function MobileField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 justify-between gap-3">
      <span className="shrink-0 text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-right font-medium text-foreground">{value}</span>
    </div>
  )
}
```

These local components are display-only. They must not include purchase price, supplier, accounting, or admin-only fields.

- [ ] **Step 5: Run the route/UI test**

Run:

```powershell
node --test tests/my-assets-route-ui.test.ts
```

Expected: route/UI tests pass.

- [ ] **Step 6: Commit the route**

```powershell
git add "src/app/[locale]/(dashboard)/my-assets/page.tsx" messages/th.json messages/en.json tests/my-assets-route-ui.test.ts
git commit -m "Add employee my assets page"
```

---

### Task 3: Add Sidebar Entry Without Broad Asset Permission

**Files:**
- Modify: `src/components/layout/sidebar.tsx`
- Modify: `tests/my-assets-route-ui.test.ts`

- [ ] **Step 1: Extend the sidebar regression test**

Append to `tests/my-assets-route-ui.test.ts`:

```ts
test("sidebar exposes My Assets only through linked employee identity", () => {
  const sidebar = readFileSync("src/components/layout/sidebar.tsx", "utf8")

  assert.match(sidebar, /labelKey: "myAssets"/)
  assert.match(sidebar, /user\.employeeId/)
  assert.match(sidebar, /href: `\/\$\{locale\}\/my-assets`/)
  assert.doesNotMatch(sidebar, /labelKey: "myAssets"[\s\S]{0,220}permission: \{ module: "asset", action: "view" \}/)
})
```

- [ ] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test tests/my-assets-route-ui.test.ts
```

Expected: fails because the sidebar item is not present.

- [ ] **Step 3: Add the sidebar item**

In `src/components/layout/sidebar.tsx`, import an icon:

```ts
PackageCheck,
```

Add this menu item after Work Center:

```tsx
...(user.employeeId
  ? [
      {
        labelKey: "myAssets",
        href: `/${locale}/my-assets`,
        icon: <PackageCheck size={20} />,
      },
    ]
  : []),
```

This item intentionally has no `asset:view` permission because the route itself is scoped to the signed-in employee.

- [ ] **Step 4: Run sidebar test**

Run:

```powershell
node --test tests/my-assets-route-ui.test.ts
```

Expected: passes.

- [ ] **Step 5: Commit the navigation change**

```powershell
git add src/components/layout/sidebar.tsx tests/my-assets-route-ui.test.ts
git commit -m "Add my assets navigation"
```

---

### Task 4: Documentation And UAT Coverage

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/04_AUTH_RBAC.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/99_CHANGELOG.md`

- [ ] **Step 1: Update handoff**

Add this bullet to `DEVELOPER_HANDOFF.md` under current production readiness status:

```md
- Employee self-service asset visibility is available at `/{locale}/my-assets`. The page is scoped by the signed-in user's linked `employeeId`, does not require broad `asset:view`, and shows only active assets where the employee is the current custodian.
```

- [ ] **Step 2: Update RBAC docs**

Add to `docs/04_AUTH_RBAC.md` under Dashboard Navigation And Unauthorized Pages:

```md
- `/{locale}/my-assets` is an authenticated self-service page for linked employee users. It does not grant Asset Register access; it filters server-side to `assets.custodianId = session.user.employeeId`.
```

- [ ] **Step 3: Update UAT checklist**

Under `employee` in `docs/07_UAT_CHECKLIST.md`, add:

```md
- [ ] Open My Assets and confirm only assets held by the signed-in employee appear.
- [ ] Confirm My Assets does not show purchase price, supplier, accounting, or admin-only fields.
- [ ] Confirm an employee without `asset:view` still cannot open the full Asset Register menu.
```

- [ ] **Step 4: Update changelog**

Add a latest implementation note in `docs/99_CHANGELOG.md`:

```md
- **Employee My Assets** เพิ่มหน้า `/{locale}/my-assets` สำหรับพนักงานที่ login แล้วเห็นเฉพาะทรัพย์สิน active ที่ตัวเองถือครอง โดย scope ด้วย `session.user.employeeId` ฝั่ง server และไม่ต้องเปิดสิทธิ์ `asset:view` ทั้งทะเบียน
```

- [ ] **Step 5: Commit docs**

```powershell
git add DEVELOPER_HANDOFF.md docs/04_AUTH_RBAC.md docs/07_UAT_CHECKLIST.md docs/99_CHANGELOG.md
git commit -m "Document employee my assets view"
```

---

### Task 5: Verification And Manual UI Check

**Files:**
- No implementation files beyond previous tasks.

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test tests/my-assets.test.ts tests/my-assets-route-ui.test.ts tests/permission-aware-navigation.test.ts
```

Expected: all focused tests pass.

- [ ] **Step 2: Run full verification**

Run:

```powershell
npm run verify
```

Expected:
- ESLint passes.
- Node tests pass.
- Next build passes and includes `ƒ /[locale]/my-assets`.

- [ ] **Step 3: Start or reuse the dev server**

If the dev server is not running:

```powershell
npm run dev
```

Expected: app available at `http://localhost:3000`.

- [ ] **Step 4: Manual browser checks**

Check with a linked employee account:

```text
Open http://localhost:3000/th/my-assets
Expected: page renders "ทรัพย์สินของฉัน", summary counts, and only assets where custodian is the signed-in employee.
Expected: sidebar shows "ทรัพย์สินของฉัน".
Expected: full Asset Register remains hidden if the user lacks asset:view.
```

Check with an account not linked to an employee:

```text
Open http://localhost:3000/th/my-assets
Expected: no linked employee state renders. No asset query results are shown.
```

- [ ] **Step 5: Final status**

Before reporting completion, run:

```powershell
git status --short --branch
git log -3 --oneline --decorate
```

Expected: working tree contains only intentional changes or is clean after the final commit/push requested by the user.

---

## Self-Review Notes

- Scope is intentionally v1 and read-only.
- The plan avoids broad `asset:view` for employee self-service.
- Server-side scoping uses `session.user.employeeId`, not a query string employee id.
- Sensitive asset fields are excluded from the My Assets page.
- The sidebar entry is identity-based (`user.employeeId`) rather than permission-based.
- Full Asset Detail access remains governed by the existing route permissions; v1 My Assets should show enough read-only information without requiring a detail route.
