# Server-Side Asset Search on the Transaction Pages — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The four transaction pages (ส่งมอบ, รับคืน, โอนย้าย, ย้ายที่ตั้งหลายรายการ) stop loading the asset register; one server search with the asset page's rules answers a shared picker (type part of a code, pick one at a time; what cannot be taken is listed with its reason), and the save routes refuse at least what the picker refuses.

**Architecture:** Pure verdict functions decide, per transaction, whether an asset can be taken and why not (Task 1); `getAssetActions`, the save routes (Task 2) and the search (Task 3) all call them. A bounded search API (≤20 rows + a total) answers a shared async picker (Task 4) that the four forms use (Tasks 5-7). No schema change, no migration.

**Tech Stack:** Next.js 16.4 App Router (read `node_modules/next/dist/docs/` before Next code), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, Tailwind 4 tokens, shadcn/Radix/cmdk parts, `node --test`, Playwright E2E (4 projects; the phone on WebKit).

**Spec:** `docs/superpowers/specs/2026-10-28-server-asset-search-design.md` (approved 2026-10-28, with the user's choice ก: the picker follows the asset page's rules and the routes match them).

**Base:** master `752b1646`. **Branch:** `feat/server-asset-search`. **Dry run:** none (no migration, no data change; the transactions E2E and the whole suite cover it).

**Execution:** subagent-driven. Implementers are the `opus-medium-implementer` agent type; the main session reviews each task itself. Tasks run in order 1 → 8; line numbers are master's, and a task names each block by content where an earlier task moved it.

**Production (SELECT only, 2026-10-28):** 1,781 active assets (บุคคล 659, ส่วนกลาง 661, Stock 180, License 216, ส่วนควบ 65); open handovers: บุคคล 5, Stock 1, none with an open repair → the route rules of Task 2 catch no existing handover. Held without a handover: บุคคล 507, ส่วนควบ 17, License 18 (these 35 become "not takeable" on รับคืน, with their reason).

