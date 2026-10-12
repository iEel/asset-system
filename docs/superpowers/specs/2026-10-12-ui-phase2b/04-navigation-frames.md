> ร่างส่วนนี้ของสเปก 2B "หน้ารายการและโครงหน้า" · **ข้อตัดสินในสเปกหลักใช้แทนข้อความในไฟล์นี้ทุกที่ที่ขัดกัน** · ตัวเลขและบรรทัดอ้างที่ `master` `d38a0ee`

## 4. เมนูข้างและโครงหน้า

ส่วนนี้กำหนด 4 เรื่องที่ทุกหน้าใช้ร่วมกัน:

- **เมนูข้าง (B1):** โครงรายการใหม่ของหมวด "ทรัพย์สิน" · ลึกไม่เกิน 2 ชั้น · ไอคอนไม่ซ้ำ
- **หัวหน้า:** `PageHeader` ตัวเดียวแทนหัวทุกแบบ และ plan ที่ย้ายแต่ละหัว
- **ปุ่มกลับ (B2):** `PageBackLink` แบบเดียว ทุกจุดที่มีอยู่ + หน้า PM ที่ยังไม่มี (I25)
- **ตัวห่อหน้า:** ระยะระหว่างบล็อก ความกว้าง ระยะล่างบนมือถือ และ skeleton

ส่วนนี้กำหนด API ของ `PageHeader` และ `PageBackLink` เอง เพราะเรื่องที่มันต้องรองรับ (ปุ่มกลับ ป้ายสถานะ ระยะ crumbs) อยู่ในส่วนนี้ primitive อื่น (`DataTable`, `StatStrip`, `TabNav` …) อยู่ในส่วนของกลาง

path: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · **DS** = `DESIGN.md` · **DH** = `DEVELOPER_HANDOFF.md` · **MK** = `docs/superpowers/specs/2026-10-10-ui-foundation/` · **FMG** = `tests/form-migration-guards.test.ts`

**ตรวจแล้ว (read-only):**
- เปิดอ่านทุก file:line ในส่วนนี้ที่ `d38a0ee`
- `<h1` ใน `src` = 60 (`grep -rn "<h1" src --include=*.tsx`) · มี `font-bold` 57 · `font-semibold` 3 (`D/my-assets/page.tsx:166`, `D/my-assets/[id]/page.tsx:59`, `c/audit/audit-scan-header.tsx:31`) · อยู่ใน `D/` 33 ไฟล์ · ใน `c/` 26 · login 1
- ตัวห่อหน้าของ `page.tsx` ทั้ง 79 ไฟล์ใน `D/` นับด้วย `scratchpad/p2b-spec/work/04/roots.mjs` (อ่าน root ของ `return (` บนสุดใน default export)
- `<ArrowLeft` ใน `src` = 27 จุดใน 27 ไฟล์ (`grep -rn "<ArrowLeft" src --include=*.tsx`)
- ไอคอนใหม่ 10 ตัวมีใน `lucide-react` 1.14.0 ที่ติดตั้ง เป็นชื่อหลัก (`declare const X:` ใน `node_modules/lucide-react/dist/lucide-react.d.ts`) ไม่ใช่ alias และไม่มี `@deprecated`
- `assetRegistryGroup` ทั้ง repo: `grep -rn "assetRegistryGroup" . | grep -v node_modules` (ผลในข้อ 4.2.4)
- test ที่อ่าน `sidebar.tsx`, หัวหน้า, ปุ่มกลับ, `returnTo`, skeleton: อ่านทุกบรรทัดที่อ้าง
- ไม่ได้รัน test ไม่ได้เปิดแอป

### 4.1 งานและลำดับ

| งาน | plan | ไฟล์ | test ที่แก้ | test ใหม่ |
|---|---|---|---|---|
| guard ของส่วนนี้ใน LFG: LP1 · LH1 · LB1 · LH2 (ข้อ 4.11, I15) | 2B-1 งาน 1 | — | — | `tests/list-frame-guards.test.ts` (LFG · ทุก commit ที่ย้ายไฟล์ลดแถวของตัวเอง) |
| เมนูข้าง (ข้อ 4.2) | 2B-1 งาน 2 | `c/layout/sidebar.tsx` · `messages/th.json`, `en.json` (ลบ 1 key) | — | `tests/sidebar-menu-structure.test.ts` |
| `PageHeader` + `PageBackLink` (ข้อ 4.3) | 2B-1 งาน 3 (ของกลาง) | ใหม่ `c/ui/page-header.tsx` · `MasterDataHeader` เป็นตัวห่อบาง (`c/master-data/master-data-layout.tsx:5-40`) · `PageHeader` ประจำไฟล์ `D/my-assets/page.tsx:163` ไม่แตะ (2B-5, I14) | `tests/asset-register-filter-ui.test.ts:112-119` · `tests/supplier-adaptive-ui.test.ts:58` (I2) · `tests/breadcrumbs-ui.test.ts:37-42` (R-i) | `tests/list-primitives-ui.test.ts` ส่วนหัวหน้า (I16) |
| หัวหน้า 33 (รวมฟอร์มงาน 6, I13) + ปุ่มกลับที่หัวฟอร์ม 15 + "ยกเลิก" ที่หัว 3 | 2B-1 (หน้าข้อมูลหลัก งาน 13–21 + งาน 22–24) | ข้อ 4.4.2 | `tests/master-data-brand-supplier-ui.test.ts:9-10` · `tests/disposal-route-structure.test.ts:33` | — |
| หัวหน้า 11 (รวม data-quality, integrations, I12) + ปุ่มกลับ 4 + ปุ่มกลับใหม่ของ PM 1 (I25) + ไอคอนแถบล่าง 1 + `pb-24` 1 | 2B-2 | ข้อ 4.4.3 | — | — |
| หัวหน้า 2 (ทะเบียน `compactOnMobile`) | 2B-3 | ข้อ 4.4.4 | `tests/asset-register-filter-ui.test.ts:108` | — |
| หัวหน้า 6 + ปุ่มกลับ 6 + ไอคอนแถบล่าง 1 + `pb-24` 3 + skeleton 5 | 2B-4 | ข้อ 4.4.5 · ข้อ 4.6 · ข้อ 4.7 | `tests/asset-detail-ux.test.ts:27`, `:151-152` (`:32-35` และ `:150` ผ่านต่อ) · `tests/disposal-detail-workspace.test.ts:33` · `tests/supplier-detail-ui.test.ts:28-30` เฉพาะเมื่อ literal หาย · `tests/mobile-field-navigation.test.ts:14-33` (เพิ่ม 1 path) · ส่วนอื่นของ 2B-4 ตามตาราง A ข้อ 10.4 | — (LFG LP1 ลดแถวของไฟล์, I15) |
| หัวหน้า 12 + ปุ่มกลับ 1 + ลบ `MasterDataHeader`, `ReportHeader` + ล็อก guard | 2B-5 | ข้อ 4.4.6 | — | LFG `BUDGETS = KEEP` + test L9 (I15) |
| ส่งต่อ 2C plan 4 | 2C-4 | `c/assets/asset-scan-search-tool.tsx:108-111` · `c/assets/asset-label-batch-tool.tsx:292-295` | — | — |

แต่ละไฟล์ที่ย้ายเป็น 1 commit (หัว + ปุ่มกลับ + ส่วนอื่นของไฟล์นั้นใน plan เดียวกัน) · ห้ามรัน formatter บนไฟล์ 2C (ไฟล์ 2C ในงาน 22–24 ของข้อ 10.3, DH:385)

---

### 4.2 เมนูข้าง (B1)

#### 4.2.1 ตอนนี้

`c/layout/sidebar.tsx:88-215` มี 3 หมวด 6 กลุ่ม 34 รายการ · ไอคอน 40 ตำแหน่ง (34 รายการ + 6 กลุ่ม) ใช้ 29 ชื่อ

```
ทรัพย์สิน sectionAssets :115-166
  จัดการทรัพย์สิน assetManagement (กลุ่ม) :118-144                     Package 20 :120
    ทะเบียน assetRegistryGroup (กลุ่มชั้น 2) :122-132                 Package 18 :124
      assetRegister :126 · addAsset :127 · scanSearchAsset :128 · printLabels :129 · importExport :130
    ธุรกรรม assetTransactionsGroup (กลุ่มชั้น 2) :133-142             ArrowRightLeft 18 :135
      checkout :137 · checkin :138 · transfer :139 · bulkMove :140
  ตรวจนับ audit (กลุ่ม) :145-152 → auditRound :149 · auditFinding :150
  maintenance :153-158 · disposal :159-164
```

- ซ้อน 3 ชั้นที่เดียว (`assetManagement`) · คลิกจากหน้าอื่นไปทะเบียน 3 ครั้ง · ส่งมอบ/รับคืน 3 ครั้ง (WIKI ข้อ 28)
- ไอคอนซ้ำ 8 ชื่อ 19 ตำแหน่ง: `Package` `:120`, `:124`, `:126` · `ArrowRightLeft` `:135`, `:139` · `MapPin` `:140`, `:184` · `ClipboardCheck` `:147`, `:149` · `History` `:150`, `:209` · `Users` `:182`, `:183`, `:194` · `Database` `:178`, `:207` · `Settings` `:192`, `:195`, `:210`
- แถบย่อแสดงแค่ไอคอน (`:367`, `:414` `lg:sr-only`) จึงแยกรายการที่ไอคอนซ้ำไม่ได้

#### 4.2.2 โครงใหม่

ต้นแบบก็เรียงทะเบียนเป็นรายการแรกของหมวด (`MK/screens/register.html:33`) · labelKey, href และ permission ไม่เปลี่ยน · ไม่มี key ใหม่ และไม่เปลี่ยนข้อความ

| # | ชั้น | labelKey | href | permission | ไอคอน (เดิม → ใหม่) | size |
|---|---|---|---|---|---|---|
| **งานประจำวัน** | | | | | | |
| 1 | 1 | `dashboard` | `` `/${locale}/dashboard` `` | `dashboard:view` | `LayoutDashboard` | 20 |
| 2 | 1 | `workCenter` | `` `/${locale}/work-center` `` | `dashboard:view` | `Inbox` | 20 |
| 3 | 1 | `myAssets` (เมื่อมี `user.employeeId`) | `` `/${locale}/my-assets` `` | — | `PackageCheck` | 20 |
| **ทรัพย์สิน** | | | | | | |
| 4 | 1 | **`assetRegister`** | `` `/${locale}/assets` `` | `asset:view` | `Package` (18 → 20) | 20 |
| 5 | 1 | `assetManagement` (กลุ่ม) | — | — | `Package` → **`Boxes`** | 20 |
| 6 | 2 | `addAsset` | `` `/${locale}/assets/new` `` | `asset:create` | `PackagePlus` | 18 |
| 7 | 2 | `scanSearchAsset` | `` `/${locale}/asset-management/scan` `` | `asset:view` | `ScanLine` | 18 |
| 8 | 2 | `printLabels` | `` `/${locale}/asset-management/labels` `` | `asset:view` | `Printer` | 18 |
| 9 | 2 | `importExport` | `` `/${locale}/asset-management/import-export` `` | `asset:view` | `FileSpreadsheet` | 18 |
| 10 | 1 | `assetTransactionsGroup` (กลุ่ม) | — | — | `ArrowRightLeft` 18 → **`Handshake`** 20 | 20 |
| 11 | 2 | `checkout` | `` `/${locale}/asset-management/checkout` `` | `asset:edit` | `LogOut` | 18 |
| 12 | 2 | `checkin` | `` `/${locale}/asset-management/checkin` `` | `asset:edit` | `LogIn` | 18 |
| 13 | 2 | `transfer` | `` `/${locale}/asset-management/transfer` `` | `asset:edit` | `ArrowRightLeft` | 18 |
| 14 | 2 | `bulkMove` | `` `/${locale}/asset-management/bulk-move` `` | `asset:edit` | `MapPin` → **`Move`** | 18 |
| 15 | 1 | `audit` (กลุ่ม) | — | — | `ClipboardCheck` | 20 |
| 16 | 2 | `auditRound` | `` `/${locale}/audit/rounds` `` | `audit:view` | `ClipboardCheck` → **`ClipboardList`** | 18 |
| 17 | 2 | `auditFinding` | `` `/${locale}/audit/findings` `` | `audit:view` | `History` → **`ListX`** | 18 |
| 18 | 1 | `maintenance` | `` `/${locale}/maintenance` `` | `maintenance:view` | `Wrench` | 20 |
| 19 | 1 | `disposal` | `` `/${locale}/disposal` `` | `disposal:view` | `Trash2` | 20 |
| **ภาพรวมและระบบ** | | | | | | |
| 20 | 1 | `reports` | `` `/${locale}/reports` `` | `report:view` | `BarChart3` | 20 |
| 21 | 1 | `masterData` (กลุ่ม) | — | — | `Database` | 20 |
| 22–29 | 2 | `company` · `branch` · `department` · `employee` · `location` · `category` · `brandModel` · `supplier` | เดิม `:180-187` | เดิม | `Building2` · `GitBranch` · `Users` → **`Network`** · `Users` · `MapPin` · `Tag` · `Layers` · `Truck` | 18 |
| 30 | 1 | `administration` (กลุ่ม) | — | — | `Settings` | 20 |
| 31–39 | 2 | `userManagement` · `rolePermission` · `approvalInbox` · `dataQuality` · `integrationApi` · `fileStorage` · `productionReadiness` · `systemLog` · `systemSetting` | เดิม `:194-210` | เดิม (`approvalInbox` ใช้ `anyPermissions` `:199-202`) | `Users` → **`UserCog`** · `Settings` → **`LockKeyhole`** · `FileCheck2` · `ShieldAlert` · `KeyRound` · `Database` → **`HardDrive`** · `Rocket` · `History` · `Settings` → **`SlidersHorizontal`** | 18 |

