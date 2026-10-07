# รากฐาน UI บน shadcn/ui (รอบที่ 3 ส่วน A) — Design

> วันที่: 2026-10-07 · branch: `feat/ui-shadcn-foundation` (จาก `master` `2c612bf`)
> สถานะ: **design approved** (ผู้ใช้ผ่านทั้ง 3 ส่วนในแชท) · รอผู้ใช้ตรวจ spec ก่อนเขียน plan
> ส่วน B (ตารางทะเบียน/ตัวกรอง · การสแกน · ข้อความไทย/อังกฤษ) จะมี spec ของตัวเองหลังส่วนนี้เสร็จ

## 1. เป้าหมายและหลักฐาน

**ผู้ใช้สั่ง:** "เริ่มรอบที่ 3 UI ได้เลย และดูเรื่องการใช้ Radix UI ด้วย" แล้วเลือก

- ย้ายไป **shadcn/ui ทั้งชุด** (Radix อยู่ข้างใต้)
- ทำ **ฐานก่อน แล้วค่อยหน้า** — ส่วน A = ฐาน + กล่องลอยทั้งหมด · ส่วน B = หน้า
- หน้าตา **A (คงหน้าตาเดิม)** + **ป้ายสถานะแบบ C** (จุดสี + พื้นอ่อน + เส้นขอบ) — เลือกจาก mockup ใน visual companion
- ฟอนต์ **Noto Sans Thai + Inter** — เลือกจากตัวอย่างเทียบ 4 ฟอนต์
- ขอบเขต A = **ฐาน + กล่องลอยทั้งหมด** · วิธีย้าย = **ห่อของเดิมด้วย shadcn** (คง props ของคอมโพเนนต์กลาง)

**หลักฐาน** — `docs/audits/2026-10-07-full-review.md` หมวด U และการสำรวจโค้ด 2026-10-07:

- P1: `--warning #F59E0B` (2.1:1) และ `--success #16A34A` (3.3:1) ใช้เป็นสีตัวอักษร ไม่ผ่าน AA
- P1: การกระทำที่ย้อนไม่ได้ใช้ `window.confirm` (13 จุดใน 11 ไฟล์) · ลบแล้ว toast "บันทึกสำเร็จ"
- P2: dialog 5+ แบบ · badge 2 ชุด (`StatusBadge`, `StatusPill`) · ไม่มีฟอนต์ไทย (`Inter` latin เท่านั้น ตัวไทยไปใช้ฟอนต์ของเครื่อง หน้าตาต่างกันตามอุปกรณ์)
- กล่องลอยที่เขียนเอง: dialog 12 ตัว · lightbox 2 · drawer 2 + `ActivityDrawer` · เมนู/popover 7 ตัว — **ไม่มีตัวไหนล็อกการเลื่อนหน้า** · portal มีตัวเดียว · ที่จัดการ Esc + กัน Tab หลุด + คืนโฟกัสครบมีราว 5 ตัว
- `cmdk@^1.1.1` อยู่ใน dependencies แต่ไม่มีที่ใช้ · CSP (`src/lib/security-headers.ts`) ไม่จำกัด inline style จึงใช้ Radix Popper ได้

**สำเร็จเมื่อ**

