# Audit Out-of-Scope Actual Field Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let field auditors record actual field values for assets found outside an audit round, while master asset updates remain controlled by audit finding review.

**Architecture:** Extend the existing audit scan flow instead of creating a new correction workflow. `scan-lookup` returns current master field ids for UI prefill, `AuditScanForm` posts actual fields for out-of-scope saves, the scan route creates `out_of_scope` plus field-specific findings, and the existing finding review route remains the only path that updates master asset data.

**Tech Stack:** Next.js 16 App Router route handlers, TypeScript, React 19, Prisma 7 with SQL Server, next-intl messages, Node test runner.

---

## File Structure

- Create `tests/audit-out-of-scope-actual-field.test.ts`
  - Source-level regression tests for the out-of-scope actual-field contract.
- Modify `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`
  - Return current master field ids and ownership type in the asset payload.
- Modify `src/components/audit/audit-scan-form.tsx`
  - Extend `OutOfScopeAsset`, prefill `values` from lookup payload, render actual field controls, require evidence for changed out-of-scope fields, and post actual field ids to the scan save route.
- Modify `src/app/api/audit-rounds/[id]/scan/route.ts`
  - Store submitted actual fields for out-of-scope assets and create field-specific findings for changed values without updating the master asset.
- Modify `src/app/api/audit-findings/[id]/review/route.ts`
  - Treat `out_of_scope` approval as a confirmation finding with no master update.
- Modify `messages/th.json` and `messages/en.json`
  - Clarify out-of-scope helper copy.
- Modify docs after implementation:
  - `DEVELOPER_HANDOFF.md`
  - `docs/06_WORKFLOWS.md`
  - `docs/07_UAT_CHECKLIST.md`
  - `docs/11_FEATURE_LIST.md`
  - `docs/99_CHANGELOG.md`

---

### Task 1: Add Regression Tests

**Files:**
- Create: `tests/audit-out-of-scope-actual-field.test.ts`

- [ ] **Step 1: Write the failing test**

