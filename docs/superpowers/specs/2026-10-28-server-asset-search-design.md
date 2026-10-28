# Server-side asset search on the transaction pages — design

Date: 2026-10-28 · Status: draft for the user's approval · Thai is the UI language; UI words below are the words to ship.

## 1. Intent and why

The four transaction pages — ส่งมอบ (`/asset-management/checkout`), รับคืน (`checkin`), โอนย้าย (`transfer`) and ย้ายที่ตั้งหลายรายการ (`bulk-move`) — call `getAssetOperationOptions()` (`src/lib/asset-operation-options.ts`). It loads every active asset, every open handover, every open repair, every employee, department and location, and builds lists the page then throws away. The pages filter the whole list in the browser.

With about 8,000 assets on the dev database (a copy of Production plus E2E rows, growing ~230 per E2E run):

- bulk-move renders **every asset as a checkbox row** (8,796 rows in run `E2E-1028C`). The page itself arrives in about 3 s, but the accessibility scan the E2E runs on every page takes 90–130 s over that DOM, so `e2e/transactions/bulk-move.spec.ts` times out in all four projects (`E2E-1028B`, `E2E-1028C`). The same DOM weighs on a phone.
- every page ships the whole asset list to the browser, and the E2E waits up to 30 s for these pages to arrive (`TRANSACTION_PAGE_ARRIVAL_MS`).

The register will keep growing. The user chose to fix this now, before the transactions page group of the canvas (boards TX-*).

**Success:** each transaction page opens without loading the asset register; a person finds an asset by typing part of its code and picks it from a short list on the server's answer; an asset the transaction cannot take is still listed, cannot be picked, and says why; bulk-move passes its E2E in all four projects.

## 2. How people work (the user, 2026-10-28)

- IT staff find an asset by **typing part of its code** and picking it from the list that appears, **one asset at a time**.
- On รับคืน they find it **by the asset's code or by the name of the person returning it**.
- On ย้ายที่ตั้งหลายรายการ they also **type codes one at a time** (no "pick the whole room" in this work).
- An asset that the transaction cannot take **appears in the list, cannot be picked, and shows the reason**.

