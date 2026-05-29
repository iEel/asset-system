# Depreciation Policy Builder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the raw JSON depreciation policy setting with a structured UI that lets admins edit default useful life, residual value, category-specific policy groups, and a live calculation preview while preserving the existing `accounting_depreciation_policy` JSON setting.

**Architecture:** Keep reports and exports using `src/lib/asset-depreciation.ts` as the calculation source. Add a small editor-state adapter that converts the current JSON policy into UI groups and serializes UI groups back into the same `DepreciationPolicy` JSON shape. The first implementation keeps depreciation start date semantics unchanged: depreciation starts from `Asset.purchaseDate`.

**Tech Stack:** Next.js App Router, React client components, TypeScript, Prisma-backed settings, `node:test`, Tailwind utility classes, existing `system_settings` API.

---

## Scope

Build this first phase:

- Structured depreciation policy editor in `Settings -> Organization`.
- Default policy controls: useful life in months and residual value percent.
- Category-specific policy groups using a compact dual-list category picker.
- Live preview using a sample purchase price and sample purchase date.
- Advanced JSON view/edit remains available for support users.
- Existing `accounting_depreciation_policy` setting format remains the source of truth.
- Reports and Excel export continue using the existing depreciation helper.

Do not build these in this phase:

- Database schema changes.
- `depreciationStartDate`.
- accounting classification such as capitalized / non-capitalized / pending review.
- locked accounting periods or journal entries.

Those items should be a follow-up plan because they affect asset schema, import/export, reports, data-quality rules, and possibly migration.

## File Structure

- Create `src/lib/depreciation-policy-editor.ts`
  - Converts `DepreciationPolicy` into editable UI state.
  - Serializes editable UI state back into a valid `DepreciationPolicy`.
  - Builds sample depreciation preview values without touching the database.
  - Keeps legacy text-match rules visible as advanced rules so they are not silently lost.

- Create `src/components/admin/depreciation-policy-builder.tsx`
  - Client UI for defaults, category policy groups, dual-list category assignment, preview, and advanced JSON.
  - Receives `categories`, `policyJson`, `labels`, and `onPolicyJsonChange`.
  - Emits a JSON string compatible with `accounting_depreciation_policy`.

- Modify `src/components/admin/system-settings-form.tsx`
  - Import and render `DepreciationPolicyBuilder` instead of the raw textarea as the primary UI.
  - Keep `hasInvalidDepreciationPolicy` validation based on `parseDepreciationPolicySetting`.
  - Pass active categories already available through `SystemSettingsFormProps`.

- Modify `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
  - Pass new label strings to `SystemSettingsForm`.

- Modify `messages/th.json` and `messages/en.json`
  - Add labels for the policy builder, preview, category picker, conflict warnings, and advanced JSON.

- Create `tests/depreciation-policy-editor.test.ts`
  - Unit tests for editor-state parsing, serialization, duplicate category cleanup, residual percent handling, preview calculation, and legacy rule preservation.

- Modify `tests/settings-ldap-role-ui.test.ts` or create `tests/settings-depreciation-policy-ui.test.ts`
  - Static UI tests that verify the settings form uses the builder and messages include the required labels.

- Modify `DEVELOPER_HANDOFF.md`, `docs/06_WORKFLOWS.md`, and `docs/99_CHANGELOG.md`
  - Document the new UI and confirm depreciation still starts from `purchaseDate` in this phase.

---

### Task 1: Add Depreciation Policy Editor Adapter

**Files:**
- Create: `src/lib/depreciation-policy-editor.ts`
- Test: `tests/depreciation-policy-editor.test.ts`

- [ ] **Step 1: Write failing tests for editor state conversion**

Create `tests/depreciation-policy-editor.test.ts`:

```ts
import assert from "node:assert/strict"
import test from "node:test"

import {
  buildDepreciationPolicyEditorState,
  buildDepreciationPolicyPreview,
  serializeDepreciationPolicyEditorState,
  type DepreciationPolicyEditorCategory,
} from "../src/lib/depreciation-policy-editor.ts"

const categories: DepreciationPolicyEditorCategory[] = [
  { id: "cat-notebook", code: "Notebook", name: "คอมพิวเตอร์พกพา" },
  { id: "cat-license", code: "License", name: "ลิขสิทธิ์" },
  { id: "cat-cctv", code: "CCTV", name: "ระบบกล้องวงจรปิด" },
]

test("builds editor groups from category-matched depreciation rules", () => {
  const state = buildDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 60,
      defaultResidualRate: 0,
      rules: [
        { match: "License", usefulLifeMonths: 36, residualRate: 0 },
        { match: "CCTV", usefulLifeMonths: 84, residualRate: 0.1 },
      ],
    },
    categories
  )

  assert.equal(state.defaultUsefulLifeMonths, 60)
  assert.equal(state.defaultResidualRatePercent, 0)
  assert.deepEqual(state.groups.map((group) => group.categoryIds), [["cat-license"], ["cat-cctv"]])
  assert.deepEqual(state.unassignedCategoryIds, ["cat-notebook"])
})

test("serializes editor groups back into the existing depreciation policy JSON shape", () => {
  const policy = serializeDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 72,
      defaultResidualRatePercent: 5,
      groups: [
        {
          id: "group-license",
          name: "Software / License",
          usefulLifeMonths: 36,
          residualRatePercent: 0,
          categoryIds: ["cat-license"],
        },
        {
          id: "group-cctv",
          name: "CCTV policy",
          usefulLifeMonths: 84,
          residualRatePercent: 10,
          categoryIds: ["cat-cctv"],
        },
      ],
      legacyRules: [],
    },
    categories
  )

  assert.deepEqual(policy, {
    defaultUsefulLifeMonths: 72,
    defaultResidualRate: 0.05,
    rules: [
      { match: "License", usefulLifeMonths: 36, residualRate: 0, label: "Software / License" },
      { match: "CCTV", usefulLifeMonths: 84, residualRate: 0.1, label: "CCTV policy" },
    ],
  })
})

test("keeps unmatched legacy text rules in serialized policy", () => {
  const state = buildDepreciationPolicyEditorState(
    {
      defaultUsefulLifeMonths: 60,
      defaultResidualRate: 0,
      rules: [{ match: "software_license", usefulLifeMonths: 36, residualRate: 0 }],
    },
    categories
  )

  assert.equal(state.groups.length, 0)
  assert.deepEqual(state.legacyRules, [{ match: "software_license", usefulLifeMonths: 36, residualRate: 0 }])

  const policy = serializeDepreciationPolicyEditorState(state, categories)
  assert.deepEqual(policy.rules, [{ match: "software_license", usefulLifeMonths: 36, residualRate: 0 }])
})