**E2E (the user's cadence):** after Task 8 the targeted set `e2e/transactions e2e/smoke e2e/cross-cutting/field-errors.spec.ts e2e/asset-detail e2e/cross-cutting/roles.spec.ts` from a clean build, then the WHOLE suite once.

## Global Constraints

- Words follow `docs/19_THAI_GLOSSARY.md`. Messages change only through `node scripts/messages-edit.mjs <change file>`, th and en together; change files live in the session scratchpad. No raw code reaches the screen.
- Shared parts and tokens only (DESIGN.md): no hex or rgba in tsx, no `dark:`, no `/NN` tints; both themes. A new shared part gets its DESIGN.md section, its docs/14 row and its place in the shared-name guards.
- **One rule, one function:** the picker's verdicts = `getAssetActions`' answers = what every save route refuses at least, for the asset the route acts on (spec §5, 6.5). Task 1's functions are the only place a transaction rule lives. The ทรัพย์สินอื่น destination (`checkoutParent`) has no action in `getAssetActions`; the checkout route refuses what its verdict refuses (S-R39). One named exception, the user's choice: a บุคคล asset on โอนย้าย with no custodian chosen follows the move rule while the asset page's โอนย้าย reads the custodian rule (S-R40).
- Permissions: the four pages and the search API need `asset:edit`; the viewer gets neither.
- Bounded reads: an answer is ≤20 rows and one total; no list on these pages grows with the register; id lists stay far below SQL Server's ~2,100 parameters.
- V-form rules: errors under the field, focus to the first error, toasts only for what has no field.
- No schema change and no migration. Pure rules files use relative `.ts` imports and `import type` only. Production is read only.
- Every task runs `npm test`, `npx tsc --noEmit` and `npm run lint` (0 errors) before its commit. A pin that fails outside the task's list is rewritten in the same commit and named in the report.
- Secrets: never read or print `.env`, `.env.prod-admin` or `.env.e2e`. E2E runs on the dev DB only and never runs LDAP sync, the settings save, Excel import, a failed login or a delete; it adds no data beyond what the transaction specs create today.
- Commit trailer: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **The picker and the save disagree** (an asset the list offers is refused on save, or the asset page and the picker give one asset different answers): Task 1's agreement test pins `getAssetActions` = verdicts (one exception, S-R40: a บุคคล asset on โอนย้าย with no custodian chosen follows the move rule); Task 2's route tests pin each refusal of spec 6.5, the ทรัพย์สินอื่น destination included (S-R39); Task 8's E2E saves what it picked.
2. **A held computer's components flood รับคืน** (17 on Production): ส่วนควบ rows are listed with "ส่วนควบรับคืนพร้อมเครื่องหลัก" and cannot be picked; returning the computer brings them back. Tasks 1, 3 and 6 pin it.
3. **An old answer overwrites a new one** (typing fast on a slow VPN, or the answer of "02" arriving after "0228"): the picker drops stale answers; Task 4's tests pin it.
4. **Arriving from the asset page** (`?assetId=`, `?checkoutId=`) with an asset that can or cannot be taken: chosen, or chosen-but-blocked with the reason under the field — never silently empty. Tasks 5-6 pin it; Task 8's arrivals read it.
5. **The search fails or finds nothing** (VPN drop, a typo): "ค้นหาไม่สำเร็จ ลองอีกครั้ง" with a retry is distinct from "ไม่พบทรัพย์สินที่ตรงกับคำค้น", and neither loses what was already picked on bulk-move. Task 4 pins it.

---

### Task 1: The eligibility verdicts, read by the asset page, and the new reason words

One pure module answers "can this transaction take this asset, and if not, why" (spec 6.3, S-R1, S-R2). `getAssetActions` reads it for its checkout, checkin and transfer actions, so the asset page and the pickers cannot drift. Task 2's routes ask its ownership rule, and Task 3's search asks its verdicts.

**Files:**
- Create: `src/lib/asset-operation-eligibility.ts`
- Modify: `src/lib/asset-actions.ts:1-10` (imports) and `:104-136` (the `checkout`, `checkin` and `transfer` cases of `buildTableAction`)
- Modify: `messages/th.json` and `messages/en.json`, through `node scripts/messages-edit.mjs` only
- Create: `tests/asset-operation-eligibility.test.ts`
- Modify: `tests/asset-actions.test.ts` (add one test after `:125`)
- Modify: `tests/asset-register-transactions.test.ts:76-77` (this pin breaks; it is rewritten in Step 6)

**Interfaces:**
- Consumes:
  - `getAssetLifecycleTransitionError(op, statusName)` (`src/lib/asset-lifecycle-policy.ts:83`)
  - `getCheckinHandoverStatusError(mode, statusName): "ASSET_HANDOVER_MODE_MISSING" | "ASSET_HANDOVER_STATUS_MISMATCH" | null` (`:112`)
  - `isLegacyReturnEligible({ statusName, custodianId, hasOpenCheckout, hasActiveMaintenance })` (`:165`)
  - `type AssetOwnershipType` (`src/lib/asset-ownership.ts:5`; `AssetOwnershipKind` in `asset-actions.ts:16` is the same type)
  - `buildAssetRegisterTransactionHref(locale, assetId, action, returnTo, checkoutId?: string | null)` (`src/lib/asset-operation-policy.ts:24-30`)
- Produces (`src/lib/asset-operation-eligibility.ts`, pure, relative `.ts` imports):
  ```ts
  export const assetOperationModes = ["checkout", "checkoutParent", "checkin", "transfer", "bulkMove"] as const
  export type AssetOperationMode = (typeof assetOperationModes)[number]
  export type AssetOperationFacts = {
    statusName: string; ownership: AssetOwnershipType; custodianId: string | null
    openCheckout: { id: string; handoverMode: string | null } | null; hasOpenRepair: boolean
  }
  export type AssetOperationVerdict = { eligible: true; reasonKey: null } | { eligible: false; reasonKey: string } // full message keys
  export type AssetCheckinPath = "handover" | "legacy" | null
  export type AssetCheckinVerdict = AssetOperationVerdict & { path: AssetCheckinPath }
  export type AssetOperationOwnershipOperation = "checkout" | "legacyCheckin" | "move"
  export type AssetOperationOwnershipRefusalCode =
    | "ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED" | "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED"
    | "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED" | "ASSET_LICENSE_CHECKIN_NOT_ALLOWED" | "ASSET_LICENSE_MOVE_NOT_ALLOWED"
  export type AssetOperationRefusalCode = AssetOperationOwnershipRefusalCode | "ASSET_CHECKIN_REPAIR_OPEN"
  export const assetOperationRefusalReasonKeys: Readonly<Record<AssetOperationRefusalCode, string>> // values pinned in the test
  export function getAssetOperationOwnershipRefusal(operation: AssetOperationOwnershipOperation, ownership: string | null | undefined): AssetOperationOwnershipRefusalCode | null
  export function getCheckoutVerdict(facts: AssetOperationFacts): AssetOperationVerdict
  export function getCheckoutParentVerdict(facts: AssetOperationFacts, context: { handedOverAssetId: string | null; assetId: string }): AssetOperationVerdict
  export function getCheckinVerdict(facts: AssetOperationFacts): AssetCheckinVerdict
  export function getTransferVerdict(facts: AssetOperationFacts, context: { assignCustodian: boolean }): AssetOperationVerdict
  export function getBulkMoveVerdict(facts: AssetOperationFacts): AssetOperationVerdict
  ```
  Each verdict returns the first rule that fails, in this order. All reason keys are `asset.transactionReason*`, written short below:

  | Verdict | Order (first failing rule → reason) |
  |---|---|
  | checkout | ownership (`checkout`) → its code's key · not Ready → `StatusNotReady` · open handover → `OpenCheckoutHandover` |
  | checkoutParent | `assetId === handedOverAssetId` → `SameAsset` · then exactly the checkout verdict |
  | checkin, open handover (`path: "handover"`, any ownership, S-R2) | open repair → `ActiveMaintenance` · `getCheckinHandoverStatusError` MODE_MISSING → `HandoverModeMissing` · STATUS_MISMATCH → `HandoverStatusMismatch` |
  | checkin, none (`path`: `"legacy"` if `custodianId`, else `null`) | ownership (`legacyCheckin`) → its key · open repair → `ActiveMaintenance` · no custodian → `NoReturnRecord` · not Ready/In Use → `StatusNotReturnable` |
  | transfer | ownership (`move`) → `LicenseMove` · `assign_custodian`/`move_scope` refused → `StatusNotTransferable`/`WrittenOff` · open handover → `OpenCheckout` |
  | bulkMove | ownership (`move`) → `LicenseMove` · open handover → `OpenCheckout` · `move_scope` refused → `WrittenOff` |

  Ownership refusals: `checkout` has component → `ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED` and software_license → `ASSET_LICENSE_CHECKOUT_NOT_ALLOWED`. `legacyCheckin` has component → `…COMPONENT_CHECKIN…` and software_license → `…LICENSE_CHECKIN…`. `move` has software_license → `ASSET_LICENSE_MOVE_NOT_ALLOWED`. Any other value, including null and unknown, gets null. A verdict reads a code's words through `assetOperationRefusalReasonKeys`, so each code→word pair is defined only there. The checkin repair reason is `assetOperationRefusalReasonKeys.ASSET_CHECKIN_REPAIR_OPEN`.

- [ ] **Step 1: Write the failing tests.** Create `tests/asset-operation-eligibility.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

import { getAssetActions, type AssetActionInput } from "../src/lib/asset-actions.ts"
import {
  assetOperationModes, assetOperationRefusalReasonKeys, getAssetOperationOwnershipRefusal, getBulkMoveVerdict,
  getCheckinVerdict, getCheckoutParentVerdict, getCheckoutVerdict, getTransferVerdict, type AssetOperationFacts,
} from "../src/lib/asset-operation-eligibility.ts"

const facts = (overrides: Partial<AssetOperationFacts>): AssetOperationFacts => ({
  statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false, ...overrides,
})
const handover = (handoverMode: string | null) => ({ id: "co-1", handoverMode })
const yes = { eligible: true, reasonKey: null }
const no = (reasonKey: string) => ({ eligible: false, reasonKey })
const owners = ["personal", "shared", "stock", "component", "software_license"] as const
// Every status the seed holds (prisma/seed.ts:17-30), as tests/asset-actions.test.ts:36.
const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Pending Repair", "Under Inspection", "Lost", "Missing", "Under Maintenance", "Pending Disposal", "Disposed", "Retired"]
const handovers = [null, handover(null), handover("temporary_loan"), handover("permanent_assignment")]
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))

test("the modes are the four pages' pickers plus the handover-into-an-asset destination", () => {
  assert.deepEqual([...assetOperationModes], ["checkout", "checkoutParent", "checkin", "transfer", "bulkMove"])
})

test("ownership comes first: what a ส่วนควบ and a License never take, as the codes the routes answer", () => {
  assert.deepEqual(
    [...owners, null, "unknown"].map((ownership) => (["checkout", "legacyCheckin", "move"] as const).map((op) => getAssetOperationOwnershipRefusal(op, ownership))),
    [[null, null, null], [null, null, null], [null, null, null],
      ["ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED", "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED", null],
      ["ASSET_LICENSE_CHECKOUT_NOT_ALLOWED", "ASSET_LICENSE_CHECKIN_NOT_ALLOWED", "ASSET_LICENSE_MOVE_NOT_ALLOWED"],
      [null, null, null], [null, null, null]],
  )
  assert.deepEqual(assetOperationRefusalReasonKeys, {
    ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED: "asset.transactionReasonComponentCheckout",
    ASSET_LICENSE_CHECKOUT_NOT_ALLOWED: "asset.transactionReasonLicenseCheckout",
    ASSET_COMPONENT_CHECKIN_NOT_ALLOWED: "asset.transactionReasonComponentCheckin",
    ASSET_LICENSE_CHECKIN_NOT_ALLOWED: "asset.transactionReasonLicenseCheckin",
    ASSET_LICENSE_MOVE_NOT_ALLOWED: "asset.transactionReasonLicenseMove",
    ASSET_CHECKIN_REPAIR_OPEN: "asset.transactionReasonActiveMaintenance",
  })
})

test("ส่งมอบ takes a บุคคล, ส่วนกลาง or Stock asset that is Ready with no open handover (spec 6.3)", () => {
  for (const ownership of ["personal", "shared", "stock"] as const) assert.deepEqual(getCheckoutVerdict(facts({ ownership })), yes, ownership)
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "component" })), no("asset.transactionReasonComponentCheckout"))
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "software_license" })), no("asset.transactionReasonLicenseCheckout"))
  assert.deepEqual(getCheckoutVerdict(facts({ ownership: "component", statusName: "In Use" })), no("asset.transactionReasonComponentCheckout"), "ownership first")
  assert.deepEqual(getCheckoutVerdict(facts({ statusName: "In Use" })), no("asset.transactionReasonStatusNotReady"))
  assert.deepEqual(getCheckoutVerdict(facts({ openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckoutHandover"))
  assert.deepEqual(getCheckoutVerdict(facts({ statusName: "Checked Out", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonStatusNotReady"), "the route's order")
  assert.deepEqual(getCheckoutVerdict(facts({ hasOpenRepair: true })), yes, "an open repair is not the checkout route's rule")
})

test("ทรัพย์สินอื่น as the destination: what ส่งมอบ could take, never the asset being handed over", () => {
  assert.deepEqual(getCheckoutParentVerdict(facts({}), { handedOverAssetId: "a-1", assetId: "a-2" }), yes)
  assert.deepEqual(getCheckoutParentVerdict(facts({}), { handedOverAssetId: null, assetId: "a-2" }), yes)
  assert.deepEqual(getCheckoutParentVerdict(facts({}), { handedOverAssetId: "a-1", assetId: "a-1" }), no("asset.transactionReasonSameAsset"))
  assert.deepEqual(getCheckoutParentVerdict(facts({ statusName: "In Use" }), { handedOverAssetId: "a-1", assetId: "a-2" }), no("asset.transactionReasonStatusNotReady"))
  assert.deepEqual(getCheckoutParentVerdict(facts({ ownership: "component" }), { handedOverAssetId: "a-1", assetId: "a-2" }), no("asset.transactionReasonComponentCheckout"))
})

test("รับคืน: an open handover of any ownership is returnable when its custody type is set, the status fits and no repair is open (spec 6.3, S-R2)", () => {
  const back = (overrides: Partial<AssetOperationFacts>) => getCheckinVerdict(facts(overrides))
  for (const ownership of owners) {
    assert.deepEqual(back({ ownership, statusName: "Checked Out", custodianId: "e-1", openCheckout: handover("temporary_loan") }), { ...yes, path: "handover" }, ownership)
    assert.deepEqual(back({ ownership, statusName: "In Use", custodianId: "e-1", openCheckout: handover("permanent_assignment") }), { ...yes, path: "handover" }, ownership)
  }
  assert.deepEqual(back({ statusName: "Pending Repair", openCheckout: handover("temporary_loan"), hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path: "handover" }, "the repair first")
  for (const mode of [null, "bogus"]) assert.deepEqual(back({ statusName: "In Use", openCheckout: handover(mode) }), { ...no("asset.transactionReasonHandoverModeMissing"), path: "handover" }, String(mode))
  assert.deepEqual(back({ statusName: "In Use", openCheckout: handover("temporary_loan") }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" })
  assert.deepEqual(back({ statusName: "Checked Out", openCheckout: handover("permanent_assignment") }), { ...no("asset.transactionReasonHandoverStatusMismatch"), path: "handover" })
})

test("รับคืน without a handover: the legacy rule for a held บุคคล, ส่วนกลาง or Stock asset; ส่วนควบ and License say why; nothing to return has no path (spec 6.3)", () => {
  const back = (overrides: Partial<AssetOperationFacts>) => getCheckinVerdict(facts(overrides))
  for (const ownership of ["personal", "shared", "stock"] as const) {
    for (const statusName of ["Ready", "In Use"]) assert.deepEqual(back({ ownership, statusName, custodianId: "e-1" }), { ...yes, path: "legacy" }, `${ownership} ${statusName}`)
  }
  assert.deepEqual(back({ ownership: "component", statusName: "In Use", custodianId: "e-1" }), { ...no("asset.transactionReasonComponentCheckin"), path: "legacy" })
  assert.deepEqual(back({ ownership: "software_license", statusName: "In Use", custodianId: "e-1" }), { ...no("asset.transactionReasonLicenseCheckin"), path: "legacy" })
  assert.deepEqual(back({ ownership: "component", custodianId: "e-1", hasOpenRepair: true }), { ...no("asset.transactionReasonComponentCheckin"), path: "legacy" }, "ownership first")
  assert.deepEqual(back({ ownership: "component" }), { ...no("asset.transactionReasonComponentCheckin"), path: null })
  assert.deepEqual(back({ statusName: "In Use", custodianId: "e-1", hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path: "legacy" })
  assert.deepEqual(back({ statusName: "Pending Repair", hasOpenRepair: true }), { ...no("asset.transactionReasonActiveMaintenance"), path: null }, "the asset page's order: repair before holder")
  for (const ownership of ["shared", "stock"] as const) assert.deepEqual(back({ ownership }), { ...no("asset.transactionReasonNoReturnRecord"), path: null }, ownership)
  assert.deepEqual(back({ statusName: "Lost", custodianId: "e-1" }), { ...no("asset.transactionReasonStatusNotReturnable"), path: "legacy" })
})

test("โอนย้าย: no custodian is a move (not Disposed/Retired), a custodian needs Ready or In Use, then the open handover; a License never moves (spec 6.3)", () => {
  const move = { assignCustodian: false }
  const assign = { assignCustodian: true }
  for (const ownership of ["personal", "shared", "stock", "component"] as const) {
    for (const statusName of ["Ready", "In Use", "Pending Repair", "Under Maintenance", "Lost"]) assert.deepEqual(getTransferVerdict(facts({ ownership, statusName }), move), yes, `${ownership} ${statusName}`)
    for (const statusName of ["Disposed", "Retired"]) assert.deepEqual(getTransferVerdict(facts({ ownership, statusName }), move), no("asset.transactionReasonWrittenOff"), `${ownership} ${statusName}`)
  }
  assert.deepEqual(getTransferVerdict(facts({ ownership: "software_license", statusName: "Disposed" }), move), no("asset.transactionReasonLicenseMove"), "ownership first")
  assert.deepEqual(getTransferVerdict(facts({ openCheckout: handover("temporary_loan") }), move), no("asset.transactionReasonOpenCheckout"))
  for (const statusName of ["Ready", "In Use"]) assert.deepEqual(getTransferVerdict(facts({ statusName }), assign), yes, statusName)
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Pending Repair" }), assign), no("asset.transactionReasonStatusNotTransferable"))
  assert.deepEqual(getTransferVerdict(facts({ statusName: "In Use", openCheckout: handover("permanent_assignment") }), assign), no("asset.transactionReasonOpenCheckout"))
  assert.deepEqual(getTransferVerdict(facts({ statusName: "Checked Out", openCheckout: handover("temporary_loan") }), assign), no("asset.transactionReasonStatusNotTransferable"), "the route's order")
})

test("ย้ายที่ตั้งหลายรายการ: not a License, no open handover, not Disposed/Retired, in the route's order (spec 6.3)", () => {
  for (const ownership of ["personal", "shared", "stock", "component"] as const) {
    for (const statusName of ["Ready", "In Use", "Pending Repair", "Lost"]) assert.deepEqual(getBulkMoveVerdict(facts({ ownership, statusName })), yes, `${ownership} ${statusName}`)
  }
  for (const statusName of ["Disposed", "Retired"]) assert.deepEqual(getBulkMoveVerdict(facts({ statusName })), no("asset.transactionReasonWrittenOff"), statusName)
  assert.deepEqual(getBulkMoveVerdict(facts({ openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckout"))
  assert.deepEqual(getBulkMoveVerdict(facts({ ownership: "software_license", statusName: "Disposed", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonLicenseMove"))
  assert.deepEqual(getBulkMoveVerdict(facts({ statusName: "Disposed", openCheckout: handover("temporary_loan") })), no("asset.transactionReasonOpenCheckout"), "the open handover before the status, as the route")
})

test("the asset page and the picker give one asset the same answer (spec §5, §8)", () => {
  const base: AssetActionInput = {
    locale: "th", assetId: "a-1", statusName: "Ready", ownership: "personal", custodianId: null, openCheckoutId: null,
    openCheckoutHandoverMode: null, openRepairId: null, openDisposalId: null, returnTo: "/th/assets",
    can: { assetEdit: true, maintenanceCreate: true, maintenanceView: true, disposalView: true },
  }
  for (const ownership of owners) for (const statusName of statuses) for (const openCheckout of handovers) for (const hasOpenRepair of [false, true]) for (const custodianId of [null, "e-1"]) {
    const set = getAssetActions({ ...base, ownership, statusName, custodianId, openCheckoutId: openCheckout?.id ?? null, openCheckoutHandoverMode: openCheckout?.handoverMode ?? null, openRepairId: hasOpenRepair ? "r-1" : null })
    const list = [...(set.primary ? [set.primary] : []), ...set.transactions]
    const f: AssetOperationFacts = { statusName, ownership, custodianId, openCheckout, hasOpenRepair }
    const verdicts = { checkout: getCheckoutVerdict(f), checkin: getCheckinVerdict(f), transfer: getTransferVerdict(f, { assignCustodian: ownership === "personal" }) }
    const where = `${ownership} ${statusName} ${openCheckout?.handoverMode} ${hasOpenRepair} ${custodianId}`
    for (const key of ["checkout", "checkin", "transfer"] as const) {
      const action = list.find((item) => item.key === key)
      if (!action) continue // the ownership type has no such action on the asset page (ส่วนควบ: transfer only; License: none)
      assert.deepEqual([action.enabled, action.reasonKey], [verdicts[key].eligible, verdicts[key].reasonKey], `${where} ${key}`)
    }
    const checkin = list.find((item) => item.key === "checkin")
    if (checkin?.enabled) assert.equal(checkin.href?.includes("checkoutId=co-1"), verdicts.checkin.path === "handover", where)
  }
  // S-R40: one function, two contexts. The asset page's โอนย้าย for บุคคล is an assign; the transfer page with no custodian is a move.
  const inspected = facts({ ownership: "personal", statusName: "Under Inspection" })
  assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: true }), no("asset.transactionReasonStatusNotTransferable"))
  assert.deepEqual(getTransferVerdict(inspected, { assignCustodian: false }), yes)
})

test("the new words are the spec's, the custody-type words are the return form's, and every reason exists in Thai and English (spec 6.3)", () => {
  const th = messages("th"), en = messages("en")
  assert.deepEqual(["ComponentCheckout", "ComponentCheckin", "LicenseCheckout", "LicenseCheckin", "LicenseMove", "SameAsset"].map((name) => th.asset[`transactionReason${name}`]), [
    "ส่วนควบไปพร้อมเครื่องหลัก ส่งมอบแยกไม่ได้", "ส่วนควบรับคืนพร้อมเครื่องหลัก", "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ส่งมอบไม่ได้",
    "License ผูกสิทธิ์ที่หน้าทรัพย์สิน รับคืนไม่ได้", "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้", "เป็นทรัพย์สินที่กำลังส่งมอบ เลือกเป็นปลายทางไม่ได้",
  ])
  for (const table of [th, en]) {
    assert.equal(table.asset.transactionReasonHandoverModeMissing, table.checkin.handoverModeMissing)
    assert.equal(table.asset.transactionReasonHandoverStatusMismatch, table.checkin.handoverStatusMismatch)
  }
  const keys = new Set<string>()
  for (const ownership of owners) for (const statusName of statuses) for (const openCheckout of handovers) for (const hasOpenRepair of [false, true]) for (const custodianId of [null, "e-1"]) {
    const f = facts({ ownership, statusName, openCheckout, hasOpenRepair, custodianId })
    for (const verdict of [getCheckoutVerdict(f), getCheckoutParentVerdict(f, { handedOverAssetId: "a-1", assetId: "a-1" }), getCheckinVerdict(f), getTransferVerdict(f, { assignCustodian: true }), getTransferVerdict(f, { assignCustodian: false }), getBulkMoveVerdict(f)]) {
      if (verdict.reasonKey) keys.add(verdict.reasonKey)
    }
  }
  assert.deepEqual([...keys].sort(), ["ActiveMaintenance", "ComponentCheckin", "ComponentCheckout", "HandoverModeMissing", "HandoverStatusMismatch", "LicenseCheckin", "LicenseCheckout", "LicenseMove", "NoReturnRecord", "OpenCheckout", "OpenCheckoutHandover", "SameAsset", "StatusNotReady", "StatusNotReturnable", "StatusNotTransferable", "WrittenOff"].map((name) => `asset.transactionReason${name}`))
  for (const key of keys) for (const table of [th, en]) assert.equal(typeof table.asset[key.slice("asset.".length)], "string", key)
})

test("the verdicts stay pure: relative .ts imports, no database", () => {
  const source = readFileSync("src/lib/asset-operation-eligibility.ts", "utf8")
  assert.doesNotMatch(source, /from "@\/|from "@prisma\/client"|\bprisma\./)
  for (const [, path] of source.matchAll(/from "([^"]+)"/g)) assert.match(path, /^\.\/[\w-]+\.ts$/, path)
})
```

Add a test after `tests/asset-actions.test.ts:125`. It is the only answer of `getAssetActions` that changes: the `enabled` values do not change, and the reason changes only for an open handover that does not fit, with no repair open.

```ts
test("an open handover the return cannot take says why in the picker's words (server-search spec §5, 6.3)", () => {
  const checkin = (overrides: Partial<AssetActionInput>) => brief(all(overrides).find((action) => action.key === "checkin"))
  assert.deepEqual(checkin({ statusName: "In Use", custodianId: "e-1", openCheckoutId: "co-1", openCheckoutHandoverMode: null }), ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonHandoverModeMissing"])
  assert.deepEqual(checkin({ statusName: "Pending Repair", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan" }), ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonHandoverStatusMismatch"])
  // An open repair still comes first (as :98).
  assert.deepEqual(checkin({ statusName: "Pending Repair", openCheckoutId: "co-1", openCheckoutHandoverMode: "temporary_loan", openRepairId: "r-1" }), ["checkin", "asset.rowActionCheckin", false, "asset.transactionReasonActiveMaintenance"])
})
```

- [ ] **Step 2: Run the tests and see them fail.** Run `node --test tests/asset-operation-eligibility.test.ts`. Expected: `ERR_MODULE_NOT_FOUND`, because `src/lib/asset-operation-eligibility.ts` does not exist. Then run `node --test tests/asset-actions.test.ts`. Expected: the new test fails with `asset.transactionReasonStatusNotReturnable` !== `asset.transactionReasonHandoverModeMissing`.

- [ ] **Step 3: Create the module.** Create `src/lib/asset-operation-eligibility.ts` with the exports and the order table above. It has a header comment: the one rule for "can this transaction take this asset" (server-search spec 6.3, choice ก), read by `getAssetActions`, the transaction search and the save routes. It imports values from `./asset-lifecycle-policy.ts` and only types from `./asset-ownership.ts`. The checkin legacy path calls `isLegacyReturnEligible({ …, hasOpenCheckout: false, hasActiveMaintenance: false })` only after the repair and holder checks have passed, so that call only checks the status. Write every reason key as a full double-quoted string literal, as `src/lib/asset-actions.ts:111-134` does on master (for example `"asset.transactionReasonOpenCheckout"`). Never build a key from the table's short names (no `` `asset.transactionReason${name}` ``, no backtick literals): the pin that Step 6 points at this file, `tests/asset-register-transactions.test.ts:77`, matches the source text `/"asset\.transactionReasonOpenCheckout"/`.

- [ ] **Step 4: Make the asset page read the verdicts.** In `src/lib/asset-actions.ts`:
  - Imports (`:1-6`): remove `getAssetLifecycleTransitionError`, `getCheckinHandoverStatusError` and `isLegacyReturnEligible`. Keep `normalizeAssetStateName`. Add `import { getCheckinVerdict, getCheckoutVerdict, getTransferVerdict, type AssetOperationFacts, type AssetOperationVerdict } from "./asset-operation-eligibility.ts"`.
  - Replace `:104-136`, from the comment above `buildTableAction` through the end of the `transfer` case, with this code:

```ts
function factsOf(input: AssetActionInput): AssetOperationFacts {
  return {
    statusName: input.statusName,
    ownership: input.ownership,
    custodianId: input.custodianId,
    openCheckout: input.openCheckoutId ? { id: input.openCheckoutId, handoverMode: input.openCheckoutHandoverMode } : null,
    hasOpenRepair: Boolean(input.openRepairId),
  }
}

function fromVerdict(key: AssetActionKey, labelKey: string, verdict: AssetOperationVerdict, href: () => string): AssetAction {
  return verdict.eligible ? available(key, labelKey, href()) : unavailable(key, labelKey, verdict.reasonKey)
}

// The transaction pages' verdicts (asset-operation-eligibility.ts): one rule for this page, the pickers and the save routes.
function buildTableAction(input: AssetActionInput, key: AssetActionKey, labelKey: string): AssetAction {
  const { locale, assetId, ownership, openCheckoutId, returnTo } = input
  const facts = factsOf(input)

  switch (key) {
    case "checkout":
      return fromVerdict(key, labelKey, getCheckoutVerdict(facts), () => buildAssetRegisterTransactionHref(locale, assetId, "checkout", returnTo))

    // A return opens the open handover itself; a legacy return opens the asset.
    case "checkin": {
      const verdict = getCheckinVerdict(facts)
      return fromVerdict(key, labelKey, verdict, () => buildAssetRegisterTransactionHref(locale, assetId, "checkin", returnTo, verdict.path === "handover" ? openCheckoutId : null))
    }

    // A custodian (personal) is assign_custodian, a move without one is move_scope (user decision 2026-10-21 Y2).
    case "transfer":
      return fromVerdict(key, labelKey, getTransferVerdict(facts, { assignCustodian: ownership === "personal" }), () => buildAssetRegisterTransactionHref(locale, assetId, "transfer", returnTo))
```

  The `manageComponents`, `bindLicense`, `renewLicense` and `default` cases (`:138-149`) stay as they are.

- [ ] **Step 5: Add the reason words.** Save this change file in your session scratchpad as `t1-messages.json`, then run `node scripts/messages-edit.mjs <scratchpad>/t1-messages.json`. Expected output: `messages updated: 8 th, 8 en, 0 deleted`.

```json
{ "set": {
  "th": {
    "asset.transactionReasonComponentCheckout": "ส่วนควบไปพร้อมเครื่องหลัก ส่งมอบแยกไม่ได้",
    "asset.transactionReasonComponentCheckin": "ส่วนควบรับคืนพร้อมเครื่องหลัก",
    "asset.transactionReasonLicenseCheckout": "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ส่งมอบไม่ได้",
    "asset.transactionReasonLicenseCheckin": "License ผูกสิทธิ์ที่หน้าทรัพย์สิน รับคืนไม่ได้",
    "asset.transactionReasonLicenseMove": "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้",
    "asset.transactionReasonHandoverModeMissing": "ไม่พบลักษณะการถือครองในรายการส่งมอบ กรุณาให้ผู้ดูแลตรวจสอบข้อมูล",
    "asset.transactionReasonHandoverStatusMismatch": "สถานะทรัพย์สินไม่ตรงกับลักษณะการถือครอง กรุณาให้ผู้ดูแลตรวจสอบก่อนรับคืน",
    "asset.transactionReasonSameAsset": "เป็นทรัพย์สินที่กำลังส่งมอบ เลือกเป็นปลายทางไม่ได้"
  },
  "en": {
    "asset.transactionReasonComponentCheckout": "A component goes with its parent asset and cannot be handed over on its own",
    "asset.transactionReasonComponentCheckin": "A component is returned with its parent asset",
    "asset.transactionReasonLicenseCheckout": "A License is assigned on the asset page and cannot be handed over",
    "asset.transactionReasonLicenseCheckin": "A License is assigned on the asset page and cannot be returned",
    "asset.transactionReasonLicenseMove": "A License is assigned on the asset page and cannot be moved",
    "asset.transactionReasonHandoverModeMissing": "The handover has no custody type. Ask an administrator to review the record.",
    "asset.transactionReasonHandoverStatusMismatch": "The asset status does not match its custody type. Ask an administrator to review it before check-in.",
    "asset.transactionReasonSameAsset": "This is the asset being handed over; it cannot be its own destination"
  }
} }
```

- [ ] **Step 6: Rewrite the pin that breaks.** In `tests/asset-register-transactions.test.ts:76-77`, the reason key no longer appears in `asset-actions.ts`, so change `const rule = readFileSync("src/lib/asset-actions.ts", "utf8")` to read `src/lib/asset-operation-eligibility.ts`. The regex and the two word assertions (`:78-81`) stay as they are (they pass because Step 3 writes the key as that literal). The purity check at `:96` still reads `asset-actions.ts` and passes unchanged.

- [ ] **Step 7: Run the tests and see them pass.** Run `node --test tests/asset-operation-eligibility.test.ts tests/asset-actions.test.ts tests/asset-register-transactions.test.ts`. Expected: all pass. The agreement test makes 2,240 comparisons in its loop, plus the two S-R40 context checks.

- [ ] **Step 8: Run the full checks.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 9: Commit.**
```
git add src/lib/asset-operation-eligibility.ts src/lib/asset-actions.ts messages/th.json messages/en.json tests/asset-operation-eligibility.test.ts tests/asset-actions.test.ts tests/asset-register-transactions.test.ts
git commit -m "feat(asset-operations): one verdict per transaction that the asset page reads and the search and save routes will, with the words for ส่วนควบ, License and an open handover that does not fit (server-search spec 6.3, S-R1, S-R2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: The save routes refuse what the picker does not offer (spec 6.5)

Production (SELECT, 2026-10-28) has no open handover of a ส่วนควบ or a License, and none with an open repair, so these rules strand no existing handover. The 17 ส่วนควบ and 18 License assets that are held without a handover can no longer be backfilled; that is intended.

**Files:**
- Modify: `src/app/api/assets/[id]/checkout/route.ts`: add the imports near `:9`; insert after `:43` and after `:54`
- Modify: `src/app/api/assets/[id]/checkin/route.ts`: insert before `:85` and after `:103`; add the code to the list at `:303`
- Modify: `src/app/api/assets/[id]/legacy-checkout/route.ts`: add the import near `:7`; add `ownershipType: true` to the select at `:26-35`; insert after `:37`
- Modify: `src/app/api/assets/[id]/transfer/route.ts`: add the import near `:8`; insert after `:41`
- Modify: `src/app/api/assets/bulk-move/route.ts`: add the import near `:8`; add `ownershipType: true` to the select at `:19-26`; insert after `:31`
- Modify: `src/lib/api-error-catalog.ts:29-30`: insert the seven codes
- Modify: `messages/th.json` and `messages/en.json` (`apiErrors.*`), through `node scripts/messages-edit.mjs`
- Test: `tests/asset-custody-route-claims.test.ts` (harness `:7-13`, `:48-59`, `:134-138`; new tests appended)
- Test: `tests/checkin-maintenance-ticket-route.test.ts`. The test at `:142-150` breaks and is rewritten.
- Test: `tests/asset-bulk-custody-routes.test.ts` (harness `:7-13`, `:46-59`, `:144-152`; the test at `:179-184` gets stronger assertions; new tests)
- Test: `tests/api-error-catalog.test.ts` (one new test)

**Interfaces:**
- Consumes (Task 1): `getAssetOperationOwnershipRefusal`, `assetOperationRefusalReasonKeys` and `type AssetOperationRefusalCode`, from `@/lib/asset-operation-eligibility`.
- Produces: new route answers, each a 409 with `{ code, error }` where `error` equals `code`, as the routes' existing status refusals do:
  - checkout: `ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED` or `ASSET_LICENSE_CHECKOUT_NOT_ALLOWED`; with `checkoutType: "asset"`, a destination the picker would not offer answers `{ code: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED", error: same, fieldErrors: { parentAssetId: "checkoutDestinationNotAllowed" } }`, so the form shows it under `#checkout-destination` (S-R39)
  - legacy-checkout: `ASSET_COMPONENT_CHECKIN_NOT_ALLOWED` or `ASSET_LICENSE_CHECKIN_NOT_ALLOWED`
  - transfer: `ASSET_LICENSE_MOVE_NOT_ALLOWED`
  - checkin: `ASSET_CHECKIN_REPAIR_OPEN`
  - bulk-move: `{ code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: same, blocked: [{ assetId, assetTag, code }] }`

  Catalog entries map each code to an `apiErrors` key whose words equal the picker's reason (S-R6). Every other answer, and the order of the existing answers, stays the same.

  The destination code is not an `AssetOperationRefusalCode` (Task 1 is unchanged): the picker shows the destination verdict's own reason, and the route answers one word for all of them, "เลือกทรัพย์สินนี้เป็นปลายทางไม่ได้ เลือกปลายทางอื่น" (S-R39). On master the route saves any non-empty `parentAssetId` (`checkout/route.ts:101`); Production has had only พนักงาน handovers (SELECT, 2026-10-28: 17, all `user`), so the check strands nothing.

- [ ] **Step 1: Write the failing tests.**
  - **`tests/asset-custody-route-claims.test.ts`.** Harness changes:
    - Add `assetOwnershipType: string` to `CustodyRouteState` (`:7-11`) and `assetOwnershipType: "personal"` to the initial state (`:13`).
    - Add `ownershipType: state().assetOwnershipType,` after `assetTag` in `asset()` (`:50`).
    - Add `state.assetOwnershipType = "personal"` to `beforeEach` (`:134-138`).
    - For the destination: `CustodyRouteState` also gains `destinations: Record<string, { id: string; ownershipType: string; custodianId: string | null; status: { name: string } }>` and `openCheckoutAssetIds: string[]` (both empty in the initial state and in `beforeEach`). In the mock's `model()`, before the `asset` `findFirst`/`findUnique` line, add `if (name === "asset" && method === "findFirst" && args?.where?.id && args.where.id !== "asset-1") return state().destinations[args.where.id] ?? null`, and before the generic `findFirst`/`findUnique → null` line add `if (name === "assetCheckout" && method === "findFirst") return state().openCheckoutAssetIds.includes(args?.where?.assetId) ? { id: "checkout-open", handoverMode: "temporary_loan" } : null`. With both empty, every existing test reads what it read before.

    Then append:
```ts
const refusal = async (response: Response) => [response.status, await response.json()]
const moveBody = { toLocationId: "location-2", reason: "ย้ายห้อง" }

test("a handover refuses a ส่วนควบ and a License with the picker's words, before any write (server-search spec 6.5)", async () => {
  for (const [ownership, code] of [["component", "ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED"], ["software_license", "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED"]] as const) {
    state.assetOwnershipType = ownership
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), [409, { code, error: code }], ownership)
    assert.equal(state.calls.includes("asset.updateMany"), false, ownership)
    assert.equal(state.calls.includes("assetCheckout.create"), false, ownership)
  }
  // Ownership first, as the picker: a License that is not Ready reads the License word.
  state.assetStatusName = "In Use"
  assert.deepEqual(await refusal(await post(checkoutRoute, checkoutBody)), [409, { code: "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED", error: "ASSET_LICENSE_CHECKOUT_NOT_ALLOWED" }])
})

test("a handover of a Ready บุคคล, ส่วนกลาง or Stock asset still saves", async () => {
  for (const ownership of ["personal", "shared", "stock"]) {
    state.assetOwnershipType = ownership
    assert.equal((await post(checkoutRoute, checkoutBody)).status, 201, ownership)
  }
})

const toAsset = (parentAssetId: string) => ({ ...checkoutBody, checkoutType: "asset", custodianId: undefined, parentAssetId })
const destination = (id: string, ownershipType: string, statusName: string) => ({ id, ownershipType, custodianId: null, status: { name: statusName } })
const destinationRefusal = [409, {
  code: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED", error: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED",
  fieldErrors: { parentAssetId: "checkoutDestinationNotAllowed" },
}]

test("a handover to ทรัพย์สินอื่น refuses a destination the picker would not offer, under its field and before any write (server-search spec 6.5, S-R39)", async () => {
  state.destinations = {
    "asset-license": destination("asset-license", "software_license", "Ready"),
    "asset-component": destination("asset-component", "component", "Ready"),
    "asset-repair": destination("asset-repair", "personal", "Under Maintenance"),
    "asset-loaned": destination("asset-loaned", "personal", "Ready"),
  }
  state.openCheckoutAssetIds = ["asset-loaned"]
  // itself, missing or inactive, a License, a ส่วนควบ, not Ready, under an open handover
  for (const parentAssetId of ["asset-1", "asset-missing", "asset-license", "asset-component", "asset-repair", "asset-loaned"]) {
    state.calls = []
    assert.deepEqual(await refusal(await post(checkoutRoute, toAsset(parentAssetId))), destinationRefusal, parentAssetId)
    assert.equal(state.calls.includes("asset.updateMany"), false, parentAssetId)
    assert.equal(state.calls.includes("assetCheckout.create"), false, parentAssetId)
  }
})

test("a handover to a Ready ทรัพย์สินอื่น with no open handover still saves", async () => {
  for (const ownership of ["personal", "shared", "stock"]) {
    state.destinations = { "asset-pc": destination("asset-pc", ownership, "Ready") }
    assert.equal((await post(checkoutRoute, toAsset("asset-pc"))).status, 201, ownership)
  }
})

test("a legacy return backfill refuses a ส่วนควบ and a License; a held บุคคล, ส่วนกลาง or Stock asset still backfills (server-search spec 6.5)", async () => {
  state.assetStatusName = "In Use"
  for (const [ownership, code] of [["component", "ASSET_COMPONENT_CHECKIN_NOT_ALLOWED"], ["software_license", "ASSET_LICENSE_CHECKIN_NOT_ALLOWED"]] as const) {
    state.assetOwnershipType = ownership
    state.calls = []
    assert.deepEqual(await refusal(await post(legacyCheckoutRoute, {})), [409, { code, error: code }], ownership)
    assert.equal(state.calls.includes("assetCheckout.create"), false, ownership)
  }
  for (const ownership of ["personal", "shared", "stock"]) {
    state.assetOwnershipType = ownership
    assert.equal((await post(legacyCheckoutRoute, {})).status, 201, ownership)
  }
})

test("a transfer refuses a License; a ส่วนควบ still moves (server-search spec 6.5)", async () => {
  state.assetOwnershipType = "software_license"
  assert.deepEqual(await refusal(await post(transferRoute, moveBody)), [409, { code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED" }])
  assert.equal(state.calls.includes("asset.updateMany"), false)
  state.assetOwnershipType = "component"
  assert.equal((await post(transferRoute, moveBody)).status, 201)
})
```
  - **`tests/checkin-maintenance-ticket-route.test.ts`.** Harness changes:
    - The state type and value (`:7-8`) gain `openRecordCounts: number[]`, starting as `[]`.
    - The mock at `:66` becomes `return state().openRecordCounts.shift() ?? state().openRecords`.

    Replace the test at `:142-150`. It pinned "an open repair does not get a second record", and spec 6.5 now refuses the return instead:
```ts
test("an asset with an unfinished repair record cannot be returned, and nothing is written (server-search spec 6.5)", async () => {
  for (const nextStatusId of ["status:Under Maintenance", "status:Ready"]) {
    state.calls = []
    state.openRecords = 1
    const response = await route.POST(checkinRequest(nextStatusId), context)

    assert.equal(response.status, 409, nextStatusId)
    assert.deepEqual(await response.json(), { code: "ASSET_CHECKIN_REPAIR_OPEN", error: "ASSET_CHECKIN_REPAIR_OPEN" }, nextStatusId)
    assert.deepEqual(state.calls.filter(({ call }) => /\.(create|update|updateMany)$/.test(call)), [], nextStatusId)
  }
  state.openRecords = 0
})

test("a repair opened while the return is being saved still refuses it inside the transaction", async () => {
  state.calls = []
  state.openRecordCounts = [0, 1]
  const response = await route.POST(checkinRequest("status:Ready"), context)

  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), { code: "ASSET_CHECKIN_REPAIR_OPEN", error: "ASSET_CHECKIN_REPAIR_OPEN" })
  assert.equal(state.calls.some(({ call }) => call === "assetCheckin.create"), false)
  state.openRecordCounts = []
})
```
  - **`tests/asset-bulk-custody-routes.test.ts`.** Harness changes:
    - `MockAsset` (`:7-13`) gains `ownershipType?: string`.
    - `toRow` gains `...(asset.ownershipType ? { ownershipType: asset.ownershipType } : {}),` after `name: "Laptop",` (`:49`). Rows without the field stay as they are, so the bulk-update and register tests do not change.
    - `beforeEach` adds two rows after `:148`:
      - `{ id: "license-1", statusName: "Ready", custodianId: null, currentLocationId: "loc-1", departmentId: "dept-1", ownershipType: "software_license" }`
      - `{ id: "component-1", …same…, ownershipType: "component" }`

    In the test at `:179-184`, add `assert.deepEqual(await response.json(), { code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "Disposed or retired assets cannot be moved.", blocked: [{ assetId: "disposed-1", assetTag: "DISPOSED-1", code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" }] })` after the status check. This pins the existing answer. Then add:
```ts
test("bulk move refuses a License, named per asset as a written-off asset is (server-search spec 6.5)", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "license-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  assert.deepEqual(await response.json(), {
    code: "ASSET_LICENSE_MOVE_NOT_ALLOWED", error: "ASSET_LICENSE_MOVE_NOT_ALLOWED",
    blocked: [{ assetId: "license-1", assetTag: "LICENSE-1", code: "ASSET_LICENSE_MOVE_NOT_ALLOWED" }],
  })
  assert.deepEqual(assetWrites(), [])
})

test("the License refusal comes before the open-handover and written-off ones, the picker's order", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["license-1", "loaned-1", "disposed-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 409)
  const body = await response.json() as { code: string; blocked: Array<{ assetId: string }> }
  assert.equal(body.code, "ASSET_LICENSE_MOVE_NOT_ALLOWED")
  assert.deepEqual(body.blocked.map((row) => row.assetId), ["license-1"])
})

test("bulk move still moves Ready assets of the other ownership types, a ส่วนควบ included", async () => {
  const response = await bulkMoveRoute.POST(jsonRequest("POST", { assetIds: ["ready-1", "component-1"], toLocationId: "loc-2", reason: "ย้ายคลัง" }))
  assert.equal(response.status, 200)
  assert.deepEqual(await response.json(), { updated: 2, componentSync: { updated: 0, skipped: 0, movements: 0 } })
})
```
  - **`tests/api-error-catalog.test.ts`.** Add `import { assetOperationRefusalReasonKeys } from "../src/lib/asset-operation-eligibility.ts"` after `:6`, then append:
```ts
test("a transaction refusal reads the picker's words for the same rule (server-search spec 6.5, S-R6)", () => {
  assert.deepEqual(Object.fromEntries(Object.keys(assetOperationRefusalReasonKeys).map((code) => [code, getApiErrorKey(code)])), {
    ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED: "componentCheckoutNotAllowed", ASSET_LICENSE_CHECKOUT_NOT_ALLOWED: "licenseCheckoutNotAllowed",
    ASSET_COMPONENT_CHECKIN_NOT_ALLOWED: "componentCheckinNotAllowed", ASSET_LICENSE_CHECKIN_NOT_ALLOWED: "licenseCheckinNotAllowed",
    ASSET_LICENSE_MOVE_NOT_ALLOWED: "licenseMoveNotAllowed", ASSET_CHECKIN_REPAIR_OPEN: "checkinRepairOpen",
  })
  // The destination refusal has one word of its own (S-R39), not a picker reason.
  assert.equal(getApiErrorKey("ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED"), "checkoutDestinationNotAllowed")
  for (const locale of ["th", "en"] as const) {
    const table = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"))
    for (const [code, reasonKey] of Object.entries(assetOperationRefusalReasonKeys)) {
      assert.equal(table.apiErrors[getApiErrorKey(code)!], table.asset[reasonKey.slice("asset.".length)], `${locale} ${code}`)
    }
  }
})
```

- [ ] **Step 2: Run the tests and see them fail.** Run `node --test tests/asset-custody-route-claims.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/asset-bulk-custody-routes.test.ts tests/api-error-catalog.test.ts`. Expected failures:
  - component checkout: `[201, …]` instead of `[409, …]`
  - destination: `[201, …]` instead of the destination refusal, for `asset-1` first
  - checkin: `201 !== 409`
  - License bulk move: `200 !== 409`
  - catalog: `getApiErrorKey(...)` is `null`

  The existing tests and the "still saves/moves" tests already pass.

- [ ] **Step 3: Add the ownership checks to checkout, legacy-checkout and transfer.** Each route imports `getAssetOperationOwnershipRefusal` from `@/lib/asset-operation-eligibility` and inserts this directly after its `if (!asset) return … 404` line, so it runs before the status check, as the picker's order requires:
```ts
    const ownershipRefusal = getAssetOperationOwnershipRefusal("checkout", asset.ownershipType)
    if (ownershipRefusal) return NextResponse.json({ code: ownershipRefusal, error: ownershipRefusal }, { status: 409 })
```
  The operation argument is `"checkout"` in checkout `:43`, `"legacyCheckin"` in legacy-checkout `:37` (which also adds `ownershipType: true` to its select), and `"move"` in transfer `:41`. Checkout and transfer read the row with `include`, so `ownershipType` is already present. These checks add no database call.

- [ ] **Step 3b: Check the ทรัพย์สินอื่น destination (checkout).** Import `getCheckoutParentVerdict` from `@/lib/asset-operation-eligibility` and `normalizeAssetOwnershipType` from `@/lib/asset-ownership`. Directly after the asset's own open-handover refusal (the `if (activeCheckout) { … }` block ending at `:54`), and so before the condition check, when `input.checkoutType === "asset" && input.parentAssetId`:
  - read the destination with `prisma.asset.findFirst({ where: { id: input.parentAssetId, isActive: true }, select: { ownershipType: true, custodianId: true, status: { select: { name: true } } } })`, and, only when it exists, its open handover with `prisma.assetCheckout.findFirst({ where: { assetId: input.parentAssetId, isReturned: false, transactionStatus: "active" }, select: { id: true, handoverMode: true } })`;
  - refuse when the destination is missing, or when `getCheckoutParentVerdict({ statusName: destination.status.name, ownership: normalizeAssetOwnershipType(destination.ownershipType), custodianId: destination.custodianId, openCheckout: destinationCheckout, hasOpenRepair: false }, { handedOverAssetId: id, assetId: input.parentAssetId })` is not eligible, with `NextResponse.json({ code: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED", error: "ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED", fieldErrors: { parentAssetId: "checkoutDestinationNotAllowed" } }, { status: 409 })`.

  Like the route's other pre-checks it runs outside the transaction. The form already reads `fieldErrors` through `applyServer` and focuses `#checkout-destination` (`checkout-form.tsx:57`, `:235`), so no form change is needed here.

- [ ] **Step 4: Refuse a return while a repair is open (checkin).** The route already imports `openRepairRecordWhere` at `:11`.
  - Before `:85` (`const { record: checkin, componentSync } = await prisma.$transaction(`), add:
```ts
    // An open repair blocks the return, as on the asset page and in the picker (server-search spec 6.5).
    if (await prisma.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } }) > 0) {
      return NextResponse.json({ code: "ASSET_CHECKIN_REPAIR_OPEN", error: "ASSET_CHECKIN_REPAIR_OPEN" }, { status: 409 })
    }
```
  - Directly after `:103` (`if (!activeCheckout) throw new Error("Active checkout not found")`), and so before `getCheckinHandoverStatusError`, matching the verdict's order, add `if (await tx.maintenanceTicket.count({ where: { ...openRepairRecordWhere, assetId: id } }) > 0) throw new Error("ASSET_CHECKIN_REPAIR_OPEN")`.
  - Add `"ASSET_CHECKIN_REPAIR_OPEN"` to the code list at `:303`.

  The send-to-repair count at `:229-230` stays as it is. It is now always 0, and that is harmless. The pre-check runs after the field checks, not right after the checkout lookup, because `tests/v-track2-x.test.ts:68-120` stubs prisma without `maintenanceTicket` and expects the condition and status field refusals.

- [ ] **Step 5: Refuse a License in bulk-move.** Add the import, and add `ownershipType: true` to the select (`:19-26`). After the not-found check (`:29-31`), and before the open-checkout check (`:33`), insert:
```ts
    // A License is bound on its asset page, never moved (server-search spec 6.5); named per asset like the written-off refusal below.
    const licenses = assets.flatMap((asset) => {
      const code = getAssetOperationOwnershipRefusal("move", asset.ownershipType)
      return code ? [{ assetId: asset.id, assetTag: asset.assetTag, code }] : []
    })
    if (licenses.length > 0) {
      return NextResponse.json({ code: licenses[0].code, error: licenses[0].code, blocked: licenses }, { status: 409 })
    }
```

- [ ] **Step 6: Catalog the codes and their words.** In `src/lib/api-error-catalog.ts`, between `:29` (`ASSET_CHANGED_DURING_OPERATION`) and `:30`, insert these entries in this alphabetical order:
  - `"ASSET_CHECKIN_REPAIR_OPEN": "checkinRepairOpen"`
  - `"ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED": "checkoutDestinationNotAllowed"`
  - `"ASSET_COMPONENT_CHECKIN_NOT_ALLOWED": "componentCheckinNotAllowed"`
  - `"ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED": "componentCheckoutNotAllowed"`
  - `"ASSET_LICENSE_CHECKIN_NOT_ALLOWED": "licenseCheckinNotAllowed"`
  - `"ASSET_LICENSE_CHECKOUT_NOT_ALLOWED": "licenseCheckoutNotAllowed"`
  - `"ASSET_LICENSE_MOVE_NOT_ALLOWED": "licenseMoveNotAllowed"`

  Then save the change file `<scratchpad>/t2-messages.json` and run `node scripts/messages-edit.mjs <scratchpad>/t2-messages.json`. Expected output: `messages updated: 7 th, 7 en, 0 deleted`. The first six words are Task 1's `asset.*` words, which the S-R6 test pins; the destination word is its own (S-R39).
```json
{ "set": {
  "th": {
    "apiErrors.componentCheckoutNotAllowed": "ส่วนควบไปพร้อมเครื่องหลัก ส่งมอบแยกไม่ได้",
    "apiErrors.licenseCheckoutNotAllowed": "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ส่งมอบไม่ได้",
    "apiErrors.componentCheckinNotAllowed": "ส่วนควบรับคืนพร้อมเครื่องหลัก",
    "apiErrors.licenseCheckinNotAllowed": "License ผูกสิทธิ์ที่หน้าทรัพย์สิน รับคืนไม่ได้",
    "apiErrors.licenseMoveNotAllowed": "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้",
    "apiErrors.checkinRepairOpen": "มีงานซ่อมที่ยังไม่ปิด กรุณาปิดหรือยกเลิกงานซ่อมก่อน",
    "apiErrors.checkoutDestinationNotAllowed": "เลือกทรัพย์สินนี้เป็นปลายทางไม่ได้ เลือกปลายทางอื่น"
  },
  "en": {
    "apiErrors.componentCheckoutNotAllowed": "A component goes with its parent asset and cannot be handed over on its own",
    "apiErrors.licenseCheckoutNotAllowed": "A License is assigned on the asset page and cannot be handed over",
    "apiErrors.componentCheckinNotAllowed": "A component is returned with its parent asset",
    "apiErrors.licenseCheckinNotAllowed": "A License is assigned on the asset page and cannot be returned",
    "apiErrors.licenseMoveNotAllowed": "A License is assigned on the asset page and cannot be moved",
    "apiErrors.checkinRepairOpen": "Close or cancel the active repair ticket before returning this asset.",
    "apiErrors.checkoutDestinationNotAllowed": "This asset cannot be the destination. Choose another one."
  }
} }
```
  The forms already toast `payload.error` (or `code`) through `apiError.toast`, and `describeApiError` turns a catalogued code into these words: checkout `checkout-form.tsx:236`, checkin `checkin-form.tsx:330-335`, legacy `checkin-form.tsx:272`, transfer `transfer-form.tsx:161`, bulk-move `bulk-move-form.tsx:106`. No form changes in this task.

- [ ] **Step 7: Run the tests and see them pass.** Re-run the Step 2 command, and also `node --test tests/v-track2-x.test.ts tests/v-track-s.test.ts tests/asset-handover-checkin.test.ts tests/legacy-checkin-flow.test.ts`. Expected: all pass. `v-track-s` stubs a checkout asset without `ownershipType`, and `getAssetOperationOwnershipRefusal(…, undefined)` returns null for it.

- [ ] **Step 8: Run the full checks.** Run `npm test`, `npx tsc --noEmit` and `npm run lint`. Expected: no failures and 0 lint errors. The catalog scanner (`tests/api-error-catalog.test.ts:68-80`) finds the new `"ASSET_CHECKIN_REPAIR_OPEN"` literals and checks that they are catalogued.

- [ ] **Step 9: Commit.**
```
git add "src/app/api/assets/[id]/checkout/route.ts" "src/app/api/assets/[id]/checkin/route.ts" "src/app/api/assets/[id]/legacy-checkout/route.ts" "src/app/api/assets/[id]/transfer/route.ts" src/app/api/assets/bulk-move/route.ts src/lib/api-error-catalog.ts messages/th.json messages/en.json tests/asset-custody-route-claims.test.ts tests/checkin-maintenance-ticket-route.test.ts tests/asset-bulk-custody-routes.test.ts tests/api-error-catalog.test.ts
git commit -m "fix(asset-operations): the save routes refuse what the picker does not offer: a ส่วนควบ or License handover or backfill, a ทรัพย์สินอื่น destination the picker would not offer, a License move, a return with an open repair, with the picker's words (server-search spec 6.5, S-R6, S-R39)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: The search API: pure rules, the server search, the route, the RBAC matrix

One bounded search answers the asset pickers of the four pages (spec 6.2, 6.3). It lists every active asset the text matches, at most 20 rows plus the true total. Each row carries the verdict of Task 1's functions for the page's mode, so the picker, the asset page and the save routes give one answer (S-R1, spec §5).

- **Rules (pure, client-safe):** parse the query, the where clauses, the ranking, the row, the รับคืน holder and groups. Task 4's picker imports the constants, the href builder and the types from here.
- **Server module:** only the reads. The db is injected, as `searchMaintenanceOptions` (`src/lib/maintenance-options.ts:14-25`), so the pages of Tasks 5-6 call it for the preselect and the tests fake it.
- **Route:** `asset:edit`, 400 on a bad query, `{ data }`.

No page, component, message or E2E step changes in this task.

Decisions:
- **Text fields** (spec 6.2, *my call*): the tag, name, serial, fixed-asset code, and the holder's code and Thai name. These are 6 of the register's 19 conditions (`src/lib/asset-list-query.ts:126-148`); a test pins that they are a subset. They are not the whole list, because "IT" or a branch code would match half the register. รับคืน also matches the open handover's document number and that handover's person.
- **Order** (spec 6.1; the audit walk orders the same way, `src/lib/audit-scan-session.ts:238,248-253`):
  1. exact: tag, serial or fixed-asset code equals the text;
  2. prefix: one of those codes starts with the text;
  3. the rest.

  Within each tier the rows go by tag. There are three reads, each ordered by tag with `take: 20`, plus one `count`. The merge keeps each asset's first appearance (exact, then prefix, then the rest) and cuts at 20.
  - Why three reads are enough: only rows of the earlier lists can come before a row of a later list. So the first 20 of each list contain the first 20 of the merge.
  - The tier comes from the list a row came from. JavaScript never re-compares text, so SQL Server's collation (case, trailing spaces) decides "exact" by itself.
- **Bounded:** each answer makes at most 4 asset reads, 1 count, 2 fact reads and 2 label reads. Every `in` list has at most 20 ids, far below the ~2,100 parameter limit. The by-id answer is 1 read with no count.
- **รับคืน groups** (S-R4):
  - **Group key:** `employee:<id>` for a person's handover; `department:` / `location:` / `asset:<id>` for the other destinations; `employee:<asset custodian>` for ข้อมูลเก่า; `none` when there is nothing to return.
  - **Group order:** groups follow their first row's rank. `none` is always last, and the rows follow group by group.
  - **`count`:** the rows of that group in this answer. This matches the mockup's "ถืออยู่ N ชิ้น".
  - **`label`:** the `none` group's `label` is `null`, and Task 4's message gives its words. A label that cannot be read is `-`, never an id. Today the fallback is the raw id (`src/lib/asset-operation-options.ts:166-172`).
- **Rows are plain JSON** (dates as ISO strings), so a page can hand a by-id row straight to a client component.
- **Performance:** the route runs inside `withPerformanceTiming("asset-operation-search", …)` (`src/lib/performance-timing.ts:25-30`). Production can then measure the spec §4 limit ("revisit if a search takes over 1 s") with `PERFORMANCE_TIMING=1`.

**Files:**
- Create: `src/lib/asset-operation-search-rules.ts` (pure, client-safe: relative `.ts` imports, `import type` from `@prisma/client`, no `prisma.` text, comments included).
- Create: `src/lib/asset-operation-search.ts` (server reads; relative `.ts` imports; db injected).
- Create: `src/app/api/asset-operations/search/route.ts`.
- Modify: `src/lib/rbac-route-matrix.ts`: insert one entry after `:60` (the role-export entry `:56-60`), before the `src/app/api/assets/route.ts` entry (`:61-68`).
- Modify: `src/lib/api-error-catalog.ts`: insert `"Invalid search": "invalidRequest",` after `:174` (`"Invalid role selection"`), before `"Invalid since"` (`:175`). It reuses the existing key `apiErrors.invalidRequest` "ข้อมูลที่ส่งไม่ถูกต้อง"; no message changes.
- Modify: `docs/04_AUTH_RBAC.md`: one bullet after `:74`.
- Modify: `tests/list-frame-guards.test.ts`: one LV2 row after `:176` (the `"src/lib/asset-operation-options.ts"` row), for the rules file's two `"-"` fallbacks (S-R23).
- Test:
  - `tests/asset-operation-search-rules.test.ts` (new, by value);
  - `tests/asset-operation-search.test.ts` (new, the server module with a fake db, as `tests/maintenance-options.test.ts:29-56`);
  - `tests/asset-operation-search-route.test.ts` (new, the route behind module mocks with the harness of `tests/audit-scan-status-route.test.ts:14-70`);
  - `tests/rbac-route-matrix.test.ts` (one test after `:55`).
- Pins this task would break if left alone, and how they are kept:
  - `tests/api-error-catalog.test.ts:68-79` ("every literal error message the server can send has a Thai translation") fails on the literal `error: "Invalid search"`. Step 3 adds the catalog line.
  - `tests/list-frame-guards.test.ts` LV2 (`RAW_DASH`, an exact count per file, `tests/helpers/guard-exempt.ts:34-36`) fails on the rules file's `"-"` fallbacks. Step 3 adds its row.
  - `tests/rbac-route-matrix.test.ts:57-70` stays green: the route is `matrix`.
  - No existing test reads the new paths (grep of `tests/` for `asset-operations/search`, `Invalid search`, `apiErrorKeyByMessage).length` and `rbacRoutePermissionMatrix.length`: 0 hits).

**Interfaces:**
- Consumes (Task 1, `src/lib/asset-operation-eligibility.ts`):
  - `assetOperationModes = ["checkout", "checkoutParent", "checkin", "transfer", "bulkMove"] as const` and `type AssetOperationMode`;
  - `type AssetOperationFacts = { statusName: string; ownership: AssetOwnershipType; custodianId: string | null; openCheckout: { id: string; handoverMode: string | null } | null; hasOpenRepair: boolean }`;
  - `type AssetOperationVerdict = { eligible: true; reasonKey: null } | { eligible: false; reasonKey: string }`;
  - `getCheckoutVerdict(facts)`, `getCheckoutParentVerdict(facts, { handedOverAssetId: string | null; assetId: string })`, `getCheckinVerdict(facts)` (`AssetOperationVerdict & { path }`), `getTransferVerdict(facts, { assignCustodian: boolean })`, `getBulkMoveVerdict(facts)`.
- Consumes (master):
  - `openRepairRecordWhere` (`src/lib/repair-record-policy.ts:12-15`);
  - `normalizeAssetOwnershipType` (`src/lib/asset-ownership.ts:9-13`; the register passes it to `getAssetActions`, `src/app/[locale]/(dashboard)/assets/page.tsx:300`);
  - `requireAuth` / `requirePermission` (`src/lib/auth-utils.ts`);
  - `errorResponse` (`src/lib/api-response.ts:6-24`; "Forbidden…" → 403, "Unauthorized" → 401);
  - `withPerformanceTiming` (`src/lib/performance-timing.ts:25`);
  - test only: `assetSearchConditions` (`src/lib/asset-list-query.ts:126`).
- Produces, in `src/lib/asset-operation-search-rules.ts`:
  ```ts
  export const assetOperationSearchMinChars = 2
  export const assetOperationSearchLimit = 20
  export const assetOperationSearchPath = "/api/asset-operations/search"
  export function isAssetOperationSearchReady(text: string): boolean            // Array.from(text.trim()).length >= 2, as isAuditSearchReady (audit-scan-session.ts:211)
  export type AssetOperationSearchInput = { mode: AssetOperationMode; q: string; id: string | null; assignCustodian: boolean; handedOverAssetId: string | null }
  export function parseAssetOperationSearch(params: URLSearchParams): AssetOperationSearchInput | { error: "Invalid search" }
  export function buildAssetOperationSearchHref(input: { mode: AssetOperationMode; q?: string; id?: string; assignCustodian?: boolean; handedOverAssetId?: string | null }): string
  export const openCheckoutWhere = { isReturned: false, transactionStatus: "active" } satisfies Prisma.AssetCheckoutWhereInput
  export function assetOperationTextConditions(q: string): Prisma.AssetWhereInput[]
  export function buildAssetOperationSearchWheres(input: AssetOperationSearchInput): { text: Prisma.AssetWhereInput; exact: Prisma.AssetWhereInput; prefix: Prisma.AssetWhereInput }
  export function buildAssetOperationByIdWhere(input: AssetOperationSearchInput): Prisma.AssetWhereInput
  export const assetOperationSearchAssetSelect   // satisfies Prisma.AssetSelect: id, assetTag, name, serialNumber, ownershipType, custodianId, currentLocationId, conditionId, status {name, nameTh}, currentLocation {code, name}, custodian {code, fullNameTh}
  export type AssetOperationSearchAsset = Prisma.AssetGetPayload<{ select: typeof assetOperationSearchAssetSelect }>
  export const assetOperationSearchCheckoutSelect // satisfies Prisma.AssetCheckoutSelect: id, assetId, documentNo, checkoutType, handoverMode, checkoutDate, expectedReturnDate, conditionBefore, remark, custodianId, departmentId, locationId, parentAssetId, custodian {code, fullNameTh}
  export type AssetOperationSearchCheckoutRecord = Prisma.AssetCheckoutGetPayload<{ select: typeof assetOperationSearchCheckoutSelect }>
  export type AssetOperationDestinationLabels = { departments: ReadonlyMap<string, string>; locations: ReadonlyMap<string, string>; assets: ReadonlyMap<string, string> }
  export type AssetOperationCheckinHolder = { key: string; label: string | null; employeeId: string | null }
  export type AssetOperationSearchCheckout = { id: string; documentNo: string | null; checkoutType: string; handoverMode: string | null; checkoutDate: string; expectedReturnDate: string | null; conditionBefore: string; remark: string | null; destinationLabel: string }
  export type AssetOperationSearchRow = {
    id: string; assetTag: string; name: string; serialNumber: string | null
    statusLabel: string                      // status.nameTh
    placeLabel: string                       // held: "code - fullNameTh", else the location "code - name"
    currentLocationId: string; conditionId: string
    eligible: boolean; reasonKey: string | null           // a full message key (root translator), null when eligible
    // รับคืน only (the keys are absent in the other modes):
    checkout?: AssetOperationSearchCheckout   // the open handover (the custody panel's fields)
    legacy?: true                            // a holder and no handover: ข้อมูลเก่า
    holderKey?: string; holderLabel?: string | null; holderEmployeeId?: string | null   // the group; who returns it (return-by prefill)
  }
  export type AssetOperationSearchGroup = { key: string; label: string | null; count: number }
  export type AssetOperationSearchAnswer = { mode: AssetOperationMode; total: number; rows: AssetOperationSearchRow[]; groups?: AssetOperationSearchGroup[] }  // groups: รับคืน only
  export function rankAssetOperationMatches<T extends { id: string }>(lists: { exact: readonly T[]; prefix: readonly T[]; contains: readonly T[] }): T[]
  export function getAssetOperationSearchVerdict(input: AssetOperationSearchInput, assetId: string, facts: AssetOperationFacts): AssetOperationVerdict
  export function getCheckinHolder(openCheckout: AssetOperationSearchCheckoutRecord | null, asset: Pick<AssetOperationSearchAsset, "custodianId" | "custodian">, labels: AssetOperationDestinationLabels): AssetOperationCheckinHolder
  export function buildAssetOperationSearchRow(input: AssetOperationSearchInput, asset: AssetOperationSearchAsset, context: { openCheckout: AssetOperationSearchCheckoutRecord | null; hasOpenRepair: boolean; labels?: AssetOperationDestinationLabels }): AssetOperationSearchRow
  export function groupAssetOperationCheckinRows(rows: readonly AssetOperationSearchRow[]): { rows: AssetOperationSearchRow[]; groups: AssetOperationSearchGroup[] }
  ```
- Produces, in `src/lib/asset-operation-search.ts`:
  ```ts
  export type AssetOperationSearchDb = {   // method syntax, so fakes may narrow args; the route passes `prisma as unknown as AssetOperationSearchDb`
    asset: { findMany(args: object): Promise<unknown[]>; count(args: object): Promise<number> }
    assetCheckout: { findMany(args: object): Promise<unknown[]> }
    maintenanceTicket: { findMany(args: object): Promise<unknown[]> }
    department: { findMany(args: object): Promise<unknown[]> }
    location: { findMany(args: object): Promise<unknown[]> }
  }
  export async function searchAssetOperationOptions(db: AssetOperationSearchDb, input: AssetOperationSearchInput): Promise<AssetOperationSearchAnswer>
  ```
- Produces the route: `GET /api/asset-operations/search?mode=<mode>&q=<text>|id=<assetId>[&assignCustodian=1][&handedOverAssetId=<id>]`. It answers:
  - 200 `{ data: AssetOperationSearchAnswer }`;
  - 400 `{ error: "Invalid search" }` for an unknown mode, or text under 2 characters without `id`;
  - 401 when not signed in;
  - 403 without `asset:edit`.
- Later tasks read:
  - **Task 4:** `buildAssetOperationSearchHref`, `isAssetOperationSearchReady`, `assetOperationSearchMinChars`, `assetOperationSearchLimit` and the answer types. Every client search URL is built by `buildAssetOperationSearchHref` (S-R21).
  - **Tasks 5-6:** they call `searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, { mode, q: "", id, assignCustodian: false, handedOverAssetId: null })` for `?assetId=`. Task 5's custodian re-check and Task 6's row read build their URL with `buildAssetOperationSearchHref`.
  - **Task 6, `?checkoutId=`:** it reads that handover's `assetId`, asks by id, and keeps the row only when `row.checkout?.id === checkoutId`.

- [ ] **Step 1: Write the failing rules test** `tests/asset-operation-search-rules.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { isDeepStrictEqual } from "node:util"

