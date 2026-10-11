> ร่างส่วนนี้ของสเปก `2026-10-11-ui-phase2a-design.md` · **ข้อ 10 ในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** โดยเฉพาะ I15 (มุมโค้งตามต้นแบบจริง: ปุ่ม md/lg และช่องกรอก 8px · ปุ่ม sm, segmented, chip และป้ายสถานะ 6px · เมนู popover toast 12px) และ I14 (สีจางบน primary-soft อนุญาต)

## 7. toast หน้าว่าง และกล่องแจ้ง

2A สร้างของกลาง 4 อย่าง คือ `AppToaster`, `EmptyNote`, `Notice` และชุดไอคอนตามโทน `toneIcons` และปรับ `ActionEmptyState` ในไฟล์เดิม ไม่แก้ call site ของ toast เลย (`toast.*` มี 133 จุดใน 47 ไฟล์ และ `apiError.toast(` มี 62 จุดใน 42 ไฟล์) การไล่แก้กล่องแจ้งที่เขียนเองตามหน้า (ราว 80 จุด) และกล่องว่างที่เขียนเอง (ราว 55 จุด) อยู่ใน 2D ส่วนแถวว่างในตารางไปพร้อมงาน DataTable ใน 2B

ข้อนี้ใช้ของจากข้ออื่นในสเปกเดียวกัน จึงต้องทำหลังข้อ token และข้อปุ่ม:
- `text-meta` (D1)
- `text-faint-foreground` (D2)
- `buttonVariants` ขนาด `sm`/`md` และ variant `outline` ที่ใช้ขอบ `--control-border` (D4, D5)
- `--radius-control` (D7)
- `cn()` ที่ขยาย tailwind-merge แล้ว (ดูความเสี่ยงข้อ 7.11)

### 7.1 ขอบเขต

| งาน | ทำใน | จำนวน |
|---|---|---|
| `AppToaster` และ CSS ของ toast แบบเงียบ | 2A | ไฟล์ใหม่ 1 ไฟล์ แก้ `layout.tsx` และ `globals.css` · call site 0 |
| ปรับ `ActionEmptyState` ในไฟล์เดิม | 2A | 1 ไฟล์ · 29 จุดใน 20 ไฟล์เปลี่ยนตามเอง |
| `EmptyNote` | 2A | ไฟล์ใหม่ · ยังไม่มีที่ใช้ (ที่แรกที่ใช้คือแถวว่างของตารางใน 2B) |
| `Notice` และย้าย `DataFreshnessBanner` ตอนข้อมูลเก่ามาใช้เป็นที่แรก | 2A | ไฟล์ใหม่ 1 ไฟล์ แก้ 1 ไฟล์ |
| `src/components/ui/tone-icons.ts` | 2A | ไฟล์ใหม่ |
| แถวว่างในตาราง: แถวข้อความใน `<td colSpan>` 11 แถว (`tCommon("noData")` 9 แถว และ `admin/storage` 2 แถว) กับ `ActionEmptyState` ใน `<td>` 5 จุด | 2B (`TableEmptyRow` เรียก `EmptyNote`) | 16 |
| `FormContextBanner` (5 จุดใน 4 ไฟล์ อยู่ในฟอร์มทั้งหมด) | 2C | 5 |
| ไล่แก้กล่องแจ้ง · ไล่แก้กล่องว่าง · local component · `getEmptyStateClasses` · `AuditScanSavedBanner` | 2D | ข้อ 7.12 |
| `AssetComponentContextBanner` | เฟส 3 (จัดหน้ารายละเอียดใหม่) | 1 |
| `VoidDocumentBanner` (อยู่ในเอกสาร A4) · `ApiErrorText` | ไม่แก้ | — |

### 7.2 toast แบบเงียบ

**สภาพปัจจุบัน** (ตรวจกับโค้ดและ `node_modules/sonner` 2.0.7 แล้ว)

- `src/app/[locale]/layout.tsx:3,16` render `<Toaster position="top-right" richColors />` ตัวเดียว ครอบทุก route รวม `(auth)` และ `(print)`
- ชนิดที่ใช้จริงมี 3 ชนิด: success 62, error 58 และ warning 13 ส่วน info, message, loading, promise และ custom ไม่มีที่ใช้เลย
- call ที่ส่ง option มีจุดเดียวคือ `use-api-error.ts:21` (`description`) และไม่มี toast ไหนมีปุ่ม action
- สีของ `richColors` ไม่ผ่าน AA ทั้ง 4 แบบ (3.08–4.35:1 ตามสเปกเฟส 1 ข้อ 1)
- sonner ฉีด CSS ตอน runtime ต่อท้าย `<head>` และไม่อยู่ใน layer กฎของเราจึงต้องขึ้นต้นด้วย `:root` แบบเดียวกับกฎฟอนต์ของเฟส 1 (`globals.css:213-216`)
- toast แต่ละอันเป็น `<li tabIndex=0>` ที่ตั้ง `outline: none` วงโฟกัสที่เหลือคือ `0 0 0 2px rgba(0,0,0,.2)` ได้ 1.61:1
- ปุ่มปิดจะขึ้นก็ต่อเมื่อส่ง `closeButton` (ตอนนี้ไม่ได้ส่ง) และกด Escape แค่หุบกอง toast ไม่ได้ปิด (`handleKeyDown` ใน `index.mjs`) ตอนนี้ผู้ใช้คีย์บอร์ดจึงปิด toast ไม่ได้
- ป้ายเป็นภาษาอังกฤษ: container อ่านว่า "Notifications alt+T" และปุ่มปิดอ่านว่า "Close toast"
- **แก้จาก feedback §1.4:** sonner ตั้ง `--width` (356px) เป็น inline style บน `<ol data-sonner-toaster>` ใส่ใน CSS จะไม่มีผล ต้องส่งผ่าน prop `style`
- **แก้จาก feedback §1.4 ข้อ 4:** sonner มี `@media (prefers-reduced-motion)` ที่ตั้ง `transition: none !important; animation: none !important` ให้ toast และลูกทุกตัวอยู่แล้ว ไม่ต้องเพิ่มกฎ
- offset บน 24px ทำให้ toast ทับด้านขวาของแถบบน (สูง 64px ตาม `topbar.tsx:120` `h-16`) ซึ่งเป็นที่อยู่ของกระดิ่งและเมนูผู้ใช้
- ไม่มีกฎซ่อน toast ตอนพิมพ์

