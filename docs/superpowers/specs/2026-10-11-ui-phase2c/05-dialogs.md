> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2c-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** (I1–I36) · ตัวเลขและบรรทัดอ้างที่ `master` `5ffee76`

## 5. dialog และ sheet

เจ้าของไฟล์: `src/components/ui/{accessible-dialog.tsx,dialog.tsx,sheet.tsx,alert-dialog.tsx,confirm-text-dialog.tsx,operation-review-dialog.tsx}` (O10) และส่วนหัว ส่วนท้าย ปุ่มปิด และคำอธิบายของ dialog ทุกตัว

ส่วนนี้ทำ 4 อย่าง:
- เพิ่ม part ของ `AccessibleDialog` (K9) แล้วย้าย dialog 23 จุดใน 19 ไฟล์ไปใช้ ตาม batch
- ปุ่ม X ของ dialog และ sheet เป็น `Button` และอ่านว่า "ปิด" (K10)
- ส่วนท้ายทุกแบบเรียงตาม K8 ใช้ขนาดตาม K7 และ `busy` (K13)
- `AlertDialog` / `useConfirm` หน้าตาเดียวกับ dialog อื่น + ป้ายคำกริยา 4 จุด + `maintenance-attachments.tsx:239` เป็น `useConfirm` (K12, batch 5)

ไม่อยู่ในส่วนนี้ (ชี้ไปเจ้าของ แล้วหยุด):
- ช่องกรอกในเนื้อ dialog (`<textarea>` → `Textarea`, `<select>` → `NativeSelect`, `Field` ที่เขียนเองใน `disposal-decision-button.tsx:210`, `disposal-execution-button.tsx:245`, `repair-record-actions.tsx:220`, `system-settings-form.tsx:2328`, legend) → ข้อช่องกรอก
- กล่องแจ้งและบรรทัด error ในเนื้อ dialog (เช่น `transaction-cancel-dialog.tsx:140`, `audit-finding-review-actions.tsx:214`, `:220`) → ข้อกล่องแจ้ง ยกเว้น `zeroEligible` ที่ย้ายออกจากปุ่ม (ข้อ 5.7)
- ปุ่มเปิด dialog (trigger) และ handle `open()`/`hideTrigger` (O6) → ข้อปุ่ม และงาน P0 · ปุ่มในเนื้อ dialog (`system-settings-form.tsx:1416`, `:1425`) → ข้อปุ่ม
- ส่วนท้ายของฟอร์มตรวจนับใน sheet (`audit-scan-check-form.tsx:341-361`) และ `Loader2` `:349` → ข้อปุ่ม (batch 1d)
- `ActionBar` (K23) และแถบบันทึก (K14) → ข้อปุ่มและแถบบันทึก
- `AttachmentPreviewDialog` ได้ปุ่ม X ใหม่จาก `dialog.tsx` อย่างเดียว ไม่แก้ไฟล์

ทุก file:line ในส่วนนี้ตรวจกับโค้ดที่ `5ffee76` แล้ว และอ้างบรรทัดที่เปิด tag (แบบภาคผนวก A ของ `actions.md`) งาน P0 จะเลื่อนบรรทัดใน 3 ไฟล์ trigger (`disposal-decision-button.tsx`, `disposal-execution-button.tsx`, `audit-mark-not-found-button.tsx`) ให้หาจากข้อความแทน path ที่ไม่ขึ้นด้วย `src/` อยู่ใต้ `src/components/`

### 5.1 สภาพตอนนี้

| เรื่อง | ค่าที่ `5ffee76` | ที่มา |
|---|---|---|
| `AccessibleDialog` | 23 จุดใน 19 ไฟล์ · md 14 (ไม่ระบุ 7 + ระบุ 7) · sm 6 · xl 3 · `busy` 22 · `description` 19 · `closeLabel` 8 | grep + `dialogs.md` §3 |
| ส่วนท้ายอยู่ใน `<form>` | 15 dialog (ข้อ 5.5 แถว 1, 2, 6, 8, 10–16, 19–22) · ใช้ `onClick` 8 | อ่านโค้ด |
| ส่วนท้ายเลื่อนหายไปกับเนื้อ | 18 dialog · กล่องเลื่อนในที่เดาความสูง 3 (`transaction-cancel-dialog.tsx:129`, `audit-mark-not-found-button.tsx:101`, `audit-round-cancel-button.tsx:85`) · `sticky bottom-0` 2 (`system-settings-form.tsx:1464`, `disposal-bulk-execution.tsx:939`) | `accessible-dialog.tsx:87` |
| ลำดับปุ่มบนมือถือ | ยกเลิกบน 16 · ปุ่มหลักบน 4 + `useConfirm` · วางคู่ 3 | `dialogs.md` §4.1 |
| ปุ่มยกเลิกที่กดได้ระหว่างบันทึก | 5: `asset-register-table.tsx:757` · `audit-finding-review-actions.tsx:245`, `:394`, `:488` · `maintenance-attachments.tsx:241` | อ่านโค้ด |
| `Loader2` ในปุ่มท้าย | 16 → `busy` · บรรทัดสถานะ 4 + `BusyLabel` (`disposal-bulk-execution.tsx:990`) คงไว้ | `dialogs.md` §7 |
| ปุ่ม X | `dialog.tsx:80` และ `sheet.tsx:82` เขียน class เอง สลับขนาดที่ `sm` · `dialog.tsx:54` / `sheet.tsx:51` ค่าตั้งต้น `"Close"` · `dialog.tsx:120` ปุ่ม "Close" ใน `DialogFooter` (0 ผู้ใช้) | อ่านโค้ด |
| X ที่ชื่อ "ยกเลิก" | `IntegrationClientManager.tsx:395`, `system-settings-form.tsx:1352` | grep |
| `SheetContent` | 7: `asset-evidence-drawer.tsx:70` · `asset-register-filter-sheet.tsx:90` (2B) · `asset-register-row-actions.tsx:175` (2B) · `audit-scan-check-panel.tsx:52` · `audit-scan-room-picker.tsx:59` · `layout/sidebar.tsx:304` · `ui/activity-drawer.tsx:55` | grep |
| `useConfirm()` | 11 hook ใน 11 ไฟล์ · `confirm(` 13 จุด · ใช้ "ยืนยัน" ทั่วไป 4 จุด | grep |

ที่ map เขียนต่างจากโค้ด:
- `dialogs.md` §3 อ้างบรรทัด className แทนบรรทัด tag ในหลายแถว เช่น `IntegrationClientManager.tsx:437/:444` (tag จริง `:433/:441`) · `system-settings-form.tsx:1468/:1476` (`:1465/:1472`) · `audit-mark-not-found-button.tsx:134/:141` (`:130/:138`) · `audit-round-cancel-button.tsx:119/:126` (`:115/:123`) · `audit-scan-component-missing-dialog.tsx:73/:80` (`:69/:77`) · `maintenance-attachments.tsx:244/:251` (`:241/:248`) · `audit-finding-review-actions.tsx:252` (`:248`) · `closeLabel` ของทะเบียนอยู่ `:703` ไม่ใช่ `:702` · `<form` ของ `disposal-bulk-execution` อยู่ `:823` (className `:827`)
- `critic.md` §4 นับ dialog ใน batch 1 เป็น 14 จุด รวม `maintenance-attachments.tsx:239` แต่ K12 ให้แปลงจุดนี้ใน batch 5 · batch 1 จึงเหลือ **13 จุด**

### 5.2 `AccessibleDialog` และ part ใหม่ (`ui/accessible-dialog.tsx`, งาน 2C-0)

```ts
export type AccessibleDialogSize = "sm" | "md" | "lg" | "xl"          // คงเดิม
export const accessibleDialogFormClassName = "flex min-h-0 flex-1 flex-col"

export function AccessibleDialog(props: {
  open: boolean
  title: string
  description?: ReactNode            // K11 (เดิม string) · ใส่ได้แค่ข้อความกับ <span className="tag">
  busy?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
  fallbackFocusRef?: RefObject<HTMLElement | null>
  size?: AccessibleDialogSize
  closeLabel?: string                // ใช้เมื่อต่างจาก "ปิด" จริง ๆ เท่านั้น (ข้อ 5.3)
  onClose: () => void
  children: ReactNode
}): JSX.Element
export function AccessibleDialogBody(props: React.ComponentProps<"div">): JSX.Element
export function AccessibleDialogFooter(props: React.ComponentProps<"div">): JSX.Element
export function AccessibleDialogCancel(
  props: Omit<React.ComponentProps<"button">, "type" | "children"> & { children?: ReactNode },
): JSX.Element
```

- `AccessibleDialog` ส่ง `{ busy, onClose }` ผ่าน React context (ไฟล์เป็น `"use client"` อยู่แล้ว) ให้ `AccessibleDialogCancel`
- `AccessibleDialogCancel` = `<Button variant="outline" disabled={dialog.busy || disabled} onClick={onClick ?? (() => dialog.onClose())} {...props}>{children ?? tCommon("cancel")}</Button>` · ใช้นอก `AccessibleDialog` แล้ว throw `"AccessibleDialogCancel must be used inside <AccessibleDialog>"`
- part เป็นของเลือกใช้ dialog ที่ยังไม่ย้ายยังแสดงได้เหมือนเดิม (ข้อตัดสินย่อย ด2)

