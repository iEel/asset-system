# Batch Asset Create Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an “เพิ่มเป็นชุด” workflow on the asset create page so users can create 2-100 similar assets, such as 10 desktop computers from one purchase, without re-entering shared data.

**Architecture:** Reuse the existing asset creation model and asset tag generator, but add a batch-specific API and UI. Shared fields stay in one common payload, row-specific fields such as Serial Number, optional Asset Tag, Custodian, Location, Fixed Asset Code, and Remark are captured in a compact table, then expanded into individual `AssetInput` records on the server. If a row has an Asset Tag, the system preserves it for legacy assets; if the field is blank, the system auto-generates the next available tag and skips any manual tags entered in the same batch.

**Tech Stack:** Next.js 16 App Router, React 19 client components, TypeScript, Zod, Prisma 7 with SQL Server, Node test runner, existing `SearchableSelect`, `ScannerTextInput`, `sonner`, and existing asset/purchase-document modules.

---

## File Structure

- Create: `src/lib/asset-batch-create.ts`
  - Pure helpers for batch row expansion, duplicate detection, and batch result summaries.
  - No direct auth or request handling.
- Create: `src/lib/validations/asset-batch.ts`
  - Zod schemas for the batch create API.
  - Imports and reuses `assetSchema` so single and batch creation stay aligned.
- Modify: `src/lib/asset-tag.ts`
  - Add `generateAssetTags()` for deterministic multi-tag generation from the same sequence prefix.
  - Support optional manually reserved asset tags so auto-generated tags never collide with asset numbers typed for legacy assets in the same batch.
  - Keep existing `generateAssetTag()` behavior by delegating to `generateAssetTags(... count: 1)`.
- Modify: `src/app/api/assets/route.ts`
  - Extract single-asset creation into a reusable helper only if needed by the batch route.
  - Keep existing public behavior of `POST /api/assets` unchanged.
- Create: `src/app/api/assets/batch/route.ts`
  - New authenticated API endpoint for creating multiple assets in one request.
  - Creates assets, initial movements, purchase-document links, and audit logs in one Prisma transaction.
- Create: `src/components/assets/asset-create-workspace.tsx`
  - Client wrapper for `/assets/new` with segmented mode switch: `เพิ่มทีละรายการ` and `เพิ่มเป็นชุด`.
- Create: `src/components/assets/asset-batch-form.tsx`
  - Batch create UI for common fields + row table + preview summary.
- Modify: `src/components/assets/asset-form.tsx`
  - Export reusable types or accept optional header controls if needed by `asset-create-workspace.tsx`.
  - Avoid moving unrelated single-asset logic.
- Modify: `src/app/[locale]/(dashboard)/assets/new/page.tsx`
  - Render `AssetCreateWorkspace` instead of `AssetForm` directly.
- Modify: `messages/th.json`
  - Add Thai labels, help text, validation messages, and success text for batch create.
- Modify: `messages/en.json`
  - Add matching English keys.
- Create: `tests/asset-batch-create.test.ts`
  - Unit tests for pure row expansion, duplicate checks, and summary behavior.
- Modify: `tests/asset-tag-sequence.test.ts`
  - Add tests for multi-tag generation helper behavior where possible without DB.
- Modify: `DEVELOPER_HANDOFF.md`
  - Document the new batch create workflow after implementation.

---

## Task 1: Batch Validation Schema

**Files:**
- Create: `src/lib/validations/asset-batch.ts`
- Test: `tests/asset-batch-create.test.ts`

- [ ] **Step 1: Write failing tests for batch payload validation**

Create `tests/asset-batch-create.test.ts` with:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { assetBatchCreateSchema } from "../src/lib/validations/asset-batch.ts"

const validCommon = {
  name: "Desktop Computer Dell Optiplex",
  categoryId: "category-1",
  brandId: "brand-1",
  modelId: "model-1",
  serialNumber: "",
  companyId: "company-1",
  branchId: "branch-1",
  ownershipType: "stock",
  departmentId: "department-it",
  custodianId: "",
  homeLocationId: "location-store",
  currentLocationId: "location-store",
  statusId: "status-ready",
  conditionId: "condition-new",
  purchaseDate: "2026-05-26",
  purchasePrice: "25000",
  supplierId: "supplier-1",
  warrantyStartDate: "2026-05-26",
  warrantyEndDate: "2029-05-25",
  fixedAssetCode: "",
  poNumber: "PO-2026-001",
  invoiceNumber: "INV-2026-001",
  remark: "Batch purchase",
  customFieldsJson: "",
  isActive: true,
}

test("assetBatchCreateSchema accepts common asset data and row-specific serials", () => {
  const parsed = assetBatchCreateSchema.parse({
    common: validCommon,
    rows: [
      { clientId: "row-1", serialNumber: "SN-001", assetTag: "LEGACY-COM-001", custodianId: "", currentLocationId: "" },
      { clientId: "row-2", serialNumber: "SN-002", assetTag: "", custodianId: "", currentLocationId: "" },
    ],
    purchaseDocumentIds: ["doc-1"],
  })

  assert.equal(parsed.rows.length, 2)
  assert.equal(parsed.rows[0].assetTag, "LEGACY-COM-001")
  assert.equal(parsed.common.name, "Desktop Computer Dell Optiplex")
  assert.deepEqual(parsed.purchaseDocumentIds, ["doc-1"])
})

test("assetBatchCreateSchema rejects a single-row batch", () => {
  assert.throws(
    () =>
      assetBatchCreateSchema.parse({
        common: validCommon,
        rows: [{ clientId: "row-1", serialNumber: "SN-001" }],
      }),
    /Batch create requires at least 2 rows/
  )
})