**`src/components/ui/app-toaster.tsx` (ไฟล์ใหม่, `"use client"`)**

component อ่านป้ายเองด้วย `useTranslations` ได้ เพราะอยู่ใต้ `NextIntlClientProvider` ที่รับ messages ครบชุดจาก `getMessages()` ส่วน `layout.tsx` เปลี่ยนแค่ import และ render `<AppToaster />`

| prop | ค่า | เหตุผล |
|---|---|---|
| `position` | `"top-right"` | คงเดิม |
| `offset` | `{ top: 72, right: 16 }` | ต่ำกว่าแถบบน 64px อีก 8px · ขอบขวาตรงกับ `px-4` ของแถบบน |
| `mobileOffset` | `{ top: 72 }` (ซ้าย ขวา ล่าง ใช้ค่าตั้งต้น 16) | ที่จอกว้างไม่เกิน 600px sonner ขยาย toast เต็มความกว้าง |
| `duration` | `6000` | ประโยคไทยยาวกว่า · sonner หยุดนับเวลาตอน hover, focus และตอนแท็บถูกซ่อน |
| `closeButton` | `true` | เป็นทางเดียวที่ปิด toast ด้วยคีย์บอร์ดได้ |
| `containerAriaLabel` | `t("notifications.title")` → "การแจ้งเตือน" / "Notifications" | key ที่มีอยู่แล้ว |
| `toastOptions.closeButtonAriaLabel` | `t("common.close")` → "ปิด" / "Close" | key ที่มีอยู่แล้ว ไม่ต้องเพิ่มข้อความ |
| `icons` | success `CircleCheck` · info `Info` · warning `TriangleAlert` · error `OctagonAlert` · close `X` · ทุกตัวใส่ `className="size-4"` | ใช้ชุด `toneIcons` (ข้อ 7.6) · 4 แบบมีรูปทรงต่างกัน |
| `style` | `{ "--width": "380px" }` | Plex Thai กว้างกว่า (เฟส 1 ข้อ 5.3) · ต้องผ่าน `style` เพราะ sonner ตั้งเป็น inline |
| `richColors` · `theme` · `visibleToasts` · `expand` · `hotkey` | ไม่ส่ง | ใช้ค่าตั้งต้น (light, 3 อัน, ไม่กาง, Alt+T) |

**CSS ใน `globals.css`**

กฎอยู่นอก layer และเขียนเป็นบล็อกแยกต่อจากกฎฟอนต์บรรทัด 213-216 ห้ามรวมเข้าบล็อกนั้น เพราะ `visual-foundation-guards.test.ts:51` ตรวจเนื้อบล็อกนั้นแบบตรงตัว สีทุกตัวมาจากบล็อก `:root` และ line-height เขียนเป็นอัตราส่วน

| selector | ค่า |
|---|---|
| `:root [data-sonner-toaster][data-sonner-theme="light"]` | `--normal-bg: var(--card)` · `--normal-border: var(--border)` · `--normal-text: var(--foreground)` · `--border-radius: 12px` (เท่า `.menu` และ `.cmdk`) |
| `:root [data-sonner-toast][data-styled="true"]` | `padding: 12px 40px 12px 16px` (ขวา 40 เว้นที่ให้ปุ่มปิด) · `gap: 10px` · `align-items: flex-start` · `font-size: 14px` · `line-height: calc(22 / 14)` · `box-shadow: var(--shadow-overlay)` |
| `… [data-title]` | `font-weight: 500` · `line-height: calc(22 / 14)` |
| `… [data-description]` | `color: var(--muted-foreground)` · `font-size: 13px` · `line-height: calc(20 / 13)` (บรรทัดเล็กด้านล่างแบบ `ApiErrorText`) |
| `… [data-icon]` · `… [data-icon] svg` | กว้าง 16 สูง 22 · `margin: 0` (ไอคอน 16px อยู่กึ่งกลางบรรทัดแรกที่สูง 22px) |
| `:root [data-sonner-toast][data-type="success"] [data-icon]` / `[data-type="info"]` | `color: var(--success)` / `var(--info)` |
| `:root [data-sonner-toast][data-type="warning"]` | `--normal-bg: var(--warning-soft)` · `--normal-border: var(--warning-border)` · ไอคอน `var(--warning)` |
| `:root [data-sonner-toast][data-type="error"]` | `--normal-bg: var(--danger-soft)` · `--normal-border: var(--danger-border)` · ไอคอน `var(--danger)` |
| `:root [data-sonner-toast]:focus-visible` | `outline: 2px solid var(--ring)` · `outline-offset: 2px` (เหมือน base rule เฟส 1 และยังเห็นใน forced colors ซึ่ง box-shadow หายไป) |
| `… [data-close-button]` | `left: auto; right: 8px; top: 8px; transform: none` · ขนาด 24×24 · `border: 0` · `border-radius: 6px` (= `--radius-control`) · `background: transparent` · `color: var(--muted-foreground)` |
| `:root [data-sonner-toast][data-styled="true"]:hover [data-close-button]:hover` | `background: transparent` · `color: var(--foreground)` · ต้องใช้ selector ยาวขนาดนี้ (specificity 0,6,0) เพราะกฎ hover ของ sonner หนัก 0,5,0 |
| `… [data-close-button]:focus-visible` | `box-shadow: none` · `outline: 2px solid var(--ring)` · `outline-offset: 1px` |
| `@media print` → `:root [data-sonner-toaster]` | `display: none` |

