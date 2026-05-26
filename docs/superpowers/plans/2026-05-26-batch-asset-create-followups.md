# Batch Asset Create Follow-ups Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Strengthen the current `เพิ่มทรัพย์สินเป็นชุด` workflow with safer review, faster row entry, duplicate pre-checks, and a clearer post-create receipt. Draft autosave/recovery is intentionally deferred by user request.

**Architecture:** Keep the current split: `AssetBatchForm` owns client UX, `/api/assets/batch` owns final persistence, and `src/lib/asset-batch-create.ts` owns pure helpers. Add small pure helper functions for preview, paste parsing, duplicate payload summaries, receipt exports, and draft serialization so the UI remains readable and tests can cover the behavior without a browser.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Zod, Prisma 7 with SQL Server, Node test runner, existing `SearchableSelect`, `ScannerTextInput`, `sonner`, `next-intl`, and existing batch asset helpers.

---

## File Structure

- Modify: `DEVELOPER_HANDOFF.md`
  - Correct stale batch-create wording so it matches the current code: row data is Serial Number, optional legacy/custom Asset Tag, row Custodian, and row Remark; shared location and shared FA/accounting code come from common data.
- Modify: `messages/th.json`
  - Add Thai text for review step, duplicate pre-check, paste hint, draft recovery, and receipt/export actions.
- Modify: `messages/en.json`
  - Add matching English text and fix the existing batch subtitle that still mentions row-specific location.
- Modify: `src/lib/asset-batch-create.ts`
  - Add pure helpers:
    - `buildAssetBatchPreviewRows()`
    - `parseBatchSerialPaste()`
    - `buildAssetBatchDuplicateCheckSummary()`
    - `buildAssetBatchReceiptCsv()`
- Create: `src/app/api/assets/batch/check-duplicates/route.ts`
  - Authenticated duplicate pre-check endpoint using the same validation schema and duplicate rules as final submit.
- Modify: `src/components/assets/asset-batch-form.tsx`
  - Add review-before-save state, duplicate pre-check button, multiline paste handling, and receipt table/export action.
- Modify: `tests/asset-batch-create.test.ts`
  - Add helper tests for preview rows, paste parsing, duplicate check summary, and CSV receipt generation.

---

## Task 1: Align Documentation And Existing Copy

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `messages/en.json`

- [x] **Step 1: Update `DEVELOPER_HANDOFF.md` latest batch-create text**

Replace the current stale latest-update wording with:

```markdown
enter shared purchase/master data once, add 2-100 row-specific Serial Numbers, legacy/custom Asset Tags, Custodians, and Remarks while shared Location and FA/accounting code come from the common batch data
```

Also replace the stale history wording with:

```markdown
Serial Number/เลขทรัพย์สินเดิม/ผู้ถือครอง/หมายเหตุรายแถว โดยใช้ที่ตั้งและรหัสบัญชี/FA จากข้อมูลร่วมของชุด
```

- [x] **Step 2: Fix the English batch subtitle**

In `messages/en.json`, set the batch subtitle to:

```json
"batchCreateSubtitle": "Enter shared data once, then fill only row-specific legacy asset tags, serials, custodians, or remarks."
```

- [x] **Step 3: Run quick documentation verification**

Run:

```powershell
rg -n "Location and FA/accounting code come from the common batch data|หมายเหตุรายแถว โดยใช้ที่ตั้งและรหัสบัญชี/FA" DEVELOPER_HANDOFF.md
```

Expected: the updated wording appears in `DEVELOPER_HANDOFF.md`.

- [x] **Step 4: Commit and push this task**

```powershell
git add DEVELOPER_HANDOFF.md messages/en.json
git commit -m "Align batch asset create documentation"
git push origin master
```

---

## Task 2: Add Review-Before-Save Preview

**Files:**
- Modify: `src/lib/asset-batch-create.ts`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-batch-create.test.ts`
- Modify: `DEVELOPER_HANDOFF.md`

- [x] **Step 1: Add failing preview helper tests**

Append to `tests/asset-batch-create.test.ts`:

```ts
import { buildAssetBatchPreviewRows } from "../src/lib/asset-batch-create.ts"