test("preview uses purchase date as the depreciation start date", () => {
  const preview = buildDepreciationPolicyPreview({
    purchasePrice: 120000,
    purchaseDate: "2024-05-20",
    asOf: new Date("2026-05-20T00:00:00.000Z"),
    usefulLifeMonths: 60,
    residualRatePercent: 0,
  })

  assert.equal(preview.monthlyDepreciation, 2000)
  assert.equal(preview.ageMonths, 24)
  assert.equal(preview.accumulatedDepreciation, 48000)
  assert.equal(preview.netBookValue, 72000)
})
```

- [ ] **Step 2: Run tests and verify they fail**

Run:

```powershell
node --test tests\depreciation-policy-editor.test.ts
```

Expected result:

```text
FAIL
Cannot find module '../src/lib/depreciation-policy-editor.ts'
```

If sandbox returns `spawn EPERM`, rerun the same command with elevated execution as done elsewhere in this project.

- [ ] **Step 3: Implement the editor adapter**

Create `src/lib/depreciation-policy-editor.ts`:

```ts
import {
  buildDepreciationSummary,
  type DepreciationPolicy,
  type DepreciationPolicyRule,
} from "@/lib/asset-depreciation"

export type DepreciationPolicyEditorCategory = {
  id: string
  code: string
  name: string
}

export type DepreciationPolicyEditorGroup = {
  id: string
  name: string
  usefulLifeMonths: number
  residualRatePercent: number
  categoryIds: string[]
}

export type DepreciationPolicyEditorState = {
  defaultUsefulLifeMonths: number
  defaultResidualRatePercent: number
  groups: DepreciationPolicyEditorGroup[]
  legacyRules: DepreciationPolicyRule[]
  unassignedCategoryIds: string[]
}

export type DepreciationPolicyPreviewInput = {
  purchasePrice: number
  purchaseDate: string
  asOf?: Date
  usefulLifeMonths: number
  residualRatePercent: number
}

export type DepreciationPolicyPreview = {
  monthlyDepreciation: number
  ageMonths: number
  accumulatedDepreciation: number
  netBookValue: number
  residualValue: number
}

type LabeledPolicyRule = DepreciationPolicyRule & {
  label?: string
}

export function buildDepreciationPolicyEditorState(
  policy: DepreciationPolicy,
  categories: DepreciationPolicyEditorCategory[]
): DepreciationPolicyEditorState {
  const usedCategoryIds = new Set<string>()
  const groupsByKey = new Map<string, DepreciationPolicyEditorGroup>()
  const legacyRules: DepreciationPolicyRule[] = []

  for (const rule of policy.rules as LabeledPolicyRule[]) {
    const category = findCategoryForRule(rule, categories)
    if (!category) {
      legacyRules.push({
        match: rule.match,
        usefulLifeMonths: rule.usefulLifeMonths,
        residualRate: rule.residualRate,
      })
      continue
    }

    usedCategoryIds.add(category.id)
    const residualRate = Number(rule.residualRate ?? policy.defaultResidualRate ?? 0)
    const residualRatePercent = rateToPercent(residualRate)
    const key = `${rule.label ?? ""}|${rule.usefulLifeMonths}|${residualRatePercent}`
    const existingGroup = groupsByKey.get(key)

    if (existingGroup) {
      existingGroup.categoryIds.push(category.id)
      continue
    }

    groupsByKey.set(key, {
      id: buildStableGroupId(rule, groupsByKey.size + 1),
      name: rule.label?.trim() || `${rule.usefulLifeMonths} months / ${residualRatePercent}% residual`,
      usefulLifeMonths: rule.usefulLifeMonths,
      residualRatePercent,
      categoryIds: [category.id],
    })
  }

  return {
    defaultUsefulLifeMonths: policy.defaultUsefulLifeMonths,
    defaultResidualRatePercent: rateToPercent(policy.defaultResidualRate),
    groups: Array.from(groupsByKey.values()).map((group) => ({
      ...group,
      categoryIds: dedupeKnownCategoryIds(group.categoryIds, categories),
    })),
    legacyRules,
    unassignedCategoryIds: categories.filter((category) => !usedCategoryIds.has(category.id)).map((category) => category.id),
  }
}

export function serializeDepreciationPolicyEditorState(
  state: DepreciationPolicyEditorState,
  categories: DepreciationPolicyEditorCategory[]
): DepreciationPolicy & { rules: LabeledPolicyRule[] } {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const assignedCategoryIds = new Set<string>()
  const rules: LabeledPolicyRule[] = []

  for (const group of state.groups) {
    const categoryIds = dedupeKnownCategoryIds(group.categoryIds, categories)
    for (const categoryId of categoryIds) {
      if (assignedCategoryIds.has(categoryId)) continue
      assignedCategoryIds.add(categoryId)
      const category = categoryById.get(categoryId)
      if (!category) continue
      rules.push({
        match: category.code,
        usefulLifeMonths: clampUsefulLifeMonths(group.usefulLifeMonths, state.defaultUsefulLifeMonths),
        residualRate: percentToRate(group.residualRatePercent),
        label: group.name.trim() || `${group.usefulLifeMonths} months`,
      })
    }
  }

  for (const legacyRule of state.legacyRules) {
    rules.push({
      match: legacyRule.match,
      usefulLifeMonths: clampUsefulLifeMonths(legacyRule.usefulLifeMonths, state.defaultUsefulLifeMonths),
      residualRate: legacyRule.residualRate,
    })
  }

  return {
    defaultUsefulLifeMonths: clampUsefulLifeMonths(state.defaultUsefulLifeMonths, 60),
    defaultResidualRate: percentToRate(state.defaultResidualRatePercent),
    rules,
  }
}

export function buildDepreciationPolicyPreview(input: DepreciationPolicyPreviewInput): DepreciationPolicyPreview {
  const summary = buildDepreciationSummary(
    [
      {
        id: "preview",
        label: "Preview asset",
        categoryCode: "Preview",
        categoryName: "Preview",
        ownershipType: "personal",
        purchasePrice: input.purchasePrice,
        purchaseDate: input.purchaseDate,
      },
    ],
    input.asOf ?? new Date(),
    {
      policy: {
        defaultUsefulLifeMonths: clampUsefulLifeMonths(input.usefulLifeMonths, 60),
        defaultResidualRate: percentToRate(input.residualRatePercent),
        rules: [],
      },
    }
  )
  const asset = summary.depreciableAssets[0]
  return {
    monthlyDepreciation: asset?.monthlyDepreciation ?? 0,
    ageMonths: asset?.ageMonths ?? 0,
    accumulatedDepreciation: asset?.accumulatedDepreciation ?? 0,
    netBookValue: asset?.netBookValue ?? input.purchasePrice,
    residualValue: asset?.residualValue ?? 0,
  }
}