- ตัวหนังสือใช้สี `foreground` ทุกชนิด โทนอยู่ที่ไอคอน
- พื้นอ่อนมีเฉพาะ warning และ error ตามกฎ "tint เฉพาะสิ่งที่ต้องจัดการ"
- ไม่ใช้ `!important`
- ไม่จัดสไตล์ `[data-button]` และ `[data-cancel]` เพราะไม่มี toast ไหนมีปุ่ม action

contrast (คำนวณด้วยสคริปต์ 2026-10-11):

| คู่ | ค่า |
|---|---|
| หัวข้อ `foreground` บน card / warning-soft / danger-soft | 16.92 / 15.50 / 15.08 |
| คำอธิบาย `muted-foreground` บน card / warning-soft / danger-soft | 8.32 / 7.63 / 7.42 |
| ไอคอน success / info / warning / danger บน card | 5.40 / 6.00 / 6.00 / 6.54 |
| ไอคอน warning บน warning-soft · danger บน danger-soft | 5.50 · 5.83 |
| ปุ่มปิด (`muted-foreground`) บนพื้นทั้ง 3 แบบ | ต่ำสุด 7.42 |
| outline ของ toast (อยู่นอกตัว toast 2px) บน card / background / canvas | 4.41 / 4.15 / 3.90 |
| outline ของปุ่มปิดบน warning-soft / danger-soft | 4.04 / 3.93 |

### 7.3 `ActionEmptyState` (ปรับในไฟล์เดิม `src/components/ui/action-empty-state.tsx`)

ใช้เป็นหน้าว่างขนาดใหญ่ระดับหน้าหรือระดับตารางที่มีหัวข้อ คำอธิบาย หรือปุ่ม ชื่อ props เดิมและข้อความที่ test ตรวจคงไว้ทั้งหมด

| ส่วน | เดิม | ใหม่ |
|---|---|---|
| กรอบ (`:36`) | `rounded-md border border-dashed border-border bg-background px-4 py-8` | `flex flex-col items-center px-4 py-10 text-center` ไม่มีขอบและไม่มีพื้น จึงไม่เป็นกล่องซ้อนในแผงหรือในตาราง |
| ไอคอน (`:37`) | วงกลม 44px มีพื้น (`bg-muted` / `bg-danger-soft` / `bg-warning-soft`) | ไม่มีวงกลม · `mb-3 flex [&>svg]:size-6` · empty ใช้ `text-faint-foreground` · error ใช้ `text-danger` · permission ใช้ `text-warning` |
| ไอคอนตั้งต้น (`:18-22`) | `Inbox` / `AlertTriangle` / `ShieldAlert` | `Inbox` / `toneIcons.danger` (`OctagonAlert`) / `ShieldAlert` |
| หัวข้อ | `text-sm font-semibold` | `text-base font-semibold text-foreground text-balance` |
| คำอธิบาย | `mt-1 max-w-md text-sm text-muted-foreground` | คงเดิม เพิ่ม `text-pretty` |
| ปุ่มตั้งต้นเมื่อส่ง `actionHref` กับ `actionLabel` (`:27-32`) | `Link` เขียน class เอง `min-h-11 … sm:h-9 sm:min-h-0` | `Link className={buttonVariants({ variant: actionVariant === "secondary" ? "outline" : "default", size: "md" })}` สูง 36 เท่าเดิม และ 44 เมื่อจอแคบกว่า `md` |
| prop ใหม่ | — | `actionVariant?: "primary" \| "secondary"` (ค่าตั้งต้น primary) · ใช้ secondary กับปุ่ม "ล้างตัวกรอง" เพื่อเก็บสีหลักไว้ให้งานหลัก · call site เริ่มใช้ใน 2B |
| คงไว้ตรงตัว | `const actionNode = action ??` · `<div className="mt-4">{actionNode}</div>` · `details` ใน `mt-4 max-w-md` · ไม่มี `"use client"` (หน้า server เรียกใช้) | |

สิ่งที่ผู้ใช้เห็นทันทีใน 2A: ทั้ง 29 จุดไม่มีกรอบเส้นประแล้ว ส่วน 5 จุดที่อยู่ใน `<td colSpan>` (`audit/findings:401`, `audit/rounds/[id]:711`, `audit/rounds/[id]/pending:201`, `disposal:365`, `asset-register-table:601`) ยังได้ padding ของ td (`px-4 py-6` หรือ `py-8`) ซ้อนกับ `py-10` จนกว่า 2B จะเปลี่ยน td เป็น `p-0`

### 7.4 `EmptyNote` (ไฟล์ใหม่ `src/components/ui/empty-note.tsx`)

หน้าว่างขนาดเล็กบรรทัดเดียว ตาม `.empty` ของต้นแบบ (`base.css:462`, `work-center.html:95`, `mobile.html:117`) ใช้ในรายการ ในส่วนย่อยของแผง และในแถวว่างของตาราง

```ts
type EmptyNoteProps = React.ComponentProps<"p"> & {
  tone?: "empty" | "clear"   // ค่าตั้งต้น "empty"
  icon?: React.ReactNode     // แทนไอคอนตั้งต้น
  padded?: boolean           // ใส่ padding แบบต้นแบบ เมื่อตัวที่ครอบไม่มี padding
}
```