test("assetBatchCreateSchema caps a batch at 100 rows", () => {
  assert.throws(
    () =>
      assetBatchCreateSchema.parse({
        common: validCommon,
        rows: Array.from({ length: 101 }, (_, index) => ({
          clientId: `row-${index + 1}`,
          serialNumber: `SN-${index + 1}`,
        })),
      }),
    /Batch create supports up to 100 rows/
  )
})
```

- [ ] **Step 2: Run validation tests and verify they fail**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
```

Expected: FAIL because `src/lib/validations/asset-batch.ts` does not exist.

- [ ] **Step 3: Add the batch validation schema**

Create `src/lib/validations/asset-batch.ts`:

```ts
import { z } from "zod"
import { assetSchema } from "@/lib/validations/asset"
import { optionalText } from "@/lib/validations/shared"

export const assetBatchRowSchema = z.object({
  clientId: z.string().trim().min(1),
  // Optional: preserve existing asset numbers for legacy assets. Blank rows are auto-generated by the server.
  assetTag: optionalText,
  serialNumber: optionalText,
  custodianId: optionalText,
  departmentId: optionalText,
  homeLocationId: optionalText,
  currentLocationId: optionalText,
  fixedAssetCode: optionalText,
  remark: optionalText,
})

export const assetBatchCreateSchema = z.object({
  common: assetSchema.omit({
    assetTag: true,
    serialNumber: true,
  }),
  rows: z
    .array(assetBatchRowSchema)
    .min(2, "Batch create requires at least 2 rows")
    .max(100, "Batch create supports up to 100 rows"),
  purchaseDocumentIds: z.array(z.string().trim().min(1)).default([]),
})

export type AssetBatchCreateInput = z.infer<typeof assetBatchCreateSchema>
export type AssetBatchRowInput = z.infer<typeof assetBatchRowSchema>
```

- [ ] **Step 4: Run validation tests and verify they pass**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
```

Expected: PASS for 3 tests.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/validations/asset-batch.ts tests/asset-batch-create.test.ts
git commit -m "Add asset batch create validation"
```

---

## Task 2: Asset Tag Batch Generation

**Files:**
- Modify: `src/lib/asset-tag-sequence.ts`
- Modify: `src/lib/asset-tag.ts`
- Test: `tests/asset-tag-sequence.test.ts`

- [ ] **Step 1: Add a failing pure helper test for reserving consecutive running numbers**

Append to `tests/asset-tag-sequence.test.ts`:

```ts
import { reserveAssetTagRunningNumbers } from "../src/lib/asset-tag-sequence.ts"

test("reserves consecutive running numbers after the highest existing number", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["SNI-COM-26-0001", "SNI-COM-26-0010"],
      sequencePrefix: "SNI-COM-26-",
      sequenceSuffix: "",
      runningDigits: 4,
      count: 3,
    }),
    ["0011", "0012", "0013"]
  )
})

test("reserved running numbers skip already-used generated tags", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["SNI-COM-26-0001", "SNI-COM-26-0002", "SNI-COM-26-0004"],
      sequencePrefix: "SNI-COM-26-",
      sequenceSuffix: "",
      runningDigits: 4,
      count: 3,
    }),
    ["0005", "0006", "0007"]
  )
})

test("reserved running numbers also skip manual tags typed in the same batch", () => {
  assert.deepEqual(
    reserveAssetTagRunningNumbers({
      existingAssetTags: ["SNI-COM-26-0001", "SNI-COM-26-0002"],
      reservedAssetTags: ["SNI-COM-26-0003"],
      sequencePrefix: "SNI-COM-26-",
      sequenceSuffix: "",
      runningDigits: 4,
      count: 2,
    }),
    ["0004", "0005"]
  )
})
```

- [ ] **Step 2: Run the sequence tests and verify they fail**

Run:

```powershell
node --test --test-isolation=none tests\asset-tag-sequence.test.ts
```

Expected: FAIL because `reserveAssetTagRunningNumbers` is not exported.

- [ ] **Step 3: Add pure reservation helper and multi-tag generator**

Modify `src/lib/asset-tag-sequence.ts`:

```ts
export function reserveAssetTagRunningNumbers({
  existingAssetTags,
  reservedAssetTags = [],
  sequencePrefix,
  sequenceSuffix = "",
  runningDigits,
  count,
}: {
  existingAssetTags: string[]
  reservedAssetTags?: string[]
  sequencePrefix: string
  sequenceSuffix?: string
  runningDigits: number
  count: number
}) {
  const reserved: string[] = []
  let nextRunning = getNextAssetTagRunningNumber({
    existingAssetTags,
    sequencePrefix,
    sequenceSuffix,
    runningDigits,
  })
  const existing = new Set([...existingAssetTags, ...reservedAssetTags])

  while (reserved.length < count) {
    const running = String(nextRunning).padStart(runningDigits, "0")
    const assetTag = `${sequencePrefix}${running}${sequenceSuffix}`
    if (!existing.has(assetTag)) {
      reserved.push(running)
      existing.add(assetTag)
    }
    nextRunning += 1
  }

  return reserved
}
```

Then modify `src/lib/asset-tag.ts` to import the helper:

```ts
import { getNextAssetTagRunningNumber, reserveAssetTagRunningNumbers } from "@/lib/asset-tag-sequence"
```

Refactor `generateAssetTag()` into:

```ts
export async function generateAssetTag(input: { companyId: string; branchId: string; categoryId: string }) {
  const [assetTag] = await generateAssetTags({ ...input, count: 1 })
  return assetTag
}
```

Add:

```ts
export async function generateAssetTags({
  companyId,
  branchId,
  categoryId,
  count,
  reservedAssetTags = [],
}: {
  companyId: string
  branchId: string
  categoryId: string
  count: number
  reservedAssetTags?: string[]
}) {
  if (count < 1 || count > 100) throw new Error("Asset tag batch size must be between 1 and 100")

  const [
    company,
    branch,
    category,
    digitsSetting,
    separatorSetting,
    prefixSetting,
    formatSetting,
    categoryPrefixesSetting,
  ] = await Promise.all([
    prisma.company.findUnique({ where: { id: companyId }, select: { code: true, assetTagCode: true } }),
    prisma.branch.findUnique({ where: { id: branchId }, select: { code: true } }),
    prisma.assetCategory.findUnique({ where: { id: categoryId }, select: { code: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_running_digits" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_separator" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: "asset_tag_prefix" }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: assetTagFormatTemplateKey }, select: { value: true } }),
    prisma.systemSetting.findUnique({ where: { key: assetTagCategoryPrefixesKey }, select: { value: true } }),
  ])

  if (!company || !branch || !category) {
    throw new Error("Invalid asset tag master data")
  }

  const digits = normalizeRunningDigits(digitsSetting?.value)
  const separator = normalizeSeparator(separatorSetting?.value)
  const categoryPrefixes = parseCategoryPrefixes(categoryPrefixesSetting?.value)
  const categorySegment = categoryPrefixes[categoryId] ?? category.code
  const now = new Date()
  const baseTokens = {
    companyCode: company.code,
    assetCompanyCode: company.assetTagCode?.trim() || company.code,
    branchCode: branch.code,
    categoryCode: category.code,
    assetPrefix: categorySegment,
    globalPrefix: prefixSetting?.value?.trim() || "AST",
    separator,
    year: String(now.getFullYear()),
    year2: String(now.getFullYear()).slice(-2),
    month: String(now.getMonth() + 1).padStart(2, "0"),
    day: String(now.getDate()).padStart(2, "0"),
  }
  const sequencePrefix = renderSequencePrefix(formatSetting?.value, baseTokens)
  const sequenceSuffix = renderSequenceSuffix(formatSetting?.value, baseTokens)
  const existingAssets = await prisma.asset.findMany({
    where: { assetTag: { startsWith: sequencePrefix } },
    select: { assetTag: true },
  })
  const runningNumbers = reserveAssetTagRunningNumbers({
    existingAssetTags: existingAssets.map((asset) => asset.assetTag),
    reservedAssetTags,
    sequencePrefix,
    sequenceSuffix,
    runningDigits: digits,
    count,
  })

  return runningNumbers.map((running) => renderAssetTagTemplate(formatSetting?.value, { ...baseTokens, running }))
}
```

- [ ] **Step 4: Run sequence tests and focused existing tests**

Run:

```powershell
node --test --test-isolation=none tests\asset-tag-sequence.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/asset-tag-sequence.ts src/lib/asset-tag.ts tests/asset-tag-sequence.test.ts
git commit -m "Support batch asset tag generation"
```

---

## Task 3: Server-Side Batch Expansion and Duplicate Checks

**Files:**
- Create: `src/lib/asset-batch-create.ts`
- Test: `tests/asset-batch-create.test.ts`

- [ ] **Step 1: Add failing tests for expanding rows and duplicate serial detection**

Append to `tests/asset-batch-create.test.ts`:

```ts
import {
  buildAssetBatchCreateItems,
  findDuplicateBatchValues,
  summarizeAssetBatchCreateResult,
} from "../src/lib/asset-batch-create.ts"

test("buildAssetBatchCreateItems overlays row values on common asset data", () => {
  const items = buildAssetBatchCreateItems({
    common: validCommon,
    rows: [
      {
        clientId: "row-1",
        serialNumber: "SN-001",
        assetTag: "SNI-COM-26-0001",
        custodianId: "emp-1",
        currentLocationId: "location-desk-1",
      },
      {
        clientId: "row-2",
        serialNumber: "SN-002",
        assetTag: "",
        custodianId: "",
        currentLocationId: "",
        remark: "Keep in IT stock",
      },
    ],
    generatedAssetTags: ["SNI-COM-26-0002"],
  })

  assert.equal(items[0].assetTag, "SNI-COM-26-0001")
  assert.equal(items[0].serialNumber, "SN-001")
  assert.equal(items[0].custodianId, "emp-1")
  assert.equal(items[0].currentLocationId, "location-desk-1")
  assert.equal(items[1].assetTag, "SNI-COM-26-0002")
  assert.equal(items[1].currentLocationId, "location-store")
  assert.equal(items[1].remark, "Keep in IT stock")
})

test("findDuplicateBatchValues returns normalized duplicate serials and asset tags", () => {
  assert.deepEqual(
    findDuplicateBatchValues([
      { clientId: "row-1", serialNumber: "SN-001", assetTag: "TAG-001" },
      { clientId: "row-2", serialNumber: "sn-001", assetTag: "tag-001" },
      { clientId: "row-3", serialNumber: "SN-003", assetTag: "" },
    ]),
    { serialNumbers: ["sn-001"], assetTags: ["tag-001"] }
  )
})

test("summarizeAssetBatchCreateResult returns ids and tags for next actions", () => {
  assert.deepEqual(
    summarizeAssetBatchCreateResult([
      { id: "asset-1", assetTag: "TAG-001", name: "Desktop" },
      { id: "asset-2", assetTag: "TAG-002", name: "Desktop" },
    ]),
    {
      created: 2,
      assets: [
        { id: "asset-1", assetTag: "TAG-001", name: "Desktop" },
        { id: "asset-2", assetTag: "TAG-002", name: "Desktop" },
      ],
      assetIds: ["asset-1", "asset-2"],
    }
  )
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
```

Expected: FAIL because `src/lib/asset-batch-create.ts` does not exist.

- [ ] **Step 3: Create pure helper module**

Create `src/lib/asset-batch-create.ts`:

```ts
import type { AssetInput } from "@/lib/validations/asset"
import type { AssetBatchCreateInput, AssetBatchRowInput } from "@/lib/validations/asset-batch"

type CreatedAssetSummary = {
  id: string
  assetTag: string
  name: string
}

function nullableText(value?: string | null) {
  const normalized = value?.trim() ?? ""
  return normalized.length > 0 ? normalized : null
}

function normalizedKey(value?: string | null) {
  return value?.trim().toLowerCase() ?? ""
}

export function findDuplicateBatchValues(rows: AssetBatchRowInput[]) {
  const seenSerials = new Set<string>()
  const seenTags = new Set<string>()
  const duplicateSerials = new Set<string>()
  const duplicateTags = new Set<string>()

  for (const row of rows) {
    const serial = normalizedKey(row.serialNumber)
    if (serial) {
      if (seenSerials.has(serial)) duplicateSerials.add(serial)
      seenSerials.add(serial)
    }

    const assetTag = normalizedKey(row.assetTag)
    if (assetTag) {
      if (seenTags.has(assetTag)) duplicateTags.add(assetTag)
      seenTags.add(assetTag)
    }
  }

  return {
    serialNumbers: [...duplicateSerials],
    assetTags: [...duplicateTags],
  }
}

export function buildAssetBatchCreateItems({
  common,
  rows,
  generatedAssetTags,
}: {
  common: AssetBatchCreateInput["common"]
  rows: AssetBatchCreateInput["rows"]
  generatedAssetTags: string[]
}): AssetInput[] {
  let generatedIndex = 0

  return rows.map((row) => {
    const manualAssetTag = nullableText(row.assetTag)
    const assetTag = manualAssetTag ?? generatedAssetTags[generatedIndex++]
    if (!assetTag) throw new Error("Missing generated asset tag")

    return {
      ...common,
      assetTag,
      serialNumber: nullableText(row.serialNumber),
      custodianId: nullableText(row.custodianId) ?? common.custodianId ?? null,
      departmentId: nullableText(row.departmentId) ?? common.departmentId ?? null,
      homeLocationId: nullableText(row.homeLocationId) ?? common.homeLocationId ?? null,
      currentLocationId: nullableText(row.currentLocationId) ?? common.currentLocationId,
      fixedAssetCode: nullableText(row.fixedAssetCode),
      remark: nullableText(row.remark) ?? common.remark ?? null,
    }
  })
}

export function summarizeAssetBatchCreateResult(assets: CreatedAssetSummary[]) {
  return {
    created: assets.length,
    assets,
    assetIds: assets.map((asset) => asset.id),
  }
}
```

- [ ] **Step 4: Run tests and verify they pass**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/lib/asset-batch-create.ts tests/asset-batch-create.test.ts
git commit -m "Add asset batch create helpers"
```

---

## Task 4: Batch Create API

**Files:**
- Create: `src/app/api/assets/batch/route.ts`
- Modify: `src/lib/asset-batch-create.ts`
- Test: `tests/asset-batch-create.test.ts`

- [ ] **Step 1: Add helper test for DB duplicate error formatting**

Append to `tests/asset-batch-create.test.ts`:

```ts
import { buildAssetBatchDuplicateMessage } from "../src/lib/asset-batch-create.ts"

test("buildAssetBatchDuplicateMessage explains duplicate fields clearly", () => {
  assert.equal(
    buildAssetBatchDuplicateMessage({
      duplicateBatchSerials: ["sn-001"],
      duplicateBatchAssetTags: [],
      existingSerials: ["sn-009"],
      existingAssetTags: ["tag-010"],
    }),
    "พบข้อมูลซ้ำ: Serial Number ซ้ำในชุดนี้ sn-001; Serial Number ซ้ำกับข้อมูลเดิม sn-009; Asset Tag ซ้ำกับข้อมูลเดิม tag-010"
  )
})
```

- [ ] **Step 2: Implement duplicate message helper**

Append to `src/lib/asset-batch-create.ts`:

```ts
export function buildAssetBatchDuplicateMessage({
  duplicateBatchSerials,
  duplicateBatchAssetTags,
  existingSerials,
  existingAssetTags,
}: {
  duplicateBatchSerials: string[]
  duplicateBatchAssetTags: string[]
  existingSerials: string[]
  existingAssetTags: string[]
}) {
  const parts = [
    duplicateBatchSerials.length ? `Serial Number ซ้ำในชุดนี้ ${duplicateBatchSerials.join(", ")}` : "",
    duplicateBatchAssetTags.length ? `Asset Tag ซ้ำในชุดนี้ ${duplicateBatchAssetTags.join(", ")}` : "",
    existingSerials.length ? `Serial Number ซ้ำกับข้อมูลเดิม ${existingSerials.join(", ")}` : "",
    existingAssetTags.length ? `Asset Tag ซ้ำกับข้อมูลเดิม ${existingAssetTags.join(", ")}` : "",
  ].filter(Boolean)

  return parts.length > 0 ? `พบข้อมูลซ้ำ: ${parts.join("; ")}` : ""
}
```

- [ ] **Step 3: Create the batch API route**

Create `src/app/api/assets/batch/route.ts`:

```ts
import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { generateAssetTags } from "@/lib/asset-tag"
import {
  buildAssetBatchCreateItems,
  buildAssetBatchDuplicateMessage,
  findDuplicateBatchValues,
  summarizeAssetBatchCreateResult,
} from "@/lib/asset-batch-create"
import { assetBatchCreateSchema } from "@/lib/validations/asset-batch"

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
    const duplicateMessage = buildAssetBatchDuplicateMessage({
      duplicateBatchSerials: duplicateBatchValues.serialNumbers,
      duplicateBatchAssetTags: duplicateBatchValues.assetTags,
      existingSerials: existingSerials.flatMap((asset) => (asset.serialNumber ? [asset.serialNumber] : [])),
      existingAssetTags: existingAssetTags.map((asset) => asset.assetTag),
    })

    if (duplicateMessage) {
      return NextResponse.json({ error: duplicateMessage }, { status: 400 })
    }

    const autoTagCount = input.rows.filter((row) => !row.assetTag?.trim()).length
    const generatedAssetTags =
      autoTagCount > 0
        ? await generateAssetTags({
            companyId: input.common.companyId,
            branchId: input.common.branchId,
            categoryId: input.common.categoryId,
            count: autoTagCount,
            reservedAssetTags: manualAssetTags,
          })
        : []
    const assetsToCreate = buildAssetBatchCreateItems({
      common: input.common,
      rows: input.rows,
      generatedAssetTags,
    })

    const createdAssets = await prisma.$transaction(async (tx) => {
      const assets = []

      for (const assetInput of assetsToCreate) {
        const asset = await tx.asset.create({
          data: {
            ...assetInput,
            createdBy: user.id,
            updatedBy: user.id,
          },
          select: { id: true, assetTag: true, name: true, currentLocationId: true, remark: true },
        })
        assets.push({ id: asset.id, assetTag: asset.assetTag, name: asset.name })

        await tx.assetMovement.create({
          data: {
            assetId: asset.id,
            movementType: "batch_create",
            toValue: asset.currentLocationId,
            reason: "Batch asset registration",
            referenceType: "asset_batch_create",
            referenceId: asset.id,
            performedBy: user.id,
            remark: asset.remark,
          },
        })

        for (const purchaseDocumentId of input.purchaseDocumentIds) {
          await tx.purchaseDocumentAsset.create({
            data: {
              assetId: asset.id,
              purchaseDocumentId,
              linkedBy: user.id,
            },
          })
        }

        await tx.systemLog.create({
          data: {
            userId: user.id,
            action: "batch_create_item",
            module: "asset",
            recordId: asset.id,
            newValue: JSON.stringify(assetInput),
            remark: "Asset created from batch create",
          },
        })
      }

      await tx.systemLog.create({
        data: {
          userId: user.id,
          action: "batch_create",
          module: "asset",
          recordId: assets.map((asset) => asset.id).join(","),
          newValue: JSON.stringify({
            created: assets.length,
            assetTags: assets.map((asset) => asset.assetTag),
            purchaseDocumentIds: input.purchaseDocumentIds,
          }),
          remark: "Asset batch created",
        },
      })

      return assets
    })

    return NextResponse.json(summarizeAssetBatchCreateResult(createdAssets), { status: 201 })
  } catch (error) {
    return errorResponse(error, 400)
  }
}
```

- [ ] **Step 4: Run focused tests**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
```