test("buildAssetBatchPreviewRows marks manual and auto-generated asset tag sources", () => {
  assert.deepEqual(
    buildAssetBatchPreviewRows([
      { clientId: "row-1", serialNumber: "SN-001", assetTag: "SNI-EQU-16-0031", custodianId: "emp-1", remark: "" },
      { clientId: "row-2", serialNumber: "", assetTag: "", custodianId: "", remark: "Keep spare" },
    ]),
    [
      { rowNo: 1, serialNumber: "SN-001", assetTag: "SNI-EQU-16-0031", assetTagSource: "manual", custodianId: "emp-1", remark: "" },
      { rowNo: 2, serialNumber: "", assetTag: "", assetTagSource: "auto", custodianId: "", remark: "Keep spare" },
    ]
  )
})
```

- [x] **Step 2: Run the test and confirm it fails**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
```

Expected: FAIL because `buildAssetBatchPreviewRows` is not exported yet.

- [x] **Step 3: Implement the preview helper**

Add to `src/lib/asset-batch-create.ts`:

```ts
export type AssetBatchPreviewRow = {
  rowNo: number
  serialNumber: string
  assetTag: string
  assetTagSource: "manual" | "auto"
  custodianId: string
  remark: string
}

export function buildAssetBatchPreviewRows(rows: AssetBatchEditableRow[]): AssetBatchPreviewRow[] {
  return rows.map((row, index) => {
    const assetTag = row.assetTag.trim()
    return {
      rowNo: index + 1,
      serialNumber: row.serialNumber.trim(),
      assetTag,
      assetTagSource: assetTag ? "manual" : "auto",
      custodianId: row.custodianId.trim(),
      remark: row.remark.trim(),
    }
  })
}
```

- [x] **Step 4: Add review translations**

Add these keys to `messages/th.json` under `"asset"`:

```json
"batchReviewTitle": "ตรวจสอบก่อนบันทึก",
"batchReviewDescription": "ตรวจข้อมูลร่วมและรายการรายแถวอีกครั้งก่อนสร้างทรัพย์สินหลายรายการ",
"batchReviewSharedLocation": "ที่ตั้งร่วม",
"batchReviewSharedFixedAssetCode": "รหัสบัญชี/FA ร่วม",
"batchReviewAutoAssetTag": "ระบบจะสร้างให้",
"batchReviewManualAssetTag": "กำหนดเอง/เลขเดิม",
"batchReviewConfirm": "ยืนยันและบันทึกทั้งชุด",
"batchReviewBack": "กลับไปแก้ไข"
```

Add matching keys to `messages/en.json`:

```json
"batchReviewTitle": "Review before saving",
"batchReviewDescription": "Review the shared data and row details before creating multiple assets.",
"batchReviewSharedLocation": "Shared location",
"batchReviewSharedFixedAssetCode": "Shared FA/accounting code",
"batchReviewAutoAssetTag": "Auto-generated",
"batchReviewManualAssetTag": "Manual/legacy",
"batchReviewConfirm": "Confirm and save batch",
"batchReviewBack": "Back to edit"
```

- [x] **Step 5: Wire review mode into `AssetBatchForm`**

In `src/components/assets/asset-batch-form.tsx`, update the import:

```ts
import { buildAssetBatchPreviewRows, createAssetBatchRows, findDuplicateBatchValues, type AssetBatchEditableRow } from "@/lib/asset-batch-create"
```

Add state and preview rows near the existing `saving` state:

```ts
const [reviewing, setReviewing] = useState(false)
const previewRows = useMemo(() => buildAssetBatchPreviewRows(rows), [rows])
```

Reset review mode in `setCommonField()` and `setRowField()`:

```ts
setReviewing(false)
```

Change `handleSubmit()` so the first submit shows review and the second submit persists:

```ts
if (!reviewing) {
  setReviewing(true)
  return
}
```

Place that block after duplicate/license validation and before `setSaving(true)`.

Add a review section after the batch rows table:

```tsx
{reviewing ? (
  <section className="md:col-span-2 rounded-md border border-primary/30 bg-primary/5 p-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h3 className="text-base font-semibold text-foreground">{t("batchReviewTitle")}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{t("batchReviewDescription")}</p>
      </div>
      <button type="button" onClick={() => setReviewing(false)} className="inline-flex h-9 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">
        {t("batchReviewBack")}
      </button>
    </div>
    <div className="mt-4 grid gap-3 md:grid-cols-3">
      <SummaryItem label={t("batchReviewSharedLocation")} value={locations.find((location) => location.id === common.currentLocationId)?.label ?? "-"} />
      <SummaryItem label={t("batchReviewSharedFixedAssetCode")} value={common.fixedAssetCode || "-"} />
      <SummaryItem label={t("batchCurrentCount", { count: rows.length })} value={String(rows.length)} />
    </div>
    <div className="mt-4 max-h-80 overflow-auto rounded-md border border-border bg-background">
      <table className="w-full min-w-[760px] text-sm">
        <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
          <tr>
            <th className="px-3 py-2">{t("batchRowNo")}</th>
            <th className="px-3 py-2">{t("batchSerialNumber")}</th>
            <th className="px-3 py-2">{t("batchAssetTag")}</th>
            <th className="px-3 py-2">{t("batchCustodian")}</th>
            <th className="px-3 py-2">{t("batchRemark")}</th>
          </tr>
        </thead>
        <tbody>
          {previewRows.map((row) => (
            <tr key={row.rowNo} className="border-t border-border">
              <td className="px-3 py-2 font-medium">{row.rowNo}</td>
              <td className="px-3 py-2">{row.serialNumber || "-"}</td>
              <td className="px-3 py-2">
                {row.assetTag || t("batchReviewAutoAssetTag")}
                <span className="ml-2 text-xs text-muted-foreground">
                  {row.assetTagSource === "manual" ? t("batchReviewManualAssetTag") : ""}
                </span>
              </td>
              <td className="px-3 py-2">{employees.find((employee) => employee.id === row.custodianId)?.label ?? "-"}</td>
              <td className="px-3 py-2">{row.remark || "-"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
) : null}
```

Add the helper component near `SelectField`:

```tsx
function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}
```

Change the submit button text:

```tsx
{reviewing ? t("batchReviewConfirm") : t("batchSubmit")}
```

- [x] **Step 6: Run tests**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Update handoff and commit/push**

Add a line to `DEVELOPER_HANDOFF.md` noting the review-before-save step.

```powershell
git add src/lib/asset-batch-create.ts src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json tests/asset-batch-create.test.ts DEVELOPER_HANDOFF.md
git commit -m "Add batch asset review before save"
git push origin master
```

---

## Task 3: Add Duplicate Pre-check Endpoint And UI Button

**Files:**
- Create: `src/app/api/assets/batch/check-duplicates/route.ts`
- Modify: `src/lib/asset-batch-create.ts`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-batch-create.test.ts`
- Modify: `DEVELOPER_HANDOFF.md`

- [x] **Step 1: Read the local Next.js route handler docs before adding the new route**

Run:

```powershell
Get-ChildItem node_modules\next\dist\docs -Recurse -Filter *.md | Select-String -Pattern "route handler|Route Handlers" -List | Select-Object -First 5 Path
```

Open the most relevant file and confirm route handler conventions for Next.js 16 in this repo.

- [x] **Step 2: Add failing duplicate summary tests**

Append to `tests/asset-batch-create.test.ts`:

```ts
import { buildAssetBatchDuplicateCheckSummary } from "../src/lib/asset-batch-create.ts"

test("buildAssetBatchDuplicateCheckSummary reports a clean duplicate pre-check", () => {
  assert.deepEqual(
    buildAssetBatchDuplicateCheckSummary({
      duplicateBatchSerials: [],
      duplicateBatchAssetTags: [],
      existingSerials: [],
      existingAssetTags: [],
    }),
    { ok: true, message: "", duplicateCount: 0 }
  )
})