- class ราก: `<p className="flex items-center gap-2 text-meta text-faint-foreground text-pretty [&>svg]:size-4 [&>svg]:shrink-0">` (13/20 สี ink-3 ตามต้นแบบ)
- `padded` เพิ่ม `px-5 py-4` (ต้นแบบใช้ 16 × gutter 20) ใช้ใน `<td colSpan className="p-0">` และในรายการแบบ `.rows` · ใน `ContentPanel` ที่มี `p-4 sm:p-5` อยู่แล้วไม่ต้องใส่
- `tone="clear"` (ไม่มีงานค้าง) แสดง `Check` สีเดียวกับตัวหนังสือ ไม่ใช่สีเขียว · `tone="empty"` ไม่มีไอคอนตั้งต้น
- ไม่มีขอบ ไม่มีพื้น และไม่มี `role` ตั้งต้น ถ้าผลกรองเปลี่ยนแบบสด ให้ใส่ `role="status"` เองที่ call site
- ไม่มี `"use client"`
- contrast ของ `faint-foreground`: card 5.77 · background 5.42 · canvas 5.09 · muted 4.95 · row-hover 5.32 · ห้ามวางบนพื้นอ่อนของโทน (D2)

### 7.5 `Notice` (ไฟล์ใหม่ `src/components/ui/notice.tsx`)

```ts
type NoticeTone = "warning" | "danger" | "info" | "neutral" | "success"
type NoticeProps = Omit<React.ComponentProps<"div">, "title"> & {
  tone: NoticeTone            // ต้องใส่
  title?: React.ReactNode
  children?: React.ReactNode  // เนื้อความ
  action?: React.ReactNode    // ปุ่มหรือลิงก์ใต้เนื้อความ
  icon?: React.ReactNode      // แทนไอคอนตั้งต้น
}
```

prop อื่น (`role`, `aria-live`, `id`, `className`, `data-*`) ส่งต่อไปที่ `<div>` ราก และไม่มี `"use client"`

| tone | รูปแบบ | class ราก | ไอคอนตั้งต้น |
|---|---|---|---|
| `warning` | กล่อง | `grid grid-cols-[20px_minmax(0,1fr)] gap-x-2.5 rounded-md border border-warning-border bg-warning-soft px-4 py-3 text-sm text-foreground text-pretty` | `TriangleAlert` 18px `text-warning` |
| `danger` | กล่อง | เหมือนแถวบน แต่ใช้ `border-danger-border bg-danger-soft` | `OctagonAlert` 18px `text-danger` |
| `info` | ในบรรทัด | `flex items-start gap-2 text-sm text-pretty` (ไม่มีขอบ พื้น หรือ padding) | `Info` 16px `text-info` |
| `neutral` | ในบรรทัด | เหมือน info | `Info` 16px `text-muted-foreground` |
| `success` | ในบรรทัด | เหมือน info | `CircleCheck` 16px `text-success` |

- ช่องไอคอนเป็น `<span aria-hidden className="flex h-5.5 shrink-0 items-center">` ใส่ไอคอน `size-4.5` สำหรับกล่องหรือ `size-4` สำหรับในบรรทัด ไอคอนจึงอยู่กึ่งกลางบรรทัดแรกที่สูง 22px (เท่ากับ `margin-top: 2px` ของต้นแบบ)
- ส่วนเนื้อใน: แบบกล่องใช้ `grid min-w-0 justify-items-start gap-2` (ตาม `.m-stack` ของต้นแบบ) แบบในบรรทัดใช้ `gap-1`
- หัวข้อใช้ `font-semibold text-foreground`
- เนื้อความ:
  - กล่องที่มีหัวข้อ ใช้ `text-meta text-muted-foreground` (ตาม `ul.t-small` ของต้นแบบ)
  - กล่องที่ไม่มีหัวข้อ ใช้ `text-foreground` เพราะเนื้อความคือข้อความหลัก
  - แบบในบรรทัด ใช้ `text-muted-foreground`
- `action` อยู่แถวล่างสุดของเนื้อใน ชิดซ้าย ปุ่มใช้ `Button size="md"` (ต้นแบบ `.btn` สูง 36 และ 44 เมื่อจอแคบกว่า md)
- ใน `notice.tsx` ห้ามมี:
  - `text-faint-foreground`
  - tint แบบ `/NN`
  - สีโทนกับเนื้อความทั้งย่อหน้า (ตอนนี้มีกล่องที่ใช้ `text-warning` 17 กล่อง และ `text-danger` 9 กล่อง ซึ่ง 2D จะแก้)
- กล่อง warning และ danger เป็นกล่องแบบเดียวที่วางในแผงได้ และต้องเป็นเรื่องที่ผู้ใช้ต้องจัดการตอนนี้ (DIRECTION.md:18) · เรื่องที่แจ้งให้ทราบเฉย ๆ ให้ใช้ info หรือ neutral แบบในบรรทัด

contrast:
- `foreground` บน warning-soft / danger-soft ได้ 15.50 / 15.08 และ `muted-foreground` ได้ 7.63 / 7.42
- ไอคอนบนพื้นอ่อนของโทนตัวเองได้ 5.50 / 5.83
- ไอคอน info / success บน card ได้ 6.00 / 5.40 และบน canvas ได้ 5.30 / 4.77
- ถ้าวาง `ApiErrorText` ในกล่อง danger บรรทัดรอง (`text-xs text-muted-foreground`) ได้ 7.42

**role** ส่งต่อจาก call site อย่างเดียว ไม่คำนวณจาก tone ใน component เพราะ test 9 ไฟล์อ่าน role ตรงตัวจาก source ของ call site

| กรณี | เขียนที่ call site | ตอนนี้ใน `src` |
|---|---|---|
| error ที่เกิดหลังผู้ใช้กดคำสั่ง (บันทึกไม่ผ่าน เข้าสู่ระบบไม่ผ่าน) | `role="alert"` ตรงตัว | 17 บรรทัดใน 12 ไฟล์ |
| ผลของงานเบื้องหลังที่เปลี่ยนเอง (บันทึกแล้ว คิวออฟไลน์ คัดลอกแล้ว) | `role="status"` หรือ `aria-live="polite"` ตรงตัว | `role="status"` 11 บรรทัด · `aria-live` 11 บรรทัด |
| ข้อความที่มาพร้อมหน้าตั้งแต่โหลด | ไม่ต้องใส่ | 75 จาก 87 กล่องที่สแกนพบ |