Expected: PASS.

- [ ] **Step 5: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 6: Commit**

```powershell
git add src/app/api/assets/batch/route.ts src/lib/asset-batch-create.ts tests/asset-batch-create.test.ts
git commit -m "Add asset batch create API"
```

---

## Task 5: Create Page Mode Switch

**Files:**
- Create: `src/components/assets/asset-create-workspace.tsx`
- Modify: `src/app/[locale]/(dashboard)/assets/new/page.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Read Next.js local docs before touching the App Router page**

Run:

```powershell
Get-Content .\node_modules\next\dist\docs\01-app\01-getting-started\05-server-and-client-components.md -TotalCount 120
```

Expected: confirms Server Components by default and Client Components for state/event handlers.

- [ ] **Step 2: Add translations**

Add under `asset` in `messages/th.json`:

```json
"createModeSingle": "เพิ่มทีละรายการ",
"createModeBatch": "เพิ่มเป็นชุด",
"batchCreateTitle": "เพิ่มทรัพย์สินเป็นชุด",
"batchCreateSubtitle": "กรอกข้อมูลร่วมครั้งเดียว แล้วกรอกเฉพาะเลขทรัพย์สินเดิม, Serial Number หรือผู้ถือครองที่ต่างกันในแต่ละแถว"
```

Add under `asset` in `messages/en.json`:

```json
"createModeSingle": "Single asset",
"createModeBatch": "Batch create",
"batchCreateTitle": "Batch Create Assets",
"batchCreateSubtitle": "Enter shared data once, then fill only row-specific legacy asset tags, serials, custodians, or locations."
```

- [ ] **Step 3: Create client workspace with segmented controls**

Create `src/components/assets/asset-create-workspace.tsx`:

```tsx
"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { AssetForm } from "@/components/assets/asset-form"
import { AssetBatchForm } from "@/components/assets/asset-batch-form"

type AssetCreateWorkspaceProps = React.ComponentProps<typeof AssetForm>