The user approved the mockup `.superpowers/brainstorm/183-1793185385/content/search-picker.html` (ส่งมอบ typing "0228"; รับคืน typing a person's name, results grouped by person).

## 3. Goals

1. The four pages stop loading assets and handovers up front. Small master lists (employees ~770, departments, locations ~1,100, statuses, conditions) may stay as they are (*my call*: they are not the cause and the TX group will revisit them).
2. One server search answers the asset pickers of all four pages, with the page's own rules applied on the server.
3. One shared picker shows the answer the same way on every page (the approved mockup).
4. The behaviours people rely on keep working: the preselect from the asset page (`?assetId=`, `?checkoutId=`), the legacy return (ข้อมูลเก่า without a handover document), components travelling with the asset, the review dialog, field errors under the field, focus moving to the first error.
5. E2E: the transaction specs drive the new picker; bulk-move passes in all four projects; axe stays at 0.

## 4. Non-goals

- The TX-* canvas redesign (sections, "ตอนนี้ → หลังบันทึก" summary, sticky footer, the bulk-move room table with ticks, the phone desk-delivery steps). That is the transactions page group, later.
- Changing what a save route allows or refuses, except the few places where it is looser than the asset page (6.5; the user's choice ก).
- The global top-bar search, the maintenance and disposal pickers, the audit lookup.
- Database changes: no new index, no full-text index, no migration (*my call*: `LIKE '%…%'` over ~8,000 rows with a 20-row answer is fast enough; revisit if a search takes over 1 s on Production).
- Offline use (the transaction pages have none today).

## 5. Anti-goals (what would make this a failure even if it works)

- The picker lets someone pick an asset the save then refuses, or the picker and the asset page give the same asset different answers. **The search's rules are the asset page's rules (`getAssetActions`, `src/lib/asset-actions.ts`), built from the same functions, and every save route refuses at least what they refuse (6.5).**
- A raw code or English text on screen (a status name, a reason code, a checkout type).
- A page that still renders or ships one row per asset in the register.
- Losing the preselect from the asset page, or the legacy return path.
- A search that feels broken: no difference between "still searching", "nothing found" and "the search failed".

## 6. Behaviour

### 6.1 The shared picker (all four pages)

As in the approved mockup:

- A search field with the field's label (ทรัพย์สิน, or the page's own label) and the hint of what can be typed.
- The server is asked once the person has typed **2 characters** and paused briefly (about 250 ms, as the other async pickers in the app). An older answer never replaces a newer one.
- The list shows **at most 20 rows** and the line **"พบ N รายการ"** with the true total; when the total is over 20 the line says to type more (*my call* for the words, e.g. "พบ 134 รายการ แสดง 20 รายการแรก พิมพ์เพิ่มเพื่อให้แคบลง").
- **Order:** an exact code match first (asset tag, serial number or fixed-asset code equal to the text), then codes that start with the text, then everything else by asset tag (*my call*; the audit walk orders the same way).
- **Each row:** the asset tag with the typed part highlighted · the asset's name; a second line with the status word and where it is or who holds it (the mockup). The words come from the existing labels (status `nameTh`, location `code - name`, employee `code - fullNameTh`); no raw code.
- **A row the transaction cannot take** is shown faint, cannot be chosen by mouse, touch or keyboard, and carries its reason as a small label under the row. The reasons reuse the asset page's words for the same rule (`asset.transactionReason*` and the api-error catalog words), so one asset reads the same reason everywhere (*my call*; the mockup's sample wording was illustrative).
- **States:** typing fewer than 2 characters shows the hint; while waiting, a quiet "กำลังค้นหา…"; no match, "ไม่พบทรัพย์สินที่ตรงกับคำค้น"; a failed request, a distinct "ค้นหาไม่สำเร็จ ลองอีกครั้ง" with a retry, never shown as "not found".
- **Keyboard and screen readers:** a combobox (arrow keys move, Enter picks, Escape closes, focus returns to the field), the active row announced, disabled rows skipped, the count read in a polite live region. Rows are 44 px tall below `md`.
- **After a pick:** single-pick pages show the chosen asset in the field (tag · name) with a way to change it, as today. Multi-pick (bulk-move) adds it to a list "ที่เลือกแล้ว N รายการ" with a remove button per row, clears the search and keeps focus in the search field; an asset already in the list shows as already chosen in later answers.
- Field errors stay under the field, and the "save with nothing chosen" check moves focus to the search field.

*Builder's choice:* extend the existing `SearchableSelect`/`MaintenanceOptionSelect` pattern or build a new shared part, as long as the result is one shared, registered part (DESIGN.md section, docs/14 row, the shared-name guards) used by all four pages, in both themes, built only from the house tokens.

### 6.2 The search API

- One route for the transaction pickers (name is the builder's; for example `GET /api/asset-operations/search`), protected by `asset:edit` — the same permission as the four pages and their save routes — and classified in the RBAC route matrix.
- Input: the text (`q`, at least 2 characters after trimming), the page's mode, and the page's context where a rule depends on it (see 6.3). It also answers **by id** (for the preselect and to restore a chosen label), without the 2-character rule.
- Output per row: the ids and labels the row shows, `eligible: boolean` and, when not eligible, a reason key the client translates; plus the total count. The shape leaves room for later filters (location, category) and paging that the TX boards will need, without building them now (*my call*).
- Text matching: the asset tag, name, serial number and fixed-asset code, and the holder's code and name (*my call*, inside the register's shared list of fields in `assetSearchConditions`; using that list as a whole is acceptable if its answer time stays fine). รับคืน also matches the handover document number (*my call*).
- Bounded: never more than 20 rows plus one count per answer; id lists stay well under SQL Server's ~2,100 parameters.

### 6.3 What each page searches and which rows can be taken

**The user's choice (ก, 2026-10-28):** the search follows the asset page's rules — `getAssetActions` (`src/lib/asset-actions.ts`): first whether the asset's ownership type has that transaction at all (`ownershipActions`: บุคคล / ส่วนกลาง / Stock have ส่งมอบ, รับคืน and โอนย้าย; ส่วนควบ has only ย้ายส่วนควบ and จัดการส่วนควบ; ซอฟต์แวร์/License has only its licence actions), then each transaction's own checks in its route's order. Where a save route is looser than that, the route is tightened to match (6.5), so there is no way around the picker. The search uses the same functions (`asset-actions.ts`, `asset-lifecycle-policy.ts`, `asset-handover-mode.ts`, `repair-record-policy.ts`), so the two can never drift. Each listed reason is the existing word for that rule; a new word is marked.