test ที่อ่าน role ตรงตัว: `asset-transaction-cancellation-ui` · `audit-scan-feedback-transition` · `audit-scan-search-ui` · `disposal-bulk-approval` · `disposal-bulk-execution-ui` · `integration-api-client-admin` · `login-form-ui` · `maintenance-option-select` · `supplier-form-ui`

**ที่แรกที่ใช้ใน 2A: `DataFreshnessBanner`** (`src/components/ui/data-freshness-banner.tsx:78-103` ใช้ที่เดียวคือ `audit/findings/page.tsx:202`)
- ตอนข้อมูลเก่าเปลี่ยนเป็น `<Notice tone="warning" title={labels.staleTitle} action={<Button variant="outline" size="md" …>} className="mb-3">{staleHelpText}</Notice>`
- เอากล่องไอคอนที่ซ้อนอยู่ (`border-warning/30 bg-surface`) และ `border-warning/40` ออก
- ไอคอนหมุนตอนโหลดใส่ `motion-reduce:animate-none`
- ตอนข้อมูลยังใหม่ (`:58-75`) ไม่แตะ
- `audit-finding-resolution.test.ts:10` ตรวจแค่ชื่อ component

### 7.6 ชุดไอคอนเดียว (ไฟล์ใหม่ `src/components/ui/tone-icons.ts`)

- `export const toneIcons = { warning: TriangleAlert, danger: OctagonAlert, info: Info, success: CircleCheck } as const` (lucide-react 1.14 · ไม่มี JSX และไม่มี directive)
- ใช้ใน `Notice`, `AppToaster` (error ใช้ danger), `ActionEmptyState` (tone error) และต่อไปใน StatStrip ของ 2B
- โค้ดเดิมที่ใช้ชื่อ alias `AlertTriangle` / `CheckCircle2` ใช้ต่อได้ ไม่ต้องไล่แก้

### 7.7 Test

**คงไว้ ไม่ต้องแก้** (ตรวจบรรทัดแล้ว)

| test | บรรทัด | สิ่งที่ตรวจ |
|---|---|---|
| `tests/system-state-views.test.ts` | 10-13 | `const actionNode = action ??` · `<div className="mt-4">{actionNode}</div>` · `tone="error"` (error.tsx) · `tone="permission"` (access-denied) |
| `tests/api-error-ui.test.ts` | 15-24 · 28 · 31 | ไม่มี toast ที่แสดงข้อความดิบจากเซิร์ฟเวอร์ · `toast.error(message, detail ? { description: detail } : undefined)` · `block text-xs font-normal text-muted-foreground` |
| `tests/visual-foundation-guards.test.ts` | 51 | บล็อก `:root [data-sonner-toaster] { font-family: var(--font-sans); }` |
| `tests/asset-register-ux.test.ts` | 79-81 | `ActionEmptyState {...emptyState}` · tone permission และ error |
| `tests/audit-pending-mobile-ux.test.ts:31` · `tests/disposal-route-structure.test.ts:107` · `tests/supplier-adaptive-ui.test.ts:35` | | ชื่อ `ActionEmptyState` |
| `tests/audit-finding-resolution.test.ts` | 10 | ชื่อ `DataFreshnessBanner` |
| `tests/design-system.test.ts` | 10 · 44 | `getEmptyStateClasses` ตรงกับ `/text-center/` (ลบใน 2D) |

**แก้**

- `tests/visual-consistency-ui.test.ts:35-40` ("empty-state link actions remain thumb-friendly on mobile"): `min-h-11` และ `sm:h-9 sm:min-h-0` ย้ายเข้าไปอยู่ใน `buttonVariants` แล้ว จึงเปลี่ยนไปตรวจ `/buttonVariants\(\{[^}]*size: "md"/` แทน ส่วนความสูง 44px ตอนจอแคบกว่า md ตรวจใน test ของ `buttonVariants` ในข้อปุ่ม
- `tests/design-tokens-contrast.test.ts`: เพิ่ม test ว่า `foreground` และ `muted-foreground` ผ่าน AA บน `warning-soft` และ `danger-soft`

**ใหม่ `tests/feedback-states-ui.test.ts`** (แยกไฟล์ ไม่แตะไฟล์ guard ของเฟส 1)

- ไม่มี `richColors` ใน `src`
- `<Toaster` มีที่ `app-toaster.tsx` ที่เดียว และ `[locale]/layout.tsx` render `<AppToaster />` โดยไม่ import `sonner`
- `app-toaster.tsx` มี `closeButton` · `containerAriaLabel={` · `closeButtonAriaLabel:` · `duration={6000}` · `top: 72` · `"--width": "380px"`
- `globals.css`:
  - บล็อก light มี `--normal-bg: var(--card)`
  - มีกฎพื้นอ่อนของ warning และ error
  - `:root [data-sonner-toast]:focus-visible` ใช้ `outline: 2px solid var(--ring)`
  - มีกฎซ่อนตอนพิมพ์
  - กฎของ sonner ไม่มี `!important` และไม่มี `line-height: \d+px`
- `action-empty-state.tsx` ไม่มี `border-dashed`, `rounded-full` หรือ `bg-background` และมี `buttonVariants(`
- `empty-note.tsx`, `notice.tsx` และ `tone-icons.ts` ไม่มี `"use client"`
- `empty-note.tsx` มี `text-meta text-faint-foreground` และไม่มี `border` หรือ `text-success`
- `notice.tsx`:
  - ไม่มี `text-faint-foreground`, `role=` หรือ `aria-live`
  - ไม่มี tint `/NN` (`(border|bg)-\w+\/\d+`)
  - มี `border-warning-border bg-warning-soft` และ `border-danger-border bg-danger-soft`
