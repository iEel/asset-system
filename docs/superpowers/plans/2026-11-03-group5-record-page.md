# Page group 5, plan 3: the repair record page (MT-Detail, MT-Detail-Phone) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild `/[locale]/maintenance/[id]` to boards MT-Detail and MT-Detail-Phone. The rebuilt page has:
- a next-step card that predicts what ซ่อมเสร็จ will do to this asset;
- an "อื่น ๆ" menu;
- one owner of the three dialogs;
- the complete dialog with no pre-chosen result;
- a history oldest first, with actors and attachment events;
- the asset card;
- attachments typed by the record's state;
- the phone bar.

**Architecture:**
- **Pure rules:** one client-safe module `src/lib/repair-record-detail-rules.ts` turns the record, its asset facts (plan 2's `loadRepairAssetFacts`), its movements, attachments and actors into the card, the header line and the history. A new `getRepairCompleteOutlook` beside plan 2's create outlook predicts ซ่อมเสร็จ from `getRepairRecordCompleteEffect`.
- **The page:** it stays a server page that reads once.
- **The client wrapper:** one wrapper owns the three dialogs. The header, the card, the menu and the phone bar open them through a context.

**Tech Stack:** Next.js 16 App Router (read `node_modules/next/dist/docs/` before touching routing APIs), React 19, next-intl (Thai first), Prisma 7 on SQL Server, zod 4, `node --test` (`npx tsx --test`), Playwright in 4 projects.

**Spec:** `docs/superpowers/specs/2026-11-03-page-group-5-maintenance-design.md`, these sections:
- §8 (all);
- from §5: early refusal, ON_LOAN, after ซ่อมไม่ได้, dates;
- §6: the MT-Detail rows;
- §13: "repairRecord (detail)" and the attachment words of "maintenancePage";
- §16: the record specs and the held-asset spec;
- §17: row 3;
- decisions 1, 2, 9 and 10.3;
- Appendix A "Record" and Appendix B.

**Reused from plan 2:**
- `RepairAssetFacts`, `loadRepairAssetFacts` and `RepairHeldNotice`;
- `StatusBadge`'s opt-in `wrap`;
- the `repair-record-outlook.ts` pattern.

**Boards:** session scratchpad `artifact-files/182f6683-…/project/MT-Detail.dc.html` and `MT-Detail-Phone.dc.html` (PNG `g5/boards/MT-Detail.png`, `MT-Detail-Phone.png`). **Recon:** `g5/recon/r-detail.md`. Scratchpad: `C:/Users/Eltross/AppData/Local/Temp/claude/D--Antigravity-asset-system/f250ea8d-3040-422b-ad7a-15dd9aed94b9/scratchpad/`.

## Global Constraints

- **Branch and repo:**
  - Branch `feat/group5-record-page` from `master` `fb3e555a`. No push.
  - No schema change, no migration and no database command.
  - Implementer tasks run no build, no dev server and no E2E. `npx playwright test --list` is fine.
- **Files to leave alone:**
  - Never read `.env*`.
  - Leave the untracked paths alone: `.codex/`, `.impeccable/config.json`, `.impeccable/critique/`, `.playwright-mcp/`, `.superpowers/brainstorm/`, `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md`, `.claude/worktrees/`.
- **Parts and tokens:**
  - Use the shared parts only (spec §5): `PageHeader`, `ContentPanel`, `KeyValueList`, `StatusBadge`, `DropdownMenu`, `ActionBar`, `Notice`, `FileDropzone`, `AttachmentPreviewDialog`, `AccessibleDialog`, `ChoiceCard`, `FieldGroup`, `AssetConditionChoice`, `AssetThumbnail`, `Nil`.
  - No hex or rgba, no `dark:`, no `/NN` tints. No dashed borders: the future history step uses a hollow marker.
  - State colour lives only in badges and `Notice` tones. The next-step card is a plain `ContentPanel`.
- **Dialogs:**
  - A dialog never sits inside a menu (`DESIGN.md:651`). One client wrapper owns ซ่อมเสร็จ, ยกเลิกบันทึก and แก้ไขรายละเอียด for the header, the card, the menu and the phone bar.
  - Closing a dialog returns focus to the control that opened it.
- **Words:**
  - Change messages only through `node scripts/messages-edit.mjs <file>`. Change files go in `<scratchpad>/g5/msg/p3-*.json`, Thai and English.
  - Use the values of spec §13 verbatim.
  - "บันทึก" (not "ใบงาน") names a record. The glossary test must stay green.
- **Bangkok days:** the day count uses `repairDays` (`src/lib/asset-repair-rules.ts:31`). The completion date's `max` is the later of the server's Bangkok today and the browser's, as plan 2 does.
- **Stable hooks:** these stay: `#history`, `#attachments`, the complete dialog's ids `repair-complete-*`, the cancel and edit ids.
  - New on the next-step card: `data-repair-next-step="open|closedUsable|closedBeyond|closedNoOutcome|cancelled"`.
  - New: `data-repair-outcome-row="usable|beyond_repair"` on its outcome rows and `data-repair-history-event` on each history item.
- **Guards:** a source-reading test that pins a changed file moves in the same task (`tests/repair-record-detail-ui.test.ts`, `maintenance-attachments-ui`, `maintenance-history-labels`, and others the run names).
- **Commits:**
  - CRLF files keep CRLF.
  - Before each commit, run the focused tests, `npm test`, `npx tsc --noEmit` and eslint on the changed files. `npm run lint` may also report a stray `.claude/worktrees/` copy; ignore it and do not touch it.
  - Each commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Rulings made while planning

- **G5P3-R1 (predicting ซ่อมเสร็จ):** `getRepairCompleteOutlook(facts, outcome)` reads `getRepairRecordCompleteEffect`. The record's own open record does not count, as the server's `ignoreRecordId` does. The holder note for each result:
  - **ใช้งานได้:**
    - with an open handover: "กลับไปที่ {holder} ตามใบส่งมอบ {documentNo}" (no `documentNo`: the holder sentence without a document);
    - a บุคคล asset with a custodian: "ผู้ถือครอง {holder} คงเดิม";
    - otherwise: "ไม่มีผู้ถือครอง".
  - **ซ่อมไม่ได้:**
    - "แล้วยื่นคำขอตัดจำหน่ายต่อ", plus "ผู้ถือครอง {holder} คงเดิม" when the asset keeps a holder (decision 9);
    - with an open handover, the refusal (`RepairHeldNotice`) in its place.
- **G5P3-R2 (one dialog owner):** `RepairRecordActionsProvider` (client) renders the three dialogs once and gives `useRepairRecordActions(): { openComplete(opener?), openCancel(opener?), openEdit(opener?) }`. Small client parts call it: the header's ซ่อมเสร็จ, the "อื่น ๆ" menu, the card's ซ่อมเสร็จ and the phone `ActionBar`. Each passes its own element, so focus returns there.
- **G5P3-R3 (actors):** the page reads the users of `assetMovement.performedBy` and `attachment.uploadedBy` in one `user.findMany` (`username`, `displayName`, `email`, `employee { code, fullNameTh }`). It names them with `assetHistoryActorLabel` (`src/lib/asset-history-rules.ts:375`). An unknown id shows no actor.
- **G5P3-R4 (attachment events):** one event per run of attachments of the same type by the same uploader, each within 10 minutes of the run's first upload, at the run's first time: "แนบ{type} {count} ไฟล์". Spec §8.3 makes this my call.
- **G5P3-R5 (the cancel reason):** the reason of the record's `maintenance_cancel` movement, shown on the cancelled card when it is not empty.
- **G5P3-R6 (the reason line):** a movement's reason shows only when its trimmed text differs from the record's trimmed problem.
- **G5P3-R7 (after ซ่อมไม่ได้):** the closed ซ่อมไม่ได้ card reads one of three states, in this order:
  - the asset is Disposed: new key `detail.assetDisposed` "ทรัพย์สินนี้ตัดจำหน่ายแล้ว";
  - an open disposal request exists (`openDisposalRequestWhere`, `src/lib/asset-actions.ts:75`, newest): "มีคำขอตัดจำหน่าย {disposalNo} แล้ว", linked to `/{locale}/disposal/<id>`;
  - otherwise: "ขั้นถัดไป: ยื่นคำขอตัดจำหน่าย". The button needs `disposal:create`; without it, the line "ผู้มีสิทธิ์ยื่นคำขอตัดจำหน่ายเป็นผู้ยื่นต่อ".

  The disposal-review panel then hides its own button, so the request is never offered twice.
- **G5P3-R8 (the phone):**
  - The shared `PageHeader` stays (spec §8.6).
  - The phone bar is `ActionBar` with `primaryAction` "ซ่อมเสร็จ" (edit, open record). Its `more` "เพิ่มเติม" holds เปิดหน้าทรัพย์สิน, พิมพ์, แก้ไขรายละเอียด and ยกเลิกบันทึก, each by permission.
  - Without the primary, the bar holds เปิดหน้าทรัพย์สิน and พิมพ์ as links, plus "เพิ่มเติม" when it has items.
  - Page padding is `actionBarPagePadding.withPrimary` or `.single`.
- **G5P3-R9 (the complete dialog):**
  - The result starts empty, with the required error "เลือกผลการซ่อม".
  - ซ่อมไม่ได้ on an asset with an open handover shows `RepairHeldNotice` under the result.
  - The date is not after today. The save stays enabled.
- **G5P3-R10 (the asset card):** a server-side panel `RepairRecordAssetPanel`. It differs from plan 2's picked card, so it is a different part, and it holds:
  - the photo (`AssetThumbnail` 44), the name linking to the asset, the tag;
  - สถานะปัจจุบัน as a badge;
  - ผู้ถือครอง: the name, with the department under it;
  - ที่ตั้ง: the room, with the branch under it;
  - the link "ประวัติซ่อมทั้งหมดของทรัพย์สินนี้ · {count} รายการ" to `/{locale}/maintenance?assetId=<id>`. The count is the asset's active records.

## Review Focus

1. **A record opened by a return with ส่งซ่อม (no holder, no handover).** The card's ใช้งานได้ row reads พร้อมใช้งาน "ไม่มีผู้ถือครอง", never ใช้งานอยู่ (Task 1).
2. **A held asset (open HO-).** The card's ซ่อมไม่ได้ row and the complete dialog both show the refusal with รับคืน, not "→ รอตัดจำหน่าย". After the return, the card shows "→ รอตัดจำหน่าย" (Task 1, Task 5).
3. **Twelve photos uploaded in one minute by one person, then one PDF by another person.** The history shows two events, "แนบรูปก่อนซ่อม 12 ไฟล์" and "แนบใบแจ้งหนี้ 1 ไฟล์", oldest first (Task 1).
4. **A create-only user on their own open record.** No ซ่อมเสร็จ anywhere. The card reads "ผู้มีสิทธิ์แก้ไขบันทึกซ่อมเป็นผู้กดซ่อมเสร็จ". Upload works, delete does not, and the notice says why (Task 3, Task 4).
5. **A dialog opened from the phone bar, closed with Escape.** Focus returns to the bar's button (Task 3).

---

### Task 1: The record's rules (pure)

**Files:**
- Create: `src/lib/repair-record-detail-rules.ts`, client-safe and pure.
- Modify:
  - `src/lib/repair-record-outlook.ts`: `getRepairCompleteOutlook`.
  - `src/lib/movement-labels.ts`: `getMaintenanceMovementLabel` gains `conditionChange` for `condition_change`.
- Test: new `tests/repair-record-detail-rules.test.ts`, `tests/repair-record-outlook.test.ts`, `tests/maintenance-history-labels.test.ts`.

**Interfaces:**
- Produces in `repair-record-outlook.ts`:
  - `type RepairCompleteRow = { outcome: RepairOutcome; outlook: { kind: "refused"; held: RepairHeld | null } | { kind: "status"; nextStatusName: string; note: { key: "backTo"; holder: string; documentNo: string | null } | { key: "holderStays"; holder: string } | { key: "noHolder" } | { key: "thenDisposal"; holderStays: string | null } } }`;
  - `getRepairCompleteOutlook(facts: RepairAssetFacts, outcome: RepairOutcome): RepairCompleteRow` per G5P3-R1. The record's own open record is ignored, so `hasOpenRecord: false`.
- Produces in `repair-record-detail-rules.ts`:
  - `type RepairDetailRecord = { id: string; repairStatus: string; outcome: string | null; reportedDate: Date; returnDate: Date | null; problem: string; vendorName: string | null; createdBy: string; maintenancePlanId: string | null }`.
  - `repairDurationLine(record, now: Date): { key: "sentDays" | "repairDays" | "sentToday" | "repairToday"; days: number } | null`. Only while open. A vendor gives "sent", internal gives "repair"; 0 days gives "Today".
  - `type RepairNextStep`, with `kind`:
    - `"open"`, carrying `vendorName` and `rows: RepairCompleteRow[]` (usable, then beyond_repair);
    - `"closedUsable"`, carrying `returnDate` and `statusName`;
    - `"closedBeyond"`, carrying `returnDate` and `disposal: { kind: "assetDisposed" } | { kind: "openRequest"; id: string; disposalNo: string } | { kind: "canRequest" }`;
    - `"closedNoOutcome"`, carrying `returnDate`;
    - `"cancelled"`, carrying `cancelledAt: Date | null` and `reason: string | null`.
  - `buildRepairNextStep(input: { record; facts: RepairAssetFacts; openDisposal: { id: string; disposalNo: string } | null; cancel: { at: Date; reason: string | null } | null }): RepairNextStep`.
  - `type RepairHistoryEvent`, one of:
    - `{ kind: "movement"; id; at: Date; labelKey: "create" | "statusUpdate" | "close" | "cancel" | "pmCreate" | "conditionChange" | "fallback"; from: { kind: "status" | "condition" | "text"; value: string } | null; to: …; actor: string | null; reason: string | null }`;
    - `{ kind: "attachments"; key; at: Date; type: string; count: number; actor: string | null }`;
    - `{ kind: "future" }`.
  - `buildRepairHistory(input: { record; movements: Array<{ id; movementType; performedAt: Date; performedBy: string; fromLabel: …; toLabel: …; reason: string | null }>; attachments: Array<{ id; uploadedAt: Date; uploadedBy: string; type: string }>; actorById: Map<string, string> }): RepairHistoryEvent[]`. Oldest first. Attachment runs follow G5P3-R4 and the reason line G5P3-R6. A trailing `future` event appears only while the record is open.
  - `defaultAttachmentType(repairStatus: string): "before_repair" | "after_repair"`: open gives before, else after.

- [ ] **Step 1: Write the failing tests.**
  - Complete outlook (Review Focus 1, 2):
    - an In Use personal asset with a handover `{ documentNo: "HO-1", holderName: "สมชาย" }`, usable → status "In Use", note `backTo` สมชาย HO-1;
    - the same, beyond_repair → refused, with `held.documentNo` "HO-1";
    - an Under Maintenance shared asset with no holder and no handover, usable → status "Ready", note `noHolder`;
    - a personal asset with a custodian and no handover, beyond_repair → status "Pending Disposal", note `thenDisposal` with `holderStays` = the name.
  - Next step:
    - open, vendor "ศูนย์ Lenovo" → kind open with two rows;
    - closed usable → `closedUsable`;
    - closed beyond_repair with an asset status Disposed → disposal `assetDisposed`;
    - with an open request → `openRequest`;
    - with neither → `canRequest`;
    - closed with outcome null → `closedNoOutcome`;
    - cancelled with a movement reason "บันทึกผิดเครื่อง" → `cancelled` with that reason.
  - Duration: open with a vendor, reported 2026-11-01T02:00Z, now 2026-11-02T17:30Z → `{ key: "sentDays", days: 2 }`; internal, same day → `repairToday`; closed → null.
  - History (Review Focus 3): 12 `before_repair` attachments by u1 within 1 minute, one `invoice` by u2 → two attachment events with counts 12 and 1, oldest first.
    - A movement whose reason equals the problem → `reason: null`.
    - `condition_change` → `labelKey: "conditionChange"`.
    - Open → the last event is `future`; closed → no future.
  - Labels: `getMaintenanceMovementLabel("condition_change", labels)` → `labels.conditionChange`.
- [ ] **Step 2: Run** `npx tsx --test tests/repair-record-detail-rules.test.ts tests/repair-record-outlook.test.ts tests/maintenance-history-labels.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and eslint on the changed files.
- [ ] **Step 5: Commit** `feat(maintenance): the repair record's rules: what ซ่อมเสร็จ will do, the next step, the day count and the history (group 5 plan 3)`

### Task 2: The page's reads and the asset panel

**Files:**
- Modify: `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`. It reads:
  - the facts (`loadRepairAssetFacts(prisma as unknown as RepairAssetFactsDb, ticket.asset.id)`);
  - movements oldest first;
  - attachments;
  - the actors (G5P3-R3);
  - the asset's open disposal request (G5P3-R7);
  - the cancel movement (G5P3-R5);
  - the count of the asset's active records.

  The data then goes to Task 1's builders.
- Create: `src/components/maintenance/repair-record-asset-panel.tsx` (G5P3-R10, server-safe).
- Test: `tests/repair-record-detail-ui.test.ts` (source pins), `tests/repair-record-asset-panel.test.ts` or the same file.

**Interfaces:**
- Consumes: Task 1.
- Produces: `RepairRecordAssetPanel({ facts, locale, recordCount, returnTo })`. The page passes `nextStep`, `history`, `duration` and `canEdit / canCreate / canAttach / canCreateDisposal / canReturn` to Task 3's parts.

- [ ] **Step 1: Write the failing pins.**
  - The page calls `loadRepairAssetFacts(`, `buildRepairNextStep(`, `buildRepairHistory(` and `repairDurationLine(`.
  - Movements are read with `orderBy: { performedAt: "asc" }`.
  - One `user.findMany` reads the actors.
  - The disposal read uses `openDisposalRequestWhere`.
  - The asset panel renders `StatusBadge` for the status and the link with `/maintenance?assetId=`.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Keep the legacy panel, the disposal-review panel (on `summarizeAssetRepairs`; its button hidden when the next step offers the request; its link text "ยื่นคำขอตัดจำหน่าย"), the PM plan line, the print link and `returnTo` (Appendix A "Record").
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and eslint.
- [ ] **Step 5: Commit** `feat(maintenance): the record page reads the asset facts, actors, attachments and disposal request once, and the asset panel (group 5 plan 3)`

### Task 3: Header, next-step card, details, history, the dialog owner and the phone bar

**Files:**
- Modify:
  - `src/components/maintenance/repair-record-actions.tsx`, which becomes `RepairRecordActionsProvider` plus `useRepairRecordActions` (G5P3-R2). Its three dialogs keep their fields and ids, except:
    - G5P3-R9 in the complete dialog;
    - `editHelp` reworded (§13).
  - `src/app/[locale]/(dashboard)/maintenance/[id]/page.tsx`:
    - **header:** the meta "แจ้งซ่อม {date} · ส่งซ่อมมา N วัน" (or the closed or cancelled date); actions back, "อื่น ๆ", พิมพ์, and ซ่อมเสร็จ while open and with edit;
    - **details:** name first, code under it; "รอกดซ่อมเสร็จ" while open; "ยังไม่ระบุ" for an empty cost or invoice;
    - **history:** oldest first, with actor, badges, the hollow future step and short dates on the phone.
- Create:
  - `src/components/maintenance/repair-next-step-card.tsx`: every state of spec §8.2, as follows.
    - **The open table:** one row per `RepairCompleteRow`, with `RepairHeldNotice` (รับคืน when `canReturn`) for a refused row.
    - **The buttons:**
      - ซ่อมเสร็จ (edit; it opens the provider's dialog);
      - แนบรูปก่อนซ่อม (`#attachments`, when the person may upload);
      - เปิดหน้าทรัพย์สิน.
    - **Create-only:** no ซ่อมเสร็จ, and the line "ผู้มีสิทธิ์แก้ไขบันทึกซ่อมเป็นผู้กดซ่อมเสร็จ". **A viewer** sees the table and เปิดหน้าทรัพย์สิน only.
    - **On the phone:** the compact form of §8.6, with no buttons inside.
  - `src/components/maintenance/repair-record-header-actions.tsx`: ซ่อมเสร็จ and the "อื่น ๆ" `DropdownMenu` (แก้ไขรายละเอียด; separator; ยกเลิกบันทึก, destructive, open only). The menu is hidden when empty.
  - `src/components/maintenance/repair-record-phone-bar.tsx`: G5P3-R8.
- Messages through `<scratchpad>/g5/msg/p3-detail.json`: spec §13 "repairRecord (detail)", every value verbatim, under `repairRecord.detail.*`. Add `detail.assetDisposed`. Remove keys no reader keeps.
- Test: `tests/repair-record-detail-ui.test.ts`, `tests/repair-record-ui.test.ts` (dialog pins), `tests/v-track2-m.test.ts` and any pin of the old header buttons.

**Interfaces:**
- Consumes: Task 1 (`RepairNextStep`, `RepairHistoryEvent`, `RepairCompleteRow`), Task 2's page data, plan 2's `RepairHeldNotice`.
- Produces:
  - `RepairRecordActionsProvider({ recordId, repairNo, expectedUpdatedAt, isOpen, details, conditionOptions, initialConditionId, held: RepairHeld | null, assetId, locale, canReturn, todayKey, children })`;
  - `useRepairRecordActions()`.

- [ ] **Step 1: Write the failing pins.**
  - The complete dialog has no `outcome: "usable"` default and has an `outcome` required error.
  - It renders `RepairHeldNotice` for beyond_repair when `held`.
  - The date has `max`.
  - The header has no visible danger cancel button. Cancel sits in a `DropdownMenu`, and no `AccessibleDialog` sits inside `DropdownMenuContent`.
  - `ActionBar` gets `primaryAction` and `more`.
  - The card has `data-repair-next-step`, and the history items have `data-repair-history-event`.
  - The movements map runs in ascending order.
  - Th values: `repairRecord.detail.nextOpenVendor` is `ขั้นถัดไป: เมื่อรับเครื่องคืนจาก {vendor} แล้ว กด "ซ่อมเสร็จ"`, and the attachment words match §13.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.** Review Focus 4 and 5 hold: create-only sees no ซ่อมเสร็จ, and focus returns to the opener.
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit`, eslint and `npx playwright test --list e2e/repair`.
- [ ] **Step 5: Commit** `feat(maintenance): the repair record's next-step card, the อื่น ๆ menu, one dialog owner, the history oldest first and the phone bar (group 5 plan 3)`

### Task 4: Attachments

**Files:**
- Modify:
  - `src/components/maintenance/maintenance-attachments.tsx`:
    - the head count "{count} ไฟล์";
    - groups by type with small thumbnails (open the preview dialog; a PDF or other file as a named tile; download and delete in the preview);
    - the type select defaults to `defaultAttachmentType(repairStatus)`, with the hint "ตั้งเป็น{type}ไว้ให้ เพราะบันทึกยังไม่ซ่อมเสร็จ" / "…เพราะซ่อมเสร็จแล้ว";
    - the drop zone reads "ถ่ายรูปหรือแนบใบเสร็จ"; on the phone `capture="environment"` only while the chosen type is a photo type;
    - the empty text "ยังไม่มีไฟล์แนบ";
    - the notice for an uploader who cannot delete: "ลบไฟล์ได้เฉพาะผู้มีสิทธิ์แก้ไขบันทึกซ่อม ถ้าแนบผิดให้แจ้งผู้มีสิทธิ์" (Review Focus 4).
  - The page passes `repairStatus`.
- Messages through `<scratchpad>/g5/msg/p3-attachments.json` (spec §13 "maintenancePage" attachment words; `closedEvidenceAppendOnlyHelp` reworded).
- Test: `tests/maintenance-attachments-ui.test.ts`, `tests/file-evidence-ui.test.ts` if it pins this file.

**Interfaces:**
- Consumes: `defaultAttachmentType` (Task 1).

- [ ] **Step 1: Write the failing pins.**
  - The default type comes from `defaultAttachmentType(`.
  - `capture` is set only for photo types.
  - No "ใบงาน" in the notice.
  - The thumbnails open `AttachmentPreviewDialog`.
  - Th `maintenancePage.closedEvidenceAppendOnlyHelp` matches §13.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** the focused tests, `npm test`, `npx tsc --noEmit` and eslint.
- [ ] **Step 5: Commit** `feat(maintenance): the record's attachments typed by its state, thumbnails, the phone camera and the uploader's notice (group 5 plan 3)`

### Task 5: E2E

**Files:**
- Modify:
  - `e2e/repair/repair-data.ts`:
    - `completeRecord` opens ซ่อมเสร็จ from the header on the desktop or from the bar on the phone. It checks that no result is pre-checked, then picks one.
    - New `openRecordMenu(page)` opens "อื่น ๆ" on the desktop or "เพิ่มเติม" on the phone.
  - `e2e/repair/repair-record.spec.ts`:
    - ER1–ER3 read the next-step card (`data-repair-next-step="open"`, the ใช้งานได้ row's next status);
    - edit and cancel go through the menu;
    - the history is oldest first (the first event is "บันทึกซ่อม");
    - the asset panel's ผู้ถือครอง reads the name (no code).
  - `e2e/repair/pm-plan.spec.ts`: its record checks follow the new page.
  - `e2e/transactions/handover-condition.spec.ts`: its record steps follow the new page.
- Create, in `e2e/repair/repair-record.spec.ts`, **"a held asset's repair: refused at ซ่อมไม่ได้, returned into ส่งซ่อม, then closed beyond repair with the disposal step"** (IT staff, desktop projects; phones check the card only). Spec §16, Review Focus 2:
  1. Create a personal asset and hand it over (`handOverPermanently`). Open an unfinished record through the form (In Use → อยู่ระหว่างซ่อม).
  2. On the record, the card's ซ่อมไม่ได้ row shows `data-repair-held` with the HO-. In the complete dialog, ซ่อมไม่ได้ shows the same refusal.
  3. "รับคืน" opens the check-in with that handover. Return it with ส่งซ่อม; it joins the open record. Reuse `e2e/transactions` helpers if they exist, else drive the page.
  4. Back on the record, the ซ่อมไม่ได้ row reads "รอตัดจำหน่าย". Complete it as ซ่อมไม่ได้. The card turns `closedBeyond` with "ยื่นคำขอตัดจำหน่าย" (IT staff have `disposal:create`).
- Pins in `tests/e2e-repair.test.ts`.

- [ ] **Step 1: Write the failing pins.** **Step 2: Run** them. **Step 3: Implement.** **Step 4: Run** the pins, `npx playwright test --list e2e/repair e2e/transactions`, `npm test`, `npx tsc --noEmit` and eslint. **Step 5: Commit** `test(e2e): the repair record's next step, menu, history, and a held asset's repair through the return to the disposal step (group 5 plan 3)`

### Task 6: Docs, the targeted E2E and the look step (controller)

**Docs:**
- `docs/06_WORKFLOWS.md`, `docs/17_REPAIR_RECORD_GUIDE_TH.md`, `docs/07_UAT_CHECKLIST.md`, `docs/11_FEATURE_LIST.md`, `DESIGN.md` and `docs/14_UI_UX_DESIGN_SYSTEM.md` (the dialog owner pattern), `docs/99_CHANGELOG.md`, `DEVELOPER_HANDOFF.md`.
- The wiki: status, open questions, log, then lint.

**E2E on the dev DB** (VPN probe, keep-awake), 4 projects: `e2e/repair`, `e2e/transactions/handover-condition.spec.ts`, `e2e/transactions/return.spec.ts`, `e2e/smoke`.

**Look step:** the record at 1440, 1024 and 390, in both themes:
- open with a vendor;
- open internal;
- open held;
- closed usable;
- closed beyond repair (with and without an open request);
- cancelled;
- a create-only view;
- the complete dialog with no result.

**Dry run:** none. No migration and no Production data. The page and its specs run on the dev DB.
