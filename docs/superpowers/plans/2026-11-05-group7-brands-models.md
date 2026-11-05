# Page group 7, plan 1: brands and models (one duplicate rule, add from the asset form, the brands page) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A missing brand or model can be added from inside the asset form without losing what was typed and without creating a near-duplicate; every brand/model save follows one duplicate rule; the brands page gains "เพิ่มล่าสุด", "ปิดใช้งาน" with a confirm, a photo fallback and a phone view.

**Architecture:**
- **Server:** a new `src/lib/brand-model-duplicates.ts` (clash and similar-name reads) used by `POST/PUT /api/brands` and `/api/models`, and a new `GET /api/brand-models/similar`.
- **Client:** `SearchableSelect` gains an optional create row; a new `BrandModelQuickAddDialog`; the asset form and batch form switch their brand and model pickers to `SearchableSelect`.
- **Page:** `/master-data/brands` keeps its layout and gains the recent filter (read from the system log), the deactivate confirm, the photo fallback and the phone view. No migration.

**Tech Stack:** Next.js 16, Prisma 7 on SQL Server, next-intl, `node --test`, Playwright (4 projects).

**Spec:** `docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md` (approved 2026-11-05, commit `837bb98e`): §4, §3, §8. Plans of the group: 1 brands/models (this), 2 employees, 3 locations, 4 multi-asset return.

## Global Constraints