class ทั้งหมด (token เดิมทั้งหมด I21):

| ส่วน | class | เปลี่ยนจาก |
|---|---|---|
| กล่อง dialog (`:77`) | `top-auto bottom-[max(0.75rem,env(safe-area-inset-bottom))] flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-lg border-border bg-surface p-0 shadow-overlay sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]` | `bottom-3` → เผื่อขอบล่าง iPhone (`layout.tsx:46` `viewportFit: "cover"`) |
| หัว (`:81`) | `shrink-0 border-b border-border px-4 py-4 pr-16 text-left sm:pl-5` | `px-5` → 16/20 เท่าเนื้อและท้าย · ใช้ `sm:pl-5` ไม่ใช่ `sm:px-5` เพราะ `sm:px-5` จะทับ `pr-16` แล้วหัวเรื่องลอดใต้ X |
| หัวเรื่อง / คำอธิบาย | `text-base font-semibold text-foreground` / `text-sm text-muted-foreground` | คงเดิม |
| ช่องรับ children (`:87`) | `flex min-h-0 flex-1 flex-col overflow-y-auto` | เพิ่ม `flex flex-col` |
| `AccessibleDialogBody` | `min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5` + `className` ของผู้เรียก (ไม่มี gap ตั้งต้น) | ใหม่ |
| `AccessibleDialogFooter` | `flex shrink-0 flex-col gap-2 border-t border-border-soft bg-background px-4 py-3 first:border-t-0 sm:flex-row sm:justify-end sm:px-5` | ใหม่ · `data-slot="accessible-dialog-footer"` · เป็น `<div>` |
| `<form>` ที่ห่อทั้งสอง part | `accessibleDialogFormClassName` | ใหม่ |

ผังที่ใช้ได้ 3 แบบ (ทุกแบบส่วนท้ายอยู่กับที่ เนื้อเลื่อนเอง):

```tsx
// ก. มีฟอร์ม: <form> ห่อทั้งสอง part ปุ่ม submit จึงยังอยู่ใน <form>
<AccessibleDialog …>
  <form onSubmit={…} className={accessibleDialogFormClassName}>
    <AccessibleDialogBody className="space-y-4">…</AccessibleDialogBody>
    <AccessibleDialogFooter>
      <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
      <Button type="submit" busy={saving}><Check aria-hidden="true" />{labels.save}</Button>
    </AccessibleDialogFooter>
  </form>
</AccessibleDialog>
// ข. ไม่มีฟอร์ม: Body + Footer เป็นลูกตรงของ AccessibleDialog (Fragment ได้)
// ค. ไม่มีเนื้อ: Footer อย่างเดียว คำอธิบายอยู่ใน description (first:border-t-0 กันเส้นซ้อนกับหัว)
```

### 5.3 ปุ่ม X และชื่อปุ่มปิด (K10, `ui/dialog.tsx`, `ui/sheet.tsx`, งาน 2C-0)

```tsx
// dialog.tsx (sheet.tsx เหมือนกันแต่ไม่มี disabled)
function DialogContent({ closeLabel: closeLabelProp, closeDisabled = false, showCloseButton = true, … }) {
  const tCommon = useTranslations("common")
  const closeLabel = closeLabelProp ?? tCommon("close")
  …
  {showCloseButton && (
    <DialogPrimitive.Close asChild>
      <Button variant="ghost" size="icon" className="absolute top-3 right-3" aria-label={closeLabel} title={closeLabel} disabled={closeDisabled}>
        <XIcon aria-hidden="true" />
      </Button>
    </DialogPrimitive.Close>
  )}
```

- X สูง 44 ใต้ `md` และ 40 ตั้งแต่ `md` (`sizeIcon`, `button-variants.ts:76`) · ไม่มี `opacity` · ไม่สลับที่ `sm` อีก
- ระหว่าง busy ได้หน้าตาปุ่มที่กดไม่ได้ของ 2A (ขอบ `border` พื้น `background` X สี faint)
- `DialogFooter` (0 ผู้ใช้): ตัด `showCloseButton` และปุ่ม "Close" (`dialog.tsx:118-122`) · class เป็น `flex flex-col gap-2 sm:flex-row sm:justify-end` (K8)
- ไม่ส่ง `closeLabel` เมื่อค่าคือ "ปิด":

| จุด | ตอนนี้ | หลังแก้ | batch |
|---|---|---|---|
| `IntegrationClientManager.tsx:395` | `labels.cancel` ("ยกเลิก") | ลบ | 4 |
| `system-settings-form.tsx:1352` | `labels.cancel` | ลบ | 1f |
| `asset-component-manager.tsx:563` | `labels.close` (= `tCommon("close")`, `assets/[id]/components/page.tsx:126`) | ลบ | 1e |
| `asset-register-table.tsx:703` | `labels.close` (`assets/page.tsx:397`) | ลบ | 4 |
| `disposal-bulk-approval.tsx:539` | `copy.close` ("ปิด", `disposalPage.bulkClose`) | ลบ | 3 |
| `disposal-bulk-execution.tsx:818` | `previewing ? copy.cancelPreview : copy.close` | **คงไว้** (ระหว่างตรวจสอบ X คือ "ยกเลิกการตรวจสอบ") | — |
| `ui/confirm-text-dialog.tsx:17`, `ui/operation-review-dialog.tsx:15` | `closeLabel: string` บังคับ | เป็น `closeLabel?: string` ส่งต่อตรง ๆ · ผู้เรียก 4 จุดลบ `closeLabel={tCommon("close")}` (`checkin-form.tsx:578`, `checkout-form.tsx:342`, `transfer-form.tsx:158` ใน 1b · `audit-findings-batch-actions.tsx:131` ใน 3) | 1b, 3 |
| sheet 4 จุดของ 2C ที่ส่ง `tCommon("close")` | `asset-evidence-drawer.tsx:72` · `audit-scan-check-panel.tsx:54` · `audit-scan-room-picker.tsx:61` · `ui/activity-drawer.tsx:57` | ลบ | 3, 4 |

`asset-register-filter-sheet.tsx:92` และ `asset-register-row-actions.tsx:177` เป็นไฟล์ของ 2B ส่งค่าเดิมต่อได้ ไม่มีผล

### 5.4 กติกาส่วนท้าย (ใช้กับทุก dialog ในข้อ 5.5)

| เรื่อง | กติกา | ที่มา |
|---|---|---|
| ลำดับ | DOM = ลำดับบนจอ = ลำดับ Tab: ปุ่มรองก่อน ปุ่มหลักท้าย · มือถือเรียงลงเต็มความกว้าง (ยกเลิกบน ปุ่มหลักล่าง) · ตั้งแต่ `sm` เป็นแถวชิดขวา | K8 |
| ขนาด | ไม่ใส่ `size` (= `default`: ต่ำกว่า `md` สูงอย่างน้อย 44 · `md` ขึ้นไป 40 · หลัง 2D 36) · ปุ่มท้ายที่วันนี้สูง 44 ทุกความกว้าง (แบบ a, c, g และ bulk) เตี้ยลงเหลือ 40 บนจอใหญ่ · ปุ่ม `h-10` ของทะเบียน (`:757`, `:764`) สูงขึ้นเป็น 44 บนมือถือ | K7 |
| ปุ่มรอง | `AccessibleDialogCancel` (= `outline`) ทุก dialog · ปุ่มรองอื่น (ลองใหม่) `variant="outline"` | DESIGN.md:349 (ghost บนพื้น `background` มองไม่เห็นตอน hover) |
| ปุ่มหลัก | `default` · ยืนยันการกระทำที่ทำลายข้อมูล `destructive` · 2 ปุ่ม "ไม่พบ" ของตรวจนับ `warning` · ยืนยันที่ย้อนไม่ได้แต่ไม่ใช่การลบ (ตัดจำหน่ายจริง) คง `default` | D6, K22 |
| busy | ปุ่มที่เริ่มงาน `busy={x}` · ลบ `x` ออกจาก `disabled` ของปุ่มเดียวกัน · `disabled` เหลือแค่เงื่อนไขตรวจกรอก · ข้อความคงเดิม (ไม่สลับเป็น "กำลัง…") · ไอคอนนำหน้าเดิมคงไว้ (spinner จะแทนที่) · ไม่มี `Loader2` เขียนเองในส่วนท้าย | K13, 2A ข้อ 4.5 |
| ปุ่มที่ทำงานอยู่ต้องอยู่ที่เดิม | ปุ่มที่ผู้ใช้กดค้างอยู่บนจอพร้อม `busy` จนงานจบ ไม่ซ่อนแล้วใส่บรรทัดสถานะแทน (โฟกัสจึงไม่หลุดไป body) | ข้อตัดสินย่อย ด15 |
| ยกเลิกระหว่าง busy | `AccessibleDialogCancel` กดไม่ได้เองเมื่อ `AccessibleDialog busy` · X กดไม่ได้อยู่แล้ว (`closeDisabled={busy}`) | K9, K10 |
| ข้อความยาว | `Button` เป็น `whitespace-nowrap` · ป้ายปุ่มท้ายยาวไม่เกิน 40 ตัวอักษร (นับ code point) ทั้งไทยและอังกฤษ · ห้ามใส่ `whitespace-normal` ในส่วนท้าย · ประโยคย้ายไปเนื้อ dialog เป็น `Notice` | ข้อ 5.7 |
| ใน `<AccessibleDialogFooter>` | มีแต่ `Button` / `AccessibleDialogCancel` · ไม่มี `<button`, `<Loader2`, `className=`, `size="`, `opacity-` | guard ข้อ 5.11 |