export function percentToRate(percent: number) {
  if (!Number.isFinite(percent)) return 0
  return Math.round(Math.min(90, Math.max(0, percent)) * 100) / 10000
}

export function rateToPercent(rate: number | undefined) {
  if (!Number.isFinite(rate ?? 0)) return 0
  return Math.round(Math.min(0.9, Math.max(0, rate ?? 0)) * 10000) / 100
}

function findCategoryForRule(rule: DepreciationPolicyRule, categories: DepreciationPolicyEditorCategory[]) {
  const match = rule.match.trim().toLowerCase()
  return categories.find((category) => category.code.toLowerCase() === match || category.name.toLowerCase() === match)
}

function buildStableGroupId(rule: DepreciationPolicyRule, index: number) {
  return `group-${String(rule.match || "policy").toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`
}

function dedupeKnownCategoryIds(categoryIds: string[], categories: DepreciationPolicyEditorCategory[]) {
  const knownCategoryIds = new Set(categories.map((category) => category.id))
  const uniqueIds: string[] = []
  for (const categoryId of categoryIds) {
    if (!knownCategoryIds.has(categoryId) || uniqueIds.includes(categoryId)) continue
    uniqueIds.push(categoryId)
  }
  return uniqueIds
}

function clampUsefulLifeMonths(value: number, fallback: number) {
  return Number.isInteger(value) && value >= 1 && value <= 600 ? value : fallback
}
```

- [ ] **Step 4: Run adapter tests and verify they pass**

Run:

```powershell
node --test tests\depreciation-policy-editor.test.ts
```

Expected result:

```text
pass 4
fail 0
```

- [ ] **Step 5: Commit adapter**

Run:

```powershell
git add src/lib/depreciation-policy-editor.ts tests/depreciation-policy-editor.test.ts
git commit -m "Add depreciation policy editor adapter"
```

---

### Task 2: Add Settings Labels and Static UI Coverage

**Files:**
- Modify: `messages/th.json`
- Modify: `messages/en.json`
- Modify: `src/app/[locale]/(dashboard)/admin/settings/page.tsx`
- Modify: `src/components/admin/system-settings-form.tsx`
- Create: `tests/settings-depreciation-policy-ui.test.ts`

- [ ] **Step 1: Write failing static UI/message test**

Create `tests/settings-depreciation-policy-ui.test.ts`:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("settings form exposes depreciation policy builder labels", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")
  const settingsPage = readFileSync("src/app/[locale]/(dashboard)/admin/settings/page.tsx", "utf8")
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.match(form, /depreciationPolicyBuilderTitle/)
  assert.match(settingsPage, /depreciationPolicyBuilderTitle/)

  for (const messages of [th.systemSettings, en.systemSettings]) {
    assert.equal(typeof messages.depreciationPolicyBuilderTitle, "string")
    assert.equal(typeof messages.depreciationDefaultUsefulLifeMonths, "string")
    assert.equal(typeof messages.depreciationDefaultResidualPercent, "string")
    assert.equal(typeof messages.depreciationStartBasisPurchaseDate, "string")
    assert.equal(typeof messages.depreciationPolicyGroups, "string")
    assert.equal(typeof messages.depreciationPreviewTitle, "string")
    assert.equal(typeof messages.depreciationAdvancedJson, "string")
  }
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node --test tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
FAIL
The input did not match the regular expression /depreciationPolicyBuilderTitle/
```

- [ ] **Step 3: Extend settings labels type**

In `src/components/admin/system-settings-form.tsx`, add these fields to `SystemSettingsFormProps["labels"]` near the existing accounting fields:

```ts
    depreciationPolicyBuilderTitle: string
    depreciationPolicyBuilderDescription: string
    depreciationMethod: string
    depreciationMethodStraightLine: string
    depreciationStartBasis: string
    depreciationStartBasisPurchaseDate: string
    depreciationDefaultUsefulLifeMonths: string
    depreciationDefaultResidualPercent: string
    depreciationPolicyGroups: string
    depreciationPolicyGroupName: string
    depreciationUsefulLifeMonths: string
    depreciationResidualPercent: string
    depreciationAvailableCategories: string
    depreciationSelectedCategories: string
    depreciationSearchCategories: string
    depreciationAddGroup: string
    depreciationRemoveGroup: string
    depreciationAddSelectedCategories: string
    depreciationRemoveSelectedCategories: string
    depreciationNoGroups: string
    depreciationNoMatchingCategories: string
    depreciationNoSelectedCategories: string
    depreciationAssignedCategoryConflict: string
    depreciationLegacyRules: string
    depreciationLegacyRulesHelp: string
    depreciationPreviewTitle: string
    depreciationPreviewDescription: string
    depreciationPreviewPurchasePrice: string
    depreciationPreviewPurchaseDate: string
    depreciationPreviewMonthly: string
    depreciationPreviewAccumulated: string
    depreciationPreviewNetBook: string
    depreciationPreviewAgeMonths: string
    depreciationAdvancedJson: string
    depreciationAdvancedJsonDescription: string
```

- [ ] **Step 4: Pass translated labels from settings page**

In `src/app/[locale]/(dashboard)/admin/settings/page.tsx`, add these keys to the labels object:

```ts
          depreciationPolicyBuilderTitle: t("depreciationPolicyBuilderTitle"),
          depreciationPolicyBuilderDescription: t("depreciationPolicyBuilderDescription"),
          depreciationMethod: t("depreciationMethod"),
          depreciationMethodStraightLine: t("depreciationMethodStraightLine"),
          depreciationStartBasis: t("depreciationStartBasis"),
          depreciationStartBasisPurchaseDate: t("depreciationStartBasisPurchaseDate"),
          depreciationDefaultUsefulLifeMonths: t("depreciationDefaultUsefulLifeMonths"),
          depreciationDefaultResidualPercent: t("depreciationDefaultResidualPercent"),
          depreciationPolicyGroups: t("depreciationPolicyGroups"),
          depreciationPolicyGroupName: t("depreciationPolicyGroupName"),
          depreciationUsefulLifeMonths: t("depreciationUsefulLifeMonths"),
          depreciationResidualPercent: t("depreciationResidualPercent"),
          depreciationAvailableCategories: t("depreciationAvailableCategories"),
          depreciationSelectedCategories: t("depreciationSelectedCategories"),
          depreciationSearchCategories: t("depreciationSearchCategories"),
          depreciationAddGroup: t("depreciationAddGroup"),
          depreciationRemoveGroup: t("depreciationRemoveGroup"),
          depreciationAddSelectedCategories: t("depreciationAddSelectedCategories"),
          depreciationRemoveSelectedCategories: t("depreciationRemoveSelectedCategories"),
          depreciationNoGroups: t("depreciationNoGroups"),
          depreciationNoMatchingCategories: t("depreciationNoMatchingCategories"),
          depreciationNoSelectedCategories: t("depreciationNoSelectedCategories"),
          depreciationAssignedCategoryConflict: t("depreciationAssignedCategoryConflict"),
          depreciationLegacyRules: t("depreciationLegacyRules"),
          depreciationLegacyRulesHelp: t("depreciationLegacyRulesHelp"),
          depreciationPreviewTitle: t("depreciationPreviewTitle"),
          depreciationPreviewDescription: t("depreciationPreviewDescription"),
          depreciationPreviewPurchasePrice: t("depreciationPreviewPurchasePrice"),
          depreciationPreviewPurchaseDate: t("depreciationPreviewPurchaseDate"),
          depreciationPreviewMonthly: t("depreciationPreviewMonthly"),
          depreciationPreviewAccumulated: t("depreciationPreviewAccumulated"),
          depreciationPreviewNetBook: t("depreciationPreviewNetBook"),
          depreciationPreviewAgeMonths: t("depreciationPreviewAgeMonths"),
          depreciationAdvancedJson: t("depreciationAdvancedJson"),
          depreciationAdvancedJsonDescription: t("depreciationAdvancedJsonDescription"),
```

- [ ] **Step 5: Add Thai messages**

In `messages/th.json`, inside `systemSettings`, add:

```json
    "depreciationPolicyBuilderTitle": "ตัวสร้างนโยบายค่าเสื่อม",
    "depreciationPolicyBuilderDescription": "ตั้งค่าอายุใช้งานและมูลค่าคงเหลือตามหมวดหมู่ โดยระบบยังบันทึกเป็นนโยบาย JSON เดิม",
    "depreciationMethod": "วิธีคิดค่าเสื่อม",
    "depreciationMethodStraightLine": "เส้นตรง",
    "depreciationStartBasis": "วันเริ่มนับค่าเสื่อม",
    "depreciationStartBasisPurchaseDate": "วันที่ซื้อทรัพย์สิน",
    "depreciationDefaultUsefulLifeMonths": "อายุใช้งานเริ่มต้น (เดือน)",
    "depreciationDefaultResidualPercent": "มูลค่าคงเหลือเริ่มต้น (%)",
    "depreciationPolicyGroups": "กลุ่มนโยบายเฉพาะหมวดหมู่",
    "depreciationPolicyGroupName": "ชื่อกลุ่มนโยบาย",
    "depreciationUsefulLifeMonths": "อายุใช้งาน (เดือน)",
    "depreciationResidualPercent": "มูลค่าคงเหลือ (%)",
    "depreciationAvailableCategories": "หมวดหมู่ที่ยังไม่อยู่ในกลุ่มนี้",
    "depreciationSelectedCategories": "หมวดหมู่ที่ใช้กลุ่มนี้",
    "depreciationSearchCategories": "ค้นหาหมวดหมู่...",
    "depreciationAddGroup": "เพิ่มกลุ่มนโยบาย",
    "depreciationRemoveGroup": "ลบกลุ่ม",
    "depreciationAddSelectedCategories": "เพิ่มที่เลือก",
    "depreciationRemoveSelectedCategories": "นำออกที่เลือก",
    "depreciationNoGroups": "ยังไม่มีกลุ่มนโยบายเฉพาะ ระบบจะใช้นโยบายเริ่มต้นกับทุกหมวดหมู่",
    "depreciationNoMatchingCategories": "ไม่พบหมวดหมู่ที่ตรงกับคำค้นหา",
    "depreciationNoSelectedCategories": "ยังไม่ได้เลือกหมวดหมู่",
    "depreciationAssignedCategoryConflict": "หมวดหมู่นี้ถูกใช้ในกลุ่มอื่นแล้ว",
    "depreciationLegacyRules": "กฎเดิมที่ไม่ได้ผูกกับหมวดหมู่",
    "depreciationLegacyRulesHelp": "กฎเหล่านี้ยังถูกเก็บไว้และยังทำงานผ่านการ match ข้อความเดิม แต่ควรย้ายมาเป็นกลุ่มหมวดหมู่เมื่อตรวจสอบแล้ว",
    "depreciationPreviewTitle": "ตัวอย่างการคำนวณ",
    "depreciationPreviewDescription": "ตัวอย่างนี้ใช้วันที่ซื้อเป็นวันเริ่มนับค่าเสื่อม",
    "depreciationPreviewPurchasePrice": "ราคาซื้อตัวอย่าง",
    "depreciationPreviewPurchaseDate": "วันที่ซื้อตัวอย่าง",
    "depreciationPreviewMonthly": "ค่าเสื่อมต่อเดือน",
    "depreciationPreviewAccumulated": "ค่าเสื่อมสะสม",
    "depreciationPreviewNetBook": "มูลค่าสุทธิ",
    "depreciationPreviewAgeMonths": "อายุที่นับแล้ว (เดือน)",
    "depreciationAdvancedJson": "ข้อมูลขั้นสูง JSON",
    "depreciationAdvancedJsonDescription": "ใช้สำหรับตรวจสอบหรือแก้ไขเชิงเทคนิคเท่านั้น หาก JSON ไม่ถูกต้อง ระบบจะไม่ให้บันทึก"
```

- [ ] **Step 6: Add English messages**

In `messages/en.json`, inside `systemSettings`, add:

```json
    "depreciationPolicyBuilderTitle": "Depreciation policy builder",
    "depreciationPolicyBuilderDescription": "Set useful life and residual value by category while preserving the existing JSON policy setting.",
    "depreciationMethod": "Depreciation method",
    "depreciationMethodStraightLine": "Straight-line",
    "depreciationStartBasis": "Depreciation start basis",
    "depreciationStartBasisPurchaseDate": "Asset purchase date",
    "depreciationDefaultUsefulLifeMonths": "Default useful life (months)",
    "depreciationDefaultResidualPercent": "Default residual value (%)",
    "depreciationPolicyGroups": "Category policy groups",
    "depreciationPolicyGroupName": "Policy group name",
    "depreciationUsefulLifeMonths": "Useful life (months)",
    "depreciationResidualPercent": "Residual value (%)",
    "depreciationAvailableCategories": "Categories not in this group",
    "depreciationSelectedCategories": "Categories using this group",
    "depreciationSearchCategories": "Search categories...",
    "depreciationAddGroup": "Add policy group",
    "depreciationRemoveGroup": "Remove group",
    "depreciationAddSelectedCategories": "Add selected",
    "depreciationRemoveSelectedCategories": "Remove selected",
    "depreciationNoGroups": "No category-specific groups yet. The default policy applies to every category.",
    "depreciationNoMatchingCategories": "No categories match the search.",
    "depreciationNoSelectedCategories": "No categories selected.",
    "depreciationAssignedCategoryConflict": "This category is already assigned to another group.",
    "depreciationLegacyRules": "Legacy text-match rules",
    "depreciationLegacyRulesHelp": "These rules are preserved and still work through text matching, but should be moved into category groups after review.",
    "depreciationPreviewTitle": "Calculation preview",
    "depreciationPreviewDescription": "This preview uses purchase date as the depreciation start date.",
    "depreciationPreviewPurchasePrice": "Sample purchase price",
    "depreciationPreviewPurchaseDate": "Sample purchase date",
    "depreciationPreviewMonthly": "Monthly depreciation",
    "depreciationPreviewAccumulated": "Accumulated depreciation",
    "depreciationPreviewNetBook": "Net book value",
    "depreciationPreviewAgeMonths": "Age counted (months)",
    "depreciationAdvancedJson": "Advanced JSON",
    "depreciationAdvancedJsonDescription": "Use this for technical inspection or support edits. Invalid JSON blocks saving."
```

- [ ] **Step 7: Run static UI/message test and verify it passes**

Run:

```powershell
node --test tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
pass 1
fail 0
```

- [ ] **Step 8: Commit labels and static coverage**

Run:

```powershell
git add messages/th.json messages/en.json src/app/[locale]/(dashboard)/admin/settings/page.tsx src/components/admin/system-settings-form.tsx tests/settings-depreciation-policy-ui.test.ts
git commit -m "Add depreciation policy builder labels"
```

Use `:(literal)` pathspec or quote the App Router path when staging in PowerShell:

```powershell
git add -- ":(literal)src/app/[locale]/(dashboard)/admin/settings/page.tsx"
```

---

### Task 3: Build Depreciation Policy Builder Component

**Files:**
- Create: `src/components/admin/depreciation-policy-builder.tsx`
- Modify: `tests/settings-depreciation-policy-ui.test.ts`

- [ ] **Step 1: Extend static UI test for the component**

Append this test to `tests/settings-depreciation-policy-ui.test.ts`:

```ts
test("depreciation policy builder has category grouping and advanced json controls", () => {
  const component = readFileSync("src/components/admin/depreciation-policy-builder.tsx", "utf8")

  assert.match(component, /buildDepreciationPolicyEditorState/)
  assert.match(component, /serializeDepreciationPolicyEditorState/)
  assert.match(component, /buildDepreciationPolicyPreview/)
  assert.match(component, /depreciationAvailableCategories/)
  assert.match(component, /depreciationSelectedCategories/)
  assert.match(component, /depreciationAdvancedJson/)
  assert.match(component, /details/)
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node --test tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
FAIL
ENOENT: no such file or directory, open 'src/components/admin/depreciation-policy-builder.tsx'
```

- [ ] **Step 3: Create the component**

Create `src/components/admin/depreciation-policy-builder.tsx`.

Use this structure:

```tsx
"use client"

import { useMemo, useState } from "react"
import { Plus, Search, Trash2 } from "lucide-react"
import {
  buildDepreciationPolicyEditorState,
  buildDepreciationPolicyPreview,
  serializeDepreciationPolicyEditorState,
  type DepreciationPolicyEditorCategory,
  type DepreciationPolicyEditorGroup,
  type DepreciationPolicyEditorState,
} from "@/lib/depreciation-policy-editor"
import { parseDepreciationPolicySetting } from "@/lib/asset-depreciation"

type DepreciationPolicyBuilderLabels = {
  depreciationPolicyBuilderTitle: string
  depreciationPolicyBuilderDescription: string
  depreciationMethod: string
  depreciationMethodStraightLine: string
  depreciationStartBasis: string
  depreciationStartBasisPurchaseDate: string
  depreciationDefaultUsefulLifeMonths: string
  depreciationDefaultResidualPercent: string
  depreciationPolicyGroups: string
  depreciationPolicyGroupName: string
  depreciationUsefulLifeMonths: string
  depreciationResidualPercent: string
  depreciationAvailableCategories: string
  depreciationSelectedCategories: string
  depreciationSearchCategories: string
  depreciationAddGroup: string
  depreciationRemoveGroup: string
  depreciationAddSelectedCategories: string
  depreciationRemoveSelectedCategories: string
  depreciationNoGroups: string
  depreciationNoMatchingCategories: string
  depreciationNoSelectedCategories: string
  depreciationAssignedCategoryConflict: string
  depreciationLegacyRules: string
  depreciationLegacyRulesHelp: string
  depreciationPreviewTitle: string
  depreciationPreviewDescription: string
  depreciationPreviewPurchasePrice: string
  depreciationPreviewPurchaseDate: string
  depreciationPreviewMonthly: string
  depreciationPreviewAccumulated: string
  depreciationPreviewNetBook: string
  depreciationPreviewAgeMonths: string
  depreciationAdvancedJson: string
  depreciationAdvancedJsonDescription: string
}

type DepreciationPolicyBuilderProps = {
  categories: DepreciationPolicyEditorCategory[]
  policyJson: string
  labels: DepreciationPolicyBuilderLabels
  onPolicyJsonChange: (value: string) => void
}

const inputClassName = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const compactButtonClassName = "inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-accent"

export function DepreciationPolicyBuilder({
  categories,
  policyJson,
  labels,
  onPolicyJsonChange,
}: DepreciationPolicyBuilderProps) {
  const parsedPolicy = parseDepreciationPolicySetting(policyJson)
  const state = useMemo(
    () => buildDepreciationPolicyEditorState(parsedPolicy.policy, categories),
    [categories, parsedPolicy.policy]
  )
  const [activeGroupId, setActiveGroupId] = useState(state.groups[0]?.id ?? "")
  const [categorySearch, setCategorySearch] = useState("")
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([])
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([])
  const [previewPurchasePrice, setPreviewPurchasePrice] = useState("30000")
  const [previewPurchaseDate, setPreviewPurchaseDate] = useState(new Date().toISOString().slice(0, 10))
  const activeGroup = state.groups.find((group) => group.id === activeGroupId) ?? state.groups[0]
  const assignedByOtherGroup = new Set(
    state.groups
      .filter((group) => group.id !== activeGroup?.id)
      .flatMap((group) => group.categoryIds)
  )
  const availableCategories = categories.filter((category) => {
    const selectedInGroup = activeGroup?.categoryIds.includes(category.id) ?? false
    if (selectedInGroup) return false
    const matchesSearch = `${category.code} ${category.name}`.toLowerCase().includes(categorySearch.toLowerCase())
    return matchesSearch
  })
  const selectedCategories = categories.filter((category) => activeGroup?.categoryIds.includes(category.id))
  const preview = buildDepreciationPolicyPreview({
    purchasePrice: Number(previewPurchasePrice) || 0,
    purchaseDate: previewPurchaseDate,
    usefulLifeMonths: activeGroup?.usefulLifeMonths ?? state.defaultUsefulLifeMonths,
    residualRatePercent: activeGroup?.residualRatePercent ?? state.defaultResidualRatePercent,
  })

  function updateState(nextState: DepreciationPolicyEditorState) {
    const nextPolicy = serializeDepreciationPolicyEditorState(nextState, categories)
    onPolicyJsonChange(JSON.stringify(nextPolicy, null, 2))
  }

  function updateDefaults(field: "defaultUsefulLifeMonths" | "defaultResidualRatePercent", value: number) {
    updateState({ ...state, [field]: value })
  }

  function updateGroup(groupId: string, patch: Partial<DepreciationPolicyEditorGroup>) {
    updateState({
      ...state,
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    })
  }

  function addGroup() {
    const nextGroup: DepreciationPolicyEditorGroup = {
      id: `group-${Date.now()}`,
      name: labels.depreciationPolicyGroups,
      usefulLifeMonths: state.defaultUsefulLifeMonths,
      residualRatePercent: state.defaultResidualRatePercent,
      categoryIds: [],
    }
    setActiveGroupId(nextGroup.id)
    updateState({ ...state, groups: [...state.groups, nextGroup] })
  }

  function removeGroup(groupId: string) {
    const nextGroups = state.groups.filter((group) => group.id !== groupId)
    setActiveGroupId(nextGroups[0]?.id ?? "")
    updateState({ ...state, groups: nextGroups })
  }

  function addSelectedCategories() {
    if (!activeGroup) return
    const nextCategoryIds = Array.from(new Set([...activeGroup.categoryIds, ...selectedAvailableIds.filter((id) => !assignedByOtherGroup.has(id))]))
    updateGroup(activeGroup.id, { categoryIds: nextCategoryIds })
    setSelectedAvailableIds([])
  }

  function removeSelectedCategories() {
    if (!activeGroup) return
    updateGroup(activeGroup.id, { categoryIds: activeGroup.categoryIds.filter((id) => !selectedAssignedIds.includes(id)) })
    setSelectedAssignedIds([])
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border border-border bg-muted/20 p-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-base font-semibold text-foreground">{labels.depreciationPolicyBuilderTitle}</h3>
          <p className="text-sm text-muted-foreground">{labels.depreciationPolicyBuilderDescription}</p>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <ReadonlyFact label={labels.depreciationMethod} value={labels.depreciationMethodStraightLine} />
          <ReadonlyFact label={labels.depreciationStartBasis} value={labels.depreciationStartBasisPurchaseDate} />
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{labels.depreciationDefaultUsefulLifeMonths}</span>
            <input
              type="number"
              min={1}
              max={600}
              value={state.defaultUsefulLifeMonths}
              onChange={(event) => updateDefaults("defaultUsefulLifeMonths", Number(event.target.value))}
              className={inputClassName}
            />
          </label>
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{labels.depreciationDefaultResidualPercent}</span>
            <input
              type="number"
              min={0}
              max={90}
              step={0.01}
              value={state.defaultResidualRatePercent}
              onChange={(event) => updateDefaults("defaultResidualRatePercent", Number(event.target.value))}
              className={inputClassName}
            />
          </label>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(220px,280px)_minmax(0,1fr)]">
        <div className="rounded-md border border-border bg-background">
          <div className="flex items-center justify-between border-b border-border px-3 py-3">
            <h3 className="text-sm font-semibold text-foreground">{labels.depreciationPolicyGroups}</h3>
            <button type="button" onClick={addGroup} className={compactButtonClassName}>
              <Plus className="h-4 w-4" />
              {labels.depreciationAddGroup}
            </button>
          </div>
          <div className="space-y-1 p-2">
            {state.groups.length === 0 ? (
              <p className="px-2 py-3 text-sm text-muted-foreground">{labels.depreciationNoGroups}</p>
            ) : (
              state.groups.map((group) => (
                <button
                  key={group.id}
                  type="button"
                  onClick={() => setActiveGroupId(group.id)}
                  className={`w-full rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                    group.id === activeGroup?.id ? "border-primary bg-primary/10 text-primary" : "border-transparent hover:bg-accent"
                  }`}
                >
                  <span className="block truncate font-medium">{group.name}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">
                    {group.usefulLifeMonths} months / {group.residualRatePercent}%
                  </span>
                </button>
              ))
            )}
          </div>
        </div>

        {activeGroup ? (
          <div className="space-y-4 rounded-md border border-border bg-background p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{labels.depreciationPolicyGroupName}</span>
                <input value={activeGroup.name} onChange={(event) => updateGroup(activeGroup.id, { name: event.target.value })} className={inputClassName} />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{labels.depreciationUsefulLifeMonths}</span>
                <input type="number" min={1} max={600} value={activeGroup.usefulLifeMonths} onChange={(event) => updateGroup(activeGroup.id, { usefulLifeMonths: Number(event.target.value) })} className={inputClassName} />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{labels.depreciationResidualPercent}</span>
                <input type="number" min={0} max={90} step={0.01} value={activeGroup.residualRatePercent} onChange={(event) => updateGroup(activeGroup.id, { residualRatePercent: Number(event.target.value) })} className={inputClassName} />
              </label>
            </div>

            <div className="grid gap-3 lg:grid-cols-[1fr_auto_1fr]">
              <CategoryPicker
                title={labels.depreciationAvailableCategories}
                categories={availableCategories}
                selectedIds={selectedAvailableIds}
                onSelectedIdsChange={setSelectedAvailableIds}
                assignedByOtherGroup={assignedByOtherGroup}
                conflictLabel={labels.depreciationAssignedCategoryConflict}
                emptyLabel={labels.depreciationNoMatchingCategories}
                searchLabel={labels.depreciationSearchCategories}
                searchValue={categorySearch}
                onSearchChange={setCategorySearch}
              />
              <div className="flex flex-row items-center justify-center gap-2 lg:flex-col">
                <button type="button" onClick={addSelectedCategories} className={compactButtonClassName}>
                  {labels.depreciationAddSelectedCategories}
                </button>
                <button type="button" onClick={removeSelectedCategories} className={compactButtonClassName}>
                  {labels.depreciationRemoveSelectedCategories}
                </button>
              </div>
              <CategoryPicker
                title={labels.depreciationSelectedCategories}
                categories={selectedCategories}
                selectedIds={selectedAssignedIds}
                onSelectedIdsChange={setSelectedAssignedIds}
                assignedByOtherGroup={new Set()}
                conflictLabel={labels.depreciationAssignedCategoryConflict}
                emptyLabel={labels.depreciationNoSelectedCategories}
              />
            </div>

            <button type="button" onClick={() => removeGroup(activeGroup.id)} className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-danger/40 px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10">
              <Trash2 className="h-4 w-4" />
              {labels.depreciationRemoveGroup}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPreviewTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPreviewDescription}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{labels.depreciationPreviewPurchasePrice}</span>
            <input type="number" min={0} step={0.01} value={previewPurchasePrice} onChange={(event) => setPreviewPurchasePrice(event.target.value)} className={inputClassName} />
          </label>
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{labels.depreciationPreviewPurchaseDate}</span>
            <input type="date" value={previewPurchaseDate} onChange={(event) => setPreviewPurchaseDate(event.target.value)} className={inputClassName} />
          </label>
          <PreviewMetric label={labels.depreciationPreviewMonthly} value={formatMoney(preview.monthlyDepreciation)} />
          <PreviewMetric label={labels.depreciationPreviewNetBook} value={formatMoney(preview.netBookValue)} />
          <PreviewMetric label={labels.depreciationPreviewAccumulated} value={formatMoney(preview.accumulatedDepreciation)} />
          <PreviewMetric label={labels.depreciationPreviewAgeMonths} value={preview.ageMonths.toLocaleString()} />
        </div>
      </div>

      {state.legacyRules.length > 0 ? (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
          <h3 className="text-sm font-semibold text-foreground">{labels.depreciationLegacyRules}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationLegacyRulesHelp}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {state.legacyRules.map((rule) => (
              <li key={`${rule.match}-${rule.usefulLifeMonths}`}>{rule.match}: {rule.usefulLifeMonths} months</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="rounded-md border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">{labels.depreciationAdvancedJson}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{labels.depreciationAdvancedJsonDescription}</p>
        <textarea
          value={policyJson}
          onChange={(event) => onPolicyJsonChange(event.target.value)}
          rows={8}
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </details>
    </div>
  )
}

function ReadonlyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  )
}

function CategoryPicker({
  title,
  categories,
  selectedIds,
  onSelectedIdsChange,
  assignedByOtherGroup,
  conflictLabel,
  emptyLabel,
  searchLabel,
  searchValue,
  onSearchChange,
}: {
  title: string
  categories: DepreciationPolicyEditorCategory[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  assignedByOtherGroup: Set<string>
  conflictLabel: string
  emptyLabel: string
  searchLabel?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
}) {
  return (
    <div className="rounded-md border border-border">
      <div className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">{title}</div>
      {onSearchChange ? (
        <label className="relative block border-b border-border p-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchValue ?? ""} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchLabel} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </label>
      ) : null}
      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {categories.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p> : null}
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id)
          const isConflict = assignedByOtherGroup.has(category.id)
          return (
            <label key={category.id} className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors ${isConflict ? "text-muted-foreground" : "hover:bg-accent"}`}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={isConflict}
                onChange={(event) => {
                  if (event.target.checked) onSelectedIdsChange([...selectedIds, category.id])
                  else onSelectedIdsChange(selectedIds.filter((id) => id !== category.id))
                }}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{category.code}</span>
                <span className="block truncate text-xs text-muted-foreground">{category.name}</span>
                {isConflict ? <span className="mt-1 block text-xs text-warning">{conflictLabel}</span> : null}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