- Thai first; words from `docs/19_THAI_GLOSSARY.md`; messages only via `node scripts/messages-edit.mjs <change.json>` with dotted keys (check `git diff --stat messages/`); `tests/thai-glossary.test.ts` stays green.
- **The duplicate rule:** two names are the same when equal after `normalizeDuplicateName` (`src/lib/brand-model-query.ts`: trim, lower-case, remove spaces and `. _ - ( ) / \`). Brand: unique over all brands. Model: unique within its brand. Checked on every create and rename, against active **and** inactive records. The database unique keys stay.
- Similar names (the rule above, or one normalized name containing the other) are a **warning**, never a refusal.
- Permissions: add a brand or model = `brand:create` (also from the asset form); reactivate = `brand:edit`; models stay under the `brand` module.
- Every create writes the system log as today, with `newValue.source` = `"asset-form"` or `"master-data"`.
- Errors under their fields (V-track); no migration; IN lists chunked by 2,000.
- E2E: dev DB only; only run-marked brands and models are created or deactivated.

## Plan rulings

- **G7P1-R1** Clash response: `409 { code: "BRAND_NAME_EXISTS" | "MODEL_NAME_EXISTS", field: "name", existing: { id, name, isActive } }`. Cost if wrong: one response shape.
- **G7P1-R2** The similar list caps at 8 names, active first, then by name. Cost if wrong: a number.
- **G7P1-R3** "เพิ่มล่าสุด" windows are 7 and 30 days (`?added=7|30`), Bangkok days by `createdAt`; who/where read from the newest `create` system-log row per record (`module: "brand"`, `recordId`), "–" when none. Cost if wrong: query only.
- **G7P1-R4** The quick-add create row appears only when the typed query (≥ 2 characters after trim) has no option whose normalized name equals it. Cost if wrong: a condition.
- **G7P1-R5** The asset **edit** form gets the same pickers and the same quick add (spec §4.2 "my call").

## Review Focus

1. "dell" typed when "Dell" exists (active or inactive): refused with the existing one named; never a second Dell — Task 1 tests `findBrandNameClash` and the route.
2. A model name that clashes only with an **inactive** model of the same brand: the form offers "เปิดใช้งาน {name}" to a user with `brand:edit`, plain refusal otherwise — Task 1 route test, Task 2 form test.
3. Quick add while category or brand is not chosen: "add model" is not offered and the hint says to pick them first — Task 3 test.
4. A user without `brand:create` searches a missing model: sees "ไม่พบ · แจ้งผู้ดูแลข้อมูลหลักให้เพิ่ม", no create row — Task 3 test and E2E.
5. After a quick add, every other field typed in the asset form is unchanged and the new model is chosen — Task 3 test and E2E.

---

### Task 1: The duplicate rule on the server, and the similar-names read

**Files:**
- Create: `src/lib/brand-model-duplicates.ts`, `src/app/api/brand-models/similar/route.ts`
- Modify: `src/app/api/brands/route.ts`, `src/app/api/brands/[id]/route.ts`, `src/app/api/models/route.ts`, `src/app/api/models/[id]/route.ts`, `src/lib/validations/brand-model.ts` (optional `source: "asset-form" | "master-data"`, default `"master-data"`; not stored on the record)
- Test: `tests/brand-model-duplicates.test.ts`, route source pins in an existing brand/model API test (find with `grep -ln "api/brands" tests`)

**Interfaces:**
- Produces:
  - `export type NameClash = { id: string; name: string; isActive: boolean }`
  - `export async function findBrandNameClash(db, name: string, excludeId?: string): Promise<NameClash | null>`
  - `export async function findModelNameClash(db, brandId: string, name: string, excludeId?: string): Promise<NameClash | null>`
  - `export function isSimilarName(a: string, b: string): boolean` — normalized equal, or one normalized string contains the other (both non-empty).
  - `export async function listSimilarBrands(db, query: string): Promise<NameClash[]>` and `listSimilarModels(db, brandId: string, query: string): Promise<NameClash[]>` — G7P1-R2.
  - `GET /api/brand-models/similar?kind=brand&q=` and `?kind=model&brandId=&q=` → `{ data: NameClash[] }`, `brand:view` **or** `asset:create` (the asset form's users may not hold `brand:view`); `q` shorter than 2 → `[]`.
  - Clash responses per G7P1-R1, before the insert/update.
- [ ] **Step 1: Failing tests:** `findBrandNameClash` finds "Dell" for "dell", " DELL " and "D-E-L-L"; returns the inactive one with `isActive: false`; ignores `excludeId`; `findModelNameClash` matches "Latitude5420" to "Latitude 5420" within the brand only; `isSimilarName("HP","HPE") === true`, `isSimilarName("HP","Dell") === false`; the four routes call the clash finder before `create`/`update` and answer the 409 shape; the similar route refuses without either permission.
- [ ] **Step 2:** run → FAIL. **Step 3:** implement (read all brand names, or the brand's model names, and compare in memory — brands and models number in the hundreds). **Step 4:** tests, `npm test`, `tsc`, eslint clean.
- [ ] **Step 5: Commit** `feat(master-data): one duplicate rule for brands and models, and the similar-names read (group 7 plan 1)`

### Task 2: The brands page forms answer a clash

**Files:**
- Modify: `src/components/master-data/brand-form.tsx` (find the brand form used by `/master-data/brands/new` and `[id]/edit`), `src/components/master-data/asset-model-form.tsx`; messages
- Test: the forms' existing UI tests (`grep -ln "asset-model-form\|brand-form" tests`)

**Interfaces:** Consumes Task 1's 409 shape. Produces `BrandModelClashNotice({ clash, kind, canReactivate, onUse, onReactivate })` in `src/components/master-data/brand-model-clash-notice.tsx` (Task 3 reuses it).
- **Copy (th):** under the name `มี {name} อยู่แล้ว`; inactive: `มี {name} อยู่แล้ว แต่ปิดใช้งานอยู่`; actions `ใช้ {name}` (brands page: opens that record's edit page) · `เปิดใช้งาน {name}` (`brand:edit`; `PUT` with `isActive: true` then opens it).
- [ ] **Steps:** failing pins (the form renders `BrandModelClashNotice` for a 409 with `existing`; reactivate only with `canReactivate`) → implement → tests, `npm test`, `tsc`, eslint → commit `feat(master-data): the brand and model forms name the existing record and offer it (group 7 plan 1)`.

### Task 3: Add a brand or model from the asset form

**Files:**
- Modify: `src/components/ui/searchable-select.tsx` (optional `createRow?: { label: (query: string) => string; onCreate: (query: string) => void; isExactMatch: (query: string) => boolean } | { blockedHint: string }`)
- Create: `src/components/assets/brand-model-quick-add-dialog.tsx`, `src/lib/brand-model-quick-add-rules.ts`
- Modify: `src/components/assets/asset-form.tsx`, `src/components/assets/asset-batch-form.tsx`, `src/app/[locale]/(dashboard)/assets/new/page.tsx`, `src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx` (pass `canCreateBrandModel = hasPermission(user, "brand", "create")`, `canReactivateBrandModel = hasPermission(user, "brand", "edit")`); messages
- Test: `tests/brand-model-quick-add-rules.test.ts`, source pins in the asset form tests (`grep -ln "asset-form" tests`)

**Interfaces:**
- Consumes Task 1 (`/api/brand-models/similar`, `POST /api/brands|models` with `source: "asset-form"`, 409 shape), Task 2 (`BrandModelClashNotice`).
- Produces `quickAddAvailability(input: { kind: "brand" | "model"; canCreate: boolean; brandId: string | null; categoryId: string | null }): "ok" | "noPermission" | "needBrandAndCategory"` and `shouldOfferCreate(query: string, optionNames: readonly string[]): boolean` (G7P1-R4).
- **Copy (th):** create row `เพิ่มยี่ห้อใหม่: {query}` / `เพิ่มรุ่นใหม่: {query}`; no permission `ไม่พบ · แจ้งผู้ดูแลข้อมูลหลักให้เพิ่ม`; need brand/category `เลือกหมวดหมู่และยี่ห้อก่อนเพิ่มรุ่นใหม่`; dialog titles `เพิ่มยี่ห้อใหม่` / `เพิ่มรุ่นใหม่ใน {brand}`; similar heading `ชื่อใกล้เคียงที่มีอยู่แล้ว`; each similar row button `ใช้รายการนี้`; save `บันทึกและเลือก`.
- [ ] **Step 1: Failing tests:** `quickAddAvailability` for the three outcomes; `shouldOfferCreate("latitude 5420", ["Latitude5420"]) === false`, `shouldOfferCreate("La", [])` true, `shouldOfferCreate("L", [])` false; pins: both forms render `SearchableSelect` for `asset-brand` and `asset-model` with `createRow`; the dialog posts `source: "asset-form"`; after save the form's `brandId`/`modelId` is set through the same handler a pick uses, other values untouched; the model options list gains the new model so the category/brand filter keeps it.
- [ ] **Step 2–4:** FAIL → implement (the dialog fetches similar names as the user types, debounced 250 ms; a clash 409 shows `BrandModelClashNotice` whose "ใช้ {name}" picks the existing record in the form) → tests, `npm test`, `tsc`, eslint.
- [ ] **Step 5: Commit** `feat(assets): add a brand or model from the asset form, with similar names and the duplicate rule (group 7 plan 1)`

### Task 4: The brands page

**Files:**
- Modify: `src/app/[locale]/(dashboard)/master-data/brands/page.tsx`, `src/lib/brand-model-query.ts`; create `src/lib/brand-model-recent.ts`, `src/components/master-data/model-photo.tsx` (client: `onError` fallback), `src/components/master-data/brand-model-deactivate-button.tsx`; messages
- Test: `tests/brand-model-recent.test.ts`, page pins in the existing brands page test (`grep -ln "master-data/brands" tests`)

**Interfaces:**
- Produces `readRecentBrandModels(db, days: 7 | 30, now: Date): Promise<Array<{ kind: "brand" | "model"; id: string; name: string; brandName: string | null; createdAt: Date; addedByName: string | null; source: "asset-form" | "master-data" | null }>>` (G7P1-R3).
- **Copy (th):** filter `เพิ่มล่าสุด` with `7 วัน` / `30 วัน`; row line `เพิ่มโดย {name} · {จากฟอร์มทรัพย์สิน|จากหน้าข้อมูลหลัก}` (`–` when unknown); ⋯ `ปิดใช้งาน`; confirm title `ปิดใช้งาน {name}?`, body `ใช้อยู่ใน {models} รุ่น และ {assets} ทรัพย์สิน · ข้อมูลเดิมไม่เปลี่ยน · เปิดใช้งานอีกครั้งได้จากหน้าแก้ไข`; photo fallback `โหลดรูปไม่สำเร็จ`, none `ยังไม่มีรูป`; phone brand select label `ยี่ห้อ`.
- [ ] **Step 1: Failing tests:** `readRecentBrandModels` with a fake db: a model created 3 days ago appears for 7 and 30, one created 20 days ago only for 30; who/source from the newest create log; a record with no log row gives `addedByName: null, source: null`; pins: `?added=` parsed to 7|30, ⋯ uses the deactivate button (no "ลบ" label left in this page), `ModelPhoto` used for thumbnails, the phone branch (`md:hidden`) renders a brand select and model cards.
- [ ] **Step 2–4:** FAIL → implement → tests, `npm test`, `tsc`, eslint.
- [ ] **Step 5: Commit** `feat(master-data): the brands page: เพิ่มล่าสุด, ปิดใช้งาน with a confirm, the photo fallback and the phone view (group 7 plan 1)`

### Task 5: E2E

**Files:** create `e2e/master-data/brands-models.spec.ts` (+ support); extend `tests/e2e-*.test.ts` pins as the other folders do.
- [ ] Specs (run-marked names only; a user with `brand:create` — the run's role setup or the seed admin session, whichever the setup supports without touching shared roles):
  - From the asset create form: search a run-marked missing model → `เพิ่มรุ่นใหม่: …` → the dialog lists a similar run-marked model → save a new one → it is chosen and the typed asset fields are unchanged.
  - Add the same model again with a spelling variant (spaces/case) → `มี … อยู่แล้ว` with `ใช้ …`, which picks the existing one.
  - A user without `brand:create` sees `ไม่พบ · แจ้งผู้ดูแลข้อมูลหลักให้เพิ่ม`.
  - The brands page `เพิ่มล่าสุด 7 วัน` lists the run's model with `จากฟอร์มทรัพย์สิน`; deactivating a run-marked model shows the confirm with its counts.
  - Phone: the brands page shows the brand select and model cards.
  - axe via `recordSettled`.
- [ ] Controller runs `e2e/master-data` four projects; commit `test(e2e): brands and models (group 7 plan 1)`.

### Task 6 (controller): verification, look, review, docs

- [ ] E2E `e2e/master-data`, `e2e/assets`, four projects.
- [ ] Look step on 3300: the asset form with the open picker, the dialog with similar names, the clash notice; the brands page (recent filter, confirm, a broken photo, phone); 1440 both themes, 1024, 390 both themes.
- [ ] Final review: opus Workflow, 3 lenses × 2 skeptics, base `837bb98e`; one fix pass.
- [ ] Docs (`06_WORKFLOWS`, `11_FEATURE_LIST`, `07_UAT_CHECKLIST`, `99_CHANGELOG`, `DEVELOPER_HANDOFF`), wiki (status, open question, log, lint, `ingest:`), memory.