Create `tests/audit-out-of-scope-actual-field.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const scanLookupRoutePath = "src/app/api/audit-rounds/[id]/scan-lookup/route.ts"
const scanRoutePath = "src/app/api/audit-rounds/[id]/scan/route.ts"
const reviewRoutePath = "src/app/api/audit-findings/[id]/review/route.ts"
const scanFormPath = "src/components/audit/audit-scan-form.tsx"

test("audit scan lookup returns master field ids for out-of-scope actual data", () => {
  const route = readFileSync(scanLookupRoutePath, "utf8")

  assert.match(route, /currentLocationId:\s*true/)
  assert.match(route, /custodianId:\s*true/)
  assert.match(route, /departmentId:\s*true/)
  assert.match(route, /conditionId:\s*true/)
  assert.match(route, /ownershipType:\s*true/)
  assert.match(route, /currentLocationId:\s*asset\.currentLocationId/)
  assert.match(route, /custodianId:\s*asset\.custodianId/)
  assert.match(route, /departmentId:\s*asset\.departmentId/)
  assert.match(route, /conditionId:\s*asset\.conditionId/)
})

test("audit scan form captures out-of-scope actual fields before saving", () => {
  const form = readFileSync(scanFormPath, "utf8")

  assert.match(form, /type OutOfScopeAsset = \{[\s\S]*currentLocationId:\s*string/)
  assert.match(form, /type OutOfScopeAsset = \{[\s\S]*custodianId:\s*string \| null/)
  assert.match(form, /type OutOfScopeAsset = \{[\s\S]*departmentId:\s*string \| null/)
  assert.match(form, /type OutOfScopeAsset = \{[\s\S]*conditionId:\s*string \| null/)
  assert.match(form, /type OutOfScopeAsset = \{[\s\S]*ownershipType\?:\s*string \| null/)
  assert.match(form, /getOutOfScopeActualValues\(values,\s*outOfScopeAsset\)/)
  assert.match(form, /hasOutOfScopeActualMismatch\(outOfScopeAsset,\s*outOfScopeActualValues\)/)
  assert.match(form, /actualLocationId:\s*outOfScopeActualValues\.actualLocationId/)
  assert.match(form, /actualCustodianId:\s*outOfScopeActualValues\.actualCustodianId/)
  assert.match(form, /actualDepartmentId:\s*outOfScopeActualValues\.actualDepartmentId/)
  assert.match(form, /actualConditionId:\s*outOfScopeActualValues\.actualConditionId/)
  assert.match(form, /outOfScopeAsset && \(/)
  assert.match(form, /t\("actualDataTitle"\)/)
  assert.match(form, /t\("actualLocation"\)/)
  assert.match(form, /t\("actualCustodian"\)/)
  assert.match(form, /t\("actualDepartment"\)/)
  assert.match(form, /t\("actualCondition"\)/)
})

test("out-of-scope scan save creates reviewable field findings without updating master asset", () => {
  const route = readFileSync(scanRoutePath, "utf8")
  const outOfScopeStart = route.indexOf("if (!item)")
  const normalScanStart = route.indexOf("const actual = {")
  const outOfScopeBlock = route.slice(outOfScopeStart, normalScanStart)

  assert.match(route, /function buildOutOfScopeFieldFindings/)
  assert.match(route, /findingType:\s*"wrong_location"/)
  assert.match(route, /findingType:\s*"wrong_custodian"/)
  assert.match(route, /findingType:\s*"wrong_department"/)
  assert.match(route, /findingType:\s*"wrong_condition"/)
  assert.match(route, /actionTaken:\s*"out_of_scope_actual_field_reported"/)
  assert.match(route, /fieldFindingTypes/)
  assert.doesNotMatch(outOfScopeBlock, /tx\.asset\.update/)
})

test("reviewing out-of-scope findings confirms the event without master updates", () => {
  const route = readFileSync(reviewRoutePath, "utf8")
  const outOfScopeStart = route.indexOf('finding.findingType === "out_of_scope"')
  const notFoundStart = route.indexOf('finding.findingType === "not_found"')
  const outOfScopeReviewBlock = route.slice(outOfScopeStart, notFoundStart)

  assert.match(route, /finding\.findingType === "out_of_scope"/)
  assert.match(route, /actionTaken:\s*"out_of_scope_confirmed_no_master_update"/)
  assert.doesNotMatch(outOfScopeReviewBlock, /tx\.asset\.update/)
  assert.doesNotMatch(outOfScopeReviewBlock, /tx\.assetMovement\.create/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test tests\audit-out-of-scope-actual-field.test.ts
```

Expected: FAIL because the lookup route does not return master field ids, the form does not render out-of-scope actual field controls, the scan route does not create field-specific out-of-scope findings, and the review route has no out-of-scope confirmation branch.

- [ ] **Step 3: Commit the failing test only if following strict TDD history**

If committing red tests separately:

```powershell
git add tests/audit-out-of-scope-actual-field.test.ts
git commit -m "Add audit out-of-scope actual field regression tests"
```

Otherwise keep the test staged for the implementation commit.

---

### Task 2: Extend Scan Lookup Payload

**Files:**
- Modify: `src/app/api/audit-rounds/[id]/scan-lookup/route.ts`
- Test: `tests/audit-out-of-scope-actual-field.test.ts`

- [ ] **Step 1: Add master field ids to the route type**

In `type AuditScanLookupAsset`, add these fields:

```ts
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
  ownershipType: string | null
```

- [ ] **Step 2: Select the fields from Prisma**

In the `prisma.asset.findFirst({ select: { ... } })` block, add:

```ts
        currentLocationId: true,
        custodianId: true,
        departmentId: true,
        conditionId: true,
        ownershipType: true,
```

- [ ] **Step 3: Return the fields in `buildAuditScanLookupAsset`**

Add these properties to the object returned by `buildAuditScanLookupAsset(asset)`:

```ts
    currentLocationId: asset.currentLocationId,
    custodianId: asset.custodianId,
    departmentId: asset.departmentId,
    conditionId: asset.conditionId,
    ownershipType: asset.ownershipType,
```

- [ ] **Step 4: Run the lookup-specific test**

Run:

```powershell
node --test tests\audit-out-of-scope-actual-field.test.ts
```

Expected: the first test passes; later tests still fail until UI, scan route, and review route are implemented.

---

### Task 3: Capture Out-of-Scope Actual Fields In The Scan Form

**Files:**
- Modify: `src/components/audit/audit-scan-form.tsx`
- Test: `tests/audit-out-of-scope-actual-field.test.ts`

- [ ] **Step 1: Extend `OutOfScopeAsset`**

Update `type OutOfScopeAsset`:

```ts
type OutOfScopeAsset = {
  id: string
  assetTag: string
  title: string
  subtitle: string
  currentLocationId: string
  custodianId: string | null
  departmentId: string | null
  conditionId: string | null
  ownershipType?: string | null
  meta: {
    location: string
    custodian: string | null
  }
}
```

- [ ] **Step 2: Prefill actual fields when an out-of-scope asset is selected**

Inside `selectScannedAsset`, in the `lookup?.status === "out_of_scope"` block, replace the current `setValues` call with:

```ts
        setValues((current) => ({
          ...current,
          assetId: "",
          actualLocationId: lookup.asset.currentLocationId,
          actualCustodianId: lookup.asset.custodianId ?? "",
          actualDepartmentId: lookup.asset.departmentId ?? "",
          actualConditionId: lookup.asset.conditionId ?? "",
        }))
```

- [ ] **Step 3: Add out-of-scope actual helper functions**

Near `getActualValues`, add:

```ts
function getOutOfScopeActualValues(
  values: {
    actualLocationId: string
    actualCustodianId: string
    actualDepartmentId: string
    actualConditionId: string
  },
  asset: OutOfScopeAsset
) {
  return {
    actualLocationId: values.actualLocationId || asset.currentLocationId || "",
    actualCustodianId: values.actualCustodianId || asset.custodianId || "",
    actualDepartmentId: values.actualDepartmentId || asset.departmentId || "",
    actualConditionId: values.actualConditionId || asset.conditionId || "",
  }
}

function hasOutOfScopeActualMismatch(
  asset: OutOfScopeAsset,
  actualValues: ReturnType<typeof getOutOfScopeActualValues>
) {
  const ownershipType = normalizeAssetOwnershipType(asset.ownershipType)
  const locationMismatch =
    ownershipType !== "software_license" && actualValues.actualLocationId !== asset.currentLocationId
  const custodianMismatch =
    requiresCustodian(asset.ownershipType) && (actualValues.actualCustodianId || null) !== asset.custodianId
  const departmentMismatch = (actualValues.actualDepartmentId || null) !== asset.departmentId
  const conditionMismatch = (actualValues.actualConditionId || null) !== asset.conditionId

  return locationMismatch || custodianMismatch || departmentMismatch || conditionMismatch
}
```

- [ ] **Step 4: Require evidence for changed out-of-scope actual fields**

At the start of `recordOutOfScopeAsset`, after `if (!outOfScopeAsset) return`, add:

```ts
    const outOfScopeActualValues = getOutOfScopeActualValues(values, outOfScopeAsset)
    if (hasOutOfScopeActualMismatch(outOfScopeAsset, outOfScopeActualValues) && queuedAuditPhotos.length === 0) {
      toast.error(t("auditPhotoRequiredForMismatch"))
      return
    }
```

- [ ] **Step 5: Post actual field values in the out-of-scope save payload**

In `recordOutOfScopeAsset`, update the `body: JSON.stringify({ ... })` object to:

```ts
        body: JSON.stringify({
          assetId: outOfScopeAsset.id,
          actualLocationId: outOfScopeActualValues.actualLocationId,
          actualCustodianId: outOfScopeActualValues.actualCustodianId,
          actualDepartmentId: outOfScopeActualValues.actualDepartmentId,
          actualConditionId: outOfScopeActualValues.actualConditionId,
          scanSource,
          remark: values.remark,
        }),
```

- [ ] **Step 6: Render actual field controls in the out-of-scope card**

Inside the `{outOfScopeAsset && (...)}` card, after the asset identity block and before the save button row closes, add this field section:

```tsx
              <div className="mt-4 rounded-md border border-border bg-surface p-3">
                <div className="text-sm font-semibold text-foreground">{t("actualDataTitle")}</div>
                <div className="mt-1 text-sm text-muted-foreground">{t("outOfScopeHelp")}</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {normalizeAssetOwnershipType(outOfScopeAsset.ownershipType) !== "software_license" ? (
                    <Select
                      label={t("actualLocation")}
                      value={values.actualLocationId || outOfScopeAsset.currentLocationId || ""}
                      required
                      onChange={(value) => setField("actualLocationId", value)}
                    >
                      <OptionList options={options.locations} />
                    </Select>
                  ) : null}
                  {requiresCustodian(outOfScopeAsset.ownershipType) ? (
                    <Select
                      label={t("actualCustodian")}
                      value={values.actualCustodianId || outOfScopeAsset.custodianId || ""}
                      onChange={(value) => setField("actualCustodianId", value)}
                    >
                      <OptionList emptyLabel={t("none")} options={options.employees} />
                    </Select>
                  ) : null}
                  <Select
                    label={t("actualDepartment")}
                    value={values.actualDepartmentId || outOfScopeAsset.departmentId || ""}
                    onChange={(value) => setField("actualDepartmentId", value)}
                  >
                    <OptionList emptyLabel={t("none")} options={options.departments} />
                  </Select>
                  <Select
                    label={t("actualCondition")}
                    value={values.actualConditionId || outOfScopeAsset.conditionId || ""}
                    onChange={(value) => setField("actualConditionId", value)}
                  >
                    <OptionList emptyLabel={t("none")} options={options.conditions} />
                  </Select>
                </div>
              </div>
```

Keep the existing save button and final helper paragraph in the card.

- [ ] **Step 7: Run the form test**

Run:

```powershell
node --test tests\audit-out-of-scope-actual-field.test.ts
```

Expected: lookup and form tests pass; scan route and review route tests still fail.

---

### Task 4: Create Field-Specific Findings For Out-of-Scope Actual Differences

**Files:**
- Modify: `src/app/api/audit-rounds/[id]/scan/route.ts`
- Test: `tests/audit-out-of-scope-actual-field.test.ts`

- [ ] **Step 1: Add an out-of-scope actual type**

Near `type Mismatch`, add:

```ts
type OutOfScopeActual = {
  departmentId: string | null
  locationId: string
  custodianId: string | null
  conditionId: string | null
}
```

- [ ] **Step 2: Build one actual-values object in the out-of-scope branch**

Inside `if (!item)`, after the active asset lookup succeeds and before `const scannedAt = new Date()`, add:

```ts
      const outOfScopeActual: OutOfScopeActual = {
        departmentId: input.actualDepartmentId ?? asset.departmentId,
        locationId: input.actualLocationId ?? asset.currentLocationId,
        custodianId: input.actualCustodianId ?? asset.custodianId,
        conditionId: input.actualConditionId ?? asset.conditionId,
      }
```

- [ ] **Step 3: Use `outOfScopeActual` on the created audit item**

In the `tx.auditItem.create({ data: { ... } })` block for out-of-scope assets, set:

```ts
            actualDepartmentId: outOfScopeActual.departmentId,
            actualLocationId: outOfScopeActual.locationId,
            actualCustodianId: outOfScopeActual.custodianId,
            actualConditionId: outOfScopeActual.conditionId,
```

- [ ] **Step 4: Use `outOfScopeActual` in scan history**