```

- [ ] **Step 4: Run static UI test and fix compile-level issues**

Run:

```powershell
node --test tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
pass 2
fail 0
```

- [ ] **Step 5: Commit component**

Run:

```powershell
git add src/components/admin/depreciation-policy-builder.tsx tests/settings-depreciation-policy-ui.test.ts
git commit -m "Add depreciation policy builder component"
```

---

### Task 4: Wire Builder Into System Settings

**Files:**
- Modify: `src/components/admin/system-settings-form.tsx`
- Test: `tests/settings-depreciation-policy-ui.test.ts`

- [ ] **Step 1: Add failing test for replacing the raw primary textarea**

Append this test to `tests/settings-depreciation-policy-ui.test.ts`:

```ts
test("settings form renders depreciation builder instead of primary json textarea", () => {
  const form = readFileSync("src/components/admin/system-settings-form.tsx", "utf8")

  assert.match(form, /<DepreciationPolicyBuilder/)
  assert.match(form, /policyJson=\{getValue\(depreciationPolicySettingKey\)\}/)
  assert.match(form, /onPolicyJsonChange=\{\(value\) => setValue\(depreciationPolicySettingKey, value\)\}/)
  assert.doesNotMatch(form, /id="accounting-depreciation-policy"[\s\S]{0,200}rows=\{10\}/)
})
```

- [ ] **Step 2: Run test and verify it fails**

Run:

```powershell
node --test tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
FAIL
The input did not match the regular expression /<DepreciationPolicyBuilder/
```

- [ ] **Step 3: Import builder**

In `src/components/admin/system-settings-form.tsx`, add:

```ts
import { DepreciationPolicyBuilder } from "@/components/admin/depreciation-policy-builder"
```

- [ ] **Step 4: Replace the primary depreciation textarea**

Replace the current organization tab depreciation block:

```tsx
          <div className="md:col-span-2">
            <Field label={labels.accountingDepreciationPolicy} htmlFor="accounting-depreciation-policy">
              <textarea
                id="accounting-depreciation-policy"
                value={getValue(depreciationPolicySettingKey)}
                onChange={(event) => setValue(depreciationPolicySettingKey, event.target.value)}
                rows={10}
                className="w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>
            <p className="mt-2 text-sm text-muted-foreground">{labels.accountingDepreciationPolicyDescription}</p>
            {hasInvalidDepreciationPolicy ? <ValidationMessage message={labels.invalidAccountingDepreciationPolicy} /> : null}
          </div>
```

with:

```tsx
          <div className="md:col-span-2">
            <DepreciationPolicyBuilder
              categories={categories}
              policyJson={getValue(depreciationPolicySettingKey)}
              labels={labels}
              onPolicyJsonChange={(value) => setValue(depreciationPolicySettingKey, value)}
            />
            <p className="mt-2 text-sm text-muted-foreground">{labels.accountingDepreciationPolicyDescription}</p>
            {hasInvalidDepreciationPolicy ? <ValidationMessage message={labels.invalidAccountingDepreciationPolicy} /> : null}
          </div>