ผล: 39 ตำแหน่ง (34 รายการ + 5 กลุ่ม) ใช้ 39 ชื่อ ไม่ซ้ำกัน · เปลี่ยนไอคอน 10 ตำแหน่ง · `KeyRound` คงไว้ (`tests/integration-api-client-admin.test.ts:120`)

**จำนวนคลิกจากหน้าอื่น (จอคอม):**

| ไปที่ | เดิม | ใหม่ |
|---|---|---|
| ทะเบียนทรัพย์สิน | 3 | **1** |
| เพิ่ม · สแกน/ค้นหา · พิมพ์ป้าย · นำเข้า/ส่งออก | 3 | 2 |
| ส่งมอบ · รับคืน · โอนย้าย · อัปเดตหลายรายการ | 3 | 2 |
| ที่เหลือ | เท่าเดิม | เท่าเดิม |

ผู้ที่มีแค่ `asset:view` เห็น: ทะเบียน · จัดการทรัพย์สิน ▸ (สแกน, พิมพ์ป้าย, นำเข้า/ส่งออก) · กลุ่มธุรกรรมหายไปเอง เพราะทุกรายการต้องการ `asset:edit` (`src/lib/navigation-permissions.ts:29`)

#### 4.2.3 แก้ใน `sidebar.tsx`

- **ต้นไม้ `:115-166`:** เขียนใหม่ตามตารางข้อ 4.2.2 · ทุกไอคอนเขียนแบบ `<Name size={N} />` บรรทัดเดียว (test ข้อ 4.11 อ่านรูปนี้)
- **import `:7-40`:** เพิ่ม `Boxes`, `ClipboardList`, `Handshake`, `HardDrive`, `ListX`, `LockKeyhole`, `Move`, `Network`, `SlidersHorizontal`, `UserCog` · ไม่ลบตัวไหน (`Package`, `ArrowRightLeft`, `MapPin`, `ClipboardCheck`, `History`, `Users`, `Database`, `Settings` ยังใช้)
- **ระยะเยื้องของกลุ่ม `:373-378`:** `depth === 0 ? "ml-5" : "ml-4"` → `"ml-5"` · ลบ `depth?: number` (`:340`), ค่าตั้งต้น `depth = 0` (`:347`) และ `depth={depth + 1}` (`:389`) เพราะไม่มีกลุ่มชั้น 2 แล้ว (test ยึด)
- **ไม่เปลี่ยน:** `rowClasses` `:67-68` · การกรองสิทธิ์ `:216` · รายการที่เลือก `:217-220` · `aria-current` `:400` · สถานะกลุ่ม `:348-356` · `aside` `:289-296` · `Sheet` `:298-328` · type `MenuItem` `:51-58` ยังเป็นแบบซ้อนได้ (helper ใน `src/lib/navigation-active.ts` รองรับทุกความลึก)

#### 4.2.4 key `nav.assetRegistryGroup`

ใช้อยู่ 4 ที่ + เอกสารแผนเก่า 2 บรรทัด:

| ที่ | ทำอะไร |
|---|---|
| `c/layout/sidebar.tsx:123` | หายไปพร้อมกลุ่ม |
| `messages/th.json:128` ("ทะเบียน") · `messages/en.json:128` ("Register") | ลบด้วย `node scripts/messages-edit.mjs` ไฟล์เปลี่ยนแปลง `{ "delete": ["nav.assetRegistryGroup"] }` |
| `tests/navigation-active.test.ts:49` | **ไม่แก้** · เป็น fixture ของ helper ที่ทดสอบการเดินกลุ่มซ้อน (`:54-66`) ไม่ได้อ่านเมนูจริง |
| `docs/superpowers/plans/2026-10-10-ui-foundation.md:1270`, `:1561` | ไม่แก้ (แผนที่ทำเสร็จแล้ว) |

`nav.assetTransactionsGroup` ("ธุรกรรม" `:129`) และ `nav.assetManagement` ("จัดการทรัพย์สิน" `:127`) ใช้ต่อเป็นกลุ่มชั้น 1

#### 4.2.5 รายการที่เลือก

ไม่แก้โค้ด · `getActiveNavigationHref` (`src/lib/navigation-active.ts:12-20`) เลือก href ที่ยาวที่สุดที่ตรงหรือเป็นคำนำหน้าที่จบด้วย `/` · href ไม่เปลี่ยน ผลจึงเหมือนเดิม ต่างแค่กลุ่มที่เปิดเอง:

| path | แถวที่เลือก | `aria-current` | กลุ่มที่เปิดเอง |
|---|---|---|---|
| `/th/assets` | ทะเบียนทรัพย์สิน | `page` | ไม่มี (เดิมเปิด 2 ชั้น) |
| `/th/assets/123`, `/th/assets/123/components` | ทะเบียนทรัพย์สิน | `true` | ไม่มี |
| `/th/assets/new` | เพิ่มทรัพย์สิน | `page` | จัดการทรัพย์สิน |
| `/th/asset-management/checkout` | ส่งมอบทรัพย์สิน | `page` | ธุรกรรม |
| `/th/maintenance/pm`, `/th/disposal/batches/x` | ซ่อมบำรุง · ตัดจำหน่าย | `true` | — |
| `/th/admin/approvals/history` | งานรออนุมัติ | `true` | การตั้งค่า |
| `/th/notifications` | ไม่มี | — | — |

กลุ่มที่ผู้ใช้เปิดเองยังเปิดค้างระหว่างเปลี่ยนหน้า (`:352-356`) · การจำกลุ่มที่เปิดข้ามการโหลดหน้าใหม่เป็นเฟส 3 (B1)

#### 4.2.6 แถบย่อ (จอ `lg` ขึ้นไป, `lg:w-16`)

- ทะเบียนเป็นไอคอนเดี่ยวในแถบ คลิกครั้งเดียว
- กลุ่มชั้น 1 เป็นไอคอน · กดแล้วรายการลูกกางในแถบ 64px เป็นไอคอนล้วน ไม่เยื้อง (`lg:ml-0 lg:border-l-0 lg:pl-0` `:377`) · ไอคอนไม่ซ้ำจึงแยกได้
- ป้ายยังเป็น `lg:sr-only` (`:367`, `:414`) screen reader อ่านชื่อได้
- ไม่เพิ่มใน 2B: tooltip ของแถบย่อ · จำสถานะย่อ/ขยาย (`dashboard-shell.tsx:23` `useState(false)`) · `aria-expanded` ของปุ่มย่อ (`topbar.tsx:140-147`) → เฟส 3 พร้อม "ส่วนท้ายเมนูข้าง"

#### 4.2.7 มือถือ

- drawer (`:298-328`) ใช้ต้นไม้เดียวกัน แถว 44px · ลึกสุด 1 ระดับเยื้อง (`ml-5`) · ข้อความไทยยาวสุดของหมวดคือ "สแกน/ค้นหาทรัพย์สิน" อยู่ในความกว้าง `min(18rem, 85vw)` ได้ (ตรวจบนแอปที่ 375)
- แถบล่าง (`src/lib/mobile-field-navigation.ts:47-63`) ไม่เปลี่ยน ปุ่ม "ทรัพย์สิน" ไป `/assets` อยู่แล้ว
- "เพิ่มเติม" เปิด drawer เหมือนเดิม และคืนโฟกัสเหมือนเดิม (`:309-322`)

#### 4.2.8 ไม่ทำใน 2B

จำกลุ่มที่เปิด · Enter ในช่องค้นหาด้านบนพาไปทะเบียน · หน้าแรกตามบทบาท · เมนูโปรด (B1 → เฟส 3, WIKI ข้อ 28) · เพิ่ม `maintenance/pm`, `disposal/batches`, `admin/approvals/history` ลงเมนู

---

### 4.3 `PageHeader` และ `PageBackLink` (`c/ui/page-header.tsx` ไฟล์ใหม่)

ทั้งสองตัวไม่มี `"use client"` และไม่มี hook (แบบ `Button`) · ใช้ได้ทั้งใน server page และในฟอร์ม client (R-h)

#### 4.3.1 API

```ts
import type { BreadcrumbItem } from "@/components/ui/breadcrumbs"

export type PageHeaderProps = {
  title: React.ReactNode          // เนื้อของ h1 · ข้อความ หรือรหัส <span className="tag font-medium">
  meta?: React.ReactNode          // แถวใต้หัวเรื่อง: รหัส ป้ายสถานะ ข้อเท็จจริง คำอธิบาย
  actions?: React.ReactNode       // ปุ่มของหน้า (buttonVariants size "md") · ⋯ ก่อน · ปุ่มหลักท้ายสุด
  back?: React.ReactNode          // <PageBackLink …/> เท่านั้น · วางหน้า actions
  breadcrumbs?: BreadcrumbItem[]  // ส่งเป็น array literal ในหน้าเสมอ (test อ่านจาก source)
  compactOnMobile?: boolean       // ทะเบียนทรัพย์สินเท่านั้น
  className?: string              // จัดวางเท่านั้น (mb-6 ในตัวห่อของ component)
}
export function PageHeader(props: PageHeaderProps): React.JSX.Element

export type PageBackLinkProps = {
  href: string
  label: string                                          // ข้อความของหน้านั้น (common.back, disposalPage.backToQueue …)
  onClick?: React.MouseEventHandler<HTMLAnchorElement>   // ฟอร์มผู้ขาย: confirmNavigation
  className?: string
}
export function PageBackLink(props: PageBackLinkProps): React.JSX.Element
```

#### 4.3.2 markup และ class

```tsx
<header data-slot="page-header" className={cn("min-w-0", className)}>
  {breadcrumbs ? <Breadcrumbs items={breadcrumbs} className="mb-1" /> : null}
  <div className={rowClasses}>
    <div className="min-w-0">
      <h1 className={titleClasses}>{title}</h1>
      {meta ? <div data-slot="page-header-meta" className={metaClasses}>{meta}</div> : null}
    </div>
    {back || actions ? <div data-slot="page-header-actions" className={actionsClasses}>{back}{actions}</div> : null}
  </div>
</header>
```

| ส่วน | ค่าปกติ | `compactOnMobile` |
|---|---|---|
| แถว | `flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-x-6` | `flex items-center justify-between gap-3 md:items-start md:gap-x-6` |
| h1 | `text-2xl font-semibold text-balance break-words text-foreground` | เพิ่ม `max-md:text-xl` |
| meta | `mt-1 flex max-w-3xl flex-wrap items-center gap-x-3 gap-y-1 text-meta text-muted-foreground` | เพิ่ม `max-md:hidden` |
| ปุ่ม | `flex flex-wrap items-center gap-2 md:justify-end` | เพิ่ม `shrink-0` (I1) |
| `PageBackLink` | `cn(buttonVariants({ variant: "outline", size: "md" }), "min-w-11 max-md:px-0", className)` | — |

`PageBackLink` markup:

```tsx
<Link href={href} onClick={onClick} data-slot="page-back-link" className={…}>
  <ArrowLeft aria-hidden="true" />
  <span className="max-md:sr-only">{label}</span>
</Link>
```

- `text-2xl` ได้ 24/32 และ 36 บนหน้าไทยจาก `html:lang(th)` เดิม · น้ำหนัก 600 ตามต้นแบบ `MK/base.css:142` (B3 ข้อ 1)
- crumbs ห่าง h1 4px (`mb-1`, `MK/base.css:208`) แทน 3 ระยะเดิม (8 / 12 / 20px, M03 §C)
- แถวหัวกับปุ่มใช้ค่าตั้งต้นของ flex (`0 1 auto`) ทั้งสองฝั่ง ไม่ใส่ `flex-1` หรือ `shrink-0` (ยกเว้น `compactOnMobile`: กลุ่มปุ่มได้ `shrink-0`, I1) · ฝั่งที่ยาวกว่าได้ที่มากกว่า และปุ่มขึ้นบรรทัดใหม่เมื่อไม่พอ (ต้นแบบ `MK/base.css:212` ใช้ grid `minmax(0,1fr) auto` ซึ่งบีบหัวเรื่องเหลือ 0 ได้เมื่อปุ่มเยอะ)
- สลับที่ `md` ตามปุ่มและช่องกรอก (DS:572) · ต้นแบบสลับที่ 640 (`MK/base.css:487-489`)
- `PageBackLink` ต่ำกว่า `md` สูง 44 กว้าง 44 (`min-h-11` ของ size `md` + `min-w-11` + `max-md:px-0`) แสดงแค่ลูกศร ชื่อยังอยู่ใน `sr-only` · จาก `md` สูง 36 มีข้อความ · ชื่อที่อ่านได้ตรงกับข้อความที่เห็น (WCAG 2.5.3) จึงไม่ใส่ `aria-label`
- ขนาดลูกศร 16px จาก `[&_svg:not([class*='size-'])]:size-4` ของ `buttonVariants` (`c/ui/button-variants.ts:16`)

#### 4.3.3 กติกาของหัวหน้า