- `data-freshness-banner.tsx` มี `<Notice` และไม่มี `border-warning/`
- ถ้าข้อ token ยังไม่มี test เรื่อง `cn` ให้เพิ่มที่นี่: `cn("text-meta text-faint-foreground")` ต้องเหลือทั้ง 2 class

### 7.8 ตรวจบนแอป dev

- **toast ทั้ง 3 ชนิดที่ใช้จริง:** เรียก success (บันทึกฟอร์ม), error ที่มี description (`apiError.toast` จาก error ของ API), error จากการตรวจกรอก (`asset-form`) และ warning (`scanner-text-input`) ที่ความกว้าง 1440 และ 375 เป็นภาษาไทย
  - toast ไม่ทับแถบบน และหัวข้อไม่ลอดใต้ปุ่มปิด
  - ที่ 375 ในหน้าสแกนตรวจนับ ดูว่า toast บังช่องค้นหาแบบ sticky หรือไม่
- **คีย์บอร์ดและโปรแกรมอ่านหน้าจอ:** กด Alt+T แล้ว Tab ต้องเห็นวงโฟกัสทั้งบน toast และปุ่มปิด · ปุ่มปิดอ่านว่า "ปิด" · region อ่านว่า "การแจ้งเตือน alt+T"
- **โหมดพิเศษ:** forced colors ต้องเห็นวงโฟกัส · ตั้ง reduced motion แล้ว toast ต้องไม่เลื่อน · พรีวิวพิมพ์หน้า A4 ต้องไม่มี toast
- **computed style ในเบราว์เซอร์:** ตรวจว่ากฎ `:root` ชนะ sonner ทั้งพื้น ขอบ มุม 12px เงา และสีไอคอน เพราะ test อ่านได้แค่ source
- **`ActionEmptyState`:** หน้า access-denied · error boundary · รายการตัดจำหน่ายว่าง (อยู่ใน td) · รายการผู้ขายที่กรองแล้วไม่พบ · รายการรอตรวจของรอบตรวจนับที่ว่าง
- **`DataFreshnessBanner` ตอนข้อมูลเก่า:** ที่หน้ารายการไม่ตรง รอ 5 นาทีหรือปรับเวลาเครื่อง
- **axe:** color-contrast ต้องได้ 0 บนหน้าที่เปิด toast warning หรือ error ค้างไว้

### 7.9 เอกสาร

- `DESIGN.md:193` (Where Color Lives): เพิ่มว่าเขียว ส้ม และแดง ใช้ได้ที่ไอคอนของ toast, `Notice` และ `ActionEmptyState` (tone error และ permission) และใช้พื้นอ่อนได้เฉพาะ warning/danger ของ toast และ `Notice`
- `DESIGN.md:195`: ข้อยกเว้นเรื่องกล่อง info ที่ยังเป็นสี teal เปลี่ยนเป็น "จนถึง 2D"
- `DESIGN.md:176, 301`: เลิกพูดถึง "empty boxes" / "empty states" ที่ใช้พื้น `background`
- `DESIGN.md:230`: เพิ่มกฎ toast แบบเงียบ
- เพิ่มหัวข้อ Feedback ใน DESIGN.md: Toast · ActionEmptyState · EmptyNote · Notice · กฎ role
- อัปเดต `DEVELOPER_HANDOFF.md` · `docs/99_CHANGELOG.md` · wiki