import { assetSearchConditions } from "../src/lib/asset-list-query.ts"
import {
  getBulkMoveVerdict, getCheckinVerdict, getCheckoutParentVerdict, getCheckoutVerdict, getTransferVerdict,
  type AssetOperationFacts, type AssetOperationVerdict,
} from "../src/lib/asset-operation-eligibility.ts"
import {
  assetOperationSearchLimit, assetOperationSearchMinChars, assetOperationTextConditions, buildAssetOperationByIdWhere,
  buildAssetOperationSearchHref, buildAssetOperationSearchRow, buildAssetOperationSearchWheres, getAssetOperationSearchVerdict,
  getCheckinHolder, groupAssetOperationCheckinRows, isAssetOperationSearchReady, parseAssetOperationSearch, rankAssetOperationMatches,
  type AssetOperationSearchAsset, type AssetOperationSearchCheckoutRecord, type AssetOperationSearchInput,
} from "../src/lib/asset-operation-search-rules.ts"

function input(query: string): AssetOperationSearchInput {
  const parsed = parseAssetOperationSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(`${query}: ${parsed.error}`)
  return parsed
}
const somchai = { code: "EMP-0412", fullNameTh: "สมชาย ใจดี" }
const asset: AssetOperationSearchAsset = {
  id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1", ownershipType: "personal",
  custodianId: null, currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
  currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null,
}
const held: AssetOperationSearchAsset = { ...asset, custodianId: "emp-1", custodian: somchai, status: { name: "In Use", nameTh: "ใช้งานอยู่" } }
const handover: AssetOperationSearchCheckoutRecord = {
  id: "co-1", assetId: "asset-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment",
  checkoutDate: new Date("2026-03-12T00:00:00.000Z"), expectedReturnDate: null, conditionBefore: "cond-1", remark: null,
  custodianId: "emp-1", departmentId: null, locationId: null, parentAssetId: null, custodian: somchai,
}
const noLabels = { departments: new Map<string, string>(), locations: new Map<string, string>(), assets: new Map<string, string>() }
const ctx = (openCheckout: AssetOperationSearchCheckoutRecord | null) => ({ openCheckout, hasOpenRepair: false, labels: noLabels })

test("the search asks for 2 characters and answers 20 rows (spec 6.1, 6.2)", () => {
  assert.equal(assetOperationSearchMinChars, 2)
  assert.equal(assetOperationSearchLimit, 20)
  assert.deepEqual([" a ", "ab", "สม", " 0 2 "].map(isAssetOperationSearchReady), [false, true, true, true])
})

test("the query: a mode, the trimmed text of 2 or more characters or an id; anything else is 'Invalid search'", () => {
  const base = { mode: "checkout", q: "ab", id: null, assignCustodian: false, handedOverAssetId: null }
  assert.deepEqual(parseAssetOperationSearch(new URLSearchParams("mode=checkout&q=%20ab%20")), base)
  for (const query of ["mode=checkout&q=a", "mode=checkout&q=%20a%20", "mode=checkout", "mode=audit&q=ab", "q=ab"]) {
    assert.deepEqual(parseAssetOperationSearch(new URLSearchParams(query)), { error: "Invalid search" }, query)
  }
  assert.deepEqual(input("mode=checkin&id=%20asset-1%20"), { ...base, mode: "checkin", q: "", id: "asset-1" })   // by id: no 2-character rule
  assert.equal(input("mode=transfer&q=ab&assignCustodian=1").assignCustodian, true)
  assert.equal(input("mode=transfer&q=ab&assignCustodian=0").assignCustodian, false)
  assert.equal(input("mode=checkoutParent&q=ab&handedOverAssetId=asset-9").handedOverAssetId, "asset-9")
  assert.equal(input("mode=checkout&q=ab&handedOverAssetId=asset-9").handedOverAssetId, null)   // only ทรัพย์สินอื่น leaves an asset out
  for (const mode of ["checkout", "checkoutParent", "checkin", "transfer", "bulkMove"]) assert.equal(input(`mode=${mode}&q=ab`).mode, mode)
})

test("the picker's href and the route's parse read the same names", () => {
  const href = buildAssetOperationSearchHref({ mode: "transfer", q: "02 28", assignCustodian: true })
  assert.equal(href, "/api/asset-operations/search?mode=transfer&q=02+28&assignCustodian=1")
  assert.deepEqual(parseAssetOperationSearch(new URL(href, "http://localhost").searchParams), { mode: "transfer", q: "02 28", id: null, assignCustodian: true, handedOverAssetId: null })
  assert.equal(buildAssetOperationSearchHref({ mode: "checkoutParent", id: "asset-2", handedOverAssetId: "asset-1" }), "/api/asset-operations/search?mode=checkoutParent&id=asset-2&handedOverAssetId=asset-1")
})

test("the text matches 6 of the register's own conditions: tag, name, serial, fixed-asset code, the holder's code and name (spec 6.2)", () => {
  const conditions = assetOperationTextConditions("0228")
  assert.deepEqual(conditions, [
    { assetTag: { contains: "0228" } }, { name: { contains: "0228" } }, { serialNumber: { contains: "0228" } }, { fixedAssetCode: { contains: "0228" } },
    { custodian: { code: { contains: "0228" } } }, { custodian: { fullNameTh: { contains: "0228" } } },
  ])
  const register = assetSearchConditions("0228")
  for (const condition of conditions) assert.ok(register.some((entry) => isDeepStrictEqual(entry, condition)), JSON.stringify(condition))
})

test("the wheres: active assets; exact and prefix on the three codes; รับคืน adds the open handover; ทรัพย์สินอื่น leaves out the asset handed over", () => {
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=checkout&q=0228")), {
    text: { isActive: true, OR: assetOperationTextConditions("0228") },
    exact: { isActive: true, OR: [{ assetTag: "0228" }, { serialNumber: "0228" }, { fixedAssetCode: "0228" }] },
    prefix: { isActive: true, OR: [{ assetTag: { startsWith: "0228" } }, { serialNumber: { startsWith: "0228" } }, { fixedAssetCode: { startsWith: "0228" } }] },
  })
  assert.deepEqual(buildAssetOperationSearchWheres(input("mode=checkin&q=HO-26")).text, {
    isActive: true,
    OR: [...assetOperationTextConditions("HO-26"), { checkouts: { some: { isReturned: false, transactionStatus: "active", OR: [
      { documentNo: { contains: "HO-26" } }, { custodian: { code: { contains: "HO-26" } } }, { custodian: { fullNameTh: { contains: "HO-26" } } },
    ] } } }],
  })
  const parent = buildAssetOperationSearchWheres(input("mode=checkoutParent&q=ab&handedOverAssetId=asset-9"))
  for (const where of [parent.text, parent.exact, parent.prefix]) assert.deepEqual(where.NOT, { id: "asset-9" })
  assert.deepEqual(buildAssetOperationByIdWhere(input("mode=transfer&id=asset-1")), { isActive: true, id: "asset-1" })
  assert.deepEqual(buildAssetOperationByIdWhere(input("mode=checkoutParent&id=asset-9&handedOverAssetId=asset-9")), { isActive: true, NOT: { id: "asset-9" }, id: "asset-9" })
})

test("exact codes first, then codes that start with the text, then the rest, at most 20 (spec 6.1, S-R3)", () => {
  const r = (id: string) => ({ id })
  assert.deepEqual(rankAssetOperationMatches({ exact: [r("B")], prefix: [r("A"), r("B"), r("C")], contains: [r("A"), r("B"), r("C"), r("D")] }).map((row) => row.id), ["B", "A", "C", "D"])
  const many = Array.from({ length: 25 }, (_, index) => r(`R${index}`))
  assert.equal(rankAssetOperationMatches({ exact: [], prefix: [], contains: many }).length, 20)
  assert.deepEqual(rankAssetOperationMatches({ exact: many.slice(0, 20), prefix: [r("P")], contains: [] }).map((row) => row.id), many.slice(0, 20).map((row) => row.id))
})

test("each mode asks Task 1's verdict, so the picker, the asset page and the routes agree (spec §5, S-R1)", () => {
  const facts: AssetOperationFacts[] = [
    { statusName: "Ready", ownership: "personal", custodianId: null, openCheckout: null, hasOpenRepair: false },
    { statusName: "In Use", ownership: "personal", custodianId: "emp-1", openCheckout: { id: "co-1", handoverMode: "permanent_assignment" }, hasOpenRepair: false },
    { statusName: "In Use", ownership: "personal", custodianId: "emp-1", openCheckout: null, hasOpenRepair: true },
    { statusName: "Checked Out", ownership: "shared", custodianId: null, openCheckout: { id: "co-2", handoverMode: null }, hasOpenRepair: false },
    { statusName: "Ready", ownership: "stock", custodianId: null, openCheckout: null, hasOpenRepair: false },
    { statusName: "Ready", ownership: "component", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false },
    { statusName: "Ready", ownership: "software_license", custodianId: "emp-1", openCheckout: null, hasOpenRepair: false },
    { statusName: "Disposed", ownership: "shared", custodianId: null, openCheckout: null, hasOpenRepair: false },
  ]
  const pick = (verdict: AssetOperationVerdict) => ({ eligible: verdict.eligible, reasonKey: verdict.reasonKey })
  const verdict = (query: string, row: AssetOperationFacts) => getAssetOperationSearchVerdict(input(query), "asset-1", row)
  for (const row of facts) {
    assert.deepEqual(verdict("mode=checkout&q=ab", row), pick(getCheckoutVerdict(row)))
    assert.deepEqual(verdict("mode=checkoutParent&q=ab&handedOverAssetId=asset-1", row), pick(getCheckoutParentVerdict(row, { handedOverAssetId: "asset-1", assetId: "asset-1" })))
    assert.deepEqual(verdict("mode=checkin&q=ab", row), pick(getCheckinVerdict(row)))
    assert.deepEqual(verdict("mode=transfer&q=ab", row), pick(getTransferVerdict(row, { assignCustodian: false })))
    assert.deepEqual(verdict("mode=transfer&q=ab&assignCustodian=1", row), pick(getTransferVerdict(row, { assignCustodian: true })))
    assert.deepEqual(verdict("mode=bulkMove&q=ab", row), pick(getBulkMoveVerdict(row)))
  }
  // By value (spec 6.3): an In Use asset on ส่งมอบ; a held component on รับคืน.
  assert.deepEqual(verdict("mode=checkout&q=ab", facts[2]), { eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" })
  assert.deepEqual(verdict("mode=checkin&q=ab", facts[5]), { eligible: false, reasonKey: "asset.transactionReasonComponentCheckin" })
})

test("a row carries the words the picker shows, no raw code: status nameTh, the holder when held, else the location (spec 6.1)", () => {
  assert.deepEqual(buildAssetOperationSearchRow(input("mode=checkout&q=0228"), asset, { openCheckout: null, hasOpenRepair: false }), {
    id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", serialNumber: "SN-1",
    statusLabel: "พร้อมใช้งาน", placeLabel: "IT-2 - ห้อง IT ชั้น 2",
    currentLocationId: "loc-1", conditionId: "cond-1", eligible: true, reasonKey: null,
  })
  const row = buildAssetOperationSearchRow(input("mode=checkout&q=0228"), held, { openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([row.placeLabel, row.eligible, row.reasonKey], ["EMP-0412 - สมชาย ใจดี", false, "asset.transactionReasonStatusNotReady"])
  const keys = Object.keys(buildAssetOperationSearchRow(input("mode=transfer&q=0228"), held, ctx(handover)))
  assert.deepEqual(keys.filter((key) => ["checkout", "legacy", "holderKey", "holderLabel", "holderEmployeeId"].includes(key)), [])
})

test("รับคืน rows: the open handover with the panel's fields, ข้อมูลเก่า, or nothing to return (spec 6.3)", () => {
  const handed = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(handover))
  assert.deepEqual(handed.checkout, {
    id: "co-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-03-12T00:00:00.000Z",
    expectedReturnDate: null, conditionBefore: "cond-1", remark: null, destinationLabel: "EMP-0412 - สมชาย ใจดี",
  })
  assert.deepEqual(["legacy" in handed, handed.holderKey, handed.holderLabel, handed.holderEmployeeId, handed.eligible], [false, "employee:emp-1", "EMP-0412 - สมชาย ใจดี", "emp-1", true])
  const legacy = buildAssetOperationSearchRow(input("mode=checkin&q=สมชาย"), held, ctx(null))
  assert.deepEqual(["checkout" in legacy, legacy.legacy, legacy.holderKey, legacy.holderEmployeeId, legacy.eligible], [false, true, "employee:emp-1", "emp-1", true])
  const nothing = buildAssetOperationSearchRow(input("mode=checkin&q=0228"), asset, ctx(null))
  assert.deepEqual(["legacy" in nothing, nothing.holderKey, nothing.holderLabel, nothing.holderEmployeeId, nothing.eligible, nothing.reasonKey],
    [false, "none", null, null, false, "asset.transactionReasonNoReturnRecord"])
})

test("a handover to a department, a location or another asset groups under that destination; an unreadable label is '-' (S-R4)", () => {
  const labels = { departments: new Map([["dep-1", "IT - ฝ่ายไอที"]]), locations: new Map([["loc-9", "WH - คลัง IT"]]), assets: new Map([["asset-p", "SNI-COM-23-0001 - คอมพิวเตอร์ตั้งโต๊ะ HP"]]) }
  const to = (overrides: Partial<AssetOperationSearchCheckoutRecord>) => ({ ...handover, custodianId: null, custodian: null, ...overrides })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "department", departmentId: "dep-1" }), held, labels), { key: "department:dep-1", label: "IT - ฝ่ายไอที", employeeId: null })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "location", locationId: "loc-9" }), asset, labels), { key: "location:loc-9", label: "WH - คลัง IT", employeeId: null })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "asset", parentAssetId: "asset-p" }), asset, labels), { key: "asset:asset-p", label: "SNI-COM-23-0001 - คอมพิวเตอร์ตั้งโต๊ะ HP", employeeId: null })
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "location", locationId: "loc-gone" }), asset, labels), { key: "location:loc-gone", label: "-", employeeId: null })
  // A person's handover without its person falls back to the asset's holder, then to none.
  assert.deepEqual(getCheckinHolder(to({ checkoutType: "user" }), held, labels), { key: "employee:emp-1", label: "EMP-0412 - สมชาย ใจดี", employeeId: "emp-1" })
  assert.deepEqual(getCheckinHolder(null, asset, labels), { key: "none", label: null, employeeId: null })
})

test("รับคืน groups follow their first row's rank, ไม่มีผู้ถือครอง last, rows group by group, count = the group's rows (S-R4, the mockup)", () => {
  const row = (id: string, holderKey: string, holderLabel: string | null) =>
    ({ ...buildAssetOperationSearchRow(input("mode=checkin&q=ab"), { ...asset, id }, ctx(null)), holderKey, holderLabel })
  const somchaiR = "EMP-0588 - สมชาย รักงาน"
  const { rows, groups } = groupAssetOperationCheckinRows([
    row("r1", "employee:emp-2", somchaiR), row("r2", "none", null), row("r3", "employee:emp-1", "EMP-0412 - สมชาย ใจดี"), row("r4", "employee:emp-2", somchaiR),
  ])
  assert.deepEqual(rows.map((entry) => entry.id), ["r1", "r4", "r3", "r2"])
  assert.deepEqual(groups, [
    { key: "employee:emp-2", label: somchaiR, count: 2 },
    { key: "employee:emp-1", label: "EMP-0412 - สมชาย ใจดี", count: 1 },
    { key: "none", label: null, count: 1 },
  ])
})

test("the rules module is client-safe: relative imports, Prisma for types only, no database", () => {
  const seen = new Set<string>()
  const visit = (path: string) => {
    if (seen.has(path)) return
    seen.add(path)
    const source = readFileSync(path, "utf8")
    assert.doesNotMatch(source, /from "@\//, `${path} imports through "@/"`)
    assert.doesNotMatch(source, /^import (?!type\b)[^\n]*from "@prisma\/client"/m, `${path} imports Prisma values`)
    assert.doesNotMatch(source, /\bprisma\./, `${path} reads the database`)
    for (const [, relative] of source.matchAll(/from "\.\/([^"]+\.ts)"/g)) visit(`src/lib/${relative}`)
  }
  visit("src/lib/asset-operation-search-rules.ts")
  assert.ok(seen.has("src/lib/asset-operation-eligibility.ts"), "the verdicts are Task 1's")
})
```

- [ ] **Step 2: Run it to see it fail.** `node --test tests/asset-operation-search-rules.test.ts` → `ERR_MODULE_NOT_FOUND` for `src/lib/asset-operation-search-rules.ts`.

- [ ] **Step 3: Implement `src/lib/asset-operation-search-rules.ts` and add the catalog line.**
  - Signatures and selects as in **Interfaces**. Imports:
    - `import type { Prisma } from "@prisma/client"`;
    - `normalizeAssetOwnershipType` from `./asset-ownership.ts`;
    - Task 1's names from `./asset-operation-eligibility.ts`.
  - **The parse:**
    - `mode` must be in `assetOperationModes`.
    - `id` is trimmed; `""` becomes `null`.
    - `q` is trimmed.
    - The parse is invalid unless `id` is set or `isAssetOperationSearchReady(q)`.
    - `assignCustodian` is `params.get("assignCustodian") === "1"`.
    - `handedOverAssetId` is the trimmed value, only when `mode === "checkoutParent"`, else `null`.
    - The error object is the literal `{ error: "Invalid search" }`.
  - **The href:** `${assetOperationSearchPath}?` + a `URLSearchParams`, appended in this order: `mode`, `q` (when set), `id` (when set), `assignCustodian=1` (when true), `handedOverAssetId` (when set).
  - **The wheres:**
    - The base is `{ isActive: true }`, plus `NOT: { id: handedOverAssetId }` when it is set. It goes into `text`, `exact`, `prefix` and the by-id where.
    - รับคืน's extra condition is `{ checkouts: { some: { ...openCheckoutWhere, OR: [documentNo, custodian.code, custodian.fullNameTh contains] } } }`, appended after the 6 text conditions.
  - **`getAssetOperationSearchVerdict`:** a `switch (input.mode)` over Task 1's five functions. It returns only `{ eligible, reasonKey }` and drops `getCheckinVerdict`'s `path`. `checkoutParent` passes `{ handedOverAssetId: input.handedOverAssetId, assetId }`; `transfer` passes `{ assignCustodian: input.assignCustodian }`.
  - **`buildAssetOperationSearchRow`:**
    - The facts are `{ statusName: asset.status.name, ownership: normalizeAssetOwnershipType(asset.ownershipType), custodianId: asset.custodianId, openCheckout: openCheckout && { id, handoverMode }, hasOpenRepair }`.
    - The verdict comes from `getAssetOperationSearchVerdict`.
    - In mode `checkin` only, it adds:
      - `holderKey`, `holderLabel` and `holderEmployeeId` from `getCheckinHolder(openCheckout, asset, labels ?? empty maps)`;
      - `checkout` when there is an open handover, with dates as `toISOString()` and `destinationLabel: holder.label ?? "-"`;
      - `legacy: true` when there is no open handover and `asset.custodianId` is set.
    - No key is ever set to `undefined`.
  - **`getCheckinHolder` and `groupAssetOperationCheckinRows`:** their bodies are fixed by the tests above. The file holds exactly two `"-"` fallbacks: one label helper, `(id && labels.get(id)) || "-"`, for the three destination maps, and `destinationLabel: holder.label ?? "-"`.
  - **Catalog line:** in `src/lib/api-error-catalog.ts`, after `"Invalid role selection"` (`:174` on master, `:181` after Task 2's seven codes), add `"Invalid search": "invalidRequest",`.
  - **LV2 row:** in `tests/list-frame-guards.test.ts`, after the `"src/lib/asset-operation-options.ts"` row (`:176`), add `"src/lib/asset-operation-search-rules.ts": { count: 2, kind: "permanent", why: "the label of a handover destination that cannot be read, built on the server", ruling: "2B R-n" },`.

- [ ] **Step 4: Run to see it pass.** Run `node --test tests/asset-operation-search-rules.test.ts tests/api-error-catalog.test.ts tests/list-frame-guards.test.ts`. All tests pass: the 12 new ones, the catalog's literal-message test at `:68-79` and the LV2 guard.

- [ ] **Step 5: Write the failing server test** `tests/asset-operation-search.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import { searchAssetOperationOptions, type AssetOperationSearchDb } from "../src/lib/asset-operation-search.ts"
import {
  buildAssetOperationSearchWheres, parseAssetOperationSearch,
  type AssetOperationSearchAsset, type AssetOperationSearchCheckoutRecord, type AssetOperationSearchInput,
} from "../src/lib/asset-operation-search-rules.ts"

function input(query: string): AssetOperationSearchInput {
  const parsed = parseAssetOperationSearch(new URLSearchParams(query))
  if ("error" in parsed) throw new Error(query)
  return parsed
}
const somchai = { code: "EMP-0412", fullNameTh: "สมชาย ใจดี" }
const inUse = { name: "In Use", nameTh: "ใช้งานอยู่" }
function asset(tag: string, overrides: Partial<AssetOperationSearchAsset> = {}): AssetOperationSearchAsset {
  return {
    id: `id-${tag}`, assetTag: tag, name: `ชื่อ ${tag}`, serialNumber: null, ownershipType: "personal", custodianId: null,
    currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
    currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null, ...overrides,
  }
}
function checkout(overrides: Partial<AssetOperationSearchCheckoutRecord>): AssetOperationSearchCheckoutRecord {
  return {
    id: "co-1", assetId: "asset-1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment",
    checkoutDate: new Date("2026-03-12T00:00:00.000Z"), expectedReturnDate: null, conditionBefore: "cond-1", remark: null,
    custodianId: "emp-1", departmentId: null, locationId: null, parentAssetId: null, custodian: somchai, ...overrides,
  }
}

type Where = { id?: string | { in: string[] }; assetId?: { in: string[] }; OR?: Array<{ assetTag?: unknown }> } & Record<string, unknown>
type Args = { where: Where; select?: unknown; orderBy?: unknown; take?: number }
function fakeDb(data: {
  exact?: AssetOperationSearchAsset[]; prefix?: AssetOperationSearchAsset[]; contains?: AssetOperationSearchAsset[]; total?: number
  checkouts?: AssetOperationSearchCheckoutRecord[]; repairAssetIds?: string[]
} = {}) {
  const calls: Array<{ call: string; args: Args }> = []
  const all = [...(data.exact ?? []), ...(data.prefix ?? []), ...(data.contains ?? [])]
  const db: AssetOperationSearchDb = {
    asset: {
      async findMany(args: Args) {
        calls.push({ call: "asset.findMany", args })
        const { id } = args.where
        if (typeof id === "string") return all.filter((row) => row.id === id).slice(0, 1)
        if (id) return []   // the parent-asset labels
        const first = args.where.OR?.[0]?.assetTag
        if (typeof first === "string") return data.exact ?? []
        if (first && typeof first === "object" && "startsWith" in first) return data.prefix ?? []
        return data.contains ?? []
      },
      async count(args: Args) { calls.push({ call: "asset.count", args }); return data.total ?? 0 },
    },
    assetCheckout: { async findMany(args: Args) { calls.push({ call: "assetCheckout.findMany", args }); return (data.checkouts ?? []).filter((row) => args.where.assetId?.in.includes(row.assetId)) } },
    maintenanceTicket: { async findMany(args: Args) { calls.push({ call: "maintenanceTicket.findMany", args }); return (data.repairAssetIds ?? []).map((assetId) => ({ assetId })) } },
    department: { async findMany(args: Args) { calls.push({ call: "department.findMany", args }); return [{ id: "dep-1", code: "IT", name: "ฝ่ายไอที" }] } },
    location: { async findMany(args: Args) { calls.push({ call: "location.findMany", args }); return [] } },
  }
  return { db, calls }
}

test("a text search: three reads of 20 by tag and one count; 20 rows, the exact code first, the true total; facts for those 20 ids only (spec 6.1, 6.2)", async () => {
  const contains = Array.from({ length: 20 }, (_, index) => asset(`AAA-${String(index).padStart(2, "0")}-0228`))
  const { db, calls } = fakeDb({ exact: [asset("SNI-EQU-25-0228")], contains, total: 134 })
  const answer = await searchAssetOperationOptions(db, input("mode=checkout&q=0228"))
  assert.deepEqual([answer.mode, answer.total, answer.rows.length, answer.rows[0].assetTag, answer.rows[19].assetTag, "groups" in answer],
    ["checkout", 134, 20, "SNI-EQU-25-0228", "AAA-18-0228", false])
  const lists = calls.filter((call) => call.call === "asset.findMany")
  assert.equal(lists.length, 3)
  for (const list of lists) assert.deepEqual([list.args.take, list.args.orderBy], [20, { assetTag: "asc" }])
  assert.deepEqual(calls.filter((call) => call.call === "asset.count").map((call) => call.args.where), [buildAssetOperationSearchWheres(input("mode=checkout&q=0228")).text])
  const ids = answer.rows.map((row) => row.id)
  assert.deepEqual(calls.find((call) => call.call === "assetCheckout.findMany")?.args.where, { assetId: { in: ids }, isReturned: false, transactionStatus: "active" })
  assert.deepEqual(calls.find((call) => call.call === "maintenanceTicket.findMany")?.args.where, { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] }, assetId: { in: ids } })
  assert.equal(calls.some((call) => call.call === "department.findMany" || call.call === "location.findMany"), false)
})

test("an open handover or an open repair reaches the verdict: listed, not takeable, with the asset page's reason (spec 6.3)", async () => {
  const handedOver = fakeDb({ contains: [asset("SNI-EQU-25-0228", { id: "asset-1" })], total: 1, checkouts: [checkout({ assetId: "asset-1" })] })
  const [row] = (await searchAssetOperationOptions(handedOver.db, input("mode=checkout&q=0228"))).rows
  assert.deepEqual([row.eligible, row.reasonKey], [false, "asset.transactionReasonOpenCheckoutHandover"])
  const repaired = fakeDb({
    contains: [asset("SNI-COM-23-02281", { id: "asset-2", custodianId: "emp-1", custodian: somchai, status: inUse })], total: 1,
    checkouts: [checkout({ assetId: "asset-2" })], repairAssetIds: ["asset-2"],
  })
  const [returning] = (await searchAssetOperationOptions(repaired.db, input("mode=checkin&q=0228"))).rows
  assert.deepEqual([returning.eligible, returning.reasonKey, returning.checkout?.documentNo], [false, "asset.transactionReasonActiveMaintenance", "HO-2026-0151"])
})

test("by id: one read of one active asset, no count, the same verdict (spec 6.4, S-R5)", async () => {
  const { db, calls } = fakeDb({ contains: [asset("SNI-EQU-25-0228", { id: "asset-1", status: inUse })] })
  const answer = await searchAssetOperationOptions(db, input("mode=checkout&id=asset-1"))
  assert.deepEqual(calls.filter((call) => call.call.startsWith("asset.")).map((call) => [call.call, call.args.where, call.args.take]),
    [["asset.findMany", { isActive: true, id: "asset-1" }, 1]])
  assert.deepEqual([answer.total, answer.rows[0].eligible, answer.rows[0].reasonKey], [1, false, "asset.transactionReasonStatusNotReady"])
})

test("nothing found: no further reads; รับคืน answers an empty group list (spec 6.1)", async () => {
  const { db, calls } = fakeDb()
  assert.deepEqual(await searchAssetOperationOptions(db, input("mode=bulkMove&q=zz")), { mode: "bulkMove", total: 0, rows: [] })
  assert.equal(calls.some((call) => call.call === "assetCheckout.findMany" || call.call === "maintenanceTicket.findMany"), false)
  assert.deepEqual(await searchAssetOperationOptions(fakeDb().db, input("mode=checkin&q=zz")), { mode: "checkin", total: 0, rows: [], groups: [] })
})

test("รับคืน: a person's handover and ข้อมูลเก่า under the person, a department handover under the department, nothing to return last; labels read by id only when needed (S-R4)", async () => {
  const { db, calls } = fakeDb({
    contains: [
      asset("A-1", { id: "a1", custodianId: "emp-1", custodian: somchai, status: inUse }),
      asset("A-2", { id: "a2", status: { name: "Checked Out", nameTh: "ถูกยืม" } }),
      asset("A-3", { id: "a3" }),
      asset("A-4", { id: "a4", custodianId: "emp-1", custodian: somchai, status: inUse }),
    ],
    total: 4,
    checkouts: [
      checkout({ id: "co-1", assetId: "a1" }),
      checkout({ id: "co-2", assetId: "a2", checkoutType: "department", handoverMode: "temporary_loan", custodianId: null, custodian: null, departmentId: "dep-1" }),
    ],
  })
  const answer = await searchAssetOperationOptions(db, input("mode=checkin&q=A-"))
  assert.deepEqual(answer.groups, [
    { key: "employee:emp-1", label: "EMP-0412 - สมชาย ใจดี", count: 2 },
    { key: "department:dep-1", label: "IT - ฝ่ายไอที", count: 1 },
    { key: "none", label: null, count: 1 },
  ])
  assert.deepEqual(answer.rows.map((row) => [row.assetTag, row.holderKey, row.checkout?.id ?? null, row.legacy ?? false, row.holderEmployeeId, row.eligible]), [
    ["A-1", "employee:emp-1", "co-1", false, "emp-1", true],
    ["A-4", "employee:emp-1", null, true, "emp-1", true],
    ["A-2", "department:dep-1", "co-2", false, null, true],
    ["A-3", "none", null, false, null, false],
  ])
  assert.deepEqual(calls.filter((call) => call.call === "department.findMany").map((call) => call.args.where), [{ id: { in: ["dep-1"] } }])
  assert.equal(calls.some((call) => call.call === "location.findMany"), false)
  assert.equal(calls.filter((call) => call.call === "asset.findMany").length, 3)   // no parent-asset read
})
```

- [ ] **Step 6: Run it to see it fail.** `node --test tests/asset-operation-search.test.ts` → `ERR_MODULE_NOT_FOUND` for `src/lib/asset-operation-search.ts`.

- [ ] **Step 7: Implement `src/lib/asset-operation-search.ts`.** It holds `AssetOperationSearchDb` and `searchAssetOperationOptions` as in **Interfaces**, and imports `openRepairRecordWhere` from `./repair-record-policy.ts` and the rules from `./asset-operation-search-rules.ts`. The reads, in order:
  1. **By id:** `db.asset.findMany({ where: buildAssetOperationByIdWhere(input), select: assetOperationSearchAssetSelect, take: 1 })`, with `total = rows.length` and no count.
  2. **Text:** one `Promise.all` of the three `findMany` (`exact`, `prefix`, `text` wheres, each with `select: assetOperationSearchAssetSelect, orderBy: { assetTag: "asc" }, take: assetOperationSearchLimit`) and `db.asset.count({ where: wheres.text })`. The rows are then `rankAssetOperationMatches({ exact, prefix, contains })`.
  3. **No rows:** return `{ mode, total, rows: [] }`, plus `groups: []` for `checkin`. Nothing else is read.
  4. **Facts:** one `Promise.all` for the ≤20 ids.
     - `db.assetCheckout.findMany({ where: { assetId: { in: ids }, ...openCheckoutWhere }, select: assetOperationSearchCheckoutSelect, orderBy: { checkoutDate: "desc" } })`. The first row per asset wins, as `firstIdByAssetId` (`src/lib/asset-actions.ts:71-77`).
     - `db.maintenanceTicket.findMany({ where: { ...openRepairRecordWhere, assetId: { in: ids } }, select: { assetId: true } })`, as `src/lib/maintenance-options.ts:65-71`.
  5. **`checkin` only, the destination labels by id.** Each read runs only when its id list is non-empty. There is no `isActive` filter, because a handover may point at a since-closed department.
     - `department` / `location` `findMany({ where: { id: { in } }, select: { id: true, code: true, name: true } })` → `"code - name"`;
     - `asset.findMany({ where: { id: { in } }, select: { id: true, assetTag: true, name: true } })` → `"tag - name"`.
  6. **Rows:** `buildAssetOperationSearchRow` per asset in rank order. `checkin` returns `{ mode, total, ...groupAssetOperationCheckinRows(rows) }`; the other modes return `{ mode, total, rows }`.

- [ ] **Step 8: Run to see it pass.** `node --test tests/asset-operation-search.test.ts` → 5 tests pass.

- [ ] **Step 9: Write the failing route and matrix tests.**
  - `tests/rbac-route-matrix.test.ts`, after `:55`:

```ts
test("the transaction pickers' search is registered for asset edit, as the four pages and their save routes (server search spec 6.2)", () => {
  const entry = rbacRoutePermissionMatrix.find((candidate) => candidate.filePath === "src/app/api/asset-operations/search/route.ts")
  assert.deepEqual(entry?.checks, [{ module: "asset", action: "edit" }])
})
```

  - `tests/asset-operation-search-route.test.ts`. The imports and the `registerHooks` block are copied from `tests/audit-scan-status-route.test.ts:1-5` and `:48-67`, with `readFileSync` added to that file's `node:fs` import; then:

```ts
import type { AssetOperationSearchAnswer } from "../src/lib/asset-operation-search-rules.ts"

const state: { permissions: string[]; calls: string[] } = { permissions: ["asset:edit"], calls: [] }
Object.assign(globalThis, { __assetOperationSearchRouteState: state })

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response { static json(body, init) { return Response.json(body, init) } }
  `],
  ["@/lib/auth-utils", `
    const state = () => globalThis.__assetOperationSearchRouteState
    export async function requireAuth() { return { id: "user-1", roles: [], permissions: state().permissions } }
    export function hasPermission(user, module, action) { return user.permissions.includes(module + ":" + action) }
    export function requirePermission(user, module, action) {
      if (!user.permissions.includes(module + ":" + action)) throw new Error("Forbidden: insufficient permissions")
    }
  `],
  ["@/lib/db", `
    const state = () => globalThis.__assetOperationSearchRouteState
    const ready = { id: "asset-1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก", serialNumber: null, ownershipType: "personal", custodianId: null,
      currentLocationId: "loc-1", conditionId: "cond-1", status: { name: "Ready", nameTh: "พร้อมใช้งาน" },
      currentLocation: { code: "IT-2", name: "ห้อง IT ชั้น 2" }, custodian: null }
    const model = (name, rows) => ({
      findMany: async () => { state().calls.push(name + ".findMany"); return rows },
      count: async () => { state().calls.push(name + ".count"); return rows.length },
    })
    export const prisma = { asset: model("asset", [ready]), assetCheckout: model("assetCheckout", []), maintenanceTicket: model("maintenanceTicket", []),
      department: model("department", []), location: model("location", []) }
  `],
])
// registerHooks({ resolve … }) exactly as tests/audit-scan-status-route.test.ts:48-67

const route = await import(pathToFileURL("src/app/api/asset-operations/search/route.ts").href) as { GET(request: Request): Promise<Response> }
const get = (query: string) => route.GET(new Request(`http://localhost/api/asset-operations/search${query}`))

beforeEach(() => {
  state.permissions = ["asset:edit"]
  state.calls = []
})

test("the viewer (asset:view) gets 403 before anything is read (spec 6.2, §7)", async () => {
  state.permissions = ["asset:view"]
  assert.equal((await get("?mode=checkout&q=0228")).status, 403)
  assert.deepEqual(state.calls, [])
})

test("a bad mode or a text under 2 characters is 400 'Invalid search', with nothing read (spec 6.2)", async () => {
  for (const query of ["?mode=audit&q=0228", "?q=0228", "?mode=checkout&q=0", "?mode=checkout&q=%20%200%20"]) {
    const response = await get(query)
    assert.equal(response.status, 400, query)
    assert.deepEqual(await response.json(), { error: "Invalid search" })
  }
  assert.deepEqual(state.calls, [])
})

test("an answer is { data } with the mode, the true total and the rows with their verdicts (spec 6.2)", async () => {
  const response = await get("?mode=checkout&q=0228")
  assert.equal(response.status, 200)
  const { data } = await response.json() as { data: AssetOperationSearchAnswer }
  assert.deepEqual([data.mode, data.total, data.rows.map((row) => [row.assetTag, row.eligible, row.reasonKey])], ["checkout", 1, [["SNI-EQU-25-0228", true, null]]])
})

