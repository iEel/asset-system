# Page group 7: master data — brands and models, employees, locations

Date: 2026-11-05 · Status: draft for the user's approval · The first of the five admin-side groups the user ordered (2026-11-05): master data, remaining master data, users and roles, remaining admin, settings and Integration API.

Canvas: https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p (boards MD-*). Assumptions: `.impeccable/critique/2026-10-20-canvas-assumptions.md` (## ข้อมูลหลัก, and the employee-detail line of ## ข้อมูลหลักที่เหลือ).

## 1. Why

IT staff touch master data in three moments (user, 2026-11-05):

1. **Registering a new asset whose model is not in the system yet.** Today they leave the asset form, add the model on the brands page, and come back. Nothing in the asset form can add a brand or a model.
2. **An employee resigns.** IT checks the condition of each machine the person holds and takes it back.
3. **Locations:** adding a room, moving one, or finding what a room holds.

The user's worry about letting people add brands and models from the asset form: **the data gets messy** (the same model typed two ways splits the reports).

**Success:**
- A missing model is added from inside the asset form in a few seconds, without losing what was typed, and without creating a near-duplicate.
- A resigned employee who still holds assets is easy to find, and each machine is taken back from their page.
- Locations read as the building actually is: branch → building → floor → room.

## 2. Goals, non-goals, anti-goals

**Goals**
- Add a brand or a model from the asset form (single and batch), guarded against duplicates.
- Tighten the duplicate rule everywhere a brand or model is saved.
- The brands/models page per the canvas, plus a "recently added" filter to review what was added.
- The employee list finds former employees who still hold assets, including those AD has deactivated; the employee page lets IT take each machine back.
- Locations: a tree view by branch, the full path, counts that open the register, safe parent choice and safe deactivation.

**Non-goals**
- The multi-asset return (§5.3) is in scope but built as the group's last plan, after the master-data pages *(my call)*.
- No change to AD/LDAP sync rules or its safety gate.
- No new permission module (models stay under `brand`, as today).
- The other master-data pages (companies, branches, departments, categories, suppliers) are the next group.

**Anti-goals**
- A second spelling of an existing brand or model saved without the user seeing the existing one first.
- Anyone without the right to add master data seeing an add button.
- A location moved under itself or one of its own children, or under a location of another branch.

## 3. Constraints

- Thai first; words from `docs/19_THAI_GLOSSARY.md`. Messages change only through `node scripts/messages-edit.mjs` with dotted keys.
- Errors show under their fields (the V-track way).
- Permissions as today: `brand:create` to add a brand or model (also from the asset form); `brand:edit` to edit; `employee:*`, `location:*` as today; the return form needs `asset:edit`.
- Every create and edit writes the system log, as today; an add from the asset form says so in the log (`source: "asset-form"`).
- No migration is expected (§8).
- SQL Server: IN lists chunked by 2,000.

## 4. Brands and models

### 4.1 One duplicate rule

- Two names are the same when they match after trimming, lower-casing and removing spaces and `. _ - ( ) / \` — the rule the brands page already uses to show duplicate groups (`normalizeDuplicateName` in `src/lib/brand-model-query.ts`).
- **Brand:** no two brands with the same normalized name. **Model:** no two models of one brand with the same normalized name.
- The check runs on the server for every create and rename (the brands page forms, the asset form, any API caller), against active **and** inactive records.
- A clash with an **active** record is refused with a field error naming it ("มี {name} อยู่แล้ว"), and the form offers to use it.
- A clash with an **inactive** record is refused the same way, with the offer "เปิดใช้งาน {name}" for a user with `brand:edit` *(my call: reuse beats a second record; today the database refuses it with a bare error)*.
- Existing duplicate groups stay as they are; the page's duplicate review keeps listing them.

### 4.2 Adding from the asset form

- In the asset create form and the batch form, the brand and model pickers become searchable *(my call: a plain select of every model does not scale and cannot show "not found")*.
- Typing a name that is not in the list shows "เพิ่ม{ยี่ห้อ|รุ่น}ใหม่: {typed}" at the end of the list, for a user with `brand:create` only; others see "ไม่พบ · แจ้งผู้ดูแลข้อมูลหลักให้เพิ่ม".
- **Adding a model** needs a chosen brand and a chosen category (the form's own). A small dialog asks only the model name (prefilled with what was typed) and shows, live, the models of that brand whose names are similar (the §4.1 rule, plus "contains"); choosing one uses it instead.
- **Adding a brand:** the same dialog shape, brand name only, with the similar brands listed above the save button. Similar names are a **warning**, not a block (HP and HPE are both real); only the §4.1 rule refuses, on the server *(my call, builder check)*.
- On save the new record is chosen in the form and nothing else in the form changes. The asset name suggestion updates as it does today.
- The edit form of an existing asset gets the same pickers *(my call: the same component)*.

### 4.3 The brands/models page (`/master-data/brands`)

Keeps today's two-column layout (brands left, models right), its counts, filters, export and duplicate review, and adds:
- **"เพิ่มล่าสุด"**: a filter for brands and models added in the last 7 / 30 days (by `createdAt`), newest first, each with who added it and where (the brands page or the asset form), read from the create entry of the system log (`module: "brand"`, `recordId`, `newValue.source`). An entry the log no longer holds shows "–" for who and where *(my call: brands and models have no `createdBy` column; a migration for it is not worth a deploy step)*.
- The ⋯ action reads **"ปิดใช้งาน"**, not "ลบ" (it already only deactivates). It shows a confirm with the number of models and assets that use the record; deactivating does not touch them.
- **Model photo fallback:** a photo that fails to load shows a placeholder with "โหลดรูปไม่สำเร็จ", not a broken image; no photo shows "ยังไม่มีรูป".
- **Phone:** the brand list becomes a select at the top; models become cards (name, photo, category, asset count) *(the canvas has no phone board; my call)*.

## 5. Employees

### 5.1 The list (`/master-data/employees`)

- The summary card **"พ้นสภาพแต่ยังถือครอง"** counts every employee who is not `employmentStatus = active` **or** not `isActive`, and still holds an active asset — including those AD sync deactivated, whom today's cards leave out. Pressing it shows exactly those people, whatever the record-status filter.
- Each such row is marked with the number of assets held, in the warning tone.
- The rest of the list (filters, columns, sorting) stays as today, restyled to the canvas.

### 5.2 The employee page (`/master-data/employees/[id]`) — moved here from the next group

The page is rebuilt to its canvas board (the employee-detail line of ## ข้อมูลหลักที่เหลือ in the assumptions file): the header buttons "ส่งมอบทรัพย์สินให้คนนี้" (the handover form with this person chosen) and the return action below; each held asset with its handover document; "สร้างใบส่งมอบย้อนหลัง" for a held asset with no handover; the per-item audit summary; the "บัญชีผู้ใช้ในระบบ" line; open handovers split into regular use and overdue, so a normal loan does not raise a warning *(my call, builder check: every board is built before the deploy)*.

- A warning panel at the top when a former employee still holds assets: "พ้นสภาพแล้ว ยังถือครอง {n} รายการ".
- The **current assets** table lists every held asset (not only the first 10; paged at 25 when more). A user with `asset:edit` gets **"รับคืน"** per row and **"รับคืนหลายรายการ"** in the header (§5.3).
- "รับคืน" opens the return form for that machine, preselected (the open handover's `checkoutId`, or `assetId` when there is no handover), with `returnTo` back to the employee page. After saving, the user lands back on the employee page and the machine is gone from the list, so IT works down the list checking each machine's condition in the return form.
- **The return form changes for this** *(builder check)*: its way back accepts one employee page (`/[locale]/master-data/employees/<id>`) besides today's pages; `assetId` preselects a held asset that has no handover (the ข้อมูลเก่า path the form already has), not only an outstanding component.
- A held machine the return form would refuse (under repair, pending disposal, fitted as a component, …) shows "รับคืน" disabled with the reason, the same reason the return form gives *(my call)*.
- The rest of the page (history, repairs, audit, disposal) stays.

### 5.3 Returning several machines in one form (user decision, 2026-11-05: "แบบ ข")

When an employee leaves, IT takes everything back at once. The return form today records one machine per save, with its own RT- document and signatures, so five machines mean five saves and five signatures.

- **"รับคืนหลายรายการ"** on the employee page opens a multi-asset return for that person: every machine they hold, each with a tick (all ticked by default), the machine's condition after return (default "ปกติ"), optional photos, and the next location (one for all, changeable per row).
- **One signature** of the person returning and one of the receiver, and **one RT- document** listing every machine returned; the RT- print shows them all.
- Each machine still gets its own return record, movement, status change and history line, exactly as a single return writes them; the rows share the document number. All or nothing: if one machine can no longer be returned (it changed meanwhile), nothing is saved and the row names why.
- A machine the return form would refuse (under repair, pending disposal, fitted as a component, …) is listed unticked and disabled with the reason.
- Components travelling with a machine follow today's checklist rule per machine.
- Cancelling a return keeps working per machine, as today *(builder to confirm how a shared RT- reads after one line is cancelled)*.
- The single-machine return form and its entry points stay as they are.

### 5.4 Deactivating

Unchanged and already safe: an employee who holds assets, has subordinates, a user account, an open handover or audit rounds cannot be deactivated by hand (409 with the reason, shown under the field).

## 6. Locations

### 6.1 The page (`/master-data/locations`)

- **Two views, tree first:**
  - **Tree:** grouped by branch; each location under its parent; expand and collapse; each node shows its Thai type label, code, name, its own asset count and, on a parent, "รวมที่ตั้งย่อย {n}" = the assets of the whole subtree (computed in memory per branch) *(my call, builder check)*. The tree opens with branches expanded one level *(my call)*; a search expands the matching nodes' parents.
  - **List:** today's table, with the full path written with names ("สำนักงานใหญ่ › อาคาร A › ชั้น 3 › ห้อง IT") instead of codes.
- **Asset counts open the register filtered by that location** (`/assets?locationId=<id>`; today they search by code). The register filter stays exact (that location only) *(my call: including children needs a register change; the parent's "รวม" number is for reading)*.
- **"เพิ่มที่ตั้งในนี้"** on each node and row opens the create form with the branch and the parent chosen.
- ⋯ reads **"ปิดใช้งาน"** with a confirm. The confirm checks today's block (assets here, assets whose home is here, active children, audit rounds) and names what blocks it; nothing is deactivated while something does.
- **Phone:** the tree only, as an indented list *(my call)*.

### 6.2 The form

- The parent is a searchable picker that lists only active locations **of the chosen branch**, each with its full path; changing the branch clears a parent of another branch.
- On edit, the location itself and **all its descendants** are left out of the parent list.
- The server refuses a parent of another branch and any cycle, checking inactive locations too.
- **Changing a location's branch** is refused while it has active children or assets (current or home) here, with the reason under the field *(my call, builder check)*.
- **Existing data that already crosses branches** is not rewritten: the rule runs only when a save changes the parent or the branch. The tree shows such a node under its parent with the warning "อยู่คนละสาขากับที่ตั้งแม่" *(my call)*.

## 7. What others see

- The asset register's location chip (`locationId`) shows the location's full path *(my call)*.
- The return form: the two changes in §5.2, and the multi-asset return of §5.3 (a transactions-group change, built as this group's last plan).
- The handover form opens with the employee chosen from "ส่งมอบทรัพย์สินให้คนนี้" (a URL parameter; builder to check what it takes today).

## 8. Data

- No new table or column is expected.
- Duplicates: a normalized comparison in the API (§4.1); the database's unique keys stay.
- "เพิ่มล่าสุด" reads brands' and models' `createdAt` and the create entry of the system log (§4.3); no new column.

## 9. Left to the builder

- Component split; how the tree loads (all of one branch at once is fine: a branch has hundreds, not thousands, of locations — confirm on dev data).
- The exact similar-name matching beyond §4.1 (prefix, contains).
- Whether the brands page's summary strip changes.