### 5.5 dialog ทีละตัว (23 จุด)

เลขแถวตรงกับ `dialogs.md` §3 · "ก/ข/ค" คือผังในข้อ 5.2 · ปุ่มเรียงตาม DOM · ไอคอนในวงเล็บคือไอคอนนำหน้าเดิมที่คงไว้

| # | ที่ (`5ffee76`) | batch | ผัง · Body | ส่วนท้าย | busy / disabled ของปุ่มหลัก | อื่น ๆ |
|---|---|---|---|---|---|---|
| 1 | `admin/asset-state-review-dialog.tsx:38` (form `:46`, ท้าย `:99`) | 4 | ก · `space-y-4` | Cancel `{labels.cancel}` → `Button type="submit" variant={mode === "dismiss" ? "destructive" : "default"}` | `busy={busy}` · `disabled={reason.trim().length < 10}` | `ActionButton` ×2 (`:100-101`) → `Button` แล้วลบ import `:5` · ตัด `busy ? labels.saving` (`:102`, K13) |
| 2 | `admin/IntegrationClientManager.tsx:389` (form `:399`, ท้าย `:432`) | 4 | ก · `grid gap-4` (รวม `p-5` กับ div `:400`) | Cancel `{labels.cancel}` → submit (`Pencil`) `{labels.saveScopes}` | `busy={updatingClient}` · `disabled={editScopes.length === 0}` | ลบ `closeLabel` `:395` · `description` `:392` เป็น tag · `{editingClient ? <form…> : null}` คงไว้ |
| 3 | `admin/system-settings-form.tsx:1347` (เนื้อ `:1357`, ท้าย `:1464`) | 1f | ข **ห้ามมี `<form>`** (ข้อ 5.6) · `space-y-4` | Cancel `{labels.cancel}` → `Button onClick={applyPrefixEditor}` (`Save`) `{labels.savePrefixGroup}` | ไม่มี busy · `disabled={!canApplyPrefixEditor}` | ลบ `closeLabel` `:1352` · `sticky` `:1464` หายไป |
| 4 | `asset-operations/transaction-cancel-dialog.tsx:128` (เนื้อ `:129`, ท้าย `:154`) | 4 | ข · Body แทนกล่อง `max-h-[calc(100dvh-12rem)]` `:129` (ไม่มี className) | Cancel `{labels.cancel}` → `Button variant="destructive" onClick={() => void submitCancellation()}` `{labels.confirm}` | `busy={saving}` · `disabled={loading \|\| blockers.length > 0}` | บรรทัดสถานะ `:131` คงไว้ |
| 5 | `assets/asset-component-manager.tsx:557` (เนื้อ `:569`, ท้าย `:576`) | 1e | ข · `space-y-4` | Cancel `{labels.cancel}` → `Button variant="destructive"` (`Trash2`) `{labels.confirmRemove}` | `busy={busy}` | ลบ `closeLabel` `:563` · ตัด `busy ? labels.removing` (`:580`) · description `:560` = `<><span className="tag">{assetTag}</span> · {name}</>` · คง `FileDropzone file={removeEvidence}` (`:574`) |
| 6 | `assets/asset-register-table.tsx:697` (form `:706`, ท้าย `:756`) | 4 | ก · `space-y-4` | Cancel `{labels.cancel}` → submit `{labels.applyBulkUpdate}` | `busy={bulkSaving}` · `disabled={!bulkForm.toLocationId && !bulkForm.toCustodianId}` | ลบ `closeLabel` `:703` · ยกเลิกกดไม่ได้ระหว่างบันทึก (แก้) · ปุ่ม 40px บนมือถือ (`h-10`) กลับเป็น 44 · แก้เฉพาะ `:697-774` (O1) |
| 7 | `audit/audit-finding-review-actions.tsx:202` (เนื้อ `:203`, ท้าย `:244`) | 1d | ข · `space-y-4` | Cancel → `Button variant={action === "approve" ? "default" : "destructive"} onClick={() => submit(Boolean(conflict))}` (`Check` / `X`) | `busy={reviewing}` | ยกเลิกกดไม่ได้ระหว่างบันทึก (แก้) · ป้ายสลับ `reviewConfirmConflict` คงไว้ (ไม่ใช่ป้ายตอน busy) |
| 8 | `…/audit-finding-review-actions.tsx:345` (form `:347`, ท้าย `:393`) | 1d | ก · `grid gap-4` (รวม `p-5` `:346`) | Cancel → submit (`Check`) `{tCommon("save")}` | `busy={saving}` | ยกเลิกกดไม่ได้ระหว่างบันทึก (แก้) |
| 9 | `…/audit-finding-review-actions.tsx:461` (เนื้อ `:462`, ท้าย `:487`) | 1d | ข · `space-y-4` | Cancel → `Button onClick={closeFinding}` (`Check`) `{t("closeFinding")}` | `busy={saving}` · `disabled={uploadedCount === 0}` | ยกเลิกกดไม่ได้ระหว่างบันทึก (แก้) |
| 10 | `audit/audit-mark-not-found-button.tsx:92` (form `:100`, ท้าย `:129`) | 1d | ก · `space-y-4` แทน `max-h-[calc(92dvh-9rem)]` `:101` | Cancel `{tCommon("cancel")}` → `Button type="submit" variant="warning"` (`AlertTriangle`) `{t("notFoundConfirm")}` | `busy={saving}` | คง `onSubmit={handleSubmit}` (test) |
| 11 | `audit/audit-round-cancel-button.tsx:76` (form `:84`, ท้าย `:114`) | 3 | ก · `space-y-4` แทน `max-h-[calc(92dvh-10rem)]` `:85` | Cancel → `Button type="submit" variant="destructive"` (`AlertTriangle`) `{t("cancelConfirm")}` | `busy={saving}` | — |
| 12 | `audit/audit-scan-component-missing-dialog.tsx:34` (form `:44`, ท้าย `:68`) | 1d | ก · `grid gap-3` (form `p-4` → `accessibleDialogFormClassName`) | Cancel → `Button type="submit" variant="warning"` (`AlertTriangle`) `{t("componentMissingConfirm")}` | `busy={saving}` | `onClick={onCancel}` ไม่ต้องส่ง (context เรียก `onClose` ที่กันตอน saving อยู่แล้ว) |
| 13 | `disposal/disposal-bulk-approval.tsx:533` (form `:544`, ท้าย `:556`) | 3 | ก · `space-y-5` | Cancel `{dialogState === "result" ? copy.close : copy.cancel}` → [`preview` และมี `error`] `Button variant="outline" onClick={() => void commit()}` `{copy.retry}` → [`preview` หรือ `committing`] submit (`CheckSquare2`) `{formatCopy(copy.confirmApproval, …)}` | submit `busy={dialogState === "committing"}` · `disabled={eligible.length === 0}` · retry `disabled={eligible.length === 0}` | ลบ `closeLabel` `:539` · คง `data-disposal-bulk-dialog="true"` บน `<form>` |
| 14 | `disposal/disposal-bulk-execution.tsx:812` (form `:823`, ท้าย `:939`) | 3 | ก · `space-y-5` (`sm:px-6` → 20 ตาม part) | Cancel `{previewing ? copy.cancelPreview : dialogState === "result" ? copy.close : copy.cancel}` → [`review` หรือ `previewing`] submit `{format(copy.confirm, { count: reviewedItems.length })}` → [`preview` หรือ `committing`] submit `{format(copy.confirm, { count: eligible.length })}` → [`result` และยังค้าง] `Button onClick={retry}` `{copy.retry}` | ปุ่มแรก `busy={previewing}` `disabled={!hasSharedValues}` · ปุ่มที่สอง `busy={committing}` `disabled={eligible.length === 0 \|\| !permanentConfirmed}` | คง `closeLabel` `:818`, `aria-busy={busy}` และ `data-disposal-bulk-dialog` บน `<form>` · ลบ `<footer>` sticky `:939` และ div "กำลังบันทึก" `:970` (สถานะอยู่ใน `aria-live` `:830` แล้ว) · ยกเลิกแสดงแบบกดไม่ได้ระหว่าง `committing` แทนการซ่อน · `copy.zeroEligible` ย้ายออกจากปุ่ม (ข้อ 5.7) |
| 15 | `disposal/disposal-decision-button.tsx:157` (form `:167`, ท้าย `:197`) | 1c | ก · `grid grid-cols-1 gap-5 md:grid-cols-2` | Cancel → submit (`CheckCircle2`) `{t("saveDecision")}` | `busy={saving}` · `disabled={rejectionReasonRequired && !values.approvalRemark.trim()}` | description `:160` = `<span className="tag">{disposalNo}</span>` · ตัด `md:col-span-2` ของแถวปุ่ม · ปุ่มหลักคง `default` แม้เลือก "ไม่อนุมัติ" |
| 16 | `disposal/disposal-execution-button.tsx:212` (form `:222`, ท้าย `:235`) | 1c | ก · เหมือนแถว 15 | Cancel → submit (`CheckCircle2`) `{values.useHistoricalEvidenceException ? t("confirmHistoricalEvidenceException") : t("saveExecution")}` | `busy={saving}` · `disabled={evidenceBlocked \|\| historicalInputInvalid}` (ตัด `saving` ออกจาก `submitDisabled` `:205`) | description `:215` เป็น tag |
| 17 | `maintenance/maintenance-attachments.tsx:239` (ท้าย `:240`) | **5** | ลบ dialog → `useConfirm` (ข้อ 5.9) | — | — | batch 1a ห้ามแตะ `:239-256` |
| 18 | `maintenance/maintenance-plan-state-actions.tsx:60` (ท้าย `:67`) | 3 | ค · Footer อย่างเดียว | Cancel → `Button variant={pendingAction === "end" ? "destructive" : "default"} onClick={submitAction}` `{pendingAction ? t(\`pmActions.${pendingAction}\`) : null}` | `busy={saving}` | ป้าย "ยืนยัน" (`:72`) → คำกริยาจาก key เดิม "พักแผน" / "เปิดใช้งานต่อ" / "จบแผน" · คง `AccessibleDialog` (K12) |
| 19 | `maintenance/repair-record-actions.tsx:107` (form `:108`) | 1a | ก · `space-y-4` | Cancel `{tCommon("back")}` → submit (`CheckCircle2`) `{t("complete")}` | `busy={saving}` | description เป็น tag · ลบ `DialogButtons` (`:232-241`, ใช้ที่ `:153`, `:213`) |
| 20 | `…/repair-record-actions.tsx:157` (form `:158`, ท้าย `:169`) | 1a | ก · `space-y-4` | Cancel `{t("keep")}` → `Button type="submit" variant="destructive"` (`XCircle`) `{t("confirmCancel")}` | `busy={saving}` | description เป็น tag |
| 21 | `…/repair-record-actions.tsx:178` (form `:179`) | 1a | ก · `space-y-4` | Cancel `{tCommon("back")}` → submit (`CheckCircle2`) `{tCommon("save")}` | `busy={saving}` | description เป็น tag · `secondaryButton` (`:21`) เหลือผู้ใช้แค่ trigger `:103` (ข้อปุ่ม) |
| 22 | `ui/confirm-text-dialog.tsx:31` (form `:70`, ท้าย `:84`) | 3 | ก · ไม่มี className | Cancel `{cancelLabel}` → `Button type="submit" variant={confirmVariantByTone[tone]}` `{confirmLabel}` | `busy={busy}` (ลบ `disabled={busy}` `:85-86`) | `onClick={onClose}` ของยกเลิกไม่ต้องส่ง · `closeLabel?` |
| 23 | `ui/operation-review-dialog.tsx:36` (เนื้อ `:46`, ท้าย `:54`) | 1b | ข · `className="py-2"` ห่อ `<dl className="divide-y divide-border">` | Cancel `{cancelLabel}` → `Button ref={confirmButtonRef} onClick={onConfirm}` `{confirmLabel}` | `busy={busy}` | โฟกัสค้างบนปุ่มยืนยันระหว่างบันทึก (เดิม `disabled` ทำโฟกัสหลุด) · `closeLabel?` |