1. **ไม่มี margin รอบนอก** · ระยะถึงเนื้อหาเป็นของตัวห่อหน้า (ข้อ 4.6.1) · `className` ใส่ได้แค่ class จัดวาง
2. **h1 มีที่เดียว** คือ `PageHeader` · ห้ามไอคอนใน h1 (`D/maintenance/pm/page.tsx:42-43` ใส่ `CalendarClock` อยู่ ให้ลบใน 2B-2, I25)
3. **meta:** 1 ข้อเท็จจริงต่อ 1 element · ไม่ใส่ตัวคั่น "·", "•", " / " (ใช้ `gap-x-3` ตาม A/08:286) · ลำดับ: รหัส (`<span className="tag">`) → ป้ายสถานะ → ข้อเท็จจริง (วันที่ คน จำนวน) → คำอธิบายหน้า · คำอธิบายยาวกว่า 1 บรรทัดได้ `max-w-3xl` เดิมของ 4 หน้า (`D/admin/integrations/page.tsx:18`, `D/maintenance/new/page.tsx:50`, `D/maintenance/pm/new/page.tsx:36`, `D/maintenance/pm/page.tsx:45`) ย้ายเข้ามาใน meta แล้ว
4. **ป้ายสถานะอยู่ใน meta เท่านั้น** ไม่อยู่ข้างปุ่มหรือข้าง h1 · ปุ่มช่วยเหลือของป้าย (`AssetStateHelpPopover`) อยู่ติดป้ายใน `inline-flex items-center gap-1.5` เดิม · ผลบนมือถือ: ป้ายของ `D/disposal/[id]` ที่เคยซ่อนบนมือถือ (`:186`, `:202`) จะแสดง
5. **ปุ่ม:** `buttonVariants({ size: "md" })` หรือ `Button size="md"` (R-h) · ลำดับใน DOM: `back` → ⋯ → ปุ่มรอง (`outline`) → ปุ่มหลัก (R-h "⋯ ก่อน ปุ่มหลักท้ายสุด" · `p2b-map/05-mockup-targets.md` C8 "⋯ first, primary last" · K8, DS:376 · ข้อ 3.3) · ไอคอนนำหน้าตามความหมาย (`Plus` สร้าง, `Download` ส่งออก, `Printer` พิมพ์)
6. **รหัสกับ h1:** เมื่อ crumb สุดท้ายเป็นรหัส (`code: true`) h1 ห้ามเป็นรหัสเดียวกัน (A/08:331)
   - record มีชื่อของตัวเอง → h1 = ชื่อ · รหัสเป็นตัวแรกของ meta
   - ใบซ่อมและคำขอตัดจำหน่ายไม่มีชื่อของตัวเอง → h1 = ชื่อทรัพย์สินที่เกี่ยวข้อง · meta = รหัสใบ → ป้าย → รหัสทรัพย์สิน
   - ชุดตัดจำหน่ายไม่มีทั้งสองอย่าง → h1 = รหัส `<span className="tag font-medium">` (Plex Mono 500, guard VFG:187-193 ยอม `font-medium`)
   - ที่ HEAD ซ้ำ 5 ใน 8 หน้าที่มี `code: true`: `D/assets/[id]/page.tsx:893`, `D/disposal/[id]/page.tsx:181`, `D/disposal/batches/[id]/page.tsx:56`, `D/maintenance/[id]/page.tsx:112`, `D/maintenance/pm/[id]/edit/page.tsx:31` · อีก 3 หน้าใช้ชื่ออยู่แล้ว (`audit/rounds/[id]:419`, `employees/[id]:265`, `suppliers/[id]:161`)
7. **`compactOnMobile`** ใช้ได้กับทะเบียนหน้าเดียว (แทน `MasterDataHeader compactOnMobile`, `D/assets/page.tsx:328`) · ต่ำกว่า `md`: หัวเรื่อง 20px กับปุ่มสร้างอยู่แถวเดียว meta ซ่อน (เท่ากับ `master-data-layout.tsx:21-27` วันนี้)

---

### 4.4 แผนย้ายหัวหน้า

#### 4.4.1 นับ

หัวหน้าที่ HEAD (h1 60 จุด + `MasterDataHeader` 11 จุดที่ไม่มี h1 ในหน้า):

| แบบ | จำนวน | ที่ |
|---|---|---|
| `MasterDataHeader` (`master-data-layout.tsx:5-40`, h1 `:24`) | 11 ผู้เรียก | M03 B1 |
| h1 เขียนเองใน `D/**/page.tsx` | 32 | ตารางข้อ 4.4.2–4.4.6 |
| `PageHeader` ประจำไฟล์ `D/my-assets/page.tsx:163-170` | 2 ผู้เรียก (`:50`, `:89`) | — |
| `ReportHeader` (`c/reports/report-header.tsx:16-43`) | 1 (`D/reports/page.tsx:719`) | — |
| หัวในฟอร์มและเครื่องมือ (`c/`) | 21 | รวม `OperationShell` (`checkout-form.tsx:390-399`) |
| ไม่ย้าย | 4 | ข้อ 4.4.7 |

| plan | หัวที่ย้าย | h1 ที่เปลี่ยน |
|---|---|---|
| 2B-1 | 33 | 26 (หน้า 6 + ฟอร์ม 19 (13 + ฟอร์มงาน 6, I13) + `MasterDataHeader` 1) |
| 2B-2 | 11 | 9 (ไม่มี `audit-round-form` (I13) · เพิ่ม data-quality, integrations (I12)) |
| 2B-3 | 2 | 1 |
| 2B-4 | 6 | 6 |
| 2B-5 | 12 | 12 |
| 2C plan 4 | 2 | 2 |
| ไม่ย้าย | — | 4 |
| **รวม** | 66 | 60 |

h1 ที่เหลือหลังแต่ละ plan ตรงกับ LH1 ตาราง C ข้อ 10.4 (60 → 34 → 25 → 24 → 18 → 6)

#### 4.4.2 2B-1

`MasterDataHeader` เป็นตัวห่อบาง (R-h): `return <PageHeader title={title} meta={subtitle} compactOnMobile={compactOnMobile} className={compactOnMobile ? "mb-4 md:mb-6" : "mb-6"} actions={<>{actions}<Link href={createHref} className={buttonVariants({ size: "md" })}><Plus aria-hidden="true" />{createLabel}</Link></>} />` · ผู้เรียกที่เหลือ 3 จุด (ทะเบียน, รายการไม่ตรง, รอบตรวจนับ) ได้หน้าตาใหม่ทันทีโดยไม่แก้หน้า

| หน้า / ไฟล์ | ตอนนี้ | title | meta | actions | crumbs | back |
|---|---|---|---|---|---|---|
| `D/master-data/branches/page.tsx:89` · `companies:79` · `departments:59` · `employees:100` · `locations:126` · `suppliers:78` | MDH | `t("title")` | `t("subtitle")` | สร้าง (หลัก `Plus`) · `createHref` เดิม | — | — |
| `D/master-data/brands/page.tsx:188` | MDH + 3 ลิงก์ `h-10` | เดิม | เดิม | ส่งออก (`Download`) · แม่แบบ (`FileSpreadsheet`) · สร้างยี่ห้อ (`Plus`) เป็น `outline` · สร้างรุ่น (หลัก) | — | — |
| `D/master-data/categories/page.tsx:107` | MDH + 2 ลิงก์ | เดิม | เดิม | ส่งออก · แม่แบบ (`outline`) · สร้าง (หลัก) | — | — |
| `D/admin/users/page.tsx:76` | h1 | `t("title")` | `t("subtitle")` | — (ปุ่มสร้างลอย `:175-181` ไป 2D, R-q) | — | — |
| ฟอร์มข้อมูลหลัก 9: `asset-model-form.tsx:223`, `branch-form.tsx:100`, `brand-form.tsx:78`, `category-form.tsx:110`, `company-form.tsx:93`, `department-form.tsx:95`, `employee-form.tsx:156`, `location-form.tsx:115`, `supplier-form.tsx:152` (`c/master-data/`) | h1 + ลิงก์กลับ | `{title}` | `t("subtitle")` | — | — | `backHref` · `common.back` · ผู้ขาย `onClick={confirmNavigation}` |
| `c/admin/admin-user-form.tsx:112` | เดียวกัน | `{title}` | `t("formSubtitle")` | — | — | `backHref` |
| `c/admin/role-permission-form.tsx:125` | h1 เป็น `editTitle` แม้ในหน้าสร้าง | `isCreate ? t("createTitle") : t("editTitle")` (key มีแล้ว "เพิ่มบทบาท") | เดิม `:126` | — | — | `backHref` |
| `c/assets/asset-form.tsx:818` | เดียวกัน | `{title}` | `t("subtitle")` | — | — | `backHref` |
| `c/assets/asset-component-manager.tsx:260-275` | การ์ด `sticky top-0 z-20` + หัวเล็ก + h1 `text-xl` | `labels.title` ("จัดการส่วนควบ") | `<span className="tag">{parentAsset.assetTag}</span>` · `parentAsset.name` | — | — | `returnToHref` · `labels.back` |
| `D/disposal/new/page.tsx:49-61` | h1 + ลิงก์กลับ | `t("createTitle")` | `t("createSubtitle")` | — | — | `returnToHref` · `common.back` |
| `D/disposal/batch/new/page.tsx:25-28` | ไอคอนกลับซ้ายหัว | `t("batchCreateTitle")` | `t("batchCreateHelp")` | — | — | `` `/${locale}/disposal` `` · `t("backToQueue")` |
| `D/maintenance/new/page.tsx:46-54` | crumbs + "ยกเลิก" | `t("createTitle")` | `plan ? t("pmCreateSubtitle") : t("createSubtitle")` | — | เดิม `:46` | `returnTo` · `common.back` |
| `D/maintenance/pm/new/page.tsx:32-40` | เดียวกัน | `t("pmCreateTitle")` | `t("pmSubtitle")` | — | เดิม `:32` | `returnTo` · `common.back` |
| `D/maintenance/pm/[id]/edit/page.tsx:28-36` | crumbs + h1 รหัส + "ยกเลิก" | `plan.title` | `<span className="tag">{plan.planNo}</span>` | — | เดิม `:28` (`plan.planNo`, `code: true`) | `returnTo` · `common.back` |
| ฟอร์มงาน 4 ไฟล์ที่ 2C ย้ายแล้ว (งาน 23 ไฟล์ละ 1 commit, I13): `c/asset-operations/checkin-form.tsx:295-297` · `checkout-form.tsx:392-394` (หัวใน `OperationShell`) · `transfer-form.tsx:124-126` · `bulk-move-form.tsx:84-89` | h1 ในฟอร์ม | เดิม | เดิม · `bulk-move` meta = `t("selectedCount", { count })` | — | — | ไม่มี (คงเดิม B2) |
| `c/audit/audit-round-form.tsx:133-135` (ชุด 3 ของ 2C · งาน 23, I13) | h1 อย่างเดียว | `t("createTitle")` | — | — | — | ไม่มี (คงเดิม) |
| `c/assets/asset-batch-form.tsx:609-612` (งาน 24 commit เดียวกับหัวตาราง `<thead` `:886`, `:979`, `:1037` ข้อ 10.3, I13) | h1 ในฟอร์ม | เดิม | เดิม | — | — | ไม่มี (คงเดิม B2) |

ฟอร์มส่ง `className="mb-6"` แทน `mb-6` ของ div หัวเดิม ไม่เปลี่ยนตัวห่อ `mx-auto max-w-*` (เครื่องมือ 2 ไฟล์ของชุด 4 ไม่แตะ ข้อ 4.4.7, I13) · `function PageHeader` ประจำไฟล์ `D/my-assets/page.tsx:163-170` ไม่แตะใน 2B-1 · 2B-5 แทนด้วย `PageHeader` กลางและลบฟังก์ชันใน commit เดียว (I14 · ฟังก์ชันประจำไฟล์ไม่ชนกับของกลางจนกว่าหน้าจะ import ของกลาง)

#### 4.4.3 2B-2