1. ไม่เหลือ `window.confirm` ใน `src`
2. กล่องลอยทุกตัวในขอบเขต (ข้อ 5) ใช้ Radix: กด Esc ปิดได้ · โฟกัสไม่หลุดออกนอกกล่อง · ปิดแล้วโฟกัสกลับที่ปุ่มเดิม · ล็อกการเลื่อนหน้า · มีชื่อให้โปรแกรมอ่านจอ
3. คู่สีตาม token ผ่าน WCAG AA (ข้อความ 4.5:1) และมี test กันถอย
4. ตัวไทยเป็น Noto Sans Thai ทุกเครื่อง · ตัวอังกฤษ/ตัวเลขยังเป็น Inter
5. หน้าตาโดยรวมเหมือนเดิม (เมนูข้างกรมท่า ปุ่ม #2563EB) · เนื้อหา ขั้นตอนงาน และข้อความไม่เปลี่ยน ยกเว้นที่ระบุในข้อ 6
6. `npm run verify` ผ่าน · ทดสอบบนแอป dev ทั้ง desktop และ 375px ตามข้อ 8

**นอกขอบเขต** (ไป B หรือรอบหลัง)

- เลย์เอาต์ตารางทะเบียน · ตัวเลือกคอลัมน์ (`<details>` ใน `asset-register-table.tsx:444`) · ตัวกรอง · pagination 4 แบบ → B
- การสแกนตรวจนับ · ข้อความไทย/อังกฤษปน · `lang="th"` ตายตัว · error API ภาษาอังกฤษ → B
- แปลง `<button>` ที่เขียนสดในหน้า (315 จุด) เป็น `Button` → ทยอยทำใน B ตอนแก้แต่ละหน้า
- เปลี่ยน `<select>` ธรรมดา (65 จุด) เป็น Radix Select — **ไม่ทำ** เพราะ native picker บนมือถือใช้ง่ายกว่า
- dark mode · contrast ของเส้นขอบช่องกรอก (WCAG 1.4.11) · `beforeunload` ของเบราว์เซอร์

## 2. แนวทางที่เลือก

**ห่อของเดิมด้วย shadcn:** ติดตั้งคอมโพเนนต์ shadcn ใน `src/components/ui/` แล้วเขียนไส้ในของคอมโพเนนต์กลางเดิมใหม่บน Radix โดยคง props เดิม หน้าที่เรียกใช้ราว 60 จุดจึงไม่ต้องแก้ จากนั้นย้ายกล่องลอยที่เขียนเองทีละไฟล์

แนวทางที่ไม่เลือก: ใช้ API shadcn ตรงทุกจุด (diff ใหญ่หลายเท่า ทับงาน B) · วาง shadcn คู่ขนานใน `ui/shadcn/` (สองระบบอยู่ร่วมนาน ไม่ตรงขอบเขตที่เลือก)

## 3. Token สีและฟอนต์

### 3.1 ตั้ง shadcn

- `components.json`: style `new-york` · `rsc: true` · `tsx: true` · `tailwind.css: src/app/globals.css` · `tailwind.config: ""` (Tailwind 4) · `cssVariables: true` · `iconLibrary: lucide` · aliases `@/components`, `@/components/ui`, `@/lib/utils`, `@/lib`, `@/hooks`
- dependency ใหม่: `radix-ui` (แพ็กเกจรวม) และ `tw-animate-css` · ใช้ `cmdk`, `class-variance-authority`, `clsx`, `tailwind-merge`, `lucide-react` ที่มีอยู่แล้ว · `cn()` อยู่ที่ `src/lib/utils.ts` แล้ว
- ห้ามให้ CLI เขียนทับ token ใน `globals.css` — ถ้า `shadcn init/add` แก้ไฟล์นี้ ให้คืนค่าแล้วเพิ่มเฉพาะ `@import "tw-animate-css";`
- ไม่มี dark mode (ไม่ใส่ `@custom-variant dark` และคลาส `dark:` ที่ CLI สร้างให้ลบออก)
- **cva ของ Button และ Badge อยู่ในไฟล์ `.ts`** (`src/components/ui/button-variants.ts`, `badge-variants.ts`) เพราะ test รันด้วย `node --test` ที่โหลด `.tsx` ไม่ได้ และ `src/lib/design-system.ts` ต้อง import ได้

### 3.2 ค่า token (`:root` ใน `src/app/globals.css`)

ชื่อตาม shadcn · `*-foreground` = ตัวอักษรบนพื้นของ token นั้น (ความหมายเดิมของ `success-foreground` ฯลฯ คือ "ตัวเข้มบนพื้นอ่อน" — เลิกใช้)

| token | ค่า | หมายเหตุ |
|---|---|---|
| `background` / `foreground` | #F8FAFC / #0F172A | เท่าเดิม |
| `card` / `card-foreground` | #FFFFFF / #0F172A | ใหม่ · `surface` เป็นชื่อแฝง `var(--card)` (ใช้ 580 จุด ไม่ต้องแก้) |
| `popover` / `popover-foreground` | #FFFFFF / #0F172A | ใหม่ |
| `primary` / `primary-foreground` | #2563EB / #FFFFFF | เท่าเดิม |
| `primary-soft` / `primary-hover` | #EFF6FF / #1D4ED8 | ใหม่ (แก้ตอนเขียน plan: `text-primary` บน `bg-primary/10` วัดได้ 4.4999:1 ไม่ผ่าน · ขาวบน `bg-primary/90` ได้ 4.34:1 ไม่ผ่าน) |
| `secondary` / `secondary-foreground` | #F1F5F9 / #0F172A | **เปลี่ยนความหมาย** (เดิม #64748B) · ใช้อยู่ 1 จุด `disabled:bg-secondary` ใน `asset-label-batch-tool.tsx:377` ต้องแก้ · scrollbar hover ใน `globals.css` เปลี่ยนเป็น `var(--muted-foreground)` |
| `muted` / `muted-foreground` | #F1F5F9 / #475569 | เท่าเดิม |
| `accent` / `accent-foreground` | #F1F5F9 / #0F172A | เท่าเดิม |
| `destructive` / `destructive-foreground` | `var(--danger)` / #FFFFFF | ใหม่ (ชื่อแฝงให้คอมโพเนนต์ shadcn) |
| `border` / `input` | #E2E8F0 / #E2E8F0 | `input` ใหม่ ค่าเท่า border |
| `ring` | #3B82F6 | เท่าเดิม |
| `sidebar*`, `brand-*` | เท่าเดิม | ไม่ใช้ Sidebar ของ shadcn |

สีสถานะ — แต่ละโทนมี 4 ค่า

| โทน | `{tone}` ตัวอักษร/ไอคอน/พื้นทึบ | `{tone}-foreground` | `{tone}-soft` | `{tone}-border` | `{tone}-hover` |
|---|---|---|---|---|---|
| success | #15803D | #FFFFFF | #F0FDF4 | #BBF7D0 | #166534 |
| warning | #B45309 | #FFFFFF | #FFFBEB | #FDE68A | #92400E |
| danger | #B91C1C | #FFFFFF | #FEF2F2 | #FECACA | #991B1B |
| info | #2563EB | #FFFFFF | #EFF6FF | #BFDBFE | #1D4ED8 |

`{tone}-hover` ใช้เป็นพื้นตอน hover ของปุ่มทึบ (เข้มขึ้น ไม่ใช่จางลง) เพราะขาวบน `/90` ของ success/warning/primary ได้แค่ 4.2–4.3:1

ทุกค่าใน `@theme inline` ต้องมี `--color-*` คู่กัน (เช่น `--color-warning-soft: var(--warning-soft)`)

### 3.3 Codemod และกติกาสี

1. `bg-{success|warning|danger|info}/{5|10|15|20}` → `bg-{tone}-soft` (ราว 320 จุด รวม prefix เช่น `hover:`) · `bg-primary/{5|10|15}` → `bg-primary-soft` (153 จุด)
2. `bg-{primary|success|warning|danger|info}/90` → `bg-{tone}-hover` (115 จุด ส่วนใหญ่เป็น `hover:bg-primary/90`) — เหตุผล: ถ้าใช้พื้นโปร่ง /10 ของสีที่เข้มขึ้น เขียว/ส้มยังได้แค่ 4.4:1 และพื้นเหลืองจะหม่นเป็นน้ำตาล
3. `text-{tone}-foreground` เดิม (24 จุด ใช้เป็นตัวเข้มบนพื้นอ่อน) → `text-{tone}`
4. `text-primary/60`, `text-primary/70` (3 จุด) → ค่าที่ผ่าน AA (`text-primary` หรือ `text-muted-foreground` ตามบริบท)
5. สีจากพาเลต Tailwind ที่ใส่ตรง (72 จุด เช่น `text-amber-600`) — ตรวจด้วยสคริปต์ แก้**เฉพาะคู่ที่ไม่ผ่าน AA** ให้ใช้ token
6. `border-{tone}/NN` ไม่ต้องแก้ (เส้นตกแต่ง ไม่ใช่ข้อความ)

### 3.4 test สี

`tests/design-tokens-contrast.test.ts` อ่าน `:root` จาก `globals.css` แล้วคำนวณ contrast (สูตร WCAG 2.x) ต้อง ≥ 4.5:1 ทุกคู่:

- `{tone}` บน #FFFFFF, `background`, `muted`, `{tone}-soft` — ทั้ง 4 โทน
- `{tone}-foreground` บน `{tone}` — ทั้ง 4 โทน
- `primary-foreground` บน `primary` · `foreground` บน `background`/`card`/`muted` · `muted-foreground` บน `background`/`card`/`muted` · `secondary-foreground` บน `secondary`
- `primary` บน `primary-soft` · `primary-foreground` บน `primary-hover` · `{tone}-foreground` บน `{tone}-hover` ทั้ง 4 โทน

ค่าที่วัดไว้แล้ว: success/warning ink 5.02 บนขาว · 4.79–4.80 บน #F8FAFC · 4.58 บน muted · 4.79–4.84 บน soft · danger 6.47 (5.9 บน soft) · info/primary 5.17 (4.75 บน soft) · ขาวบนพื้นทึบเท่ากันกับบนขาว · ขาวบน hover 6.7–8.3

### 3.5 ฟอนต์

- `src/app/layout.tsx`: `Inter({ subsets: ["latin"], variable: "--font-inter" })` + `Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai" })` (variable font ทั้งคู่) · ใส่ทั้งสอง `.variable` ที่ `<html>`/`<body>`
- `@theme inline`: `--font-sans: var(--font-inter), var(--font-thai), system-ui, sans-serif` · body ใช้ `font-sans` (เลิกใช้ `inter.className`)
- ตัวไทยไม่มีใน Inter เบราว์เซอร์จึงไปใช้ Noto Sans Thai ทีละตัวอักษร
- แก้ `DESIGN.md` (frontmatter typography + หัวข้อสี/ฟอนต์) ให้ตรง

## 4. คอมโพเนนต์

### 4.1 คอมโพเนนต์ shadcn ที่ติดตั้ง

`src/components/ui/`: `button.tsx`, `badge.tsx`, `dialog.tsx`, `alert-dialog.tsx`, `sheet.tsx`, `dropdown-menu.tsx`, `popover.tsx`, `command.tsx` (ชื่อไม่ชนไฟล์เดิม) · import จาก `radix-ui` · ปรับขนาดให้เป้าแตะบนมือถือสูง ≥ 44px (`min-h-11`) แบบเดียวกับของเดิม

### 4.2 คอมโพเนนต์กลาง — เปลี่ยนไส้ใน คง props

| คอมโพเนนต์ | ไส้ในใหม่ | ข้อกำหนด |
|---|---|---|
| `AccessibleDialog` | Dialog | props เดิม + `size?: "sm" \| "md" \| "lg" \| "xl"` (ค่าเริ่ม = ความกว้างเดิม) · ตอน `busy` กัน Esc/คลิกนอกกล่อง (`onEscapeKeyDown`, `onInteractOutside` → `preventDefault`) · `initialFocusRef` ผ่าน `onOpenAutoFocus` · เนื้อหา `max-h-[92dvh]` เลื่อนภายใน · ปุ่ม X มี label `common.close` |
| `ConfirmTextDialog`, `OperationReviewDialog` | ใช้ `AccessibleDialog` | props เดิม · ปิดด้วยคลิกนอกกล่องได้เหมือนเดิม (ยกเว้นตอน busy) |
| `ActivityDrawer` | Sheet ด้านขวา | props เดิม · ข้อความ "Close" ที่ hard-code เปลี่ยนเป็น `common.close` |
| `SearchableSelect` | Popover + Command | props เดิม · `shouldFilter={false}` แล้วกรองด้วยตรรกะเดิม (ย้ายเป็นฟังก์ชันล้วนใน `.ts` ถ้ายังไม่เป็น) ผลค้นหาไทยจึงไม่เปลี่ยน · Popover กว้างเท่าปุ่ม · ใช้ใน dialog ได้ (Esc ปิด popover ก่อน dialog) · ลบ `src/lib/searchable-select-navigation.ts` + test เมื่อไม่มีที่ใช้ |
| `ActionButton`, `getActionButtonClasses` | `buttonVariants` | `primary→default`, `secondary→outline`, `danger→destructive`, `ghost→ghost` · `getActionButtonClasses(variant, size)` คืนคลาสจาก `buttonVariants` ผู้เรียกเดิมไม่ต้องแก้ |
| `StatusBadge` + `StatusPill` | Badge แบบ C ตัวเดียว | `StatusBadge({ label, status?, tone?, size?, color?, className? })` · ทุกโทนมีจุด + `{tone}-soft` + `{tone}-border` + ตัว `{tone}` (neutral/muted ใช้ `muted` + `muted-foreground`) · **`color` ที่ตั้งใน DB ใช้กับจุดเท่านั้น** ตัวอักษรเป็นสีเข้ม จึงผ่าน AA ทุกสี · ย้ายผู้ใช้ `StatusPill` 3 ไฟล์มาใช้ `StatusBadge` แล้วลบ `status-pill.tsx` · `getStatusTone` และ `getAssetStateTone` คงไว้ |

### 4.3 คอมโพเนนต์ใหม่

- **`ConfirmProvider` + `useConfirm()`** (`src/components/ui/confirm-dialog.tsx`, client) — วางครั้งเดียวใน `DashboardShell`
  - `confirm({ title, description?, confirmLabel?, cancelLabel?, tone?: "default" | "destructive" }): Promise<boolean>`
  - แสดงด้วย AlertDialog · กดยืนยัน → `true` · ยกเลิก/Esc → `false` · คลิกนอกกล่องไม่ปิด (พฤติกรรม AlertDialog)
  - `tone: "destructive"` → ปุ่มยืนยันสีแดง และโฟกัสเริ่มที่ปุ่มยกเลิก
  - เรียกซ้อนระหว่างที่เปิดอยู่ → เข้าคิว FIFO · ตรรกะคิวเป็นฟังก์ชันล้วนใน `src/lib/confirm-queue.ts`
  - ค่าเริ่ม: `confirmLabel = common.confirm` · `cancelLabel = common.cancel`
- **`AttachmentPreviewDialog`** (`src/components/ui/attachment-preview-dialog.tsx`) — `{ open, onOpenChange, title, kind: "image" | "pdf", src, alt? }` · Dialog ขนาด `xl` พื้นหลังเข้ม · ใช้แทน lightbox 2 ตัว

## 5. ย้ายกล่องลอยที่เขียนเอง

| ไฟล์ (จุดเริ่ม) | ปัจจุบัน | เป้าหมาย |
|---|---|---|
| `admin/IntegrationClientManager.tsx:381` | dialog แก้ scope | `AccessibleDialog` |
| `admin/system-settings-form.tsx:1344` | dialog prefix หมวด (role อยู่ที่ backdrop ไม่มี label) | `AccessibleDialog` |
| `assets/asset-component-manager.tsx:562` | dialog ถอดชิ้นส่วน | `AccessibleDialog` (`busy` ตอนบันทึก) |
| `assets/asset-register-table.tsx:853` | dialog แก้ไขแบบกลุ่ม (ไม่มี role) | `AccessibleDialog` |
| `audit/audit-finding-review-actions.tsx:491` | `Modal` ภายใน (ใช้ 3 จุด :199, :339, :452) | ลบ `Modal` ใช้ `AccessibleDialog` |
| `audit/audit-mark-not-found-button.tsx:92` | dialog ไม่พบ | `AccessibleDialog` |
| `audit/audit-round-cancel-button.tsx:76` | dialog ยกเลิกรอบ | `AccessibleDialog` |
| `audit/audit-scan-form.tsx:1926` | dialog ชิ้นส่วนหาย | `AccessibleDialog` |
| `disposal/disposal-bulk-approval.tsx:561` | dialog อนุมัติแบบกลุ่ม | `AccessibleDialog size="xl"` (`busy` ตอน commit) |
| `disposal/disposal-bulk-execution.tsx:824` | dialog จำหน่ายแบบกลุ่ม | `AccessibleDialog size="xl"` (`busy` ตอน commit · คง `aria-busy`) |
| `disposal/disposal-decision-button.tsx:194` | dialog อนุมัติ/ไม่อนุมัติ | `AccessibleDialog` (`busy` ตอนบันทึก) |
| `disposal/disposal-execution-button.tsx:246` | dialog จำหน่าย | `AccessibleDialog` (`busy` ตอนบันทึก) |
| `assets/asset-attachments.tsx:474` | `PhotoLightbox` | `AttachmentPreviewDialog kind="image"` |
| `maintenance/maintenance-attachments.tsx:222` | ตัวอย่างรูป/PDF | `AttachmentPreviewDialog` |
| `assets/asset-evidence-drawer.tsx:53` | drawer หลักฐาน | Sheet ด้านขวา (ข้อความ "Close" → `common.close`) |
| `layout/dashboard-shell.tsx:173` + `layout/sidebar.tsx:198` | เมนูมือถือ | Sheet ด้านซ้าย ใส่เนื้อหาเมนูเดิม · desktop ไม่เปลี่ยน · ปุ่ม "เพิ่มเติม" คง `aria-expanded` |
| `assets/asset-detail-action-menu.tsx:53` | เมนู "เพิ่มเติม" (มือถือเป็น bottom sheet) | DropdownMenu ทุกขนาดจอ (`align="end"` · รายการสูง ≥ 44px บนมือถือ) |
| `assets/asset-register-action-menus.tsx:98` | `FixedActionMenu` (คำนวณตำแหน่งครั้งเดียว) | DropdownMenu (ตำแหน่งตาม scroll/resize · ปุ่มลูกศรเลื่อนรายการได้) |
| `layout/topbar.tsx:171` | กระดิ่งแจ้งเตือน | Popover |
| `layout/topbar.tsx:236` | เปลี่ยนภาษา | DropdownMenu |
| `layout/topbar.tsx:273` | เมนูผู้ใช้/ออกจากระบบ | DropdownMenu |
| `assets/asset-state-help-popover.tsx:77` | คำอธิบายสถานะ (hover/focus/click) | Popover · เปิดด้วย hover/focus/คลิกเหมือนเดิม (controlled) |
| `layout/global-search.tsx:164` | ผลค้นหา (ไม่มี role listbox/option) | Popover ยึดกับช่องค้นหา (`PopoverAnchor`) + Command list · คงแสดงเฉพาะ `lg` ขึ้นไป · ช่องค้นหาอยู่ที่เดิม |

**กฎกล่องซ้อน:** dialog/drawer ที่เปิดจากเมนู**ห้ามวางอยู่ในเนื้อหาเมนู** — รายการในเมนูแค่ตั้ง state ให้เปิด และ dialog วางนอกเมนู (ตอนนี้ `assets/[id]/page.tsx:934-975` วาง `TransactionCancelDialog`, `ActivityDrawer`, `AssetEvidenceDrawer` ไว้ในเมนู ทำให้กด Esc แล้ว dialog หายไปด้วย) · `ActivityDrawer`/`AssetEvidenceDrawer` จึงต้องรองรับการเปิดแบบ controlled (`open`, `onOpenChange`) เพิ่มจาก trigger ของตัวเอง

ทุกตัวในตารางได้ portal + scroll lock + คืนโฟกัสจาก Radix · เลิกใช้ listener `keydown`/`mousedown` และ focus trap ที่เขียนเอง

## 6. แทน `window.confirm`

| ไฟล์:บรรทัด | title (key เดิม) | ปุ่มยืนยัน | tone | วิธี |
|---|---|---|---|---|
| `admin/IntegrationClientManager.tsx:189` | `integrationApiPage.confirmScopeExpansion` | `common.confirm` | default | await (helper เปลี่ยนเป็น async) |
| `admin/IntegrationClientManager.tsx:245` | `integrationApiPage.confirmRotate` | ปุ่มหมุนเวียน token เดิมของหน้า | destructive | await |
| `admin/IntegrationClientManager.tsx:250` | `confirmEnable` / `confirmDisable` | ปุ่มเปิด/ปิดเดิมของหน้า | default / destructive | await |
| `admin/storage-archive-button.tsx:15` | `storagePage.archiveConfirm` | ปุ่มย้ายไป archive เดิม | default | await |
| `assets/asset-attachments.tsx:126` | `common.deleteConfirm` | `common.delete` | destructive | await |
| `assets/asset-purchase-documents.tsx:44` | `common.deleteConfirm` | `common.delete` | destructive | await |
| `audit/audit-round-close-button.tsx:33` | `auditRound.closeConfirm` | ปุ่มปิดรอบเดิม | default | await |
| `disposal/disposal-attachments.tsx:59` | `common.deleteConfirm` | `common.delete` | destructive | await |
| `master-data/asset-model-form.tsx:189` | `common.deleteConfirm` | `common.delete` | destructive | await |
| `master-data/master-data-delete-button.tsx:15` | `common.deleteConfirm` | `common.delete` | destructive | await (ใช้ใน 9 wrapper รวม `AssetDeleteButton`) |
| `disposal/disposal-bulk-approval.tsx:313` | `disposalPage.bulkDiscardSelection` | `common.confirm` | destructive | ตัวกันออกจากหน้า |
| `disposal/disposal-bulk-execution.tsx:477` | `disposalPage.bulkExecutionDiscardSelection` | `common.confirm` | destructive | ตัวกันออกจากหน้า (รวม event นำทางแถว :493-503) |
| `master-data/supplier-form.tsx:84` | `supplier.unsavedChangesConfirm` | `common.confirm` | destructive | ตัวกันออกจากหน้า |

ถ้าหน้านั้นไม่มี key ของปุ่มที่ระบุว่า "ปุ่ม…เดิม" ให้ใช้ข้อความเดียวกับปุ่มที่ผู้ใช้กดก่อนเปิด confirm

**ตัวกันออกจากหน้า (3 จุด):** `confirm()` เป็น async จึงต้อง `event.preventDefault()` (และ `stopPropagation()` ถ้าเป็น capture handler) **ทุกครั้งที่มีของค้าง** แล้วค่อย `await confirm(...)` · ยืนยัน → ปลดตัวกันแล้วไปต่อเอง: ลิงก์ → `router.push(href)` · ฟอร์ม → `form.requestSubmit()` · event นำทางแถว → เรียกการนำทางเดิม · ยกเลิก → อยู่หน้าเดิม ไม่เสียของที่เลือก

**ข้อความหลังลบ:** จุดที่ลบสำเร็จแล้ว toast `common.savedSuccess` (`master-data-delete-button`, `asset-attachments:139`, `asset-purchase-documents:54`, `disposal-attachments`, `asset-model-form`) เปลี่ยนเป็น key ใหม่ `common.deletedSuccess` = "ลบแล้ว" / "Deleted"

## 7. Test

- test รันด้วย `node --test` + type stripping ซึ่งโหลด `.tsx` ไม่ได้ · **ไม่เพิ่ม** jsdom/testing-library/Playwright e2e ในรอบนี้
- **test ใหม่**
  - `tests/design-tokens-contrast.test.ts` (ข้อ 3.4)
  - `tests/confirm-queue.test.ts` — คิว FIFO · resolve true/false · เรียกซ้อน
  - `tests/ui-overlay-guards.test.ts` — สแกน `src`: ไม่มี `window.confirm` · ไม่มี `fixed inset-0` นอก `src/components/ui/` และ `dashboard-shell.tsx` (ตัว shell เอง) · ไม่มี `bg-{success|warning|danger|info}/NN` และ `bg-primary/{5|10|15|90}` · ไม่มี `text-{success|warning|danger|info}-foreground` นอก `src/components/ui/` (ข้างนอกใช้คู่พื้นทึบผ่าน `Button`/`Badge` เท่านั้น) · ไม่มี import `status-pill`
  - button/badge variant mapping ใน `tests/design-system.test.ts` (import จาก `button-variants.ts`)
  - ตรรกะกรองของ `SearchableSelect` (ถ้าย้ายเป็นฟังก์ชันล้วน)
- **test เดิมที่จับ markup เก่าด้วย regex — เขียนใหม่ให้ตรวจข้อกำหนดใหม่:** `accessible-dialog`, `confirm-text-dialog-ui`, `asset-operation-confirmation-ui`, `disposal-detail-workspace` (:71-87), `disposal-bulk-approval` (:71-90), `disposal-bulk-execution-ui`, `audit-not-found-dialog`, `audit-round-cancellation`, `audit-mobile-flow-completion`, `mobile-field-navigation-ui`, `asset-status-help-ui`, `searchable-select-accessibility`, `searchable-select-navigation`, `integration-api-client-admin` (:144), `storage-archive-ui` (:57) · ตรวจสิ่งที่ยังมีความหมาย เช่น dialog จำหน่ายส่ง `busy` · ตัวกันออกจากหน้าเรียก `confirm` · ปุ่ม "เพิ่มเติม" คง `aria-expanded` · ไม่มี dialog อยู่ในเมนู
- `tests/dashboard-layout-scroll.test.ts`, `tests/asset-register-ux.test.ts:175` ต้องยังผ่าน (ไม่ได้ตั้งใจแก้ shell และการ์ดมือถือของทะเบียน)
- ทุก task: `npm test` + `npx tsc --noEmit` + `npm run lint` ผ่าน

## 8. การตรวจก่อนบอกว่าเสร็จ

- ก่อนเริ่ม task แรก: ถ่ายภาพ "ก่อน" บนแอป dev (DB `asset_management_dev`) — dashboard · ทะเบียน · รายละเอียดทรัพย์สิน · ส่งมอบ · ตรวจนับ (375px) · จำหน่ายแบบกลุ่ม · งานซ่อม · ตั้งค่าระบบ · desktop 1440 และ 375
- ตอนจบ: `npm run verify` (lint → test → build)
- บนแอป dev ทั้ง desktop และ 375px:
  - ทุกกล่องลอยในข้อ 5: Tab วนอยู่ในกล่อง · Esc ปิด · โฟกัสกลับปุ่มเดิม · หน้าหลังไม่เลื่อน
  - confirm แบบลบ (ยกเลิกแล้วไม่ลบ · ยืนยันแล้ว toast "ลบแล้ว") และตัวกันออกจากหน้า 3 จุด (ยกเลิกแล้วอยู่หน้าเดิม · ยืนยันแล้วไปต่อ)
  - dialog จำหน่าย/อนุมัติระหว่างบันทึกปิดไม่ได้
  - เมนูแถวในทะเบียนเลื่อนตามตอน scroll · Esc ใน dialog ที่เปิดจากเมนู "เพิ่มเติม" ปิดเฉพาะ dialog
  - `SearchableSelect` ใน dialog: ค้นภาษาไทยได้ผลเหมือนเดิม · Esc ปิด popover ก่อน
- รัน axe-core (ฉีดผ่าน CDN ใน browser ระหว่างตรวจ ไม่ commit) กฎ `color-contrast` บนหน้าหลัก 8 หน้า — ไม่มี violation จาก token
- ถ่ายภาพ "หลัง" เทียบกับ "ก่อน" หาหน้าที่เพี้ยน

## 9. Deploy

- ไม่มี migration DB · ไม่มีตัวแปร env ใหม่
- หลังติดตั้ง dependency: ตรวจ lockfile ด้วย npm 10.9.4 (`npx -y npm@10.9.4 ci --dry-run` หรือ `install --package-lock-only` แล้ว lockfile ไม่เปลี่ยน) เพื่อไม่ให้ `npm ci` บน Production ล้มแบบที่แก้ใน `2c612bf`
- build บน Production ดึง Noto Sans Thai จาก Google Fonts แบบเดียวกับ Inter ที่ดึงอยู่
- merge/deploy เมื่อผู้ใช้สั่ง · deploy ตาม runbook หัวข้อ 19

## 10. เอกสาร

- `DESIGN.md` — token สี, ฟอนต์, ป้ายสถานะแบบ C, กติกา confirm/กล่องลอย
- `DEVELOPER_HANDOFF.md` — ใช้ shadcn อย่างไร (CLI, ห้ามทับ token, cva ใน `.ts`, `useConfirm`, กฎกล่องซ้อน)
- `docs/99_CHANGELOG.md`
- wiki `AssetSystem` (`ams-status`, `ams-log`, `ams-open-questions`) ตาม `AGENTS.md`

## 11. ความเสี่ยง

| ความเสี่ยง | การรับมือ |
|---|---|
| codemod ~320 จุดทำให้บางหน้าสีเพี้ยน | ภาพก่อน/หลัง + guard test |
| Popover ซ้อนใน Dialog โฟกัส/Esc ผิดลำดับ | ใช้ portal ของ Radix ทั้งคู่ · ตรวจมือใน `repair-record-actions`, `disposal-execution-button`, `audit-finding-review-actions` |
| ตัวกันออกจากหน้าแบบ async พลาดกรณีที่เคยกันได้ | test ซอร์ส + ตรวจมือ 3 จุด |
| `cmdk@1.1.1` ดึง `@radix-ui/*` รุ่นแยกจาก `radix-ui` ทำให้ bundle ซ้ำ | ยอมรับในรอบนี้ · ดูขนาด First Load JS จาก `next build` ก่อน/หลัง แล้วบันทึกไว้ |
| lockfile ไม่ตรงกับ npm 10 บน Prod | ตรวจตามข้อ 9 |