test("buildAssetBatchDuplicateCheckSummary reports duplicate count and message", () => {
  assert.deepEqual(
    buildAssetBatchDuplicateCheckSummary({
      duplicateBatchSerials: ["sn-001"],
      duplicateBatchAssetTags: ["tag-001"],
      existingSerials: ["sn-009"],
      existingAssetTags: [],
    }),
    {
      ok: false,
      message: "พบข้อมูลซ้ำ: Serial Number ซ้ำในชุดนี้ sn-001; Asset Tag ซ้ำในชุดนี้ tag-001; Serial Number ซ้ำกับข้อมูลเดิม sn-009",
      duplicateCount: 3,
    }
  )
})
```

- [x] **Step 3: Implement the duplicate summary helper**

Add to `src/lib/asset-batch-create.ts`:

```ts
export function buildAssetBatchDuplicateCheckSummary(input: {
  duplicateBatchSerials: string[]
  duplicateBatchAssetTags: string[]
  existingSerials: string[]
  existingAssetTags: string[]
}) {
  const message = buildAssetBatchDuplicateMessage(input)
  return {
    ok: message.length === 0,
    message,
    duplicateCount:
      input.duplicateBatchSerials.length +
      input.duplicateBatchAssetTags.length +
      input.existingSerials.length +
      input.existingAssetTags.length,
  }
}
```

- [x] **Step 4: Add the duplicate pre-check route**

Create `src/app/api/assets/batch/check-duplicates/route.ts`:

```ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { assetBatchCreateSchema } from "@/lib/validations/asset-batch"
import { buildAssetBatchDuplicateCheckSummary, findDuplicateBatchValues } from "@/lib/asset-batch-create"

export async function POST(request: Request) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "create")

    const input = assetBatchCreateSchema.parse(await request.json())
    const duplicateBatchValues = findDuplicateBatchValues(input.rows)
    const manualAssetTags = input.rows.map((row) => row.assetTag?.trim()).filter(Boolean) as string[]
    const serialNumbers = input.rows.map((row) => row.serialNumber?.trim()).filter(Boolean) as string[]

    const [existingSerials, existingAssetTags] = await Promise.all([
      serialNumbers.length
        ? prisma.asset.findMany({
            where: { isActive: true, serialNumber: { in: serialNumbers } },
            select: { serialNumber: true },
          })
        : Promise.resolve([]),
      manualAssetTags.length
        ? prisma.asset.findMany({
            where: { assetTag: { in: manualAssetTags } },
            select: { assetTag: true },
          })
        : Promise.resolve([]),
    ])

    return NextResponse.json(
      buildAssetBatchDuplicateCheckSummary({
        duplicateBatchSerials: duplicateBatchValues.serialNumbers,
        duplicateBatchAssetTags: duplicateBatchValues.assetTags,
        existingSerials: existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : [])),
        existingAssetTags: existingAssetTags.map((asset) => asset.assetTag),
      })
    )
  } catch (error) {
    return errorResponse(error, 400)
  }
}
```

- [x] **Step 5: Add UI translations**

Add to both locale files:

```json
"batchCheckDuplicates": "ตรวจสอบข้อมูลซ้ำ",
"batchCheckDuplicatesRunning": "กำลังตรวจสอบ...",
"batchCheckDuplicatesClean": "ไม่พบ Serial Number หรือเลขทรัพย์สินที่ซ้ำ",
"batchCheckDuplicatesFound": "พบข้อมูลซ้ำ กรุณาตรวจสอบรายการก่อนบันทึก"
```

English values:

```json
"batchCheckDuplicates": "Check duplicates",
"batchCheckDuplicatesRunning": "Checking...",
"batchCheckDuplicatesClean": "No duplicate Serial Numbers or Asset Tags found.",
"batchCheckDuplicatesFound": "Duplicate data found. Please review before saving."
```

- [x] **Step 6: Wire the button into `AssetBatchForm`**

Add state:

```ts
const [checkingDuplicates, setCheckingDuplicates] = useState(false)
const [duplicateCheckMessage, setDuplicateCheckMessage] = useState("")
```

Add function:

```ts
async function handleCheckDuplicates() {
  setCheckingDuplicates(true)
  setDuplicateCheckMessage("")
  try {
    const response = await fetch("/api/assets/batch/check-duplicates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        common,
        rows,
        purchaseDocumentIds: selectedPurchaseDocumentIds,
      }),
    })
    const result = (await response.json().catch(() => null)) as { ok?: boolean; message?: string } | { error?: string } | null
    if (!response.ok) throw new Error(getErrorMessage(result) ?? tCommon("error"))
    if (result && "ok" in result && result.ok) {
      setDuplicateCheckMessage(t("batchCheckDuplicatesClean"))
      toast.success(t("batchCheckDuplicatesClean"))
    } else {
      const message = result && "message" in result && result.message ? result.message : t("batchCheckDuplicatesFound")
      setDuplicateCheckMessage(message)
      toast.error(message)
    }
  } catch (error) {
    toast.error(error instanceof Error ? error.message : tCommon("error"))
  } finally {
    setCheckingDuplicates(false)
  }
}
```

Add a secondary button next to `เพิ่มแถว`:

```tsx
<button
  type="button"
  onClick={handleCheckDuplicates}
  disabled={checkingDuplicates || hasClientDuplicates}
  className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