test("the search's time can be measured on Production (spec §4: revisit over 1 s)", () => {
  assert.match(readFileSync("src/app/api/asset-operations/search/route.ts", "utf8"), /withPerformanceTiming\(\s*"asset-operation-search"/)
})
```

- [ ] **Step 10: Run them to see them fail.** Run `node --test tests/asset-operation-search-route.test.ts tests/rbac-route-matrix.test.ts`. Expected: `ERR_MODULE_NOT_FOUND` for `src/app/api/asset-operations/search/route.ts`, and the new matrix test fails with `undefined` against `[{ module: "asset", action: "edit" }]`.

- [ ] **Step 11: Implement the route, the matrix entry and the doc line.** First read `node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md:51`: GET handlers are not cached by default, and the session read keeps this one dynamic.
  - `src/app/api/asset-operations/search/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { requireAuth, requirePermission } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import { withPerformanceTiming } from "@/lib/performance-timing"
import { searchAssetOperationOptions, type AssetOperationSearchDb } from "@/lib/asset-operation-search"
import { parseAssetOperationSearch } from "@/lib/asset-operation-search-rules"

// The transaction pages' asset picker (server search spec 6.2): asset:edit, as the four pages and their save routes.
export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    requirePermission(user, "asset", "edit")
    const input = parseAssetOperationSearch(new URL(request.url).searchParams)
    if ("error" in input) return NextResponse.json({ error: input.error }, { status: 400 })
    const data = await withPerformanceTiming(
      "asset-operation-search",
      () => searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, input),
      { mode: input.mode, byId: input.id !== null },
    )
    return NextResponse.json({ data })
  } catch (error) {
    return errorResponse(error)
  }
}
```

  - The route reads `new URL(request.url)`, not `request.nextUrl`, as `src/app/api/audit-rounds/[id]/scan-status/route.ts:20` does, so the test can pass a plain `Request`.
  - `src/lib/rbac-route-matrix.ts`, after `:60`: `{ filePath: "src/app/api/asset-operations/search/route.ts", label: "Asset operation picker search", checks: [{ module: "asset", action: "edit" }] },`.
  - `docs/04_AUTH_RBAC.md`, after `:74`, this bullet:

```md
- The transaction pages' asset search (`GET /api/asset-operations/search`) needs `asset:edit`, the permission of the four pages (ส่งมอบ, รับคืน, โอนย้าย, ย้ายที่ตั้งหลายรายการ) and their save routes; the viewer has none of them. It answers at most 20 rows and a total, each row with the asset page's verdict for that transaction.
```

- [ ] **Step 12: Run to see them pass.** Run `node --test tests/asset-operation-search-route.test.ts tests/rbac-route-matrix.test.ts`. All pass, including `:57-70`, where the new route is now `matrix`.

- [ ] **Step 13: Run the whole check.** `npm test`, `npx tsc --noEmit` and `npm run lint` must all finish with 0 errors. If a pin outside this task's list fails, rewrite it in this commit and name it in the report.

- [ ] **Step 14: Commit.**

```bash
git add src/lib/asset-operation-search-rules.ts src/lib/asset-operation-search.ts "src/app/api/asset-operations/search/route.ts" src/lib/rbac-route-matrix.ts src/lib/api-error-catalog.ts docs/04_AUTH_RBAC.md tests/list-frame-guards.test.ts tests/asset-operation-search-rules.test.ts tests/asset-operation-search.test.ts tests/asset-operation-search-route.test.ts tests/rbac-route-matrix.test.ts
git commit -m "feat(asset-operations): one bounded asset search answers the transaction pickers, GET /api/asset-operations/search behind asset:edit and in the RBAC matrix: the text of 2 or more characters matches the tag, name, serial, fixed-asset code and the holder (รับคืน also the open handover's document and person), an exact code first, then codes that start with it, at most 20 rows with the true total, each row with Task 1's verdict for the page's mode and its reason key, รับคืน rows grouped by holder with ไม่มีผู้ถือครอง last, and a by-id answer for the preselect (server search Task 3, spec 6.2-6.4, S-R1, S-R3 to S-R5)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: `AssetOperationPicker`, the shared picker of the four transaction pages, and its pure rules

**Decision: a new shared part, not an extension of `SearchableSelect`.** None of the three existing pickers can hold spec 6.1 without breaking its own contract:

- `SearchableSelect` (`src/components/ui/searchable-select.tsx`) filters `options` again in the browser by label (`:74` → `src/lib/searchable-select-filter.ts:11-15`). A server match on a holder's name or a serial number would disappear. Its rows are one line with no reason (`:131-142`), it picks one value only, and its search box sits in a popover behind a trigger button (`:102-146`). Spec 6.1 asks for focus in the search field, and on bulk-move the search keeps focus between picks. Making it async, grouped, multi-pick and reason-aware would rewrite a part with 30 call sites in 14 files and the pins `tests/field-primitives.test.ts:104-…`, `tests/searchable-select-accessibility.test.ts`, `tests/menu-primitives-ui.test.ts:182` and `tests/v-track-f.test.ts:209-231`.
- `MaintenanceOptionSelect` (`src/components/maintenance/maintenance-option-select.tsx`) is a `SearchableSelect`, so it has the same limits. It appends the reason to the label (`:81-84`), and an answer that arrives late can still replace a newer one: it has an abort but no key check (`:50-75`).
- `DisposalAssetPicker` (`src/components/disposal/disposal-asset-picker.tsx`) is the closest: inline list, rows that cannot be taken stay listed, an answer is keyed by its text (`:34`). But it has no arrow keys and no `aria-activedescendant`, its rows are raw `<button>`s (an N3 `EXEMPT` row), it uses disposal words and the disposal API, and its `id` names the search field, which is not there once a single asset is chosen (`:59`). So a "chosen but blocked" error (spec 6.4) would have nothing to focus.

The new part borrows what works:
- from `GlobalSearch` (`src/components/layout/global-search.tsx`): the combobox (`:254`), `li role="option"` rows with `onMouseDown` preventDefault (`:412`), the listbox as the element that scrolls (`:389`), the `<mark>` look (`:520-531`), and a state function as plain data (`src/lib/global-search-panel.ts:9`);
- from `DisposalAssetPicker`: a list inline under the field, answers keyed by their text, and the chosen list with a remove button per row.

It is one file in `src/components/ui/`, registered like `DesktopSelectionBar` (`tests/desktop-selection-bar.test.ts:25-49`).

**Files:**
- Create:
  - `src/lib/asset-operation-picker-rules.ts` (pure, client-safe; relative `.ts` imports; its values from Task 3's rules file only);
  - `src/components/ui/asset-operation-picker.tsx` (`"use client"`);
  - `tests/asset-operation-picker-rules.test.ts` (by value);
  - `tests/asset-operation-picker-ui.test.ts` (source pins, words, docs and guard registration).
- Modify:
  - `DESIGN.md`: a new bullet after `:509` (`FileQueueList`), before `:510` (`- **Migration:**`), in "### Inputs / Fields";
  - `docs/14_UI_UX_DESIGN_SYSTEM.md`: a new row after `:66` (`| A searchable picker | \`SearchableSelect\` |`);
  - `tests/list-frame-guards.test.ts:67` (`UI_NAME`) and `:130-132` (the LN2 owners and their comment);
  - `tests/validation-guards.test.ts:122` (comment) and `:138` (`SELECT_TAGS`);
  - `tests/form-migration-guards.test.ts:269` (GF4) and `:317` (GF8);
  - `messages/th.json` and `messages/en.json`, only through `node scripts/messages-edit.mjs`.
- Existing pins this task breaks: **none**.
  - `tests/ui-overlay-guards.test.ts:71-81` (no global listeners for closing overlays) still holds, because the picker closes through the root's `onBlur` and never calls `document`/`window.addEventListener` (Step 5).
  - `tests/desktop-selection-bar.test.ts:47-48` still holds, because `AssetOperationPicker` goes **before** `DesktopSelectionBar` in `UI_NAME`. That keeps `…|DesktopSelectionBar)\b/g` at its end.
  - `"asset-operation-picker"` goes **first** in the LN2 owners, which keeps `"desktop-selection-bar", "empty-note"` next to each other.
  - No test slices DESIGN.md or docs/14 across the insertion points (grep of `FileQueueList`, `**Migration:**`, `A searchable picker`, `An action menu` in `tests/`: none).
  - No page uses the part yet. Tasks 5-7 do.

**Interfaces:**
- Consumes:
  - **Task 1** (`src/lib/asset-operation-eligibility.ts`): `type AssetOperationMode` (`"checkout" | "checkoutParent" | "checkin" | "transfer" | "bulkMove"`). `reasonKey`s are full message keys such as `"asset.transactionReasonStatusNotReady"`, read through the root translator, as `src/components/assets/asset-register-row-actions.tsx:41,51` does.
  - **Task 3** (`src/lib/asset-operation-search-rules.ts`):
    - the types `AssetOperationSearchAnswer`, `AssetOperationSearchRow` and `AssetOperationSearchGroup` exactly as Task 3 produces them (S-R20): `placeLabel: string`; on รับคืน `checkout?: AssetOperationSearchCheckout` (`documentNo: string | null`, `checkoutDate` an ISO string), `legacy?: true`, `holderKey`; a group's `label: string | null`;
    - `buildAssetOperationSearchHref`, `isAssetOperationSearchReady` and `assetOperationSearchMinChars`: the parameters `mode`, `q`, `id`, `assignCustodian=1` and `handedOverAssetId`, and the 2-character rule, live only there (S-R21; no `excludeIds`, S-R18);
    - the route `GET /api/asset-operations/search` → `200 { data: AssetOperationSearchAnswer }`, any other status = failed;
    - the "nothing to return" group has `key: "none"` and `label: null` (S-R23).
  - Existing:
    - `splitSearchHighlight` (`src/lib/search-highlight.ts:2`);
    - `formatDate` (`src/lib/utils.ts:21`; Thai date, Buddhist year, as the check-in panel shows it);
    - `Input` (`src/components/ui/input.tsx:13`);
    - `Button` (`src/components/ui/button.tsx:32`; sizes are 44px below `md`, `ref` as a prop);
    - `FieldLabel`, `FieldHint`, `FieldError` (`src/components/ui/field.tsx`);
    - `EmptyNote` (`src/components/ui/empty-note.tsx`);
    - `useTranslations` (next-intl);
    - `focusField`'s rule (`src/lib/field-focus.ts:36-39`): a target that is not a control focuses its first enabled control. `useFieldErrors` looks the field up by id (`src/components/ui/use-field-errors.ts:114`).
- Produces:
  - `src/lib/asset-operation-picker-rules.ts`:

    ```ts
    export const assetOperationPickerDebounceMs = 250
    export const assetOperationNoHolderGroupKey = "none"
    export type AssetOperationPickerContext = { assignCustodian?: boolean; handedOverAssetId?: string | null }
    export function buildAssetOperationSearchUrl(input: { mode: AssetOperationMode; q?: string; id?: string; context?: AssetOperationPickerContext }): string | null
    export type AssetOperationPickerResult = { key: string; answer: AssetOperationSearchAnswer | null } // answer null = the request failed
    export type AssetOperationPickerState = "hint" | "loading" | "error" | "empty" | "results"
    export function getAssetOperationPickerState(input: { query: string; requestKey: string | null; result: AssetOperationPickerResult | null }): AssetOperationPickerState
    export function getAssetOperationCountLine(answer: Pick<AssetOperationSearchAnswer, "total" | "rows">): { count: number; shown: number; more: boolean }
    export type AssetOperationRowNote = { kind: "chosen" } | { kind: "reason"; key: string } | null
    export function getAssetOperationRowView(row: Pick<AssetOperationSearchRow, "id" | "eligible" | "reasonKey">, chosenIds: ReadonlySet<string>): { selectable: boolean; note: AssetOperationRowNote }
    export type AssetOperationRowDetail = { kind: "handover"; documentNo: string; checkoutDate: string } | { kind: "legacy" } | { kind: "place"; statusLabel: string; placeLabel: string }
    export function getAssetOperationRowDetail(row: AssetOperationSearchRow): AssetOperationRowDetail
    export type AssetOperationSection = { group: AssetOperationSearchGroup | null; rows: AssetOperationSearchRow[] }
    export function buildAssetOperationSections(answer: AssetOperationSearchAnswer): AssetOperationSection[]
    export function resolveAssetOperationActive(options: readonly { id: string; selectable: boolean }[], activeId: string | null): number
    export function moveAssetOperationActive(options: readonly { selectable: boolean }[], current: number, step: 1 | -1): number
    ```
  - `src/components/ui/asset-operation-picker.tsx`:

    ```ts
    type AssetOperationPickerBaseProps = {
      id: string
      label: string
      mode: AssetOperationMode
      context?: AssetOperationPickerContext
      hint?: React.ReactNode       // default: t("hint"), or t("hintCheckin") in mode checkin
      error?: React.ReactNode
      required?: boolean
      initialQuery?: string        // รับคืน ?assetId=: the search starts filled and open (spec 6.4)
    }
    export type AssetOperationPickerProps =
      | (AssetOperationPickerBaseProps & { multiple?: false; value: AssetOperationSearchRow | null; onChange: (row: AssetOperationSearchRow | null) => void })
      | (AssetOperationPickerBaseProps & { multiple: true; values: AssetOperationSearchRow[]; onChange: (rows: AssetOperationSearchRow[]) => void })
    export function AssetOperationPicker(props: AssetOperationPickerProps) // returns JSX
    ```
  - The DOM contract for Tasks 5-8:
    - `#<id>` is the root (`data-slot="asset-operation-picker"`, `data-invalid` while it shows an error). It holds the label, the control, the hint, the error, the list and the chosen rows. So `#checkout-asset` keeps `toContainText(tag)` in the E2E.
    - `#<id>-search` is the combobox, named by the field's label.
    - `#<id>-listbox`.
    - `[data-asset-option="<assetId>"]` are the `role="option"` rows; a row that cannot be taken has `aria-disabled="true"` and a `[data-asset-option-reason]` with its words. Each row's tag sits in its own `span`, so a test finds a row by its whole tag.
    - `[data-asset-option-group="<group key>"]` is each รับคืน section's `li role="presentation"`: it holds the group line (label, "ถืออยู่ N ชิ้น") and its `ul role="group"` of rows.
    - `[data-asset-search-count]` is the count line.
    - `[data-asset-picked="<assetId>"]` is the chosen box (one pick) or a chosen row (many).
    - `#<id>-error` is the error.
    - `focusFirst` with the field id focuses the search field, or "เปลี่ยน" while one asset is chosen.
    - The part does not take away `onChange` calls: a page may refuse a pick by not setting `value` (Task 6's legacy confirm). The search then stays as typed.
  - Message keys `assetOperation.*` (Step 4). The part also reuses `common.searchSelectPlaceholder`, `common.searchSelectResultCount` and `common.tryAgain`.

- [ ] **Step 1: Write the failing tests**

`tests/asset-operation-picker-rules.test.ts` (new):

```ts
import assert from "node:assert/strict"
import test from "node:test"
import {
  assetOperationNoHolderGroupKey,
  assetOperationPickerDebounceMs,
  buildAssetOperationSearchUrl,
  buildAssetOperationSections,
  getAssetOperationCountLine,
  getAssetOperationPickerState,
  getAssetOperationRowDetail,
  getAssetOperationRowView,
  moveAssetOperationActive,
  resolveAssetOperationActive,
} from "../src/lib/asset-operation-picker-rules.ts"
import { assetOperationSearchMinChars, type AssetOperationSearchAnswer, type AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

// Server search Task 4 (spec 6.1, 6.3, Review Focus 3): what the shared picker shows, as plain data.
const row = (over: Partial<AssetOperationSearchRow> = {}): AssetOperationSearchRow => ({
  id: "a1", assetTag: "SNI-EQU-25-0228", name: "โน้ตบุ๊ก Dell Latitude 5440", statusLabel: "พร้อมใช้งาน",
  placeLabel: "IT-02 - ห้อง IT ชั้น 2", serialNumber: null, currentLocationId: "loc-1", conditionId: "cond-1", eligible: true, reasonKey: null, ...over,
})
const answer = (rows: AssetOperationSearchRow[], over: Partial<AssetOperationSearchAnswer> = {}): AssetOperationSearchAnswer =>
  ({ mode: "checkout", total: rows.length, rows, ...over })
const BASE = "/api/asset-operations/search?"

test("the picker asks after 2 characters and a 250 ms pause (spec 6.1)", () => {
  assert.equal(assetOperationSearchMinChars, 2)   // Task 3's rule, used through isAssetOperationSearchReady
  assert.equal(assetOperationPickerDebounceMs, 250)
})

test("the search URL: the trimmed text, or the id with no 2-character rule, then the page's context (spec 6.2)", () => {
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkout", q: " 0228 " }), `${BASE}mode=checkout&q=0228`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkout", q: " 0 " }), null)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkout" }), null)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkin", q: "สมชาย" }), BASE + new URLSearchParams({ mode: "checkin", q: "สมชาย" }).toString())
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkin", id: "a1", q: "x" }), `${BASE}mode=checkin&id=a1`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "transfer", q: "NB", context: { assignCustodian: true } }), `${BASE}mode=transfer&q=NB&assignCustodian=1`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "transfer", q: "NB", context: { assignCustodian: false } }), `${BASE}mode=transfer&q=NB`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkoutParent", q: "NB", context: { handedOverAssetId: "a9" } }), `${BASE}mode=checkoutParent&q=NB&handedOverAssetId=a9`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "checkoutParent", q: "NB", context: { handedOverAssetId: null } }), `${BASE}mode=checkoutParent&q=NB`)
  assert.equal(buildAssetOperationSearchUrl({ mode: "bulkMove", q: "NB" }), `${BASE}mode=bulkMove&q=NB`)
})

test("the state: the hint under 2 characters, searching until the answer for this very text, then failed, nothing found or rows (spec 6.1, Review Focus 3 and 5)", () => {
  const key = buildAssetOperationSearchUrl({ mode: "checkout", q: "0228" })!
  const older = buildAssetOperationSearchUrl({ mode: "checkout", q: "02" })!
  const rows = answer([row()])
  assert.equal(getAssetOperationPickerState({ query: "", requestKey: null, result: null }), "hint")
  assert.equal(getAssetOperationPickerState({ query: " 0 ", requestKey: null, result: { key: older, answer: rows } }), "hint")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: null }), "loading")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key: older, answer: rows } }), "loading", "the answer to 02 never shows for 0228")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key, answer: null } }), "error", "a failure is never 'nothing found'")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key, answer: answer([]) } }), "empty")
  assert.equal(getAssetOperationPickerState({ query: "0228", requestKey: key, result: { key, answer: rows } }), "results")
})

test("the count line: the true total, and 'type more' when the server cut it at 20 (spec 6.1)", () => {
  assert.deepEqual(getAssetOperationCountLine(answer([row(), row({ id: "a2" })])), { count: 2, shown: 2, more: false })
  assert.deepEqual(getAssetOperationCountLine({ total: 134, rows: Array.from({ length: 20 }, (_, i) => row({ id: `a${i}` })) }), { count: 134, shown: 20, more: true })
})

test("a row: takeable, chosen already, or not takeable with its reason key; chosen wins (spec 6.1)", () => {
  const none = new Set<string>()
  assert.deepEqual(getAssetOperationRowView(row(), none), { selectable: true, note: null })
  assert.deepEqual(getAssetOperationRowView(row(), new Set(["a1"])), { selectable: false, note: { kind: "chosen" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }), none), { selectable: false, note: { kind: "reason", key: "asset.transactionReasonStatusNotReady" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: "asset.transactionReasonOpenCheckoutHandover" }), new Set(["a1"])), { selectable: false, note: { kind: "chosen" } })
  assert.deepEqual(getAssetOperationRowView(row({ eligible: false, reasonKey: null }), none), { selectable: false, note: null })
})

test("the second line: the handover document on รับคืน, ข้อมูลเก่า for a legacy row, else status and place (spec 6.1, 6.3)", () => {
  const checkout = { id: "c1", documentNo: "HO-2026-0151", checkoutType: "user", handoverMode: "permanent_assignment", checkoutDate: "2026-03-12T00:00:00.000Z", expectedReturnDate: null, conditionBefore: "cond-1", remark: null, destinationLabel: "EMP-0412 - สมชาย ใจดี" }
  assert.deepEqual(getAssetOperationRowDetail(row({ checkout })), { kind: "handover", documentNo: "HO-2026-0151", checkoutDate: "2026-03-12T00:00:00.000Z" })
  assert.deepEqual(getAssetOperationRowDetail(row({ legacy: true })), { kind: "legacy" })
  assert.deepEqual(getAssetOperationRowDetail(row()), { kind: "place", statusLabel: "พร้อมใช้งาน", placeLabel: "IT-02 - ห้อง IT ชั้น 2" })
  assert.deepEqual(getAssetOperationRowDetail(row({ checkout: { ...checkout, documentNo: null } })), { kind: "place", statusLabel: "พร้อมใช้งาน", placeLabel: "IT-02 - ห้อง IT ชั้น 2" }, "a handover without a number reads as an ordinary row (S-R22)")
})

test("sections: one flat section without groups; รับคืน follows the server's group order, drops empty groups, keeps a stray row last (spec 6.3, S-R4)", () => {
  const r1 = row({ id: "a1", holderKey: "u1" })
  const r2 = row({ id: "a2", holderKey: assetOperationNoHolderGroupKey })
  const r3 = row({ id: "a3", holderKey: "u1" })
  const r4 = row({ id: "a4", holderKey: "u9" })
  assert.equal(assetOperationNoHolderGroupKey, "none")
  assert.deepEqual(buildAssetOperationSections(answer([r1, r2])), [{ group: null, rows: [r1, r2] }])
  const groups = [
    { key: "u1", label: "EMP-0412 - สมชาย ใจดี", count: 2 },
    { key: "u2", label: "EMP-0588 - สมชาย รักงาน", count: 1 },
    { key: assetOperationNoHolderGroupKey, label: null, count: 1 },
  ]
  assert.deepEqual(buildAssetOperationSections(answer([r1, r2, r3, r4], { mode: "checkin", groups })), [
    { group: groups[0], rows: [r1, r3] },
    { group: groups[2], rows: [r2] },
    { group: null, rows: [r4] },
  ])
})

test("keys: the first row is active only when it can be taken; the arrows skip what cannot and wrap (spec 6.1)", () => {
  const options = [{ id: "a", selectable: false }, { id: "b", selectable: true }, { id: "c", selectable: false }, { id: "d", selectable: true }]
  assert.equal(resolveAssetOperationActive(options, null), -1, "Enter never takes a lower row when the exact match cannot be taken")
  assert.equal(resolveAssetOperationActive(options, "d"), 3)
  assert.equal(resolveAssetOperationActive(options, "c"), -1)
  assert.equal(resolveAssetOperationActive([{ id: "a", selectable: true }, { id: "b", selectable: true }], null), 0)
  assert.equal(resolveAssetOperationActive([{ id: "a", selectable: true }], "gone"), 0)
  assert.equal(moveAssetOperationActive(options, -1, 1), 1)
  assert.equal(moveAssetOperationActive(options, 1, 1), 3)
  assert.equal(moveAssetOperationActive(options, 3, 1), 1)
  assert.equal(moveAssetOperationActive(options, 1, -1), 3)
  assert.equal(moveAssetOperationActive(options, -1, -1), 3)
  assert.equal(moveAssetOperationActive([{ selectable: false }], -1, 1), -1)
  assert.equal(moveAssetOperationActive([], -1, 1), -1)
})
```

`tests/asset-operation-picker-ui.test.ts` (new):

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Server search Task 4 (spec 6.1, the approved mockup .superpowers/brainstorm/183-1793185385/content/search-picker.html).
// node --test cannot load .tsx, so these read the source with LF line endings.
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PART = "src/components/ui/asset-operation-picker.tsx"

test("AssetOperationPicker: a client part, one pick or many; the field's id names its root and the search field is <id>-search", () => {
  const source = read(PART)
  assert.match(source, /^"use client"\n/)
  assert.match(source, /^export function AssetOperationPicker\(props: AssetOperationPickerProps\) \{$/m)
  for (const part of [
    "multiple?: false", "value: AssetOperationSearchRow | null", "onChange: (row: AssetOperationSearchRow | null) => void",
    "multiple: true", "values: AssetOperationSearchRow[]", "onChange: (rows: AssetOperationSearchRow[]) => void",
    "context?: AssetOperationPickerContext", "initialQuery?: string",
    "const searchId = `${id}-search`", "const listboxId = `${id}-listbox`", "const labelId = `${id}-label`",
    "const errorId = shownError ? `${id}-error` : undefined", "<FieldError id={errorId}>{shownError}</FieldError>",
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /<div\s+id=\{id\}\s+data-slot="asset-operation-picker"\s+data-invalid=\{shownError \? true : undefined\}\s+className="grid min-w-0 max-w-full content-start gap-1\.5"/)
  // A chosen asset that cannot be taken (the ?assetId= arrival, spec 6.4) shows its reason as the field's error.
  assert.match(source, /const shownError = error \?\? \(chosenBlockedReason \? tAll\(chosenBlockedReason\) : null\)/)
})

test("asks the server once the text settles; an older answer never shows for a newer text; a failure is kept as failed (Review Focus 3, 5)", () => {
  const source = read(PART)
  assert.match(source, /const requestUrl = buildAssetOperationSearchUrl\(\{ mode, q: query, context \}\)/)
  assert.match(source, /const state = getAssetOperationPickerState\(\{ query, requestKey: requestUrl, result \}\)/)
  assert.match(source, /fetch\(requestUrl, \{ signal: controller\.signal \}\)/)
  assert.match(source, /\}, assetOperationPickerDebounceMs\)/)
  assert.match(source, /return \(\) => \{\s+window\.clearTimeout\(timer\)\s+controller\.abort\(\)\s+\}/)
  assert.match(source, /\}, \[requestUrl, attempt\]\)/)
  assert.match(source, /setResult\(\{ key: requestUrl, answer: null \}\)/)
  assert.match(source, /function retry\(\) \{\s+setResult\(null\)\s+setAttempt\(\(count\) => count \+ 1\)\s+searchRef\.current\?\.focus\(\)\s+\}/)
  assert.doesNotMatch(source, /\bthrow\b/)
})