In the `tx.auditScanHistory.create({ data: { ... } })` block for out-of-scope assets, set:

```ts
            scanLocationId: outOfScopeActual.locationId,
            rawPayload: JSON.stringify({ ...input, actual: outOfScopeActual, outOfScope: true }),
```

- [ ] **Step 5: Use `outOfScopeActual` in the existing out-of-scope finding**

In the existing `tx.auditFinding.create({ data: { findingType: "out_of_scope", ... } })`, replace the `actualValue` object fields with:

```ts
              locationId: outOfScopeActual.locationId,
              custodianId: outOfScopeActual.custodianId,
              departmentId: outOfScopeActual.departmentId,
              conditionId: outOfScopeActual.conditionId,
```

- [ ] **Step 6: Create field-specific findings after the out-of-scope finding**

After the existing out-of-scope `tx.auditFinding.create(...)`, add:

```ts
        const fieldFindings = buildOutOfScopeFieldFindings({
          auditRoundId: id,
          auditItemId: createdItem.id,
          assetId: asset.id,
          asset,
          actual: outOfScopeActual,
          reportedBy: user.id,
          remark: input.remark,
        })

        for (const fieldFinding of fieldFindings) {
          await tx.auditFinding.create({ data: fieldFinding })
        }
```

- [ ] **Step 7: Add the field-finding helper**

Near `getMismatches`, add:

```ts
function buildOutOfScopeFieldFindings({
  auditRoundId,
  auditItemId,
  assetId,
  asset,
  actual,
  reportedBy,
  remark,
}: {
  auditRoundId: string
  auditItemId: string
  assetId: string
  asset: {
    departmentId: string | null
    ownershipType: string | null
    currentLocationId: string
    custodianId: string | null
    conditionId: string | null
  }
  actual: OutOfScopeActual
  reportedBy: string
  remark: string | null
}) {
  const findings: Array<{
    auditRoundId: string
    auditItemId: string
    assetId: string
    findingType: string
    expectedValue: string | null
    actualValue: string | null
    remark: string | null
    reportedBy: string
    reviewStatus: string
    actionTaken: string
  }> = []
  const ownershipType = normalizeAssetOwnershipType(asset.ownershipType)

  if (ownershipType !== "software_license" && actual.locationId !== asset.currentLocationId) {
    findings.push(createOutOfScopeFieldFinding({
      auditRoundId,
      auditItemId,
      assetId,
      findingType: "wrong_location",
      expectedValue: asset.currentLocationId,
      actualValue: actual.locationId,
      remark,
      reportedBy,
    }))
  }

  if (requiresCustodian(asset.ownershipType) && (actual.custodianId ?? null) !== asset.custodianId) {
    findings.push(createOutOfScopeFieldFinding({
      auditRoundId,
      auditItemId,
      assetId,
      findingType: "wrong_custodian",
      expectedValue: asset.custodianId,
      actualValue: actual.custodianId,
      remark,
      reportedBy,
    }))
  }

  if ((actual.departmentId ?? null) !== asset.departmentId) {
    findings.push(createOutOfScopeFieldFinding({
      auditRoundId,
      auditItemId,
      assetId,
      findingType: "wrong_department",
      expectedValue: asset.departmentId,
      actualValue: actual.departmentId,
      remark,
      reportedBy,
    }))
  }

  if ((actual.conditionId ?? null) !== asset.conditionId) {
    findings.push(createOutOfScopeFieldFinding({
      auditRoundId,
      auditItemId,
      assetId,
      findingType: "wrong_condition",
      expectedValue: asset.conditionId,
      actualValue: actual.conditionId,
      remark,
      reportedBy,
    }))
  }

  return findings
}

function createOutOfScopeFieldFinding({
  auditRoundId,
  auditItemId,
  assetId,
  findingType,
  expectedValue,
  actualValue,
  remark,
  reportedBy,
}: {
  auditRoundId: string
  auditItemId: string
  assetId: string
  findingType: string
  expectedValue: string | null
  actualValue: string | null
  remark: string | null
  reportedBy: string
}) {
  return {
    auditRoundId,
    auditItemId,
    assetId,
    findingType,
    expectedValue,
    actualValue,
    remark,
    reportedBy,
    reviewStatus: "pending",
    actionTaken: "out_of_scope_actual_field_reported",
  }
}
```