>
  {checkingDuplicates ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
  {checkingDuplicates ? t("batchCheckDuplicatesRunning") : t("batchCheckDuplicates")}
</button>
```

Render `duplicateCheckMessage` below the row toolbar.

- [x] **Step 7: Run tests and lint**

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 8: Update handoff and commit/push**

```powershell
git add src/app/api/assets/batch/check-duplicates/route.ts src/lib/asset-batch-create.ts src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json tests/asset-batch-create.test.ts DEVELOPER_HANDOFF.md
git commit -m "Add batch asset duplicate precheck"
git push origin master
```

---

## Task 4: Add Excel Paste For Serial Numbers

**Files:**
- Modify: `src/lib/asset-batch-create.ts`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-batch-create.test.ts`
- Modify: `DEVELOPER_HANDOFF.md`

- [x] **Step 1: Add failing paste parser tests**

Append to `tests/asset-batch-create.test.ts`:

```ts
import { parseBatchSerialPaste } from "../src/lib/asset-batch-create.ts"

test("parseBatchSerialPaste reads serials from Excel rows", () => {
  assert.deepEqual(parseBatchSerialPaste("SN-001\r\nSN-002\r\nSN-003"), ["SN-001", "SN-002", "SN-003"])
})

test("parseBatchSerialPaste reads the first column from tab-separated rows", () => {
  assert.deepEqual(parseBatchSerialPaste("SN-001\tDell\r\nSN-002\tHP"), ["SN-001", "SN-002"])
})

test("parseBatchSerialPaste removes empty rows and caps the result", () => {
  assert.deepEqual(parseBatchSerialPaste("SN-001\n\nSN-002\nSN-003", 2), ["SN-001", "SN-002"])
})
```

- [x] **Step 2: Implement `parseBatchSerialPaste`**

Add to `src/lib/asset-batch-create.ts`:

```ts
export function parseBatchSerialPaste(text: string, maxRows = 100) {
  return text
    .split(/\r?\n/)
    .map((line) => line.split("\t")[0]?.trim() ?? "")
    .filter(Boolean)
    .slice(0, maxRows)
}
```

- [x] **Step 3: Add paste hint translations**

Thai:

```json
"batchPasteSerialHint": "วาง Serial จาก Excel ได้ ระบบจะเพิ่มแถวให้อัตโนมัติ"
```

English:

```json
"batchPasteSerialHint": "Paste serials from Excel; rows will be added automatically."
```

- [x] **Step 4: Wire paste handling into the serial input**

Update import:

```ts
import { buildAssetBatchPreviewRows, createAssetBatchRows, findDuplicateBatchValues, parseBatchSerialPaste, type AssetBatchEditableRow } from "@/lib/asset-batch-create"
```

Add function:

```ts
function handleSerialPaste(clientId: string, event: React.ClipboardEvent<HTMLInputElement>) {
  const pastedSerials = parseBatchSerialPaste(event.clipboardData.getData("text"), 100)
  if (pastedSerials.length <= 1) return

  event.preventDefault()
  setRows((current) => {
    const startIndex = current.findIndex((row) => row.clientId === clientId)
    if (startIndex < 0) return current
    const next = [...current]
    const requiredRows = Math.min(100, startIndex + pastedSerials.length)

    while (next.length < requiredRows) {
      next.push(createAssetBatchRows(1, `row-${Date.now()}-${next.length + 1}`)[0])
    }

    pastedSerials.slice(0, 100 - startIndex).forEach((serialNumber, offset) => {
      next[startIndex + offset] = { ...next[startIndex + offset], serialNumber }
    })

    return next
  })
  setCreatedBatch(null)
  setReviewing(false)
}
```

Because `ScannerTextInput` currently accepts `value`, `onChange`, `labels`, and `maxLength`, inspect that component. If it does not expose `onPaste`, add an optional prop:

```ts
onPaste?: React.ClipboardEventHandler<HTMLInputElement>
```

and pass it to the underlying `<input>`.

Then update the serial cell:

```tsx
<ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} onPaste={(event) => handleSerialPaste(row.clientId, event)} labels={scannerLabels} maxLength={100} />
<p className="mt-1 text-[11px] text-muted-foreground">{t("batchPasteSerialHint")}</p>
```

- [x] **Step 5: Run tests and lint**

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Update handoff and commit/push**

```powershell
git add src/lib/asset-batch-create.ts src/components/assets/asset-batch-form.tsx src/components/ui/scanner-text-input.tsx messages/th.json messages/en.json tests/asset-batch-create.test.ts DEVELOPER_HANDOFF.md
git commit -m "Add Excel paste for batch serials"
git push origin master
```

---

## Task 5: Add Batch Receipt And CSV Export After Save

**Files:**
- Modify: `src/lib/asset-batch-create.ts`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `tests/asset-batch-create.test.ts`
- Modify: `DEVELOPER_HANDOFF.md`

- [x] **Step 1: Add failing CSV receipt test**

Append to `tests/asset-batch-create.test.ts`:

```ts
import { buildAssetBatchReceiptCsv } from "../src/lib/asset-batch-create.ts"

test("buildAssetBatchReceiptCsv exports created assets as CSV", () => {
  assert.equal(
    buildAssetBatchReceiptCsv([
      { id: "asset-1", assetTag: "SNI-COM-26-0001", name: "Desktop Dell" },
      { id: "asset-2", assetTag: "SNI-COM-26-0002", name: "Desktop HP" },
    ]),
    "Asset Tag,Asset Name,Asset ID\r\nSNI-COM-26-0001,Desktop Dell,asset-1\r\nSNI-COM-26-0002,Desktop HP,asset-2"
  )
})
```

- [x] **Step 2: Implement CSV helper**

Add to `src/lib/asset-batch-create.ts`:

```ts
function csvCell(value: string) {
  return /[",\r\n]/.test(value) ? `"${value.replaceAll('"', '""')}"` : value
}