test("the combobox Task 8 drives: the list, the active row, rows that cannot be taken, the chosen rows, a polite live region (spec 6.1)", () => {
  const source = read(PART)
  for (const part of [
    'role="combobox"', 'aria-autocomplete="list"', "aria-controls={listboxId}", "aria-expanded={listOpen}", 'autoComplete="off"',
    "aria-required={required || undefined}", "aria-invalid={shownError ? true : undefined}",
    'role="listbox"', "id={listboxId}", "aria-labelledby={labelId}",
    'role="option"', "data-asset-option={row.id}", "aria-selected={index === activeIndex}", "aria-disabled={view.selectable ? undefined : true}",
    "onMouseDown={(event) => event.preventDefault()}", "data-asset-option-reason", "data-asset-option-group={section.group.key}", "data-asset-picked={", "data-asset-search-count",
    'aria-live="polite"', '<mark className="rounded-sm bg-warning-soft px-0.5 text-foreground">',
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /aria-activedescendant=\{listOpen && activeIndex >= 0 \? `\$\{id\}-option-\$\{flatRows\[activeIndex\]\.id\}` : undefined\}/)
  assert.match(source, /id=\{`\$\{id\}-option-\$\{row\.id\}`\}/)
  assert.match(source, /\bmin-h-11\b/, "rows are 44px tall below md")
  assert.match(source, /splitSearchHighlight\(/)
  assert.match(source, /const liveText = state === "hint" \? announcement : open \? /)
  assert.ok(source.includes('aria-live="polite">{liveText}</span>'), "the region reads nothing while the list is closed")
  assert.ok(source.includes('setAnnouncement(t("selectedTitle", { count: values.length - 1 }))'), "a remove reads the new count")
  assert.ok(source.includes('setAnnouncement("")'), "typing clears the old count")
})

test("keys: the arrows skip what cannot be taken, Enter picks and never submits the form, Escape closes (spec 6.1)", () => {
  const source = read(PART)
  assert.match(source, /const activeIndex = resolveAssetOperationActive\(selectableRows, activeId\)/)
  assert.match(source, /moveAssetOperationActive\(selectableRows, activeIndex, event\.key === "ArrowDown" \? 1 : -1\)/)
  assert.match(source, /const selectableRows = flatRows\.map\(\(row\) => \(\{ id: row\.id, selectable: getAssetOperationRowView\(row, chosenIds\)\.selectable \}\)\)/)
  assert.match(source, /if \(event\.key === "Enter"\) \{\s+event\.preventDefault\(\)\s+if \(listOpen && activeIndex >= 0\)/)
  assert.match(source, /if \(event\.key === "Escape"\) \{\s+setOpen\(false\)/)
})

test("every word comes from messages: the states, the count, reasons through the root translator, groups, the รับคืน lines (spec 6.1, 6.3)", () => {
  const source = read(PART)
  for (const part of [
    'useTranslations("assetOperation")', 'useTranslations("common")', "const tAll = useTranslations()",
    't("searching")', 't("notFound")', 't("failed")', 'tCommon("tryAgain")', 'tCommon("searchSelectPlaceholder")',
    'tCommon("searchSelectResultCount", { count: countLine.count })', 't("resultCountMore", { count: countLine.count, shown: countLine.shown })',
    't("chosen")', 't("noHolderGroup")', 't("legacyLine")', 't("selectedTitle", { count: values.length })', 't("change")',
    't(mode === "checkin" ? "hintCheckin" : "hint")', "tAll(note.key)",
  ]) assert.ok(source.includes(part), part)
  assert.match(source, /t\("handoverLine", \{ documentNo: detail\.documentNo, date: formatDate\(detail\.checkoutDate\) \}\)/)
  assert.match(source, /t\("groupCount", \{ count: section\.group\.count \}\)/)
})

test("tokens only (N1, R1, N4, LT5) and the shared parts only (N3, GF2, GB1): no opacity, tint, dark: or color value; no raw button, input or spinner; no popover; no global listener", () => {
  const source = read(PART)
  assert.doesNotMatch(source, /\bopacity-|\bdark:|#[0-9a-fA-F]{3,8}\b|\brgba?\(|\b(?:bg|text|border|ring)-[a-z-]+\/\d+|cursor-not-allowed/)
  assert.doesNotMatch(source, /<button\b|<input\b|<Loader2\b|SearchableSelect|Popover/)
  assert.doesNotMatch(source, /(?:document|window)\.addEventListener\(/)
})

test("the picker's words, Thai and English (glossary: ผู้ถือครอง; Serial stays)", () => {
  const th = JSON.parse(read("messages/th.json"))
  const en = JSON.parse(read("messages/en.json"))
  const words: Record<string, [string, string]> = {
    hint: ["พิมพ์รหัสทรัพย์สิน ชื่อ Serial หรือชื่อผู้ถือครอง อย่างน้อย 2 ตัวอักษร", "Type an asset code, name, serial number or holder's name (at least 2 characters)"],
    hintCheckin: ["พิมพ์รหัสทรัพย์สิน ชื่อผู้ถือครอง หรือเลขที่เอกสารส่งมอบ อย่างน้อย 2 ตัวอักษร", "Type an asset code, the holder's name or the handover document no. (at least 2 characters)"],
    searching: ["กำลังค้นหา…", "Searching…"],
    notFound: ["ไม่พบทรัพย์สินที่ตรงกับคำค้น", "No asset matches this search"],
    failed: ["ค้นหาไม่สำเร็จ", "The search failed"],
    resultCountMore: ["พบ {count} รายการ แสดง {shown} รายการแรก พิมพ์เพิ่มเพื่อให้แคบลง", "{count} found, showing the first {shown}. Type more to narrow the list"],
    selectedTitle: ["ที่เลือกแล้ว {count} รายการ", "Chosen: {count}"],
    chosen: ["เลือกแล้ว", "Chosen"],
    change: ["เปลี่ยน", "Change"],
    changeNamed: ["เปลี่ยน{label} {tag}", "Change {label} {tag}"],
    removeNamed: ["นำ {tag} ออก", "Remove {tag}"],
    noHolderGroup: ["ไม่มีผู้ถือครอง", "No holder"],
    groupCount: ["ถืออยู่ {count} ชิ้น", "Holds {count}"],
    handoverLine: ["ใบส่งมอบ {documentNo} · ส่งมอบ {date}", "Handover {documentNo} · {date}"],
    legacyLine: ["ข้อมูลเก่า (ไม่มีใบส่งมอบ)", "Legacy data (no handover document)"],
  }
  for (const [key, [thai, english]] of Object.entries(words)) {
    assert.equal(th.assetOperation?.[key], thai, `th ${key}`)
    assert.equal(en.assetOperation?.[key], english, `en ${key}`)
  }
  assert.equal(th.common.searchSelectResultCount, "พบ {count} รายการ")
  assert.equal(th.common.tryAgain, "ลองอีกครั้ง")
})

test("DESIGN.md and docs/14 describe AssetOperationPicker, and the guards know it as a shared part with its own label", () => {
  const design = read("DESIGN.md")
  const start = design.indexOf("- **`AssetOperationPicker`**")
  const block = design.slice(start, design.indexOf("- **Migration:** phase 2C batch 1"))
  assert.ok(start > design.indexOf("- **`FileQueueList`**") && block.length > 0, "an Inputs / Fields bullet after FileQueueList")
  for (const phrase of [
    "`src/components/ui/asset-operation-picker.tsx`", "It never holds a list of the register", "`role=\"combobox\"`",
    "after 2 characters and a 250 ms pause", "an older answer never replaces a newer one", "at most 20 rows",
    "no fill and no opacity", "`aria-disabled`", "never shown as not found", "Enter picks and never submits the form",
    "`<id>-search`", "Never inside `Field`",
  ]) assert.ok(block.includes(phrase), phrase)
  const index = read("docs/14_UI_UX_DESIGN_SYSTEM.md")
  const row = index.slice(index.indexOf("\n| An asset for a transaction"), index.indexOf("\n| An action menu |"))
  assert.ok(row.length > 0 && index.indexOf("\n| An asset for a transaction") > index.indexOf("\n| A searchable picker | `SearchableSelect` |"), "the row follows SearchableSelect")
  for (const phrase of ["`AssetOperationPicker`", "never holds a list of the register", "stays listed with its reason", "`multiple` with `values`", "never inside `Field`"]) assert.ok(row.includes(phrase), phrase)
  const listFrame = read("tests/list-frame-guards.test.ts")
  assert.match(listFrame, /const UI_NAME = \/\\bfunction \(\?:[^/]*\|Nil\|AssetOperationPicker\|DesktopSelectionBar\)\\b\/g/)
  assert.match(listFrame, /LN2: \["asset-operation-picker", "data-table", "desktop-selection-bar", "empty-note"/)
  assert.ok(read("tests/validation-guards.test.ts").includes('const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField", "AssetOperationPicker"]'))
  const forms = read("tests/form-migration-guards.test.ts")
  assert.ok(forms.includes('for (const tag of findJsxTags(children, ["SearchableSelect", "AssetOperationPicker"])) problems.push(`${where}: ${tag.name} inside Field (it renders its own label)`)'))
  assert.ok(forms.includes("/<(Field|FileDropzone|ScannerTextInput|SearchableSelect|AssetOperationPicker|label)(?=[\\s/>])/"))
})
```

- [ ] **Step 2: Run them to see them fail**

Run: `node --test tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts`

Expected:
- the rules file fails with `ERR_MODULE_NOT_FOUND` (`asset-operation-picker-rules.ts`);
- the UI file fails with `ENOENT` (`asset-operation-picker.tsx`) and on the missing `assetOperation` words, the DESIGN.md block and the guard lines.

- [ ] **Step 3: Write `src/lib/asset-operation-picker-rules.ts`** with the Produces signatures above. Each body follows from its test. Two rules the tests do not fully show:
  - `buildAssetOperationSearchUrl` returns `null` when no `id` is given and `isAssetOperationSearchReady(q ?? "")` is false. Otherwise it returns Task 3's `buildAssetOperationSearchHref` with `mode`, then `id` (when given; `q` is then ignored) or `q.trim()`, then `assignCustodian` and `handedOverAssetId` from `context`. The parameter names and the 2-character rule stay in Task 3's file (S-R21).
  - `getAssetOperationRowDetail` gives `handover` only when `row.checkout?.documentNo` is set; a handover without a number reads as `place` (S-R22).
  - `buildAssetOperationSections` makes one `{ group: null, rows }` section when `answer.groups` is undefined. Otherwise it makes one section per group in the server's order with the rows whose `holderKey` is that group's key, keeping the rows' order and dropping a group with no rows. Rows matching no group come in a trailing `{ group: null }` section.

  Imports: `import type` from `./asset-operation-eligibility.ts`; `buildAssetOperationSearchHref`, `isAssetOperationSearchReady` and the types from `./asset-operation-search-rules.ts`.

  Run: `node --test tests/asset-operation-picker-rules.test.ts`. Expected: PASS (8 tests).

- [ ] **Step 4: Add the words**

Write `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/server-search/t4-messages.json` as `{ "set": { "th": { "assetOperation.<key>": "…" }, "en": { … } } }`. It holds the 15 keys and words of the words test in Step 1, `th` and `en`. Then run `node scripts/messages-edit.mjs C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/server-search/t4-messages.json`.

Expected: `messages updated: 15 th, 15 en, 0 deleted`.

Then run `node --test tests/thai-glossary.test.ts`. Expected: PASS. ("ถืออยู่" is not the banned short "ผู้ถือ", and "Serial" stays by glossary §2.3.)

- [ ] **Step 5: Write `src/components/ui/asset-operation-picker.tsx`**

Write it with the Produces props and the markup the UI test pins. These decisions are not fully fixed by the pins:
  - **State.**
    - Component state: `query` (`initialQuery ?? ""`), `open` (`Boolean(initialQuery)`), `result: AssetOperationPickerResult | null`, `attempt`, `activeId` and `announcement`.
    - Refs: `searchRef`, `changeRef`, and `focusRequest` (`"search" | "change" | null`).
    - Derived on every render:
      - `requestUrl` and `state`;
      - `answer`: `result.answer` when `state === "results"`, else `null`;
      - `sections = answer ? buildAssetOperationSections(answer) : []` and `flatRows`;
      - `chosenIds`: the ids of `values` (many), or empty (one: the list only shows while nothing is chosen);
      - `selectableRows = flatRows.map((row) => ({ id: row.id, selectable: getAssetOperationRowView(row, chosenIds).selectable }))`, one entry per row of `flatRows` in the same order (never filtered), so `activeIndex` from `resolveAssetOperationActive(selectableRows, activeId)` and `moveAssetOperationActive(selectableRows, …)` indexes `flatRows` directly; Enter picks `flatRows[activeIndex]`, and each rendered row's `index` (in `aria-selected={index === activeIndex}`) is its position in `flatRows`, not within its section;
      - `listOpen = open && state === "results"`;
      - `countLine`;
      - `chosenBlockedReason`: a single `value` with `eligible: false` → its `reasonKey`, else `null`.
  - **Fetch effect** on `[requestUrl, attempt]`. It returns at once when `requestUrl` is `null`. After `assetOperationPickerDebounceMs` it fetches.
    - `response.ok` → `setResult({ key: requestUrl, answer: payload.data })`.
    - Any other status, or an error that is not `AbortError` → `setResult({ key: requestUrl, answer: null })`.
    - No `setState` runs in the effect body itself (`react-hooks/set-state-in-effect`).
  - **Pick** (a click, or Enter while `listOpen && activeIndex >= 0`; rows that cannot be taken ignore both). Enter always calls `event.preventDefault()` first, so it never submits the form. When the list is closed (after Escape, or before any answer) Enter does nothing else. ↑↓ move the active row only while `listOpen`; while the list is closed they call `setOpen(true)` and move nothing. Like `global-search.tsx:214`, no key ever acts on a row the user cannot see.
    - One: `onChange(row)`, close the list, `focusRequest = "change"`.
    - Many: `onChange([...values, row])`, `setQuery("")`, `setAnnouncement(t("selectedTitle", { count: values.length + 1 }))`, and focus stays in the search field.
  - **เปลี่ยน and remove.**
    - "เปลี่ยน" (one pick): `onChange(null)`, `setQuery("")`, `focusRequest = "search"`.
    - Remove (`Button variant="outline" size="icon-sm"`, `aria-label={t("removeNamed", { tag })}`, an `X` icon): `onChange(values without it)`, `setAnnouncement(t("selectedTitle", { count: values.length - 1 }))`, then focus the search field.
    - The search field's `onChange` runs `setQuery(event.target.value)`, `setOpen(true)` and `setAnnouncement("")`, so an old chosen count is never read again.
    - A `useEffect` on `[value, values]` carries out `focusRequest`, so refs are never read during render (`react-hooks/refs`).
  - **Open and close.**
    - The list opens on focus and on typing.
    - It closes on Escape, on a pick, and when focus leaves the root. The root `div` takes `onBlur` (React's bubbling focusout) and closes when `event.relatedTarget` is null or not inside the root (`event.currentTarget.contains(event.relatedTarget)`). There is no `document` or `window` listener (guard `tests/ui-overlay-guards.test.ts:78-81`, "no global listeners for closing overlays"). The panel frame takes `onMouseDown={(event) => event.preventDefault()}`, as the rows do, so a press on the count line or a group line keeps focus in the field. A list opened by `initialQuery` before the field has focus stays open until focus enters and leaves the root, or until Escape.
    - Rows prevent `mousedown`, so a tap on the phone (WebKit) never blurs the field before its click.
  - **Order inside the root.**
    1. `FieldLabel` (`id={labelId}`, `htmlFor={searchId}` while the search field shows).
    2. The control:
       - one pick: the chosen box `[data-asset-picked]`, a `flex` row with `rounded-md border border-border bg-surface`. It holds `tag font-medium` + name over the detail line, and `Button ref={changeRef} variant="outline" size="sm"` with `t("change")`, `aria-label={t("changeNamed", { label, tag })}` and `aria-describedby={errorId}`;
       - otherwise: a `Search` icon + `Input` (`pl-9`). The `Input` takes `ref={searchRef}`, `id={searchId}`, the combobox attributes, `placeholder={tCommon("searchSelectPlaceholder")}`, and `aria-describedby` = error then hint.
    3. `FieldHint` (`id={`${id}-hint`}`).
    4. `FieldError`.
    5. The panel, while `open` and `state !== "hint"`, in a `rounded-md border border-border bg-surface` frame:
       - loading: one muted line `t("searching")`;
       - empty: `EmptyNote` `t("notFound")`;
       - error: `text-danger` `t("failed")` + `Button variant="outline" size="sm" onClick={retry}` `tCommon("tryAgain")`;
       - results: the listbox `ul`, which scrolls itself (`max-h-80 overflow-y-auto`, like `global-search.tsx:389`), and then the count line.
    6. Many picks: `t("selectedTitle")` over a `ul` of chosen rows (`max-h-56 overflow-y-auto`, divided).
  - **The always-rendered** `<span className="sr-only" aria-live="polite">{liveText}</span>`, with `const liveText = state === "hint" ? announcement : open ? <state text> : ""`. The state text is `t("searching")`, `t("notFound")`, `t("failed")` or the count line. While the list is closed it reads nothing: after a single pick, or after Escape or a blur, a search that `context` sets off again (a custodian chosen on โอนย้าย, a new handed-over asset for `checkoutParent`) is never read. One pick never sets `announcement`, so its hint state reads nothing.
  - **Rows.**
    - Line 1: the tag in its own `<span className="tag font-medium">` (highlighted with `splitSearchHighlight` in a local `function TagHighlight`) · the name.
    - Line 2: the detail.
      - handover → `t("handoverLine", …)`;
      - legacy → `t("legacyLine")`;
      - place → `statusLabel` and `placeLabel` joined with " · ".
    - Then the note.
      - `chosen` → `t("chosen")`;
      - `reason` → `tAll(note.key)`.
      - It shows in `<span data-asset-option-reason className="text-meta text-warning">`.
    - The active row has `bg-primary-soft`.
    - A row that cannot be taken has `text-faint-foreground` and no fill.
    - `onMouseEnter` makes a row active only when it can be taken.
    - On รับคืน each section is `li role="presentation" data-asset-option-group={section.group.key}` > a group line > `ul role="group" aria-labelledby`, as `global-search.tsx:395-425` does:
      - a holder group line is its label, highlighted, then `t("groupCount", { count: section.group.count })`;
      - the `none` group's line is `t("noHolderGroup")`, with no count.

  Run: `node --test tests/asset-operation-picker-ui.test.ts`. Expected: still FAIL, on the DESIGN.md, docs/14 and guard assertions only.

- [ ] **Step 6: Register the part in the docs and the guards**
  - `DESIGN.md`, a new bullet between `:509` and `:510`:

    ```markdown
    - **`AssetOperationPicker`** (`src/components/ui/asset-operation-picker.tsx`, a client component; server search spec 2026-10-28 §6.1): the asset field of ส่งมอบ, รับคืน, โอนย้าย and ย้ายที่ตั้งหลายรายการ. It never holds a list of the register.
      - A search field (`role="combobox"` with `aria-activedescendant`, the field's label, a hint of what can be typed) asks `GET /api/asset-operations/search` after 2 characters and a 250 ms pause. An answer shows only for the text it was asked for, so an older answer never replaces a newer one.
      - The list sits under the field (no popover): at most 20 rows and "พบ N รายการ" with the true total ("พิมพ์เพิ่มเพื่อให้แคบลง" over 20). A row is the tag (`tag`, the typed part in a `<mark>` on `bg-warning-soft`) and the name, then the status and the place. On รับคืน the second line is the handover document or "ข้อมูลเก่า (ไม่มีใบส่งมอบ)", under one line per holder ("ถืออยู่ N ชิ้น"; "ไม่มีผู้ถือครอง" last). Rows are at least 44px tall below `md`.
      - A row the transaction cannot take stays listed: faint ink, no fill and no opacity, `aria-disabled`, skipped by the arrow keys and ignored by a click or tap. Its reason sits under it in `text-warning`, in the asset page's words. A row already chosen reads "เลือกแล้ว" the same way.
      - States: the hint under 2 characters, "กำลังค้นหา…", "ไม่พบทรัพย์สินที่ตรงกับคำค้น", and "ค้นหาไม่สำเร็จ" with "ลองอีกครั้ง", which is never shown as not found. A polite live region, always rendered, reads them and the count while the list is open, and the chosen count after a pick or a remove.
      - Keys: ↑↓ move, Enter picks and never submits the form, Escape closes; focus stays in the search field.
      - One pick: the chosen asset shows in the field with "เปลี่ยน", which takes focus after a pick. A chosen asset the transaction cannot take shows its reason as the field's error.
      - Many picks (`multiple`): "ที่เลือกแล้ว N รายการ" under the field, with a remove button per row. A pick clears the search and keeps focus in it.
      - `id` names the part's root, so a save's `focusFirst` reaches the search field (or "เปลี่ยน"). The search field is `<id>-search` and the error `<id>-error`. Never inside `Field`: it has its own label (guards GF4 and GF8). A required one takes `error` (guard V4).
    ```
  - `docs/14_UI_UX_DESIGN_SYSTEM.md`, a new row after `:66`:

    ```markdown
    | An asset for a transaction (ส่งมอบ, รับคืน, โอนย้าย, ย้ายที่ตั้งหลายรายการ) | `AssetOperationPicker` | asks the server search with the page's `mode` and `context` and never holds a list of the register; a row it cannot take stays listed with its reason; `multiple` with `values` for many picks; `id` and `error` as `SearchableSelect` (the search field is `<id>-search`); never inside `Field` |
    ```
  - `tests/list-frame-guards.test.ts`:
    - `:67`: `…|EmptyNote|Nil|AssetOperationPicker|DesktopSelectionBar)\b/g`;
    - `:130-131`: add AssetOperationPicker to the comment;
    - `:132`: `LN2: ["asset-operation-picker", "data-table", "desktop-selection-bar", "empty-note", …]`.
  - `tests/validation-guards.test.ts`:
    - `:122`: "(SearchableSelect, its two wrappers and AssetOperationPicker)";
    - `:138`: `const SELECT_TAGS = ["SearchableSelect", "MaintenanceOptionSelect", "AuditScanCheckField", "AssetOperationPicker"]`.
  - `tests/form-migration-guards.test.ts`:
    - `:269` becomes `for (const tag of findJsxTags(children, ["SearchableSelect", "AssetOperationPicker"])) problems.push(\`${where}: ${tag.name} inside Field (it renders its own label)\`)`;
    - `:317`'s pattern becomes `/<(Field|FileDropzone|ScannerTextInput|SearchableSelect|AssetOperationPicker|label)(?=[\s/>])/`.

  Run: `node --test tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/list-frame-guards.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts tests/ui-overlay-guards.test.ts tests/visual-foundation-guards.test.ts tests/desktop-selection-bar.test.ts tests/phase2d-docs.test.ts tests/dark-mode-docs.test.ts tests/thai-glossary.test.ts`

  Expected: PASS.

- [ ] **Step 7: Run the whole check**
  - `npm test`: PASS (no other pin names the new files).
  - `npx tsc --noEmit`: 0 errors.
  - `npm run lint`: 0 errors.

- [ ] **Step 8: Commit**

```bash
git add src/lib/asset-operation-picker-rules.ts src/components/ui/asset-operation-picker.tsx tests/asset-operation-picker-rules.test.ts tests/asset-operation-picker-ui.test.ts tests/list-frame-guards.test.ts tests/validation-guards.test.ts tests/form-migration-guards.test.ts DESIGN.md docs/14_UI_UX_DESIGN_SYSTEM.md messages/th.json messages/en.json
git commit -F - <<'EOF'
feat(ui): AssetOperationPicker, the one asset picker of the transaction pages on the server search; a row it cannot take stays listed with its reason and an older answer never shows (server search Task 4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Page data on the master lists + ส่งมอบ and โอนย้าย on the picker

**Files:**
- Modify: `src/lib/asset-operation-options.ts:1-175` (the master loader, the preselect, and the remaining asset lists kept for รับคืน and ย้ายที่ตั้งหลายรายการ until Tasks 6-7)
- Modify: `src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx:1-28`, `.../transfer/page.tsx:1-27`, `.../checkin/page.tsx:1,14-15`, `.../bulk-move/page.tsx:1,11-14`
- Modify: `src/components/asset-operations/checkout-form.tsx:3,21-32,35-47,84,100-180,189-199,208-228,249-305,421-426,460-471`
- Modify: `src/components/asset-operations/transfer-form.tsx:3,15-32,51,57-134,146,175-185`
- Modify: `src/lib/asset-lifecycle-policy.ts:158-160,191-193` (delete the two list filters once grep finds no reader)
- Create: `src/lib/asset-operation-form-rules.ts` (pure)
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs`)
- Test (create): `tests/asset-operation-picker-forms.test.ts`, `tests/asset-operation-master-options.test.ts`
- Test (rewrite pins): `tests/v-track2-o.test.ts:83-90,102,118,146-147,216,220,223`, `tests/e2e-transactions.test.ts:114-117`, `tests/asset-operation-options.test.ts:5-25`

**Interfaces:**
- Consumes:
  - Task 1: `type AssetOperationMode` (`src/lib/asset-operation-eligibility.ts`).
  - Task 3: `searchAssetOperationOptions(db: AssetOperationSearchDb, input: AssetOperationSearchInput): Promise<AssetOperationSearchAnswer>` (`src/lib/asset-operation-search.ts`, S-R17); `type AssetOperationSearchRow`, `type AssetOperationSearchInput` (`{ mode, q, id, assignCustodian, handedOverAssetId }`, S-R18) and `buildAssetOperationSearchHref` (`src/lib/asset-operation-search-rules.ts`, S-R21); `GET /api/asset-operations/search?mode=transfer&id=<id>&assignCustodian=1` → `{ data: AssetOperationSearchAnswer }`.
  - Task 4: `AssetOperationPicker` (`src/components/ui/asset-operation-picker.tsx`), single pick: `{ id: string; label: string; mode: AssetOperationMode; value: AssetOperationSearchRow | null; onChange: (row: AssetOperationSearchRow | null) => void; context?: { assignCustodian?: boolean; handedOverAssetId?: string | null }; required?: boolean; error?: React.ReactNode }`. A chosen row that cannot be taken stays chosen; the page's `error` wins over the picker's own reason (S-R27).
- Produces:
  - `src/lib/asset-operation-options.ts`:
    - `export type AssetOperationOption = { id: string; label: string }`
    - `export type AssetOperationNamedOption = AssetOperationOption & { name: string }`
    - `export type AssetOperationMasterOptions = { employees: AssetOperationOption[]; departments: AssetOperationOption[]; locations: AssetOperationOption[]; statuses: AssetOperationNamedOption[]; conditions: AssetOperationNamedOption[] }`
    - `export async function getAssetOperationMasterOptions(): Promise<AssetOperationMasterOptions>` — today's queries at :57-77 and maps at :142-147, nothing else.
    - `export async function getAssetOperationPreselect(mode: AssetOperationMode, assetId: string | string[] | undefined): Promise<AssetOperationSearchRow | null>` — the id is `Array.isArray(assetId) ? assetId[0] : assetId` (a repeated `?assetId=` reaches the page as an array, `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md:115`; the codebase's rule, as `src/lib/asset-return-navigation.ts:9`). With no non-empty string, no query and null. Otherwise Task 3's by-id answer, `rows[0] ?? null` (S-R5, S-R17).
    - Transitional `export async function getAssetOperationAssetLists(master: Pick<AssetOperationMasterOptions, "departments" | "locations">): Promise<{ assets: { id: string; label: string; disabled: boolean }[]; activeCheckouts: …; legacyReturnCandidates: … }>` — today's :13-56, :80-85, :88-92, :106-141 and :151-175 verbatim (shapes unchanged), the department/location label maps built from `master`'s labels; `checkoutAssets`, `personalTransferAssets`, `statusName` and `personalTransferEligible` go. Task 6 stops calling it and leaves it whole; Task 7 deletes it (S-R29).
    - `getAssetOperationOptions` is deleted.
  - `src/lib/asset-operation-form-rules.ts` (pure, `import type` only):
    - `assetOperationRowLabel(row: Pick<AssetOperationSearchRow, "assetTag" | "name">): string` — today's label `"TAG - name"` (banner, review).
    - `chosenAssetReasonKey(row: Pick<AssetOperationSearchRow, "eligible" | "reasonKey"> | null): string | null`
    - `export type ClearedTransferAsset = { assetTag: string; reasonKey: string }`
    - `transferAssetToClear(current: { asset: Pick<AssetOperationSearchRow, "id"> | null; toCustodianId: string }, rechecked: Pick<AssetOperationSearchRow, "id" | "assetTag" | "eligible" | "reasonKey"> | null): ClearedTransferAsset | null`
  - `CheckoutForm` props: `{ employees: Option[]; departments: Option[]; locations: Option[]; conditions: Option[]; initialAsset: AssetOperationSearchRow | null; returnTo?: string }` (`assets`, `initialAssetId` go).
  - `TransferForm` props: `{ employees: Option[]; departments: Option[]; locations: Option[]; initialAsset: AssetOperationSearchRow | null; returnTo?: string }`.
  - Message `transfer.assetClearedForCustodian` th `"นำ {assetTag} ออกแล้ว: {reason}"`, en `"Removed {assetTag}: {reason}"` (*my call*); `checkout.selectAsset`, `transfer.selectAsset` deleted (no reader: the picker takes no placeholder).

Decisions:
- All four pages call `getAssetOperationMasterOptions()`. ส่งมอบ and โอนย้าย load no asset at all: `?assetId=` becomes one row through `getAssetOperationPreselect`, called after `requirePagePermission` (the refusal pin in `tests/e2e-cross-cutting.test.ts:107-125` reads that order). รับคืน and ย้ายที่ตั้งหลายรายการ also call the transitional `getAssetOperationAssetLists(master)` so their forms keep working until Tasks 6-7.
- Preselect (spec 6.4): takeable → chosen + today's banner; not takeable → chosen-but-blocked: the row is the value, its reason shows under the field from arrival, and save stops on it with focus there (`validate` code `"invalid"`, displayed as the reason). The banner shows only for a takeable row.
- "ทรัพย์สินอื่น" (`checkoutType === "asset"`): `#checkout-destination` is the picker (mode `checkoutParent`, `handedOverAssetId`); the other three types keep their `SearchableSelect`. A new asset equal to the chosen destination clears the destination.
- โอนย้าย: the picker passes `assignCustodian: Boolean(values.toCustodianId)`. Choosing a custodian while an asset is chosen asks the search by id under the assign rule; when the answer says it no longer fits, the asset is cleared and the field reads "นำ {tag} ออกแล้ว: {reason}". A failed or late answer (another asset chosen since, custodian cleared since) changes nothing; the save route still refuses.

- [ ] **Step 1: Write the failing test of the form rules and the page/form pins** — create `tests/asset-operation-picker-forms.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { assetOperationRowLabel, chosenAssetReasonKey, transferAssetToClear } from "../src/lib/asset-operation-form-rules.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const P = "src/app/[locale]/(dashboard)/asset-management/"
const C = "src/components/asset-operations/"
const row = (overrides: Record<string, unknown> = {}) => ({ id: "a1", assetTag: "NB-0228", name: "Notebook Dell", eligible: true, reasonKey: null as string | null, ...overrides })

test("a chosen row reads as today's label, and its reason only when the transaction cannot take it (server search Task 5)", () => {
  assert.equal(assetOperationRowLabel(row()), "NB-0228 - Notebook Dell")
  assert.equal(chosenAssetReasonKey(null), null)
  assert.equal(chosenAssetReasonKey(row()), null)
  assert.equal(chosenAssetReasonKey(row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" })), "asset.transactionReasonStatusNotReady")
})

test("a custodian chosen after the asset clears it only when the answer says it no longer fits, never on a late answer (spec 6.3)", () => {
  const chosen = { asset: row(), toCustodianId: "emp-1" }
  const blocked = row({ eligible: false, reasonKey: "asset.transactionReasonStatusNotTransferable" })
  assert.deepEqual(transferAssetToClear(chosen, blocked), { assetTag: "NB-0228", reasonKey: "asset.transactionReasonStatusNotTransferable" })
  assert.equal(transferAssetToClear(chosen, row()), null, "still fits")
  assert.equal(transferAssetToClear(chosen, null), null, "the search failed: the save route decides")
  assert.equal(transferAssetToClear(chosen, { ...blocked, id: "a2" }), null, "another asset chosen since")
  assert.equal(transferAssetToClear({ ...chosen, toCustodianId: "" }, blocked), null, "custodian cleared since")
  assert.equal(transferAssetToClear({ asset: null, toCustodianId: "emp-1" }, blocked), null, "nothing chosen")
})

test("the four pages load the master lists; ส่งมอบ and โอนย้าย start from the by-id answer, asked after the permission (spec §3, 6.4)", () => {
  for (const page of ["checkout", "transfer"]) {
    const source = read(`${P}${page}/page.tsx`)
    const permission = source.indexOf('await requirePagePermission(locale, "asset", "edit")')
    assert.ok(permission >= 0 && permission < source.indexOf(`getAssetOperationPreselect("${page}", filters.assetId)`), page)
    assert.ok(source.includes("getAssetOperationMasterOptions()") && source.includes("initialAsset={initialAsset}"), page)
    assert.doesNotMatch(source, /getAssetOperationAssetLists|initialAssetId|assets=/, page)
  }
  for (const page of ["checkout", "checkin", "transfer", "bulk-move"]) assert.doesNotMatch(read(`${P}${page}/page.tsx`), /getAssetOperationOptions\(/, page)
})

test("ส่งมอบ: the asset and the ทรัพย์สินอื่น destination are the shared picker; an asset that arrived blocked reads its reason under the field (spec 6.3, 6.4)", () => {
  const source = read(`${C}checkout-form.tsx`)
  assert.ok(source.includes('import { AssetOperationPicker } from "@/components/ui/asset-operation-picker"'))
  assert.match(source, /<AssetOperationPicker\n\s+id="checkout-asset"\n\s+label=\{t\("asset"\)\}\n\s+mode="checkout"\n\s+value=\{values\.asset\}\n\s+required\n\s+error=\{errorText\("assetId"\)\}\n\s+onChange=\{setAsset\}/)
  assert.match(source, /\{values\.checkoutType === "asset" \? \(\n\s+<AssetOperationPicker\n\s+id="checkout-destination"\n\s+label=\{t\("checkoutTo"\)\}\n\s+mode="checkoutParent"\n\s+context=\{\{ handedOverAssetId: values\.asset\?\.id \}\}/)
  assert.ok(source.includes('if (key === "assetId" && assetReasonKey) return tAll(assetReasonKey)'))
  assert.ok(source.includes("parentAsset: current.parentAsset?.id === asset?.id ? null : current.parentAsset"))
  assert.match(source, /\{initialAsset\?\.eligible \? \(\n\s+<div className="md:col-span-2">\n\s+<FormContextBanner label=\{t\("asset"\)\} value=\{assetOperationRowLabel\(initialAsset\)\} \/>/)
  assert.ok(source.includes("const response = await fetch(`/api/assets/${values.asset?.id}/checkout`, {"))
  assert.doesNotMatch(source, /options=\{assets\}|assets\.(?:filter|find)\(|initialAssetId|t\("selectAsset"\)/)
})

test("โอนย้าย: the asset is the shared picker under the custodian's rule; a custodian chosen after it asks again and clears it with the reason (spec 6.3, 6.4)", () => {
  const source = read(`${C}transfer-form.tsx`)
  assert.match(source, /<AssetOperationPicker\n\s+id="transfer-asset"\n\s+label=\{t\("asset"\)\}\n\s+mode="transfer"\n\s+context=\{\{ assignCustodian: Boolean\(values\.toCustodianId\) \}\}\n\s+value=\{values\.asset\}\n\s+required\n\s+error=\{assetError\}\n\s+onChange=\{setAsset\}/)
  assert.ok(source.includes('if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)'))
  assert.ok(source.includes('buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })'))
  assert.ok(source.includes("const cleared = transferAssetToClear(current, rechecked)"))
  assert.ok(source.includes('t("assetClearedForCustodian", { assetTag: values.clearedAsset.assetTag, reason: tAll(values.clearedAsset.reasonKey) })'))
  assert.match(source, /\{initialAsset\?\.eligible \? \(/)
  assert.doesNotMatch(source, /personalTransferEligible|availableAssets|initialAssetId|t\("selectAsset"\)/)
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.transfer.assetClearedForCustodian, "นำ {assetTag} ออกแล้ว: {reason}")
  assert.equal(en.transfer.assetClearedForCustodian, "Removed {assetTag}: {reason}")
  for (const [locale, messages] of [["th", th], ["en", en]]) {
    assert.equal(messages.checkout.selectAsset, undefined, `${locale}.checkout.selectAsset has no reader and is removed`)
    assert.equal(messages.transfer.selectAsset, undefined, `${locale}.transfer.selectAsset has no reader and is removed`)
  }
})
```

- [ ] **Step 2: Write the failing loader test** — create `tests/asset-operation-master-options.test.ts` with the module-hook harness of `tests/audit-finding-review-route.test.ts:79-98` (copy the `registerHooks` block as is). Mocks: `@/lib/db` = a proxy whose `<model>.<method>()` pushes `"<model>.<method>"` to `globalThis.__masterState.calls` and returns `globalThis.__masterFixtures[model] ?? []`; `@/lib/asset-operation-search` = `searchAssetOperationOptions(db, input)` that pushes `{ input }` to `__masterState.searchCalls` and returns `{ mode: input.mode, total: rows.length, rows: __masterState.rows }`. Fixtures: `employee [{ id: "e1", code: "E001", fullNameTh: "สมชาย ใจดี" }]`, `department [{ id: "d1", code: "IT", name: "ไอที" }]`, `location [{ id: "l1", code: "HQ-01", name: "ห้อง 101" }]`, `assetStatus [{ id: "s1", name: "Ready", nameTh: "พร้อมใช้งาน" }]`, `assetCondition [{ id: "c1", name: "Good", nameTh: "ดี" }]`. Then `const options = await import(pathToFileURL("src/lib/asset-operation-options.ts").href)` and:

```ts
test("the transaction pages' master lists read no asset, handover or repair (server search Task 5, spec §3 goal 1)", async () => {
  state.calls = []
  assert.deepEqual(await options.getAssetOperationMasterOptions(), {
    employees: [{ id: "e1", label: "E001 - สมชาย ใจดี" }],
    departments: [{ id: "d1", label: "IT - ไอที" }],
    locations: [{ id: "l1", label: "HQ-01 - ห้อง 101" }],
    statuses: [{ id: "s1", label: "พร้อมใช้งาน", name: "Ready" }],
    conditions: [{ id: "c1", label: "ดี", name: "Good" }],
  })
  assert.deepEqual([...state.calls].sort(), ["assetCondition.findMany", "assetStatus.findMany", "department.findMany", "employee.findMany", "location.findMany"])
})

test("?assetId= is one by-id answer under the page's rule, and no query without it (spec 6.4, S-R5)", async () => {
  const chosen = { id: "a1", assetTag: "NB-0228", name: "Notebook Dell", eligible: false, reasonKey: "asset.transactionReasonStatusNotReady" }
  state.searchCalls = []
  state.rows = [chosen]
  assert.equal(await options.getAssetOperationPreselect("checkout", undefined), null)
  assert.equal(state.searchCalls.length, 0)
  assert.deepEqual(await options.getAssetOperationPreselect("transfer", "a1"), chosen)
  assert.deepEqual(state.searchCalls, [{ input: { mode: "transfer", q: "", id: "a1", assignCustodian: false, handedOverAssetId: null } }])
  assert.deepEqual(await options.getAssetOperationPreselect("checkout", ["a1", "a2"]), chosen, "a repeated ?assetId= takes the first, as Next hands it an array")
  assert.equal(state.searchCalls.length, 2)
  assert.deepEqual(state.searchCalls.at(-1), { input: { mode: "checkout", q: "", id: "a1", assignCustodian: false, handedOverAssetId: null } })
  state.rows = []
  assert.equal(await options.getAssetOperationPreselect("checkout", "gone"), null)
})
```

- [ ] **Step 3: Rewrite the pins this task breaks**
  - `tests/e2e-transactions.test.ts:114-117` → comment: the four pages load the master lists (`getAssetOperationMasterOptions`); ส่งมอบ and โอนย้าย ask the server search, รับคืน and ย้ายที่ตั้งหลายรายการ still load their lists until Tasks 6-7, so the arrival wait stays (S-R8). Assertions: `/export async function getAssetOperationMasterOptions\(\): Promise<AssetOperationMasterOptions>/` on the loader; each of the four pages matches `/getAssetOperationMasterOptions\(\)/`. Line 118 (`30_000`) unchanged.
  - `tests/v-track2-o.test.ts:83` `assertOperationForm(source, form: { ids; noValidate?: false; shared?: readonly string[] })`; `:89-91` expects `form.shared?.includes(id) ? 2 : 1` occurrences, message `id "${id}" once on the page`; comment: a shared id is one control of two rendered by a condition. `:102` passes `shared: ["checkout-destination"]`.
  - `:118` → `'check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))'`.
  - `:146` → `/<AssetOperationPicker\n\s+id="checkout-asset"\n/`; `:147` keeps `/<SearchableSelect\n\s+id="checkout-destination"\n/` and adds `/<AssetOperationPicker\n\s+id="checkout-destination"\n/`.
  - `:216` → the same `required(values.asset) ?? …` rule as `:118`.
  - `:220` → loop over `["toLocationId", "reason"]` only, plus `assert.ok(source.includes("error={assetError}"))`.
  - `:223` → `/<AssetOperationPicker\n\s+id="transfer-asset"\n\s+label=\{t\("asset"\)\}\n[\s\S]*?error=\{assetError\}/`.
  - `tests/asset-operation-options.test.ts:5-25`: drop those two names from the import (keep `filterLegacyReturnEligibleAssets`), the `assets` list (`:11-17`) that only they read, and the two tests of `filterCheckoutEligibleAssets` / `filterPersonalTransferEligibleAssets`; Step 6 deletes both filters, and Task 1's verdict tests hold those rules by value (S-R31).
  - Checked and not broken: `tests/asset-handover-checkout.test.ts:56` (one `<FormContextBanner `), `tests/legacy-checkin-flow.test.ts:11-26`, `tests/asset-operation-options.test.ts:39-45`, `tests/open-repair-filter.test.ts:7`, `tests/asset-transaction-cancellation-routes.test.ts:26`, `tests/list-frame-guards.test.ts:176` (the transitional lists keep that text verbatim), `tests/e2e-cross-cutting.test.ts:219-221,236-238,250`, `tests/e2e-fixes.test.ts:142,172-176`, `tests/form-migration-guards.test.ts:87-88`, `tests/validation-guards.test.ts` (each picker has `required` and `error`), `tests/operations-sweep-ui.test.ts:77-88`, `tests/form-frames-ui.test.ts:95-108`, `tests/file-evidence-ui.test.ts:138-141`, `tests/choice-controls-ui.test.ts:74-80`.

- [ ] **Step 4: Run them to see them fail**
  Run: `node --test tests/asset-operation-picker-forms.test.ts tests/asset-operation-master-options.test.ts tests/v-track2-o.test.ts tests/e2e-transactions.test.ts`
  Expected: FAIL — `ERR_MODULE_NOT_FOUND` for `asset-operation-form-rules.ts`; `options.getAssetOperationMasterOptions is not a function`; the rewritten v-track2-o and e2e-transactions pins.

- [ ] **Step 5: Implement `src/lib/asset-operation-form-rules.ts`** — the four exports above; `transferAssetToClear` returns `{ assetTag, reasonKey }` only when `current.toCustodianId`, `current.asset`, `rechecked` are set, `rechecked.id === current.asset.id`, `!rechecked.eligible` and `rechecked.reasonKey`; null otherwise.

- [ ] **Step 6: Implement the loader and the pages**
  - `src/lib/asset-operation-options.ts` per Produces. Imports: `import type { AssetOperationMode } from "@/lib/asset-operation-eligibility"`, `searchAssetOperationOptions` and `type AssetOperationSearchDb` from `@/lib/asset-operation-search`, `import type { AssetOperationSearchRow } from "@/lib/asset-operation-search-rules"`; drop `filterCheckoutEligibleAssets`, `filterPersonalTransferEligibleAssets`. The preselect takes `const id = Array.isArray(assetId) ? assetId[0] : assetId`, returns `null` early when `!id`, and calls `searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, { mode, q: "", id, assignCustodian: false, handedOverAssetId: null })`.
  - `asset-lifecycle-policy.ts:158-160,191-193`: delete both filters; `grep -rn "filterCheckoutEligibleAssets\|filterPersonalTransferEligibleAssets" src tests` then finds nothing (on master their only readers are `asset-operation-options.ts:86-87,105` and the two tests of Step 3).
  - checkout / transfer `page.tsx`: `await requirePagePermission(locale, "asset", "edit")` stays as it is, then `const [options, initialAsset] = await Promise.all([getAssetOperationMasterOptions(), getAssetOperationPreselect("<page>", filters.assetId)])`; pass the master lists the form takes today plus `initialAsset={initialAsset}`; `returnTo` unchanged; widen the `searchParams` type to `assetId?: string | string[]` (the page pins do not change).
  - checkin `page.tsx`: `const master = await getAssetOperationMasterOptions()` and `const options = { ...master, ...(await getAssetOperationAssetLists(master)) }`; JSX unchanged.
  - bulk-move `page.tsx`: `const master = await getAssetOperationMasterOptions()`, `const { assets } = await getAssetOperationAssetLists(master)`, `<BulkMoveForm assets={assets} locations={master.locations} />`.

- [ ] **Step 7: Implement `checkout-form.tsx`**
  - Values: `assetId: string` → `asset: AssetOperationSearchRow | null` (initial `initialAsset`); `parentAssetId: string` → `parentAsset: AssetOperationSearchRow | null`. FIELD_IDS unchanged (server keys).
  - `validate` :84 → `check("assetId", required(values.asset) ?? (values.asset?.eligible === false ? "invalid" : null))`.
  - `const tAll = useTranslations()`; `const assetReasonKey = chosenAssetReasonKey(values.asset)`; `errorText` gets, before its two lines: `if (key === "assetId" && assetReasonKey) return tAll(assetReasonKey)`.
  - `function setAsset(asset: AssetOperationSearchRow | null)`: `setValues((current) => ({ ...current, asset, parentAsset: current.parentAsset?.id === asset?.id ? null : current.parentAsset }))` then `fieldErrors.clear("assetId")`.
  - `destinationOptions` (no `useMemo`): employees / departments / locations by type. The review's destination label is `assetOperationRowLabel(values.parentAsset)` for `"asset"`, else the option's label; asset label `values.asset ? assetOperationRowLabel(values.asset) : ""`.
  - `destinationValue` reads `values.parentAsset?.id ?? ""`; the type change resets `parentAsset: null`; `setDestinationValue` drops its `"asset"` line; FormData `parentAssetId` = `values.checkoutType === "asset" ? (values.parentAsset?.id ?? "") : ""`; POST to `` `/api/assets/${values.asset?.id}/checkout` ``.
  - Markup: banner only on `initialAsset?.eligible` with `assetOperationRowLabel(initialAsset)`; `#checkout-asset` = the picker exactly as the Step 1 pin; `#checkout-destination` = `{values.checkoutType === "asset" ? (<AssetOperationPicker id="checkout-destination" label={t("checkoutTo")} mode="checkoutParent" context={{ handedOverAssetId: values.asset?.id }} value={values.parentAsset} required error={errorText(destinationKey(values.checkoutType))} onChange={…sets parentAsset, clears "parentAssetId"} />) : (today's SearchableSelect :294-305)}`.

- [ ] **Step 8: Implement `transfer-form.tsx`**
  - Values: `assetId` → `asset: AssetOperationSearchRow | null` (initial `initialAsset`) and `clearedAsset: ClearedTransferAsset | null` (initial null). `validate` :51 → the same rule as checkout.
  - `setAsset(asset)` sets `{ asset, clearedAsset: null }` and clears `"assetId"`. `setField` keeps its clearing lines, sets `[field]: value`, then `if (field === "toCustodianId" && value && values.asset) void recheckAssetForCustodian(values.asset.id)`.
  - The re-check (the one body the tests do not fix):

```ts
// A custodian makes the transfer an assign (Ready or In Use only): the chosen asset is asked again under that rule (spec 6.3).
async function recheckAssetForCustodian(assetId: string) {
  const response = await fetch(buildAssetOperationSearchHref({ mode: "transfer", id: assetId, assignCustodian: true })).catch(() => null)
  const payload = response?.ok ? await response.json().catch(() => null) : null
  const rechecked: AssetOperationSearchRow | null = payload?.data?.rows?.[0] ?? null
  setValues((current) => {
    const cleared = transferAssetToClear(current, rechecked)
    return cleared ? { ...current, asset: null, clearedAsset: cleared } : current
  })
}
```

  - `assetError` = `tAll(chosenAssetReasonKey(values.asset))` when set, else `t("assetClearedForCustodian", { assetTag: values.clearedAsset.assetTag, reason: tAll(values.clearedAsset.reasonKey) })` when `values.clearedAsset`, else `fieldErrors.message("assetId")`.
  - Markup: banner only on `initialAsset?.eligible`; `#transfer-asset` = the picker exactly as the Step 1 pin; review asset label `assetOperationRowLabel`; POST to `` `/api/assets/${values.asset?.id}/transfer` ``.

- [ ] **Step 9: Update the messages** — change file in the session scratchpad: `{ "set": { "th": { "transfer.assetClearedForCustodian": "นำ {assetTag} ออกแล้ว: {reason}" }, "en": { "transfer.assetClearedForCustodian": "Removed {assetTag}: {reason}" } }, "delete": ["checkout.selectAsset", "transfer.selectAsset"] }`; run `node scripts/messages-edit.mjs <file>`. Expected: `messages updated: 1 th, 1 en, 2 deleted`.

- [ ] **Step 10: Run the task's tests to see them pass**
  Run: `node --test tests/asset-operation-picker-forms.test.ts tests/asset-operation-master-options.test.ts tests/v-track2-o.test.ts tests/e2e-transactions.test.ts tests/asset-operation-options.test.ts tests/legacy-checkin-flow.test.ts`
  Expected: PASS.

- [ ] **Step 11: Run the gates** — `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors). A pin failing outside Step 3's list is rewritten here and named in the report.

- [ ] **Step 12: Commit**

```bash
git add src/lib/asset-operation-options.ts src/lib/asset-operation-form-rules.ts src/lib/asset-lifecycle-policy.ts "src/app/[locale]/(dashboard)/asset-management/checkout/page.tsx" "src/app/[locale]/(dashboard)/asset-management/transfer/page.tsx" "src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx" "src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx" src/components/asset-operations/checkout-form.tsx src/components/asset-operations/transfer-form.tsx messages/th.json messages/en.json tests/asset-operation-picker-forms.test.ts tests/asset-operation-master-options.test.ts tests/v-track2-o.test.ts tests/e2e-transactions.test.ts tests/asset-operation-options.test.ts
git commit -m "feat(asset-operations): the transaction pages load only the master lists; ส่งมอบ (incl. ทรัพย์สินอื่น) and โอนย้าย pick their asset through the server search, ?assetId= starts chosen or chosen-but-blocked with its reason, and a custodian chosen later clears an asset that no longer fits with the reason (server search Task 5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: รับคืน on the picker

**Files:**
- Create: `src/lib/checkin-choice.ts` (pure), `src/lib/checkin-page-data.ts` (server), `tests/checkin-choice.test.ts`, `tests/checkin-page-data.test.ts`
- Modify: `src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx:1-30`
- Modify: `src/components/asset-operations/checkin-form.tsx` — imports `:3-34`, types `:36-62`, props/state/derived `:113-196`, review asset `:205-206`, legacy handler `:264-294`, submit asset `:303-306`, the picker block (banner, `SearchableSelect id="checkin-checkout"`, `ActionEmptyState`, the two `Notice`s, the legacy list) `:353-445`, the `hasActiveCheckouts` gate `:447-448` + `:635-636`, panel reads `:453-492`, `normalizeText` `:687-689`
- Modify: `messages/th.json`, `messages/en.json` (through `node scripts/messages-edit.mjs` only)
- Test (rewrite): `tests/legacy-checkin-flow.test.ts:22-40, 58-86`, `tests/operations-sweep-ui.test.ts:90-104`, `tests/v-track2-o.test.ts:186, 189-192`, `tests/asset-handover-checkin.test.ts:57`; (extend) `tests/open-repair-filter.test.ts:5-10`, `tests/asset-transaction-cancellation-routes.test.ts:21-30`

**Interfaces:**
- Consumes (Task 3): `searchAssetOperationOptions(db: AssetOperationSearchDb, input: AssetOperationSearchInput): Promise<AssetOperationSearchAnswer>` (by id, mode `checkin`; S-R17); `buildAssetOperationSearchHref({ mode: "checkin", id })` → `GET /api/asset-operations/search?mode=checkin&id=<assetId>` → `{ data: AssetOperationSearchAnswer }` (S-R21); types `AssetOperationSearchRow`, `AssetOperationSearchAnswer` from `src/lib/asset-operation-search-rules.ts`, with the checkin fields (S-R20): `legacy`, `holderKey`, `holderLabel`, `holderEmployeeId`, `serialNumber`, `conditionId`, `currentLocationId`, `checkout.{id, documentNo, checkoutDate, handoverMode, checkoutType, expectedReturnDate, remark, conditionBefore, destinationLabel}`.
- Consumes (Task 4): `<AssetOperationPicker id label mode="checkin" value={row | null} required initialQuery error onChange={(row: AssetOperationSearchRow | null) => void} />`: the root carries `id`, a single pick calls `onChange` for takeable rows only, a chosen blocked row stays chosen, and the hint is the picker's own `assetOperation.hintCheckin` (S-R25 to S-R28).
- Consumes (Task 5): `getAssetOperationMasterOptions(): Promise<{ employees; departments; locations; statuses; conditions }>` from `@/lib/asset-operation-options` (`statuses` = the check-in return statuses).
- Consumes (Task 1): `getCheckinVerdict(facts: AssetOperationFacts)` (test only).
- Consumes (existing): `useConfirm()` (`src/components/ui/confirm-dialog.tsx:115`, mounted by `dashboard-shell.tsx:141`) → `confirm({ title, description, confirmLabel }): Promise<boolean>`.
- Produces: `export type CheckinChoice = { checkoutId: string; returnByEmployeeId: string | null; reasonKey: string | null }`; `export function getCheckinChoice(row: AssetOperationSearchRow | null, employeeIds: ReadonlySet<string>): CheckinChoice`.
- Produces (server): `export const legacyReturnOwnershipTypes = ["personal", "shared", "stock"] as const`; `export const legacyReturnStatusNames = ["Ready", "In Use"] as const`; `export const legacyReturnCountWhere: Prisma.AssetWhereInput`; `export function countLegacyReturns(): Promise<number>`; `export type CheckinPreselect = { row: AssetOperationSearchRow | null; query: string }`; `export function getCheckinPreselect(params: { checkoutId?: string | string[]; assetId?: string | string[] }): Promise<CheckinPreselect>` (S-R17, S-R38; a repeated parameter reaches the page as an array and the first one counts).
- Produces: `CheckinForm` props become `{ employees: Option[]; locations: Option[]; statuses: StatusOption[]; conditions: StatusOption[]; initialRow: AssetOperationSearchRow | null; initialQuery: string; legacyReturnCount: number; returnTo?: string }` (`activeCheckouts`, `legacyReturnCandidates`, `initialCheckoutId`, `initialLegacyAssetId` go).

Decisions: one picker, grouped by holder (S-R4), spans both columns; the separate legacy list, the "no active checkouts" `ActionEmptyState`, the "รายการนี้ต้องตรวจสอบก่อนรับคืน" notice and the `hasActiveCheckouts` gate go (the page no longer loads every handover; each row carries its own reason), so the rest of the form always renders. Return-by is prefilled from the chosen row's holder on every pick and on the `?checkoutId=` arrival, only when the holder is in `employees` (an inactive holder leaves it empty); a return-by the form filled in from the previous row is cleared on เปลี่ยน and on a row with no active holder, and a return-by chosen by hand is kept. A blocked `?checkoutId=` arrival is chosen-but-blocked: the reason shows under the field, `checkoutId` stays empty, no panel, no banner.

- [ ] **Step 1: Write the failing tests**

`tests/checkin-choice.test.ts`:
```ts
import assert from "node:assert/strict"
import test from "node:test"
import { getCheckinChoice } from "../src/lib/checkin-choice.ts"
import type { AssetOperationSearchRow } from "../src/lib/asset-operation-search-rules.ts"

const holderLabel = "E001 - สมชาย ใจดี"
const checkout = { id: "co-1", documentNo: "HO-202610-0001", checkoutDate: "2026-10-01T00:00:00.000Z", handoverMode: "permanent_assignment", checkoutType: "user", expectedReturnDate: null, remark: null, conditionBefore: "cond-good", destinationLabel: holderLabel }
const row = (overrides: Record<string, unknown> = {}) => ({ id: "asset-1", assetTag: "NB-0228", name: "โน้ตบุ๊ก", serialNumber: null, statusLabel: "ใช้งานอยู่", placeLabel: holderLabel, currentLocationId: "loc-1", conditionId: "cond-good", eligible: true, reasonKey: null, checkout, holderKey: "employee:emp-1", holderLabel, holderEmployeeId: "emp-1", ...overrides }) as AssetOperationSearchRow
const active = new Set(["emp-1", "emp-2"])

test("a takeable handover row is chosen with its checkout; return-by is its holder when the holder is an active employee (spec 6.3)", () => {
  assert.deepEqual(getCheckinChoice(row(), active), { checkoutId: "co-1", returnByEmployeeId: "emp-1", reasonKey: null })
  assert.deepEqual(getCheckinChoice(row(), new Set(["emp-2"])), { checkoutId: "co-1", returnByEmployeeId: null, reasonKey: null })
  assert.deepEqual(getCheckinChoice(row({ holderEmployeeId: null }), active), { checkoutId: "co-1", returnByEmployeeId: null, reasonKey: null })
})

test("a blocked row is chosen but not taken: no checkout, no return-by, its reason (spec 6.4)", () => {
  assert.deepEqual(getCheckinChoice(row({ eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }), active), { checkoutId: "", returnByEmployeeId: null, reasonKey: "asset.transactionReasonActiveMaintenance" })
})

test("nothing chosen, and a legacy row before its handover exists, take no checkout", () => {
  assert.deepEqual(getCheckinChoice(null, active), { checkoutId: "", returnByEmployeeId: null, reasonKey: null })
  assert.deepEqual(getCheckinChoice(row({ legacy: true, checkout: undefined }), active), { checkoutId: "", returnByEmployeeId: null, reasonKey: null })
})
```

`tests/checkin-page-data.test.ts` — the mocked-module harness of `tests/audit-finding-review-route.test.ts:1-96` (`registerHooks`, mocked sources first, then `@/` → `src/`), mocking `@/lib/db` (`assetCheckout.findFirst` returns `state.checkout` and records its args; `asset.count` records its args and returns `42`) and `@/lib/asset-operation-search` (`searchAssetOperationOptions(db, input)` records `{ call: "search", args: { input } }` and returns `state.answer`); `beforeEach` resets `state.calls`. Then `const data = await import(pathToFileURL("src/lib/checkin-page-data.ts").href) as typeof import("../src/lib/checkin-page-data.ts")`. With `handoverRow = { id: "asset-1", assetTag: "NB-0228", eligible: true, reasonKey: null, checkout: { id: "co-1" } }`:
```ts
test("?checkoutId= starts with that open handover's row, read by id; it wins over ?assetId= (spec 6.4)", async () => {
  state.checkout = { assetId: "asset-1" }; state.answer = { mode: "checkin", total: 1, rows: [handoverRow] }
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-1", assetId: "asset-9" }), { row: handoverRow, query: "" })
  assert.deepEqual(state.calls[0], { call: "assetCheckout.findFirst", args: { where: { id: "co-1", isReturned: false, transactionStatus: "active" }, select: { assetId: true } } })
  assert.deepEqual(state.calls[1], { call: "search", args: { input: { mode: "checkin", q: "", id: "asset-1", assignCustodian: false, handedOverAssetId: null } } })
  state.calls.length = 0
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: ["co-1", "co-2"] }), { row: handoverRow, query: "" }, "a repeated ?checkoutId= takes the first")
  assert.deepEqual(state.calls[0], { call: "assetCheckout.findFirst", args: { where: { id: "co-1", isReturned: false, transactionStatus: "active" }, select: { assetId: true } } })
})
test("a blocked handover arrives chosen-but-blocked; a returned or unknown one, or another handover of the asset, gives nothing", async () => {
  const blocked = { ...handoverRow, eligible: false, reasonKey: "asset.transactionReasonActiveMaintenance" }
  state.checkout = { assetId: "asset-1" }; state.answer = { mode: "checkin", total: 1, rows: [blocked] }
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-1" }), { row: blocked, query: "" })
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-2" }), { row: null, query: "" })
  state.checkout = null; state.calls.length = 0
  assert.deepEqual(await data.getCheckinPreselect({ checkoutId: "co-gone" }), { row: null, query: "" })
  assert.equal(state.calls.some((call) => call.call === "search"), false)
})
test("?assetId= fills the search with the asset's tag and chooses nothing; an unknown asset or no parameter leaves it empty", async () => {
  state.answer = { mode: "checkin", total: 1, rows: [{ ...handoverRow, legacy: true, checkout: undefined }] }
  assert.deepEqual(await data.getCheckinPreselect({ assetId: "asset-2" }), { row: null, query: "NB-0228" })
  assert.deepEqual(state.calls.at(-1), { call: "search", args: { input: { mode: "checkin", q: "", id: "asset-2", assignCustodian: false, handedOverAssetId: null } } })
  assert.equal(state.calls.some((call) => call.call === "assetCheckout.findFirst"), false)
  assert.deepEqual(await data.getCheckinPreselect({ assetId: ["asset-2", "asset-3"] }), { row: null, query: "NB-0228" }, "a repeated ?assetId= takes the first")
  assert.deepEqual(state.calls.at(-1), { call: "search", args: { input: { mode: "checkin", q: "", id: "asset-2", assignCustodian: false, handedOverAssetId: null } } })
  state.answer = { mode: "checkin", total: 0, rows: [] }
  assert.deepEqual(await data.getCheckinPreselect({ assetId: "gone" }), { row: null, query: "" })
  state.calls.length = 0
  assert.deepEqual(await data.getCheckinPreselect({}), { row: null, query: "" })
  assert.deepEqual(state.calls, [])
})
test("the legacy count is one count over the legacy rule", async () => {
  assert.deepEqual(data.legacyReturnCountWhere, {
    isActive: true,
    custodianId: { not: null },
    ownershipType: { in: ["personal", "shared", "stock"] },
    status: { name: { in: ["Ready", "In Use"] } },
    checkouts: { none: { isReturned: false, transactionStatus: "active" } },
    maintenanceTickets: { none: { isActive: true, repairStatus: { notIn: ["closed", "cancelled"] } } },
  })
  assert.equal(await data.countLegacyReturns(), 42)
  assert.deepEqual(state.calls.at(-1), { call: "asset.count", args: { where: data.legacyReturnCountWhere } })
})
test("the count's ownership types and statuses are exactly those getCheckinVerdict takes on the legacy path (one rule)", () => {
  const facts = (ownership: AssetOwnershipType, statusName: string) => ({ statusName, ownership, custodianId: "emp-1", openCheckout: null, hasOpenRepair: false })
  assert.deepEqual([...data.legacyReturnOwnershipTypes], assetOwnershipTypes.filter((ownership) => getCheckinVerdict(facts(ownership, "Ready")).eligible))
  const statuses = ["Draft", "Ready", "In Use", "Reserved", "Checked Out", "In Transit", "Under Maintenance", "Pending Repair", "Under Inspection", "Lost", "Missing", "Pending Disposal", "Disposed", "Retired"] // prisma/seed.ts:17-30
  assert.deepEqual([...data.legacyReturnStatusNames], statuses.filter((status) => getCheckinVerdict(facts("personal", status)).eligible))
})
```
(`assetOwnershipTypes`/`AssetOwnershipType` from `../src/lib/asset-ownership.ts`, `getCheckinVerdict` from `../src/lib/asset-operation-eligibility.ts`.)

Source pins (rewrites; each fails on master):
- `tests/legacy-checkin-flow.test.ts:22-26` → "check-in page loads the master lists, the preselect and the legacy count, never the register": `assert.match(source, /getAssetOperationMasterOptions\(\)/)`, `/getCheckinPreselect\(\{ checkoutId: filters\.checkoutId, assetId: filters\.assetId \}\)/`, `/countLegacyReturns\(\)/`, `/initialRow=\{preselect\.row\}/`, `/initialQuery=\{preselect\.query\}/`, `/legacyReturnCount=\{legacyReturnCount\}/`; `assert.doesNotMatch(source, /getAssetOperationOptions|getAssetOperationAssetLists|legacyReturnCandidates|activeCheckouts/)`.
- `:28-40` → "a legacy row asks once, then backfills the handover and continues the normal return (spec 6.3)": `source.includes` each of `'if (row?.legacy) {'`, `'title: t("legacyReturnConfirmTitle")'`, `'confirmLabel: t("legacyReturnConfirm")'`, `'buildAssetOperationSearchHref({ mode: "checkin", id: assetId })'`, `'fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")'`, `'else if (prefilled && returnByEmployeeId === prefilled) setEmployeeField("returnBy", "")'`; keep `/\/api\/assets\/\$\{assetId\}\/legacy-checkout/` and `/asset-management\/checkin\?checkoutId=/`; `assert.doesNotMatch(source, /legacyReturnCandidates|legacyReturnSearch|filteredLegacyReturnCandidates|legacyBackfillSavingId|hasActiveCheckouts|<SearchField\b|<Chip\b|<EmptyNote\b|<ActionEmptyState\b/)`.
- `:58-78` → present in th and en: `legacyReturnCreated`, `legacyReturnFailed`, `legacyReturnCount`, `legacyReturnConfirmTitle`, `legacyReturnConfirmDescription`, `legacyReturnConfirm`; absent ("has no reader and is removed"): the 15 keys of Step 6. `assert.equal(checkinMessages("th").legacyReturnConfirmTitle, "สร้างใบส่งมอบย้อนหลังแล้วรับคืน")`.
- `:80-86` → delete (the row button and its SearchField are gone; `:28-40` pins their absence).
- `tests/operations-sweep-ui.test.ts:90-104` → title "check-in form: a ContentPanel, the shared asset picker with the legacy count line, KeyValueList with Nil, and no box around the dropzone (spec 2D D7, D9, D19, M21, M22, M33; server search Task 6)"; replace `:93-98` with `assert.match(source, /<AssetOperationPicker\n\s+id="checkin-checkout"\n\s+label=\{t\("asset"\)\}\n\s+mode="checkin"\n\s+value=\{chosen\}\n\s+required\n\s+initialQuery=\{initialQuery\}\n/)`, `source.includes('t("legacyReturnCount", { count: formatCount(legacyReturnCount) })')`, `assert.doesNotMatch(source, /<ActionEmptyState\b|<Chip\b|<EmptyNote\b|handoverReviewRequired|legacyReturnTitle/)`; keep `:99-103`.
- `tests/v-track2-o.test.ts:186` → `for (const key of Object.keys(ids)) if (key !== "checkoutId") assert.ok(…)` plus `assert.ok(source.includes('error={blockedReason ?? fieldErrors.message("checkoutId")}'))`; `:189-192` → `assert.match(source, /<AssetOperationPicker\n\s+id="checkin-checkout"\n/)` and the `SearchableSelect` loop over `["checkin-return-by", "checkin-receive-by"]`.
- `tests/asset-handover-checkin.test.ts:57` → delete that line (the empty state goes).

- [ ] **Step 2: Run them to see them fail**

`node --test tests/checkin-choice.test.ts tests/checkin-page-data.test.ts tests/legacy-checkin-flow.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/asset-handover-checkin.test.ts`
Expected: the two new files fail with `ERR_MODULE_NOT_FOUND` (`checkin-choice.ts`, `checkin-page-data.ts`); the pins fail on `getCheckinPreselect`, `AssetOperationPicker`, `legacyReturnConfirmTitle`; `asset-handover-checkin` passes (a deletion only).

- [ ] **Step 3: `src/lib/checkin-choice.ts`**

Pure, `import type { AssetOperationSearchRow } from "./asset-operation-search-rules.ts"`. `getCheckinChoice` as in Interfaces: a row that is not eligible, or has no `checkout`, gives `checkoutId: ""`, `returnByEmployeeId: null` and its `reasonKey` when not eligible; an eligible handover row gives its `checkout.id` and its `holderEmployeeId` when `employeeIds` has it.

- [ ] **Step 4: `src/lib/checkin-page-data.ts`**

Server (`@/lib/db`, `@/lib/asset-operation-search`, `@/lib/repair-record-policy`; `import type` for `Prisma` and the row). `legacyReturnCountWhere` is exactly the object the test pins (built from the two constants and `openRepairRecordWhere`); `countLegacyReturns()` = `prisma.asset.count({ where: legacyReturnCountWhere })`. `getCheckinPreselect`: each parameter is first `Array.isArray(v) ? v[0] : v` (an empty string counts as absent), and the normalised values are used below, in the `findFirst` where, the `rows[0].checkout?.id === checkoutId` check and the by-id search. With `checkoutId`, one `prisma.assetCheckout.findFirst({ where: { id: checkoutId, isReturned: false, transactionStatus: "active" }, select: { assetId: true } })`, then the by-id answer `searchAssetOperationOptions(prisma as unknown as AssetOperationSearchDb, { mode: "checkin", q: "", id: assetId, assignCustodian: false, handedOverAssetId: null })`, returning `rows[0]` only when `rows[0].checkout?.id === checkoutId`; else with `assetId`, the by-id answer and `query = rows[0]?.assetTag ?? ""`; else `{ row: null, query: "" }`. No `"-"` literal (list-frame `RAW_DASH`).

- [ ] **Step 5: The page and the form**

Read `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/page.md` (searchParams is a Promise) and `04-functions/use-router.md:46,50` (a search-param-only `replace`/`refresh` keeps the client state, so the form sets the new handover itself).

`checkin/page.tsx`:
```tsx
await requirePagePermission(locale, "asset", "edit")
const [options, preselect, legacyReturnCount] = await Promise.all([
  getAssetOperationMasterOptions(),
  getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId }),
  countLegacyReturns(),
])
return <CheckinForm employees={options.employees} locations={options.locations} statuses={options.statuses} conditions={options.conditions} initialRow={preselect.row} initialQuery={preselect.query} legacyReturnCount={legacyReturnCount} returnTo={/* unchanged :27 */} />
```
Widen the page's `searchParams` type to `checkoutId?: string | string[]; assetId?: string | string[]` (the page pins do not change).

`checkin-form.tsx`:
- Imports: drop `ActionEmptyState`, `Chip`, `EmptyNote`, `SearchField`, `PackageCheck`; add `AssetOperationPicker`, `useConfirm`, `getCheckinChoice`, `buildAssetOperationSearchHref` and `import type { AssetOperationSearchAnswer, AssetOperationSearchRow }` (the last two from `@/lib/asset-operation-search-rules`). Types `CheckoutOption`, `LegacyReturnCandidate` and `normalizeText` go.
- State: `employeeIds = useMemo(() => new Set(employees.map((employee) => employee.id)), [employees])`; `initialChoice = getCheckinChoice(initialRow, employeeIds)`; `chosen` starts at `initialRow`; `returnByEmployeeId` at `initialChoice.returnByEmployeeId ?? ""`; `values.checkoutId` at `initialChoice.checkoutId`, `values.returnBy` at that employee's label or `""`. `legacyBackfillSavingId`, `legacyReturnSearch` and the derived legacy/handover lists go. `const tAll = useTranslations()`, `const confirm = useConfirm()`.
- Derived: `const choice = getCheckinChoice(chosen, employeeIds)`; `const blockedReason = choice.reasonKey ? tAll(choice.reasonKey) : undefined`; `const selectedCheckout = chosen?.eligible ? chosen.checkout ?? null : null`. Review `assetLabel` = `` `${chosen.assetTag} - ${chosen.name}` `` when `selectedCheckout`; `submitCheckin` posts to `chosen.id` (`const assetId = selectedCheckout ? chosen?.id : undefined`).
- Picks:
```ts
function applyChoice(row: AssetOperationSearchRow | null) {
  const next = getCheckinChoice(row, employeeIds)
  const prefilled = getCheckinChoice(chosen, employeeIds).returnByEmployeeId
  setChosen(row)
  setField("checkoutId", next.checkoutId)
  if (next.returnByEmployeeId) setEmployeeField("returnBy", next.returnByEmployeeId)
  else if (prefilled && returnByEmployeeId === prefilled) setEmployeeField("returnBy", "")
}
function chooseRow(row: AssetOperationSearchRow | null) {
  if (row?.legacy) {
    void confirmLegacyReturn(row)
    return
  }
  applyChoice(row)
}
```
A return-by the form filled in from the previous row is cleared when the new choice (none, after เปลี่ยน) has no active holder. A return-by the person changed by hand stays.
`confirmLegacyReturn(row)`: `await confirm({ title: t("legacyReturnConfirmTitle"), description: t("legacyReturnConfirmDescription", { asset: `${row.assetTag} - ${row.name}`, holder: row.holderLabel ?? row.placeLabel }), confirmLabel: t("legacyReturnConfirm") })`; on yes, `handleCreateLegacyCheckout(row)`; on no, nothing changes.
- `handleCreateLegacyCheckout(row: AssetOperationSearchRow)` opens with `const assetId = row.id`, so today's POST (`checkin-form.tsx:268-270`, `` fetch(`/api/assets/${assetId}/legacy-checkout`, { method: "POST" }) ``) stays as it is, with `${assetId}` and never `${row.id}` (pinned by `tests/legacy-checkin-flow.test.ts:35`, kept in Step 1) and the row read is `fetchCheckinRow(assetId)`; it keeps the `legacyReturnFailed`/`legacyReturnCreated` words and the `router.replace(?checkoutId=…, returnTo)` + `router.refresh()`; it runs under `setSaving(true)` (the busy Save stands in for the row button), then reads the new handover's row with a module-level `fetchCheckinRow(assetId)` (`fetch(buildAssetOperationSearchHref({ mode: "checkin", id: assetId }))` → `payload.data.rows[0] ?? null`, `null` on a non-ok answer); no row with a `checkout` → `throw new Error(tCommon("error"))` (the handover exists; a new search finds it as a HO- row). With the row: `applyChoice(created)`, then today's defaults `conditionAfter: current.conditionAfter || row.conditionId`, `nextLocationId: current.nextLocationId || row.currentLocationId`, and `fieldErrors.clear("checkoutId", "returnBy", "conditionAfter", "nextLocationId")`.
- Markup: replace `:353-445` with the banner when `initialRow?.eligible` (`value={`${initialRow.assetTag} - ${initialRow.name}`}`), then `<div className="md:col-span-2 grid gap-1.5">` holding
```tsx
<AssetOperationPicker
  id="checkin-checkout"
  label={t("asset")}
  mode="checkin"
  value={chosen}
  required
  initialQuery={initialQuery}
  error={blockedReason ?? fieldErrors.message("checkoutId")}
  onChange={chooseRow}
/>
```
and, when `legacyReturnCount > 0`, `<p className="text-meta text-muted-foreground">{t("legacyReturnCount", { count: formatCount(legacyReturnCount) })}</p>`. Remove the `{hasActiveCheckouts && (<>`…`</>)}` wrapper (its children stay, unchanged). The panel renders on `selectedCheckout && chosen`: handover lines read `selectedCheckout.{documentNo, handoverMode, checkoutType, destinationLabel, checkoutDate, expectedReturnDate, remark}` (the documentNo line unchanged, pinned by `operations-sweep-ui.test.ts:100`); asset lines read `chosen.assetTag`, `chosen.serialNumber`, `chosen.name`, `chosen.statusLabel`, `selectedCheckout.conditionBefore`.

- [ ] **Step 6: Messages**

Change file `messages-t6.json` in the session scratchpad, then `node scripts/messages-edit.mjs <that path>`:
```json
{
  "set": {
    "th": {
      "checkin.legacyReturnCount": "ข้อมูลเก่า (ไม่มีใบส่งมอบ) {count} รายการ ค้นหาได้ด้วยรหัสทรัพย์สินหรือชื่อผู้ถือครอง",
      "checkin.legacyReturnConfirmTitle": "สร้างใบส่งมอบย้อนหลังแล้วรับคืน",
      "checkin.legacyReturnConfirmDescription": "{asset} อยู่กับ {holder} แต่ไม่มีใบส่งมอบ ระบบจะสร้างใบส่งมอบย้อนหลังพร้อมประวัติการแก้ไข แล้วไปต่อที่ฟอร์มรับคืนนี้",
      "checkin.legacyReturnConfirm": "สร้างและรับคืน"
    },
    "en": {
      "checkin.legacyReturnCount": "{count} legacy items (no handover document). Find them by asset tag or holder's name.",
      "checkin.legacyReturnConfirmTitle": "Create a backdated handover, then return it",
      "checkin.legacyReturnConfirmDescription": "{asset} is with {holder} but has no handover document. The system creates a backdated handover with its change history, then continues on this return form.",
      "checkin.legacyReturnConfirm": "Create and return"
    }
  },
  "delete": ["checkin.selectCheckout", "checkin.noActiveCheckoutsOption", "checkin.noActiveCheckoutsTitle", "checkin.noActiveCheckoutsDescription", "checkin.goToCheckout", "checkin.handoverReviewRequired", "checkin.legacyReturnTitle", "checkin.legacyReturnDescription", "checkin.legacyReturnAction", "checkin.legacyReturnCurrentHolder", "checkin.legacyReturnCurrentLocation", "checkin.legacyReturnBadge", "checkin.legacyReturnSearch", "checkin.legacyReturnFilteredCount", "checkin.legacyReturnNoResults"]
}
```
Expected: `messages updated: 4 th, 4 en, 15 deleted`. The search hint is the picker's `assetOperation.hintCheckin` (Task 4, S-R28), so `checkin` gets no hint key. (Each deleted key's only reader is `checkin-form.tsx`, grep of `src e2e tests` on master; `handoverModeMissing`/`handoverStatusMismatch` stay, read by the submit catch `:330-334` and `asset-handover-checkin.test.ts:32-48`.)

- [ ] **Step 7: The pins this task owns**

- `tests/open-repair-filter.test.ts:5-10` and `tests/asset-transaction-cancellation-routes.test.ts:21-30`: add `"src/lib/checkin-page-data.ts"` (it holds the open-repair filter and the open-handover where).

- [ ] **Step 8: Run to see them pass**

`node --test tests/checkin-choice.test.ts tests/checkin-page-data.test.ts tests/legacy-checkin-flow.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/asset-handover-checkin.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/thai-glossary.test.ts`
Expected: all pass. Untouched and still passing by construction: `e2e-cross-cutting.test.ts:220,237` (the ids and the return-by rule stay), `form-migration-guards.test.ts:86` (`[5, 0, 0]`: the date `Input`, the three `Select`s and the `NativeSelect`), `validation-guards.test.ts:27,84` (one form), `file-evidence-ui.test.ts:120-135`, `form-frames-ui.test.ts:87-92`.

- [ ] **Step 9: Full checks and commit**

`npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors). Then:
```
git add src/lib/checkin-choice.ts src/lib/checkin-page-data.ts "src/app/[locale]/(dashboard)/asset-management/checkin/page.tsx" src/components/asset-operations/checkin-form.tsx messages/th.json messages/en.json tests/checkin-choice.test.ts tests/checkin-page-data.test.ts tests/legacy-checkin-flow.test.ts tests/operations-sweep-ui.test.ts tests/v-track2-o.test.ts tests/asset-handover-checkin.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts
git commit -m "feat(checkin): รับคืน finds what can come back with the shared picker, grouped by holder; a ข้อมูลเก่า row asks once then backfills, return-by follows the chosen holder, and the page loads no register (server search Task 6)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ย้ายที่ตั้งหลายรายการ on the picker

**Files:**
- Create: `src/lib/bulk-move-blocked.ts` (pure), `tests/bulk-move-blocked.test.ts`
- Modify: `src/components/asset-operations/bulk-move-form.tsx` — imports/`Option` `:3-23`, `FIELD_IDS` comment `:26-27`, props/state/`availableAssets`/`toggleAsset` `:49-88`, the refusal `:103-107`, the asset block `:123-169`
- Modify: `src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx:1-15`
- Modify: `src/lib/asset-operation-options.ts` — Task 5's transitional `getAssetOperationAssetLists` (master's `:12-149` code) and `getCheckoutDestinationLabel` (`:151-175` on master) go with the imports only they used; bulk-move, their last caller, leaves in this task (S-R29)
- Modify: `messages/th.json`, `messages/en.json` (through the script)
- Test (rewrite): `tests/v-track2-o.test.ts:250-254`, `tests/choice-controls-ui.test.ts:82-92`, `tests/operations-sweep-ui.test.ts:76, 84`, `tests/e2e-transactions.test.ts:114-117`; (delete) `tests/asset-operation-options.test.ts:2, 39-45`, `tests/legacy-checkin-flow.test.ts:5, 11-20`, `tests/list-frame-guards.test.ts:176`; (list entry out) `tests/open-repair-filter.test.ts:7`, `tests/asset-transaction-cancellation-routes.test.ts:26`

**Interfaces:**
- Consumes (Task 4): `<AssetOperationPicker id label mode="bulkMove" multiple values={rows} required error onChange={(rows: AssetOperationSearchRow[]) => void} />` — it renders the "ที่เลือกแล้ว N รายการ" list with a remove button per row, clears the search and keeps focus after a pick, marks rows already in `values` as "เลือกแล้ว", carries `id` on its root (so `focusFirst` reaches `#bulk-move-assets-search`) and shows the error at `#${id}-error` (S-R25).
- Consumes (Task 2): the bulk-move 409 `{ code, error, blocked: [{ assetId, assetTag, code }] }`, which also names software_license assets (`ASSET_LICENSE_MOVE_NOT_ALLOWED`, catalogued).
- Consumes (Task 5): `getAssetOperationMasterOptions()` (`locations`).
- Consumes (existing): `apiError.describe(code).message` (`src/components/ui/use-api-error.ts:15-18` → `api-error-catalog.ts:297-308`; `ASSET_STATUS_TRANSFER_NOT_ALLOWED` → `apiErrors.statusBlocksTransfer`, catalog `:44`).
- Produces: `export type BulkMoveBlockedAsset = { assetId: string; assetTag: string; code: string }`; `export function readBulkMoveBlocked(payload: unknown): BulkMoveBlockedAsset[]`; `export function bulkMoveBlockedList(blocked: readonly BulkMoveBlockedAsset[], reasonOf: (code: string) => string): string`.
- Produces: `BulkMoveForm({ locations }: { locations: Option[] })` (`assets` prop goes).

Decisions: no `excludeIds` (S-R18); the header meta "เลือกแล้ว {count} รายการ" stays (pinned by `form-frames-ui.test.ts:111-116`); a refusal that names assets (`blocked`) shows under the field, every other refusal keeps today's path (`applyServer`, else the toast).

- [ ] **Step 1: Write the failing tests**

`tests/bulk-move-blocked.test.ts`:
```ts
import assert from "node:assert/strict"
import test from "node:test"
import { bulkMoveBlockedList, readBulkMoveBlocked } from "../src/lib/bulk-move-blocked.ts"

const blocked = [
  { assetId: "a1", assetTag: "NB-001", code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" },
  { assetId: "a2", assetTag: "LIC-007", code: "ASSET_LICENSE_MOVE_NOT_ALLOWED" },
  { assetId: "a3", assetTag: "NB-002", code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED" },
]

test("the bulk-move refusal's blocked assets are read from its body, and nothing else is", () => {
  assert.deepEqual(readBulkMoveBlocked({ code: "ASSET_STATUS_TRANSFER_NOT_ALLOWED", error: "x", blocked }), blocked)
  assert.deepEqual(readBulkMoveBlocked({ blocked: [{ ...blocked[0], extra: 1 }, { assetId: 1 }, null, "NB-9"] }), [blocked[0]])
  for (const payload of [null, undefined, "x", {}, { blocked: "x" }, { error: "Some assets already have active checkouts" }]) assert.deepEqual(readBulkMoveBlocked(payload), [])
})

test("the list under the field groups the tags by reason, in the order the server named them", () => {
  const reasons: Record<string, string> = { ASSET_STATUS_TRANSFER_NOT_ALLOWED: "สถานะนี้ย้ายไม่ได้", ASSET_LICENSE_MOVE_NOT_ALLOWED: "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้" }
  assert.equal(bulkMoveBlockedList(blocked, (code) => reasons[code]), "NB-001, NB-002 (สถานะนี้ย้ายไม่ได้) · LIC-007 (License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้)")
  assert.equal(bulkMoveBlockedList([], (code) => code), "")
})
```

Source pins (rewrites; each fails on master):
- `tests/v-track2-o.test.ts:250-254` →
```ts
  // The asset picker is the field: its search carries the id focus goes to, and one error sits under it (server search Task 7).
  assert.match(source, /<AssetOperationPicker\n\s+id="bulk-move-assets"\n/)
  assert.ok(source.includes("error={assetsError}"))
  assert.match(source, /fieldErrors\.errors\.assetIds === "required"\s+\? t\("selectAssets"\)\s+: fieldErrors\.errors\.assetIds === "blocked"\s+\? t\("blockedAssets", \{ count: blockedAssets\.length, list: bulkMoveBlockedList\(blockedAssets, \(code\) => apiError\.describe\(code\)\.message\) \}\)\s+: fieldErrors\.message\("assetIds"\)/)
  assert.match(source, /function changeAssets\(rows: AssetOperationSearchRow\[\]\) \{\n\s+setAssets\(rows\)\n\s+fieldErrors\.clear\("assetIds"\)/)
  assert.match(source, /const blocked = readBulkMoveBlocked\(payload\)\n\s+if \(blocked\.length > 0\) \{\n\s+setBlockedAssets\(blocked\)\n\s+fieldErrors\.setErrors\(\{ assetIds: "blocked" \}\)\n\s+focusFirstError\(\)\n\s+return\n\s+\}\n\s+if \(fieldErrors\.applyServer\(payload\) && focusFirstError\(\)\) return/)
```
- `tests/choice-controls-ui.test.ts:82-92` →
```ts
test("bulk move picks assets through the shared picker, with no checkbox row per asset (P1, server search Task 7)", () => {
  const source = readFileSync("src/components/asset-operations/bulk-move-form.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<AssetOperationPicker\n\s+id="bulk-move-assets"\n\s+label=\{t\("assets"\)\}\n\s+mode="bulkMove"\n\s+multiple\n\s+values=\{assets\}\n\s+required\n/)
  assert.doesNotMatch(source, /type="checkbox"|checkboxVariants|preventEnterSubmit|<SearchField\b|role="group"|<FieldError\b|availableAssets|toggleAsset/)
  assert.doesNotMatch(source, /rounded border \$\{checked|<button|import \{ Check|function Field\(|Loader2/)
  assert.match(source, /<Button type="submit" busy=\{saving\}>/)
})
```
- `tests/operations-sweep-ui.test.ts:76` title "…and the bulk move's empty answer is the picker's (spec 2D D9, M21, M25; server search Task 7)"; `:84` → `assert.doesNotMatch(bulkMove, /<EmptyNote\b/)`.
- `tests/e2e-transactions.test.ts`, the loader block Task 5 wrote (its comment and two assertions, master's `:114-117`) → (S-R37)
```ts
  // The four transaction pages load only the small master lists; their pickers ask the server. The arrival wait comes
  // down in Task 8 (S-R8).
  assert.match(read("src/lib/asset-operation-options.ts"), /export async function getAssetOperationMasterOptions\(\): Promise<AssetOperationMasterOptions>/)
  for (const page of ["checkout", "checkin", "transfer", "bulk-move"]) assert.match(read(`src/app/[locale]/(dashboard)/asset-management/${page}/page.tsx`), /getAssetOperationMasterOptions\(\)/, page)
  assert.doesNotMatch(read("src/lib/asset-operation-options.ts"), /getAssetOperationAssetLists\b/)
```

- [ ] **Step 2: Run them to see them fail**

`node --test tests/bulk-move-blocked.test.ts tests/v-track2-o.test.ts tests/choice-controls-ui.test.ts tests/operations-sweep-ui.test.ts tests/e2e-transactions.test.ts`
Expected: `bulk-move-blocked` fails with `ERR_MODULE_NOT_FOUND`; the pins fail on `AssetOperationPicker`, the remaining `type="checkbox"` and `<EmptyNote`, and `getAssetOperationAssetLists` still defined.

- [ ] **Step 3: `src/lib/bulk-move-blocked.ts`**

Pure, no imports. `readBulkMoveBlocked` keeps the entries of `payload.blocked` whose `assetId`, `assetTag` and `code` are strings, as `{ assetId, assetTag, code }`; anything else is `[]`. `bulkMoveBlockedList` groups by `code` in first-seen order: `` `${tags.join(", ")} (${reasonOf(code)})` `` joined by `" · "`.

- [ ] **Step 4: The form and the page**

`bulk-move-form.tsx`:
- Imports: drop `useId`, `useMemo`, `preventEnterSubmit`, `EmptyNote`, `FieldError`, `FieldLabel`, `checkboxVariants`, `SearchField`; add `AssetOperationPicker`, `import type { AssetOperationSearchRow }`, `readBulkMoveBlocked`, `bulkMoveBlockedList`, `type BulkMoveBlockedAsset`.
- `FIELD_IDS` comment (`:26-27`): "The asset picker's root carries the id, so focus goes to its search field (spec 6.1)." `FIELD_IDS`, `validate` and `FIELD_ORDER` unchanged.
- State: `const [assets, setAssets] = useState<AssetOperationSearchRow[]>([])`, `const [blockedAssets, setBlockedAssets] = useState<BulkMoveBlockedAsset[]>([])`, `const assetIds = assets.map((asset) => asset.id)`; `assetQuery`, `assetSearchId`, `assetsLabelId`, `availableAssets`, `toggleAsset` go; `changeAssets(rows)` as pinned. The body and `validate({ ...values, assetIds })` are unchanged.
- Refusal (`:103-107`): the `readBulkMoveBlocked` branch as pinned, before today's `applyServer` line; the `throw` stays.
- `assetsError` as pinned (const in the component body).
- Markup `:123-169` → `<div className="md:col-span-2">` holding
```tsx
<AssetOperationPicker
  id="bulk-move-assets"
  label={t("assets")}
  mode="bulkMove"
  multiple
  values={assets}
  required
  error={assetsError}
  onChange={changeAssets}
/>
```
`bulk-move/page.tsx`: `const options = await getAssetOperationMasterOptions()` and `<BulkMoveForm locations={options.locations} />`.

- [ ] **Step 5: The transitional asset lists go**

Delete Task 5's `getAssetOperationAssetLists` and `getCheckoutDestinationLabel` from `src/lib/asset-operation-options.ts` with the imports only they used (`isAssetHandoverMode`, `filterLegacyReturnEligibleAssets`, `openRepairRecordWhere`; keep what the master loader and the preselect read). Their pins:
- `tests/asset-operation-options.test.ts:39-45`: delete the test (the handover-mode rule is Task 1's verdict and Task 3's answer) and the `readFileSync` import (`:2`) only it read; the legacy filter's test stays (`filterLegacyReturnEligibleAssets` stays exported, S-R31).
- `tests/legacy-checkin-flow.test.ts:5, 11-20`: delete `operationOptionsSource` and its test.
- `tests/open-repair-filter.test.ts:7` and `tests/asset-transaction-cancellation-routes.test.ts:26`: remove `"src/lib/asset-operation-options.ts"` (Task 6 added `checkin-page-data.ts` in its place).
- `tests/list-frame-guards.test.ts:176`: delete the row (its one `RAW_DASH` site, the legacy candidate's custodian label, is gone).

- [ ] **Step 6: Messages**

`messages-t7.json` in the session scratchpad, then `node scripts/messages-edit.mjs <that path>`:
```json
{ "set": {
  "th": { "bulkMove.blockedAssets": "ย้ายไม่ได้ {count} รายการ: {list} นำรายการเหล่านี้ออกแล้วกดบันทึกอีกครั้ง" },
  "en": { "bulkMove.blockedAssets": "{count} cannot be moved: {list}. Remove them, then save again." }
} }
```

- [ ] **Step 7: Run to see them pass**

`node --test tests/bulk-move-blocked.test.ts tests/v-track2-o.test.ts tests/choice-controls-ui.test.ts tests/operations-sweep-ui.test.ts tests/e2e-transactions.test.ts tests/asset-operation-options.test.ts tests/legacy-checkin-flow.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/list-frame-guards.test.ts tests/form-frames-ui.test.ts tests/thai-glossary.test.ts`
Expected: all pass. Still passing by construction: `form-migration-guards.test.ts:89` (`[1, 1, 0]`: the reason `Input`), `validation-guards.test.ts:29,82` (one form), `form-frames-ui.test.ts:111-116` (the header meta).

- [ ] **Step 8: Full checks and commit**

`npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors). Then:
```
git add src/lib/bulk-move-blocked.ts src/components/asset-operations/bulk-move-form.tsx "src/app/[locale]/(dashboard)/asset-management/bulk-move/page.tsx" src/lib/asset-operation-options.ts messages/th.json messages/en.json tests/bulk-move-blocked.test.ts tests/v-track2-o.test.ts tests/choice-controls-ui.test.ts tests/operations-sweep-ui.test.ts tests/e2e-transactions.test.ts tests/asset-operation-options.test.ts tests/legacy-checkin-flow.test.ts tests/open-repair-filter.test.ts tests/asset-transaction-cancellation-routes.test.ts tests/list-frame-guards.test.ts
git commit -m "feat(bulk-move): ย้ายที่ตั้งหลายรายการ picks assets one at a time from the shared picker instead of one checkbox per asset in the register, a refusal that names assets shows them under the field, and the transitional asset lists go with their last caller (server search Task 7)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: E2E on the shared picker, the docs, and the runs

**Files:**
- Create: `e2e/transactions/tx-words.ts`
- Modify: `e2e/transactions/tx-support.ts:139-147` (new helpers after `pickSearchable`), `:236-240` (arrival)
- Modify: `e2e/transactions/handover.spec.ts:8-21` (imports), `:38`, `:192-197`
- Modify: `e2e/transactions/return.spec.ts:7-22` (imports), `:42-54`, `:104-106`
- Modify: `e2e/transactions/transfer.spec.ts:6-18` (imports), `:23`, `:40`, `:67`, a new test after `:112`
- Modify: `e2e/transactions/bulk-move.spec.ts:7-16` (imports), `:59-72`
- Modify: `e2e/cross-cutting/field-errors.spec.ts:9-10`, `:105`, `:128-139`, `:179`, `:191`
- Modify: `e2e/cross-cutting/support/forms.ts:3-6`, `:20-29`
- Modify: `e2e/cross-cutting/support/refusals.ts:1-5`, `:38-47`, after `:55`
- Modify: `e2e/cross-cutting/support/roles-ui.ts:10-18`
- Test: `tests/e2e-transactions.test.ts:114-118`, `:146`, `:160-162`, `:189`, `:197`, a new test after `:227`
- Test: `tests/e2e-cross-cutting.test.ts` after `:138`, `:220`, `:236-238`
- Docs: `docs/99_CHANGELOG.md:7-8` (new entry) and `:87`; `DEVELOPER_HANDOFF.md:90`, `:1219` and after `:1272`; `docs/05_ASSET_LIFECYCLE.md:109-113`; `docs/06_WORKFLOWS.md:53`; `docs/07_UAT_CHECKLIST.md:89`, `:90` and before `:532`; `docs/11_FEATURE_LIST.md:155`; `docs/12_HANDOUT.md:47`; `docs/15_ASSET_STATUS_USER_GUIDE_TH.md:94`

**Interfaces:**
- Consumes (Tasks 3-7; the controller checks each before dispatch):
  - Task 3: `src/app/api/asset-operations/search/route.ts` `GET`, query `q` (and `mode`); the handler calls `requirePermission(user, "asset", "edit")` with no `prisma.` before it (the EM2 pin reads the route file).
  - Task 4: `AssetOperationPicker` in `src/components/ui/asset-operation-picker.tsx`. Its markup contract (S-R25):
    - `#{id}`: the picker's root (label, control, hint, error, list, chosen rows);
    - `#{id}-search`: the search `<input role="combobox">`, named by the field label, with `aria-describedby` = `{id}-error` (on an error), then the hint; a save with nothing chosen focuses it;
    - `#{id}-error`: the field's error; `#{id}-listbox`: the answer;
    - `[data-asset-option="{assetId}"]` (role option): one row, with `aria-disabled="true"` when not takeable, its tag in its own `span` (text = the whole tag), and its reason in `[data-asset-option-reason]`;
    - `[data-asset-option-group="{key}"]`: each รับคืน section's `li role="presentation"`, holding its group line ("code - name", "ถืออยู่ N ชิ้น") and its rows;
    - `[data-asset-picked="{assetId}"]`: a chosen asset (single: in the field; multi: a row of "ที่เลือกแล้ว N รายการ"), showing tag · name.
  - Task 5: checkout `id="checkout-asset"`; transfer `id="transfer-asset"`; `?assetId=` of a not-takeable asset → chosen, with the reason in `#checkout-asset-error`.
  - Task 6: checkin `id="checkin-checkout"`; return-by filled from the chosen row's holder, on a pick and on a `?checkoutId=` arrival; the custody panel still shows the HO- number.
  - Task 7: bulk-move `id="bulk-move-assets"` (multi); empty save → `#bulk-move-assets-error`, focus on `#bulk-move-assets-search`.
  - `messages/th.json` values: "ข้อมูลเก่า (ไม่มีใบส่งมอบ)", "เลือกแล้ว", "ที่เลือกแล้ว {count} รายการ", "ถืออยู่ {count} ชิ้น" (placeholder name free).
- Produces:
  - `e2e/transactions/tx-words.ts`: `export const TX_WORDS = { reasonNotReady, legacyRow, alreadyChosen, chosenList, holderCount } as const` (plain data, no imports).
  - `e2e/transactions/tx-support.ts`:
    - `export const ASSET_SEARCH_PATH = "/api/asset-operations/search"`
    - `export async function searchAssets(page: Page, fieldId: string, text: string): Promise<Locator>` (the listbox)
    - `export async function findAssetRow(page: Page, fieldId: string, text: string, assetTag: string): Promise<Locator>`
    - `export async function pickAsset(page: Page, fieldId: string, text: string, assetTag: string): Promise<string>` (the asset id)
    - `export async function expectAssetBlocked(page: Page, row: Locator, reason: string)`
    - `export function pickedAsset(page: Page, assetId: string): Locator`
    - `export const TRANSACTION_PAGE_ARRIVAL_MS = 15_000`
  - `e2e/cross-cutting/support/refusals.ts`: `ApiRefusal.method: "GET" | "POST" | "PUT" | "PATCH"`, plus one `VIEWER_API_REFUSALS` row for the search.

**Decisions:**
- **Arrival timeout:** `TRANSACTION_PAGE_ARRIVAL_MS` = 15 s (S-R8). The pages now read only the master lists (about 770 employees and 1,100 locations) and, from the asset page, one row by id. Bulk-move arrived in about 3 s even with 8,796 rows (`E2E-1028C`). 15 s keeps one step above the suite's 10 s expect for the first request of a fresh build over the VPN.
- **Return-by:** it starts as the handover's holder (Task 6), so the wrong entry of return / field-errors becomes receive-by.
- **No legacy backfill in E2E** (S-R7): the transferred TR1 asset (held, no handover) is read as a ข้อมูลเก่า row and never picked. The backfill stays with the unit tests and UAT. The same goes for the bulk-move `blocked` refusal, which needs a Disposed or License asset.
- **New axe records:** a blocked row (handover), the grouped answer (return), and the chosen list with an open answer (bulk-move).
- **Viewer refusal:** the viewer's GET of the search is refused (global constraint "the viewer gets neither").

- [ ] **Step 1: Write the failing pins**

`tests/e2e-transactions.test.ts`:
- Rewrite the loader block's comment (as Task 7 left it) and the `30_000` assertion (master's `:118`). Leave the loader assertions Tasks 5 and 7 wrote (S-R37).

```ts
  // The four transaction pages load no asset register (server asset search): the first arrival check after a
  // navigation into one waits TRANSACTION_PAGE_ARRIVAL_MS, 15 s (30 s while they loaded every asset, 13B loop 7);
  // nothing else waits longer.
  assert.match(support, /export const TRANSACTION_PAGE_ARRIVAL_MS = 15_000\n/)
```
- TX2, after `:146`:
```ts
  assert.ok(spec.includes('await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)'))
  assert.ok(spec.includes('const blocked = await findAssetRow(page, "checkout-asset", asset.assetTag, asset.assetTag)'))
  assert.ok(spec.includes("await expectAssetBlocked(page, blocked, TX_WORDS.reasonNotReady)"))
  assert.ok(!spec.includes('toContainText("ไม่พบรายการ")'))
```
- TX3, replace `:160-162`:
```ts
  for (const field of ["checkin-receive-by", "checkin-condition-after", "checkin-next-status", "checkin-next-location"]) assert.ok(spec.includes(`"${field}"`), field)
  assert.ok(spec.includes('await expect(page.locator("#checkin-receive-by")).toBeFocused()'))
  assert.equal(spec.split('await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)').length - 1, 2, "both returns start with the holder")
  assert.ok(!spec.includes('pickSearchable(page, "checkin-return-by"'))
  assert.ok(spec.includes('const listbox = await searchAssets(page, "checkin-checkout", receiver.fullNameTh)'))
  assert.ok(spec.includes('await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)'))
```
- TX4, after `:189`:
```ts
  assert.ok(spec.includes("await expect(row).toContainText(TX_WORDS.legacyRow)"))
  assert.ok(!spec.includes("legacy-checkout") && !spec.includes("pickAsset("), "the ข้อมูลเก่า row is read, never picked")
```
- TX5, after `:197`:
```ts
  assert.ok(spec.includes('for (const tag of tags) await pickAsset(page, "bulk-move-assets", tag, tag)'))
  assert.ok(spec.includes('await expect(page.locator("#bulk-move-assets-search")).toBeFocused()'))
  assert.ok(spec.includes('TX_WORDS.chosenList.replace("{count}", "3")'))
  for (const old of ["input[type=checkbox]", 'getByRole("checkbox"', 'getByRole("searchbox"']) assert.ok(!spec.includes(old), old)
```
- A new test at the end:
```ts
test("the transaction specs find assets on the shared picker: the helper waits for the search's answer to the typed text, reads the picker's hooks, and the words are the app's (server asset search task 8)", async () => {
  const support = read("e2e/transactions/tx-support.ts")
  assert.ok(support.includes('export const ASSET_SEARCH_PATH = "/api/asset-operations/search"'))
  assert.match(read("src/app/api/asset-operations/search/route.ts"), /export async function GET\(/)
  for (const signature of [
    "export async function searchAssets(page: Page, fieldId: string, text: string): Promise<Locator>",
    "export async function findAssetRow(page: Page, fieldId: string, text: string, assetTag: string): Promise<Locator>",
    "export async function pickAsset(page: Page, fieldId: string, text: string, assetTag: string): Promise<string>",
    "export async function expectAssetBlocked(page: Page, row: Locator, reason: string)",
    "export function pickedAsset(page: Page, assetId: string): Locator",
  ]) assert.ok(support.includes(signature), signature)
  const search = support.slice(support.indexOf("export async function searchAssets("), support.indexOf("export async function findAssetRow("))
  assert.ok(search.indexOf("page.waitForResponse(") >= 0 && search.indexOf("page.waitForResponse(") < search.indexOf(".fill(text)"), "the wait is set before the text is typed")
  const picker = read("src/components/ui/asset-operation-picker.tsx")
  for (const hook of ['role="combobox"', "-listbox", "data-asset-option=", "data-asset-option-reason", "data-asset-option-group", "data-asset-picked=", "aria-disabled"]) assert.ok(picker.includes(hook), hook)
  for (const [file, id] of [["checkout-form.tsx", "checkout-asset"], ["checkin-form.tsx", "checkin-checkout"], ["transfer-form.tsx", "transfer-asset"], ["bulk-move-form.tsx", "bulk-move-assets"]]) {
    assert.match(read(`src/components/asset-operations/${file}`), new RegExp(`<AssetOperationPicker\\s+id="${id}"`), file)
  }
  const { readdirSync } = await import("node:fs")
  const specs = [...readdirSync("e2e/transactions").filter((name) => name.endsWith(".spec.ts")).map((name) => `e2e/transactions/${name}`), "e2e/cross-cutting/field-errors.spec.ts"]
  for (const file of specs) {
    const source = read(file)
    assert.doesNotMatch(source, /(?:pickSearchable|choose)\(\w+, "(?:checkout-asset|checkin-checkout|transfer-asset|bulk-move-assets)"/, file)
    for (const id of ["checkout-asset", "checkin-checkout", "transfer-asset"]) assert.ok(!source.includes(`locator("#${id}")`), `${file}: ${id} is read through pickedAsset`)
  }
  const { TX_WORDS } = await import("../e2e/transactions/tx-words.ts")
  const values = new Set<string>()
  const walk = (node: unknown): void => {
    if (typeof node === "string") values.add(node.replace(/\{\w+\}/g, "{}"))
    else if (node && typeof node === "object") Object.values(node).forEach(walk)
  }
  walk(JSON.parse(read("messages/th.json")))
  for (const [key, word] of Object.entries(TX_WORDS)) assert.ok(values.has(word.replace(/\{\w+\}/g, "{}")), key)
})
```

`tests/e2e-cross-cutting.test.ts`:
- EM2, after `:138`:
```ts
  // The transaction pickers' search needs asset:edit like their pages (server asset search): the viewer's GET is refused.
  assert.deepEqual(refusals.VIEWER_API_REFUSALS.filter((refusal) => refusal.method === "GET").map((refusal) => refusal.path), ["/api/asset-operations/search"])
  assert.ok(read("e2e/cross-cutting/support/roles-ui.ts").includes('refusal.method === "GET" ? { method: "GET" } : { method: refusal.method, data: refusal.body }'))
```
- `:220` becomes `["src/components/asset-operations/checkin-form.tsx", `check("receiveBy", required(values.receiveBy) ?? maxLength(values.receiveBy, 100))`, "checkin-receive-by"],`.
- `:236-238`: the picker ids leave this list (the new transactions test pins them):
```ts
    "src/components/asset-operations/checkout-form.tsx": ["checkout-destination", "checkout-condition"],
    "src/components/asset-operations/checkin-form.tsx": ["checkin-return-by", "checkin-condition-after", "checkin-next-status", "checkin-next-location"],
```
  Delete the `transfer-form.tsx` row. Its `transfer-reason` stays pinned at `:221`.

- [ ] **Step 2: Run the pins to see them fail**

Run: `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts`

Expected: FAIL in these 8 tests:
- the transactions file: the new test (`ASSET_SEARCH_PATH`), TX1 (`= 15_000`), TX2, TX3, TX4 and TX5;
- the cross-cutting file: EM2 (no GET row) and EM3 (the spec has no `expectFieldError(page, "checkin-receive-by", `).

The rest pass.

- [ ] **Step 3: The words and the helpers**

Create `e2e/transactions/tx-words.ts`. It is plain data with a header comment that names the pin.
```ts
export const TX_WORDS = {
  reasonNotReady: "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น",
  legacyRow: "ข้อมูลเก่า (ไม่มีใบส่งมอบ)",
  alreadyChosen: "เลือกแล้ว",
  chosenList: "ที่เลือกแล้ว {count} รายการ",
  holderCount: "ถืออยู่ {count} ชิ้น",
} as const
```

`e2e/transactions/tx-support.ts`, after `pickSearchable` (`:147`):
```ts
// The transaction pickers' search (Task 3) and the shared asset picker (src/components/ui/asset-operation-picker.tsx,
// spec 6.1): type into #<fieldId>-search, wait for the answer to exactly that text (it must differ from the field's current
// text: a fill that changes nothing sends no request), and read the rows in #<fieldId>-listbox.
export const ASSET_SEARCH_PATH = "/api/asset-operations/search"
export async function searchAssets(page: Page, fieldId: string, text: string): Promise<Locator> {
  const answered = page.waitForResponse((response) => {
    const url = new URL(response.url())
    return url.pathname === ASSET_SEARCH_PATH && url.searchParams.get("q") === text
  })
  await page.locator(`#${fieldId}-search`).fill(text)
  expect((await answered).status(), `${ASSET_SEARCH_PATH} q=${text}`).toBe(200)
  const listbox = page.locator(`#${fieldId}-listbox`)
  await expect(listbox).toBeVisible()
  return listbox
}
// The answer's one row of the asset whose tag shows whole.
export async function findAssetRow(page: Page, fieldId: string, text: string, assetTag: string): Promise<Locator> {
  const row = (await searchAssets(page, fieldId, text)).locator("[data-asset-option]").filter({ has: page.getByText(assetTag, { exact: true }) })
  await expect(row).toHaveCount(1)
  return row
}
// Choose a takeable row; the field (or bulk-move's chosen list) then holds it. Returns the asset's id.
export async function pickAsset(page: Page, fieldId: string, text: string, assetTag: string): Promise<string> {
  const row = await findAssetRow(page, fieldId, text, assetTag)
  await expect(row).not.toHaveAttribute("aria-disabled", "true")
  const assetId = (await row.getAttribute("data-asset-option")) ?? ""
  await row.click()
  await expect(pickedAsset(page, assetId)).toContainText(assetTag)
  return assetId
}
// A row the transaction cannot take: marked, its reason under it, and a click (forced: Playwright waits for an
// aria-disabled row to be enabled) chooses nothing.
export async function expectAssetBlocked(page: Page, row: Locator, reason: string) {
  await expect(row).toHaveAttribute("aria-disabled", "true")
  await expect(row.locator("[data-asset-option-reason]")).toHaveText(reason)
  await row.click({ force: true })
  await expect(page.locator("[data-asset-picked]")).toHaveCount(0)
}
export function pickedAsset(page: Page, assetId: string): Locator {
  return page.locator(`[data-asset-picked="${assetId}"]`)
}
```

`:236-240`:
- The value becomes `export const TRANSACTION_PAGE_ARRIVAL_MS = 15_000`.
- Rewrite the comment: the pages load no asset register since the server asset search; they read only their master lists, and, from the asset page, one row by id. It was 30 s while they loaded every asset (13B loop 7). Give the 15 s reason from Decisions.

- [ ] **Step 4: The transaction specs drive the picker**

Each spec adds the helpers it uses to its `./tx-support.ts` import, and `import { TX_WORDS } from "./tx-words.ts"`.

`handover.spec.ts`:
- `:38` becomes `await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)`.
- `:192-197` become:
```ts
    // A fresh form from the asset page starts with the asset chosen but blocked, the reason under the field (spec 6.4);
    // an empty form's picker lists it faint with the same reason, and a click chooses nothing (spec 6.1, §8).
    await visit(measure, `/th/asset-management/checkout?assetId=${asset.id}`, "a fresh handover form", testInfo)
    await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)
    await expectFieldError(page, "checkout-asset", TX_WORDS.reasonNotReady)
    await visit(measure, "/th/asset-management/checkout", "an empty handover form", testInfo)
    const blocked = await findAssetRow(page, "checkout-asset", asset.assetTag, asset.assetTag)
    await record(measure, "handover picker, a blocked row", testInfo)
    await expectAssetBlocked(page, blocked, TX_WORDS.reasonNotReady)
```

`return.spec.ts`, test 1:
- After `:42`, add `await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)`.
- Keep `:43`.
- Before the `record` at `:44`, add `await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)`, under the comment "the handover's holder returns it: return-by starts filled (spec 6.3)".
- `:48` loses `"checkin-return-by"`.
- `:51` becomes `await expect(page.locator("#checkin-receive-by")).toBeFocused()`.
- Delete `:53`.

`return.spec.ts`, test 2: `:104-105` become the code below. `:106` stays.
```ts
  // Found on the empty form (spec 6.3): by the holder's name the answer is one group, theirs; picked by its tag, the
  // handover's document shows and its holder starts as return-by.
  await visit(measure, "/th/asset-management/checkin", "return form", testInfo)
  const listbox = await searchAssets(page, "checkin-checkout", receiver.fullNameTh)
  const groups = listbox.locator("[data-asset-option-group]")
  await expect(groups).toHaveCount(1)
  await expect(groups).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
  await expect(groups).toContainText(new RegExp(TX_WORDS.holderCount.replace("{count}", "\\d+")))
  await record(measure, "return picker, grouped by the holder", testInfo)
  await pickAsset(page, "checkin-checkout", asset.assetTag, asset.assetTag)
  await expect(page.getByRole("main")).toContainText(handover.documentNo)
  await expect(page.locator("#checkin-return-by")).toContainText(`${receiver.code} - ${receiver.fullNameTh}`)
```

`transfer.spec.ts`:
- `:23`: the map's value adds `assetTag: string`, and `:67` sets `assetTag: asset.assetTag`.
- `:40` becomes `await expect(pickedAsset(page, asset.id)).toContainText(asset.assetTag)`.
- After `:112`, add a fourth serial test:
```ts
  // The transferred asset is held with no handover: รับคืน lists it as ข้อมูลเก่า under its holder, ready to pick (spec
  // 6.3). It is read, never picked, so no backfill is made (S-R7).
  test("the transferred asset is a ข้อมูลเก่า row on รับคืน, under its holder (server asset search)", async ({ page, measure }, testInfo) => {
    const transfer = transfers.get(testInfo.project.name)
    expect(transfer, "the transfer test ran first").toBeTruthy()
    if (!transfer) return
    await visit(measure, "/th/asset-management/checkin", "return form, empty", testInfo)
    const row = await findAssetRow(page, "checkin-checkout", transfer.assetTag, transfer.assetTag)
    await expect(row).not.toHaveAttribute("aria-disabled", "true")
    await expect(row).toContainText(TX_WORDS.legacyRow)
    // The group that holds the row (the inner locator is relative to the group: Playwright queries it inside each group).
    await expect(page.locator("#checkin-checkout-listbox [data-asset-option-group]").filter({ has: page.locator(`[data-asset-option="${transfer.assetId}"]`) })).toContainText(transfer.custodian)
  })
```

`bulk-move.spec.ts`: the imports add `pickAsset`, `searchAssets` and `TX_WORDS` (`pickSearchable` stays for the room); `:59-72` become:
```ts
  // The bulk move: a wrong entry first (nothing chosen), then each asset typed by its tag and picked (spec 6.3).
  await visit(measure, "/th/asset-management/bulk-move", "bulk move form", testInfo)
  await page.getByRole("button", { name: "บันทึก", exact: true }).click()
  await expectFieldError(page, "bulk-move-assets", "กรุณาเลือกทรัพย์สินอย่างน้อย 1 รายการ")
  await expectFieldError(page, "bulk-move-to-location", "กรุณาระบุข้อมูลนี้")
  await expectFieldError(page, "bulk-move-reason", "กรุณาระบุข้อมูลนี้")
  await expect(page.locator("#bulk-move-assets-search")).toBeFocused()
  await expect(page.locator("#bulk-move-assets-search")).toHaveAttribute("aria-describedby", /(?:^|\s)bulk-move-assets-error(?:\s|$)/)

  for (const tag of tags) await pickAsset(page, "bulk-move-assets", tag, tag)
  await expect(page.locator("[data-asset-picked]")).toHaveCount(3)
  await expect(page.getByRole("main")).toContainText(TX_WORDS.chosenList.replace("{count}", "3"))
  await expect(page.locator("#bulk-move-assets-error")).toHaveCount(0)
  // A later answer marks the chosen ones (spec 6.1).
  const listbox = await searchAssets(page, "bulk-move-assets", tags[0].slice(0, -1))
  await expect(listbox.locator("[data-asset-option]").filter({ hasText: TX_WORDS.alreadyChosen })).toHaveCount(3)
  await record(measure, "bulk move, three chosen and a later answer", testInfo)
  await page.keyboard.press("Escape")
```

- [ ] **Step 5: The cross-cutting specs and helpers**

`field-errors.spec.ts`:
- `:9-10`: the comment becomes "The transaction pages' first arrival and the shared picker's chosen asset (the transaction area's helpers)". The import becomes `{ pickedAsset, TRANSACTION_PAGE_ARRIVAL_MS }`.
- `:105`, `:134`, `:179`, `:191`: `page.locator("#checkout-asset" | "#checkin-checkout" | "#transfer-asset")` becomes `pickedAsset(page, asset.id)`. The rest of each line is unchanged, so the TX1 arrival count (4) holds.
- `:128` title: "return: no one who receives it shows its error, and the corrected return saves".
- `:136` becomes `await expectFieldError(page, "checkin-receive-by", REQUIRED)`, under the comment "the handover's holder starts as return-by (spec 6.3), so the first wrong field is receive-by".
- `:139` becomes `await expectNoFieldError(page, "checkin-receive-by")`.

`support/forms.ts`:
- Import `expect` from `"../../support/fixtures.ts"`.
- In `fillReturn`, the return-by `choose` becomes `await expect(page.locator("#checkin-return-by")).toContainText(run.employees.receiver1.code)`.
- The comment says the receiver already returns it, as the chosen handover's holder.

`support/refusals.ts`:
- `ApiRefusal.method` adds `"GET"`.
- The body comment adds "a GET sends none".
- After `:55`, add the row:
  ```ts
  { method: "GET", path: "/api/asset-operations/search", file: "asset-operations/search/route.ts", permission: "asset:edit", body: {} },
  ```
- The header comment says a GET carries no body.

`support/roles-ui.ts:14` becomes:
```ts
    const response = await request.fetch(refusal.path, refusal.method === "GET" ? { method: "GET" } : { method: refusal.method, data: refusal.body })
```

- [ ] **Step 6: Run the pins to see them pass**

Run: `node --test tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts tests/e2e-fixes.test.ts tests/e2e-review.test.ts tests/e2e-suite.test.ts`

Expected: PASS. `e2e-fixes` reads the transfer and field-errors URLs, which are unchanged. `e2e-review` checks that no new e2e code holds a DELETE or a hazard.

- [ ] **Step 7: The whole unit suite, the types and the lint**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: PASS, with 0 lint errors. `tsc` covers `e2e/`.

- [ ] **Step 8: Commit the E2E**

```bash
git add e2e/transactions/tx-words.ts e2e/transactions/tx-support.ts e2e/transactions/handover.spec.ts e2e/transactions/return.spec.ts e2e/transactions/transfer.spec.ts e2e/transactions/bulk-move.spec.ts e2e/cross-cutting/field-errors.spec.ts e2e/cross-cutting/support/forms.ts e2e/cross-cutting/support/refusals.ts e2e/cross-cutting/support/roles-ui.ts tests/e2e-transactions.test.ts tests/e2e-cross-cutting.test.ts
git commit -m "test(e2e): the transaction specs find assets on the shared picker (pickAsset types, waits for the search's answer and picks the row; a handed-over asset starts blocked from the asset page and is listed faint with its reason; bulk-move types each tag; รับคืน groups by the holder's name and the transferred asset reads ข้อมูลเก่า; the viewer is refused the search) and TRANSACTION_PAGE_ARRIVAL_MS comes down to 15 s (server asset search task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 9: The docs**

Name every file, route, code and word as Tasks 1-7 committed them: read `git log --stat master..HEAD`, then the files. No template markers (`tests/e2e-docs.test.ts:34`).

- `docs/99_CHANGELOG.md`:
  - Add an entry `### ค้นหาทรัพย์สินฝั่งเซิร์ฟเวอร์ในหน้าส่งมอบ รับคืน โอนย้าย และย้ายที่ตั้งหลายรายการ` at the top, under the commit date's `## ` heading (`:7` if it is still 2026-10-28). It holds:
    - the branch, spec and plan;
    - the pages no longer load the register;
    - the picker: 2 characters, at most 20 rows, "พบ N รายการ", an exact code first, faint rows with their reason, failed versus not found;
    - the search route and `asset:edit`;
    - the one rule file and `getAssetActions` unchanged;
    - each page's rules (spec 6.3), including the ข้อมูลเก่า confirm and return-by from the holder;
    - the 5 route refusals (409 and their codes) and the Production SELECT of 2026-10-28 (none caught);
    - E2E: the helpers, 30 → 15 s, the blocked row, the holder's group, the ข้อมูลเก่า row, the viewer's refusal;
    - "เรื่องที่ผู้ใช้ควรตรวจ": the five new reason words, the count line's words, the blocked preselect, return-by on both paths, the ข้อมูลเก่า count line, and the backfilled handover's English remark on the return panel (unchanged, S-R34);
    - "deploy: ยังไม่ deploy · ไม่มี migration".
    - The controller adds "ผล E2E" in Step 11.
  - In `:87`, replace "หน้าย้ายที่ตั้งหลายรายการโหลดทรัพย์สินทั้งหมด (dev มีเกือบ 8,000 รายการ) ค้างราว 98 วินาทีก่อนกดบันทึก" with "หน้าย้ายที่ตั้งหลายรายการเปิดได้ในราว 3 วินาที แต่แสดงทรัพย์สินทุกรายการเป็นช่องติ๊ก (8,796 แถวใน `E2E-1028C`) และการตรวจ axe ที่ E2E ทำทุกหน้าใช้เวลา 90–130 วินาทีกับแถวเหล่านั้น (แก้ข้อความ 2026-10-28 ตาม trace ของ `E2E-1028C`: เดิมเขียนว่าหน้าค้างราว 98 วินาที)". The rest of the line stays.
- `DEVELOPER_HANDOFF.md`:
  - `:90`: replace "The check-in page shows those legacy candidates in a searchable \"ข้อมูลเก่า\" panel with result counts and empty-state feedback." with "The check-in page lists those legacy candidates as ข้อมูลเก่า rows of its asset picker (one confirm, then the backfill)."
  - `:1219`: drop the clause "the checkout, check-in, transfer and bulk-move pages load every active asset … TX redesign); ". In its place, add "(the transaction pages' full asset lists went with the server asset search, 2026-10-28, below)".
  - After `:1272`, add a bullet "Server asset search on the transaction pages." in plan 4's shape: date, branch, not deployed, no migration, spec and plan; **Rules**; **Search**; **Picker** (its DESIGN.md section and docs/14 row from Task 4); **Pages**; **E2E** (the five helpers, `tx-words.ts`, 15 s, the viewer's GET); **Calls for the user to check**.
- `docs/06_WORKFLOWS.md:53`, rewritten for the picker:
  - Check-in's one asset field finds by tag, serial, fixed-asset code, the holder's code or name, or the HO- number, grouped by holder.
  - A ข้อมูลเก่า row asks once ("สร้างใบส่งมอบย้อนหลังแล้วรับคืน"), then backfills (`legacy_return_backfill`, unchanged) and continues the return.
  - ส่วนควบ and License are listed with their reason.
  - Keep the repair-cancel sentence.
  - Add a bullet before it on the four pages' shared picker and search (`asset:edit`, 20 rows, exact first, the asset page's rules, not-takeable rows with their reason) and the 6.5 route refusals; on โอนย้าย a บุคคล asset outside Ready/In Use can be moved (location or department) but not given a custodian, and the asset page's โอนย้าย reads the custodian rule (S-R40).