A ส่วนควบ installed in a parent travels with the parent on ส่งมอบ and รับคืน (`syncInstalledComponentsWithParent`, unchanged): it takes the parent's location, holder and department, so it reads as "held" by the parent's holder. It is never offered on its own; to send it elsewhere, remove it from the parent first (จัดการส่วนควบ).

**ส่งมอบ (checkout)** — searches active assets.
- Takes: ownership บุคคล, ส่วนกลาง or Stock; status Ready; no open handover.
- Listed but not takeable:
  - ส่วนควบ — "ส่วนควบไปพร้อมเครื่องหลัก ส่งมอบแยกไม่ได้" (*new word, my call*);
  - ซอฟต์แวร์/License — "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ส่งมอบไม่ได้" (*new word, my call*);
  - status not Ready — "ส่งมอบได้เมื่อสถานะเป็น พร้อมใช้งาน เท่านั้น" (today these are hidden);
  - an open handover — "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงส่งมอบใหม่ได้".
- The destination "ทรัพย์สินอื่น" (hand over into another asset) keeps today's list: the assets ส่งมอบ could take, minus the one being handed over (the builder check, *my call*: no widening to Disposed/Retired or handed-over assets).

**รับคืน (checkin)** — searches what can come back: open handovers, and assets held by someone without a handover (ข้อมูลเก่า).
- Results are **grouped by the holder** (the approved mockup): the group line is the person (code - name) and "ถืออยู่ N ชิ้น"; a handover to a department, a location or another asset groups under that destination's label (*my call*).
- Each row: tag · name, and either the handover document (HO-… and its date) or "ข้อมูลเก่า (ไม่มีใบส่งมอบ)" with the asset's current location, as the old legacy panel showed it (the user, 2026-10-29). รับคืน also matches the current location's code and name, so every ข้อมูลเก่า asset in one room can be found, as before.
- Order on รับคืน: an exact code first, then the assets that have something to return (an open handover or a holder), then the rest by tag, so the "ไม่มีผู้ถือครอง" rows never push a returnable row out of the 20 (the user, 2026-10-29).
- Takes an open handover when its handover mode is set, the asset's status fits the mode (permanent needs In Use, temporary needs Checked Out) (the asset page's rule; ก). Not takeable: handover mode missing (today's `handoverModeMissing` word); status does not fit (the catalog word for `ASSET_HANDOVER_STATUS_MISMATCH`). **An open repair does not block the return** (the user, 2026-10-29, choice ก, superseding the 2026-10-28 rule): the asset is coming back to IT to be repaired, so the return goes into ส่งซ่อม (Under Maintenance), the next status is fixed to it, the form says so, and no second repair record is made. The asset page's รับคืน follows the same rule. This includes the common case: a permanent handover whose asset went into อยู่ระหว่างซ่อม (or รอซ่อม) when the repair was opened. Its status fits because the repair is open. After the return the holder is cleared and the repair continues; when the repair is finished the asset becomes พร้อมใช้งาน with IT, not In Use with the old holder (the user, 2026-10-29, second choice ก). A temporary loan cannot have a repair opened (the repair rule refuses it), so it is unchanged. A ข้อมูลเก่า row with an open repair stays not takeable, as the backfill route requires. An open handover of any ownership type stays returnable when these hold, so nothing already handed over is stranded (*my call*).
- Takes a ข้อมูลเก่า row when the legacy rule holds (ownership บุคคล, ส่วนกลาง or Stock; holder set; no open handover; no open repair; status Ready or In Use). Not takeable: ส่วนควบ — "ส่วนควบรับคืนพร้อมเครื่องหลัก" (*new word, my call*; without this rule every component of a held computer would show as a ข้อมูลเก่า row); ซอฟต์แวร์/License — "License ผูกสิทธิ์ที่หน้าทรัพย์สิน รับคืนไม่ได้" (*new word, my call*); an open repair (`transactionReasonActiveMaintenance`); a status that cannot be returned (`transactionReasonStatusNotReturnable`).
- An asset with nothing to return (no open handover and no holder, for example a CCTV of ส่วนกลาง that nobody borrowed, or a stock item in the store) is listed, not takeable, with `asset.transactionReasonNoReturnRecord` "ไม่มีผู้ถือครองหรือรายการส่งมอบที่รอรับคืน", in a last group "ไม่มีผู้ถือครอง" (the builder check; the user's rule that what cannot be taken is still shown with its reason).
- Picking a ข้อมูลเก่า row asks once — "สร้างใบส่งมอบย้อนหลังแล้วรับคืน" — and then does exactly what today's "สร้างรายการย้อนหลังและรับคืน" button does (`POST /api/assets/[id]/legacy-checkout`, then continue the return). The separate legacy list goes; a one-line count of ข้อมูลเก่า may stay (*my call*, following the canvas note).
- The return-by person is filled from the chosen row's holder (today only on the legacy path; *my call* to do it for both). A holder who is no longer an active employee (a leaver's imported asset) is still filled, shown as "{holder} (พ้นสภาพ)", so the RT- names the person who held it (the user, 2026-10-29).

**โอนย้าย (transfer)** — searches active assets. ส่วนควบ is takeable here (its ย้ายส่วนควบ is this page); ซอฟต์แวร์/License is not — "License ผูกสิทธิ์ที่หน้าทรัพย์สิน ย้ายไม่ได้" (*new word, my call*).
- With no new custodian chosen (move location/department): takes any status except Disposed/Retired, with no open handover. Not takeable: "ย้ายไม่ได้เมื่อสถานะเป็น ตัดจำหน่ายแล้ว หรือ ปลดระวาง"; "มีการส่งมอบค้างอยู่ รับคืนก่อนจึงโอนย้ายได้".
- With a new custodian chosen: takes Ready or In Use with no open handover. Not takeable: "โอนย้ายได้เมื่อสถานะเป็น พร้อมใช้งาน หรือ ใช้งานอยู่"; the open-handover reason.
- A บุคคล asset outside Ready/In Use (for example อยู่ระหว่างตรวจสอบ, รอซ่อม) can still be moved to another location or department with no custodian chosen, as today and as ส่วนกลาง and Stock; the asset page's โอนย้าย for a บุคคล asset is the custodian change and stays disabled for it (the user, 2026-10-28, choice ก: one function, two contexts).
- Choosing a custodian after an asset keeps today's rule: an asset that no longer fits is cleared, and the field says why under it (*my call*: today it is cleared silently).

**ย้ายที่ตั้งหลายรายการ (bulk-move)** — searches active assets, many picks; the ownership rule of โอนย้าย applies (*my call*: it is a move of several assets).
- Takes: not ซอฟต์แวร์/License, no open handover and a status other than Disposed/Retired. Not takeable: the License reason; the open-handover reason; the Disposed/Retired reason. (Today open-handover assets are hidden and Disposed/Retired ones can be ticked and then refused.)
- Picking adds to "ที่เลือกแล้ว N รายการ" (6.1); the save sends the chosen ids as today. The search and its list stay after a pick, so several assets can be picked from one search, as the old checkbox list allowed; the picked rows read "เลือกแล้ว" (the user, 2026-10-29).

### 6.5 Save routes made to match the asset page (ก)

Each route refuses, with a catalogued code and the same word as the picker, what the picker does not offer:

| Route | Today | Adds |
|---|---|---|
| `POST /api/assets/[id]/checkout` | Ready, no open handover | ส่วนควบ and ซอฟต์แวร์/License refused; a ทรัพย์สินอื่น destination (`parentAssetId`) the picker would not offer (itself, inactive, ส่วนควบ, License, not Ready, under an open handover) refused under the destination field (the user, 2026-10-28; Production has used only พนักงาน handovers so far) |
| `POST /api/assets/[id]/checkin` | handover mode, status fits mode | with an open repair, a next status other than ส่งซ่อม refused under the next-status field (`ASSET_CHECKIN_REPAIR_STATUS_REQUIRED`; 2026-10-29, superseding "an open repair refused") |
| `POST /api/assets/[id]/legacy-checkout` | holder, no handover, no repair, Ready/In Use | ส่วนควบ and ซอฟต์แวร์/License refused |
| `POST /api/assets/[id]/transfer` | status per operation, no open handover | ซอฟต์แวร์/License refused |
| `POST /api/assets/bulk-move` | no open handover, not Disposed/Retired | ซอฟต์แวร์/License refused (named per asset, as its Disposed/Retired refusal does) |

Before the routes change, the plan reads Production (SELECT only, counts) for the rows these rules would catch: open handovers of ส่วนควบ or License assets, and open handovers whose asset has an open repair. Open handovers stay returnable (6.3), so existing data is never stuck; the counts go to the user if any are non-zero.

### 6.4 Preselect and links in

- `?assetId=` on ส่งมอบ and โอนย้าย: the page asks the search by id; if the asset can be taken it starts chosen (today's banner stays); if it cannot, it starts chosen-but-blocked with its reason under the field rather than silently empty (*my call*).
- `?checkoutId=` on รับคืน: the handover starts chosen, as today.
- `?assetId=` on รับคืน (legacy link from the asset page): the search starts filled with the asset's tag so its row shows; nothing is created until the person picks it (today's behaviour).
- `returnTo` and the redirects after saving are unchanged.

## 7. Constraints

- Next.js 16.4 App Router (read `node_modules/next/dist/docs/` first), React 19, next-intl (Thai first; messages only through `node scripts/messages-edit.mjs`; words per `docs/19_THAI_GLOSSARY.md`), Prisma 7 on SQL Server, the house tokens and shared parts only (DESIGN.md: no hex/rgba, no `dark:`, both themes).
- Permissions unchanged: the pages and the search need `asset:edit`; the viewer gets neither.
- No schema change, no migration, nothing written by the search. The only rule changes are those of 6.5.
- Production is read only (counts in 6.5, SELECT only); nothing in this work writes to it.
- The V-form rules hold (errors under the field, focus to the first error, toasts only for what has no field).
- E2E runs on the dev database only and adds no more data than today's transaction specs.

## 8. Testing and done

- Unit tests by value: each page's eligibility answer for each rule above (takeable, each reason, each ownership type), the order (exact first), the 20-row cap and the count, the 2-character rule, the by-id answer, permission refusal; for each route in 6.5, the new refusal and that everything it allowed before (other than the new rule) still passes; a test that the picker's answer and `getAssetActions` agree for the same asset.
- The source pins that hold today's `getAssetOperationOptions` shape and the forms' markup are rewritten to the new shape (`tests/asset-operation-options.test.ts`, `tests/e2e-transactions.test.ts`, `tests/v-track2-o.test.ts`, `tests/operations-sweep-ui.test.ts`, `tests/legacy-checkin-flow.test.ts`, `tests/form-migration-guards.test.ts`, `tests/validation-guards.test.ts`, `tests/choice-controls-ui.test.ts` and any other the change breaks).
- E2E: the transaction specs use the picker through one helper; the checkout spec's "an In Use asset is not offered" step becomes "an In Use asset is listed, cannot be picked, and shows its reason"; bulk-move types each tag and picks it; `TRANSACTION_PAGE_ARRIVAL_MS` comes back down. Done when `e2e/transactions`, `e2e/smoke`, `e2e/cross-cutting/field-errors.spec.ts` and `e2e/asset-detail` pass in all four projects with axe 0, and then the whole suite once.
- The docs record it (changelog, handoff, docs/14 and DESIGN.md for the shared part, the AssetSystem wiki), and correct the earlier note that the bulk-move page "hangs 98 s": the page arrives in ~3 s; the time went to the accessibility scan of 8,796 rendered rows.

## 9. Left to the builder

The route name and file layout; whether the picker extends `SearchableSelect` or is a new part; the exact debounce; how the server orders exact/prefix matches (one query or two); how the page-level master lists are loaded once `getAssetOperationOptions` no longer loads assets (split it, or replace it); the plan's task order and its E2E checkpoints.