export function buildAssetBatchReceiptCsv(assets: CreatedAssetSummary[]) {
  const rows = [
    ["Asset Tag", "Asset Name", "Asset ID"],
    ...assets.map((asset) => [asset.assetTag, asset.name, asset.id]),
  ]
  return rows.map((row) => row.map(csvCell).join(",")).join("\r\n")
}
```

- [x] **Step 3: Add receipt translations**

Thai:

```json
"batchReceiptAssets": "รายการที่สร้างในชุดนี้",
"batchDownloadReceiptCsv": "ดาวน์โหลด CSV",
"batchCopyAssetTags": "คัดลอกเลขทรัพย์สิน",
"batchCopyAssetTagsSuccess": "คัดลอกเลขทรัพย์สินแล้ว"
```

English:

```json
"batchReceiptAssets": "Assets created in this batch",
"batchDownloadReceiptCsv": "Download CSV",
"batchCopyAssetTags": "Copy asset tags",
"batchCopyAssetTagsSuccess": "Asset tags copied"
```

- [x] **Step 4: Render receipt actions in `AssetBatchForm`**

Update import:

```ts
import { buildAssetBatchReceiptCsv, ... } from "@/lib/asset-batch-create"
```

Add functions:

```ts
function handleDownloadReceiptCsv() {
  if (!createdBatch) return
  const blob = new Blob([buildAssetBatchReceiptCsv(createdBatch.assets)], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `asset-batch-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}

async function handleCopyAssetTags() {
  if (!createdBatch) return
  await navigator.clipboard.writeText(createdBatch.assets.map((asset) => asset.assetTag).join("\n"))
  toast.success(t("batchCopyAssetTagsSuccess"))
}
```

Inside the current `createdBatch` panel, add buttons and table:

```tsx
<button type="button" onClick={handleCopyAssetTags} className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">
  {t("batchCopyAssetTags")}
</button>
<button type="button" onClick={handleDownloadReceiptCsv} className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">
  {t("batchDownloadReceiptCsv")}
</button>
<div className="mt-4 overflow-auto rounded-md border border-border bg-background">
  <table className="w-full min-w-[640px] text-sm">
    <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
      <tr>
        <th className="px-3 py-2">{t("assetTag")}</th>
        <th className="px-3 py-2">{t("assetName")}</th>
      </tr>
    </thead>
    <tbody>
      {createdBatch.assets.map((asset) => (
        <tr key={asset.id} className="border-t border-border">
          <td className="px-3 py-2 font-medium">{asset.assetTag}</td>
          <td className="px-3 py-2">{asset.name}</td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

- [x] **Step 5: Run tests and lint**

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Update handoff and commit/push**

```powershell
git add src/lib/asset-batch-create.ts src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json tests/asset-batch-create.test.ts DEVELOPER_HANDOFF.md
git commit -m "Add batch asset receipt export"
git push origin master
```

---

## Deferred Task 6: Add Draft Autosave And Restore

**Files:**
- Create: `src/lib/asset-batch-draft.ts`
- Create: `tests/asset-batch-draft.test.ts`
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `DEVELOPER_HANDOFF.md`

> Deferred by user request. Do not implement in this execution pass.

- [ ] **Step 1: Add failing draft tests**

Create `tests/asset-batch-draft.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { assetBatchDraftStorageKey, parseAssetBatchDraft, serializeAssetBatchDraft } from "../src/lib/asset-batch-draft.ts"

test("assetBatchDraftStorageKey is stable", () => {
  assert.equal(assetBatchDraftStorageKey, "asset-batch-create-draft:v1")
})

test("serializes and parses an asset batch draft", () => {
  const serialized = serializeAssetBatchDraft({
    common: { name: "Desktop" },
    rows: [{ clientId: "row-1", serialNumber: "SN-001" }],
    purchaseDocumentIds: ["doc-1"],
    nameManuallyEdited: true,
  })

  const parsed = parseAssetBatchDraft(serialized)

  assert.equal(parsed?.common.name, "Desktop")
  assert.equal(parsed?.rows[0].serialNumber, "SN-001")
  assert.deepEqual(parsed?.purchaseDocumentIds, ["doc-1"])
  assert.equal(parsed?.nameManuallyEdited, true)
  assert.equal(typeof parsed?.savedAt, "string")
})

test("parseAssetBatchDraft rejects invalid JSON", () => {
  assert.equal(parseAssetBatchDraft("{not-json"), null)
})
```

- [ ] **Step 2: Implement draft helper**

Create `src/lib/asset-batch-draft.ts`:

```ts
export const assetBatchDraftStorageKey = "asset-batch-create-draft:v1"

type AssetBatchDraft = {
  common: Record<string, unknown>
  rows: Array<Record<string, unknown>>
  purchaseDocumentIds: string[]
  nameManuallyEdited: boolean
  savedAt: string
}

export function serializeAssetBatchDraft(input: Omit<AssetBatchDraft, "savedAt">) {
  return JSON.stringify({
    ...input,
    savedAt: new Date().toISOString(),
  })
}

export function parseAssetBatchDraft(value: string | null): AssetBatchDraft | null {
  if (!value) return null
  try {
    const parsed = JSON.parse(value) as Partial<AssetBatchDraft>
    if (!parsed || typeof parsed !== "object") return null
    if (!parsed.common || !Array.isArray(parsed.rows) || !Array.isArray(parsed.purchaseDocumentIds)) return null
    return {
      common: parsed.common,
      rows: parsed.rows,
      purchaseDocumentIds: parsed.purchaseDocumentIds.filter((id): id is string => typeof id === "string"),
      nameManuallyEdited: Boolean(parsed.nameManuallyEdited),
      savedAt: typeof parsed.savedAt === "string" ? parsed.savedAt : new Date(0).toISOString(),
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 3: Add draft translations**

Thai:

```json
"batchDraftRestored": "กู้คืนข้อมูลร่างล่าสุดแล้ว",
"batchDraftSaved": "บันทึกร่างอัตโนมัติ",
"batchClearDraft": "ลบร่าง",
"batchClearDraftSuccess": "ลบร่างแล้ว"
```

English:

```json
"batchDraftRestored": "Latest draft restored.",
"batchDraftSaved": "Draft autosaved",
"batchClearDraft": "Clear draft",
"batchClearDraftSuccess": "Draft cleared"
```

- [ ] **Step 4: Wire localStorage autosave into `AssetBatchForm`**

Update React import:

```ts
import { useEffect, useMemo, useState } from "react"
```

Import helpers:

```ts
import { assetBatchDraftStorageKey, parseAssetBatchDraft, serializeAssetBatchDraft } from "@/lib/asset-batch-draft"
```

Add restore effect:

```ts
useEffect(() => {
  const draft = parseAssetBatchDraft(window.localStorage.getItem(assetBatchDraftStorageKey))
  if (!draft) return
  setCommon((current) => ({ ...current, ...draft.common }))
  setRows(draft.rows as BatchRow[])
  setSelectedPurchaseDocumentIds(draft.purchaseDocumentIds)
  setNameManuallyEdited(draft.nameManuallyEdited)
  toast.info(t("batchDraftRestored"))
}, [t])
```

Add autosave effect:

```ts
useEffect(() => {
  if (createdBatch) return
  const timer = window.setTimeout(() => {
    window.localStorage.setItem(
      assetBatchDraftStorageKey,
      serializeAssetBatchDraft({
        common,
        rows,
        purchaseDocumentIds: selectedPurchaseDocumentIds,
        nameManuallyEdited,
      })
    )
  }, 500)

  return () => window.clearTimeout(timer)
}, [common, rows, selectedPurchaseDocumentIds, nameManuallyEdited, createdBatch])
```

Clear draft after successful creation:

```ts
window.localStorage.removeItem(assetBatchDraftStorageKey)
```

Add clear button near the batch row toolbar:

```tsx
<button
  type="button"
  onClick={() => {
    window.localStorage.removeItem(assetBatchDraftStorageKey)
    toast.success(t("batchClearDraftSuccess"))
  }}
  className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
>
  {t("batchClearDraft")}
</button>
```

- [ ] **Step 5: Run tests and lint**

```powershell
node --test --test-isolation=none tests\asset-batch-draft.test.ts tests\asset-batch-create.test.ts
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Update handoff and commit/push**

```powershell
git add src/lib/asset-batch-draft.ts tests/asset-batch-draft.test.ts src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json DEVELOPER_HANDOFF.md
git commit -m "Add batch asset draft recovery"
git push origin master
```

---

## Final Verification

- [ ] **Step 1: Run focused tests**

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts tests\asset-batch-draft.test.ts tests\asset-name-suggestion.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run lint**

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 3: Run production build**

```powershell
npm run build
```

Expected: PASS. If Windows file-locking blocks `.next`, stop the dev server and rerun.

- [ ] **Step 4: Browser QA**

Open `/th/assets/new`, switch to `เพิ่มเป็นชุด`, and verify:

- Initial table has 2 rows.
- `เพิ่มแถว` adds one row.
- Pasting multiple serials into the Serial cell expands/fills rows.
- `ตรวจสอบข้อมูลซ้ำ` reports clean or duplicate status.
- First save click shows review instead of creating assets.
- Review lists shared location/FA and row details.
- Confirm save creates assets.
- Success receipt lists created asset tags and names.
- Label button still opens `/asset-management/labels?assetIds=...`.

- [ ] **Step 5: Final handoff update and push if needed**

If any final verification notes change deployment or handoff details:

```powershell
git add DEVELOPER_HANDOFF.md
git commit -m "Document batch asset create followups"
git push origin master
```

---

## Recommended Execution Order

1. Task 1: Documentation and stale copy correction.
2. Task 2: Review-before-save preview.
3. Task 3: Duplicate pre-check.
4. Task 4: Excel paste for Serial Numbers.
5. Task 5: Batch receipt and CSV export.
6. Task 6: Draft autosave and restore is deferred and should not be implemented in this pass.

This order keeps the safest user-facing guardrails first, then adds speed, while leaving recovery for a later approved pass.