- `docs/05_ASSET_LIFECYCLE.md` (Current Code Enforcement):
  - `:109`: after "accepts only `Ready`", add "and refuses ส่วนควบ and License assets (409 `ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED`, `ASSET_LICENSE_CHECKOUT_NOT_ALLOWED`); a ทรัพย์สินอื่น destination must be another active asset that could itself be handed over (409 `ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED` under the destination field)".
  - `:111`: after "an active checkout", add ", refuses an asset with an unfinished repair record (409 `ASSET_CHECKIN_REPAIR_OPEN`, checked again inside the transaction)".
  - `:112`: delete "(skipped when the asset already has an unfinished record)"; check-in now refuses that case first.
  - `:113`: after "blocks assets that already have an active checkout", add ", refuses License assets (409 `ASSET_LICENSE_MOVE_NOT_ALLOWED`)".
  - After `:113`, add the bullet: "The legacy backfill (`POST /api/assets/{id}/legacy-checkout`) refuses ส่วนควบ and License assets (409 `ASSET_COMPONENT_CHECKIN_NOT_ALLOWED`, `ASSET_LICENSE_CHECKIN_NOT_ALLOWED`). Bulk move refuses License assets (409 `ASSET_LICENSE_MOVE_NOT_ALLOWED`, naming each one in `blocked: [{ assetId, assetTag, code }]`). The transaction pickers list these assets with the same reason (server asset search, 2026-10-28)."