### 7.10 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | พื้นของ toast | warning และ error มีพื้นอ่อนกับขอบตามโทน · success และ info พื้นขาว | feedback §10 ข้อ 1 แนะนำแบบนี้ และตรงกับ `.notice` ของต้นแบบ |
| 2 | ระยะเวลาแสดง toast | 6000ms ทุกชนิด | Toaster ตั้งเวลาแยกตามชนิดไม่ได้ ถ้าจะแยกต้องแก้ hook ซึ่ง `api-error-ui.test.ts:28` ตรวจอยู่ |
| 3 | ไอคอนของ toast | ใช้ lucide ชุด `toneIcons` แทนไอคอนของ sonner | ไอคอนชุดเดียวกับ Notice (critic §5) |
| 4 | ปุ่มปิด toast | แสดง ขนาด 24px อยู่มุมขวาบนภายใน toast | Escape ของ sonner แค่หุบกอง · 24px ผ่าน WCAG 2.5.8 |
| 5 | ป้ายภาษาไทย | `notifications.title` และ `common.close` | key มีอยู่แล้ว ไม่ต้องแก้ messages · ชื่อซ้ำกับปุ่มกระดิ่ง แต่ role ต่างกัน (region กับ button) |
| 6 | ตำแหน่ง | มุมขวาบน top 72 right 16 · มือถือ top 72 | อยู่ใต้แถบบนที่สูง 64px |
| 7 | ความกว้าง | 380px ส่งผ่าน `style` | feedback แนะนำ 380 · ใส่ใน CSS ไม่ได้เพราะ sonner ตั้งเป็น inline |
| 8 | มุมและเงา | มุม 12px · `shadow-overlay` | toast เป็นชั้นลอยแบบเดียวกับ `.menu` และ `.cmdk` |
| 9 | วงโฟกัสของ toast | ใช้ `outline` ไม่ใช้ box-shadow | เหมือน base rule เฟส 1 และไม่หายใน forced colors |
| 10 | reduced motion | ไม่เพิ่มกฎ | sonner มีกฎนี้อยู่แล้ว (แก้ feedback §1.4 ข้อ 4) |
| 11 | คำอธิบายใน toast | 13/20 สี `muted-foreground` | ตามหลัก "ข้อความไทยก่อน ข้อความเดิมเป็นบรรทัดเล็กด้านล่าง" |
| 12 | ไอคอนของ ActionEmptyState | ไอคอน 24px ไม่มีวงกลม · empty สีจาง · error สีแดง · permission สีส้ม | ตาม feedback §3.4 · สีจางตามไอคอนตกแต่งของต้นแบบ (`.thumb`, `.empty`) |
| 13 | หัวข้อ ActionEmptyState | `text-base` น้ำหนัก 600 | feedback §3.4 (เท่ากับ `.t-section`) |
| 14 | ปุ่มของ ActionEmptyState | `buttonVariants` ขนาด `md` | สูง 36 เท่าเดิม ความสูงปุ่มจึงไม่ปนกัน (D4) · secondary ใช้สีขอบตาม D5 |
| 15 | ตัวหนังสือ EmptyNote | `text-meta text-faint-foreground` | ต้นแบบ `.empty` ใช้ 13/20 สี ink-3 · feedback เขียน `text-sm` ไว้ก่อนจะมี D1 และ D2 |
| 16 | EmptyNote แบบ "ไม่มีงานค้าง" | เครื่องหมายถูกสีเดียวกับตัวหนังสือ ไม่ใช้สีเขียว | ต้นแบบใช้ `currentColor` · สีเขียวใช้กับป้ายสถานะ |
| 17 | padding ของ EmptyNote | ค่าตั้งต้นไม่มี · `padded` ให้ `px-5 py-4` | จุดที่จะแก้ส่วนใหญ่อยู่ในแผงที่มี padding อยู่แล้ว |
| 18 | รูปแบบ Notice ตาม tone | warning และ danger เป็นกล่อง · info, neutral และ success อยู่ในบรรทัด · ไม่มี prop `variant` | ตามที่ผู้ใช้อนุมัติ · tint เฉพาะสิ่งที่ต้องจัดการ · ตัดกล่อง neutral ที่ feedback เสนอเป็นตัวเลือก เพื่อให้ API เล็ก |
| 19 | ไอคอน Notice danger | `OctagonAlert` | รูปทรงต่างจากสามเหลี่ยมของ warning และตรงกับ toast error |
| 20 | เนื้อความของ Notice | มีหัวข้อ → 13/20 สีรอง · ไม่มีหัวข้อ → 14/22 สีปกติ | ต้นแบบมีหัวข้อทุกกล่อง · ถ้าไม่มีหัวข้อ เนื้อความคือข้อความหลัก |
| 21 | `tone` ของ Notice | ต้องใส่ทุกครั้ง | ต้องแก้มือราว 80 จุด และมี 7 จุดที่เลือก tone ตามเงื่อนไข · กันไม่ให้ได้กล่องส้มโดยไม่ตั้งใจ |
| 22 | role ของ Notice | ส่งต่อจาก call site อย่างเดียว ไม่คำนวณจาก tone | test 9 ไฟล์อ่าน role ตรงตัวจาก call site |
| 23 | ปุ่มใน Notice | `size="md"` | ต้นแบบใช้ `.btn` สูง 36 |
| 24 | ที่แรกที่ใช้ Notice | `DataFreshnessBanner` ตอนข้อมูลเก่า | มีจุดเดียว · test ตรวจแค่ชื่อ · ได้ตรวจของจริงบนแอปใน 2A |
| 25 | banner อื่น | `FormContextBanner` → 2C · `AuditScanSavedBanner` → 2D · `AssetComponentContextBanner` → เฟส 3 · `VoidDocumentBanner` ไม่แก้ | ตามลำดับ: อยู่ในฟอร์ม · เป็นหน้าจอสแกนที่มี test ตรวจ · อยู่ในหน้าที่จะจัดใหม่ · อยู่ในเอกสาร A4 |
| 26 | `getEmptyStateClasses` | ไม่แตะใน 2A | 2D เปลี่ยน 3 จุดที่ใช้เป็น EmptyNote และแก้ `design-system.test.ts:10,44` |
| 27 | wrapper `notify()` | ไม่ทำ | ไม่แก้ call site และ `api-error-ui.test.ts:28` ตรวจ hook อยู่ |

### 7.11 ความเสี่ยง

