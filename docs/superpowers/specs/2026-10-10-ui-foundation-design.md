# รากฐานหน้าตาใหม่ (UI รอบ 4 เฟส 1) — Design

วันที่ 2026-10-10 · branch `feat/ui-foundation` (จาก `master` `e3a91bb`) · ต้นแบบอ้างอิง `docs/superpowers/specs/2026-10-10-ui-foundation/` (เปิด `index.html` ตรงในเบราว์เซอร์) · ฉบับออนไลน์ https://claude.ai/artifact/LfWuVV2v2ftWhgQyzZCFBP

## 1. เป้าหมายและหลักฐาน

ผู้ใช้เห็นว่าระบบ "ดูไม่สวย ไม่พรีเมียม ไม่น่าใช้" (2026-10-08) งานออกแบบใหม่แบ่งเป็น 4 เฟส เฟสนี้วางรากฐานคือสี ตัวอักษร พื้นผิว ป้ายสถานะ และโครงหน้า (เมนูข้าง แถบบน แถบล่างมือถือ) ทำผ่าน token และ helper กลาง เพื่อให้ทุกหน้าเปลี่ยนตามเองโดยไม่ต้องแก้หน้าทีละหน้า ส่วนการจัดหน้าใหม่อยู่เฟส 3

สิ่งที่พบ (critique `.impeccable/critique/2026-10-08T14-17-25Z__src.md` ได้ 23/40 · แนวโน้ม 28 → 22 → 23 · แผนที่โค้ด 2026-10-09):