- `docs/07_UAT_CHECKLIST.md`:
  - `:89` reads the picker's ข้อมูลเก่า row and its confirm, instead of the panel.
  - `:90`: replace "the asset becomes eligible for the legacy return panel" with "the asset shows as a takeable ข้อมูลเก่า row in the Check-in asset picker".
  - Before `## Sign-Off` (`:532`), add `## Transaction Asset Search UAT (2026-10-28)`. It opens with what the E2E covers. Then:
    - [ ] each page answers a typed code within about 1 s on Production-size data over the VPN (spec §4: an index if over 1 s);
    - [ ] ส่งมอบ lists a ส่วนควบ, a License, an In Use asset and an open handover, each with its reason;
    - [ ] รับคืน: a person's name lists their assets under them; a ข้อมูลเก่า row backfills and returns; a held computer's components read "ส่วนควบรับคืนพร้อมเครื่องหลัก" and come back with it;
    - [ ] โอนย้าย: a custodian chosen after an asset that no longer fits clears it, with the reason under the field;
    - [ ] โอนย้าย: a บุคคล asset in อยู่ระหว่างตรวจสอบ is takeable with no custodian and is cleared with its reason when a custodian is chosen; the asset page shows โอนย้าย disabled for it (S-R40);
    - [ ] ย้ายที่ตั้งหลายรายการ: remove a chosen row; a failed search keeps the chosen list;
    - [ ] a VPN drop shows "ค้นหาไม่สำเร็จ ลองอีกครั้ง", and the retry works;
    - [ ] NVDA and VoiceOver: the active row, blocked rows skipped, the count read politely;
    - [ ] an English pass of the new messages.
