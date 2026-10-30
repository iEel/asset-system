# Page group 3 (transactions): design

**Status:** draft for the user's approval (2026-10-30)
**Base:** `master` at `d8a02928`, which has the server-side asset search (spec `2026-10-28-server-asset-search-design.md`, rulings S-R1 to S-R48). Page groups 1 and 2 are merged and pushed. Nothing is deployed.
**Order of the remaining work:** this group → the other page groups of the canvas → the "ยืนยันผลตรวจ" feature (the user put it last, 2026-10-29) → E2E again → UAT → the one Production deploy (wiki `ams-open-questions` #27).
**Visual source:** the design canvas https://claude.ai/artifact/3zDYLaUELU1ra6MeE9dB5p, boards TX-Checkout, TX-Checkout-Phone-1/2/3, TX-Checkin, TX-Checkin-Phone, TX-Transfer, TX-Transfer-Phone and TX-Bulk. Where this document and a board differ, this document wins.
**Recon:** five readers compared each board with today's code (2026-10-30). Their notes, with file:line, are in the session scratchpad `tx-group/recon/` (checkout.md, checkin.md, transfer.md, bulk.md, cross.md). The function-gap checklist of 2026-10-29 is the wiki page `AssetSystem/analyses/ams-tx-canvas-function-gaps.md`; Appendix A carries it over and makes it binding.

*My call* marks a choice the user did not make. Each one is listed again in §14 for the user to check. §16 records the three questions asked after the builder check, with the answers.

## 1. Intent

The four transaction pages record who has an asset and where it is:
- **ส่งมอบ (checkout):** IT hands an asset to an employee, a department or a room, and prints the HO- document.
- **รับคืน (checkin):** the asset comes back to IT, and IT prints the RT- document. It may go to repair or toward disposal.
- **โอนย้าย (transfer):** one asset changes room, holder or department, with a TR- document.
- **ย้ายที่ตั้งหลายรายการ (bulk-move):** many assets go to one room.

The server-side asset search (merged 2026-10-29) already fixed how the pages find an asset and which assets they refuse. This group rebuilds the pages to the TX boards:
- three numbered sections;
- a right-hand "สรุปก่อนบันทึก" card that shows ตอนนี้ → หลังบันทึก before anything is saved;
- a sticky footer with ยกเลิก;
- a three-step desk delivery on the phone;
- a checklist of the components that came back;
- a filtered table for bulk-move.

It also makes the asset's department mean one thing (decision 1).

## 2. Decisions the user made (2026-10-29 and 2026-10-30)

| # | Decision |
|---|---|
| 1 | **An asset's department is the department of the person using it** ("แผนกของคนที่ใช้เครื่องอยู่"). Checkout to an employee sets the asset's department to that employee's department. |
| 2 | **A return puts the department back to IT** ("ให้กลับเป็นแผนก IT"). Master data has one IT department: code `IT`, "Information Technology", shared by all companies (dev SELECT 2026-10-30). |
| 3 | **The checkout type "ทรัพย์สินอื่น" is dropped** from the checkout page ("ตัดออกได้"). Old records stay readable. |
| 4 | **ส่งซ่อม on return keeps creating the repair record automatically** in the same save ("ใช้แบบเดิม สร้างใบซ่อมอัตโนมัติ"). The page says so plainly and links to the repair record after saving. The board's "รอซ่อม" reads ส่งซ่อม. |
| 5 | **Handover-mode words:** the options keep the system words มอบหมายใช้งานประจำ / ยืมใช้ชั่วคราว, with the board's short lines beneath, "ใช้ต่อเนื่อง ไม่มีกำหนดคืน" / "ต้องคืนตามวันที่กำหนด". |
| 6 | **The playback was confirmed** ("ถูกต้อง ไม่มีอะไรขาด"): a transfer to a new holder moves the department with that holder; a checkout to a room leaves the department; everything the old pages do and the boards omit stays; the transfer reason chips only fill the reason text, which stays required. |
| 7 | **A component not ticked as returned stays with the person returning, in its old room** ("ยังอยู่กับคนคืน ที่ตั้งเดิม"). The RT- document lists it as missing. |
| 8 | **The late return of such a component** works as proposed ("ใช้แบบนี้ได้"): staff search the component or the person on รับคืน; the row reads "ส่วนควบค้างคืน ของ <parent tag>"; returning it re-attaches it to the same parent in IT stock. While it is out, checkout of the parent leaves it behind and warns that a component is still outstanding. |
| 9 | **Bulk-move is for the desktop only** ("ไม่ต้องใช้บนมือถือ ใช้บนคอมอย่างเดียว", said of bulk-move). Checkout, checkin and transfer keep their phone boards. |
| 10 | **ส่วนกลาง assets keep their responsible department** ("ส่วนใหญ่ทรัพย์สินส่วนกลางจะเป็นแผนก IT ที่ดูแล"); decisions 1 and 2 apply to บุคคล and Stock/สำรอง (§6). |
| 11 | **A component that did not come back stays with the person returning** when that is not the holder ("อยู่กับผู้คืน") (§8.5). |
| 12 | **เก็บไว้ที่ has no default:** "พนักงาน IT จะเป็นคนเลือกเอง" (§8.3, §8.6). |

The server-search decisions still bind: S-R39 and S-R40 (2026-10-28), S-R43 to S-R48 (2026-10-29), including the open-repair return into ส่งซ่อม on the same repair record.

## 3. Goals

1. The four pages match their boards in both themes, inside the menu B shell, and checkout, checkin and transfer also match their phone boards.
2. Before saving, the summary card shows every field the save will change, with the value it will have, and the server writes exactly that.
3. The department follows decisions 1 and 2 on these four pages, for the asset and the components that travel with it, and cancelling a document restores it.
4. Components that did not come back are tracked to the person and room where they are, and can be returned later without a new handover.
5. Bulk-move works from a filtered, paged table without loading the register, and says what moves with each asset.
6. Nothing the pages do today is lost (Appendix A, binding; each plan copies its part as a checklist).

## 4. Non-goals and anti-goals

- **Non-goals:**
  - No phone layout for bulk-move (decision 9).
  - No change to how other screens change custody: the register's bulk update, the asset edit form and the audit's custodian correction keep writing department as they do today. *My call*: they belong to their own page groups; the mismatch is recorded in the wiki (§15).
  - No one-time correction of existing assets whose department differs from their holder's. That would be a Production write (§15).
  - No new document type for a late component return; it is a line on the original RT- (§8.6).
  - No change to what can be checked out, returned or moved beyond §6 and §8.5 (the server-search rules stay).
- **No schema change and no migration** in this group. The outstanding component uses the existing free-text link status (§8.5), and the RT-'s link to its repair record is stored without a new column (§8.7).
- **Anti-goals:**
  - A summary card that promises a value the save does not write, or misses one it does.
  - A component recorded in IT stock while it is still on someone's desk.
  - A footer or chip that looks finished but has no rule behind it.
  - Losing any refusal or field error the pages show today.

## 5. Rules that bind all four pages

- **Parts and look:**
  - Build only with the app's shared parts and tokens (DESIGN.md): `PageHeader`, `FormSection` (numbered), `StickyFormFooter`, `ContentPanel`, `SearchableSelect`, `AssetOperationPicker`, `ChoiceCard`, `Segmented`, `Steps`, `KeyValueList`, `FormContextBanner`, `Notice`, `DesktopSelectionBar`, `OperationReviewDialog`, `FileDropzone`, `SignaturePad`, `StatusBadge`, `DataTable`.
  - The frame follows `audit-round-form.tsx`: a two-column grid from `lg`, with the summary card sticky in the right column and the `StickyFormFooter` across both. One shared summary-card part is extracted for the three single-asset pages *(my call)*.
  - No hex or rgba in tsx, no `dark:`, no `/NN` tints. Each form that renders `StickyFormFooter` is added to `STICKY_FOOTER_ROUTES` (tests/form-migration-guards.test.ts).
- **Footer and review:**
  - The footer holds a one-line description ("ส่งมอบ <tag> ให้ <ผู้รับ>", "รับคืน <tag> จาก <ผู้คืน>", "โอนย้าย <tag>: <what changes>"), ยกเลิก, and the primary button **ตรวจสอบและบันทึก**. The board's "ตรวจทานและบันทึก" cannot be used: ตรวจทาน is a dropped word (docs/19_THAI_GLOSSARY.md, tests/thai-glossary.test.ts).
  - The primary button runs the field checks, then opens the existing review dialog (ตรวจสอบก่อนส่งมอบ / รับคืน / โอนย้าย, confirm ยืนยันส่งมอบ / รับคืน / โอนย้าย). *My call*: the dialog stays because it is the last guard before a document number is taken.
  - ยกเลิก goes to the normalized `returnTo`, or to `/{locale}/assets` when there is none. Nothing is saved.
  - After saving, checkout opens the HO- document, checkin the RT-, transfer the TR- (as today, with `returnTo`). The board's "พิมพ์ใบส่งมอบได้จากหน้าทรัพย์สิน" is wrong and is not used.
- **Summary card ("สรุปก่อนบันทึก"):** rows of ตอนนี้ → หลังบันทึก, built only from what the save will write (§6 to §9). A row whose value does not change is shown plain; a row that changes shows the new value in bold. Below the rows: what is still missing (the board's ✓ list), then any warning line.
- **Words:**
  - Words follow `docs/19_THAI_GLOSSARY.md`; messages change only through `node scripts/messages-edit.mjs`.
  - ส่งซ่อม for the return status that opens a repair (the status itself reads อยู่ระหว่างซ่อม); รอซ่อม is a different status and never appears on these pages.
  - Conditions are the master names (ดี, พอใช้, เสียหาย, ใช้งานไม่ได้ …). The board's "ชำรุด" is not a master name and is not used.
  - Rooms read "code - name" and employees "code - name" in every picker, so they can be found by code. The board's name-only labels are not used.
- **Permissions:** `asset:edit` opens every page, as today.
  - A ส่งซ่อม return that opens a new repair record still needs `maintenance:create`. A person without it does not see ส่งซ่อม among the next statuses *(my call)*, so they are not refused after the review.
  - A return that joins a repair record already open (S-R43, S-R48) creates no record, so it needs only `asset:edit` *(my call; today the route asks `maintenance:create` for it too, and the locked choice would end in a 403)*.
- **Field errors and refusals:** every error the pages show today keeps its field and its focus. New refusals (§6, §8, §10) are catalogued in `api-error-catalog.ts` and land under their field.
- **Stable hooks:** the ids, roles and texts E2E uses today stay unless §17 says otherwise (list in recon `cross.md` r10 to r15): the h1 names, `#checkout-asset`, `#checkout-destination`, `#checkout-handover-mode` with its radios, `#checkout-date`, `#checkout-expected-return`, `#checkin-checkout` (+`-search`, `-listbox`), `#checkin-return-by`, `#checkin-receive-by`, `#transfer-to-location`, `#transfer-reason`, `#bulk-move-to-location`, `#bulk-move-reason`, the `-error` ids, the picker's `data-asset-*` hooks, the signature groups and "ล้างลายเซ็น", the review dialog names, and the toasts.
- **Phone:** the three single-asset pages stay task routes (no bottom menu). Each phone layout is drawn in §7.4, §8.8 and §9.4.
- **Dates:** Bangkok days, Buddhist year in Thai.

## 6. The department rule (decisions 1 and 2)

For บุคคล and Stock/สำรอง assets, a save on these pages writes the department below (components that travel with the asset get the same value through `syncInstalledComponentsWithParent`, and cancelling the document restores it from the snapshots, as today). ส่วนกลาง assets are the exception after the table:

| Save | Department after the save |
|---|---|
| ส่งมอบ to an employee | The employee's department (`Employee.departmentId`, never null). |
| ส่งมอบ to a department | That department (as today). |
| ส่งมอบ to a room | Unchanged. |
| รับคืน (any next status) | The return department (§12, default code `IT`). |
| โอนย้าย choosing a new holder | The new holder's department. The department field shows "ตามผู้ถือครอง: <แผนก>" and cannot be picked. |
| โอนย้าย of an asset that has a holder, no new holder chosen | The current holder's department *(my call: this also corrects an old mismatch; the summary shows it when it changes)*. The department field is locked as above. |
| โอนย้าย of an asset with no holder | The department chosen, or unchanged when none is chosen (as today). |
| ย้ายที่ตั้งหลายรายการ | Unchanged (as today). |
| Late component return (§8.6) | The return department. |

- **ส่วนกลาง (shared) assets keep their responsible department** on checkout, return and transfer, and their department field on โอนย้าย stays free. The user (Q1, 2026-10-30): "ส่วนใหญ่ทรัพย์สินส่วนกลางจะเป็นแผนก IT ที่ดูแล", so a ส่วนกลาง asset's department means who looks after it (messages `ownershipType_shared_help`), not who uses it. บุคคล and Stock/สำรอง follow the table. A component follows its parent, as the sync does today.
- **Server:** the checkout and transfer routes read the chosen employee inside the transaction (active, with `departmentId`) and refuse an unknown or inactive employee under the field (`custodianId` / `toCustodianId`); today they do not read it at all. An inactive department on an active employee is written as it is *(my call: refusing would block that person's handovers over a master-data issue)*. The checkin route reads the return department (§12) and refuses with a catalogued error if it is missing or inactive, so the asset is not returned with a wrong department.
- **Movement history:** a department change made by these saves is written as a `department_change` movement beside the existing one *(my call)*, so the asset history shows it, not only the snapshots.
- **Not changed:** legacy-checkout (it creates the HO- for the current holder and changes nothing else), repair, disposal, audit and the register paths (§4).

## 7. ส่งมอบ: checkout (TX-Checkout, TX-Checkout-Phone-1/2/3)

### 7.1 Section 1 "ทรัพย์สินที่จะส่งมอบ"
- The `AssetOperationPicker` in mode checkout, as today (arrival banner, blocked preselect with its reason).
- Once picked, a card: tag, status badge, name, and "อยู่ที่ <room> · <branch> · <holder or ยังไม่มีผู้ถือครอง>". A Ready asset can still carry an old holder (ข้อมูลเก่า), so the line names that holder when there is one; the board's fixed "ยังไม่มีผู้ถือครอง" is not used. "เปลี่ยน" reopens the picker.
- "ส่วนควบที่จะส่งมอบไปด้วย N รายการ": tag + name of each installed component that will travel (the same filter as the sync: installed link, active component, no open handover of its own), and the board's note that components go with the parent and must be removed first if not wanted.
- An outstanding component (§8.5) is listed apart: "ยังค้างคืน 1 รายการ: <tag> <name> · อยู่กับ <holder> · ตั้งแต่ <RT->", in a warning Notice, and it does not travel (decision 8).

### 7.2 Section 2 "ส่งมอบให้ใคร"
- "ส่งมอบให้" is a `Segmented` control with พนักงาน / แผนก / ที่ตั้ง (decision 3). It keeps today's choice values.
- **พนักงาน:** "พนักงานผู้รับ", a `SearchableSelect` of active employees ("code - name"). After a pick, the hint line reads "<แผนก> · <สาขา> · ตอนนี้ถือครองทรัพย์สินอยู่ N รายการ". N counts the active assets whose holder is this person, leaving out ส่วนควบ (a laptop with its adapter and mouse counts once) *(my call)*.
- **แผนก / ที่ตั้ง:** the destination picker as today, and the fixed ยืมใช้ชั่วคราว with its help line, reworded without "ทรัพย์สินอื่น".
- "ลักษณะการส่งมอบ" (the legend stays; the board's "ระยะเวลา" is not used): two `ChoiceCard`s, มอบหมายใช้งานประจำ ("ใช้ต่อเนื่อง ไม่มีกำหนดคืน") and ยืมใช้ชั่วคราว ("ต้องคืนตามวันที่กำหนด") (decision 5). No default *(my call: it decides the status, so the person must choose; E2E checks the required error)*. The due date appears for ยืมใช้ชั่วคราว.
- "สภาพก่อนส่งมอบ": a radio chip group built from the selectable master conditions in their order, preselected with the asset's current condition *(my call)*. The group keeps the id `checkout-condition`.
- "วันที่ส่งมอบ" (today by default) and "หมายเหตุ", as today.
- An employee who left, a department or room that is inactive: refused under the field (§6).

### 7.3 Section 3 "หลักฐาน" (ไม่บังคับ แต่แนะนำ) and the summary
- Photo and the receiver's signature with ล้างลายเซ็น, as today; the pad says "ให้ <ผู้รับ> เซ็นในกรอบนี้".
- **Summary rows:** ผู้ถือครอง (now → the employee; → unchanged for a room; → ไม่มี is never written by a checkout to a department or room, so an old holder stays and the row says so), แผนก (§6), ที่ตั้ง (for a room), สถานะ (→ ใช้งานอยู่ for มอบหมายใช้งานประจำ, → ถูกยืม for ยืมใช้ชั่วคราว), ส่วนควบ (N → ไปด้วย N; plus "ค้างคืน M" when §7.1 applies).
- **Still missing:** ทรัพย์สิน, ผู้รับ, ลักษณะการส่งมอบ, ลายเซ็นผู้รับ (ยังไม่มี, not required).
- **Footnote:** "เลขใบส่งมอบออกให้หลังบันทึก แล้วเปิดใบส่งมอบให้พิมพ์ทันที".
- **Server:** the "asset" checkout type is refused for new saves (the zod enum, the route, the `checkoutParent` search mode and `getCheckoutParentVerdict` go). Old "asset" handovers stay readable on the HO- and RT- pages, the history and the return search; the column stays.

### 7.4 Phone: the desk delivery in three steps
Below the shell's phone breakpoint the page becomes the three boards, held in one form so nothing is lost between steps (`Steps` shows 1 / 2 / 3). The phone bar's back control reads "ยกเลิกและกลับ" on step 1 and goes one step back on steps 2 and 3.
1. **"ทรัพย์สินและผู้รับ"** (Phone-1): the asset card with "ส่วนควบไปด้วย N รายการ: …"; ส่งมอบให้; the receiver with แผนก · สาขา; ลักษณะการส่งมอบ; the due date for ยืมใช้ชั่วคราว; the condition chips; the camera photo; "วันที่ส่งมอบ: วันนี้ … · เปลี่ยน"; หมายเหตุ. The board leaves out the due date, the department and room destinations and the remark; they are added (Appendix A). "ถัดไป: ให้ผู้รับตรวจ" runs the step's field checks.
2. **"ให้ผู้รับตรวจ"** (Phone-2): "ยื่นมือถือให้ผู้รับอ่านรายการนี้ก่อนลงชื่อ", the receiver, the asset, tag · S/N, the photo count, "ได้รับพร้อมกัน N รายการ", สภาพ, ลักษณะ, the due date, the date, the status after save, the remark and ผู้ส่งมอบ. "ถูกต้อง ลงชื่อรับ" goes on; "มีบางอย่างไม่ถูกต้อง กลับไปแก้" returns to step 1. This step replaces the review dialog on the phone *(my call)*.
3. **"ลงชื่อรับ"** (Phone-3): the statement "ข้าพเจ้าได้รับ <tag> พร้อมส่วนควบ N รายการ ในสภาพ<สภาพ>" (for a department or room it reads "รับในนามของ <แผนก / ที่ตั้ง>" and asks for no name: there is no field for the person signing, and none is added *(my call)*), the pad with ล้างลายเซ็น, the landscape hint, and "บันทึกการส่งมอบ", which saves (a signature is still optional) and opens the HO- document on the phone.
- The asset page's phone primary action ส่งมอบ still opens this page with `?assetId=`.

## 8. รับคืน: checkin (TX-Checkin, TX-Checkin-Phone)

### 8.1 Header
- A link line on the right, "ข้อมูลเก่าที่ยังไม่มีใบส่งมอบ N รายการ · ดูรายการ", with N from today's legacy count. The work center has no such list, so it opens the register with a new data-quality filter "มีผู้ถือครองแต่ไม่มีใบส่งมอบ", built on the same where as the count *(my call)*.

### 8.2 Section 1 "ทรัพย์สินที่รับคืน"
- The picker in mode checkin, as today: rows grouped by holder with "ถืออยู่ N ชิ้น", the HO- line or the legacy line with its room (S-R47), blocked rows with their reason, held rows first (S-R45). The badge on each row reads "มีใบส่งมอบ HO-…", "ข้อมูลเก่า ไม่มีใบส่งมอบ" or "ส่วนควบค้างคืน" (§8.6). The board's department in place of the room is not used.
- The multi-word search of §11 applies ("notebook บัญชี").
- Choosing a legacy row keeps today's confirm and backfill.
- Once chosen, the holding strip shows ส่งมอบเมื่อ "<date> · ถือมา N วัน", ลักษณะ (decision 5 words) and สภาพตอนส่งมอบ, and keeps every field of today's panel (Appendix A): HO- number, the due date for a loan, a destination other than an employee, the handover remark, Serial, status.
- **"ส่วนควบที่ต้องได้คืน · ติ๊กชิ้นที่ได้คืนแล้ว":** one checkbox per installed component that travels (the same filter as §7.1), all ticked by default *(my call: the usual case is that everything comes back)*. An unticked row reads "· ยังไม่ได้คืน". The note: "ชิ้นที่ไม่ได้ติ๊กจะยังอยู่กับผู้คืน และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน". Hidden when the asset has no components.

### 8.3 Section 2 "รายละเอียดการคืน"
- ผู้คืน: prefilled with the holder, tagged "ผู้ถือครองตอนนี้"; a holder who left is offered as "(พ้นสภาพ)" (S-R46).
- ผู้รับคืน: prefilled with the signed-in person's employee, tagged "คุณ", and editable *(my call, from the board)*.
- สภาพตอนคืน: the radio chip group of §7.2, with no default (the condition must be looked at). Keeps the id `checkin-condition-after` on the group.
- วันที่คืน: today by default, editable for a late entry, and not later than today *(my call; today it has no bound and it sets the RT- number and the repair's reported date)*.
- หลังรับคืนให้เป็น: พร้อมใช้งาน / ส่งซ่อม / รอตัดจำหน่าย, no default (as today). With ส่งซ่อม the hint reads "บันทึกแล้วระบบจะเปิดใบซ่อมให้อัตโนมัติ" (decision 4). With an open repair the choice is locked to ส่งซ่อม with today's notice (S-R43, S-R48), and the hint names the repair record it joins.
- เก็บไว้ที่: a `SearchableSelect` of active rooms ("code - name"); today it is a plain select without search. No default: the IT staff member chooses the room each time (the user, 2026-10-30, Q2 in §16). The board's "คลัง IT · สำนักงานใหญ่" default is not used.
- อุปกรณ์ที่ขาด (free text, for things that are not components: a charger, a bag) and รายละเอียดความเสียหาย stay as today, with today's rule that typing damage picks ส่งซ่อม when no next status is chosen. The board's "show only for ชำรุด" is not used *(my call: that rule would hide the field whose text the auto-pick reads)*.
- รายละเอียดปัญหาในใบซ่อม appears with ส่งซ่อม, as today. When left empty, the repair problem text is built from the damage, the free-text missing items and the missing components.
- หมายเหตุ, as today.

### 8.4 Section 3 "หลักฐาน" and the summary
- Photos with their type (ภาพรวม / จุดเสียหาย) and the two signatures, each with ล้างลายเซ็น (the board drops the clear buttons; they stay).
- **Summary rows:** ผู้ถือครอง → ไม่มี; แผนก → the return department (decision 2; the board has no such row); สถานะ → the chosen one; ที่ตั้ง → the chosen room; สภาพ → the chosen one; ส่วนควบ "N รายการ → ได้คืน X · ขาด Y".
- **Warning lines:** "<component> ยังไม่ได้คืน จะอยู่กับ <ผู้คืน> ที่ <room> และบันทึกเป็นอุปกรณ์ที่ขาดในใบรับคืน" (§8.5); with ส่งซ่อม, "จะเปิดใบซ่อมให้" or "ต่อใบซ่อม <repair no.>".

### 8.5 The outstanding component (decision 7)
- **Model:** the link keeps its row and its status becomes `outstanding`, with `referenceType` "checkin" and `referenceId` = the RT- id; `removedAt` stays null. The component asset keeps its room and department. No migration: the status column is free text (`AssetComponent.status`, NVarChar(20)).
- **Its holder is the person returning (ผู้คืน)** (the user, Q3, 2026-10-30), because that is the person who can be asked for it. When ผู้คืน is the holder nothing changes. When it is someone else (a manager returning for a person who left), or the handover was to a department or room, the component's holder becomes ผู้คืน and, under decision 1, its department becomes theirs *(my call)*. Its room does not change. The change writes a holder movement on the component and goes into the RT-'s snapshots, so cancelling the RT- restores it.
- **Save:** the checkin request carries the ids of the links that did not come back. The server checks each is an installed link of this parent, sets them outstanding, and syncs only the returned components to the parent's new values. Leaving the field out means everything came back, so other callers keep working.
- **Everywhere else, outstanding is not installed:**
  - the parent's syncs (checkout, transfer, bulk-move, checkin) skip it;
  - installing it into another asset is refused, and its slot on the parent stays taken;
  - the component-candidate list leaves it out;
  - the responsibility rule counts it as held (it has a holder), so the work center does not report it as missing a holder;
  - the legacy count and the legacy return path leave it out, so it is never offered a backfilled HO-;
  - checkout, transfer and bulk-move refuse it on its own with the reason "ส่วนควบค้างคืน รับคืนก่อน" *(my call)*; this covers a component owned as บุคคล that was installed in a laptop, which checkout would otherwise accept;
  - the audit counts it as an asset on its own, in the room where it is;
  - disposal of the parent is blocked by it, as by an installed component today, and the readiness check names it.
- **Asset pages:** the parent's component list shows it with "ค้างคืน · อยู่กับ <holder> · <RT->"; the component's own page shows the same line and a รับคืน action that opens §8.6.
- **Cancelling the RT-** puts the links back to installed and restores the asset fields, as today's snapshots do for the rest. The component snapshots carry the link status so the stale check compares it.
- **A component that never comes back:** the existing "ถอดออก" on the parent's component list also works on an outstanding link *(my call)*. The component then stands alone, still with its holder, and the usual paths (status correction, disposal) apply.

### 8.6 The late return of a component (decision 8)
- On รับคืน, a search by the component's tag or name, or by its holder, lists the component as its own row: "ส่วนควบค้างคืน ของ <parent tag>", with the RT- that left it out. It is eligible on a new path (`componentReturn`) that is checked before the legacy and ownership rules.
- Choosing it shows a short panel: the parent's tag and name, the RT- and its date, ผู้รับคืน (default: you), วันที่คืน, สภาพตอนคืน (optional, default unchanged) and หมายเหตุ. The rest of the form is hidden. The summary shows the component going back to the parent.
- **Save** (a new route, `asset:edit`, with the same claim and stale guard as the others):
  - **The parent is in IT stock**, meaning status พร้อมใช้งาน, no holder and no open handover *(my call)*: the link goes back to installed; the component takes the parent's room and the return department, and its holder is cleared.
  - **The parent is anywhere else** (handed over to a person, department or room, at repair, or disposed): the link is ended (removed, with history) and the component stays in IT stock on its own, in a room the IT staff member chooses on the panel (no default, Q2) *(my call: re-attaching it would put a mouse that sits in IT on the new holder's record)*. The panel says so before saving.
  - Movements are written on the component and the parent, referencing the original RT-. The RT- page shows a line under the missing components: "<tag> คืนแล้ว <date> · รับโดย <name>". No new document number.

### 8.7 The link to the repair record (decision 4)
- The checkin answer carries the repair record's id and number, for a new record and for an open one the return joined (S-R43). After saving, the RT- page opens with a line "เปิดใบซ่อม <repair no.>" or "ต่อใบซ่อม <repair no.>" that links to it.
- The RT- keeps that link without a new column: it is stored with the RT-'s after-snapshot or as a movement that references both documents. The builder picks one and checks that the cancel path still reads the snapshot (§18).

### 8.8 Phone (TX-Checkin-Phone)
- The same three sections, condensed: the picker list, then a found card; the components checklist; "ผู้คืน / ผู้รับคืน: <names> · แก้ไข" as one line that opens both fields; condition chips; next status; room; camera capture for photos; signatures. The footer reads "ส่วนควบได้คืน X · ขาด Y" over the primary button.
- The board leaves out วันที่คืน, หมายเหตุ, อุปกรณ์ที่ขาด, the damage and repair fields and the open-repair notice; they stay (Appendix A).

## 9. โอนย้าย: transfer (TX-Transfer, TX-Transfer-Phone)

### 9.1 Section 1 "ทรัพย์สิน"
- The picker in mode transfer, as today, then the board's card (tag, status, name, เปลี่ยน). The S-R40 line "นำ <tag> ออกแล้ว: <reason>" stays when choosing a holder removes the asset.

### 9.2 Section 2 "เปลี่ยนอะไร" (เลือกอย่างน้อย 1 อย่าง)
- A table with รายการ / ตอนนี้ / → / ปลายทาง, one row each for ที่ตั้ง, ผู้ถือครอง and แผนก. Each "ปลายทาง" is today's `SearchableSelect` ("code - name", placeholder "ไม่เปลี่ยนแปลง", with its × clear). The field labels ที่ตั้งปลายทาง / ผู้ถือครองปลายทาง / แผนกปลายทาง stay as accessible names.
- The ตอนนี้ column reads the asset's room with its branch, its holder, and its department.
- **แผนก row** (§6): "ตามผู้ถือครอง: <แผนก>" and locked when the asset has a holder or one is chosen; free otherwise. Choosing a holder clears a department already picked. For a ส่วนกลาง asset it stays free (Q1).
- Under the table: "ส่วนควบ N รายการ (<names>) ย้ายตามไปด้วย", from the same filter as the sync; outstanding components are not listed.
- A destination equal to the current value is not counted as a change, and the picker marks the current value *(my call)*.
- Removing a holder is still not offered here; only รับคืน clears a holder (as today).

### 9.3 Section 3 "เหตุผล" and the summary
- "เหตุผลการโอนย้าย *": the four chips ย้ายสาขา / เปลี่ยนผู้ใช้งาน / ปรับโครงสร้างแผนก / อื่น ๆ, and the text field (required, at most 500). A chip writes "<chip>: " at the start of the text, replacing a previous chip's prefix and keeping what was typed after it; อื่น ๆ only focuses the text *(my call)*. The hint: "กดปุ่มเพื่อเติมข้อความตั้งต้น แล้วแก้ต่อได้". Only the text is saved (no reason column).
- หมายเหตุ (optional), as today.
- **Summary:** "เปลี่ยน N อย่าง: <list>", each change as before → after, the status line (→ ใช้งานอยู่ when a holder is chosen, else คงสถานะเดิม), "ผู้ถือครองและแผนกคงเดิม" when they do not change, the component line, and, when the new room is in another branch than the asset's own, "ย้ายไปสาขาอื่น รหัสทรัพย์สินยังเป็นของ <asset's branch> ตามเดิม". The board's fixed "สำนักงานใหญ่" is not used; the code never changes `branchId`.
- **Footer:** "โอนย้าย <tag>: <the changes in short>".
- **Server:** the route checks that the room, employee and department exist and are active, under their fields; today it writes the ids as sent. Department per §6.

### 9.4 Phone (TX-Transfer-Phone)
- The card, then the three rows stacked, each with "ตอนนี้: …" above its picker; the chips (ปรับโครงสร้าง short); one summary line above the footer. หมายเหตุ, the × clear and the codes in labels stay (the board leaves them out).

## 10. ย้ายที่ตั้งหลายรายการ: bulk-move (TX-Bulk, desktop only)

### 10.1 The table
- Header: h1 ย้ายที่ตั้งหลายรายการ, subtitle "เลือกทรัพย์สินที่จะย้ายไปที่ตั้งเดียวกัน ผู้ถือครองและแผนกคงเดิม".
- Filters: a search (the multi-word rule of §11, matching tag, name, serial, fixed-asset code, holder), "ที่ตั้งตอนนี้" (a searchable room picker, exact room as in the register *(my call)*), "หมวดหมู่" (ทั้งหมด or one), and "พบ N รายการ".
- Columns: checkbox, รหัส, ชื่อ, หมวดหมู่, ที่ตั้งตอนนี้, ผู้ถือครอง, and a status line under the name (the board has none, but Lost, Pending Disposal and Under Inspection can be moved and the person must see them) *(my call)*. A parent row adds "+N ส่วนควบย้ายตาม"; a component row reads "ส่วนควบของ <tag>".
- A row that cannot move keeps its holder and shows its reason on its own line, with the checkbox disabled. The real rules (`getBulkMoveVerdict`): License, an open handover ("มีการส่งมอบค้างอยู่ รับคืนก่อนจึงย้ายได้", a bulk-move wording), Disposed/Retired, and an outstanding component (§8.5). อยู่ระหว่างซ่อม **can** move; the board's example is wrong.
- Paged on the server: 25 rows a page (the register default), ordered by tag, with "แสดง a–b จาก N" and ก่อนหน้า / ถัดไป. The header checkbox is "เลือกทั้งหมดในหน้านี้" and ticks only the rows that can move.
- Ticks survive page and filter changes, so assets from several rooms can go to one place; the bar keeps a snapshot of each ticked row *(my call)*. At most 100 per move *(my call: the route's single transaction and SQL Server's parameter limit)*; past 100 the other checkboxes are disabled with the reason.
- Empty states: no assets match; nothing ticked yet.

### 10.2 The bar and the review
- `DesktopSelectionBar` at the bottom while anything is ticked: "N รายการที่เลือก", ล้าง, "ย้ายไป *" (a searchable room picker, `#bulk-move-to-location`), "เหตุผล *" (`#bulk-move-reason`, at most 500), and **"ตรวจสอบและย้าย N รายการ"**. หมายเหตุ moves into the review dialog (the board has none; Appendix A).
- The review dialog "ตรวจสอบก่อนย้ายที่ตั้ง" (confirm "ยืนยันย้ายที่ตั้ง") lists the tags, the room, the reason, "ส่วนควบย้ายตาม M ชิ้น", "ผู้ถือครองและแผนกคงเดิม", and, when rooms are in another branch, "ย้ายไปสาขาอื่น X รายการ รหัสยังเป็นของสาขาเดิม" *(my call: `branchId` stays as today)*.
- After saving, the page stays: the ticks clear, the list refreshes, and a line reads "ย้ายแล้ว N รายการไป <room> · ส่วนควบย้ายตาม M ชิ้น" from the answer *(my call; today it goes to the register and ignores the answer)*.
- A refusal from the save names the assets under the table (the License, written-off and open-handover refusals all return a named `blocked` list; today the open-handover one is an unnamed 400).

### 10.3 Server
- A new list endpoint (`asset:edit`, bounded like the search): query text (empty allowed), room, category, page; rows with the fields of §10.1 and the verdict from `getBulkMoveVerdict`; per-page reads for open handovers, component counts and parents. The page loads active rooms and categories only, not the whole master list.
- The save route caps `assetIds` at 100, checks the room is active, and returns open-handover refusals with the named `blocked` list.

### 10.4 Phone
- Below `md`, the page shows only a notice: "หน้านี้ใช้บนคอมพิวเตอร์" with a link back to the register (decision 9). The menu entry stays.
- The menu label `nav.bulkMove` changes from "อัปเดตหลายรายการ" to "ย้ายที่ตั้งหลายรายการ", the page's own name *(my call)*.

## 11. Multi-word search

- The search splits the text on spaces; every word must match one of the fields (AND across words, OR across fields). The exact and prefix tiers still use the whole text.
- The fields add the holder's department name and the asset's department name, so "notebook บัญชี" finds the accounting notebooks (checkin, checkout, transfer and the bulk-move list) *(my call)*.
- The highlight marks each word. The 2-to-100 character rule applies to the whole text.

## 12. Setting: the return department

- A new system setting on the Organization tab, "แผนกที่รับคืนเข้าคลัง" (key `checkin_department_code`, default `IT`), upper-cased like `ldap_sync_default_department_code` *(my call: a renamed code can be fixed in Admin > Settings instead of in code)*.
- It is read at save time; a missing or inactive department refuses the return (and the late component return) with a catalogued error that tells an admin what to fix.

## 13. Words and messages

- New and changed keys go through `node scripts/messages-edit.mjs`, in Thai and English, and pass the glossary test.
- Changed values: `checkout.permanentAssignmentHelp` and `temporaryLoanHelp` take the board's short lines; `checkout.nonUserTemporaryHelp` drops "ทรัพย์สินอื่น"; the custody-type words on the checkin panel and the RT- page use the decision 5 words; `nav.bulkMove`.
- Removed for new saves: `checkout.toAsset`, `asset.transactionReasonSameAsset`, `apiErrors.checkoutDestinationNotAllowed` (and its catalog entry). Kept for old records: `checkout.type_asset`, `checkin.type_asset`.
- The footer button "ตรวจสอบและบันทึก" is a new key; `common.save` is not changed, because other forms use it.

## 14. Calls I made (for the user to check)

1. The review dialog stays behind "ตรวจสอบและบันทึก" on the desktop; on the phone checkout, step 2 is the review (§5, §7.4).
2. One shared summary-card part for the three single-asset pages (§5).
3. A person without `maintenance:create` does not see ส่งซ่อม; joining a repair record already open needs only `asset:edit` (§5).
4. A transfer of a held asset sets the department to the holder's, even when only the room changes (§6).
5. An inactive department on an active employee is written as it is (§6).
6. Department changes get their own history line (§6).
7. "ถือครองอยู่ N รายการ" counts the person's assets without components (§7.2).
8. No default handover mode; the condition defaults to the asset's current one on checkout and has no default on return (§7.2, §8.3).
9. The legacy link opens the register with a new data-quality filter (§8.1).
10. The components checklist starts all ticked (§8.2).
11. ผู้รับคืน defaults to you; the return date cannot be later than today (§8.3).
12. The damage field stays always visible (§8.3).
13. When an outstanding component's holder becomes ผู้คืน, its department becomes theirs (§8.5). An outstanding component cannot be handed over, transferred or bulk-moved on its own until it is returned; it blocks disposal of its parent; "ถอดออก" closes one that never comes back (§8.5).
14. A late return re-attaches the component only when the parent is พร้อมใช้งาน with no holder and no open handover; otherwise the link ends and the component stays in IT stock (§8.6).
15. On the phone, a checkout to a department or room is signed "รับในนามของ <แผนก / ที่ตั้ง>" with no name field (§7.4).
16. The RT-'s repair link is stored without a new column (§8.7).
17. A transfer destination equal to the current value is not a change (§9.2).
18. How the reason chips write the text (§9.3).
19. Bulk-move: a status line, exact-room filter, ticks across pages, at most 100, stay on the page after saving, a cross-branch line in the review (§10).
20. The menu label "ย้ายที่ตั้งหลายรายการ" (§10.4).
21. Multi-word search adds the department names (§11).
22. The return department is a setting with default `IT` (§12).
23. Out of scope and recorded in the wiki: the register's bulk update, the asset edit form and the audit correction do not follow decision 1 yet; existing department mismatches are not corrected (§4). A one-time correction would be a Production write that needs the user's approval with the full SQL.

## 15. Recorded for later (wiki)

- Other paths that change a holder without following decision 1 (register bulk update, asset edit, audit custodian correction) go to `ams-open-questions` for their page groups.
- The count of held assets whose department differs from their holder's, on Production, is read (SELECT only) before the deploy, so the user can decide on a correction.

## 16. Questions for the user (answered 2026-10-30)

All three are answered.
- **Q1. ส่วนกลาง assets. Answered 2026-10-30:** "ส่วนใหญ่ทรัพย์สินส่วนกลางจะเป็นแผนก IT ที่ดูแล". Read as: a ส่วนกลาง asset keeps its responsible department (§6).
- **Q2. Where returns are stored. Answered 2026-10-30:** "พนักงาน IT จะเป็นคนเลือกเอง". เก็บไว้ที่ has no default (§8.3), and a late component whose parent is out goes to the room chosen on its panel (§8.6).
- **Q3. Who keeps a component that did not come back, when the person returning is not the holder. Answered 2026-10-30:** the person returning ("อยู่กับผู้คืน") (§8.5).

## 17. E2E

- Each plan updates the specs of its page, in the same task as the change (the group 2 practice), and runs them; the whole suite runs once at the end of the group.
- **Changes the specs must follow:**
  - the primary button "ตรวจสอบและบันทึก" in place of "บันทึก" on the three pages (other forms keep "บันทึก");
  - condition chips in place of the native selects (`#checkout-condition`, `#checkin-condition-after`);
  - the checkout phone flow in three steps (desk-delivery.spec.ts rewritten to the steps);
  - the checkin defaults (ผู้รับคืน prefilled) and the components checklist;
  - the department after checkout, return and transfer, read back from the asset;
  - the bulk-move table, ticks, review and staying on the page (bulk-move.spec.ts rewritten); on the phone projects only the notice is checked.
- **New specs:**
  - a return with one component left out, then its late return (the parent in stock);
  - the outstanding warning on the parent's next checkout;
  - a multi-word search;
  - the link to the repair record after a ส่งซ่อม return.
- The new list endpoint joins the viewer refusal list (`e2e/cross-cutting/support/refusals.ts`).
- axe runs on every new state in both themes, as today.

## 18. Build order and what is left to the builder

**Plans, in order** (each merged after its own tests and E2E, the group 1 and 2 practice):
1. **Shared rules and ส่งมอบ:**
   - the department rule in the checkout and transfer routes, and the setting (§6, §12);
   - the summary-card part and the footer (§5);
   - multi-word search (§11);
   - dropping "ทรัพย์สินอื่น";
   - checkout on desktop and the phone steps (§7).
2. **รับคืน:**
   - the page (§8.1 to §8.4, §8.8);
   - the outstanding component (§8.5) and its late return (§8.6);
   - the repair link (§8.7);
   - the legacy register filter.
3. **โอนย้าย** (§9).
4. **ย้ายที่ตั้งหลายรายการ** (§10).

**Left to the builder:**
- the exact shape of the new routes and their payloads;
- where the extra row data comes from (the search row, a per-pick read, or the master options), within the search's bounded reads;
- the phone breakpoint, matching the shell;
- the form state across the three phone steps;
- how the RT- stores its repair link (§8.7), with a check that cancellation still works;
- the order of tasks inside each plan.

## Appendix A. What the boards leave out, and stays (binding)

From `ams-tx-canvas-function-gaps` (2026-10-29), checked again on 2026-10-30.

### ส่งมอบ
- The 7 selectable master conditions, not 3 fixed buttons; no "ชำรุด".
- หมายเหตุ on the phone steps.
- The field errors under ลักษณะการส่งมอบ, วันกำหนดคืน and สภาพ, and the refusals (status not Ready, an open handover, component or License).
- The HO- document opens right after saving.
- On the phone: the due date, the department and room destinations, and the status after save in the review step.
- The arrival banner and the blocked preselect with its reason.

### รับคืน
- Rows that cannot be returned, listed with their reason.
- วันที่คืน (on the phone too), defaulting to today.
- รายละเอียดปัญหาในใบซ่อม.
- The free-text อุปกรณ์ที่ขาด for items that are not components.
- The damage field and its ส่งซ่อม auto-pick.
- ล้างลายเซ็น on both signatures.
- The full holding panel: due date for a loan, a destination other than an employee, the handover remark, Serial.
- The legacy row's room and room search (S-R47), and the former employee as ผู้คืน (S-R46).
- The open-repair return into ส่งซ่อม on the same repair record (S-R43, S-R48).

### โอนย้าย
- The × that clears a destination back to "ไม่เปลี่ยนแปลง".
- Pickers searchable by code (about 1,100 rooms and 770 employees).
- หมายเหตุ on the phone.
- The "นำ … ออกแล้ว" line (S-R40).
- The TR- document after saving.

### ย้ายที่ตั้งหลายรายการ
- Server paging and filtering; never the whole register.
- หมายเหตุ.
- Components move with their parent, and the page says so.
- The destination is searchable by room code.
- The real move rules: an open handover, Disposed/Retired, License and an outstanding component cannot move; อยู่ระหว่างซ่อม can.
