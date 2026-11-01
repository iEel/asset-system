# Page group 4 (asset register, asset form, register tools): design

**Status:** draft for the user's approval (2026-11-01)
**Base:** `master` at `ecca1cb5`. Page groups 1, 2 and 3 (with the group 3 follow-ups) are merged and pushed; nothing is deployed.
**Order of the remaining work:** this group → the other page groups of the canvas → the "ยืนยันผลตรวจ" feature (last, user 2026-10-29) → ของใช้สิ้นเปลือง (after everything) → E2E → UAT → the one Production deploy.
**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p, variant B, boards AR-Register, AR-Register-Phone, AF-New, AF-Edit, AF-New-Phone, AR-Labels, AR-ImportExport, AR-Scan-Phone and AR-Components. Where this document and a board differ, this document wins. The boards' own assumptions are in `.impeccable/critique/2026-10-20-canvas-assumptions.md` (sections "ทะเบียนและเครื่องมือ" and "ฟอร์มทรัพย์สิน").
**Recon:** four readers compared each board with today's code, and a fifth checked them (2026-11-01). Their notes, with file:line, are in the session scratchpad `g4/recon/` (register.md, form.md, purchase.md, tools.md, critic.md). The look step of the brainstorm (the register searched by a holder's name on dev, the create and edit pages at 1440) is in `g4/shots/`.

*My call* marks a choice the user did not make. Each one is listed again in §15 for the user to check. §16 records the two questions asked after the builder check, with the answers.

## 1. Intent

The register and the asset form are where IT staff spend most of their day. The user ranked the work by how often it happens: **searching the register first, then the edit page, then the create form** (2026-11-01).

- **The register.** The usual task is "find the machines a person holds, then open one". The search already finds the right rows; the cost is reading them. On the desktop the name is cut ("Monitor ASUS VY24…"), the tag column comes first, holder and room are cut, and an import panel sits under the table. On the phone the card does not show the holder at all.
- **The edit page.** It is used to **correct data that was recorded wrongly**, most often the room and the holder. Today it does not say which asset is being edited or what changed, the tag is a free field, and a holder change does not follow the department rule that group 3 set for the transactions. History shows a correction exactly like a real transfer.
- **The create form.** About 9,900 px tall at 1440 because every section is open. The hardest field is the purchase document: up to 300 checkboxes, and the user finds the right one by looking up a similar machine in the register first to see who it was bought from. Most documents are new ones the user uploads.
- **The register tools** (labels, import/export, scan, components) are rebuilt to their boards after the three pages above.

## 2. Decisions the user made (2026-11-01)