```

- [ ] **Step 5: Run settings UI static test**

Run:

```powershell
node --test tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
pass 3
fail 0
```

- [ ] **Step 6: Run targeted depreciation tests**

Run:

```powershell
node --test tests\asset-depreciation.test.ts tests\depreciation-policy-editor.test.ts tests\settings-depreciation-policy-ui.test.ts
```

Expected result:

```text
fail 0
```

- [ ] **Step 7: Commit wiring**

Run:

```powershell
git add src/components/admin/system-settings-form.tsx tests/settings-depreciation-policy-ui.test.ts
git commit -m "Wire depreciation policy builder into settings"
```

---

### Task 5: Browser Verify Settings UX

**Files:**
- No source files expected unless browser verification finds a concrete issue.

- [ ] **Step 1: Start or reuse the local dev server**

If the app is not already running at `http://localhost:3000`, run:

```powershell
npm run dev
```

Expected result:

```text
Local: http://localhost:3000
```

- [ ] **Step 2: Open Settings Organization tab**

Use the in-app browser at:

```text
http://localhost:3000/th/admin/settings
```

If the app opens on a different tab, choose the organization tab in the settings navigation.

- [ ] **Step 3: Verify visible behavior**

Confirm these are visible:

- `ตัวสร้างนโยบายค่าเสื่อม`
- `วิธีคิดค่าเสื่อม`
- `เส้นตรง`
- `วันเริ่มนับค่าเสื่อม`
- `วันที่ซื้อทรัพย์สิน`
- default useful-life and residual percent inputs
- policy group list
- available and selected category pickers
- calculation preview
- advanced JSON details section

- [ ] **Step 4: Verify editing behavior**

Perform these browser actions:

1. Change default useful life to `72`.
2. Add a policy group.
3. Set the group name to `CCTV`.
4. Set useful life to `84`.
5. Set residual value to `10`.
6. Search for `CCTV`.
7. Select the CCTV category and add it to the group.
8. Open Advanced JSON and confirm it contains:

```json
"defaultUsefulLifeMonths": 72
```

and a rule similar to:

```json
{ "match": "CCTV", "usefulLifeMonths": 84, "residualRate": 0.1, "label": "CCTV" }
```

- [ ] **Step 5: Check console errors**

Use browser developer logs.

Expected result:

```text
0 console errors
```

- [ ] **Step 6: Fix any layout issues found**

If the dual-list panel overflows at desktop width, use this targeted change in `src/components/admin/depreciation-policy-builder.tsx`:

```tsx
<div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
```

and ensure each picker panel has:

```tsx
className="min-w-0 rounded-md border border-border"
```

- [ ] **Step 7: Commit browser polish if needed**

If Step 6 changed source files, run:

```powershell
git add src/components/admin/depreciation-policy-builder.tsx
git commit -m "Polish depreciation policy builder layout"
```

If Step 6 did not change source files, do not create an empty commit.

---

### Task 6: Update Docs and Handoff

**Files:**
- Modify: `DEVELOPER_HANDOFF.md`
- Modify: `docs/06_WORKFLOWS.md`
- Modify: `docs/99_CHANGELOG.md`

- [ ] **Step 1: Update Handoff**

In `DEVELOPER_HANDOFF.md`, update the accounting/depreciation note to include:

```md
- Accounting depreciation policy is edited through a structured Settings UI rather than raw JSON. The UI manages default useful life, default residual value, category-specific policy groups, a calculation preview, and an advanced JSON view while preserving the existing `accounting_depreciation_policy` setting. Depreciation still starts from `Asset.purchaseDate` in this phase.
```

- [ ] **Step 2: Update workflow docs**

In `docs/06_WORKFLOWS.md`, under Admin Operations or Reports, add:

```md
- Depreciation policy is configured in Settings as a policy builder: admins set straight-line defaults, assign active categories to policy groups, preview monthly depreciation and net book value, and can inspect the generated JSON in advanced mode. Reports still use purchase date as the depreciation start date.
```

- [ ] **Step 3: Update changelog**

In `docs/99_CHANGELOG.md`, update `Latest Update` to mention:

```md
✅ Settings now includes a structured depreciation policy builder for useful life, residual value, category groups, and calculation preview while keeping the existing JSON setting.
```

Also add or update the accounting key design decision:

```md
- **Depreciation Policy Builder** Settings replaces raw JSON as the primary editing surface for `accounting_depreciation_policy`; it serializes back to the existing JSON shape and keeps depreciation start based on `purchaseDate`.
```

- [ ] **Step 4: Commit docs**

Run:

```powershell
git add DEVELOPER_HANDOFF.md docs/06_WORKFLOWS.md docs/99_CHANGELOG.md
git commit -m "Document depreciation policy builder"
```

---

### Task 7: Final Verification and Push

**Files:**
- No source edits expected unless verification finds a concrete bug.

- [ ] **Step 1: Run full verification**

Run:

```powershell
npm run verify
```

Expected result:

```text
Verification completed successfully.
tests 335
fail 0
```

The exact test count may be higher if more tests are added during implementation. The important conditions are `fail 0`, lint success, and build success.

- [ ] **Step 2: Inspect final git status**

Run:

```powershell
git status --short --branch
```

Expected result:

```text
## master
```

An existing unrelated untracked plan file may remain:

```text
?? docs/superpowers/plans/2026-05-28-storage-orphan-archive-workflow.md
```

Do not stage that file unless the user explicitly asks.

- [ ] **Step 3: Push**

Run:

```powershell
git push origin master
```

Expected result:

```text
master -> master
```

---

## Self-Review

- Spec coverage:
  - Structured UI replaces raw JSON: Task 3 and Task 4.
  - Existing JSON setting preserved: Task 1 and Task 4.
  - Default useful life and residual value: Task 1 and Task 3.
  - Category-specific groups: Task 1 and Task 3.
  - Preview calculation: Task 1 and Task 3.
  - Advanced JSON fallback: Task 3.
  - Depreciation starts from purchase date: Task 1 preview test, Task 3 UI copy, Task 6 docs.
  - No schema change in first phase: documented in Scope.

- Placeholder scan:
  - No placeholder steps are present.
  - Every code-changing step includes exact files and concrete code or replacement blocks.
  - Every test step includes a command and expected result.

- Type consistency:
  - `DepreciationPolicyEditorCategory`, `DepreciationPolicyEditorState`, and `DepreciationPolicyEditorGroup` are defined in Task 1 and imported by Task 3.
  - `DepreciationPolicyBuilder` receives `categories`, `policyJson`, `labels`, and `onPolicyJsonChange`; Task 4 uses the same props.
  - Label names added in Task 2 match the component fields used in Task 3.