- **ลำดับ CSS ของ sonner:** sonner ต่อ CSS ท้าย head ตอน runtime กฎของเราต้องหนักกว่าทุกจุด รวมถึงกฎ hover ของปุ่มปิดที่หนัก 0,5,0 · test อ่านได้แค่ source จึงต้องดู computed style ในเบราว์เซอร์ (ข้อ 7.8)
- **อัปเกรด sonner:** `package.json:54` ระบุ `^2.0.7` ส่วน CSS ของเราผูกกับ `data-sonner-toast`, `data-styled`, `data-type`, `data-icon`, `data-close-button`, `--normal-bg`, `--border-radius` และ `--width` ที่ตั้งเป็น inline · อัปเกรดเมื่อไรต้องตรวจข้อ 7.8 ซ้ำ
- **tailwind-merge ตัด `text-meta`:** `cn()` ปัจจุบัน (tailwind-merge 3.5.0) คืน `"text-faint-foreground"` จาก `cn("text-meta text-faint-foreground")` เพราะนับทั้งสองเป็นสีตัวหนังสือ ต้องขยาย `cn` ให้รู้จัก `text: ["meta","metric","count"]` และ `radius: ["control"]` ก่อน (ข้อ token) ไม่งั้น EmptyNote และ Notice จะเสียขนาดตัวอักษร
- **toast เงียบลง ข้อความตรวจกรอกจะเห็นยากขึ้น:** `toast.error` ที่เรียกตรงมี 57 จุด ส่วนใหญ่เป็นข้อความตรวจกรอก (เช่น `asset-form.tsx` 13 จุด และ `system-settings-form.tsx` 12 จุด) · ช่วยด้วยเวลา 6 วินาที พื้นแดงอ่อน และปุ่มปิด · ทางแก้จริงคือแสดง error ใต้ช่องกรอกใน 2C
- **toast ย้ายจากแถบบนลงมาทับเนื้อหา:** ที่จอกว้างจะบังปุ่มของหัวหน้าด้านขวาได้ 6 วินาที ส่วนมือถืออาจบังช่องค้นหา sticky ของหน้าสแกน (`audit-scan-search.tsx:47`) · ถ้าตรวจในข้อ 7.8 แล้วบังจริง ให้ใช้ `useMediaQuery` (มีอยู่แล้ว) สลับเป็น `bottom-center` บนมือถือ โดยเว้นที่เหนือแถบล่าง
- **หน้าตาเปลี่ยนทันที 29 จุด:** ActionEmptyState ไม่มีกรอบแล้ว · 5 จุดใน td จะสูงขึ้นเพราะ padding ซ้อนจนถึง 2B · ที่ความกว้าง 640–767px ปุ่มสูง 44 แทน 36
- **ชิ้นที่ยังไม่มีคนใช้:** EmptyNote ยังไม่มีที่ใช้ใน 2A และ Notice มีที่เดียว · API อาจต้องปรับตอน 2B, 2C และ 2D ใช้จริง ซึ่งยังปรับได้จนถึงตอนล็อก guard ใน 2D
- **พึ่งชื่อจากข้ออื่น:** `text-meta`, `text-faint-foreground`, ขนาดปุ่ม `md` และ variant `outline` ต้องมีก่อน ถ้าข้อปุ่มเปลี่ยนชื่อ size หรือ variant ต้องแก้ ActionEmptyState และ test ในข้อ 7.7 ตาม
- **"การแจ้งเตือน" ซ้ำกับชื่อปุ่มกระดิ่ง:** role ต่างกัน ถ้าผู้ทดสอบที่ใช้ screen reader สับสน ค่อยเพิ่ม key ใหม่ (ผ่าน `messages-edit.mjs` และ test glossary)
- **`DESIGN.md:193` จะไม่ตรงความจริงหลัง 2A:** ต้องแก้ในงานเดียวกัน (ข้อ 7.9)

### 7.12 ส่งต่อ

**2B**
- `TableEmptyRow` = `<tr><td colSpan={n} className="p-0"><EmptyNote padded>…</EmptyNote></td></tr>`
- แถวข้อความ 11 แถว:
  - `h-32 px-4 text-center text-muted-foreground` + `tCommon("noData")` 9 แถว ใน `admin/users`, `audit/rounds`, `master-data/{branches,brands,categories,companies,departments,employees,locations}`
  - `admin/storage:110,262`
- `ActionEmptyState` ใน td 5 จุด เปลี่ยน td เป็น `p-0`
- ใส่ `actionVariant="secondary"` ที่ปุ่มล้างตัวกรอง: `supplier-list-view.tsx:84`, `maintenance/page.tsx:220` และ view model ของทะเบียน
- กฎ: มีข้อความบรรทัดเดียว → `EmptyNote` · มีปุ่ม → `ActionEmptyState`

**2C**
- `FormContextBanner` ไม่มี tint แล้ว เป็นแถวบอกบริบท (label `text-meta text-faint-foreground` ไม่มี `uppercase`) props เดิม ที่ใช้ 5 จุด: `checkin-form:294`, `checkout-form:183,272`, `transfer-form:127`, `repair-record-form:104`
- กล่องแจ้งในไฟล์ฟอร์มที่ 2C แก้ทั้งไฟล์อยู่แล้ว เปลี่ยนเป็น `Notice` ได้เลยตามกฎของ 2D

**2D**
- งาน:
  - กล่องแจ้ง: สแกนพบ 87 จุดใน 49 ไฟล์ ในนั้นราว 6 จุดเป็นสถานะการเลือก ไม่ใช่กล่องแจ้ง จึงเหลือราว 80 จุดในราว 45 ไฟล์
  - กล่องว่างราว 55 จุด: กล่องเส้นประราว 42 จุด (`border-dashed` 53 บรรทัดใน 31 ไฟล์ ลบเส้นตกแต่ง 8 และคำแนะนำ 3) · บล็อกจัดกลางแบบเรียบ 10 (ตาม feedback §3.1) · `getEmptyStateClasses` 3
  - ลบ `EmptyState` ของ work-center (ใช้ 5 จุด) และ `EmptyTransferState` · `RelationshipEmptyState` คงชื่อไว้แต่เอากรอบออก
  - map tone ของ `AuditScanSavedBanner`
  - เอาข้อยกเว้นที่ `DESIGN.md:195` ออก
- guard:
  - `border-dashed` ใช้ได้เฉพาะในรายการที่อนุญาต: เส้นต้นไม้ใน `assets/[id]`, `signature-pad`, `file-dropzone`, `audit-scan-room-picker`, `maintenance-attachments`
  - ไม่มีบรรทัดที่มีทั้ง `border-{tone}/NN` และ `bg-{tone}-soft` (รวมไว้กับ guard ของ R1)
- กฎการแก้:
  - warning → กล่อง warning · danger → กล่อง danger · info → info ในบรรทัด
  - primary (บอกบริบทหรือคำแนะนำ) → neutral ในบรรทัด
  - success → success ในบรรทัด หรือ `EmptyNote tone="clear"` ถ้าหมายถึง "ไม่มีอะไรต้องทำ"
  - ข้ามสถานะการเลือก ชิป ปุ่ม และไฮไลต์ช่องกรอก
  - เขียน role ตรงตัวที่ call site
  - กล่องที่มีแค่ "ไม่มี X" → `EmptyNote` · มีหัวข้อกับคำอธิบายหรือมีปุ่ม → `ActionEmptyState`
  - ข้อความเงื่อนไขก่อนทำ (เช่น "บันทึกรุ่นก่อน") → `Notice tone="neutral"`