| เรื่อง | หลักฐาน |
|---|---|
| สีไม่มีเอกลักษณ์ | ใช้ slate/blue ของ Tailwind ตรง ๆ (`--primary #2563EB`) ไม่เกี่ยวกับไอคอนแอป (กรมท่า #083161 + teal #18A0A8) |
| info กับ primary สีเดียวกัน | `--info` = `--primary` = #2563EB · ป้าย "เปิด/วางแผน/แจ้งแล้ว" แยกจากปุ่มหลักไม่ออก |
| วงโฟกัส 3 สี | `ring-primary` 378 จุด · `ring-ring` 55 จุด · `ring-brand-accent` 13 จุด |
| ขอบช่องกรอกจางเกินไป | `--input #E2E8F0` ได้ 1.23:1 บนขาว (WCAG 1.4.11 ต้อง 3:1) |
| เงาทุกแผง | `getPanelClasses` และแถบบนใส่ `shadow-sm` · หน้าดูเป็นกล่องลอยซ้อนกัน |
| เมนูข้างสีเข้มหนัก | `--sidebar #0F172A` แย่งสายตาจากเนื้อหา |
| ตัวอักษร | Inter + Noto Sans Thai · ตัวเลขไทยกว้างไม่เท่ากัน · line-height `text-sm` 20px แน่นไปสำหรับสระซ้อน |
| ป้ายสถานะ | แยกสถานะด้วยสีอย่างเดียว (คนตาบอดสีแยกไม่ได้) · ทุกสถานะมีพื้นสีเท่ากัน ป้ายที่ต้องจัดการไม่เด่น |
| toast | `richColors` ของ sonner ไม่ผ่าน AA ทั้ง 4 แบบ |
| PWA | `themeColor`/`theme_color` #0F172A · `public/sw.js` เก็บ manifest ไว้ใน cache `asset-system-pwa-v1` |

ผู้ใช้เลือก (2026-10-08 ถึง 2026-10-10):

| เรื่อง | เลือก |
|---|---|
| ขอบเขต | ทั้งระบบ แบ่งเป็น 4 เฟส แต่ละเฟสมี spec → plan → ทำ ของตัวเอง |
| เอกลักษณ์ | สีจากไอคอนแอป |
| ชุดสี | "เมนูสว่าง" (`e-light-shell`) |
| ตัวอักษร | IBM Plex Sans + IBM Plex Sans Thai · IBM Plex Mono สำหรับรหัสทรัพย์สินและเลขเอกสาร |
| แดชบอร์ด | ใช้ได้ทั้งคนทำงานและผู้บริหาร (เฟส 3) |
| ทะเบียน | คงรูป · ไม่แสดงมูลค่าและวันตรวจนับล่าสุดโดยค่าตั้งต้น (เฟส 3) |
| ปุ่มในแถว | แบบ "ช1" (เฟส 2) |
| อัปเกรดพรีเมียม | รับทั้ง 11 ข้อ · ไอเดียที่เหลือ "เลือกทั้งหมดตามแนะนำ" (ดูข้อ 2) |

## 2. 4 เฟสและสิ่งที่อยู่ในแต่ละเฟส

| เฟส | เนื้อหา |
|---|---|
| **1 รากฐาน (เอกสารนี้)** | token สี · โฟกัส · ตัวอักษรและ line-height · พื้นผิว (เงา ฉากหลัง scrim) · base rule · ป้ายสถานะ · เมนูข้าง แถบบน แถบล่างมือถือ · `themeColor` และ manifest |
| 2 คอมโพเนนต์กลาง | ช่องกรอก/เลือก (Input, Select) และย้ายฟอร์มมาใช้ · ปุ่มในแถว "ช1" · PageHeader · DataTable และหัวตาราง · แถบตัวเลข (Stat strip) · ใช้ `tag` กับรหัสทรัพย์สิน · dropdown/เมนู · toast แบบเงียบ · skeleton ให้ตรงหน้าจริง · ชุดหน้าว่าง · เลิก tint แบบ `/NN` · guard test |
| 3 จัดหน้าใหม่ | แดชบอร์ด · ทะเบียน (ตัวเลือกคอลัมน์) · รายละเอียดทรัพย์สิน · รอบตรวจนับ · ศูนย์งานค้าง · หน้า login ใหม่ · ส่วนท้ายเมนูข้าง (ผู้ใช้/บทบาท/บริษัท + ปุ่มย่อเมนู) · ทำ mockup ให้ดูก่อน |
| 4 ข้อความและรายละเอียด | ชื่อแท็บตามหน้า · คำบนหน้าที่จัดใหม่ · หน้า 404 และ error ของแอป · สีหัวตาราง Excel |
| ไปกับงานพิมพ์ QR ทีละชุด | เลือกหลายแถว · แถบคำสั่งกลุ่ม · หัวตารางติดบน |

## 3. สี

### 3.1 ค่า token (`src/app/globals.css` บล็อก `:root`)

ชื่อ token เดิมคงไว้ทั้งหมด เปลี่ยนแค่ค่า (class ในโค้ด 1,180+ จุดเปลี่ยนตามเอง)

| token | เดิม | ใหม่ | ที่มาในชุดสี |
|---|---|---|---|
| `--background` | #F8FAFC | #F6F8FB | subtle (ช่องกรอก หน้าต่าง กล่องว่าง ยังใช้ token นี้) |
| `--foreground` / `--card-foreground` / `--popover-foreground` / `--secondary-foreground` / `--accent-foreground` | #0F172A | #0B1D35 | ink |
| `--card` / `--popover` | #FFFFFF | #FFFFFF | surface |
| `--primary` | #2563EB | #1E4F94 | primary |
| `--primary-hover` | #1D4ED8 | #173E76 | primary-hover |
| `--primary-soft` | #EFF6FF | #E9EFF8 | primary-soft |
| `--secondary` / `--muted` | #F1F5F9 | #E9EEF5 | neutral-soft |
| `--muted-foreground` | #475569 | #3C4F6B | ink-2 |
| `--accent` (hover กลาง) | #F1F5F9 | #EBF0F7 | navy-2 · ห้ามใส่ teal |
| `--border` | #E2E8F0 | #D7DEE8 | line |
| `--input` | #E2E8F0 | **#7C8BA0** | ดูข้อ 3.4 |
| `--ring` | #3B82F6 | #10858D | focus |
| `--success` / `-soft` / `-border` / `-hover` | #15803D … | #1D7A35 / #ECF7EF / #B3DCBF / #17652C | ok |
| `--warning` / `-soft` / `-border` / `-hover` | #B45309 … | #A14A05 / #FDF4E4 / #EDCB93 / #843C04 | warn |
| `--danger` / `-soft` / `-border` / `-hover` | #B91C1C … | #B3261E / #FCEFEE / #F1BEB9 / #931F18 | bad |
| `--info` / `-soft` / `-border` / `-hover` | #2563EB … | #0A6E75 / #E5F4F5 / #A3D8DB / #085A60 | teal-ink (แยกจาก primary) |
| `--brand-navy` | #0F172A | #083161 | สีไอคอน |
| `--brand-accent` | #3B82F6 | #18A0A8 | teal ของไอคอน (ห้ามใช้เป็นตัวหนังสือบนขาว ได้แค่ 3.17:1) |
| `--sidebar` | #0F172A | #FFFFFF | navy (ชุดนี้เมนูขาว) |
| `--sidebar-foreground` | #CBD5E1 | #1F3657 | nav-ink |
| `--sidebar-muted` | #94A3B8 | #586A84 | nav-muted |
| `--sidebar-hover` | #1E293B | #EBF0F7 | navy-2 |
| `--sidebar-active` | #1E3A8A | #083161 | navy-3 |
| `-foreground` ของ success/warning/danger/info/primary | #FFFFFF | #FFFFFF | คงเดิม |

token ใหม่ (ทุกตัวต้องมี `--color-X: var(--X);` ใน `@theme inline`):

| token | ค่า | ใช้ที่ |
|---|---|---|
| `--canvas` | #EEF1F6 | ฉากหลังหน้าในโครงแอป (ข้อ 6.1) |
| `--primary-border` | #BACBE4 | ขอบของพื้น `primary-soft` (เดิมยืม `info-border`) |
| `--sidebar-active-foreground` | #FFFFFF | ตัวหนังสือแถวเมนูที่เลือก |
| `--sidebar-active-icon` | #18A0A8 | ไอคอนแถวเมนูที่เลือก (4.09:1 บน #083161 ผ่านเกณฑ์กราฟิก 3:1) |
| `--sidebar-border` | #D7DEE8 | เส้นขวาของเมนูข้าง |

ไม่ใช้ชื่อ `--sidebar-accent` เพราะ shadcn ใช้ชื่อนี้หมายถึงสี hover ของเมนู ถ้าวันหลังรัน `npx shadcn add sidebar` จะชนกัน

ค่าที่ไม่ใช่สีทึบอยู่ในบล็อก `@theme` ธรรมดา (ไม่อยู่ใน `:root` เพราะ test บังคับว่า token ใน `:root` ต้องเป็น hex 6 หลัก):

- `--color-scrim: rgb(8 49 97 / 0.45)` → class `bg-scrim`
- `--shadow-overlay: 0 12px 32px -8px rgb(8 49 97 / 0.18), 0 2px 6px -2px rgb(8 49 97 / 0.10)` → class `shadow-overlay`

### 3.2 สีอยู่ที่ไหน

สีเข้มมีแค่ 3 ที่ คือไอคอนแอป แถวเมนูที่เลือก และปุ่มหลักกับลิงก์ teal ใช้กับสถานะกลุ่ม info (เปิด วางแผน) วงโฟกัส และไอคอนแถวเมนูที่เลือก เขียว ส้ม และแดงใช้เฉพาะในป้ายสถานะ ส่วนอื่นเป็นสีกลาง ได้แก่ เมนูข้างและแถบบนสีขาวขอบบาง ฉากหลังเทาอมฟ้า แผงสีขาว และตัวเลข KPI สีตัวหนังสือปกติ

### 3.3 ผล contrast (คำนวณด้วยสคริปต์ 2026-10-10)

| คู่ | ค่า |
|---|---|
| success / warning / danger / info บน card · background · muted · accent · canvas · soft ของตัวเอง | ต่ำสุด 4.63 (success บน muted) · ผ่าน AA ทุกคู่ |
| ขาวบน success · warning · danger · info · primary และ hover | ต่ำสุด 5.40 |
| primary บน card · background · muted · accent · canvas · primary-soft | ต่ำสุด 6.92 |
| foreground / muted-foreground บน card · background · muted · accent · canvas | ต่ำสุด 7.14 |
| sidebar-foreground บนขาว / บน hover | 12.18 / 10.64 |
| sidebar-muted บนขาว | 5.51 |
| ขาวบน sidebar-active | 12.94 |
| ring #10858D บน card · background · canvas · muted | 4.41 / 4.15 / 3.90 / 3.78 (เกณฑ์ 3:1) |
| input #7C8BA0 บน card · background · canvas | 3.47 / 3.26 / 3.06 (เกณฑ์ 3:1) |

### 3.4 จุดที่ต่างจากต้นแบบ

- **ขอบช่องกรอก #7C8BA0 แทน #8796AA** — #8796AA ของต้นแบบได้ 3.01 บนขาว แต่ 2.83 บน `--background` และ 2.66 บน canvas · #7C8BA0 ผ่าน 3:1 ทั้ง 3 พื้น
- **`--muted-foreground` = ink-2 (#3C4F6B)** ไม่ใช่ ink-3 — token นี้ใช้กับข้อความรองทั่วแอป ตัวไทยเส้นบาง ต้องเข้มพอ (8.32:1 บนขาว) · ink-3 (#56677F) ไว้ใช้กับ placeholder และ meta ในเฟส 2
- **ok (#1D7A35) กับ info (#0A6E75) ความสว่างใกล้กัน (1.11:1)** — แยกด้วยรูปทรงในป้ายสถานะ (ข้อ 7)

## 4. โฟกัส

- วงโฟกัสสีเดียวทั้งแอป คือ `--ring` #10858D
- codemod แบบกลไก (regex จำกัดเฉพาะ prefix โฟกัส): `/(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent)(\/\d+)?(?![\w-])/g` → `$1:$2-ring$4` (ตรวจแล้วไม่มี class อย่าง `focus:ring-primary-foreground` ที่ regex จะจับผิด)
  - ครอบคลุม `focus:ring-primary` 286 · `focus-visible:ring-primary` 71 (+15 แบบ `/40`) · `focus-within:ring-primary` 4 · `focus:ring-primary/30` 2 · `focus:border-primary` 253 · `focus-within:border-primary` 1 · `focus-visible:ring-brand-accent` 11 · `focus:ring-brand-accent/20` 2 · `focus:border-brand-accent` 2 (ช่องกรอกหน้า login)
  - ไม่แตะ `ring-primary` ที่ไม่มี prefix โฟกัส (3 จุด เป็นตัวบอกการเลือก ไม่ใช่โฟกัส)
- กันพลาดใน `@layer base`: `:focus-visible { outline: 2px solid var(--color-ring); outline-offset: 2px }` สำหรับ element ที่ไม่มี class โฟกัส
- โหมดสีตัดกันสูงของ Windows: กฎนอก layer `@media (forced-colors: active) { :focus-visible { outline: 2px solid CanvasText; outline-offset: 2px } }` (วงโฟกัสแบบ ring หายในโหมดนี้ และ `outline-none` ใน layer utilities แพ้กฎนอก layer)

## 5. ตัวอักษร

### 5.1 โหลดฟอนต์ (`src/app/layout.tsx` ที่เดียว)

| ฟอนต์ | ตั้งค่า | ตัวแปร |
|---|---|---|
| `IBM_Plex_Sans` | `subsets: ["latin"]` · variable (ไม่ระบุ weight) · `display: "swap"` | `--font-plex-sans` |
| `IBM_Plex_Sans_Thai` | `subsets: ["thai"]` · `weight: ["400","500","600","700"]` · `display: "swap"` | `--font-plex-thai` |
| `IBM_Plex_Mono` | `subsets: ["latin"]` · `weight: ["400","500","600"]` · `display: "swap"` · `preload: false` · `adjustFontFallback: false` | `--font-plex-mono` |

ใน `@theme inline`:
- `--font-sans: var(--font-plex-sans), var(--font-plex-thai), ui-sans-serif, system-ui, sans-serif;` — Plex Sans ต้องมาก่อน เพราะตัวเลขของ Plex Sans กว้างเท่ากัน ส่วนตัวเลขของ Plex Sans Thai ไม่เท่ากัน
- `--font-mono: var(--font-plex-mono), ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;` — `adjustFontFallback: false` ทำให้ระหว่างรอโหลดใช้ monospace ของเครื่อง แทน Arial ที่ next/font ใส่ให้อัตโนมัติ
- weight 600 ของ Mono จำเป็นตั้งแต่ตอนนี้ (font-mono 44 จุด ในนั้นมี `font-semibold` 7 จุด)

### 5.2 line-height (บล็อก `@theme` ธรรมดา ไม่ใช่ inline เพื่อให้กฎภาษาไทยเข้าถึงได้)

ขนาดตัวอักษรคงเดิม เปลี่ยนเฉพาะ line-height และเพิ่มค่าสำหรับหน้าไทย (`html:lang(th)`) ให้สระและวรรณยุกต์ซ้อนสูงอย่างน้อย 1.44 เท่าของขนาดตัวอักษร

| class | ขนาด | line-height ทุกภาษา | หน้าไทย |
|---|---|---|---|
| `text-xs` | 12 | 16 | 18 |
| `text-sm` | 14 | 22 | 22 |
| `text-base` | 16 | 24 | 24 |
| `text-lg` | 18 | 28 | 28 |
| `text-xl` | 20 | 28 | 30 |
| `text-2xl` | 24 | 32 | 36 |
| `text-3xl` | 30 | 36 | 44 |

กฎภาษาไทยอยู่ใน `@layer base` (`html:lang(th) { --text-xs--line-height: 18px; … }`) ที่ใดระบุ `leading-*` เองจะใช้ค่าที่ระบุ

### 5.3 utility และจุดอื่น

- `@utility num { font-variant-numeric: tabular-nums lining-nums; }` และใน `@layer base` ใส่ `table { font-variant-numeric: tabular-nums; }` · ใส่ `num` ที่ค่าของ MetricCard
- `@utility tag { font-family: var(--font-mono); font-size: calc(1em - 1px); white-space: nowrap; }` — สร้างไว้ก่อน ยังไม่ใช้ (รหัสทรัพย์สิน 119 จุดย้ายในเฟส 2)
- toast ใช้ฟอนต์แอป: กฎนอก layer `:root [data-sonner-toaster] { font-family: var(--font-sans); }` (CSS ของ sonner ไม่อยู่ใน layer กฎใน layer จึงแพ้) · ส่วนสี toast รอเฟส 2
- แถบล่างมือถือ: `text-[11px]` → `text-xs` (2 จุดใน `mobile-field-navigation.tsx`) · `text-[11px]` ที่อื่นอีก 9 จุดรอเฟส 2
- PDF (`src/lib/pdf-font.ts`, `audit-pdf.tsx`) ใช้ Noto Sans Thai ที่ฝังไว้เหมือนเดิม
- ป้ายพิมพ์ความร้อน: ใช้ฟอนต์แอปตามเดิม weight 900 จะกลายเป็น 700 (Plex Thai หนาสุดที่ 700) · ต้องให้ผู้ใช้พิมพ์ทดสอบก่อน deploy ถ้าอ่านยาก ให้โหลด Noto Sans Thai 900 เฉพาะหน้าพิมพ์ป้าย
- Plex Thai กว้างกว่า Noto Thai ประมาณ 4.7% ข้อความไทยจะตัดคำ (truncate) เร็วขึ้นเล็กน้อย ต้องตรวจตอนเทียบบนแอป dev (ข้อ 10)

## 6. พื้นผิวและ base rule

### 6.1 ฉากหลัง

- `bg-canvas` ที่ตัวห่อของ `dashboard-shell.tsx` (`fixed inset-0 … bg-background`) และแถบ sticky เต็มความกว้างบนมือถือ 2 จุดที่ตั้งใจกลืนกับฉากหลัง (`asset-register-toolbar.tsx`, `audit-scan-search.tsx`)
- ไม่เปลี่ยน `<body>` (ยัง `bg-background`) เพื่อไม่ให้หน้าพิมพ์และหน้า login ได้รับผลกระทบ
- ไม่ทำให้ `--background` เข้มขึ้น เพราะ `bg-background` มี 439 จุด (ช่องกรอก หน้าต่าง กล่องว่าง)

### 6.2 เงาและ overlay

- `getPanelClasses()` เอา `shadow-sm` ออก (แผงแยกจากฉากหลังด้วยสีพื้นและเส้นขอบ)
- แถบบน (`topbar.tsx`) เอา `shadow-sm` ออก เหลือ `border-b`
- primitive ที่ลอย (dialog, alert-dialog, sheet, popover, dropdown-menu, command) ใช้ `shadow-overlay` แทน `shadow-lg`/`shadow-md`
- scrim `bg-black/50` → `bg-scrim` ใน dialog, alert-dialog, sheet (กล้องสแกน `bg-slate-950/70` คงเดิม)
- sheet เปิด/ปิด 500/300ms → 250/200ms แบบ ease-out · ใส่ `motion-reduce:transition-none` และ `motion-reduce:animate-none` ที่ sheet และ scrim

### 6.3 base rule ใหม่ใน `globals.css`

- `@layer base { *, ::before, ::after, ::backdrop { border-color: var(--color-border); } }` (shadcn ใส่กฎนี้ไว้ แต่ repo นี้ไม่มี ทำให้ขอบที่ไม่ได้ระบุสีเป็น currentColor)
- `:root { color-scheme: only light; accent-color: var(--primary); }` — `only light` กัน Chrome Auto Dark กับโหมดมืดของ Samsung Internet ส่วน `accent-color` ทำให้ checkbox/radio ของเบราว์เซอร์เป็นสีหลัก
- `::selection { background: var(--primary-border); color: var(--foreground); }`
- แถบเลื่อน: กว้าง 10px · thumb สี `--border` ขอบโปร่ง 3px (`background-clip: padding-box`) มุมโค้งเต็ม · hover เป็น `--input` · ไม่ใช้ `scrollbar-color` เพราะ Chrome 121+ จะไม่สนใจ `::-webkit-scrollbar` ทันทีที่มีค่านี้

### 6.4 helper กลาง (`src/lib/design-system.ts`)

- `getFieldControlClasses()`: `border-border` → `border-input` · `focus:border-primary focus:ring-primary` → `focus:border-ring focus:ring-ring` (ผ่าน codemod ข้อ 4) · พื้นยัง `bg-background`
- tone ของ MetricCard: `border-{tone}/30` → `border-{tone}-border` · `muted` จาก `bg-muted/40` → `bg-background`
- ช่องกรอกที่เขียน class เองอีก 384 บรรทัดยังเป็น `border-border` (ดีขึ้นเองเล็กน้อยจาก 1.23 เป็น 1.35:1) และจะย้ายไปใช้ Input กลางในเฟส 2

## 7. ป้ายสถานะ (`StatusBadge`)

ป้ายแบ่ง 2 ระดับ และใช้เครื่องหมายต่างรูปทรงต่อความหมาย เพื่อให้คนตาบอดสีแยกได้

| tone | ระดับ | เครื่องหมาย | ตัวหนังสือ | พื้น/ขอบ |
|---|---|---|---|---|
| `info` (เปิด วางแผน แจ้งแล้ว และสถานะทรัพย์สินที่ระบบไม่รู้จัก) | สงบ | วงกลมกลวง สี info | muted-foreground | ไม่มี |
| `success` (รวม "พร้อมใช้งาน" และ "ใช้งานอยู่" ตาม `getAssetStateTone`) | สงบ | จุดทึบ สี success | muted-foreground | ไม่มี |
| `primary` (อนุมัติ เสร็จ รับแล้ว) | สงบ | จุดทึบ สี primary | muted-foreground | ไม่มี |
| `neutral` / `muted` | สงบ | ขีดสั้น สี muted-foreground | muted-foreground | ไม่มี |
| `warning` | ต้องจัดการ | สามเหลี่ยม | warning | `warning-soft` + `warning-border` |
| `danger` | ต้องจัดการ | ข้าวหลามตัด | danger | `danger-soft` + `danger-border` |

- ป้ายระดับสงบไม่มี padding ด้านข้าง เพื่อให้ตรงแนวกับข้อความอื่นในคอลัมน์
- เครื่องหมายใช้สีตาม tone เสมอ **เลิกใช้ `color` prop** (สีจาก `asset_statuses.colorCode`/`asset_conditions.colorCode` ส่งมา 9 จุด) เพราะสีในฐานข้อมูลเป็นชุดเก่า ไม่ผ่าน AA และจะทำให้ป้ายมีสองชุดสีปนกัน ข้อมูลในฐานข้อมูลไม่แก้ เอา prop และ `getStatusDotColor` ออก
- `primary` เปลี่ยนขอบจาก `border-info-border` เป็น `border-primary-border`
- การจับคู่สถานะกับ tone (`getAssetStateTone`, `getStatusTone`) คงเดิม · ต้นแบบแยก "พร้อมใช้งาน" (วงกลมกลวง teal) ออกจาก "ใช้งานอยู่" (จุดเขียว) เรื่องนี้ทำในเฟส 3 ตอนจัดหน้าทะเบียน
- ขนาด `xs`/`sm` และ API ส่วนอื่นคงเดิม ป้าย 64 จุดใน 24 ไฟล์เปลี่ยนตามเอง

## 8. โครงหน้า

### 8.1 เมนูข้าง (`src/components/layout/sidebar.tsx`)

- พื้นขาว · เส้นขวา `border-sidebar-border`
- โลโก้: `next/image` ของ `/icons/icon-192.png` ขนาด 32px มุมโค้ง + ชื่อ "ระบบบริหารทรัพย์สิน" / "Asset Management" (key ใหม่ `nav.brandName`) แทน `<Package>` + "AMS" · ตอนย่อเมนูเหลือแต่ไอคอน ชื่อเป็น `sr-only`
- จัดกลุ่มเป็น 3 หมวดมีหัวข้อ (key ใหม่ `nav.sectionDaily` / `nav.sectionAssets` / `nav.sectionSystem`):

| หมวด | ไทย / อังกฤษ | รายการ (เส้นทางและสิทธิ์คงเดิม) |
|---|---|---|
| sectionDaily | งานประจำวัน / Daily work | แดชบอร์ด · ศูนย์งานค้าง · ทรัพย์สินของฉัน |
| sectionAssets | ทรัพย์สิน / Assets | จัดการทรัพย์สิน (กลุ่ม) · ตรวจนับ (กลุ่ม) · ซ่อมบำรุง · ตัดจำหน่าย |
| sectionSystem | ภาพรวมและระบบ / Reports and system | รายงาน · ข้อมูลหลัก (กลุ่ม) · การตั้งค่า (กลุ่ม) |

  หมวดที่ผู้ใช้ไม่มีสิทธิ์เห็นสักรายการจะไม่แสดงหัวข้อ · ตอนย่อเมนู หัวข้อหมวดกลายเป็นเส้นคั่น
- แถวเมนูเว้นขอบ (`mx-2 rounded-md px-3`) · สูง 36px บนจอใหญ่ ส่วนลิ้นชักมือถือคง 44px · ไอคอนสี `sidebar-muted`
- hover: พื้น `sidebar-hover` ตัวหนังสือ `sidebar-foreground`
- แถวที่เลือก (หน้าปัจจุบัน): พื้น `sidebar-active` ตัวหนังสือ `sidebar-active-foreground` น้ำหนัก 500 ไอคอน `sidebar-active-icon` และมี `aria-current="page"` · กลุ่มแม่ของแถวที่เลือกเป็นตัวหนาสีปกติ ไม่มีพื้น
- หาแถวที่เลือกด้วย helper ใหม่ `getActiveNavigationHref(pathname, hrefs)` ใน `src/lib/navigation-active.ts` ซึ่งเลือก href ที่ยาวที่สุดที่ตรงกับ pathname หรือเป็น prefix ที่จบตรง `/` เช่น `/th/assets/new` เลือก "เพิ่มทรัพย์สิน" ไม่ใช่ "ทะเบียน" · `/th/assets/123` เลือก "ทะเบียน" · แทน `hasActiveDescendant` และการเทียบตรงตัวเดิม
- กลุ่มที่มีแถวที่เลือกจะเปิดเอง ทั้งตอนโหลดและตอนเปลี่ยนหน้า กลุ่มที่ผู้ใช้เปิดไว้เองยังเปิดอยู่
- วงโฟกัส `ring-ring`

### 8.2 แถบบน (`topbar.tsx`)

พื้นขาว · `border-b` · ไม่มีเงา · วงโฟกัส 6 จุดจาก `ring-brand-accent` เป็น `ring-ring` (ผ่าน codemod ข้อ 4)

### 8.3 แถบล่างมือถือ (`mobile-field-navigation.tsx`)

`bg-surface/95 … shadow-md backdrop-blur` → `bg-surface` + `border-t` ที่มีอยู่ · ป้ายชื่อเป็น `text-xs`

### 8.4 PWA

- `viewport.themeColor` และ manifest `theme_color` → #FFFFFF (แถบบนเป็นสีขาว)
- manifest `background_color` → #EEF1F6
- `public/sw.js` เปลี่ยนชื่อ cache เป็น `asset-system-pwa-v2` เพื่อให้เครื่องที่ติดตั้งแอปไว้ได้ manifest ใหม่

## 9. Test

แก้ test ที่ยึดหน้าตาเดิม รายการจาก grep มี 11 ไฟล์ ได้แก่ `app-icon`, `approval-inbox`, `asset-form-sticky-actions`, `asset-label-print-ui`, `attachment-thumbnail-route`, `dashboard-shell-theme`, `design-tokens-contrast`, `login-page-ui`, `modern-enterprise-theme`, `settings-ldap-role-ui` และ `visual-consistency-ui` ใน plan ให้ยึดผลที่รัน `npm test` จริงเป็นหลัก ไม่ใช่รายการนี้ หลักที่ใช้แก้:

- ไม่ assert ค่า hex ตายตัว ให้ test ความสัมพันธ์ของ token แทน
- class ที่ test อ่าน (`bg-sidebar`, `bg-sidebar-active`, `hover:bg-sidebar-hover` ฯลฯ) ใช้ชื่อเดิมต่อ

เพิ่มใน `tests/design-tokens-contrast.test.ts`:
- tone ink ทั้ง 4 บน `accent` และ `canvas`
- `primary` บน `muted`, `accent`, `canvas`
- foreground/muted-foreground บน `canvas` และ `accent`
- คู่เมนูข้าง: `sidebar-foreground` บน `sidebar` และ `sidebar-hover` · `sidebar-muted` บน `sidebar` · `sidebar-active-foreground` บน `sidebar-active` (AA) · `sidebar-active-icon` บน `sidebar-active` (≥ 3:1)
- `ring` ≥ 3:1 บน card, background, canvas, muted
- `input` ≥ 3:1 บน card, background, canvas
- `info` ≠ `primary` · `canvas` ≠ `card`
- regex ฟอนต์ใหม่ (`--font-plex-sans`, `--font-plex-thai`, `--font-plex-mono`)

guard ใหม่ `tests/visual-foundation-guards.test.ts` (ย้าย `readSourceFiles` ของ `tests/ui-overlay-guards.test.ts` ไปเป็น helper ที่ import ได้):
- ไม่มี `bg-black/NN` ใน `src/components/ui`
- `getPanelClasses()` ไม่มี `shadow`
- `next/font` import ได้ที่ `src/app/layout.tsx` ที่เดียว
- ไม่มี `(focus|focus-visible|focus-within):(ring|border)-(primary|brand-accent)` เหลือใน `src`
- `StatusBadge` ไม่รับ `color`
- `globals.css` มี `color-scheme: only light` และไม่มี `@custom-variant dark`

`tests/navigation-active.test.ts`: เคส exact · prefix ที่ `/` · prefix ที่ไม่ใช่ `/` (`/th/asset-management` ต้องไม่ตรงกับ `/th/assets`) · เลือกตัวที่ยาวที่สุด · ไม่มีตัวที่ตรง · มี query string

## 10. ตรวจบนแอป dev

- ภาพก่อนและหลังที่ความกว้าง 1440 และ 375 ของหน้าแดชบอร์ด ทะเบียน รายละเอียดทรัพย์สิน รอบตรวจนับ ศูนย์งานค้าง ฟอร์มเพิ่มทรัพย์สิน หน้าต่าง dialog และลิ้นชักเมนูบนมือถือ
- ตรวจข้อความไทยไม่ถูกตัดหัวหรือหาง (สระบน วรรณยุกต์ สระล่าง) ที่ zoom 100% / 125% / 200% โดยเฉพาะจุดที่ใช้ `truncate`
- เดินโฟกัสด้วยคีย์บอร์ดผ่านเมนูข้าง แถบบน ฟอร์ม และ dialog
- โหมดสีตัดกันสูงของ Windows (forced colors) ต้องเห็นโฟกัส
- axe 3 หน้า (แดชบอร์ด ทะเบียน ฟอร์ม) ไม่มี violation เรื่อง contrast
- ตรวจว่าตัวเลขในตารางกว้างเท่ากัน (เทียบความกว้างของ "1111" กับ "0000")
- พรีวิวหน้าพิมพ์ป้าย แล้วให้ผู้ใช้พิมพ์ทดสอบบนเครื่องพิมพ์ความร้อน
- `npm run verify` ผ่าน

## 11. เอกสาร

- `DESIGN.md` เขียนใหม่ทั้ง token สี ฟอนต์ ลำดับขนาดตัวอักษร กฎเงา เมนู และป้ายสถานะ พร้อมเตือนว่า `npx shadcn add` จะเขียน token oklch และบล็อก `.dark` ทับ `globals.css` ต้องตรวจ diff ทุกครั้ง
- `docs/14_UI_UX_DESIGN_SYSTEM.md`, `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`
- wiki `AssetSystem` (หน้า `ams-` ที่เกี่ยวกับหน้าตา + `ams-log.md` + `ams-index.md` ถ้ามีหน้าใหม่) และรัน `wiki-lint`

## 12. ไม่อยู่ในเฟสนี้

| เรื่อง | ไปที่ |
|---|---|
| ย้ายรหัสทรัพย์สินไปใช้ `tag` (119 จุด) · `num` ที่อื่น · Input/Select กลาง และย้ายช่องกรอก 384 บรรทัด · เลิก tint `border-{tone}/NN` (258 จุด) · toast แบบเงียบ · skeleton (`page-skeleton.tsx` ยังมี `shadow-sm` 12 จุด) · หน้าว่าง · ปุ่ม "ช1" · PageHeader · DataTable · Stat strip · dropdown · `text-[11px]` ที่เหลือ | เฟส 2 |
| จัดหน้าแดชบอร์ด ทะเบียน รายละเอียด รอบตรวจนับ ศูนย์งานค้าง · แยกป้าย "พร้อมใช้งาน" กับ "ใช้งานอยู่" · หน้า login · ส่วนท้ายเมนูข้าง · ตัวนับในเมนู | เฟส 3 |
| ชื่อแท็บ · หน้า 404 และ global-error ของแอป (ตอนนี้ใช้หน้าของ Next ที่สลับเป็นโหมดมืดเอง) · สีหัวตาราง Excel `FF1E3A5F` | เฟส 4 |
| สีสถานะในฐานข้อมูล (ข้อมูล Production) · สีลายเซ็น (เป็นหลักฐาน) · QR ต้องดำบนขาว · ฟอนต์ PDF | ไม่แก้ |

## 13. ลำดับงาน (ร่างสำหรับ plan)

1. token สี + test contrast
2. codemod โฟกัส + base rule โฟกัส + guard
3. ฟอนต์ + line-height + `num`/`tag` + ฟอนต์ toast
4. พื้นผิว: canvas เงา scrim sheet base rule แถบเลื่อน helper กลาง
5. ป้ายสถานะ
6. เมนูข้าง + helper หาแถวที่เลือก + ข้อความใหม่ (ผ่าน `node scripts/messages-edit.mjs`)
7. แถบบน แถบล่างมือถือ PWA
8. แก้ test ที่ยึดหน้าตาเดิม + guard ใหม่ + `npm run verify`
9. ตรวจบนแอป dev (ข้อ 10)
10. เอกสารและ wiki

## 14. ความเสี่ยง

- **ทุกหน้าสูงขึ้นเล็กน้อย** — `text-sm` จาก 20 เป็น 22px (1,482 จุด) ที่ที่กำหนดความสูงตายตัวอาจตัดข้อความ ต้องเทียบในข้อ 10
- **ตัวไทยกว้างขึ้นประมาณ 4.7%** — หัวตาราง ป้าย และเมนูอาจตัดคำเร็วขึ้น ต้องเทียบในข้อ 10
- **ป้ายพิมพ์ความร้อนบางลง** (900 → 700) — ต้องพิมพ์ทดสอบก่อน deploy ถ้าไม่ผ่านให้ใช้ทางสำรองในข้อ 5.3
- **codemod 647 จุด** — regex จำกัดเฉพาะ prefix โฟกัส ตรวจด้วย `git diff --stat`, guard test และ tsc
- **สีสถานะที่ผู้ดูแลตั้งในฐานข้อมูลจะไม่แสดงบนป้ายอีกต่อไป** — เป็นการตัดสินใจโดยตั้งใจ (ข้อ 7)
- **เปลี่ยน cache ของ PWA** — เครื่องที่ติดตั้งแอปไว้จะโหลด precache ใหม่ 1 ครั้ง
- **ผู้ใช้เห็นหน้าตาเปลี่ยนทันทีทั้งระบบ** — เฟสนี้ไม่แตะฐานข้อมูล ถ้าต้องถอยกลับ revert ได้ทั้ง branch

## 15. ข้อตัดสินหลังสำรวจโค้ด (2026-10-10 · ใช้แทนข้อความเดิมที่ขัดกัน)

สำรวจโค้ดจริงก่อนเขียน plan (อ่าน 8 ส่วน + จำลองการแก้ใน copy แยกแล้วรัน test) พบจุดที่สเปกข้างบนไม่ครบหรือไม่ตรงโค้ด ตัดสินดังนี้:

| # | เรื่อง | ตัดสิน |
|---|---|---|
| 1 | test ที่พังจริง (ข้อ 9) | จำลองแล้วพัง 8 test ใน 7 ไฟล์: `modern-enterprise-theme` · `visual-consistency-ui` · `asset-label-print-ui:54` · `design-system:33` · `design-tokens-contrast:76` · `status-badge` · `app-icon:26` · ส่วน `approval-inbox`, `asset-form-sticky-actions`, `attachment-thumbnail-route`, `login-page-ui`, `settings-ldap-role-ui` ไม่พัง · แก้ test ในงานเดียวกับที่ทำให้พัง ไม่รวมไว้ท้าย |
| 2 | วงโฟกัสแบบโปร่ง `/40` 15 จุด (หน้าผู้ขาย) | ตัด `/40` ออก เพราะเป็นตัวบอกโฟกัสอย่างเดียวและไม่ถึง 3:1 · `/30` 2 จุดและ `/20` 2 จุดคงไว้ เพราะอยู่คู่กับขอบ `focus:border-ring` ทึบ |
| 3 | วงโฟกัสบนแถวเมนูที่เลือก | ring แบบ inset บนพื้น #083161 ได้แค่ 2.94:1 · แถวเมนูใช้ `ring-offset-2 ring-offset-sidebar` (วงอยู่นอกแถว บนพื้นขาว 4.41:1) |
| 4 | element ที่ถูก focus ด้วยโค้ด (`tabIndex={-1}`) 3 จุด และ container ของ sheet / alert-dialog / dropdown | ใส่ `outline-none` เพื่อไม่ให้กรอบโฟกัสใหม่ล้อมทั้งฟอร์ม |
| 5 | line-height (ข้อ 5.2) | เขียนเป็นอัตราส่วน (`calc(22 / 14)`) ไม่ใช่ px เพื่อให้ลูกที่ใช้ `text-[11px]` ไม่ได้ 22px ตาม · ค่าที่ต่างจากค่าตั้งต้นของ Tailwind จริงมีแค่ `text-sm` (ทุกภาษา) กับ xs / xl / 2xl / 3xl (หน้าไทย) |
| 6 | แถบล่างมือถือ | เอา `leading-tight` ออกด้วย ไม่งั้นป้ายสูงแค่ 15px ไม่ถึงเกณฑ์ไทย · เงาของปุ่มสแกนวงกลมคงไว้ (ปุ่มลอย) |
| 7 | เงาที่ไม่ได้ระบุ | `accessible-dialog.tsx` `shadow-xl` (20 หน้าต่าง) → `shadow-overlay` · `metric-card` `shadow-sm` และ toolbar ทะเบียน `md:shadow-sm` เอาออก · แถบปุ่มล่างมือถือ `mobile-action-bar` และ `disposal-mobile-action-bar` ทำแบบเดียวกับแถบล่าง (ทึบ ไม่มีเงา/เบลอ) · `command.tsx` ไม่มีเงาของตัวเอง ไม่ต้องแก้ |
| 8 | ลดการเคลื่อนไหว | `motion-reduce:animate-none` ธรรมดาแพ้ `data-[state]:animate-*` ใช้ `motion-reduce:animate-none!` ที่ scrim ทั้ง 3 และเนื้อหา dialog / alert-dialog / sheet |
| 9 | `border-info-border bg-primary-soft` | StatusBadge `primary` เป็นแบบสงบ ไม่มีขอบแล้ว · ข้อ "เปลี่ยนเป็น `border-primary-border`" ใช้กับ 5 จุดนอก badge แทน (ชิปตัวกรอง ลิ้นชักตัวกรอง ปุ่มในแถว แท็บสถานะ ตัวเลือกห้อง) |
| 10 | จำนวน StatusBadge | badge กลางจริง 59 จุดใน 22 ไฟล์ (อีก 5 จุดเป็น component ชื่อซ้ำในไฟล์ของตัวเอง ไม่เปลี่ยน) · pill ที่ยังใช้สีจากฐานข้อมูลแบบ inline 2 จุด (`asset-scan-search-tool`, `asset-label-batch-tool`) ย้ายไปเฟส 2 |
| 11 | `public/offline.html` | เปลี่ยน `theme-color` เป็น #FFFFFF และสีในหน้าเป็นชุดใหม่ (อยู่ใน precache ของ PWA) |
| 12 | ชื่อในเมนู ภาษาอังกฤษ | `nav.brandName` en = "Asset Management System" (ถ้าใช้ "Asset Management" จะซ้ำกับชื่อกลุ่มเมนู "จัดการทรัพย์สิน" ฝั่งอังกฤษ) · ไทยคง "ระบบบริหารทรัพย์สิน" |
| 13 | ลำดับงาน | งานสี (ข้อ 13 ขั้น 1) แก้ class สีเข้มในเมนูข้างแบบขั้นต่ำด้วย (`text-white`, `border-white/10`) ไม่งั้นเมนูอ่านไม่ออกจนถึงขั้น 6 |
| 14 | ขอบที่ตั้งใจใช้ currentColor | วงกลมขั้นตอนใน `asset-import-preview-panel.tsx` ใส่ `border-current` ก่อนเพิ่ม base rule เรื่องสีขอบ |
| 15 | แถบบอกว่าเลื่อนแท็บได้ (`asset-detail-tabs.tsx`) | `bg-background/95` → `bg-canvas/95` แบบเดียวกับแถบ sticky |
| 16 | ตรวจบนแอป dev (ข้อ 10) | เพิ่มพรีวิวเอกสาร A4 (ใบส่งมอบ/รับคืน/โอน) ว่าบล็อกลายเซ็นไม่ตกไปหน้า 2 |
| 17 | เอกสาร (ข้อ 11) | เพิ่ม `.impeccable/design.json` และ `docs/07_UAT_CHECKLIST.md:14` (ข้อความ Action Blue / Electric Blue) |
| 18 | หมวดในเมนูข้าง | กรองหมวดด้วย helper ใหม่ `filterNavigationSectionsByPermission` ใน `src/lib/navigation-permissions.ts` (มี test) แทนการให้หมวดเป็นรายการเมนูแบบไม่มีลิงก์ |