- `docs/11_FEATURE_LIST.md:155`: "Bulk location movement for multiple assets, each typed by its code and picked from the server search".
- `docs/12_HANDOUT.md:47` and `docs/15_ASSET_STATUS_USER_GUIDE_TH.md:94`: the `ข้อมูลเก่า` box becomes the row in the asset field of the return page. Keep docs/15's conditions, and add that ส่วนควบ and License show their reason.

- [ ] **Step 10: Run and commit the docs**

Run: `npm test && npx tsc --noEmit && npm run lint`

Expected: PASS. The docs pins (`e2e-docs`, `shell-docs`, `phase2d-docs`, `dark-mode-docs`, `v-track-docs`) still find their sections in place.

```bash
git add docs/99_CHANGELOG.md DEVELOPER_HANDOFF.md docs/05_ASSET_LIFECYCLE.md docs/06_WORKFLOWS.md docs/07_UAT_CHECKLIST.md docs/11_FEATURE_LIST.md docs/12_HANDOUT.md docs/15_ASSET_STATUS_USER_GUIDE_TH.md
git commit -m "docs: the server asset search on the transaction pages (changelog, handoff, lifecycle rules, workflows, UAT, feature list, handout, status guide), and the bulk-move note corrected: the page arrived in about 3 s and the time went to axe over 8,796 rendered rows (server asset search task 8)" -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 11 (the controller, not the implementer): the targeted E2E run, then the whole suite**

Each run needs:
- the VPN;
- `scratchpad/stay-awake.ps1`;
- the database probe first (`scratchpad/e2e-plan/tools/select-e2e-counts.cjs`);
- a clean build: `rm -rf .next && npm run build`.

No other spec hands a ส่วนควบ or a License to a transaction route, and no spec returns an asset with an open repair (grep of `e2e/` on 2026-10-28). Task 2's refusals therefore change no other spec.

**The targeted run:**

Run: `npx playwright test e2e/transactions e2e/smoke e2e/cross-cutting/field-errors.spec.ts e2e/asset-detail e2e/cross-cutting/roles.spec.ts`

Expected: every test passes in all four projects, with axe 0. Why each one is in the run:
- `e2e/transactions`: every picker. Bulk-move must pass in all four projects; before the dev data grew it took 33-34 s.
- `e2e/smoke`: the cadence.
- `field-errors`: the three forms' arrivals and the receive-by error.
- `e2e/asset-detail`: `getAssetActions` unchanged (S-R1), and the links in.
- `roles`: the four pages and the search refused to the viewer.

Read the four pages' `loadMs` in `e2e-results/summary.json`. If any first arrival is over 10 s, report it rather than raising the 15 s.

**Then the whole suite, once** (spec §8):

Run: `npx playwright test`

Expected: every test passes, about 386 tests (`E2E-1028B`'s 382 plus the new transfer test in four projects). It takes about an hour, and the dev data grows about 230 assets.

Afterwards, in one commit on `feat/server-asset-search`, the controller adds:
- the "ผล E2E" bullet to the changelog entry: both run ids, passed / failed / skipped per project, and the bulk-move time;
- the run ids to the handoff bullet.

It then updates the AssetSystem wiki:
- `ams-status`: a new row;
- `ams-open-questions:125`: close the bulk-move item, and correct its "ค้างราว 98 วินาที" as in the changelog; add the backfill remark's English words as an open item (S-R34); record the user's two decisions of 2026-10-28 as settled: the checkout route checks the ทรัพย์สินอื่น destination as the picker does (S-R39), and a บุคคล asset outside Ready/In Use can be moved on โอนย้าย without a custodian while the asset page's โอนย้าย stays disabled (S-R40);
- `ams-log`.

Then it runs `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` (at `D:\Obsidian\Eltross`) and commits the vault with `ingest:`.

---

## Appendix: Rulings

- S-R1: The verdict functions (Task 1) are the one rule; `getAssetActions`, the search and the routes call them. `getAssetActions`' existing answers do not change (pinned).
- S-R2: An open handover of any ownership type stays returnable (mode set, status fits, no open repair) — nothing stranded (spec 6.3).
- S-R3: The search answers at most 20 rows and one total; exact code (tag/serial/fixedAssetCode) first, then tag prefix, then by tag.
- S-R4: Checkin groups by holder: user checkout → the checkout's custodian; department/location/asset checkout → that destination's label; legacy → the asset's custodian; nothing to return → "ไม่มีผู้ถือครอง" last. Groups ordered by their first row's rank.
- S-R5: The by-id answer serves the preselect and restores labels; it runs the same verdict.
- S-R6: The new route refusals are 409 with catalogued codes whose Thai words equal the picker's reasons (the destination refusal of S-R39 has one word of its own).
- S-R7: E2E adds no data beyond what the transaction specs create today (run-scoped tags).
- S-R8: `TRANSACTION_PAGE_ARRIVAL_MS` comes down only after the four pages stop loading assets (Task 8).
- S-R9: The refusal codes are one per ownership type and transaction, so each code has one word: `ASSET_COMPONENT_CHECKOUT_NOT_ALLOWED`, `ASSET_LICENSE_CHECKOUT_NOT_ALLOWED`, `ASSET_COMPONENT_CHECKIN_NOT_ALLOWED`, `ASSET_LICENSE_CHECKIN_NOT_ALLOWED`, `ASSET_LICENSE_MOVE_NOT_ALLOWED` (transfer and bulk-move) and `ASSET_CHECKIN_REPAIR_OPEN`; the skeleton's `ASSET_OWNERSHIP_*_NOT_ALLOWED` names are not used (Tasks 1, 2, 7).
- S-R10: Task 1 also exports `getAssetOperationOwnershipRefusal`, `assetOperationRefusalReasonKeys` (the only place a code meets its word), the code types, `AssetOperationOwnershipOperation`, `AssetCheckinPath` and `AssetCheckinVerdict`; `AssetOperationFacts.ownership` is `AssetOwnershipType` from `asset-ownership.ts` (the same type as `AssetOwnershipKind`).
- S-R11: S-R1 yields to spec §5: `getAssetActions`' `enabled` answers change in no case, and its `reasonKey` changes only for an open handover with no open repair whose custody type is missing or does not fit (now the picker's `HandoverModeMissing` / `HandoverStatusMismatch`), pinned in `tests/asset-actions.test.ts`.
- S-R12: `checkoutParent` never offers the asset being handed over: the search leaves it out of its wheres, and the verdict's backstop word is the new `asset.transactionReasonSameAsset` "เป็นทรัพย์สินที่กำลังส่งมอบ เลือกเป็นปลายทางไม่ได้".
- S-R13: The two misfit-handover reasons are new `asset.*` keys copying `checkin.handoverModeMissing` / `checkin.handoverStatusMismatch` (no catalog entry exists for the mismatch code; reasons must be `asset.*` keys); a Task 1 test keeps the pairs equal.
- S-R14: The checkin legacy reasons follow the asset page's order (ownership, repair, holder, status); the legacy-checkout route keeps its own order and refuses the same set.
- S-R15: The checkin route's repair pre-check runs after the field checks, just before the transaction (the `tests/v-track2-x.test.ts:68-120` stub has no `maintenanceTicket`); inside the transaction the re-check runs before `getCheckinHandoverStatusError`, the verdict's order.
- S-R16: Bulk-move refuses a License before the open handover and Disposed/Retired, so a request without a License answers as on master; the bulk-move verdict follows that order.
- S-R17: `searchAssetOperationOptions(db, input)` takes the db (as `searchMaintenanceOptions`) and no user, since the transaction routes apply no data scope and the route checks `asset:edit`; the page loaders `getAssetOperationPreselect(mode, assetId)` and `getCheckinPreselect({ checkoutId, assetId })` take no user and run after `requirePagePermission` (Tasks 3, 5, 6).
- S-R18: `excludeIds` is dropped from the parse, the picker's context and the forms: spec 6.1 keeps a chosen asset in later answers as "เลือกแล้ว", which the picker marks from its own `values` (Tasks 3, 4, 7).
- S-R19: S-R3 yields to spec 6.1: the prefix tier is "tag, serial or fixed-asset code starts with the text", not the tag only.
- S-R20: Task 3's `AssetOperationSearchRow` is the one row shape (`id, assetTag, name, serialNumber, statusLabel, placeLabel: string, currentLocationId, conditionId, eligible, reasonKey`; on รับคืน `checkout?`, `legacy?`, `holderKey`, `holderLabel`, `holderEmployeeId`); consumers read the holder through `holderLabel` / `holderEmployeeId`, with no `holder` object and no `placeKind` (Tasks 4, 6).
- S-R21: Every client search URL is built by Task 3's `buildAssetOperationSearchHref` (`assignCustodian=1`, never `"true"`): the picker's `buildAssetOperationSearchUrl` wraps it with `isAssetOperationSearchReady`, and Task 5's custodian re-check and Task 6's row read call it directly.
- S-R22: A handover with no document number reads as an ordinary row (status · place) in the picker, so `AssetOperationRowDetail`'s handover `documentNo` is always a string.
- S-R23: The "nothing to return" group is `key: "none"`, `label: null`, worded by the picker's `noHolderGroup`; a destination label that cannot be read is `-` (never an id), and the rules file's two `"-"` fallbacks get an LV2 row in `tests/list-frame-guards.test.ts` (Task 3).
- S-R24: `AssetOperationPicker` is a new shared part in `src/components/ui/`, not an extension of `SearchableSelect` (its browser-side filter, popover and one-value pick cannot hold spec 6.1 without rewriting 30 call sites): inline list, no popover, no spinner, the highlight from `splitSearchHighlight`.
- S-R25: The picker's DOM contract: `#<id>` is the root (so `focusFirst` reaches the search field or "เปลี่ยน"), `#<id>-search` the combobox, `#<id>-listbox`, `#<id>-error`, `[data-asset-option=<assetId>]` with `aria-disabled` and `[data-asset-option-reason]`, the tag in its own `span`, `[data-asset-option-group=<key>]` on each รับคืน section, `[data-asset-picked=<assetId>]` and `[data-asset-search-count]` (Tasks 4, 7, 8).
- S-R26: The picker takes `initialQuery` (รับคืน `?assetId=`: the search starts filled and open, spec 6.4), and a pick calls `onChange` only for a takeable row; a page may refuse a pick by not setting `value` (the ข้อมูลเก่า confirm).
- S-R27: A chosen row that cannot be taken stays chosen and its reason is the field's error: the picker shows it when the page passes no `error`, and ส่งมอบ, โอนย้าย and รับคืน pass the same words so the save stops on it (`"invalid"` / `blockedReason`).
- S-R28: The picker's words are 15 `assetOperation.*` keys plus `common.searchSelectPlaceholder`, `common.searchSelectResultCount` and `common.tryAgain`; spec 6.1's "ค้นหาไม่สำเร็จ ลองอีกครั้ง" is the line "ค้นหาไม่สำเร็จ" plus the retry button; รับคืน uses the picker's `hintCheckin`, so no `checkin.assetSearchHint` is added.
- S-R29: Task 5 keeps รับคืน's and ย้ายที่ตั้งหลายรายการ's lists in a transitional `getAssetOperationAssetLists(master)` (master's code, verbatim); Task 6 stops calling it and leaves it whole; Task 7 deletes it with `getCheckoutDestinationLabel`.
- S-R30: Task 5's added names stand: `getAssetOperationMasterOptions`, `getAssetOperationPreselect`, `getAssetOperationAssetLists`, `src/lib/asset-operation-form-rules.ts` (`assetOperationRowLabel`, `chosenAssetReasonKey`, `transferAssetToClear`, `ClearedTransferAsset`) and `transfer.assetClearedForCustodian` "นำ {assetTag} ออกแล้ว: {reason}".
- S-R31: Dead code goes with its last reader: Task 5 deletes `filterCheckoutEligibleAssets`, `filterPersonalTransferEligibleAssets`, their tests and `checkout.selectAsset` / `transfer.selectAsset`; `filterLegacyReturnEligibleAssets` stays, pinned as the legacy rule by `tests/asset-register-transactions.test.ts:51` and `tests/asset-operation-options.test.ts:27-37`.
- S-R32: Return-by starts as the chosen row's holder on every pick and on the `?checkoutId=` arrival, only when that holder is in the employee list; a prefilled return-by is cleared when the choice changes to none or to a row without an active holder (one chosen by hand stays); the รับคืน E2E wrong entry therefore becomes receive-by (Task 8: `return.spec.ts`, `field-errors.spec.ts`, `support/forms.ts`, `tests/e2e-cross-cutting.test.ts:220`).
- S-R33: รับคืน loses the empty state, the "รายการนี้ต้องตรวจสอบก่อนรับคืน" notice, the `hasActiveCheckouts` gate and the separate legacy list (each row carries its reason); their 15 `checkin.*` keys are deleted.
- S-R34: The backfilled handover's English remark on the custody panel (`legacy-checkout/route.ts:16`, shown on master too) is stored data shown on several pages and stays unchanged here; Task 8 lists it under the changelog's "เรื่องที่ผู้ใช้ควรตรวจ" and in `ams-open-questions`.
- S-R35: Task 8 adds two steps that create no data: the viewer's refused GET of the search (`ApiRefusal.method` gains `"GET"`) and a read-only ข้อมูลเก่า check of the transferred asset on รับคืน; the legacy backfill and the bulk-move `blocked` refusal stay with the unit tests and UAT (S-R7).
- S-R36: `TRANSACTION_PAGE_ARRIVAL_MS` becomes 15 s in Task 8 (S-R8), one step above the suite's 10 s expect for a fresh build's first request over the VPN; a first arrival over 10 s is reported, not met by raising it.
- S-R37: `tests/e2e-transactions.test.ts`' loader block (master's `:114-118`): Task 5 pins `getAssetOperationMasterOptions` on the loader and the four pages; Task 6 leaves it; Task 7 adds that `getAssetOperationAssetLists` is gone; Task 8 rewrites the comment and the 15 s line.
- S-R38: `?checkoutId=` has no search input of its own: `getCheckinPreselect` reads that open handover's asset id, asks by id, and keeps the row only when `row.checkout?.id` is that handover.
- S-R39 (the user, 2026-10-28; spec 6.5 row amended): `POST /api/assets/[id]/checkout` with `checkoutType: "asset"` refuses a destination that is missing or inactive, or that `getCheckoutParentVerdict` refuses (itself, ส่วนควบ, License, not Ready, under an open handover), with 409 `ASSET_CHECKOUT_DESTINATION_NOT_ALLOWED` and `fieldErrors.parentAssetId = "checkoutDestinationNotAllowed"` "เลือกทรัพย์สินนี้เป็นปลายทางไม่ได้ เลือกปลายทางอื่น" (Task 2 Step 3b). The picker still shows the verdict's specific reason.
- S-R40 (the user, 2026-10-28, choice ก; spec 6.3 amended): On โอนย้าย with no custodian chosen, a บุคคล asset follows the move rule (spec 6.3; the route's `move_scope`, `transfer/route.ts:42`). The asset page's โอนย้าย for a บุคคล asset is an assign (user decision 2026-10-21 Y2; S-R11 keeps it). So a บุคคล asset that is neither Ready/In Use nor Disposed/Retired, with no open handover, reads "โอนย้ายได้เมื่อสถานะเป็น พร้อมใช้งาน หรือ ใช้งานอยู่" on the asset page but is takeable on /asset-management/transfer until a custodian is chosen. The two answers differ by design: two contexts of one function, not two rules (pinned in Task 1's agreement test). The user chose this on 2026-10-28: the transfer page has never been used on Production, and the 82 บุคคล assets still อยู่ระหว่างตรวจสอบ get their status set after the field audit.
- S-R41: Picker accessibility details (Task 4): the list closes through the root's `onBlur`, with no `document`/`window` listener (`tests/ui-overlay-guards.test.ts:78-81`); `selectableRows` is index-aligned with `flatRows`; Enter and ↑↓ act on rows only while `listOpen`; the live region reads only while the list is open (or the chosen count in the hint state), a remove announces the new count, and typing clears the old one.
- S-R42: A repeated `?assetId=` or `?checkoutId=` (an array in Next's `searchParams`) is normalised in the loaders to its first value, as `asset-return-navigation.ts:9` does; an empty string counts as absent (Tasks 5, 6).

Rulings bind the tasks. Where a task and a ruling disagree, the ruling wins; where a ruling and the spec disagree, the spec wins and the controller rules again.

---

## Addendum (2026-10-29): what the new pages lost against the old ones

A function audit compared the old pages (`c6db08c4`), the canvas TX boards and this branch (four inventory agents, four verifiers; the full table is the session's `scratchpad/server-search/gap-audit.json`). The user chose, on 2026-10-29: open repairs no longer block a return (choice ก), and fix the four other losses. Spec 6.1, 6.3 and 6.5 are amended to match.

Addendum rulings (they bind Tasks 9 and 10 and supersede the rulings they name):
- S-R43 (supersedes the repair part of S-R2, S-R6, S-R11, S-R15): on the handover path an open repair no longer refuses the return. With an open repair the return goes into ส่งซ่อม (status `Under Maintenance`), and no second repair record is made (the route's existing `openRecords === 0` guard). `getAssetActions`' รับคืน is enabled for an open handover with an open repair. The ข้อมูลเก่า path keeps its repair refusal, because the legacy backfill route refuses an open repair. The route refuses another next status with 409 `ASSET_CHECKIN_REPAIR_STATUS_REQUIRED` under `nextStatusId`. `ASSET_CHECKIN_REPAIR_OPEN` and its words leave the code, the catalog and the messages.
- S-R44: on ย้ายที่ตั้งหลายรายการ a pick keeps the search text and the list open, so several rows of one answer can be picked. The active row moves to the next takeable row, and picked rows read "เลือกแล้ว".
- S-R45 (extends S-R3/S-R19 for รับคืน only): the order is exact code first, then held rows (an open handover or a custodian), then code prefix, then the rest, each tier by tag. The total still counts every text match.
- S-R46: return-by is prefilled with the row's holder even when that person is not an active employee. The select then offers that person once more, as "{code - name} (พ้นสภาพ)", and the RT- records them.
- S-R47: on รับคืน a ข้อมูลเก่า row's second line is "ข้อมูลเก่า (ไม่มีใบส่งมอบ) · {location code - name}" ("-" when there is none). The รับคืน text also matches the current location's code and name.

### Task 9: A return with an open repair goes into ส่งซ่อม (S-R43)

**Files:** `src/lib/asset-operation-eligibility.ts`, `src/lib/asset-actions.ts` (only if a comment or branch names the repair), `src/lib/asset-operation-search-rules.ts` (row flag), `src/app/api/assets/[id]/checkin/route.ts`, `src/lib/api-error-catalog.ts`, `src/components/asset-operations/checkin-form.tsx`, `messages/th.json` and `messages/en.json` (through `node scripts/messages-edit.mjs`), `docs/05_ASSET_LIFECYCLE.md`, `docs/07_UAT_CHECKLIST.md`. Tests: `tests/asset-operation-eligibility.test.ts`, `tests/asset-actions.test.ts`, `tests/api-error-catalog.test.ts`, `tests/checkin-maintenance-ticket-route.test.ts`, `tests/asset-operation-search-rules.test.ts`, the checkin form pins (grep `tests/` for `checkin-form`), plus any other pin that names `ASSET_CHECKIN_REPAIR_OPEN` or `checkinRepairOpen`.

- [ ] **Step 1: Write the failing tests.**
  - Verdict: an open handover (mode set, status fits) with `hasOpenRepair: true` is eligible with `path: "handover"`. A ข้อมูลเก่า row with an open repair stays `no("asset.transactionReasonActiveMaintenance")` with `path: "legacy"`. The agreement test keeps comparing `getAssetActions` with the verdicts.
  - `getAssetActions`: รับคืน is available for `openCheckoutId` + `openRepairId` with a fitting mode and status. Its href carries the checkout id. Rewrite the test that pinned ActiveMaintenance first for an open handover.
  - `assetOperationRefusalReasonKeys` no longer has `ASSET_CHECKIN_REPAIR_OPEN`, and the S-R6 catalog test drops it. The catalog maps `ASSET_CHECKIN_REPAIR_STATUS_REQUIRED` to `checkinRepairStatusRequired`.
  - Search row: in mode `checkin` a row whose asset has an open repair carries `openRepair: true`. Rows without one have no `openRepair` key, and the other modes never have it.
  - Route (`tests/checkin-maintenance-ticket-route.test.ts`): with an open repair and next status `status:Under Maintenance`, the return is 201, the asset goes to Under Maintenance, and no `maintenanceTicket.create` runs. With an open repair and next status `status:Ready` it answers 409 `{ code: "ASSET_CHECKIN_REPAIR_STATUS_REQUIRED", error: same, fieldErrors: { nextStatusId: "checkinRepairStatusRequired" } }` and writes nothing. The in-transaction re-check also answers that 409 when the repair opens between the pre-check and the transaction. With no open repair, ส่งซ่อม still creates the in_progress record, as today.
  - Form (source pins): a chosen row with `openRepair` sets the next status to the `Under Maintenance` status and offers no other. It shows the notice `checkin.openRepairReturnNotice`, and not `checkin.sendToRepairHelp` or the repair-problem field. `validate` gives `checkinRepairStatusRequired` for another status.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement.**
  - The verdict's handover branch drops the repair check. The legacy branch writes the literal `"asset.transactionReasonActiveMaintenance"`.
  - The search row builder sets `openRepair: true` when `hasOpenRepair` is true and the mode is checkin.
  - The route replaces both repair refusals (the pre-check and the in-transaction re-check) with "open repair and not `sendsToRepair` → that 409 with `fieldErrors`". The catch block maps the in-transaction throw to the same answer.
  - The form, on a pick or arrival of a row with `openRepair`: set `nextStatusId` to the `Under Maintenance` status id from its statuses, and narrow the select to that option (or lock it with the notice). Clear that lock when the choice changes.
  - Words, through one change file:
    - th `checkin.openRepairReturnNotice` = "มีงานซ่อมที่ยังไม่ปิดอยู่ หลังรับคืนทรัพย์สินจะเข้าสถานะ ส่งซ่อม ต่อกับงานซ่อมเดิม ไม่สร้างใบซ่อมใหม่"
    - en `checkin.openRepairReturnNotice` = "This asset has an open repair. After the return it goes to Send to repair under that repair; no new repair record is created."
    - th `apiErrors.checkinRepairStatusRequired` = "มีงานซ่อมที่ยังไม่ปิด เลือกสถานะถัดไปเป็น ส่งซ่อม"
    - en `apiErrors.checkinRepairStatusRequired` = "This asset has an open repair. Choose Send to repair as the next status."
    - delete `apiErrors.checkinRepairOpen` in both
  - Docs:
    - docs/05: replace the check-in refusal of an open repair with the new rule.
    - docs/07: add a UAT line ("an asset whose repair is open is returned into ส่งซ่อม under the same repair").
- [ ] **Step 4: Run the tests, then `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors).**
- [ ] **Step 5: Commit** with `fix(checkin): a return with an open repair goes into ส่งซ่อม under that repair instead of being refused, and the asset page offers it (server search addendum S-R43, the user's choice ก 2026-10-29)` and the trailer.

### Task 10: Pick many from one search, held rows first on รับคืน, a leaver as return-by, and the legacy row's location (S-R44 to S-R47)

**Files:** `src/components/ui/asset-operation-picker.tsx`, `src/lib/asset-operation-picker-rules.ts`, `src/lib/asset-operation-search-rules.ts`, `src/lib/asset-operation-search.ts`, `src/lib/checkin-choice.ts`, `src/components/asset-operations/checkin-form.tsx`, messages (through `node scripts/messages-edit.mjs`), `DESIGN.md` (the picker section's pick behaviour), `docs/06_WORKFLOWS.md` (checkin search fields), and E2E only if a spec asserts the old behaviour. Tests: `tests/asset-operation-picker-ui.test.ts`, `tests/asset-operation-picker-rules.test.ts`, `tests/asset-operation-search-rules.test.ts`, `tests/asset-operation-search.test.ts`, `tests/checkin-choice.test.ts`, the checkin form pins.

- [ ] **Step 1: Write the failing tests.**
  - **S-R44 (picker source pins):** a `multiple` pick no longer calls `setQuery("")` and keeps `open`. It moves the active row to the next takeable row of `flatRows`, and the announcement still reads `selectedTitle` with the new count. A single pick is unchanged.
  - **S-R45 (search):**
    - `buildAssetOperationSearchWheres` in mode checkin returns a `held` where. It is `{ AND: [the text OR, { OR: [{ checkouts: { some: open } }, { custodianId: { not: null } }] }] }` on the base.
    - `searchAssetOperationOptions` runs it as one more 20-row tier.
    - `rankAssetOperationMatches` takes an optional `held` list ordered exact → held → prefix → contains.
    - A test: with 25 "none" rows ahead by tag and 2 held rows after them, both held rows are in the 20 and their groups come before "ไม่มีผู้ถือครอง".
    - The other modes keep three tiers.
  - **S-R46:**
    - `getCheckinChoice` returns the holder as `returnByEmployeeId` even when they are not in the active set, and adds `returnByInactiveLabel: string | null` = the holder label when not active.
    - The form adds one extra option `{ id, label: "{label} (พ้นสภาพ)" }` to the return-by select when that label is set (word `checkin.returnByFormer` = th "{name} (พ้นสภาพ)" / en "{name} (former employee)").
    - The prefill and the clear rules of S-R32 are otherwise unchanged.
  - **S-R47:**
    - Rows get `locationLabel: string` ("code - name" of `currentLocation`, or "-").
    - The legacy line reads `assetOperation.legacyLineAt` = th "ข้อมูลเก่า (ไม่มีใบส่งมอบ) · {location}" / en "Legacy record (no handover) · {location}".
    - In mode checkin the text conditions add `{ currentLocation: { code: { contains } } }` and `{ currentLocation: { name: { contains } } }`.
    - If `legacyLine` loses its last reader, delete it.
    - The LV2 count of `"-"` fallbacks in `tests/list-frame-guards.test.ts` is updated if a new `"-"` is added.
- [ ] **Step 2: Run them and see them fail.**
- [ ] **Step 3: Implement** to the tests. The search stays bounded: at most 5 asset lists + 1 count + 2 fact reads + 2 label reads, every `in` list ≤ 20 ids.
- [ ] **Step 4: Run the tests, then `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors).**
  - Read `e2e/transactions/bulk-move.spec.ts` and `e2e/transactions/return.spec.ts`.
  - If a step depends on the search clearing after a bulk pick, or on the old legacy line or row order, update it minimally and say so.
- [ ] **Step 5: Commit** with `fix(asset-operations): pick several assets from one bulk-move search, held rows first on รับคืน, a former employee as return-by, and the ข้อมูลเก่า row's location (server search addendum S-R44 to S-R47)` and the trailer.

After Task 10 the controller rebuilds and runs `e2e/transactions e2e/cross-cutting/field-errors.spec.ts e2e/asset-detail e2e/smoke`. It then updates the changelog, the wiki question 65 and the canvas checklist of the gaps found in the canvas boards.

### Task 9b: A permanent handover under repair can be returned (S-R48)

S-R48 (the user, 2026-10-29, second choice ก; extends S-R43): opening an unfinished repair on a permanently handed-over asset moves it In Use → Under Maintenance (`getRepairRecordCreateEffect`, `src/lib/repair-record-policy.ts`). The return then failed `getCheckinHandoverStatusError` ("permanent needs In Use"), in the old pages and on this branch alike, so S-R43 alone covered almost no real case. Now, for a `permanent_assignment` handover whose asset has an open repair, the statuses `Under Maintenance` and `Pending Repair` fit the mode, and the return goes into ส่งซ่อม under that repair (S-R43). The checkin clears the holder as usual, so finishing the repair later restores Ready (`getRepairRestoreStatusName` with no active checkout → `getMaintenanceOperationalTarget`). A `temporary_loan` is unchanged: a repair cannot be opened on a Checked Out asset (`MAINTENANCE_ASSET_ON_LOAN`).

**Files:** `src/lib/asset-lifecycle-policy.ts` (`getCheckinHandoverStatusError`), `src/lib/asset-operation-eligibility.ts`, `src/app/api/assets/[id]/checkin/route.ts`, `docs/05_ASSET_LIFECYCLE.md`, `docs/07_UAT_CHECKLIST.md`, `e2e/transactions/return.spec.ts` (one new test). Tests: the lifecycle policy tests (grep `tests/` for `getCheckinHandoverStatusError`), `tests/asset-operation-eligibility.test.ts`, `tests/asset-actions.test.ts`, `tests/checkin-maintenance-ticket-route.test.ts`, `tests/e2e-transactions.test.ts` (pin the new E2E test's title if that file pins titles).

- [ ] **Step 1: Write the failing tests.**
  - `getCheckinHandoverStatusError(mode, statusName, options?: { hasOpenRepair?: boolean })`:
    - `("permanent_assignment", "Under Maintenance", { hasOpenRepair: true })` → null;
    - the same with `"Pending Repair"` → null;
    - `("permanent_assignment", "Under Maintenance")` → `"ASSET_HANDOVER_STATUS_MISMATCH"`, as today;
    - `("temporary_loan", "Under Maintenance", { hasOpenRepair: true })` → `"ASSET_HANDOVER_STATUS_MISMATCH"`;
    - `("permanent_assignment", "In Use", { hasOpenRepair: true })` → null;
    - a missing mode → `"ASSET_HANDOVER_MODE_MISSING"` whatever the options.
  - Verdict: an open permanent handover + Under Maintenance + `hasOpenRepair` → eligible, `path: "handover"`. Without the repair → `no("asset.transactionReasonHandoverStatusMismatch")`. The agreement test still holds, and `getAssetActions`' รับคืน is enabled in that case (a new `tests/asset-actions.test.ts` case).
  - Route: a permanent handover whose asset is Under Maintenance with an open repair and next status `status:Under Maintenance` → 201, the handover closed, no `maintenanceTicket.create`. The same with `status:Ready` → the S-R43 409 `ASSET_CHECKIN_REPAIR_STATUS_REQUIRED`. Under Maintenance without an open repair → 409 `ASSET_HANDOVER_STATUS_MISMATCH`, as today.
  - E2E, `e2e/transactions/return.spec.ts`, one new test, run-scoped tag like the file's others:
    1. a permanent handover to the receiver;
    2. open an unfinished repair on the asset through the repair page or API the existing specs use (find the helper in `e2e/`, e.g. how `e2e/maintenance` or `return.spec.ts:100` opens one);
    3. on รับคืน pick the asset: it is takeable, the next status is locked to ส่งซ่อม with `checkin.openRepairReturnNotice`;
    4. save; the asset page reads อยู่ระหว่างซ่อม with no custodian, and the repair list still has exactly one open record for it.
- [ ] **Step 2: Run the unit tests and see them fail.**
- [ ] **Step 3: Implement.**
  - The lifecycle function takes the optional options.
  - The verdict passes `{ hasOpenRepair: facts.hasOpenRepair }`.
  - The route reads the open-repair count once before the transaction and once inside it, as today. It passes the in-transaction result to `getCheckinHandoverStatusError`, and keeps the S-R43 check before the status check.
  - Docs: docs/05 states the rule; docs/07 adds a UAT line ("a permanently handed-over notebook whose repair was opened can be returned into ส่งซ่อม; after the repair it is พร้อมใช้งาน").
- [ ] **Step 4: Run `npm test`, `npx tsc --noEmit`, `npm run lint` (0 errors).** Do not run Playwright; the controller runs the E2E.
- [ ] **Step 5: Commit** with `fix(checkin): a permanent handover whose asset went into repair can be returned into ส่งซ่อม under that repair, and becomes พร้อมใช้งาน when the repair is finished (server search addendum S-R48, the user's choice ก 2026-10-29)` and the trailer.