| หน้า / ไฟล์ | ตอนนี้ | title | meta | actions | crumbs | back |
|---|---|---|---|---|---|---|
| `D/audit/findings/page.tsx:195-200` | MDH ใช้ช่องสร้างเป็น "กลับไปรอบตรวจนับ" (หลัก + `Plus`) | `t("title")` | `t("subtitle")` | — | — | `` `/${locale}/audit/rounds` `` · `t("backToRounds")` |
| `D/audit/rounds/page.tsx:254-259` | MDH | เดิม | เดิม | สร้างรอบ (หลัก) `t("createTitle")` | — | — |
| `D/audit/rounds/[id]/page.tsx:409-472` | ป้ายบนสุดของคอลัมน์ปุ่ม `:425` · ปุ่ม `sm:h-10` | `round.name` | `tag(round.auditNo)` · `StatusBadge` จาก `:425` · `formatDate(start) – formatDate(end)` | ส่งออกผล (`Download`) · ส่งออก PDF (`FileText`) · ส่งออกผลต่าง (`Download`) · รายการรอตรวจ (`AlertTriangle`) เป็น `outline` · สแกน (หลัก `ScanLine`) | เดิม `:412-417` | ไม่มีที่หัว (คงเดิม) · แถบล่าง `:479` `Download` → `ArrowLeft` |
| `D/audit/rounds/[id]/pending/page.tsx:126-134` | ลิงก์ข้อความ `text-primary` | `t("title")` | `t("subtitle", { round })` | — | — | `returnToHref` · `common.back` |
| `D/disposal/page.tsx:250-269` | 3 ลิงก์ `min-h-11` | เดิม | เดิม | ประวัติชุด (`ListChecks`) · สร้างชุด (`PackagePlus`) เป็น `outline` · สร้าง (หลัก) | — | — |
| `D/disposal/batches/page.tsx:29-35` | ลิงก์ข้อความเหนือ h1 `:31` | `t("batchHistory")` | `t("batchHistoryHelp")` | สร้างชุด (หลัก, เมื่อมีชุดแล้ว) | — | `` `/${locale}/disposal` `` · `t("backToQueue")` |
| `D/disposal/batches/[id]/page.tsx:53-63` | ป้ายข้างปุ่มกลับ `:61` | `tag font-medium(batch.batchNo)` (ข้อ 4.3.3 ข้อ 6) | `StatusBadge` · `t("batchDetailHelp", { count })` | — | เดิม `:55` | `` `/${locale}/disposal` `` · `common.back` |
| `D/maintenance/page.tsx:93-107` | h1 + สร้าง | เดิม | เดิม | สร้าง (หลัก) | — | — |
| `D/maintenance/pm/page.tsx:38-53` | crumbs + ไอคอนใน h1 (`CalendarClock` `:42-43` ลบ) · ไม่มีปุ่มกลับ | `t("pmTitle")` | `t("pmSubtitle")` | สร้าง PM (หลัก) | เดิม `:39` | **ใหม่ (I25):** `` back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />} `` |
| `D/admin/data-quality/page.tsx:37-48` (ย้ายจาก 2B-5 เพราะ 2C-4 แก้ `:146`, I12) | h1 เขียนเอง | เดิม | เดิม | เปิดรายงาน (`outline`) | — | — |
| `D/admin/integrations/page.tsx:16-19` (หัวเท่านั้น · 2C-5 แก้ข้าง `:52`, I12) | h1 เขียนเอง | เดิม | เดิม | — | — | — |

#### 4.4.4 2B-3

| หน้า | ตอนนี้ | เปลี่ยนเป็น |
|---|---|---|
| `D/assets/page.tsx:327-333` | `<MasterDataHeader compactOnMobile …>` | `<PageHeader compactOnMobile className="mb-4 md:mb-6" title={t("title")} meta={t("subtitle")} actions={สร้าง (หลัก)} />` · รากยังเป็น `<div>` เปล่า (ข้อ 4.6.1) |
| `D/asset-management/import-export/page.tsx:32-35` | h1 + p ในตัวห่อ `mx-auto max-w-6xl space-y-5` | `PageHeader title meta` · ตัวห่อเป็น `mx-auto max-w-6xl space-y-6` (หน้าเครื่องมือ คงความกว้าง) · ลิงก์กลับท้ายหน้า `:122-126` ไม่ใช่ปุ่มกลับที่หัว คงเดิม |

หลัง 2B-3 `MasterDataHeader` ไม่มีผู้เรียก · ลบใน 2B-5 พร้อม `MasterDataPagination` และ `SortableColumnHeader` (R-h)

#### 4.4.5 2B-4

| หน้า | title | meta | actions | crumbs | back |
|---|---|---|---|---|---|
| `D/assets/[id]/page.tsx:883-979` | `asset.name` (เดิม `asset.assetTag` `:893`) | `tag(asset.assetTag)` · ป้ายสถานะ + ช่วยเหลือ `:897-900` · ป้ายสภาพ + ช่วยเหลือ `:901-904` · ที่ตั้ง (`MapPin`) · ผู้ถือครอง (`PackageCheck`) `:906-915` | ⋯ `AssetDetailActionMenu` `:936-977` → แก้ไข (หลัก `Edit`, `hidden md:inline-flex`) | เดิม `:886-891` | `returnToHref` · `isAssetScanReturn ? t("backToScan") : tCommon("back")` |
| `D/disposal/[id]/page.tsx:171-203` | `disposalRequest.asset.name` | `tag(disposalNo)` · `StatusBadge` `:202` · `tag(asset.assetTag)` | พิมพ์ (`Printer`) และ `nextActionControl` ห่อใน `<div className="hidden items-center gap-2 md:flex">` (มือถือใช้ `DisposalMobileActionBar` `:222`) | เดิม `:174-179` | `returnToHref` · `common.back` · **ทุกขนาดจอ** (B2) |
| `D/maintenance/[id]/page.tsx:106-141` | `ticket.asset.name` | `tag(repairNo)` · `StatusBadge` `:113` · `tag(asset.assetTag)` | พิมพ์ (`outline Printer`) · `RepairRecordActions` `:118-133` | เดิม `:109` | `returnToHref` · `common.back` (`Wrench` → `ArrowLeft`) · แถบล่าง `:147` → `ArrowLeft` |
| `D/master-data/employees/[id]/page.tsx:255-286` | `employee.fullNameTh` | `tag(employee.code)` · ตำแหน่ง · อีเมล (ไม่มีทั้งคู่ใช้ `t("noContactDetail")`) | แก้ไข (หลัก `Edit`) | เดิม `:258-263` | `returnToHref` · `common.back` |
| `D/master-data/suppliers/[id]/page.tsx:151-182` | `supplier.name` | `tag(supplier.code)` · ผู้ติดต่อ · โทร · อีเมล | แก้ไข (หลัก) | เดิม `:154-159` | `returnToHref` · `common.back` |
| `D/my-assets/[id]/page.tsx:57-66` | `t("detailTitle")` (ไม่มี crumbs จึงไม่อยู่ในข้อ 6) | `t("detailHelp")` | — | — | `` `/${locale}/my-assets` `` · `t("backToList")` |

`data-testid="asset-identity-summary"` (`:895`) ย้ายไปอยู่บน element ห่อป้ายใน meta (`<span data-testid=… className="contents">`) เพื่อให้ test ลำดับ `:32-35` ยังหาได้

#### 4.4.6 2B-5

| หน้า / ไฟล์ | title / meta | actions | back |
|---|---|---|---|
| `D/admin/approvals/page.tsx:47-66` | เดิม | ประวัติการตัดสิน (`History`) · ตั้งค่านโยบาย (`outline`) | — |
| `D/admin/approvals/history/page.tsx:74-86` | เดิม | — | `` `/${locale}/admin/approvals` `` · `t("backToInbox")` (`FileCheck2` → `ArrowLeft`) |
| `D/admin/roles/page.tsx:84-97` | เดิม | ส่งออก (`outline Download`, เมื่อ `canExport`) · ปุ่มสร้างลอยไป 2D | — |
| `D/admin/{logs:58-61, readiness:77-80, settings:55-58, storage:64-67}/page.tsx` | เดิม | — | — |
| `D/notifications/page.tsx:49-60` | เดิม | เปิดศูนย์งาน (`outline`) | — |
| `D/my-assets/page.tsx:50`, `:89-94` | `PageHeader` ประจำไฟล์ → `PageHeader` กลาง · ลบ `function PageHeader` `:163-170` ใน commit เดียว (I14) | เปิดศูนย์งาน (`outline`) แทน `getSafeActionLinkClasses("secondary")` | — |
| `D/reports/page.tsx:719` | `ReportHeader` → `PageHeader` · ลบ `c/reports/report-header.tsx` | ส่งออกทะเบียน (`outline Download`) → ส่งออกภาพรวม (หลัก `Download`) · กลับลำดับจาก `:191-198` ตาม K8 | — |
| `D/dashboard/page.tsx:326` | `t("title")` · ไม่มี meta | — | — |
| `D/work-center/page.tsx:360-369` | เดิม | — · `SummaryPill` ×2 (`:366-367`) ออกจากหัว ไปเป็น `StatStrip` ใต้หัว (ส่วน StatStrip) | — |

ฟอร์มงาน 5 ไฟล์ที่เคยอยู่ในตารางนี้ย้ายไป 2B-1 (ข้อ 4.4.2, I13) · หัว data-quality และ integrations ย้ายไป 2B-2 (ข้อ 4.4.3, I12)

#### 4.4.7 ส่งต่อ และไม่ย้าย

| จุด | ทำอะไร | เหตุผล |
|---|---|---|
| `c/assets/asset-scan-search-tool.tsx:108-111` · `c/assets/asset-label-batch-tool.tsx:292-295` | 2C plan 4 ใช้ `PageHeader` ใน commit ของไฟล์ (เขียนลง DH) | ไฟล์ชุด 4 อยู่ในรั้ว (00-synthesis §2, C/08:60 O19) |
| `src/app/[locale]/(auth)/login/page.tsx:43` | ไม่ย้าย | หน้า login ไม่มี shell |
| `c/asset-operations/operation-document-print.tsx:103` · `c/assets/asset-label-print.tsx:301` | ไม่ย้าย | หน้าพิมพ์ (กลุ่ม `(print)`) |
| `c/audit/audit-scan-header.tsx:22-55` | ไม่ย้าย · เป็นหัวของหน้าภาคสนามแบบเดียวที่มี (ปุ่มไอคอนกลับ 44 · h1 ตัดท้าย `text-base md:text-xl` · แถบความคืบหน้า) | ต้องประหยัดพื้นที่บนจอสแกน · เขียนเป็นข้อยกเว้นใน DS |
| `D/access-denied/page.tsx` | ไม่มีหัว | เป็นกล่องว่างกลางจอ |

---

### 4.5 ปุ่มกลับ (B2)

#### 4.5.1 กติกา