- [ ] **Step 8: Include field finding types in the audit log**

Before the out-of-scope transaction returns, capture field finding types in a local variable:

```ts
      let fieldFindingTypes: string[] = []
```

Inside the transaction after `const fieldFindings = buildOutOfScopeFieldFindings(...)`, set:

```ts
        fieldFindingTypes = fieldFindings.map((finding) => finding.findingType)
```

In the `logAudit({ action: "scan_out_of_scope", ... })` call, update `newValue`:

```ts
        newValue: { auditRoundId: id, assetId: asset.id, auditResult: "out_of_scope", fieldFindingTypes },
```

- [ ] **Step 9: Run the scan route test**

Run:

```powershell
node --test tests\audit-out-of-scope-actual-field.test.ts
```

Expected: lookup, form, and scan route tests pass; review route test still fails.

---

### Task 5: Confirm Out-of-Scope Findings Without Master Update

**Files:**
- Modify: `src/app/api/audit-findings/[id]/review/route.ts`
- Test: `tests/audit-out-of-scope-actual-field.test.ts`

- [ ] **Step 1: Add out-of-scope approval branch**

Inside the `if (input.action === "approve") { ... }` transaction branch, before the existing `if (finding.findingType === "not_found")`, add:

```ts
        if (finding.findingType === "out_of_scope") {
          const reviewed = await tx.auditFinding.update({
            where: { id },
            data: {
              reviewStatus: "approved",
              reviewedBy: user.id,
              reviewedAt: new Date(),
              reviewRemark: input.reviewRemark,
              actionTaken: "out_of_scope_confirmed_no_master_update",
            },
          })
          await updateAuditItemReviewState(tx, finding.auditItemId)
          return reviewed
        }
```

- [ ] **Step 2: Run the regression test**

Run:

```powershell
node --test tests\audit-out-of-scope-actual-field.test.ts
```

Expected: all tests in `audit-out-of-scope-actual-field.test.ts` pass.

---

### Task 6: Clarify User-Facing Copy

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`

- [ ] **Step 1: Update Thai out-of-scope helper copy**

In `messages/th.json`, change `auditScan.outOfScopeHelp` to:

```json
"outOfScopeHelp": "บันทึกค่าที่พบจริงเพื่อสร้าง Finding รอ Review ระบบจะไม่แก้ข้อมูลหลักของทรัพย์สินจนกว่าผู้มีสิทธิ์จะอนุมัติรายการไม่ตรง"
```

- [ ] **Step 2: Update English out-of-scope helper copy**

In `messages/en.json`, change `auditScan.outOfScopeHelp` to:

```json
"outOfScopeHelp": "Record the actual values found on site to create findings for review. Master asset data is not changed until an authorized reviewer approves the mismatched fields."
```

- [ ] **Step 3: Run message-adjacent tests**

Run:

```powershell
node --test tests\audit-scan-field-mode-ux.test.ts tests\audit-scan-result-semantics.test.ts
```

Expected: all tests pass.

---

### Task 7: Update Handoff And Product Docs

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/07_UAT_CHECKLIST.md`
- Modify: `docs/11_FEATURE_LIST.md`
- Modify: `docs/99_CHANGELOG.md`

- [ ] **Step 1: Update `DEVELOPER_HANDOFF.md`**

Add one sentence to the existing audit scan out-of-scope note:

```md
Out-of-scope scan save can now capture actual location, custodian, department, and condition immediately; changed actual fields create reviewable field-specific findings, and master asset data still changes only through approved finding review.
```

- [ ] **Step 2: Update `docs/06_WORKFLOWS.md`**

In the Audit Counting section, add:

```md
- Out-of-scope scan save can record actual field values found on site. If those values differ from the current master asset record, the save creates field-specific findings for review; approving those findings is what updates the master asset and movement log.
```

- [ ] **Step 3: Update `docs/07_UAT_CHECKLIST.md`**

Add these UAT items under Audit Counting:

```md
- [ ] Scan an asset outside the audit round, change its actual location or custodian, attach evidence, and confirm the save creates an out-of-scope record plus reviewable field mismatch findings.
- [ ] Confirm the asset master data does not change immediately after the out-of-scope scan save.
- [ ] Approve the field mismatch finding as an audit reviewer and confirm the master asset data and movement log update only after approval.
```

- [ ] **Step 4: Update `docs/11_FEATURE_LIST.md`**

Add this feature row near Audit scan lookup:

```md
| Out-of-scope actual fields | Field auditors can record actual location, custodian, department, and condition for out-of-scope assets; changed values become reviewable field findings before master data updates |
```

- [ ] **Step 5: Update `docs/99_CHANGELOG.md`**

Append the next numbered item after the current final entry:

```md
194. Audit out-of-scope actual field capture with prefilled master values, evidence-required changed fields, structured field-specific findings for wrong location/custodian/department/condition, review-confirmed out-of-scope findings without direct master updates, and regression coverage preserving review-controlled master asset changes
```

- [ ] **Step 6: Run docs/source checks**

Run:

```powershell
git diff --check
```

Expected: no whitespace errors.

---

### Task 8: Full Verification And Commit

**Files:**
- All files modified in Tasks 1-7

- [ ] **Step 1: Run focused tests**

Run:

```powershell
node --test tests\audit-out-of-scope-actual-field.test.ts tests\audit-scan-lookup.test.ts tests\audit-scan-field-mode-ux.test.ts tests\audit-scan-result-semantics.test.ts tests\audit-finding-resolution.test.ts tests\rbac-route-matrix.test.ts
```

Expected: all focused tests pass. If sandbox blocks Node child process with `spawn EPERM`, rerun with approval outside the sandbox.

- [ ] **Step 2: Run full test suite**

Run:

```powershell
npm run test
```

Expected: all Node tests pass.

- [ ] **Step 3: Run full verification**

Run:

```powershell
npm run verify
```

Expected: lint, tests, Prisma generate, and Next production build complete successfully. Existing warnings from `.agents/.gemini` impeccable files may remain as warnings, but there must be no errors.

- [ ] **Step 4: Check staged files before commit**

Run:

```powershell
git status --short
git diff --stat
git diff --check
```

Expected: changes are limited to the files listed in this plan plus this plan file if it is still uncommitted; no whitespace errors.

- [ ] **Step 5: Commit implementation**

Stage only the implementation and documentation files:

```powershell
git add -- tests/audit-out-of-scope-actual-field.test.ts src/app/api/audit-rounds/[id]/scan-lookup/route.ts src/components/audit/audit-scan-form.tsx src/app/api/audit-rounds/[id]/scan/route.ts src/app/api/audit-findings/[id]/review/route.ts messages/th.json messages/en.json DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/99_CHANGELOG.md docs/superpowers/plans/2026-06-17-audit-out-of-scope-actual-field.md
git commit -m "Add audit out-of-scope actual field capture"
```

Expected: commit succeeds and does not include unrelated `.agents`, `.gemini`, `.codex`, `.impeccable`, or `.superpowers` files.

---

## Self-Review Notes

- Spec coverage: The plan covers lookup payload, UI capture, evidence requirement, scan persistence, field findings, review-controlled master update, tests, docs, and verification.
- Scope boundary: No new database table, no new approval module, and no direct master update from scan save.
- Type consistency: The plan uses existing field names from `auditScanSchema`, `AuditItem`, and `Asset`: `actualLocationId`, `actualCustodianId`, `actualDepartmentId`, `actualConditionId`, `currentLocationId`, `custodianId`, `departmentId`, and `conditionId`.