สรุป: ผัง ก 15 · ข 6 · ค 1 · ลบ 1 · `destructive` 4 คงที่ + 4 ตามเงื่อนไข (แถว 1, 7, 18, 22) · `warning` 2 + 1 ตามเงื่อนไข (แถว 22) · คำอธิบายที่เป็นรหัส → tag 7 dialog (แถว 2, 5, 15, 16, 19–21) · ยกเลิกที่ข้าม busy แก้ 4 dialog (แถว 6–9) · ตัดป้ายสลับตอน busy 2 จุด (แถว 1, 5) · กล่องเลื่อนเดาความสูง 3 และ `sticky` 2 หายหมด

### 5.6 dialog คำนำหน้ารหัสที่อยู่ใน `<form>` ของหน้าตั้งค่า (P13 · ความเสี่ยง R4 ของ critic)

`system-settings-form.tsx:1347` render ใน `<form onSubmit={handleSubmit}>` `:936` ของหน้าตั้งค่า เป็น dialog เดียวที่เป็นแบบนี้ DOM ของ dialog อยู่ใน portal แต่ React ส่ง event `submit` ขึ้นตาม tree ของ component หลักฐานในโค้ด: `disposal-bulk-approval.tsx:340-343` ต้องดัก submit ของ form ใน dialog ตัวเองที่ wrapper ของหน้า

กติกา (batch 1f):
- dialog นี้**ไม่มี `<form>`** ใช้ผัง ข
- ปุ่มทุกตัวเป็น `type="button"` (ค่าตั้งต้นของ `Button`) · ห้าม `type="submit"` และห้าม `form=` ชี้ไปฟอร์มตั้งค่า
- Enter ในช่องคำนำหน้า (`:1360`) และช่องค้นหาหมวดหมู่ไม่ทำอะไร เหมือนตอนนี้ (ช่องใน portal ไม่มี form owner) · ถ้าวันหลังอยากให้ Enter บันทึกกลุ่ม ให้ใช้ `onKeyDown` ที่เรียก `event.preventDefault()` แล้ว `applyPrefixEditor()` ห้ามเพิ่ม `<form>`
- test ใหม่ข้อ 5.11 (ข้อ D) ตรวจทั้ง 3 ข้อ · ตรวจบนแอป dev: เปิด dialog กด Enter ในช่องคำนำหน้า แล้วดูว่าหน้าตั้งค่าไม่ถูกบันทึก (ไม่มี request `PUT`/`POST` ของตั้งค่าและไม่มี toast)

### 5.7 ข้อความไทยยาวในปุ่มที่ไม่ตัดบรรทัด

ความกว้างที่ปุ่มใช้ได้ (คำนวณจาก class): มือถือ 375 = 375 − 24 (`w-[calc(100%-1.5rem)]`) − 32 (`px-4`) = **319px** ต่อปุ่ม (เรียงลง) · ที่ 640 กับ dialog `md`/`xl` = 640 − 24 − 40 = 576px ต่อแถว · dialog `sm` ตั้งแต่ 640 = 512 − 40 = 472px ต่อแถว

| ป้าย (th / en) | ตัวอักษร | ที่ | ผล |
|---|---|---|---|
| `disposalPage.bulkExecutionZeroEligible` "ไม่มีคำขอตัดจำหน่ายที่อนุมัติแล้วซึ่งดำเนินการได้ด้วยข้อมูลร่วมนี้" / "No approved disposal requests …" | 66 / 71 | `disposal-bulk-execution.tsx:965` เป็นป้ายปุ่ม submit ตอนไม่มีรายการ | **ล้น** → ย้ายเป็น `<Notice tone="warning" role="alert">{copy.zeroEligible}</Notice>` ในเนื้อ เมื่อ `dialogState === "preview" && eligible.length === 0` (แบบเดียวกับ `disposal-bulk-approval.tsx:551`) · ปุ่มใช้ `format(copy.confirm, { count: eligible.length })` และกดไม่ได้ |
| `disposalPage.confirmHistoricalEvidenceException` | 30 / 37 | แถว 16 | ผ่านที่ 375 · อังกฤษใกล้ขอบที่ความกว้าง 320 (ความเสี่ยง 8) |
| `disposalPage.bulkExecutionRetry` "ลองใหม่เฉพาะรายการที่ยังไม่สำเร็จ" | 33 / 22 | แถว 14 | ผ่าน |
| `disposalPage.bulkExecutionConfirm` / `bulkConfirmApproval` + จำนวน 3 หลัก | 30 / 30 | แถว 13, 14 | ผ่าน |
| ป้ายอื่นในข้อ 5.5 | ≤ 21 / ≤ 25 | — | ผ่าน |

ส่วนท้ายที่มี 3 ปุ่ม (แถว 13 ตอนมี error, แถว 14 ไม่เกิน 2 ปุ่มต่อสถานะ) อยู่ใน dialog `xl` จึงพอที่ 576px