| # | Decision |
|---|---|
| 1 | **Order:** the register first, then the edit page and the create form, then the tools. The register is used mainly on the **desktop**. |
| 2 | **The register uses board B** ("แบบ B ดีกว่า ใช้แบบ B ได้เลย"), and the playback was confirmed ("ถูกต้องแล้ว"): name first with the tag under it; holder with department under it; room with branch under it; the search names its fields; an "สถานะอื่น" tab and a sum line; named saved views; a sticky selection bar whose primary is พิมพ์ป้าย; the import panel moves into "ส่งออก / นำเข้า"; repair rows link to the repair; the phone card shows "ผู้ถือครอง · ที่ตั้ง". |
| 3 | **The register's bulk update of the holder follows the department rule** of group 3 (confirmed with the playback). |
| 4 | **The tools follow their boards, in this group, after the register and the forms** (confirmed). Label printing keeps that place: there is no plan to print QR labels soon ("ยังไม่มีแผน ทำตามลำดับเดิมได้เลย"). |
| 5 | **The edit page is for correcting wrongly recorded data** ("แก้ข้อมูลที่บันทึกผิดไว้"). Room and holder stay editable there. |
| 6 | **A holder correction moves the department by the group 3 rule** (บุคคล and Stock take the holder's department; ส่วนกลาง keeps its own), and **history shows it as a data correction**, separate from a real transfer ("ถูกต้อง"). |
| 7 | **The purchase-document field is a search** over document number, PO, invoice, supplier name **and the name, model and tag of the assets already linked to the document**; each result shows the supplier, the date and the linked assets (e.g. "ผูกกับ 8 เครื่อง: Notebook Lenovo ThinkPad E14…") ("ใช่ ตรงกับที่ต้องการ"). |
| 8 | **Most purchase documents are new and uploaded by the user**, so the upload is not hidden: on the create form the section is open from the start, with the search on the left and the upload of a new document on the right, no button first; on the edit page the same section is folded with a summary of the linked documents ("ใช้ได้"). |
| 9 | **The create form follows AF-New and AF-New-Phone**; "เพิ่มเป็นชุด" stays as a mode behind the switch in the header and uses the new purchase-document field (confirmed with the playback). |
| 10 | **A holder on an asset with an open handover (HO-) cannot be corrected on the edit page** (Q1, "ไม่ให้แก้ในหน้าแก้ไข"): the page says the HO- is open and that a wrong holder is fixed by cancelling the handover and handing over again, or by โอนย้าย, so the document always matches the record. |
| 11 | **The register's bulk update of room or holder is a data correction** (Q2, "แก้ข้อมูลที่บันทึกผิด"): it writes the correction types of §7.3 with a required reason, like the edit page. |

## 3. Goals

1. A person can find every asset a named employee holds, and tell them apart, without opening a row or hovering (desktop 1280 to 1440, and the phone card).
2. The edit page says which asset is edited, shows every changed field with its old value before saving, and records a correction as a correction in the asset's history, with the department rule applied.
3. The create form shows the 9 required fields in one card, says what is missing, and links or uploads a purchase document without a 300-item list.
4. The register's bulk update and the edit page stop writing a department that contradicts the holder (decisions 3 and 6).
5. Labels, import/export, scan and components match their boards, within the limits in §11 to §14.
6. Nothing the pages do today is lost (Appendix A, binding).

## 4. Non-goals and anti-goals

- **Non-goals:**
  - No one-time correction of existing assets whose department differs from their holder's (a Production write; recorded for later, §16).
  - No QR label rollout, and no change to the QR target `/q/a/<assetId>`.
  - No undo of an import batch. The page says whether a batch can be undone only if it can (§13).
  - No per-user data scope on the register or the export (none exists; the board's "ตามสิทธิ์การเข้าถึงของคุณ" is not used).
  - No change to what the transactions (group 3) do.
- **No schema change and no migration** *(my call)*: saved views live in the browser (§6.4); the new movement types are strings in the existing column (`AssetMovement.movementType`).
- **Anti-goals:**
  - A correction that changes the holder but leaves history reading "เปลี่ยนผู้ถือครอง" as if the asset had moved.
  - A summary of changes that misses a field the save writes.
  - A "พิมพ์ป้าย N รายการ" or "เพิ่มทั้งหมด N รายการ" whose N is not what will be printed or added.
  - Losing a chosen file or typed document number because a later step failed.

## 5. Rules that bind every page in this group

- **Parts and look:** the app's shared parts and tokens only (DESIGN.md): `PageHeader`, `ContentPanel`, `FormSection`, `StickyFormFooter`, `DesktopSelectionBar`, `TabNav`, `FilterChipList`, `Pagination`, `RowActions`, `SearchField`, `SearchableSelect`, `Segmented`, `FileDropzone`, `StatusBadge`, `StatStrip` (`filterNote`), `Notice`, `KeyValueList`, `AssetRelationshipMap`. No hex or rgba in tsx, no `dark:`, no `/NN` tints; both themes from the tokens; print and label previews stay light.
- **Labels in pickers stay "code - name"** (group 3 §5), so a room or a person can be found by code *(my call: the boards' name-first options with the code in small type are not used in pickers)*. Lists and rows (the register, the purchase-document results, the scan card) show the name first, as the boards do.
- **Words:** `docs/19_THAI_GLOSSARY.md`; messages only through `node scripts/messages-edit.mjs`; the glossary gains rows for the new words in §16.1 before they are used.
- **Permissions:** as today unless a section says otherwise; every new route is added to the RBAC route matrix and to the viewer refusal list (`e2e/cross-cutting/support/refusals.ts`) when it refuses a viewer.
- **Stable hooks:** the ids and names E2E uses stay unless §17 lists the change (recon form.md §4, register.md §4, tools.md §4).
- **Guards:** each list-frame, visual-foundation and form-migration guard that pins a changed file is updated with exact counts in the same task; the register's "phase 3" exemptions (`tests/visual-foundation-guards.test.ts:266, 463`, `tests/form-migration-guards.test.ts:126, 169, 516`, DESIGN.md §1 and §4) are closed by §6.5.

## 6. The register (AR-Register, AR-Register-Phone)

### 6.1 Rows (desktop)

- One "ทรัพย์สิน" column replaces the tag and name columns: the model photo or category icon, the **full name** (wraps to two lines, never cut), and the tag in small mono under it. The tag is no longer a sticky first column.
- **ที่ตั้งปัจจุบัน:** the room name, with the branch name under it.
- **ผู้ถือครอง:** the name, with the department under it. With no holder: "ส่วนกลาง · ไม่มีผู้ถือครอง" for ส่วนกลาง, "ไม่มีผู้ถือครอง" otherwise. A borrowed asset adds "คืน <date>" from the open checkout's expected return date.
- **สถานะ** stays a `StatusBadge`; **สภาพ** is plain text, and a `StatusBadge` only when the condition needs attention (the rule the phone list uses today).
- **The next step:** as today (`getAssetActions`): ส่งมอบ on Ready, รับคืน on In Use with a holder, "ดูงานซ่อม" on a repair status (it exists today; the board's second word "ดูใบแจ้งซ่อม" is not added *(my call)*), then the ⋯ menu.
- The page loads the department, the branch name and the expected return date with the rows; nothing else is read per row.

### 6.2 Search, tabs and the sum line

- The search placeholder names its fields: "ค้นหา รหัส · ชื่อ · Serial · ผู้ถือครอง · ที่ตั้ง". The 19 fields and the multi-word rule stay.
- **Tabs:** ทั้งหมด, พร้อมใช้งาน, ใช้งานอยู่, ถูกยืม, รอซ่อม, อยู่ระหว่างซ่อม, and a new **สถานะอื่น** (every status not in those five). A new list parameter `statusGroup=other` drives it; it goes through parse, where, query string, view memory, the chips and the export.
  - A link that opens a single other status (e.g. from the dashboard) shows สถานะอื่น as the current tab (`otherStatusActive`, which exists).
  - "ทั้งหมด" keeps today's scope (active records, every status) *(my call)*.
- **Sum line** under the tabs, from the counts the page already reads: "126 + 611 + 27 + 6 + 9 + 63 = 842 · สถานะอื่น 63 = <the three largest other statuses> + อื่น ๆ <rest>", in the `StatStrip` `filterNote` style (DESIGN.md:486).

### 6.3 Header, toolbar and the table bar

- Header: "ส่งออก / นำเข้า" (menu: ส่งออกตามตัวกรอง (<count> รายการ), ดาวน์โหลดแม่แบบ, นำเข้าจาก Excel → the import-export page) and the primary "เพิ่มทรัพย์สิน". Template and import show only with `asset:create`; export with `asset:view`, as today.
- **The import panel under the table is removed** from the register; it stays on the import-export page.
- Toolbar as today (company, branch, category, ตัวกรองเพิ่มเติม, chips, ล้างตัวกรองทั้งหมด).
- Table bar: the range ("1–10 จาก 842 รายการ"), sort, and the column-set picker labelled "ชุดคอลัมน์: <preset>". The column keys change with §6.1; a stored column set from before is read and mapped (tag or name → ทรัพย์สิน), not dropped.
- Footer: "จำนวนต่อหน้า" (the `Pagination` page sizes, which exist) and the pages.

### 6.4 Saved views

- A row under the toolbar: "มุมมองที่บันทึกไว้: <view> · <view> · … · + บันทึกมุมมองนี้". A view is a name plus the list query (every parameter `parseAssetListParams` accepts, link-only ones such as `locationId` included, because the user saves them on purpose).
- **Stored in the browser** (localStorage, per user and locale) *(my call: no migration and no new route; the cost is that a view stays on that computer, which fits decision 1, desktop use)*. At most 12 views; rename and delete from the view's menu.
- The "last view" memory stays as today. An empty URL restores the last view; opening a saved view is an explicit click.
- No shared or team views in this group (§16).

### 6.5 Selection and the bar

- Selection stays on the current page *(my call: the labels page has its own "add all matching", §11)*. The bar says so: "<N> รายการที่เลือกในหน้านี้".
- On the desktop the bar is sticky at the bottom (`DesktopSelectionBar`): the count, "ล้างรายการที่เลือก", a menu "อื่น ๆ" (อัปเดตที่ตั้ง/ผู้ถือครอง with `asset:edit`, ส่งออกรายการที่เลือก), and the primary "พิมพ์ป้าย <N> รายการ" (opens the labels page with the ids, as today). On the phone, the bar floats above the bottom menu, as today.

### 6.6 The bulk update (decision 3)

`POST /api/assets/bulk-update` keeps its job (a new room and/or a new holder for the selected assets) and gains the transfer's rules:
- For each asset, the department after the save is `getTransferNextDepartmentId` (บุคคล and Stock take the new holder's department; ส่วนกลาง, ส่วนควบ and License keep theirs), and a change writes a department correction (below).
- The chosen employee is read inside the transaction, active, with `departmentId`; an unknown or inactive one is refused under `toCustodianId`.
- An asset that cannot take the change (the transfer verdict: open handover, outstanding component, License rules, a status that cannot move) refuses the whole save with one 409 that names each refused asset, as bulk-move does *(my call)*.
- **History (decision 11):** the save writes the edit page's correction types (`register_location_correction`, `register_custodian_correction`, `register_department_correction`, §7.3) in place of `bulk_location_update` / `bulk_custodian_update`, and never `department_change`; old rows of the old types stay readable. The dialog gains a required "เหตุผลที่แก้", written on each movement.
- At most 100 assets per request; the movements carry one batch reference id instead of the literal `"bulk_update"`; transaction options and deadlock retry as bulk-move.
- The dialog shows ตอนนี้ → หลังบันทึก for the department when it will change ("แผนกตามผู้ถือครอง: <แผนก>").
- Status: a new holder sets ใช้งานอยู่ only on บุคคล and Stock *(my call: today it forces In Use on every type)*.

### 6.7 Phone (AR-Register-Phone)

- Card: the name (the link) first, then the tag, the status badge and the condition badge when it needs attention, then "<holder or ส่วนกลาง> · <room>".
- The status tabs stay `TabNav` links (as today) with the board's chip look *(my call: the board's `aria-pressed` buttons would break links from the dashboard and the back button)*; สถานะอื่น included.
- The line "<tab> <N> รายการ · <filter>" above the list and "แสดงครบ N จาก N รายการ" at the end.
- Saved views open from a "มุมมองที่บันทึกไว้" button beside the filter chip; saving a view is desktop only *(my call)*.

## 7. The edit page (AF-Edit), decisions 5 and 6

### 7.1 What the page shows

- Title "แก้ไข <name>"; under it the tag, the status badge, "ผู้ถือครอง <name> · <แผนก>" and "<room> · <branch>", and a link "ดูหน้าทรัพย์สิน".
- The required fields in the first card ("ข้อมูลหลัก"), the optional sections folded with a one-line summary each; a section that holds a changed field or an error opens.
- **A changed field** gets a highlighted frame, the badge "แก้แล้ว", "เดิม: <old value>" and "คืนค่าเดิม".
- **The footer:** "แก้ไข <N> ช่อง" opens a list of every changed field, เดิม → ใหม่, each with "ไปที่ช่อง"; ยกเลิก; the primary "บันทึกการแก้ไข".
- Under the room and holder: "ใช้แก้ข้อมูลที่บันทึกผิด ถ้าย้ายเครื่องหรือเปลี่ยนคนใช้จริง ใช้ โอนย้ายทรัพย์สิน เพื่อให้มีใบโอนย้ายและประวัติครบ" (a link to the transfer page with this asset) *(my call: the board's sentence told people not to edit here, which contradicts decision 5)*.
- The `isActive` checkbox is removed from the edit page *(my call: unticking it deactivated an asset without the delete route's checks; deactivation stays on the delete action)*.

### 7.2 The asset tag

- The tag is read-only with a "เปลี่ยนรหัส" button. The dialog warns what really changes: the printed label shows the old tag and people searching by the old tag will not find it; the QR still opens the asset (it encodes the id). The board's "ป้ายเดิมจะใช้ไม่ได้" is not used.
- A tag change writes an `asset_tag_change` movement (old → new), and the labels page lists the asset under "ต้องพิมพ์ใหม่" because its last print carries the old tag (§11).

### 7.3 Holder, room and department: a correction

- **The department rule (decision 6):**
  - บุคคล and Stock: the department follows the holder. The department field shows "ตามผู้ถือครอง: <แผนก>" and cannot be picked; with no holder it is free.
  - ส่วนกลาง, ส่วนควบ and License: the department field stays free.
  - The server applies the same rule (the employee read inside the transaction, active), whatever the client sends; a new helper beside `getTransferNextDepartmentId` in `asset-department-rule.ts`.
  - A save that does not change the holder of a held บุคคล or Stock asset still writes the holder's department when it differs (as transfer does, group 3 §6) and shows it in the change list, marked "ปรับตามผู้ถือครอง". This automatic fix needs no reason. While a handover (HO-) is open (decision 10), the fix is skipped and the page says "แผนกไม่ตรงกับผู้ถือครอง จะปรับเมื่อรับคืนหรือโอนย้าย", so an unrelated edit (a Serial, say) is never refused because of it *(my call)*.
- **The holder picker** shows for every ownership type that can have a holder (the types checkout allows), not only บุคคล and License, and lists every active employee (the department filter is removed: with decision 6 it would be circular). Changing the ownership type no longer clears the holder (today it also cleared it on License, a bug).
- **Open handover (decision 10):** the refusal of today stays (`ASSET_CUSTODY_LOCKED_BY_CHECKOUT`). The page shows it before the user types: on an asset with an open HO-, the holder and room fields are read-only with "ใบส่งมอบ <HO-…> ยังเปิดอยู่ ถ้าผู้ถือครองหรือที่ตั้งผิด ให้ยกเลิกใบส่งมอบแล้วส่งมอบใหม่ หรือใช้โอนย้าย" and links to the document and to โอนย้าย.
- **A reason:** when the room, the holder or the department changes, a required "เหตุผลที่แก้" field appears in the change list *(my call: a custody change without a document must say why; status corrections already require one)*.
- **History (decision 6):** these saves write new movement types, so history reads them as corrections and counts them under the existing "แก้ไขข้อมูล" chip:
  - `register_location_correction` "แก้ไขข้อมูลที่ตั้ง",
  - `register_custodian_correction` "แก้ไขข้อมูลผู้ถือครอง",
  - `register_department_correction` "แก้ไขข้อมูลแผนก",
  each with the reason. The edit no longer writes `location_change`, `custodian_change` or `department_change`, which stay for the transactions. Installed components follow through the existing sync, with the same types.
- The words use "แก้ไขข้อมูล" (the chip and the glossary's "ประวัติการแก้ไข"), not the user's spoken "แก้ข้อมูล" *(my call)*.

### 7.4 "ค่าเดิมจะเก็บไว้ในประวัติการแก้ไข"

- The board promises that old values stay in history. Today only the admin log keeps them, and serial, name, tag and warranty changes write no movement.
- Each save writes one `register_field_correction` movement per changed field from a fixed list (name, tag via §7.2, Serial, category, brand, model, company, branch, ownership type, purchase date, price, warranty start and end, PO number, invoice number), fromValue → toValue (500 characters each) *(my call)*. Status and condition changes keep their own types.

### 7.5 Phone

No board. The edit page on the phone is the same page in one column, with the footer's change list as a bottom sheet *(my call)*.

## 8. The create form (AF-New, AF-New-Phone), decision 9

- The header: title, the line "กรอกช่องที่มี * ในการ์ดแรกให้ครบก็บันทึกได้ ส่วนข้อมูลเพิ่มเติมเปิดกรอกเฉพาะเรื่องที่มีข้อมูล", and the `Segmented` "เพิ่มทีละรายการ / เพิ่มเป็นชุด" (exists).
- **Card "ข้อมูลที่ต้องกรอก"** with "กรอกแล้ว <n> จาก <m> ช่องที่ต้องกรอก" and a bar. m follows the client rule per ownership type (8 for บุคคล and License, 9 for the others, because the department is required for them).
  - ข้อมูลพื้นฐาน: รหัสทรัพย์สิน (blank = generated), ชื่อ, หมวดหมู่, ยี่ห้อ, รุ่น, Serial with "สแกน Serial".
  - ความเป็นเจ้าของ: ประเภทการถือครอง as a 5-button `Segmented` on the desktop, a select on the phone; company, branch, department (with §7.3's rule when a holder is given); the holder when the type allows.
  - ที่ตั้งและสถานะ: ที่ตั้งประจำ, ที่ตั้งปัจจุบัน with "ใช้ที่ตั้งประจำ" (copies ที่ตั้งประจำ) *(my call: the board's "ใช้คลัง IT ตามที่ตั้งประจำ" implies an IT-store flag that does not exist)*, สถานะ, สภาพ.
- **"ข้อมูลเพิ่มเติม"**, folded, each with a summary line and an "กรอกแล้ว n จาก m ช่อง" badge: ติดตั้งเป็นส่วนควบทันทีหลังบันทึก; การจัดซื้อและประกัน; **เอกสารจัดซื้อ (open, §9)**; รูปแรกเข้าทรัพย์สิน (the category's photo list; choosing a file adds it at once, no "add" button); รายละเอียดเฉพาะทรัพย์สิน; ข้อมูลอื่น ๆ และขั้นสูง (remark, JSON). License fields keep their section.
- **Footer:** "ยังขาด <n> ช่องที่ต้องกรอก · <field names>" with "ไปช่องแรกที่ยังขาด" (`focusFirstError`, opening the folded section when needed), ยกเลิก, บันทึก.
- **Create and the department rule:** when a holder is given, `POST /api/assets` writes the department by §7.3's rule, and the asset, its first movement and its audit entry are written in one transaction *(my call)*.
- **Phone (AF-New-Phone):** the same sections in one column, the counter at the top, the footer above the keyboard.
- **Batch mode** keeps its fields and gains §9's purchase-document field (one search and one upload for the whole batch, linked inside the batch transaction).
- Kept from today (Appendix A): the clone banner and `cloneFrom`, the cross-branch location toggle, install as a component, the duplicate Serial and tag checks, custom fields, model selection.

## 9. Purchase documents in the form (decisions 7 and 8)

### 9.1 Layout

- **Create:** the section "เอกสารจัดซื้อ" is its own section (out of การจัดซื้อและประกัน), open from the start, with the badge "เลือกแล้ว <n> ใบ".
  - **Left, "เลือกเอกสารที่มีอยู่":** the chosen documents as chips ("ใบ PO · PO-2569-0412 · <ผู้ขาย> · ผูกแล้ว 12 ทรัพย์สิน" with ×), then the search field and its results.
  - **Right, "อัปโหลดเอกสารใหม่":** `FileDropzone`, ประเภทเอกสาร, เลขที่เอกสาร, วันที่, ยอดเงิน; "+ เพิ่มอีกใบ" starts a second draft. No button opens it.
  - Below 1024 px the two parts stack, the upload second.
- **Edit:** the same section, folded, with the summary "ใบ PO PO-2569-0031 · ใบกำกับ INV-6901-0107" and "ผูกไว้ <n> ใบ"; open, it is the same two parts, and a chip's × unlinks.

### 9.2 The search

- A new `GET /api/purchase-documents/search` (`asset:create` or `asset:edit`) with an injectable db for tests, as `asset-operation-search.ts` does.
- `q` of 2 to 100 characters, split into at most 5 words (the group 3 multi-word rule); each word must match one of: document number, PO number, invoice number, supplier code or name, or the tag, name or model name of an active asset linked to the document. Active documents only.
- Order: exact document/PO/invoice number, then prefix, then the rest by document date (newest first). At most 20 results, with the match count and the total of active documents.
- Each result: type and number, supplier, document date, amount, "ผูกกับ <n> เครื่อง: <first 3 asset names>" (active assets), and whether it is already chosen.
- An empty query lists the 10 newest documents, and, when the form has a supplier, that supplier's newest first *(my call)*.
- The footer line "พบ <n> ใบ จากเอกสารกลาง <total> ใบ · ค้นหาได้ด้วยเลขที่เอกสาร เลข PO เลขใบกำกับ ผู้ขาย หรือชื่อรุ่นของเครื่องที่ผูกไว้".
- The form options stop loading 300 documents; an edit or a clone loads its chosen documents by id.
- No new index *(my call: a few hundred documents; a scan is fine, and an index would be a Production migration)*.

### 9.3 Saving

- **Before the asset is saved**, the form checks each new document's type and number against active documents (a pre-check, as the asset duplicate check), so a duplicate is refused under the field while the file and fields are still on the page.
- After the asset is saved, each new document is created **and linked in one request**: `POST /api/assets/[id]/purchase-documents` accepts multipart (file plus fields) and runs the file save, the document, its attachment and the link in one transaction with `createUploadCleanup()` (commit right after the transaction, discard in `finally`), and joins `tests/upload-cleanup-routes.test.ts`. A document is never left unlinked.
- Unlinking: `DELETE /api/assets/[id]/purchase-documents/[documentId]` (`asset:edit`), with an audit entry. The document stays even with no linked asset *(my call)*.
- If a document step fails after the asset is saved, the page goes to the asset's edit page with the section open and the error, not to the detail page *(my call)*.
- The document's supplier is the one chosen in the upload part (default: the asset's supplier).

## 10. Words on these pages

- New keys for every new line above, in Thai and English, through `messages-edit.mjs`.
- `assetTools.scanPlaceholder` is split: the scan page and the labels page get their own keys.
- "นำเข้าทรัพย์สินแบบ Wizard" → "นำเข้าทรัพย์สินจาก Excel"; "rollback" words → "ย้อนการนำเข้า" (§13).

## 11. Labels (AR-Labels)

- **Queue filters as `FilterChipList`** (a chip per filter with its menu) in place of the 8 selects.
- **"เพิ่มทั้งหมด <n> รายการ"** under the filters, with "ตรงตัวกรอง <a> · อยู่ในรายการพิมพ์แล้ว <b> · จะเพิ่มใหม่ <c>". The label-prints GET returns the total and the matching ids up to the cap of 100 (the print route and the print record take at most 100); above 100 the button reads "เพิ่ม 100 รายการแรก" and says how many are left.
- The queue scrolls with the page ("แสดง <n> จาก <total>", "แสดงอีก 10 รายการ"); rows name first, then tag, holder and room; "อยู่ในรายการพิมพ์" badge.
- A filter "ต้องพิมพ์ใหม่" lists assets whose last print carries a tag different from today's (§7.2).
- The selected list says "<n> รายการนี้มาจากที่เลือกในทะเบียนทรัพย์สิน" when the page opened with ids.
- Tape size, note, the label-by-label preview and "QR ที่จะพิมพ์" move onto this page (it loads the label templates and the QR base URL as the print route does). The QR stays `/q/a/<assetId>`; the board's `/a/<tag>` is not used.
- Sticky bar: "<n> ดวงที่จะพิมพ์ · เทป <size>", "พิมพ์ทดสอบ 1 ดวง", "พิมพ์ป้าย <n> ดวง". Printing still opens the print route (tape and note in the URL) and records exactly one print, as today.
- **Permission:** recording a print stays `asset:view`, as today *(my call: no change in this group; flagged in §15)*.

## 12. Components (AR-Components)

- Header: the parent's name, tag, holder · room, and the primary "ติดตั้งส่วนควบ", which opens the install form (today it is always open).
- The relationship map at the top (`AssetRelationshipMap`, which the page loads with the parent links).
- Current and past links in one table: role, the component, installed (date, by whom), removed (date, by whom, reason, document number, photo count). User names come from the user table; the repair document number from the link's reference.
- Role labels in Thai for the known values; any other stored value shows as stored; the stored values do not change.
- Remove from each row's ⋯ menu; the remove dialog shows "ตอนนี้ / หลังยืนยัน" and "<n> → <n−1>".
- The install candidate line: "ยังไม่ได้ติดตั้ง" or "เคยติดตั้งกับเครื่องนี้ · ถอดออก <date>" (the candidates API adds the last removal).
- The outstanding line "ค้างคืน · อยู่กับ … · RT-…" stays (E2E checks it).
- Installing does not change the component's holder, room or department *(my call: as today; recorded in §16)*.

## 13. Import / export (AR-ImportExport)

- The import steps are open on arrival for `asset:create`: แม่แบบ → อัปโหลด (`FileDropzone`) → ตรวจสอบ (row filter มีข้อผิดพลาด / พร้อมนำเข้า / ทั้งหมด, "อัปโหลดไฟล์ที่แก้แล้ว") → ยืนยัน. A viewer sees the export part only.
- **Errors in Thai:** the preview returns structured errors (field key, the value in the file, and for a duplicate Serial the tag that already has it), and the page writes "<ชื่อช่อง>: <ปัญหา> · ค่าในไฟล์: <value> · ใช้อยู่กับ <tag>" through messages. Confirm and history read the same structure.
- **Export:** "ส่งออกทั้งหมด (Excel)" with the count it will write ("<n> รายการ · ไม่ใช้ตัวกรอง", the same scope as the register's ทั้งหมด) and the link "ส่งออกตามตัวกรองในทะเบียน →". No "ตามสิทธิ์" line.
- History rows are titled by the file name. A batch shows "ย้อนการนำเข้าได้" only if an undo exists; this group adds none, so the line is not shown *(my call)*.

## 14. Scan (AR-Scan-Phone)

- A scanned QR or an exact tag still opens the asset at once (as today).
- Typed text shows result cards: "พบ <n> รายการ · ตรงกับ <field>", the matched text highlighted, then name, tag and Serial, status and condition, "ผู้ถือครอง <name> · <แผนก>", "<room> · <branch>", the components ("<n> รายการ · …"), "เปิดรายละเอียดทรัพย์สิน", and the next actions from `getAssetActions` (each with its own permission).
- A separate `GET /api/assets/scan-search` *(my call: the global search stays light)*, at most 8 results, saying which field matched.
- "เปิดล่าสุด" (the last 10 opened, in the browser) with "ล้างรายการ".
- The hint line "ป้าย QR ยังติดไม่ครบ พิมพ์รหัสบางส่วน, Serial ใต้เครื่อง หรือชื่อแทนได้".
- The action word for a repair follows the glossary (บันทึกซ่อม, not the board's แจ้งซ่อม) unless §16.1 says otherwise.

## 15. Calls I made (for the user to check)

1. Pickers keep "code - name"; rows and results show the name first (§5).
2. No second repair word: "ดูงานซ่อม" on both repair statuses (§6.1).
3. ทั้งหมด keeps every status of active records (§6.2).
4. Saved views are kept in the browser, per computer; up to 12; saving is desktop only (§6.4, §6.7).
5. Selection stays on the current page, and the bar says so (§6.5).
6. The bulk update refuses the whole save with every refused asset named, at most 100 assets, and sets ใช้งานอยู่ only for บุคคล and Stock (§6.6).
7. The phone status tabs stay links (§6.7).
8. The edit page's hint points real moves to โอนย้าย; the `isActive` checkbox leaves the edit page (§7.1).
9. A tag change writes history and puts the asset in "ต้องพิมพ์ใหม่" (§7.2, §11).
10. The holder picker for every type that can have a holder, all active employees (§7.3).
11. A required reason when the room, the holder or the department is corrected (§7.3).
12. Correction words use "แก้ไขข้อมูล…" (§7.3).
13. A history line per changed field from a fixed list (§7.4).
14. The phone edit page is one column with the change list as a sheet (§7.5).
15. "ใช้ที่ตั้งประจำ" instead of "ใช้คลัง IT ตามที่ตั้งประจำ" (§8).
16. Create writes the department by the rule when a holder is given, in one transaction (§8).
17. The purchase-document search: who may search, ranking, 20 results, the empty-query list, no new index (§9.2).
18. A duplicate document is caught before the asset is saved; create-and-link in one request; unlink keeps the document; a failed document step lands on the edit page (§9.3).
19. Label printing keeps `asset:view` (§11).
20. Installing a component does not move its holder, room or department (§12).
21. No undo line on import history (§13).
22. A separate scan endpoint (§14).
23. No schema change: views in the browser, new movement types as strings (§4).
24. An edit of a held บุคคล or Stock asset whose department differs from its holder's fixes the department without asking for a reason, and skips the fix while a handover is open, so unrelated edits are never refused (§7.3).

## 16. Questions for the user

Both questions from the builder check are answered (2026-11-01).
- **Q1. A holder correction on an asset with an open handover (HO-). Answered:** "ไม่ให้แก้ในหน้าแก้ไข" (decision 10, §7.3).
- **Q2. What the register's bulk update is for. Answered:** "แก้ข้อมูลที่บันทึกผิด" (decision 11, §6.6).

### 16.1 Glossary rows to add

แก้ไขข้อมูล (correction, vs เปลี่ยน… for a real move), มุมมองที่บันทึกไว้, นำเข้า / ส่งออก, เครื่อง vs ทรัพย์สิน in counts ("ผูกกับ 8 เครื่อง"), บันทึกซ่อม vs แจ้งซ่อม.

### 16.2 Recorded for later (wiki)

- Shared or team saved views (would need a table and a migration).
- Existing assets whose department differs from their holder's: the Production SELECT before the deploy (group 3 §15) now also covers the register paths.
- Installing a component does not move it to its parent's holder and room.
- An undo for import batches.

## 17. E2E

- Each plan updates the specs of its page in the same task and runs them; the whole suite runs once at the end of the group (four projects: desktop and phone, light and dark).
- **Changes the specs must follow:** the register's merged ทรัพย์สิน column and the row next-step names (`e2e/asset-detail/*`, `e2e/dashboard/dashboard.spec.ts:216-232`); the phone card order (`detail-steps.ts:150-160`); the import panel gone from the register (`refusals.ts:110`); the form's folded sections and the Segmented ownership type (`register-asset.spec.ts`, `licence.spec.ts`, `field-errors.spec.ts`, `handover-condition.spec.ts`, and the option-reading helpers in `tx-support.ts`, `records.ts`, `audit-data.ts`, `repair-data.ts`, `disposal-support.ts`); the purchase-document fields; the "เปลี่ยนแผนก" labels (`tx-words.ts`, `transfer.spec.ts:274`) for transactions only.
- **New specs:** find a person's assets on the register and open one; a holder correction on the edit page (department follows, history reads แก้ไขข้อมูลผู้ถือครอง with the reason); a bulk update with a held บุคคล asset; a purchase document found by a linked asset's model, and a new document uploaded with a new asset; the "สถานะอื่น" tab; the labels "เพิ่มทั้งหมด"; an import preview with a Thai error; a typed scan result card; component install and remove from the ⋯ menu.
- New routes join the viewer refusal list when they refuse a viewer.
- axe on every new state in both themes.

## 18. Build order and what is left to the builder

**Plans, in order** (each merged after its own tests and E2E):
1. **The register:** rows and data (§6.1), search, tabs and sum line (§6.2), header and bars (§6.3, §6.5), saved views (§6.4), the bulk update rule (§6.6), the phone (§6.7).
2. **The edit page and the create form:** §7 and §8, the correction rule and history, the phone.
3. **Purchase documents:** §9 (search route, the two-part section, create-and-link, unlink, batch).
4. **Components and scan:** §12, §14.
5. **Import / export:** §13.
6. **Labels:** §11.

**Left to the builder:** the exact shape of the new routes and payloads; how the saved-view store is keyed; which shared part draws the folded sections; the phone breakpoints (as the shell); the order of tasks inside each plan.

## Appendix A. What the boards leave out, and stays (binding)

- **Register:** the 19 search fields and multi-word search; company, branch and category filters and the filter sheet; sort; the column presets; export with the filter; the row ⋯ menu with every action `getAssetActions` gives; the "last view" memory; `returnTo` on links to the detail page; the filter chips; the quick filters.
- **Edit and create:** the clone banner; the cross-branch location toggle and the cross-company holder toggle; the License section; install as a component; the duplicate checks; custom fields and their required template fields; the category photo list; model selection; the status options limited by the current status; the open-handover lock (decision 10).
- **Purchase documents:** the seven document types; the duplicate rule (type + number); the virus scan; the documents' own attachments on the detail page.
- **Labels:** the 100-id cap; test print; the print record; the print route.
- **Import / export:** the 10 MB `.xlsx` limit; the 5,000-row export cap; the template gated by `asset:create`; the last 10 batches.
- **Scan:** opening the asset at once on a QR or exact tag; `returnTo`.
- **Components:** the outstanding line; the remove reason and photo; the component sync with the parent's transactions.