export function AssetCreateWorkspace(props: AssetCreateWorkspaceProps) {
  const t = useTranslations("asset")
  const [mode, setMode] = useState<"single" | "batch">("single")

  return (
    <div className="space-y-4">
      <div className="inline-flex rounded-md border border-border bg-surface p-1">
        <button
          type="button"
          onClick={() => setMode("single")}
          className={`h-9 rounded px-3 text-sm font-medium transition-colors ${
            mode === "single" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("createModeSingle")}
        </button>
        <button
          type="button"
          onClick={() => setMode("batch")}
          className={`h-9 rounded px-3 text-sm font-medium transition-colors ${
            mode === "batch" ? "bg-primary text-white" : "text-muted-foreground hover:bg-accent hover:text-foreground"
          }`}
        >
          {t("createModeBatch")}
        </button>
      </div>
      {mode === "single" ? <AssetForm {...props} /> : <AssetBatchForm {...props} />}
    </div>
  )
}
```

- [ ] **Step 4: Temporarily create `AssetBatchForm` stub so the page compiles**

Create `src/components/assets/asset-batch-form.tsx`:

```tsx
"use client"

import { useTranslations } from "next-intl"
import type { AssetForm } from "@/components/assets/asset-form"

type AssetBatchFormProps = React.ComponentProps<typeof AssetForm>

export function AssetBatchForm(_props: AssetBatchFormProps) {
  const t = useTranslations("asset")

  return (
    <div className="mx-auto max-w-6xl rounded-md border border-border bg-surface p-6">
      <h1 className="text-2xl font-bold text-foreground">{t("batchCreateTitle")}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{t("batchCreateSubtitle")}</p>
    </div>
  )
}
```

- [ ] **Step 5: Switch the new page to use the workspace**

Modify `src/app/[locale]/(dashboard)/assets/new/page.tsx`:

```tsx
import { getAssetFormOptions } from "@/lib/asset-form-options"
import { AssetCreateWorkspace } from "@/components/assets/asset-create-workspace"

export default async function NewAssetPage() {
  const options = await getAssetFormOptions()
  return <AssetCreateWorkspace {...options} />
}
```

- [ ] **Step 6: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 7: Commit**

```powershell
git add src/components/assets/asset-create-workspace.tsx src/components/assets/asset-batch-form.tsx "src/app/[locale]/(dashboard)/assets/new/page.tsx" messages/th.json messages/en.json
git commit -m "Add asset create mode switch"
```

---

## Task 6: Batch Form Common Fields and Rows

**Files:**
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add translations**

Add under `asset` in `messages/th.json`:

```json
"batchCommonData": "ข้อมูลร่วมของชุดทรัพย์สิน",
"batchRows": "รายการทรัพย์สินในชุด",
"batchQuantity": "จำนวนที่ต้องการสร้าง",
"batchGenerateRows": "สร้างแถว",
"batchRowNo": "ลำดับ",
"batchSerialNumber": "Serial Number",
"batchAssetTag": "เลขที่ทรัพย์สินเดิม/กำหนดเอง",
"batchAssetTagHelp": "เว้นว่างเพื่อให้ระบบสร้างเลขให้อัตโนมัติ หรือกรอกเลขเดิมเมื่อนำทรัพย์สินเก่าเข้าระบบ",
"batchCustodian": "ผู้ถือครอง",
"batchLocation": "ที่ตั้ง",
"batchFixedAssetCode": "รหัสบัญชี/FA",
"batchRemark": "หมายเหตุ",
"batchSubmit": "บันทึกทั้งชุด",
"batchSubmitSuccess": "สร้างทรัพย์สิน {count} รายการแล้ว",
"batchRowHelp": "กรอกเฉพาะข้อมูลที่ต่างกันในแต่ละเครื่อง ช่องที่เว้นว่างจะใช้ค่าจากข้อมูลร่วม"
```

Add matching English keys:

```json
"batchCommonData": "Shared asset data",
"batchRows": "Batch rows",
"batchQuantity": "Quantity",
"batchGenerateRows": "Generate rows",
"batchRowNo": "No.",
"batchSerialNumber": "Serial Number",
"batchAssetTag": "Legacy/custom Asset Tag",
"batchAssetTagHelp": "Leave blank to auto-generate, or enter the existing number when registering legacy assets.",
"batchCustodian": "Custodian",
"batchLocation": "Location",
"batchFixedAssetCode": "Fixed Asset Code",
"batchRemark": "Remark",
"batchSubmit": "Save batch",
"batchSubmitSuccess": "Created {count} assets",
"batchRowHelp": "Fill only values that differ per asset. Empty row fields use shared values."
```

- [ ] **Step 2: Implement common field state**

In `src/components/assets/asset-batch-form.tsx`, replace the stub with a form that starts from the same shape as `AssetForm`:

```tsx
const emptyCommon = {
  name: "",
  categoryId: "",
  brandId: "",
  modelId: "",
  companyId: "",
  branchId: "",
  ownershipType: defaultAssetOwnershipType,
  departmentId: "",
  custodianId: "",
  homeLocationId: "",
  currentLocationId: "",
  statusId: "",
  conditionId: "",
  purchaseDate: "",
  purchasePrice: "",
  supplierId: "",
  warrantyStartDate: "",
  warrantyEndDate: "",
  poNumber: "",
  invoiceNumber: "",
  customFieldsJson: "",
  isActive: true,
}
```

Use existing option filtering rules:

```tsx
const filteredBranches = branches.filter((branch) => branch.companyId === common.companyId)
const filteredEmployees = employees.filter(
  (employee) => (!common.companyId || employee.companyId === common.companyId) && (!common.branchId || employee.branchId === common.branchId)
)
const filteredLocations = locations.filter((location) => location.branchId === common.branchId)
const filteredModels = models.filter(
  (model) => (!common.categoryId || model.categoryId === common.categoryId) && (!common.brandId || model.brandId === common.brandId)
)
```

- [ ] **Step 3: Implement row state and quantity controls**

Add:

```tsx
type BatchRow = {
  clientId: string
  assetTag: string
  serialNumber: string
  custodianId: string
  currentLocationId: string
  fixedAssetCode: string
  remark: string
}

function createBatchRows(count: number): BatchRow[] {
  return Array.from({ length: count }, (_, index) => ({
    clientId: `row-${Date.now()}-${index + 1}`,
    assetTag: "",
    serialNumber: "",
    custodianId: "",
    currentLocationId: "",
    fixedAssetCode: "",
    remark: "",
  }))
}
```

Default quantity: `10`, default rows: `createBatchRows(10)`.

- [ ] **Step 4: Render the row table**

Render a responsive table with stable columns:

```tsx
<div className="overflow-x-auto rounded-md border border-border">
  <table className="min-w-[1100px] w-full text-sm">
    <thead className="bg-muted/40 text-left text-xs font-semibold text-muted-foreground">
      <tr>
        <th className="w-16 px-3 py-2">{t("batchRowNo")}</th>
        <th className="w-56 px-3 py-2">{t("batchSerialNumber")}</th>
        <th className="w-48 px-3 py-2">{t("batchAssetTag")}</th>
        <th className="w-64 px-3 py-2">{t("batchCustodian")}</th>
        <th className="w-64 px-3 py-2">{t("batchLocation")}</th>
        <th className="w-44 px-3 py-2">{t("batchFixedAssetCode")}</th>
        <th className="w-64 px-3 py-2">{t("batchRemark")}</th>
      </tr>
    </thead>
    <tbody>
      {rows.map((row, index) => (
        <tr key={row.clientId} className="border-t border-border">
          <td className="px-3 py-2 font-medium">{index + 1}</td>
          <td className="px-3 py-2">
            <ScannerTextInput value={row.serialNumber} onChange={(value) => setRowField(row.clientId, "serialNumber", value)} labels={scannerLabels} />
          </td>
          <td className="px-3 py-2">
            <input value={row.assetTag} onChange={(event) => setRowField(row.clientId, "assetTag", event.target.value)} placeholder={t("autoTagHint")} aria-label={t("batchAssetTagHelp")} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
            <p className="mt-1 text-[11px] text-muted-foreground">{t("batchAssetTagHelp")}</p>
          </td>
          <td className="px-3 py-2">
            <SearchableSelect label="" value={row.custodianId} options={filteredEmployees} placeholder={t("selectCustodian")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setRowField(row.clientId, "custodianId", value)} />
          </td>
          <td className="px-3 py-2">
            <select value={row.currentLocationId} onChange={(event) => setRowField(row.clientId, "currentLocationId", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm">
              <option value="">{t("selectLocation")}</option>
              {filteredLocations.map((location) => <option key={location.id} value={location.id}>{location.label}</option>)}
            </select>
          </td>
          <td className="px-3 py-2">
            <input value={row.fixedAssetCode} onChange={(event) => setRowField(row.clientId, "fixedAssetCode", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </td>
          <td className="px-3 py-2">
            <input value={row.remark} onChange={(event) => setRowField(row.clientId, "remark", event.target.value)} className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm" />
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
```

- [ ] **Step 5: Add client duplicate warnings before submit**

Compute:

```tsx
const duplicateSerials = findDuplicateStrings(rows.map((row) => row.serialNumber))
const duplicateAssetTags = findDuplicateStrings(rows.map((row) => row.assetTag))
const hasClientDuplicates = duplicateSerials.length > 0 || duplicateAssetTags.length > 0
```

Add:

```tsx
function findDuplicateStrings(values: string[]) {
  const seen = new Set<string>()
  const duplicates = new Set<string>()
  for (const value of values) {
    const normalized = value.trim().toLowerCase()
    if (!normalized) continue
    if (seen.has(normalized)) duplicates.add(normalized)
    seen.add(normalized)
  }
  return [...duplicates]
}
```

Show a warning panel when `hasClientDuplicates` is true.

- [ ] **Step 6: Commit**

```powershell
git add src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json
git commit -m "Build asset batch create form"
```

---

## Task 7: Submit Batch and Success Actions

**Files:**
- Modify: `src/components/assets/asset-batch-form.tsx`
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Add success action translations**

Thai:

```json
"batchCreatedTitle": "สร้างทรัพย์สินเป็นชุดสำเร็จ",
"batchCreatedDescription": "ระบบสร้างทรัพย์สิน {count} รายการแล้ว",
"batchGoToRegister": "ไปหน้าทะเบียน",
"batchPrintLabels": "พิมพ์ QR Label ทั้งชุด"
```

English:

```json
"batchCreatedTitle": "Batch created",
"batchCreatedDescription": "Created {count} assets",
"batchGoToRegister": "Go to register",
"batchPrintLabels": "Print QR labels"
```

- [ ] **Step 2: Add submit handler**

In `AssetBatchForm`:

```tsx
async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
  event.preventDefault()
  if (hasClientDuplicates) {
    toast.error(t("duplicateWarning"))
    return
  }

  setSaving(true)
  try {
    const response = await fetch("/api/assets/batch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        common,
        rows,
        purchaseDocumentIds: selectedPurchaseDocumentIds,
      }),
    })
    const result = await response.json().catch(() => null)
    if (!response.ok) throw new Error(result?.error ?? tCommon("error"))

    setCreatedBatch(result)
    toast.success(t("batchSubmitSuccess", { count: result.created }))
  } catch (error) {
    toast.error(error instanceof Error ? error.message : tCommon("error"))
  } finally {
    setSaving(false)
  }
}
```

- [ ] **Step 3: Add success panel**

After successful submit, show:

```tsx
{createdBatch ? (
  <div className="rounded-md border border-success/30 bg-success/10 p-4">
    <h2 className="text-lg font-semibold text-foreground">{t("batchCreatedTitle")}</h2>
    <p className="mt-1 text-sm text-muted-foreground">{t("batchCreatedDescription", { count: createdBatch.created })}</p>
    <div className="mt-4 flex flex-wrap gap-2">
      <Link href={`/${locale}/assets`} className="inline-flex h-10 items-center rounded-md border border-border px-3 text-sm font-medium hover:bg-accent">
        {t("batchGoToRegister")}
      </Link>
      <Link href={`/${locale}/asset-management/labels?assetIds=${createdBatch.assetIds.join(",")}`} className="inline-flex h-10 items-center rounded-md bg-primary px-3 text-sm font-medium text-white hover:bg-primary/90">
        {t("batchPrintLabels")}
      </Link>
    </div>
  </div>
) : null}
```

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/assets/asset-batch-form.tsx messages/th.json messages/en.json
git commit -m "Wire asset batch create submit flow"
```

---

## Task 8: Label Tool URL Support for Created Batch

**Files:**
- Modify: `src/components/assets/asset-label-batch-tool.tsx`
- Modify: `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx`

- [ ] **Step 1: Inspect current label batch selection behavior**

Run:

```powershell
Get-Content .\src\components\assets\asset-label-batch-tool.tsx -TotalCount 260
Get-Content '.\src\app\[locale]\(dashboard)\asset-management\labels\page.tsx'
```

Expected: identify how selected asset IDs are stored.

- [ ] **Step 2: Accept `assetIds` query parameter on the label page**

Modify `src/app/[locale]/(dashboard)/asset-management/labels/page.tsx` so it reads:

```tsx
export default async function AssetLabelsPage({
  searchParams,
}: {
  searchParams: Promise<{ assetIds?: string }>
}) {
  const params = await searchParams
  const preselectedAssetIds = (params.assetIds ?? "")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)

  // pass preselectedAssetIds to AssetLabelBatchTool
}
```

- [ ] **Step 3: Add `preselectedAssetIds` prop**

In `AssetLabelBatchTool`, initialize selection from props:

```tsx
export function AssetLabelBatchTool({
  assets,
  preselectedAssetIds = [],
  labels,
}: {
  assets: AssetLabelOption[]
  preselectedAssetIds?: string[]
  labels: AssetLabelBatchLabels
}) {
  const [selectedAssetIds, setSelectedAssetIds] = useState(() =>
    preselectedAssetIds.filter((id) => assets.some((asset) => asset.id === id))
  )
}
```

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected: PASS.

- [ ] **Step 5: Commit**

```powershell
git add src/components/assets/asset-label-batch-tool.tsx "src/app/[locale]/(dashboard)/asset-management/labels/page.tsx"
git commit -m "Prefill label batch from created assets"
```

---

## Task 9: Browser Verification

**Files:**
- No code files unless bugs are found.

- [ ] **Step 1: Start or reuse local dev server**

Run:

```powershell
npm run dev
```

Expected: local app available at `http://localhost:3000/th/assets/new`.

- [ ] **Step 2: Verify single mode still works visually**

Open:

```text
http://localhost:3000/th/assets/new
```

Expected:
- Mode switch is visible.
- Default mode is `เพิ่มทีละรายการ`.
- Existing single asset form still displays the same sections and controls.

- [ ] **Step 3: Verify batch mode renders correctly**

Click `เพิ่มเป็นชุด`.

Expected:
- Shared data section appears.
- Quantity defaults to `10`.
- Row table has 10 rows.
- Serial Number cells support scanner input.
- Page does not overflow horizontally except the intended row-table scroll area.

- [ ] **Step 4: Verify client duplicate warning**

Enter `SN-001` in row 1 and row 2.

Expected:
- Duplicate warning appears before submit.
- Submit button is disabled or submit shows duplicate warning.

- [ ] **Step 5: Verify successful creation against local DB**

Fill required common fields using small test data:
- Category: Desktop Computer or Computer
- Company/Branch: valid active values
- Ownership Type: Stock
- Department: IT
- Current Location: IT stock or a valid location
- Status: พร้อมใช้งาน
- Condition: ใหม่
- Quantity: 2
- Row 1 Asset Tag: `LEGACY-QA-001`
- Row 1 Serial: `BATCH-QA-001`
- Row 2 Asset Tag: blank, so the system auto-generates it
- Row 2 Serial: `BATCH-QA-002`

Submit.

Expected:
- Success panel appears.
- It reports 2 created assets.
- Row 1 keeps `LEGACY-QA-001`.
- Row 2 receives an auto-generated asset tag.
- Register link opens `/th/assets`.
- QR label link opens `/th/asset-management/labels?assetIds=...`.

- [ ] **Step 6: Clean test data if needed**

Use existing guarded cleanup script only if the created QA assets match the cleanup criteria:

```powershell
npm run cleanup:test-data -- --dry-run --all-assets
```

Expected: dry-run prints the matched trial assets before any apply command is considered.

---

## Task 10: Final Verification, Docs, and Handoff

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test --test-isolation=none tests\asset-batch-create.test.ts
node --test --test-isolation=none tests\asset-tag-sequence.test.ts
```

Expected: PASS.

- [ ] **Step 2: Run full verify**

Run:

```powershell
npm run verify
```

Expected: PASS for lint, all tests, and production build.

- [ ] **Step 3: Update `DEVELOPER_HANDOFF.md`**

Add a bullet near the asset register/import/export section:

```md
- **Asset Batch Create** หน้า `/assets/new` เพิ่มโหมด `เพิ่มเป็นชุด` สำหรับสร้างทรัพย์สิน 2-100 รายการจากข้อมูลร่วมชุดเดียว เช่น คอมพิวเตอร์ 10 ชุดจาก PO เดียวกัน โดยกรอกข้อมูลร่วมครั้งเดียว, กรอกเลขทรัพย์สินเดิม/Serial/ผู้ถือครอง/ที่ตั้งรายแถว, เว้นเลขทรัพย์สินว่างเพื่อให้ระบบใช้ asset tag generator แบบจองเลขต่อเนื่องและหลบเลขที่กรอกเองใน batch เดียวกัน, สร้าง movement/audit log/ลิงก์เอกสารจัดซื้อให้ทุก asset และต่อไปยังหน้า label batch ด้วย assetIds ที่สร้างแล้ว
```

- [ ] **Step 4: Commit**

```powershell
git add DEVELOPER_HANDOFF.md
git commit -m "Document asset batch create workflow"
```

- [ ] **Step 5: Push**

```powershell
git push origin master
```

Expected: branch `master` updates on GitHub.

---

## Self-Review

- Spec coverage: This plan covers batch mode on `/assets/new`, common data entry, row-level serial/custodian/location, server-side validation, asset tag generation, purchase-document linking, audit/movement history, label printing handoff, tests, browser verification, and handoff documentation.
- Placeholder scan: No task uses unresolved placeholders. Code samples use concrete function names, file paths, commands, and expected outcomes.
- Type consistency: `AssetBatchCreateInput`, `AssetBatchRowInput`, `buildAssetBatchCreateItems`, `generateAssetTags`, and `reserveAssetTagRunningNumbers` are introduced before later tasks reference them.