### 5.8 Sheet (7 จุด)

แก้ที่ primitive `ui/sheet.tsx` ในงาน 2C-0:

| ส่วน | class ใหม่ | เปลี่ยนจาก |
|---|---|---|
| `SheetContent` base (`:64`) | `fixed z-50 flex flex-col gap-4 bg-surface shadow-overlay outline-none transition ease-out data-[state=closed]:animate-out data-[state=closed]:duration-200 data-[state=open]:animate-in data-[state=open]:duration-250 motion-reduce:transition-none motion-reduce:animate-none!` | `bg-background` → `bg-surface` (ข้อตัดสินย่อย ด10) |
| `side="bottom"` (`:72`) | `inset-x-0 bottom-0 h-auto border-t pb-[env(safe-area-inset-bottom)] data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom` | เพิ่มขอบล่าง iPhone |
| X (`:79-85`) | แบบข้อ 5.3 ไม่มี `disabled` | — |
| `closeLabel` | `closeLabel ?? tCommon("close")` | `"Close"` |
| `SheetHeader` (`:96`) | `flex shrink-0 flex-col gap-1.5 border-b border-border px-4 py-4 pr-16` | `p-4` · `py-4` ทำให้หัวสูง 56 เท่า X 44px ที่ `top-3` |
| `SheetTitle` (`:119`) | `text-base font-semibold text-foreground` | `font-semibold text-foreground` |
| `SheetFooter` | ไม่เปลี่ยน (ผู้ใช้คนเดียวคือ sheet ตัวกรองของ 2B) | — |

แต่ละจุด:

| จุด | เจ้าของ | batch | แก้ |
|---|---|---|---|
| `assets/asset-evidence-drawer.tsx:70` | 2C | 4 | ลบ `closeLabel` `:72`, `aria-describedby={undefined}` `:73`, `bg-surface` ใน `:80` และ className ของ `SheetHeader` `:82` · บรรทัดรอง `<p className="text-xs …">` `:84` → `<SheetDescription>` · กล่องว่างเส้นประ `:102` → `<EmptyNote className="mt-4">{labels.emptyLabel}</EmptyNote>` (O14) · คง `side="right"` และ `sm:max-w-2xl` (test) |
| `ui/activity-drawer.tsx:55` | 2C | 4 | ลบ `closeLabel` `:57`, `bg-surface` ใน `:65` และ className ของหัว `:67` · คง `aria-describedby={undefined}` (ไม่มีคำอธิบาย) · กล่องว่าง `:72` → `<EmptyNote>{emptyLabel}</EmptyNote>` (O14) |
| `audit/audit-scan-check-panel.tsx:52` | 2C | 3 | ลบ `closeLabel` `:54` และ className ของหัว `:64` · ไม่แตะ `onCloseAutoFocus` `:56-62` และ `tabIndex={-1}` ของหัวเรื่อง (test) |
| `audit/audit-scan-room-picker.tsx:59` | 2C | 3 | ลบ `closeLabel` `:61` และ className ของหัว `:70` · ท้าย `:125-133` → `<SheetFooter className="border-t border-border-soft bg-background px-4 py-3"><Button variant="outline" onClick={…}>{t("roomClear")}</Button></SheetFooter>` (เต็มความกว้าง เพราะ `flex-col`) |
| `assets/asset-register-filter-sheet.tsx:90` | **2B** | — | 2C ไม่แตะ · ได้ X, พื้นขาว, ขอบล่าง iPhone และหัวใหม่จาก primitive · `pr-14` ที่ 2B ส่งมายังชนะ `pr-16` (X ชิดแต่ไม่ทับ) |
| `assets/asset-register-row-actions.tsx:175` | **2B** | — | 2C ไม่แตะ · class `pb-[env(safe-area-inset-bottom)]` ซ้ำกับ primitive (tailwind-merge เหลือตัวเดียว) · หัวได้เส้นใต้จาก `SheetHeader` ใหม่ |
| `layout/sidebar.tsx:304` | layout | — | ไม่มีผล (`showCloseButton={false}`, พื้น `bg-sidebar` ของตัวเอง, ไม่ใช้ `SheetHeader`) |

### 5.9 `AlertDialog` / `useConfirm` (K12, batch 5)

แก้ที่ `ui/alert-dialog.tsx` อย่างเดียว · `ui/confirm-dialog.tsx` ไม่ต้องแก้ เพราะ DOM เรียง Cancel แล้ว Action อยู่แล้ว และนิพจน์ `variant={current.tone === "destructive" ? "destructive" : "default"}` (`:99`) ต้องคงตามตัวอักษร (test `confirm-dialog-ui.test.ts:13`)

| ส่วน | class ใหม่ |
|---|---|
| `AlertDialogContent` (`:61`) | `fixed bottom-[max(0.75rem,env(safe-area-inset-bottom))] left-[50%] z-50 flex max-h-[92dvh] w-[calc(100%-1.5rem)] translate-x-[-50%] flex-col overflow-hidden rounded-lg border border-border bg-surface shadow-overlay duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:top-[50%] sm:bottom-auto sm:max-w-lg sm:translate-y-[-50%] motion-reduce:animate-none!` |
| `AlertDialogHeader` (`:78`) | `flex flex-col gap-2 border-b border-border px-4 py-4 text-left sm:px-5` (ไม่มี X จึงไม่ต้อง `pr-16`) |
| `AlertDialogTitle` (`:110`) | `text-base font-semibold text-foreground` |
| `AlertDialogDescription` | คง `text-sm text-muted-foreground` |
| `AlertDialogFooter` (`:94`) | `flex shrink-0 flex-col gap-2 bg-background px-4 py-3 sm:flex-row sm:justify-end sm:px-5` (ไม่มีเส้นบน เพราะหัวมีเส้นใต้แล้ว) |
| `AlertDialogAction` / `AlertDialogCancel` | คง `size="default"` (K7) · `default`/`destructive` และ `outline` |

- ลบ prop `size` ของ `AlertDialogContent` (0 ผู้ใช้), `data-size`, `group/alert-dialog-content` และ `AlertDialogMedia` (0 ผู้ใช้ grep `src` และ `tests`) เพราะ selector ของ size ไม่มีที่ใช้แล้ว
- ผลที่ได้: พื้นขาว หัวเรื่อง 16px ชิดซ้าย บนมือถือยึดล่างเหมือน `AccessibleDialog` ยกเลิกบน ปุ่มหลักล่าง · Radix ยังโฟกัสยกเลิกก่อน · ไม่มี busy (ปิดก่อนงานเริ่ม)

`confirm(` 13 จุด หลัง batch 5 (ทุกจุดคง `title` เป็น property แรก เพราะ test ยึด `confirm\(\{ title: …`):

| จุด | ป้ายปุ่มหลัก | tone |
|---|---|---|
| `admin/IntegrationClientManager.tsx:193` | **ใหม่** `labels.confirmScopeExpansionAction` "เพิ่มสิทธิ์" | default |
| `…IntegrationClientManager.tsx:249` | `labels.rotate` | destructive |
| `…IntegrationClientManager.tsx:254` | `labels.enable` / `labels.disable` | default / destructive |
| `admin/storage-archive-button.tsx:19` | `t("archiveOrphanFile")` | default |
| `assets/asset-attachments.tsx:118` · `assets/asset-purchase-documents.tsx:48` · `disposal/disposal-attachments.tsx:63` · `master-data/asset-model-form.tsx:193` · `master-data/use-delete-action.ts:18` | `tCommon("delete")` | destructive |
| `audit/audit-round-close-button.tsx:37` | `t("closeRound")` | default |
| `disposal/disposal-bulk-approval.tsx:316` | **ใหม่** `copy.discardSelectionAction` "ละทิ้งรายการที่เลือก" | destructive |
| `disposal/disposal-bulk-execution.tsx:481` | **ใหม่** `copy.discardSelectionAction` (key เดียวกัน) | destructive |
| `master-data/supplier-form.tsx:93` | **ใหม่** `t("unsavedChangesLeave")` "ออกโดยไม่บันทึก" | destructive |
| `maintenance/maintenance-attachments.tsx` (ใหม่, แทน dialog `:239`) | `tCommon("delete")` | destructive |

จุดที่ต้องแก้เพื่อส่งป้ายใหม่:
- `IntegrationClientManager.tsx:68` เพิ่ม `confirmScopeExpansionAction: string` ใน labels type · `admin/integrations/page.tsx:52` เพิ่ม `confirmScopeExpansionAction: t("confirmScopeExpansionAction")`
- `disposal-bulk-approval.tsx:67` และ `disposal-bulk-execution.tsx:109` เพิ่ม `discardSelectionAction: string` · `disposal/page.tsx:216` (copy อนุมัติ) และ `:231` (copy ดำเนินการ) เพิ่ม `discardSelectionAction: t("bulkDiscardSelectionAction")`
- `supplier-form.tsx:93` เป็น `confirm({ title: t("unsavedChangesConfirm"), confirmLabel: t("unsavedChangesLeave"), tone: "destructive" })`