- ทุกจุดที่มีปุ่มกลับที่หัวอยู่แล้วใช้ `PageBackLink` ผ่าน `PageHeader back` · จุดใหม่จุดเดียวคือ `D/maintenance/pm` (I25, #32) · ฟอร์มที่ไม่มีปุ่มกลับคงไม่มี (`audit-round-form`, `checkin`, `checkout`, `transfer`, `bulk-move`, `asset-batch-form`; M03 §D1)
- `href` เป็นนิพจน์เดิมของจุดนั้นทุกตัว (`returnToHref`, `backHref`, `returnTo` หรือ path ตายตัว) · ไม่เพิ่ม `returnTo` ให้หน้าที่ไม่เคยมี · รายการที่เริ่มแบ่งหน้าใน B4 ต้องใส่เลขหน้าและขนาดหน้าใน `returnTo` ของตัวเอง (ส่วนแบ่งหน้า)
- ข้อความเป็นของจุดนั้น ไม่มี key ใหม่: `common.back` "กลับ" · `disposalPage.backToQueue` "กลับคิวตัดจำหน่าย" · `myAssets.backToList` · `asset.backToScan` · `auditFinding.backToRounds` · `approvalHistoryPage.backToInbox`
- แถบปุ่มล่างบนมือถือ (O11 ของ 2C ชุด 5) ใช้ `ArrowLeft` กับรายการกลับเหมือนกัน · 2B แก้แค่ไอคอนใน array `actions` ของหน้า

#### 4.5.2 ทุกจุด

| # | จุด | ตอนนี้ | href | ข้อความ | plan |
|---|---|---|---|---|---|
| 1–9 | ฟอร์มข้อมูลหลัก (`asset-model-form.tsx:226-232`, `branch-form.tsx:103-109`, `brand-form.tsx:81-87`, `category-form.tsx:113-119`, `company-form.tsx:96-102`, `department-form.tsx:98-104`, `employee-form.tsx:159-165`, `location-form.tsx:118-124`, `supplier-form.tsx:155-162`) | `h-10` ขอบ `border` เขียนเอง · ผู้ขาย `min-h-11` + `confirmNavigation` | `backHref` | `common.back` | 2B-1 |
| 10 | `c/admin/admin-user-form.tsx:115-121` | `h-10` เขียนเอง (ไฟล์ชุด 4 ต้องเสร็จก่อน 2C-4) | `backHref` | `common.back` | 2B-1 |
| 11 | `c/admin/role-permission-form.tsx:128-134` | เดียวกัน | `backHref` | `common.back` | 2B-1 |
| 12 | `c/assets/asset-form.tsx:821-827` | `min-h-11 w-full sm:w-auto` | `backHref` | `common.back` | 2B-1 |
| 13 | `c/assets/asset-component-manager.tsx:267-273` | ในการ์ด sticky | `returnToHref` | `labels.back` | 2B-1 |
| 14 | `D/disposal/new/page.tsx:54-60` | `min-h-11 sm:h-10` | `returnToHref` | `common.back` | 2B-1 |
| 15 | `D/disposal/batch/new/page.tsx:26` | ไอคอนล้วน 44 ทุกขนาดจอ | `` `/${locale}/disposal` `` | `t("backToQueue")` | 2B-1 |
| 16 | `D/maintenance/new/page.tsx:51-53` | "ยกเลิก" ไม่มีไอคอน | `returnTo` | `common.back` | 2B-1 |
| 17 | `D/maintenance/pm/new/page.tsx:37-39` | เดียวกัน | `returnTo` | `common.back` | 2B-1 |
| 18 | `D/maintenance/pm/[id]/edit/page.tsx:33-35` | เดียวกัน | `returnTo` | `common.back` | 2B-1 |
| 19 | `D/audit/findings/page.tsx:195-200` | ช่องสร้างของ MDH (หลัก + `Plus`, `master-data-layout.tsx:29-35`) | `` `/${locale}/audit/rounds` `` | `t("backToRounds")` | 2B-2 |
| 20 | `D/audit/rounds/[id]/pending/page.tsx:127-129` | ลิงก์ข้อความ ไม่มีไอคอน ต่ำกว่า 44 | `returnToHref` | `common.back` | 2B-2 |
| 21 | `D/disposal/batches/page.tsx:31` | ลิงก์ข้อความ + `ArrowLeft` `min-h-10` | `` `/${locale}/disposal` `` | `t("backToQueue")` | 2B-2 |
| 22 | `D/disposal/batches/[id]/page.tsx:60` | `min-h-11 px-4` | `` `/${locale}/disposal` `` | `common.back` | 2B-2 |
| 23 | `D/audit/rounds/[id]/page.tsx:479` (แถบล่าง) | ไอคอน **`Download`** | `returnToHref` | `common.back` | 2B-2 |
| 24 | `D/assets/[id]/page.tsx:919-926` | แบบที่ B2 เลือก (`outline` + `min-w-11 px-3` + ป้ายซ่อนต่ำกว่า `sm`) | `returnToHref` | `backToScan` / `common.back` | 2B-4 |
| 25 | `D/disposal/[id]/page.tsx:187-193` | อยู่ในกลุ่ม `hidden … md:flex` `:186` **ไม่มีบนมือถือ** | `returnToHref` | `common.back` | 2B-4 |
| 26 | `D/maintenance/[id]/page.tsx:137-139` | ไอคอน **`Wrench`** `:138` | `returnToHref` | `common.back` | 2B-4 |
| 27 | `D/maintenance/[id]/page.tsx:147` (แถบล่าง) | ไอคอน **`Wrench`** | `returnToHref` | `common.back` | 2B-4 |
| 28 | `D/master-data/employees/[id]/page.tsx:271-277` | `h-10` (มือถือต่ำกว่า 44) | `returnToHref` | `common.back` | 2B-4 |
| 29 | `D/master-data/suppliers/[id]/page.tsx:167-173` | `min-h-11` + วงโฟกัส | `returnToHref` | `common.back` | 2B-4 |
| 30 | `D/my-assets/[id]/page.tsx:62-65` | `getSafeActionLinkClasses("secondary")` | `` `/${locale}/my-assets` `` | `t("backToList")` | 2B-4 |
| 31 | `D/admin/approvals/history/page.tsx:79-85` | `h-10` ไอคอน **`FileCheck2`** `:83` | `` `/${locale}/admin/approvals` `` | `t("backToInbox")` | 2B-5 |
| 32 | `D/maintenance/pm/page.tsx` (ใหม่, I25) | ไม่มีปุ่มกลับ มีแค่ crumbs `:38` | `` `/${locale}/maintenance` `` | `common.back` | 2B-2 |

รวม 31 จุดที่มีอยู่ = ที่หัวฟอร์ม 15 (#1–15) + "ยกเลิก" ที่หัว 3 (#16–18) + หน้ารายละเอียด/รายการ 11 (#19–22, 24–26, 28–31) + รายการกลับในแถบล่าง 2 (#23, #27) · บวกจุดใหม่ 1 (#32, I25) · O16 เขียน "14" (C/08:57) แต่นับได้ 15 (M01:252)

#### 4.5.3 ไอคอนผิด 3 จุด (4 บรรทัด)

| จุด | ตอนนี้ | ใหม่ | plan |
|---|---|---|---|
| `D/maintenance/[id]/page.tsx:138` + `:147` | `Wrench` (ไอคอนของเมนูซ่อมบำรุง) | `ArrowLeft` (หัวผ่าน `PageBackLink` · แถบล่าง `<ArrowLeft className="h-4 w-4" />`) · ลบ `Wrench` จาก import `:4` ถ้าไม่เหลือที่ใช้ | 2B-4 |
| `D/audit/rounds/[id]/page.tsx:479` | `Download` | `<ArrowLeft className="h-4 w-4" />` · `Download` ยังใช้ที่ `:433`, `:447` | 2B-2 |
| `D/admin/approvals/history/page.tsx:83` | `FileCheck2` | `PageBackLink` · `FileCheck2` ออกจาก import `:6` | 2B-5 |

ไม่มี test ยึดไอคอนเหล่านี้ (`grep -rn "Wrench\|Download\|FileCheck2" tests/*.ts` ว่าง)

#### 4.5.4 `D/disposal/[id]` บนมือถือ

- ตอนนี้ปุ่มกลับ พิมพ์ ปุ่มขั้นถัดไป และป้ายสถานะอยู่ในกลุ่ม `hidden … md:flex` (`:186`) · แถบล่าง (`:222-229`) มีเปิดทรัพย์สิน พิมพ์ ประวัติ และปุ่มขั้นถัดไป ไม่มีปุ่มกลับ
- ใหม่: `back={<PageBackLink href={returnToHref} label={tCommon("back")} />}` แสดงทุกขนาดจอ (ไอคอน 44 บนมือถือ) · ป้ายสถานะย้ายไป meta จึงแสดงบนมือถือด้วย · พิมพ์กับปุ่มขั้นถัดไปอยู่ใน `<div className="hidden items-center gap-2 md:flex">` ใน `actions` (คง `tests/disposal-detail-workspace.test.ts:45` `/hidden[^\"]*md:flex/`)
- ไม่แตะ `DisposalMobileActionBar` และ `pb-36 md:pb-0` (`:170`, O11)

#### 4.5.5 "ยกเลิก" ที่หัว 3 หน้าซ่อมบำรุง

- `D/maintenance/new/page.tsx:51-53`, `pm/new/page.tsx:37-39`, `pm/[id]/edit/page.tsx:33-35` เป็นลิงก์ `min-h-11` ข้อความ `common.cancel` ไม่มีไอคอน · ฟอร์มทั้งสอง (`c/maintenance/repair-record-form.tsx`, `maintenance-plan-form.tsx`) ไม่มีปุ่มยกเลิกท้ายฟอร์ม (`grep -n "cancel" …` ว่าง) ลิงก์นี้จึงเป็นทางออกเดียวนอกจากปุ่มย้อนของเบราว์เซอร์
- ใหม่: `PageBackLink href={returnTo} label={tCommon("back")}` (B2) · ข้อความบนจอเปลี่ยนจาก "ยกเลิก" เป็น "กลับ"
- ทั้ง 3 หน้าเป็น focus route (`src/lib/mobile-field-navigation.ts:22`, `:27`) ไม่มีแถบล่าง

#### 4.5.6 `returnTo` ยังพากลับเหมือนเดิม

`PageBackLink` รับ `href=` เป็น prop ชื่อเดียวกับ `<Link>` · literal `href={returnToHref}` และ `backHref={returnToHref}` จึงยังอยู่ใน source ทุกหน้า และ test เหล่านี้ผ่านโดยไม่แก้:

| test | ยึดอะไร |
|---|---|
| `tests/asset-return-navigation.test.ts:41-48` | `assets/[id]`: `href={returnToHref}` (`:46`) และ `appendReturnTo(…/edit, returnToHref)` |
| `tests/asset-return-navigation.test.ts:50-60` | `assets/[id]/edit`: `backHref={returnToHref}` · `asset-form.tsx`: `backHref: providedBackHref`, `router.push(backHref)` |
| `tests/master-data-return-navigation.test.ts:33-55` | หน้ารายการข้อมูลหลัก: `const <section>ReturnHref =` และ `appendMasterDataReturnTo(…/new …)` · `appendMasterDataReturnTo(…/edit, …)` ใน `createHref` และแถว |
| `tests/master-data-return-navigation.test.ts:57-73` | หน้า new/edit ส่ง `backHref={returnToHref}` · ฟอร์ม 8 ตัวมี `backHref: providedBackHref` และ `router.push(backHref)` |
| `tests/master-data-return-navigation.test.ts:75-84` | `employees/[id]`, `suppliers/[id]`: `href={returnToHref}` (`:81`) |
| `tests/operational-return-navigation.test.ts:28-29`, `:43-44`, `:68` | `maintenance/[id]`, `disposal/[id]`: crumb `{ label: t("title"), href: returnToHref }` + `href={returnToHref}` · `pending`: `href={returnToHref}` |
| `tests/disposal-detail-workspace.test.ts:36` | `href={returnToHref}` |

ฟอร์มผู้ขายคง `onClick={confirmNavigation}` บนปุ่มกลับ (`supplier-form.tsx:157`, `tests/supplier-form-ui.test.ts:28-35`) · ลิงก์ยกเลิกท้ายฟอร์มของ 2C (`<Link href={backHref} className={buttonVariants({ variant: "outline" })}>`, `tests/branch-form-ui.test.ts:17` และอีก 7 ไฟล์) ไม่แตะ

#### 4.5.7 ไม่แตะ

ปุ่ม "ย้อนกลับ" ระหว่างขั้นใน `asset-component-manager.tsx:386` (2C) · ปุ่มไอคอนกลับของ `AuditScanHeader` (`:23-30`) · ลิงก์กลับในแถบเครื่องมือหน้าพิมพ์ (`operation-document-print.tsx:77-80`, `asset-label-print.tsx:215-221`) · ลิงก์กลับท้ายหน้า import-export (`:122-126`) · ปุ่มยกเลิกท้ายฟอร์มทุกตัว (2C)

---

### 4.6 ตัวห่อหน้า ความกว้าง และระยะล่าง

#### 4.6.1 ตัวห่อหน้า

`page.tsx` 79 ไฟล์ใน `D/` (`roots.mjs`):

| root | จำนวน | ที่ |
|---|---|---|
| `space-y-6` | 17 | admin 10 · `assets/[id]/edit` · `disposal/batches` · `disposal/new` · `maintenance` · `my-assets` · `notifications` · `work-center` |
| `space-y-6 pb-24 md:pb-0` / `pb-36` | 6 / 1 | หน้ารายละเอียด 7 (ข้อ 4.6.3) |
| `space-y-5` | 6 + 1 | `disposal/batch/new` · `maintenance/new` · `maintenance/pm` · `pm/new` · `pm/[id]/edit` · `reports` (`:718`) + `import-export` (`mx-auto max-w-6xl space-y-5` `:31`) |
| `space-y-4` | 7 | รายการข้อมูลหลัก ยกเว้น departments |
| `<div>` เปล่า | 7 + 1 | `assets:326` · `audit/findings:194` · `audit/rounds:253` · `audit/rounds/[id]/pending:125` · `dashboard:325` · `disposal:247` · `master-data/departments:58` + `audit/rounds/[id]:408` (`pb-24 md:pb-0`) |
| component เป็น root | 32 | ฟอร์ม new/edit 22 · ฟอร์มธุรกรรม 4 · เครื่องมือ 2 · `AssetComponentManager` · `AssetCreateWorkspace` · `AuditScanWorkspace` · `AuditRoundForm` |
| อื่น | 1 | `access-denied` |

กติกา:
1. **ราก `space-y-6` (24px)** ทุกหน้าที่ plan ย้ายทั้งหน้า · ราก `space-y-4`/`space-y-5` เปลี่ยนเป็น `space-y-6` · รากเปล่าเปลี่ยนเป็น `space-y-6` และลบ `mb-*` ของบล็อกชั้นบนสุดใน commit เดียวกัน (เช่น `D/dashboard/page.tsx:326`, `:329`, `:349`, `:380`, `:416`)
2. **ย้ายแค่หัว หรือแตะบรรทัดรากไม่ได้** → `PageHeader className="mb-6"`: `D/audit/rounds/[id]/page.tsx:408` (บรรทัดรากมี padding ของ O11) และฟอร์ม/เครื่องมือทุกตัว
3. **ทะเบียน** คงรากเปล่าและจังหวะเดิม (`asset-register-toolbar.tsx:36` `mb-3`, แท็บ `mb-2 md:mb-3` ที่ `tests/asset-register-filter-ui.test.ts:109` ยึด) · หัวใช้ `className="mb-4 md:mb-6"` เท่ากับ MDH วันนี้ จนจัดหน้าใหม่ในเฟส 3
4. **ไม่สร้าง component ตัวห่อ** · class เดียว ตรวจตอน review

ต้นแบบเว้นบล็อก 16px และหลังหัว 24px (`MK/base.css:205` `gap: var(--s-4)` + `:212` `margin-bottom: var(--s-2)`) · 2B ใช้ 24 ทุกบล็อกตามที่ 24 หน้าใช้อยู่ (ข้อตัดสินย่อยข้อ 17)

#### 4.6.2 ความกว้าง (R-o)

- หน้ารายการและรายละเอียดเต็มกว้างอยู่แล้ว (ไม่มี `max-w` ใน root ของหน้าเหล่านี้ ตาราง 4.6.1) · 2B ไม่เพิ่ม
- ฟอร์มและเครื่องมือคงความกว้างของตัวเอง (`max-w-2xl` … `max-w-7xl`, M03 §E2) · หัวฟอร์มอยู่ในความกว้างนั้น
- skeleton ทั้ง 5 ตัวเลิก `mx-auto max-w-7xl` (`c/ui/page-skeleton.tsx:84`, `:111`, `:146`, `:168`, `:208`) ข้อ 4.7
- ไม่แตะ padding ของ `<main>` (`c/layout/dashboard-shell.tsx:124` `px-4 py-4 sm:px-6 sm:py-6`) เพราะแถบเต็มขอบ `-mx-4 sm:-mx-6` ผูกอยู่ (`tests/visual-foundation-guards.test.ts:109-115`)

#### 4.6.3 `pb-24` ซ้อน 4 หน้า

shell เผื่อที่ให้แถบล่างแล้วเมื่อแถบแสดง (`dashboard-shell.tsx:128` `pb-[calc(5.25rem+env(safe-area-inset-bottom))] lg:pb-0`) · 4 หน้านี้เป็นโหมด navigation (มีแถบล่าง ไม่มีแถบปุ่มของหน้า) แต่เติม `pb-24 md:pb-0` อีกชั้น บนมือถือจึงเว้นราว 11rem

| หน้า | บรรทัด | โหมด (pin) | plan | ใหม่ |
|---|---|---|---|---|
| `D/disposal/batches/[id]/page.tsx` | `:52` | navigation (`tests/mobile-field-navigation.test.ts:24`) | 2B-2 | `space-y-6` |
| `D/master-data/employees/[id]/page.tsx` | `:254` | navigation (`:31`) | 2B-4 | `space-y-6` |
| `D/master-data/suppliers/[id]/page.tsx` | `:150` | navigation (`:32`) | 2B-4 | `space-y-6` |
| `D/my-assets/[id]/page.tsx` | `:56` | navigation (ไม่ตรง regex ใน `src/lib/mobile-field-navigation.ts:16-28`; ยังไม่มี pin → เพิ่ม `"/th/my-assets/asset-1"` ใน list `tests/mobile-field-navigation.test.ts:14-33`) | 2B-4 | `space-y-6` |

4 หน้าที่มีแถบปุ่มของหน้า (O11: `assets/[id]:882`, `audit/rounds/[id]:408`, `maintenance/[id]:105`, `disposal/[id]:170`) เป็น focus route ไม่มีแถบล่าง คง padding ไว้ให้ 2C ชุด 5 เปลี่ยนเป็น `actionBarPagePadding` · helper ที่ไม่มีใครเรียก `getMobileSafeBottomPaddingClasses()` (`src/lib/design-system.ts:112-114`, pin `tests/audit-scan-search-ui.test.ts:188`) ไม่แตะ ให้ชุด 5 ลบพร้อม `actionBarPagePadding`

#### 4.6.4 แถบล่างมือถือกับหัวหน้า

- **ใครเว้นที่ด้านล่าง:** shell สำหรับแถบนำทาง (หน้า navigation) · หน้าเองสำหรับแถบปุ่มของหน้า (4 หน้า O11 เท่านั้น, LFG LP1 ข้อ 4.11) · ไม่มีหน้าอื่นเติม `pb-*` ที่ root
- **breakpoint:** โครงของหน้า (หัวซ้อน/แถว, ป้ายของ `PageBackLink`, `hidden md:flex` ของปุ่มบนหัว, แถบปุ่มของหน้า) สลับที่ `md` · โครงของ shell (เมนูข้าง `sidebar.tsx:291`, แถบล่าง `mobile-field-navigation.tsx:51`, padding `dashboard-shell.tsx:128`) สลับที่ `lg` · ช่วง 768–1023 มีแถบล่างพร้อมหัวแบบจอใหญ่ ต้องตรวจทุกหน้าที่แก้ที่ 768 และ 1024
- **2C ชุด 5 ใช้ค่านี้:** `ActionBar` สลับที่ `md` เหมือนเดิม (`c/ui/mobile-action-bar.tsx:18`) เพราะปุ่มบนหัวของ `disposal/[id]` แสดงจาก `md`
- **ปุ่มกลับ 2 ที่บนมือถือ:** `maintenance/[id]` มีทั้ง `PageBackLink` บนหัวและรายการกลับในแถบล่าง (`:147`) เหมือนวันนี้ · ชุด 5 ตัดสินว่าแถบยังต้องมีรายการกลับไหม (หัวมีปุ่มกลับทุกขนาดจอแล้วใน 3 จาก 4 หน้า O11 ยกเว้น `audit/rounds/[id]`)
- ปุ่มลอยของ users/roles ทับแถบล่าง (`D/admin/users/page.tsx:177`, `D/admin/roles/page.tsx:245`) เป็นของ 2D (R-q) · แถบคำสั่งกลุ่มของทะเบียน (`asset-register-table.tsx:455`) อยู่ที่เดิม (R-q)

---

### 4.7 skeleton (`c/ui/page-skeleton.tsx` + `loading.tsx`) · 2B-4

**ตอนนี้** 5 ตัว ทุกตัว `mx-auto flex w-full max-w-7xl flex-col gap-5` · `PageHeaderSkeleton` (`:16-26`) สลับที่ `sm` ปุ่ม `h-11 sm:h-10` · กล่องตัวเลขเป็นการ์ดแยก `p-5` (`:28-40`) · ตารางมุม 8px หัวพื้น `bg-background` (`:42-61`) · ทะเบียนมีแผงตัวกรอง pill 7 อันซึ่งหน้าจริงไม่มี (`:63-80`, `:144-164`) · `loading.tsx` มี 5 ไฟล์: `D/loading.tsx` → `PageSkeleton` · `D/assets/loading.tsx` · `D/assets/[id]/loading.tsx` · `D/dashboard/loading.tsx` · `D/reports/loading.tsx`

**ใหม่** (ไม่เพิ่ม `loading.tsx` · ไม่เปลี่ยนชื่อ export):

| ส่วน | class / รูป |
|---|---|
| กรอบทุกตัว | `aria-busy="true" className="flex w-full flex-col gap-6"` |
| `PageHeaderSkeleton({ crumbs?, actions? = true })` | crumbs `h-5 w-40` + `mb-1` · แถว `flex min-w-0 flex-col gap-3 md:flex-row md:items-start md:justify-between` · หัว `h-8 w-56 max-w-full` · meta `mt-1 h-5 w-72 max-w-full` · ปุ่ม `h-11 w-28 md:h-9` |
| `MetricGridSkeleton({ count })` (คงชื่อ เพราะ `tests/loading-boundaries.test.ts:25` ยึด `MetricGridSkeleton count={2}`) | กรอบเดียวแบบ `StatStrip` (I28): `grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none` · เซลล์ `space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4` (ป้าย `h-4 w-24` · ตัวเลข `h-8 w-16`) |
| `TableSkeleton({ rows, columns, dense? })` | `overflow-hidden rounded-lg border border-border bg-surface` · หัว `border-b border-border bg-surface px-3 py-2.5` (`h-4 w-20`) · แถว `divide-y divide-border-soft` · `px-3 py-3` (`dense`: `py-2` ตามทะเบียน B3 ข้อ 3) |
| `PageSkeleton` (ทุก route ที่ไม่มีของตัวเอง) | หัว + `TableSkeleton rows={6}` (รูปหน้ารายการ ซึ่งเป็นปลายทางของเมนูส่วนใหญ่) |
| `AssetRegisterPageSkeleton` | หัว (ไม่มี meta บนมือถือ) · แถบเครื่องมือไม่มีกรอบ: ค้นหา `h-11 flex-1 md:h-9` + select 3 ตัว `hidden h-9 w-36 md:block` + ⚙ `size-11 md:size-9` · แถวแท็บเส้นใต้ `flex gap-4 border-b border-border pb-2` (5 อัน `h-5 w-20`) · `TableSkeleton dense rows={8} columns={6}` · ลบ `FilterPanelSkeleton` ออกจากตัวนี้ |
| `AssetDetailPageSkeleton` | หัวมี crumbs และ meta ป้าย 2 อัน (`h-5.5 w-20 rounded-control`) · ลบการ์ดตัวตน `:170-182` (ย้ายขึ้นหัวแล้ว) · แถวแท็บเส้นใต้ · `MetricGridSkeleton count={6}` · `grid gap-6 xl:grid-cols-[minmax(0,1fr)_280px]` |
| `DashboardPageSkeleton` | หัวไม่มีปุ่มและ meta · ลำดับบล็อกเดิม `:113-139` · ระยะ `gap-6` |
| `ReportsPageSkeleton` | คงลำดับ `PageHeaderSkeleton` → `data-report-tabs-skeleton` → `FilterPanelSkeleton` → `MetricGridSkeleton count={2}` → `data-report-view-skeleton` (`tests/loading-boundaries.test.ts:15-32`) · แท็บเป็นเส้นใต้แทนกล่อง `h-11` |

- class ใหม่ `h-5.5`, `grid-cols-[minmax(0,1fr)_280px]` ใช้ token เดิม ไม่เพิ่ม token (2A I21) · พื้นเส้นของ `MetricGridSkeleton` เป็น `bg-border` และ 2 คอลัมน์ต่ำกว่า `lg` เท่า `StatStrip` ข้อ 3.13 (I28 · skeleton ต้องตรงหน้าจริง F:42)
- 2B-5 ที่เปลี่ยนหน้าแดชบอร์ดและรายงานต้องแก้ skeleton ของหน้านั้นใน commit เดียวกัน ถ้ารูปหน้าเปลี่ยนจากตารางนี้
- `motion-safe:animate-pulse` และ `aria-busy="true"` คงไว้ (`tests/page-loading-skeleton.test.ts:19-20`)

---

### 4.8 ข้อตัดสินย่อย

| # | เรื่อง | ตัดสิน | เหตุผล |
|---|---|---|---|
| 1 | ไอคอนไม่ซ้ำแค่หมวดทรัพย์สินหรือทั้งเมนู | ทั้งเมนู (8 ชื่อซ้ำ → 0) | B1 เขียน "ไอคอนไม่ซ้ำกัน" คู่กับ "เมนูทั้งระบบ" · แถบย่อแสดงแค่ไอคอน |
| 2 | ไอคอนใหม่ | `Boxes` · `Handshake` · `Move` · `ClipboardList` · `ListX` · `Network` · `UserCog` · `LockKeyhole` · `HardDrive` · `SlidersHorizontal` | ชื่อหลักใน lucide 1.14.0 · คงไอคอนเดิมของรายการที่คนคุ้น (ทะเบียน `Package`, ตั้งค่า `Settings`) · `KeyRound` ถูก test ยึด |
| 3 | ข้อความเมนู | ไม่เปลี่ยน ("พิมพ์ป้าย", "สแกน/ค้นหาทรัพย์สิน", "อัปเดตหลายรายการ") | ชื่อใน B1 เป็นคำอธิบาย ไม่ใช่ข้อความใหม่ · ไม่ต้องผ่าน glossary รอบใหม่ |
| 4 | test โครงเมนู | อ่าน source ของ `sidebar.tsx` ไม่ย้ายต้นไม้ไป `src/lib` | ไฟล์เดียวตามแผน (00-synthesis §3) · test อีก 4 ไฟล์อ่าน `sidebar.tsx` อยู่ (`dashboard-shell-theme:26-28`, `my-assets-route-ui:36-45`, `integration-api-client-admin:117-122`, `sheet-drawers-ui:48-60`) ถ้าย้ายต้องแก้ 3 ไฟล์ |
| 5 | `depth` ของ `SidebarGroup` | ลบ | ไม่มีกลุ่มชั้น 2 แล้ว `ml-4` เป็นโค้ดตาย · test กันการซ้อนใหม่ |
| 6 | tooltip และจำสถานะของแถบย่อ | ไม่ทำใน 2B | B1 จำกัดขอบเขต · ไอคอนไม่ซ้ำแก้ปัญหาหลักของแถบย่อแล้ว |
| 7 | ช่องปุ่มกลับ | `back?: ReactNode` + `PageBackLink` (ไม่ใช่ `back?: { href, label }`) | literal `href={returnToHref}` อยู่ในหน้าต่อ · test 4 ไฟล์ (7 แถว) ในข้อ 4.5.6 ผ่านโดยไม่แก้ · `onClick` ของฟอร์มผู้ขายส่งได้ |
| 8 | ซ่อนป้ายของ `PageBackLink` บนมือถือ | `max-md:sr-only` ไม่ใช้ `aria-label` · สลับที่ `md` | ชื่อที่อ่านได้เท่ากับข้อความที่เห็น · DS:572 ให้ปุ่มสลับที่ `md` · แบบเดิมของ `assets/[id]` สลับที่ `sm` (ต่างแค่ช่วง 640–767) |
| 9 | ความสูง `PageBackLink` | `md` 36 บนจอใหญ่ | R-h ปุ่มในหัวเป็น `md` · ทุกปุ่มบนหัวสูงเท่ากัน |
| 10 | ตำแหน่งปุ่มกลับ | ตัวแรกของแถวปุ่มทุกขนาดจอ | แบบ `assets/[id]` ที่ B2 เลือก · ไม่ render 2 ชุด |
| 11 | ข้อความปุ่มกลับ | ของแต่ละจุดตามเดิม · "ยกเลิก" ที่หัวเป็น `common.back` | ไม่มี key ใหม่ · ข้อความบอกปลายทาง (คิว, กล่องงาน) |
| 12 | h1 ของใบซ่อมและคำขอตัดจำหน่าย | ชื่อทรัพย์สิน · รหัสใบอยู่ใน crumbs และตัวแรกของ meta | A/08:331 ให้ h1 เป็นชื่อแทนรหัส · ใบทั้งสองไม่มีชื่อของตัวเอง (subtitle วันนี้คือ `assetTag - asset.name`) |
| 13 | h1 ของชุดตัดจำหน่าย | รหัสใน `tag font-medium` | ไม่มีชื่อและไม่มีทรัพย์สินเดียว · Plex Mono ไม่มี 600 หลัง 2D |
| 14 | ตัวคั่นใน meta | ไม่มี · `gap-x-3` · `max-w-3xl` | A/08:286 · ตัวคั่นที่ขึ้นบรรทัดใหม่ค้างต้นบรรทัด |
| 15 | หัวตอบสนองที่ breakpoint ไหน | `md` | ปุ่มและช่องสลับที่ `md` (DS:572) · ต้นแบบ 640 |
| 16 | ฝั่งไหนยืดในแถวหัว | ไม่มีฝั่งไหน `flex-1` / `shrink-0` (ยกเว้นกลุ่มปุ่มของ `compactOnMobile` ได้ `shrink-0`, I1) | grid ของต้นแบบบีบหัวเรื่องเหลือ 0 เมื่อปุ่มเยอะ (รอบตรวจนับมี 5 ปุ่ม) |
| 17 | จังหวะหน้า | `space-y-6` ทุกบล็อก | 24 หน้าใช้อยู่แล้ว · ต้นแบบ 16 ระหว่างบล็อกเป็นการจัดหน้าใหม่ (เฟส 3) · `space-y-*` ของ Tailwind 4 ใช้ `margin-block-end` จึงให้หัวมี margin ต่างจากบล็อกอื่นไม่ได้โดยไม่ใส่ margin บนหัว |
| 18 | ทะเบียน | `className="mb-4 md:mb-6"` รากเปล่าเดิม | สัญญา DS:500-510 และ pin ระยะแท็บ |
| 19 | หน้า O11 ที่รากไม่ใช่ `space-y` | `className="mb-6"` | บรรทัดราก `audit/rounds/[id]:408` มี padding ของ 2C ชุด 5 |
| 20 | หัวของหน้าจัดการส่วนควบ | `PageHeader` ธรรมดา ไม่ sticky ไม่เป็นการ์ด · h1 เป็นชื่อหน้า รหัสและชื่อทรัพย์สินใน meta | หน้าอื่นไม่มีหัว sticky · หน้านี้เป็นโหมด navigation (`/assets/x/components` ไม่ตรง `mobile-field-navigation.ts:19`) · ไม่มี test ยึดการ์ด |
| 21 | h1 หน้าสร้างบทบาท | `isCreate ? createTitle : editTitle` | บั๊กที่เจอ: หน้าสร้างเขียน "แก้ไขสิทธิ์บทบาท" (`role-permission-form.tsx:125`) · key `adminRolesPage.createTitle` มีแล้ว |
| 22 | `MasterDataHeader` | ตัวห่อบางใน 2B-1 · ผู้เรียกตัวสุดท้ายย้ายใน 2B-3 · ลบใน 2B-5 | R-h |
| 23 | `ReportHeader` · `OperationShell` | ลบ `ReportHeader` ใน 2B-5 · `OperationShell` คงเป็นตัวห่อการ์ด เปลี่ยนแค่หัวข้างใน | ไม่มี test ยึด `ReportHeader` · `OperationShell` ห่อเนื้อฟอร์มด้วย |
| 24 | `PageHeader` ประจำไฟล์ของ my-assets | ไม่แตะใน 2B-1 · 2B-5 แทนด้วย `PageHeader` กลางและลบ `function PageHeader` (`D/my-assets/page.tsx:163-170`) ใน commit เดียว (I14) | ฟังก์ชันประจำไฟล์ไม่ชนกับของกลางจนกว่าหน้าจะ import ของกลาง (2B-5) · R-h ได้ผลเมื่อตัวประจำไฟล์หาย · 2B-1 ไม่ต้องแตะไฟล์ของ 2B-5 · LH2/LN2 ลดใน 2B-5 (ตาราง C ข้อ 10.4) |
| 25 | `D/maintenance/pm` มี crumbs แต่ไม่มีปุ่มกลับ | **ตัดสินแล้ว (I25):** เพิ่ม `` back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />} `` ใน 2B-2 · ลบไอคอนใน h1 (`D/maintenance/pm/page.tsx:42-43`) | หน้านี้มีเส้นทางนำทาง (`:38`) แต่ไม่มีปุ่มกลับ จึงขัด DS:573 ("the page keeps its back button") อยู่แล้ว · ไม่อยู่ในเมนู บนมือถือทางขึ้นเดียวคือลิงก์ crumbs 20px · แจ้งผู้ใช้ (ไม่ต้องเลือก) |
| 26 | หัวในไฟล์ 2C ที่ยังไม่ย้าย | **I13:** ฟอร์ม 6 ไฟล์ (`checkin`, `checkout` (หัวใน `OperationShell`), `transfer`, `bulk-move`, `audit-round-form` ชุด 3, `asset-batch-form`) เป็น `PageHeader` ใน 2B-1 ไฟล์ละ 1 commit · ชุด 4: `asset-scan-search-tool.tsx`, `asset-label-batch-tool.tsx` ไม่แตะ → 2C plan 4 ใช้ `PageHeader` (เขียนลง DH) | รั้วข้อ 2 ยอมให้แตะไฟล์ชุด 4 แค่หัว O16 ของ `admin-user-form`/`role-permission-form` · 2B-1 เป็นช่วงเดียวที่ไม่มี plan ของ 2C เปิด · แตะไฟล์ครั้งเดียว |
| 27 | guard ใหม่อยู่ไฟล์ไหน | **I15:** LFG ไฟล์เดียว (`tests/list-frame-guards.test.ts`) สร้างในงาน 1 ของ 2B-1 · ส่วนนี้ใช้ LP1, LH1, LB1, LH2 · ทุก commit ที่ย้ายไฟล์ลดแถวของตัวเอง · 2B-5 ล็อก `BUDGETS = KEEP` | budget ลดทีละ commit ดีกว่าล็อกท้าย plan · 2C ไม่ต้องแก้ไฟล์นี้ (ลดได้อย่างเดียว) · ค่าเริ่มนับซ้ำแล้ว (ข้อ 10.8) |
| 28 | skeleton | คงชื่อ export และ `MetricGridSkeleton` · เปลี่ยนรูป | test 2 ไฟล์ยึดชื่อและลำดับ |

---

### 4.9 ความเสี่ยง

1. **ช่วง 768–1023px:** แถบล่าง (สลับที่ `lg`) อยู่พร้อมหัวแบบแถว (สลับที่ `md`) · หัวที่มีปุ่มเยอะ (รอบตรวจนับ 5 ปุ่ม, ยี่ห้อ 4 ปุ่ม) จะขึ้นบรรทัดใหม่ · ตรวจบนแอปที่ 768 และ 1024 ทุกหน้าที่แก้
2. **h1 เปลี่ยนจากรหัสเป็นชื่อ** ใน 5 หน้า · คนที่จำรหัสยังเห็นรหัสใน crumbs และตัวแรกของ meta · ชื่อทรัพย์สินยาว (เช่น "Network Equipment Cisco Meraki MX95") ขึ้นบรรทัดใหม่ด้วย `text-balance` · ตรวจที่ 375 ภาษาไทย
3. **ป้ายสถานะของ `disposal/[id]` ปรากฏบนมือถือครั้งแรก** (เดิมซ่อน) · ตรวจว่าไม่ซ้ำกับป้ายใน `DisposalWorkflowStepper` จนดูรก
4. **หน้าจัดการส่วนควบเสียหัว sticky** · ปุ่มกลับเลื่อนหายเมื่อเลื่อนลง · ทางออกที่เหลือ: เลื่อนขึ้น ปุ่มย้อนของเบราว์เซอร์ แถบล่าง (โหมด navigation)
5. **รายการข้อมูลหลัก 7 หน้าโปร่งขึ้น** (16 → 24px ระหว่างบล็อก) · ต้องเลื่อนเพิ่มเล็กน้อย
6. **test โครงเมนูอ่านข้อความ** · ถ้ามีคนเขียนไอคอนเป็นตัวแปร (`icon: someIcon`) test จะจับว่าจำนวน `icon:` ไม่เท่ากับไอคอนที่อ่านได้ และ fail แบบตั้งใจ
7. **`useTranslations` ใน `Breadcrumbs` ถูก bundle ฝั่ง client** เมื่อ `PageHeader` ที่มี `breadcrumbs` ถูกเรียกจากไฟล์ client · วันนี้ไม่มีฟอร์มไหนส่ง crumbs (ข้อ 4.4.2) · ถ้ามีในอนาคตต้องมี `NextIntlClientProvider` (มีอยู่แล้ว เพราะฟอร์ม client เรียก `useTranslations`)
8. **ปุ่มกลับซ้ำบนมือถือของ `maintenance/[id]`** (หัว + แถบล่าง) จนกว่า 2C ชุด 5 จะตัดสิน
9. **ช่องว่างของ 2C plan 4:** ถ้า 2C-4 ไม่ย้ายหัวของเครื่องมือ 2 ไฟล์ หน้า `asset-management/scan` และ `labels` จะยังเป็น h1 700 · LFG LH1 ยอม (`KEEP` 1 ต่อไฟล์) · 2D ตั้ง `{}`

---

### 4.10 เอกสาร

| ที่ | plan | แก้ |
|---|---|---|
| `DESIGN.md:284` | 2B-1 | "**Display** (600, 1.5rem / `text-2xl`, 32px; 36px on Thai pages): Page titles, built only by `PageHeader` (the compact register title is `text-xl` below `md`). Keep fixed and compact." |
| `DESIGN.md:489` | 2B-1 | ทรัพย์สิน / Assets "(the asset register first, then the groups จัดการทรัพย์สิน / Asset Management and ธุรกรรม / Transactions, then audit, maintenance and disposal)" · เพิ่ม "The menu is at most two levels deep: a section holds rows and groups, a group holds rows only. Every row and group has its own icon, because the collapsed rail shows icons only (`tests/sidebar-menu-structure.test.ts`)." · ข้อความที่เหลือของบรรทัดคงเดิม |
| `DESIGN.md:493` | 2B-1 | "No outer margin: the page header owns the gap to the title" → "No outer margin: `PageHeader` puts it 4px (`mb-1`) above the title." |
| `DESIGN.md` หลัง `:493` (ใหม่ 2 bullet) | 2B-1 | **Page header** (`PageHeader`, `src/components/ui/page-header.tsx`, server-safe): ทุกหัวหน้า · h1 600 ink ขึ้นบรรทัดใหม่ได้ · meta 13/20 secondary `gap-x-3 gap-y-1` max 48rem: รหัส `tag` → ป้ายสถานะ → ข้อเท็จจริง → คำอธิบาย · ป้ายสถานะอยู่ใน meta เท่านั้น · กติการหัสกับ h1 (ข้อ 4.3.3 ข้อ 6) · ปุ่ม `md`: back → ⋯ → รอง → หลัก · ต่ำกว่า `md` ซ้อนกัน · `compactOnMobile` ทะเบียนเท่านั้น · ไม่มี margin รอบนอก · `AuditScanHeader` เป็นข้อยกเว้นของจอสแกน — **Back button** (`PageBackLink`): `outline` `md` + ลูกศรซ้าย + ข้อความของหน้า · ต่ำกว่า `md` ปุ่มไอคอน 44 ชื่ออยู่ใน `max-md:sr-only` · ใช้ `returnTo` ที่หน้าคำนวณ · หน้าที่มีปุ่มกลับคงไว้ ฟอร์มที่ไม่มีไม่เพิ่ม · แถบปุ่มล่างใช้ลูกศรซ้ายเดียวกัน |
| `DESIGN.md:571` (ต่อท้ายหัวข้อ Adaptive) | 2B-4 | bullet ใหม่: shell เผื่อที่ให้แถบนำทาง · หน้าเติม padding ล่างได้เฉพาะหน้าที่มีแถบปุ่มของหน้า (LFG LP1) · โครงของหน้าสลับที่ `md` โครงของ shell สลับที่ `lg` · หน้ารายการและรายละเอียดเต็มกว้าง ฟอร์มและเครื่องมือคงความกว้างของตัวเอง ราก `space-y-6` · skeleton ตามรูปหน้าจริง |
| `DESIGN.md:573` | 2B-2 | คงข้อความ (PM มีปุ่มกลับแล้ว I25) |
| `docs/14_UI_UX_DESIGN_SYSTEM.md` ตาราง Shared Components (`:54` ขึ้นไป) | 2B-1 | 2 แถว: หัวหน้า → `PageHeader` ("h1 มีที่เดียว · ป้ายสถานะใน meta · ปุ่ม `md`") · ปุ่มกลับ → `PageBackLink` ผ่าน `back` ("ใช้ href เดิมของหน้า") |
| `docs/14_UI_UX_DESIGN_SYSTEM.md:37-42` Navigation and Action Surfaces | 2B-4 | "Reserve safe-area-aware content spacing only for the active bar" → ระบุเจ้าของ (shell / 4 หน้า O11) |
| `docs/99_CHANGELOG.md` | ทุก plan | เมนูข้าง (2B-1) · หัวหน้าและปุ่มกลับตาม plan · `pb-24` และ skeleton (2B-4) · ลบ `MasterDataHeader`, `ReportHeader` (2B-5) |
| `DEVELOPER_HANDOFF.md` | ทุก plan | ส่วนของ plan · ส่งต่อ 2C plan 4: หัวของ `asset-scan-search-tool.tsx`, `asset-label-batch-tool.tsx` ใช้ `PageHeader` · ส่งต่อ 2C plan 5: `ActionBar` สลับที่ `md` · รายการกลับในแถบเลือกได้ (หัวมี `PageBackLink` ใน 3 หน้า) · ลบ `getMobileSafeBottomPaddingClasses` พร้อม `actionBarPagePadding` · แก้ DH:296 (โครงเมนู) |
| `.impeccable/design.json` | 2B-1 | component `page-header` (slots title, meta, actions, back, breadcrumbs · h1 600 · meta 13/20 · back outline md) ตาม R-s |
| wiki `AssetSystem/ams-open-questions.md:52` (ข้อ 28) | 2B-1 | ปิด: ทำแล้วใน 2B-1 · เพิ่มข้อเฟส 3 (ไอเดียเมนูที่ยังไม่เลือก · `returnTo` ปลายทาง I22) |
| wiki หน้า `ams-` เรื่อง UI กลาง + `ams-log.md` | ทุก plan | `PageHeader`, `PageBackLink`, โครงเมนู · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` |

---

### 4.11 test

**ใหม่**

| ไฟล์ | plan | ตรวจอะไร |
|---|---|---|
| `tests/sidebar-menu-structure.test.ts` | 2B-1 | อ่าน `sidebar.tsx` (`.replace(/\r\n/g, "\n")`) ตัดช่วง `const menuSections` ถึง `const visibleSections` · (1) `` /labelKey: "sectionAssets",\s*items: \[\s*\{\s*labelKey: "assetRegister",\s*href: `\/\$\{locale\}\/assets`,\s*permission: \{ module: "asset", action: "view" \}/ `` · (2) ลำดับ labelKey ในหมวดทรัพย์สิน = `assetRegister`, `assetManagement`, `addAsset`, `scanSearchAsset`, `printLabels`, `importExport`, `assetTransactionsGroup`, `checkout`, `checkin`, `transfer`, `bulkMove`, `audit`, `auditRound`, `auditFinding`, `maintenance`, `disposal` · (3) ลึกไม่เกิน 2: ไล่ `[`/`]` เก็บ stack ว่าวงเล็บไหนเปิดหลัง `children:` · เจอ `children: [` ขณะอยู่ใน `children` อื่น = fail · (4) ไอคอน: ทุก `icon:` ตรง `/icon: <(\w+) size=\{(?:18\|20)\} \/>/` (จำนวนเท่ากัน) และชื่อไม่ซ้ำ (39) · (5) ไม่มี `assetRegistryGroup` ใน `sidebar.tsx` และใน `nav` ของ th/en · ทุก `labelKey` ของรายการและกลุ่มมีใน `nav` ทั้ง 2 ภาษา · regex ไม่มี `\n` |
| `tests/list-primitives-ui.test.ts` ส่วนหัวหน้า (string ของ primitive ทุกตัวอยู่ไฟล์นี้, I16) | 2B-1 งาน 3 | `page-header.tsx` ไม่มี `"use client"`, `useState`, `useEffect` · h1 มี `text-2xl font-semibold` และไม่มี `font-bold` · `<Breadcrumbs items={breadcrumbs} className="mb-1" />` · string ของแถว h1 meta ปุ่ม และ compact ตามตารางข้อ 4.3.2 (I1) · class ของ `<header` ไม่มี `\bm[tb]-` · `PageBackLink`: `buttonVariants({ variant: "outline", size: "md" })`, `"min-w-11 max-md:px-0"`, `<ArrowLeft aria-hidden="true" />`, `<span className="max-md:sr-only">{label}</span>`, `data-slot="page-back-link"`, ไม่มี `aria-label=` |
| `tests/list-frame-guards.test.ts` (LFG ข้อ 9.3, I15 · ส่วนของข้อนี้ 4 ตัว) | 2B-1 งาน 1 สร้าง (`BUDGETS` = ค่า HEAD + LB1 `0→1` 2 แถว) → ทุก commit ที่ย้ายไฟล์ลดแถวของตัวเอง → 2B-5 ล็อก `BUDGETS = KEEP` | ใช้ `readSourceFiles` + `countMatchesByFile`/`countByFile` (`tests/helpers/source-files.ts`) · LH1, LH2, LB1 ข้าม `c/ui/page-header.tsx` · **LP1** (เดิม G1) `/\bpb-(?:24\|36)\b/g` ใต้ `D/` · `KEEP` = `{ assets/[id]/page.tsx: 1, audit/rounds/[id]/page.tsx: 1, maintenance/[id]/page.tsx: 1, disposal/[id]/page.tsx: 1 }` (O11 → 2C plan 5) · **LH1** (เดิม G2) `<h1>` ด้วย `findJsxTags` · `KEEP` = `{ (auth)/login/page.tsx: 1, audit/audit-scan-header.tsx: 1, asset-operations/operation-document-print.tsx: 1, assets/asset-label-print.tsx: 1, assets/asset-scan-search-tool.tsx: 1, assets/asset-label-batch-tool.tsx: 1 }` (2 ตัวท้าย → 0 เมื่อ 2C-4 ย้าย) · **LB1** (เดิม G3) `/<ArrowLeft\b/g` · `KEEP` = `{ admin/system-settings-form.tsx: 1, disposal/disposal-batch-form.tsx: 1, asset-operations/operation-document-print.tsx: 1, assets/asset-label-print.tsx: 1, audit/audit-scan-header.tsx: 1, D/audit/rounds/[id]/page.tsx: 1, D/maintenance/[id]/page.tsx: 1 }` (2 แถวท้ายเป็นแถว `0→1` ของแถบล่าง) · **LH2** (เดิม G4) `/\bMasterDataHeader\b\|\bReportHeader\b\|\bfunction PageHeader\b/g` · `KEEP` ว่าง · ค่าต่อ plan ตามตาราง C ข้อ 10.4 |

**แก้ (พังโดยตั้งใจ แก้ใน commit ที่ทำให้พัง)**

| test:บรรทัด | plan | เดิม | ใหม่ |
|---|---|---|---|
| `tests/breadcrumbs-ui.test.ts:38-40` | 2B-1 | `/<Breadcrumbs\b[\s\S]*?\/>/g` | `/<Breadcrumbs\b[\s\S]*?\/>\|\bbreadcrumbs=\{\[[\s\S]*?\]\}/g` บนไฟล์ที่ path ไม่ใช่ `src/components/ui/page-header.tsx` · `:41` 11 และ `:42` 8 คงเดิม (R-i) · `:55-65` ผ่านต่อเพราะข้อความ element ยังลงท้าย `{ label: X, code: true }, ]}` |
| `tests/asset-register-filter-ui.test.ts:112-119` | 2B-1 งาน 3 | string `compactOnMobile` 3 ตัวใน `master-data-layout.tsx` | อ่าน `ui/page-header.tsx`: string ของ I1 (`compactOnMobile\?: boolean` · `"max-md:text-xl"` · `"max-md:hidden"` · แถว compact) + `master-data-layout.tsx` `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"` (I2) |
| `tests/asset-register-filter-ui.test.ts:108` | 2B-3 | `/<MasterDataHeader\s+compactOnMobile/` | `/<PageHeader\s+compactOnMobile/` |
| `tests/supplier-adaptive-ui.test.ts:58` | 2B-1 งาน 3 → งาน 20 | `href={createHref}` + `min-h-11` ใน `master-data-layout.tsx` | งาน 3 (I2): ยังอ่าน `master-data-layout.tsx` (ตัวห่อบาง) `/href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}/` · งาน 20: ย้ายไปอ่าน `D/master-data/suppliers/page.tsx` (`md` สูง 44 ต่ำกว่า `md`) |
| `tests/master-data-brand-supplier-ui.test.ts:9-10` | 2B-1 | `<MasterDataHeader[\s\S]*createHref=\{createModelHref\}` · `createLabel=\{t\("createModel"\)\}` | `<PageHeader[\s\S]*href=\{createModelHref\}` · `\{t\("createModel"\)\}` · `:11` (`actions=\{[\s\S]*master-data\/brands\/new`) ผ่านต่อ |
| `tests/disposal-route-structure.test.ts:33` | 2B-1 | `/ArrowLeft/` ใน `disposal/new/page.tsx` | `/<PageBackLink href=\{returnToHref\}/` |
| `tests/disposal-detail-workspace.test.ts:33` | 2B-4 | `/ArrowLeft/` | `/<PageBackLink href=\{returnToHref\}/` · `:34`, `:36-37`, `:45` ผ่านต่อ (`:35` ของ 2C-5) |
| `tests/asset-detail-ux.test.ts:27` | 2B-4 | `aria-label=\{isAssetScanReturn …\}` | `label=\{isAssetScanReturn \? t\("backToScan"\) : tCommon\("back"\)\}` |
| `tests/asset-detail-ux.test.ts:32-35` | 2B-4 | `data-testid="asset-identity-summary"` อยู่ก่อน `<AssetComponentContextBanner` | ผ่านต่อถ้าทำตามข้อ 4.4.5 · ถ้าไม่ได้ ให้เปลี่ยนเป็นตำแหน่ง `<PageHeader` |
| `tests/asset-detail-ux.test.ts:151-152` | 2B-4 | `cn(buttonVariants({ variant: "outline" }), "min-w-11 px-3")` · `cn(buttonVariants(), "hidden md:inline-flex")` | `<PageBackLink href=\{returnToHref\}` · `cn\(buttonVariants\(\{ size: "md" \}\), "hidden md:inline-flex"\)` · `:150`, `:153-154` ผ่านต่อ |
| `tests/supplier-detail-ui.test.ts:28-30` | 2B-4 | `min-h-11` · `focus-visible:ring-2` · `aria-hidden="true"` ในหน้า | ถ้า literal หายไปกับงานอื่นของ 2B-4: `<PageBackLink href=\{returnToHref\}` และ `buttonVariants\(\{ size: "md" \}\)` ในหัว |
| `tests/mobile-field-navigation.test.ts:14-33` | 2B-4 | list โหมด navigation | เพิ่ม `"/th/my-assets/asset-1"` |