`maintenance-attachments.tsx` → `useConfirm`:

```tsx
const confirm = useConfirm()
async function requestDelete(id: string) {
  if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return
  await handleDelete(id)
}
// ปุ่มลบ :204  onClick={() => void requestDelete(attachment.id)}
```
- ลบ state `pendingDeleteId` (`:40`), `setPendingDeleteId(null)` ใน `handleDelete` (`:80`), dialog `:239-256` และ import `AccessibleDialog` (`:11`)
- toast สำเร็จ `:87` `tCommon("savedSuccess")` → `tCommon("deletedSuccess")` (DESIGN.md:386 "ลบแล้ว")
- ปุ่มเปิด `:202-214` เป็นของข้อปุ่ม (batch 1a) ส่วนนี้แก้แค่ `onClick`
- dialog แผน PM (แถว 18) คงไว้ เพราะต้องค้างพร้อม busy ระหว่างบันทึก ซึ่ง `useConfirm` ทำไม่ได้

### 5.10 ข้อความใหม่

แก้ผ่าน `node scripts/messages-edit.mjs` ใน batch 5 ไฟล์ change:

```json
{ "set": {
  "th": { "integrationApiPage.confirmScopeExpansionAction": "เพิ่มสิทธิ์",
          "disposalPage.bulkDiscardSelectionAction": "ละทิ้งรายการที่เลือก",
          "supplier.unsavedChangesLeave": "ออกโดยไม่บันทึก" },
  "en": { "integrationApiPage.confirmScopeExpansionAction": "Add permissions",
          "disposalPage.bulkDiscardSelectionAction": "Discard selection",
          "supplier.unsavedChangesLeave": "Leave without saving" } } }
```

| key | th | en | ใช้ที่ |
|---|---|---|---|
| `integrationApiPage.confirmScopeExpansionAction` | เพิ่มสิทธิ์ | Add permissions | `IntegrationClientManager.tsx:193` |
| `disposalPage.bulkDiscardSelectionAction` | ละทิ้งรายการที่เลือก | Discard selection | `disposal-bulk-approval.tsx:316`, `disposal-bulk-execution.tsx:481` |
| `supplier.unsavedChangesLeave` | ออกโดยไม่บันทึก | Leave without saving | `supplier-form.tsx:93` |

- ตรวจแล้วไม่มี key ชื่อนี้ และไม่มีข้อความเดิมที่ใช้แทนได้ · คำไทยไม่ติดกฎใน `tests/thai-glossary.test.ts`
- ไม่มี key ใหม่อื่นในส่วนนี้: "ปิด" (`common.close`), "ยกเลิก" (`common.cancel`), "กลับ" (`common.back`) มีอยู่แล้ว · ป้ายแผน PM ใช้ `maintenancePage.pmActions.{pause,resume,end}` เดิม

### 5.11 Test

**ตาราง A: test เดิมที่ต้องแก้**

| ไฟล์:บรรทัด | ตอนนี้ยึด | แก้เป็น | batch |
|---|---|---|---|
| `tests/accessible-dialog.test.ts:28` | `closeLabel = "Close"` | `/const closeLabel = closeLabelProp \?\? tCommon\("close"\)/` + `doesNotMatch(/"Close"\|>Close</)` | 2C-0 |
| `tests/accessible-dialog.test.ts:31` | `min-h-11 min-w-11` | `/<DialogPrimitive\.Close asChild>\s*<Button variant="ghost" size="icon"/` + `doesNotMatch(/opacity-\|sm:size-10/)` · `:29` `aria-label={closeLabel}` และ `:30` `disabled={closeDisabled}` ผ่านต่อถ้าเขียนตามข้อ 5.3 | 2C-0 |
| `tests/sheet-drawers-ui.test.ts:9`, `:11` | เหมือนข้างบนใน `sheet.tsx` | `/const closeLabel = closeLabelProp \?\? tCommon\("close"\)/` · `/<SheetPrimitive\.Close asChild>\s*<Button variant="ghost" size="icon"/` | 2C-0 |
| `tests/disposal-bulk-execution-ui.test.ts:31` | `<footer className="…sticky bottom-0…"` | `/<AccessibleDialogFooter>/` + `doesNotMatch(/<footer\|sticky bottom-0/)` · `:33` `min-h-11 min-w-11` ยังผ่านเพราะมีที่ `:602`, `:640`, `:649`, `:680`, `:722`, `:731` (ฝั่ง 2B ตาม O4) | 3 |
| `tests/asset-transaction-cancellation-ui.test.ts:13` | `/min-h-11/` ที่ไหนก็ได้ในไฟล์ | ถ้าข้อปุ่มแปลง trigger `:123` ใน batch เดียวกัน (ยังเหลือ `min-h-11` ที่ trigger ถ้าไม่แปลง) แทนด้วย `/<AccessibleDialogFooter>[\s\S]*?variant="destructive"[\s\S]*?busy=\{saving\}/` | 4 |
| `tests/confirm-dialog-ui.test.ts:25-31` | รายการไฟล์ที่ลบแล้วต้องบอก "ลบแล้ว" | เพิ่ม `src/components/maintenance/maintenance-attachments.tsx` + `doesNotMatch(/AccessibleDialog/)` ในไฟล์นั้น | 5 |

**ตาราง B: test ใหม่**

| ไฟล์ · test | ตรวจ | batch |
|---|---|---|
| A · `tests/accessible-dialog.test.ts` "dialog parts own padding, the footer bar and a busy-aware cancel" | export `AccessibleDialogBody` / `AccessibleDialogFooter` / `AccessibleDialogCancel` / `accessibleDialogFormClassName = "flex min-h-0 flex-1 flex-col"` · class ของ Body และ Footer ตามตัวอักษรในข้อ 5.2 · `disabled=\{dialog\.busy \|\| disabled\}` · ช่อง children `flex min-h-0 flex-1 flex-col overflow-y-auto` · `bottom-[max(0.75rem,env(safe-area-inset-bottom))]` · `sm:pl-5` · `description\?: ReactNode` · ไม่มี `flex-col-reverse` และ `bottom-3` | 2C-0 |
| B · `tests/dialog-structure-ui.test.ts` (ไฟล์ใหม่) "every AccessibleDialog uses the footer part" | ทุกไฟล์ใน `src` ที่มี `/<AccessibleDialog\b/` (ไม่นับ `ui/accessible-dialog.tsx`) ต้องมี `<AccessibleDialogFooter` ยกเว้นไฟล์ใน `pendingFooterParts` ซึ่งต้อง**ยังไม่มี** (ratchet สองทาง) และทุกชื่อในชุดต้องยังมี `<AccessibleDialog` (กันชื่อค้าง) · ชุดเริ่มด้วย 19 ไฟล์ แต่ละ batch ลบไฟล์ที่ย้ายแล้ว หลัง batch 5 เป็นชุดว่าง | 2C-0 (ลดทุก batch) |
| C · ไฟล์เดียวกัน "dialog footers hold only Buttons" | ทุกบล็อก `/<AccessibleDialogFooter[\s\S]*?<\/AccessibleDialogFooter>/g` ไม่มี `<button`, `<Loader2`, `className=`, `size="`, `opacity-`, `flex-col-reverse`, `sticky` · `ui/alert-dialog.tsx` และ `ui/dialog.tsx` ไม่มี `flex-col-reverse` (`alert-dialog` ใส่ใน batch 5) | 2C-0 |
| D · ไฟล์เดียวกัน "the settings prefix dialog has no form of its own" | ตัดข้อความ `system-settings-form.tsx` ระหว่าง `<AccessibleDialog` กับ `</AccessibleDialog>` แล้ว: ไม่มี `<form`, `type="submit"`, ` form=` · มี `<AccessibleDialogFooter` · นอกช่วงนั้นยังมี `<form onSubmit={handleSubmit}` | 1f |
| E · ไฟล์เดียวกัน "no dialog calls its close button cancel" | `countMatchesByFile(sources, /closeLabel=\{labels\.cancel\}/g)` ไม่เกิน budget: 2C-0 `{ IntegrationClientManager.tsx: 1, system-settings-form.tsx: 1 }` → 1f เหลือ Integration → batch 4 `{}` · `ui/dialog.tsx` และ `ui/sheet.tsx` ไม่มี `"Close"` | 2C-0 |
| F · `tests/confirm-dialog-ui.test.ts` "confirm dialogs look like the other dialogs" | `alert-dialog.tsx` มี `bg-surface`, `bottom-[max(0.75rem,env(safe-area-inset-bottom))]`, `sm:max-w-lg`, footer `flex shrink-0 flex-col gap-2 bg-background`, title `text-base font-semibold text-foreground` · ไม่มี `flex-col-reverse`, `data-[size=`, `AlertDialogMedia`, `place-items-center`, `p-6` | 5 |
| G · ไฟล์เดียวกัน "every confirm() names its action" | ในทุกไฟล์ที่มี `useConfirm()` ทุก object `/\{\s*title:[^}]*\}/g` ที่อยู่ในอาร์กิวเมนต์ของ `confirm(` มี `confirmLabel` (ที่ `5ffee76` ขาด 4 จุด) | 5 |
| H · ไฟล์เดียวกัน "verb labels exist in both languages" | ค่าของ 3 key ในข้อ 5.10 ตรงตามตัวอักษรทั้ง th และ en | 5 |
| I · `tests/sheet-drawers-ui.test.ts` "sheets are white, pad the iOS home bar and share one header" | `sheet.tsx` มี `bg-surface` ใน base, `pb-[env(safe-area-inset-bottom)]` ในสาย `bottom`, `SheetHeader` `border-b border-border px-4 py-4 pr-16`, `SheetTitle` `text-base font-semibold` · drawer ทั้งสองใช้ `<EmptyNote` และไม่มี `border-dashed` (batch 4) | 2C-0, 4 |

**test ที่ต้องผ่านต่อโดยไม่แก้ (เขียนเป็นข้อห้ามใน task ของแต่ละ batch)**

- 2C-0: `visual-foundation-guards.test.ts:67-84` (string ของ scrim · `shadow-overlay…motion-reduce:animate-none!` ใน string เดียวกันของ dialog / alert-dialog / sheet · ช่วง duration ของ sheet `:83`) · `accessible-dialog.test.ts:7-24` (busy guard และ focus ref) · `ui-overlay-guards.test.ts:57-62`
- 1a: `repair-record-detail-ui.test.ts:13`, `:21-29` · 1b: `asset-operation-confirmation-ui.test.ts:29-31` (`initialFocusRef={confirmButtonRef}`, `<Button`) · 1c: `disposal-detail-workspace.test.ts:76-82` (`busy={saving}` บน `<AccessibleDialog`, `returnFocusRef={triggerRef}`, `initialFocusRef={executionDateRef}`)
- 1d: `audit-not-found-dialog.test.ts:12`, `:16` (`onSubmit={handleSubmit}`) · `audit-mobile-flow-completion.test.ts:10-14` · `audit-scan-check-ui.test.ts:82-85` · `ui-overlay-guards.test.ts:52-55` · (`audit-not-found-dialog.test.ts:14` `/<textarea/` เป็นของข้อช่องกรอก)
- 1e: `confirm-text-dialog-ui.test.ts:20-21` (`FileDropzone file={removeEvidence}` ต้องติดกันตามนี้) · `attachment-preview-dialog-ui.test.ts:24-34`
- 3: `disposal-bulk-execution-ui.test.ts:26-30`, `:56`, `:74`, `:91-92` · `disposal-bulk-approval.test.ts:78-87`, `:105`, `:144` (ห้ามมี `tabIndex={-1}` ใน `DisposalBulkApprovalDialog`) · `visual-foundation-guards.test.ts:26-28` (เป้าโฟกัสใน `audit-scan-check-panel.tsx` และ wrapper ของ bulk ทั้งสอง) · `audit-scan-check-ui.test.ts:53-56` · `confirm-text-dialog-ui.test.ts:9-12` · `audit-round-cancellation.test.ts:107-108`
- 4: `asset-state-review-ui.test.ts:14-15` · `integration-api-client-admin.test.ts:133`, `:144` · `dropdown-menus-ui.test.ts:20-25` · `sheet-drawers-ui.test.ts:15-27` · `asset-transaction-cancellation-ui.test.ts:12`
- 5: `confirm-dialog-ui.test.ts:9-16`, `:24-40` · `dropdown-menus-ui.test.ts:65-76` · `supplier-form-ui.test.ts:27` · `disposal-bulk-execution-ui.test.ts:56` · `disposal-bulk-approval.test.ts:144` · `maintenance-attachments-ui.test.ts:11`

### 5.12 สรุปตาม batch

| batch | ไฟล์ที่ส่วนนี้แก้ | dialog (แถวข้อ 5.5) | sheet | test |
|---|---|---|---|---|
| 2C-0 | `ui/accessible-dialog.tsx`, `ui/dialog.tsx`, `ui/sheet.tsx` | 0 (ทุก dialog ได้หัว ขอบล่าง และ X ใหม่) | 7 จุดได้ X พื้นขาว และหัวใหม่ | A 3 แถวแรก · B: A, B, C, E, I |
| 1a | `maintenance/repair-record-actions.tsx` | 19, 20, 21 | — | ลดชุด B |
| 1b | `ui/operation-review-dialog.tsx` + ผู้เรียก 3 ไฟล์ (`closeLabel`) | 23 | — | ลดชุด B |
| 1c | `disposal/disposal-decision-button.tsx`, `disposal/disposal-execution-button.tsx` | 15, 16 | — | ลดชุด B |
| 1d | `audit/audit-finding-review-actions.tsx`, `audit/audit-mark-not-found-button.tsx`, `audit/audit-scan-component-missing-dialog.tsx` | 7, 8, 9, 10, 12 | — | ลดชุด B |
| 1e | `assets/asset-component-manager.tsx` | 5 | — | ลดชุด B |
| 1f | `admin/system-settings-form.tsx` (`:1347-1484` เท่านั้น) | 3 | — | B: D · budget E |
| **รวม batch 1** | 11 ไฟล์ | **13** | — | — |
| 3 | `disposal-bulk-approval.tsx`, `disposal-bulk-execution.tsx` (ฝั่ง dialog), `audit-round-cancel-button.tsx`, `maintenance-plan-state-actions.tsx`, `ui/confirm-text-dialog.tsx` + `audit-findings-batch-actions.tsx:131`, `audit-scan-check-panel.tsx`, `audit-scan-room-picker.tsx` | 11, 13, 14, 18, 22 | check panel, room picker | A แถว 4 · ลดชุด B |
| 4 | `asset-state-review-dialog.tsx`, `IntegrationClientManager.tsx` (dialog `:389-452`), `asset-register-table.tsx` (`:697-774`), `transaction-cancel-dialog.tsx`, `asset-evidence-drawer.tsx`, `ui/activity-drawer.tsx` | 1, 2, 4, 6 | evidence, activity | A แถว 5 · budget E → `{}` · I (drawer) |
| 5 | `ui/alert-dialog.tsx`, `maintenance-attachments.tsx`, ป้ายคำกริยา (`IntegrationClientManager.tsx`, `admin/integrations/page.tsx`, ไฟล์ bulk ทั้งสอง, `disposal/page.tsx`, `supplier-form.tsx`) + messages | 17 | — | A แถว 6 · B: F, G, H · ชุด B ว่าง |

batch 3, 4 และ 5 แก้ไฟล์ที่ 2B แตะด้วย (`asset-register-table.tsx`, ไฟล์ bulk ทั้งสอง, `audit-findings-batch-actions.tsx`) จึงต้องทำหลัง 2B merge ตาม critic §3

เอกสาร (ส่งต่อให้งานเอกสารท้าย 2C):
- `DESIGN.md:214` `--background` ใช้กับ "ส่วนท้ายของ dialog และ dialog ยืนยัน" ไม่ใช่ "Dialog bodies" (เนื้อ dialog และ sheet เป็นขาว)
- `DESIGN.md:352` แถว `warning` เพิ่ม "ปุ่มยืนยัน 'ไม่พบ' 2 ปุ่มของการตรวจนับ" (K22)
- `DESIGN.md:385-386` เพิ่ม part ทั้งสาม ลำดับ K8 (ยกเลิกก่อน ปุ่มหลักท้าย) ขอบล่าง iPhone ปุ่มยกเลิกกดไม่ได้ระหว่าง busy และ "ทุก `confirm()` ต้องมี `confirmLabel` เป็นคำกริยา"
- ใส่กติกา "dialog ที่อยู่ใน `<form>` ของหน้า ห้ามมี `<form>` ของตัวเอง" (ข้อ 5.6)

### ข้อตัดสินย่อย