**ต้องผ่านต่อโดยไม่แก้**

- เมนูข้าง (2B-1): `tests/dashboard-shell-theme.test.ts:8-31` · `tests/navigation-active.test.ts` (fixture `:49` คงเดิม) · `tests/permission-aware-navigation.test.ts:18-53` · `tests/my-assets-route-ui.test.ts:35-45` · `tests/integration-api-client-admin.test.ts:117-122` · `tests/sheet-drawers-ui.test.ts:47-60` · `tests/mobile-field-navigation-ui.test.ts:59-80` · `tests/dropdown-menus-ui.test.ts:52-54` · `tests/messages-parity.test.ts` · `tests/thai-glossary.test.ts`
- `returnTo` และปุ่มกลับ: ทุก test ในตารางข้อ 4.5.6 · `tests/supplier-form-ui.test.ts:28-35`, `:53` · ลิงก์ยกเลิกท้ายฟอร์ม `tests/{branch,brand,category,company,department,employee,location}-form-ui.test.ts`
- 2C: `tests/form-migration-guards.test.ts` ทั้งไฟล์ (ไม่แก้ · ไม่มี `flex-col-reverse` ใน `page-header.tsx` GD4 · ไม่เปลี่ยนชื่อไฟล์ใน `BATCH_FILES` FMG:26-38) · `tests/asset-component-manager.test.ts` · `tests/asset-forms-ui.test.ts:82-120`
- โครงหน้า: `tests/visual-foundation-guards.test.ts:109-115` (แถบเต็มขอบ) · `:187-193` (`tag`) · `tests/dashboard-layout-scroll.test.ts` · `tests/mobile-field-navigation-ui.test.ts:22-49` · `tests/mobile-action-bar.test.ts` · `tests/audit-scan-search-ui.test.ts:182-188`
- skeleton (2B-4): `tests/page-loading-skeleton.test.ts:10-32` · `tests/loading-boundaries.test.ts:5-32`
- หน้าที่หัวเปลี่ยน (ส่วนหัวและปุ่มกลับ): `tests/operational-return-navigation.test.ts` (ตลอด 2B-1 · 2B-2 ต่อท้าย `pageSize`/`page` ที่ `:54`, `:66`, `:69`, `:81-83` ไม่ลบส่วนเดิม, I17) · `tests/audit-round-result-drilldown.test.ts:234-237` · `tests/repair-record-detail-ui.test.ts:34-37` · `tests/visual-consistency-ui.test.ts:23-34` · `tests/disposal-queue-ux.test.ts` (`:43-51` แก้ใน 2B-2 ตามตาราง A ข้อ 10.4) · `tests/audit-pending-mobile-ux.test.ts` (`:14-15` ตลอด 2B-1 · 2B-2 แก้ `:8`, `:15` (I17) และ `:30` (ตาราง A ข้อ 10.4))

**ตรวจบนแอป dev (ทุก plan ที่แตะส่วนนี้):** เมนูข้างที่ 1440 (ขยาย, ย่อ) และ 375 (drawer) ด้วยบัญชีที่มีแค่ `asset:view` และบัญชีผู้ดูแล · หัวและปุ่มกลับของทุกหน้าที่แก้ที่ 1440, 1024, 768, 375 · กดปุ่มกลับจากหน้ารายละเอียดที่เปิดจากรายการที่มีตัวกรองและหน้า 2 แล้วตัวกรองยังอยู่ · Tab ผ่านหัว: ปุ่มกลับ → ปุ่มรอง → ⋯ → ปุ่มหลัก · NVDA อ่านชื่อปุ่มกลับแบบไอคอนบนมือถือ (ค้างไว้ให้คนตรวจก่อน deploy ครั้งเดียว)