1. **ด1 ขอบล่าง iPhone อยู่ที่ตำแหน่งกล่อง** (`bottom-[max(0.75rem,env(safe-area-inset-bottom))]`) ไม่ใช่ padding ของ Footer เพราะ dialog บนมือถือลอยเหนือขอบล่าง 12px ถ้าใส่ใน Footer จะได้แถบว่างในกล่อง · อ่าน "part เป็นเจ้าของ safe area" ใน K9 ว่า "primitive เป็นเจ้าของ ผู้เรียกไม่ต้องทำ" · sheet ใส่ใน `side="bottom"` ของ `SheetContent`
2. **ด2 ช่องรับ children เป็น `flex flex-col`** ลูกที่ไม่ใช้ part ไม่หด (`min-height: auto`) กล่องจึงยังเลื่อนเหมือนเดิม dialog ที่ยังไม่ย้ายจึงไม่พังระหว่าง batch · ไม่ใช้ `:has()` และไม่มี prop โหมด
3. **ด3 export `accessibleDialogFormClassName`** แทนการให้ทุกไฟล์เขียน `flex min-h-0 flex-1 flex-col` เอง (ลืมแล้วส่วนท้ายจะเลื่อนหายแบบเงียบ)
4. **ด4 ปุ่มยกเลิกใช้ `disabled` จริง** ไม่ใช้ `busy`/`aria-disabled` เพราะตอน busy โฟกัสอยู่ที่ปุ่มหลัก และยกเลิกไม่ควรมี spinner
5. **ด5 หัว dialog ใช้ `sm:pl-5`** เพื่อไม่ทับ `pr-16` ที่เว้นให้ X
6. **ด6 เส้นใต้หัวคง `border-border`** (ต้นแบบ `.panel-head` ใช้ `--line`) · เส้นบนส่วนท้าย `border-border-soft` ตาม K9 · `first:border-t-0` เมื่อไม่มีเนื้อ (ผัง ค) กันเส้นซ้อน
7. **ด7 Body ไม่มี gap ตั้งต้น** ผู้เรียกใส่ `space-y-*` หรือ `grid` เอง (gap ตั้งต้นจะชนกับ grid 2 คอลัมน์ของ dialog ตัดจำหน่าย)
8. **ด8 `closeLabel` คงเป็น prop ทางเลือก** ใช้เฉพาะเมื่อชื่อต่างจาก "ปิด" จริง (`disposal-bulk-execution.tsx:818`) · ลบที่ส่งค่าซ้ำ 5 จุด · wrapper สองตัวเป็นทางเลือก
9. **ด9 X ระหว่าง busy ใช้หน้าตาปุ่มที่กดไม่ได้ของ 2A** (กรอบเทา) ไม่ทำแบบพิเศษ
10. **ด10 พื้น `SheetContent` เป็น `bg-surface`** ให้เหมือน dialog · ช่องกรอกขาวกับ ghost hover (`audit-scan-check-form.tsx:361`, ความเสี่ยงข้อ 9 ของ `dialogs.md`) จึงมองเห็น · sidebar ใช้ `bg-sidebar` ของตัวเองจึงไม่เปลี่ยน
11. **ด11 `SheetHeader` / `SheetTitle` ได้ค่าตั้งต้นใหม่** (`py-4` ให้หัวสูง 56 เท่า X) แทนการให้ 5 ไฟล์เขียนเอง 3 แบบ · `SheetFooter` ไม่เปลี่ยน เพราะผู้ใช้คนเดียวเป็นของ 2B
12. **ด12 แผน PM เป็นผัง ค** ป้ายปุ่มใช้คำกริยาจาก `pmActions.*` แทน "ยืนยัน" · "จบแผน" เป็น `destructive` (ปุ่มเปิดของมันเป็นปุ่มแดงอยู่แล้ว)
13. **ด13 ปุ่มที่เริ่มงานอยู่ที่เดิมพร้อม `busy`** (แถว 13, 14): ปุ่มส่งค้างตอน `committing` / `previewing` · ลบ div "กำลังบันทึก" `:970` · ยกเลิกแสดงแบบกดไม่ได้แทนการซ่อน · สถานะยังประกาศผ่าน `aria-live` ในเนื้อ
14. **ด14 `zeroEligible` ย้ายเป็น `Notice` ในเนื้อ** (แถว 14) ปุ่มไม่เปลี่ยนป้ายตามสถานะเป็นประโยค
15. **ด15 dialog พิจารณาตัดจำหน่าย (แถว 15) คง `default`** แม้เลือก "ไม่อนุมัติ" เพราะเป็นการบันทึกผล ไม่ใช่ยืนยันการลบ · ดำเนินการตัดจำหน่ายและแบบกลุ่มคง `default` ตาม D6
16. **ด16 tag เฉพาะคำอธิบายที่เป็นรหัส** (7 dialog) · ชื่อหลังรหัสคั่นด้วย " · " ตามต้นแบบ · คำอธิบายที่เป็นประโยค (เช่น `audit-scan-component-missing-dialog.tsx:37`) คงเป็น string
17. **ด17 ข้อความ "ละทิ้ง" ใช้ key เดียว** สำหรับ bulk ทั้งสอง (ความหมายเดียวกัน)
18. **ด18 `AlertDialog` ตัด `size` และ `AlertDialogMedia`** (0 ผู้ใช้) · หัวมีเส้นใต้ ส่วนท้ายไม่มีเส้นบน
19. **ด19 `DialogFooter` (0 ผู้ใช้) คงไว้แต่ตัดปุ่ม "Close"** และเรียงตาม K8
20. **ด20 `maintenance-attachments` แปลงใน batch 5 ตาม K12** batch 1a ไม่แตะ `:239-256` (การแปลงไม่ขึ้นกับการ restyle จึงย้ายเร็วกว่านี้ได้ถ้าเจ้าของสั่ง) · toast เป็น `deletedSuccess`
21. **ด21 ป้ายปุ่มท้ายยาวไม่เกิน 40 ตัวอักษร** ตรวจตอน review และบนแอป dev ไม่มี test (map key กับปุ่มด้วย regex ไม่ได้แม่น)
22. **ด22 ทุก `confirm()` คง `title` เป็น property แรก** เพราะ `disposal-bulk-approval.test.ts:144`, `disposal-bulk-execution-ui.test.ts:56`, `supplier-form-ui.test.ts:27` ยึดไว้
23. **ด23 ห้าม `className` ใน `AccessibleDialogFooter`** ทั้งบนตัวมันและปุ่มข้างใน (guard C) · ไอคอนได้ขนาดจาก `Button` เอง

### ความเสี่ยง

1. **ทุก dialog เปลี่ยนพร้อมกันตอน 2C-0** (หัว 16/20, ตำแหน่งล่าง, X) ก่อนที่เนื้อของแต่ละตัวจะย้าย ช่วงนั้นเนื้อที่ยังเป็น `px-5` เยื้องจากหัว 4px บนมือถือ หายเมื่อย้ายครบใน batch 4
2. **submit ทะลุ portal** ถ้าใครเพิ่ม `<form>` ใน dialog คำนำหน้า หน้าตั้งค่าทั้งหน้าจะถูกบันทึก (ข้อ 5.6) guard D กันไว้ แต่ต้องลองกด Enter บนแอป dev ด้วย
3. **ปุ่ม submit หลุดจาก `<form>`** ถ้าส่วนท้ายอยู่นอกฟอร์ม Enter กับ `required` จะเลิกทำงานแบบเงียบ (15 dialog) guard B ตรวจแค่ว่ามีส่วนท้าย ต้องตรวจด้วยคีย์บอร์ด: Enter ในช่อง และ submit ตอนช่อง `required` ว่าง
4. **`busy` กับ `disabled` สลับกัน** ปุ่มยืนยัน 11 ปุ่มมีเงื่อนไขตรวจกรอกใน `disabled` ต้องคงไว้ ถ้าย้ายผิด ปุ่มจะกดส่งของที่ไม่ครบได้ หรือโฟกัสหลุด
5. **หน้าตา dialog ยืนยันต่างจาก dialog อื่นจนถึง batch 5** ระหว่าง batch 1–4 `useConfirm` ยังเป็นกล่องเทากลางจอและวางปุ่มหลักไว้บน (K8 ยังไม่ครบ) และ batch 5 แตะ dialog ลบของข้อมูลหลัก 10 ปุ่ม แถวทะเบียน ไฟล์แนบ 4 จุด ปิดรอบ และ Integration ในคราวเดียว ต้องตรวจที่ 375 และ 1440 ด้วยคีย์บอร์ด (ยกเลิกต้องได้โฟกัสก่อน)
6. **sheet ของ 2B เปลี่ยนตาม primitive** (พื้นขาว หัวมีเส้น ขอบล่าง iPhone) ตั้งแต่ deploy batch 1 ต้องแจ้ง 2B · test ของ 2B ไม่ยึด class เหล่านี้
7. **ขอบล่าง iPhone ตรวจบนเครื่องจริงเท่านั้น** `env()` เป็น 0 บนเดสก์ท็อปและ Android จึงดูไม่ออกบน dev
8. **ป้ายอังกฤษยาว** "Confirm historical evidence exception" (37) ใกล้ขอบที่ความกว้าง 320 · ความกว้างในข้อ 5.7 เป็นค่าประมาณจาก class ไม่ได้วัดจากฟอนต์จริง ต้องดูที่ 375 ทั้งสองภาษา
9. **บรรทัดเลื่อน** งาน P0 แก้ 3 ไฟล์ trigger ก่อน batch 1c/1d เลขบรรทัดในข้อ 5.5 ของไฟล์เหล่านั้นจะไม่ตรง ให้หาจากข้อความ
10. **`useTranslations` ใน `dialog.tsx` / `sheet.tsx`** ต้องมี provider ทุกที่ที่ render ตอนนี้ทุกจุดอยู่ใต้ `[locale]/layout.tsx` (`AccessibleDialog` เรียกอยู่แล้ว) ถ้ามีหน้าใหม่นอก provider จะ throw
