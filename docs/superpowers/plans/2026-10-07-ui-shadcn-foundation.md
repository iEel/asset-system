# รากฐาน UI บน shadcn/ui (รอบที่ 3 ส่วน A) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** ย้ายฐาน UI ไป shadcn/ui (Radix) — token สีผ่าน AA · ฟอนต์ Noto Sans Thai + Inter · คอมโพเนนต์กลางเปลี่ยนไส้ในเป็น Radix โดยคง props · กล่องลอยที่เขียนเองทุกตัวย้ายไป Radix · `window.confirm` 13 จุดเป็น `await confirm()`

**Architecture:** ติดตั้ง shadcn แบบ Tailwind 4 ใน `src/components/ui/` · ค่า token อยู่ใน `:root` ของ `src/app/globals.css` (ชื่อตาม shadcn + สีสถานะ 5 ค่าต่อโทน) · cva ของ Button/Badge อยู่ในไฟล์ `.ts` ให้ test import ได้ · คอมโพเนนต์กลางเดิม (`AccessibleDialog`, `SearchableSelect`, `StatusBadge` …) เป็นตัวห่อบาง ๆ บน Radix · `ConfirmProvider` ตัวเดียวใน `DashboardShell`

**Tech Stack:** Next.js 16.2.4 App Router · React 19.2 · TypeScript · Tailwind 4 (`@theme inline`) · shadcn/ui (style `new-york`, แพ็กเกจ `radix-ui` 1.7) · `cmdk` 1.1 · `class-variance-authority` · next-intl · `node --test` (type stripping)

**Spec:** `docs/superpowers/specs/2026-10-07-ui-shadcn-foundation-design.md`

## Global Constraints

- อ่าน `AGENTS.md` ก่อน: Next.js รุ่นนี้มี breaking changes — เรื่องฟอนต์ดู `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md`
- ไม่แตะฐานข้อมูล ไม่รัน migration ไม่แก้ `.env` · ถ้าต้องเปิดแอปให้ตรวจว่า `.env` ชี้ `asset_management_dev` / `asset_dev` ก่อน
- **ไม่เปลี่ยนข้อความ UI** ยกเว้น key ใหม่ `common.deletedSuccess` (Task 6) และป้าย "Close" ที่ hard-code เปลี่ยนเป็น `common.close` · ข้อความไทยเป็นหลัก ทุก key ใหม่ต้องมีทั้ง `messages/th.json` และ `messages/en.json`
- ไม่มี dark mode: ห้ามมีคลาส `dark:` ห้ามเพิ่ม `@custom-variant dark` (ลบออกจากไฟล์ที่ shadcn CLI สร้าง)
- ค่า token ต้องตรงตาราง spec §3.2 ทุกตัว · ห้ามใช้ `bg-{success|warning|danger|info}/NN`, `bg-primary/{5|10|15|90}`, `bg-{tone}/90` ในโค้ดใหม่ — ใช้ `bg-{tone}-soft` / `bg-{tone}-hover` · ข้อความสีสถานะใช้ `text-{tone}` (ไม่ใช่ `text-{tone}-foreground` ซึ่งตอนนี้แปลว่า "ตัวขาวบนพื้นทึบ")
- เป้าแตะบนมือถือสูง ≥ 44px (`min-h-11` / `min-w-11` แล้วค่อยลดที่ `sm:`) ตามแบบของเดิม
- shadcn CLI (`npx shadcn@latest add …`) **ห้ามแก้ `src/app/globals.css`** — หลังรันทุกครั้งตรวจ `git diff --stat` ถ้า `globals.css` เปลี่ยนให้ `git checkout -- src/app/globals.css` · ถ้า CLI ถามจะเขียนทับไฟล์เดิมให้ตอบ No
- ไฟล์ที่ test import ได้ (`src/lib/*.ts`, `src/components/ui/*-variants.ts`) ใช้ relative import ลงท้าย `.ts` และห้ามมี runtime import แบบ `@/` · test รันด้วย `node --test` ซึ่งโหลด `.tsx` ไม่ได้ — test ของ `.tsx` อ่านซอร์สเป็นข้อความ
- คำสั่งตรวจ: test เดี่ยว `node --test tests/<ชื่อ>.test.ts` · ทั้งชุด `npm test` · type `npx tsc --noEmit -p tsconfig.json` · lint `npm run lint`
- ทุก task จบด้วย `npm test` ทั้งชุด + tsc + lint ผ่าน แล้ว commit · ท้าย commit message: `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`
- เครื่องนี้เป็น Windows + Git Bash · working tree เป็น CRLF (autocrlf) — regex ใน test ที่อ่านซอร์สให้ `.replace(/\r\n/g, "\n")` ก่อน
- dependency: ติดตั้งด้วย npm 10.9.4 (`npx -y npm@10.9.4 …`) เพื่อให้ `npm ci` บน Production (npm 10) ผ่าน · npm 11 ในเครื่องข้าม install script จึงต้อง `npm run prisma:generate` หลังติดตั้ง
- ห้ามแก้ `tests/dashboard-layout-scroll.test.ts` และ `tests/asset-register-ux.test.ts:175` ให้ผ่านด้วยการลดเงื่อนไข — ถ้าล้มแปลว่าแก้ shell / การ์ดมือถือของทะเบียนเกินขอบเขต

## Review Focus

1. **กดปุ่มยืนยันใน confirm ซ้ำเร็ว ๆ หรือกด Enter ค้าง** → ต้องยืนยันคำขอที่แสดงอยู่เท่านั้น ห้ามไปยืนยันคำขอถัดไปในคิว (test: `settleConfirm` รับ `id` และไม่ทำอะไรถ้า id ไม่ตรง — Task 6)
2. **dialog ที่กำลังบันทึก (`busy`) แล้วผู้ใช้กด Esc / คลิกนอกกล่อง / กด X** → ปิดไม่ได้และงานบันทึกไม่ถูกตัดกลาง (test ซอร์ส `AccessibleDialog` — Task 5 · ตรวจมือ Task 8)
3. **สีสถานะใน DB เป็นค่าแปลก (`null`, `""`, `"red"`, `"#12"`, `"url(x)"`)** → จุดสีใช้สีของโทนแทน ตัวอักษรไม่เคยใช้สีจาก DB (test: `getStatusDotColor` — Task 4)
4. **Ctrl/⌘/Shift/คลิกกลาง บนลิงก์ในหน้าที่มีตัวกันออกจากหน้า** → เปิดแท็บใหม่ได้โดยไม่ถาม และไม่ล้างรายการที่เลือก (test: `shouldGuardLinkClick` — Task 7)
5. **เปิด dialog/drawer จากรายการในเมนู แล้วปิด dialog** → โฟกัสกลับไปที่ปุ่มเปิดเมนู ไม่หลุดไป `<body>` (test ซอร์ส: `AssetDetailActionMenu` ส่ง `returnFocusRef` — Task 12 · ตรวจมือ)

## ขั้นตอนของผู้ควบคุม (ไม่ใช่ task ของ subagent)

- **ก่อน Task 1:** ถ่ายภาพ "ก่อน" บนแอป dev ตาม spec §8 (desktop 1440 + 375) เก็บที่ scratchpad
- **หลัง Task 16:** ตรวจมือตาม spec §8 · axe-core `color-contrast` 8 หน้า · ภาพ "หลัง" เทียบ · รัน agent `impeccable:impeccable-documenter` อัปเดต `.impeccable/design.json` ให้ตรง `DESIGN.md` · อัปเดต wiki `AssetSystem`

## File Map

| ไฟล์ | หน้าที่ | Task |
|---|---|---|
| `components.json` | ตั้งค่า shadcn CLI | 1 |
| `src/app/globals.css` | token (`:root`) + `@theme inline` + ฟอนต์ | 1 |
| `src/app/layout.tsx` | โหลด Inter + Noto Sans Thai | 1 |
| `src/lib/color-contrast.ts` | สูตร contrast WCAG + อ่าน token จาก CSS | 1 |
| `tests/design-tokens-contrast.test.ts` | คู่สี token ต้อง ≥ 4.5:1 | 1 |
| `tests/ui-overlay-guards.test.ts` | สแกนซอร์สกันถอย (สี, confirm, กล่องลอย) | 2, 6, 16 |
| `src/components/ui/button-variants.ts` | cva ของปุ่ม (test import ได้) | 3 |
| `src/components/ui/button.tsx` | shadcn Button | 3 |
| `src/lib/design-system.ts` | `getActionButtonClasses` คืนคลาสจาก `buttonVariants` | 3 |
| `src/components/ui/badge-variants.ts` | cva ของ Badge + ป้ายสถานะแบบ C | 4 |
| `src/lib/status-tone.ts` | `getStatusTone`, `getStatusDotColor` | 4 |
| `src/components/ui/badge.tsx`, `status-badge.tsx` | Badge + ป้ายสถานะตัวเดียว (ลบ `status-pill.tsx`) | 4 |
| `src/components/ui/dialog.tsx`, `alert-dialog.tsx` | shadcn + `closeLabel` | 5 |
| `src/components/ui/accessible-dialog.tsx` | ตัวห่อ Dialog (props เดิม + `size`, `returnFocusRef`, `closeLabel`) | 5 |
| `src/components/ui/confirm-text-dialog.tsx`, `operation-review-dialog.tsx` | อยู่บน `AccessibleDialog` | 5 |
| `src/lib/confirm-queue.ts` | คิวของ `confirm()` (ฟังก์ชันล้วน) | 6 |
| `src/components/ui/confirm-dialog.tsx` | `ConfirmProvider`, `useConfirm` | 6 |
| `src/lib/navigation-guard.ts` | `shouldGuardLinkClick` | 7 |
| `src/components/ui/attachment-preview-dialog.tsx` | ภาพ/PDF ตัวอย่าง | 10 |
| `src/components/ui/sheet.tsx` | shadcn Sheet | 11 |
| `src/components/ui/dropdown-menu.tsx` | shadcn DropdownMenu | 12 |
| `src/components/master-data/use-delete-action.ts` | ตรรกะลบ (confirm + fetch + toast) ใช้ร่วมปุ่มและเมนู | 12 |
| `src/components/ui/popover.tsx` | shadcn Popover | 13 |
| `src/components/ui/command.tsx` | shadcn Command | 14 |
| `src/lib/searchable-select-filter.ts` | ตรรกะกรองของ `SearchableSelect` (ย้ายมา) | 14 |

---

### Task 1: ตั้ง shadcn · token สี · ฟอนต์

**Files:**
- Create: `components.json`, `src/lib/color-contrast.ts`, `tests/design-tokens-contrast.test.ts`
- Modify: `package.json`, `package-lock.json`, `src/app/globals.css:1-70` (`:root` + `@theme inline`) และ scrollbar hover, `src/app/layout.tsx`, `src/components/assets/asset-label-batch-tool.tsx:377`, `tests/modern-enterprise-theme.test.ts`, `DESIGN.md`

**Interfaces:**
- Produces: token CSS ทุกตัวในตาราง spec §3.2 พร้อม `--color-*` (utility `bg-success-soft`, `border-warning-border`, `hover:bg-primary-hover`, `bg-destructive`, `bg-popover`, `font-sans` ฯลฯ ใช้ได้) · `src/lib/color-contrast.ts`: `type Rgb = [number, number, number]`, `parseHexColor(value: string): Rgb`, `relativeLuminance(rgb: Rgb): number`, `contrastRatio(a: Rgb, b: Rgb): number`, `mixOver(color: Rgb, alpha: number, background?: Rgb): Rgb`, `readRootTokens(css: string): Record<string, string>`, `resolveToken(tokens: Record<string, string>, name: string): string`

- [ ] **Step 1: ติดตั้ง dependency ด้วย npm 10**

```bash
npx -y npm@10.9.4 install radix-ui@^1.7.0 tw-animate-css@^1.4.0 --ignore-scripts
npm run prisma:generate
npx -y npm@10.9.4 install --package-lock-only --ignore-scripts
git diff --stat package-lock.json
```

Expected: `package.json` มี `"radix-ui"` และ `"tw-animate-css"` ใน `dependencies` · คำสั่งที่สาม (รันซ้ำ) ไม่ทำให้ lockfile เปลี่ยนเพิ่ม

- [ ] **Step 2: สร้าง `components.json`**

```json
{
  "$schema": "https://ui.shadcn.com/schema.json",
  "style": "new-york",
  "rsc": true,
  "tsx": true,
  "tailwind": {
    "config": "",
    "css": "src/app/globals.css",
    "baseColor": "slate",
    "cssVariables": true,
    "prefix": ""
  },
  "iconLibrary": "lucide",
  "aliases": {
    "components": "@/components",
    "utils": "@/lib/utils",
    "ui": "@/components/ui",
    "lib": "@/lib",
    "hooks": "@/hooks"
  }
}
```

- [ ] **Step 3: เขียน test ที่ล้ม — `tests/design-tokens-contrast.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import {
  contrastRatio,
  mixOver,
  parseHexColor,
  readRootTokens,
  resolveToken,
  type Rgb,
} from "../src/lib/color-contrast.ts"

const tokens = readRootTokens(readFileSync("src/app/globals.css", "utf8"))
const color = (name: string) => parseHexColor(resolveToken(tokens, name))
const white = parseHexColor("#FFFFFF")
const AA = 4.5

function assertAA(foreground: string, background: string | Rgb, label: string) {
  const backgroundColor = typeof background === "string" ? color(background) : background
  const ratio = contrastRatio(color(foreground), backgroundColor)
  assert.ok(ratio >= AA, `${label}: ${ratio.toFixed(3)}:1 < 4.5:1`)
}

test("contrast helpers match WCAG reference values", () => {
  assert.equal(contrastRatio(parseHexColor("#000000"), white).toFixed(2), "21.00")
  assert.equal(contrastRatio(parseHexColor("#F59E0B"), white).toFixed(2), "2.15")
  assert.deepEqual(mixOver(parseHexColor("#000000"), 0.5), [127.5, 127.5, 127.5])
  assert.throws(() => parseHexColor("red"), /Unsupported color/)
})

test("resolveToken follows var() aliases and rejects cycles", () => {
  assert.equal(resolveToken({ a: "var(--b)", b: "#123456" }, "a"), "#123456")
  assert.throws(() => resolveToken({ a: "var(--a)" }, "a"), /cycle/)
  assert.throws(() => resolveToken({}, "nope"), /missing/)
})

for (const tone of ["success", "warning", "danger", "info"] as const) {
  test(`${tone} text is AA on every surface it sits on`, () => {
    assertAA(tone, white, `${tone} on white`)
    for (const surface of ["background", "card", "muted", `${tone}-soft`]) {
      assertAA(tone, surface, `${tone} on ${surface}`)
    }
  })

  test(`${tone} solid and hover fills keep their foreground AA`, () => {
    assertAA(`${tone}-foreground`, tone, `${tone}-foreground on ${tone}`)
    assertAA(`${tone}-foreground`, `${tone}-hover`, `${tone}-foreground on ${tone}-hover`)
  })
}

test("primary and destructive pairs are AA", () => {
  assertAA("primary-foreground", "primary", "primary-foreground on primary")
  assertAA("primary-foreground", "primary-hover", "primary-foreground on primary-hover")
  assertAA("primary", "primary-soft", "primary on primary-soft")
  assertAA("primary", "background", "primary on background")
  assertAA("destructive-foreground", "destructive", "destructive-foreground on destructive")
})

test("neutral text pairs are AA", () => {
  for (const surface of ["background", "card", "popover", "muted"]) {
    assertAA("foreground", surface, `foreground on ${surface}`)
    assertAA("muted-foreground", surface, `muted-foreground on ${surface}`)
  }
  assertAA("card-foreground", "card", "card-foreground on card")
  assertAA("popover-foreground", "popover", "popover-foreground on popover")
  assertAA("secondary-foreground", "secondary", "secondary-foreground on secondary")
  assertAA("accent-foreground", "accent", "accent-foreground on accent")
})

test("every token is exposed to Tailwind through @theme inline", () => {
  const css = readFileSync("src/app/globals.css", "utf8")
  for (const name of Object.keys(tokens)) {
    if (name === "radius") continue
    assert.match(css, new RegExp(`--color-${name}:\\s*var\\(--${name}\\);`), `--color-${name} missing in @theme inline`)
  }
  assert.match(css, /--font-sans:\s*var\(--font-inter\),\s*var\(--font-thai\)/)
  assert.match(css, /@import "tw-animate-css";/)
  assert.doesNotMatch(css, /@custom-variant dark/)
})
```

- [ ] **Step 4: รัน test ให้ล้ม**

Run: `node --test tests/design-tokens-contrast.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/color-contrast.ts'`

- [ ] **Step 5: สร้าง `src/lib/color-contrast.ts`**

```ts
export type Rgb = [number, number, number]

export function parseHexColor(value: string): Rgb {
  const hex = value.trim().replace(/^#/, "")
  if (!/^[0-9a-f]{6}$/i.test(hex)) throw new Error(`Unsupported color: ${value}`)
  return [0, 2, 4].map((index) => Number.parseInt(hex.slice(index, index + 2), 16)) as Rgb
}

function linearChannel(value: number) {
  const normalized = value / 255
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4
}

export function relativeLuminance([red, green, blue]: Rgb) {
  return 0.2126 * linearChannel(red) + 0.7152 * linearChannel(green) + 0.0722 * linearChannel(blue)
}

export function contrastRatio(foreground: Rgb, background: Rgb) {
  const [lighter, darker] = [relativeLuminance(foreground), relativeLuminance(background)].sort((a, b) => b - a)
  return (lighter + 0.05) / (darker + 0.05)
}

export function mixOver(color: Rgb, alpha: number, background: Rgb = [255, 255, 255]): Rgb {
  return color.map((channel, index) => channel * alpha + background[index] * (1 - alpha)) as Rgb
}

export function readRootTokens(css: string): Record<string, string> {
  const block = css.match(/:root\s*\{([\s\S]*?)\}/)
  if (!block) throw new Error(":root block not found")
  const tokens: Record<string, string> = {}
  for (const match of block[1].matchAll(/--([\w-]+)\s*:\s*([^;]+);/g)) tokens[match[1]] = match[2].trim()
  return tokens
}

export function resolveToken(tokens: Record<string, string>, name: string): string {
  const seen = new Set<string>()
  let current = name
  for (;;) {
    if (seen.has(current)) throw new Error(`Token cycle at --${current}`)
    seen.add(current)
    const value = tokens[current]
    if (value === undefined) throw new Error(`Token --${current} is missing`)
    const alias = value.match(/^var\(--([\w-]+)\)$/)
    if (!alias) return value
    current = alias[1]
  }
}
```

- [ ] **Step 6: รัน test — ต้องล้มที่ค่าสี (ตอนนี้ยังเป็น token เดิม)**

Run: `node --test tests/design-tokens-contrast.test.ts`
Expected: helper tests PASS · `warning text is AA…` FAIL (`warning on white: 2.152:1`) · `@theme inline` test FAIL

- [ ] **Step 7: แทนที่ส่วนบนของ `src/app/globals.css`**

แทนที่ทุกอย่างตั้งแต่บรรทัดแรกจนจบบล็อก `@theme inline { … }` ด้วย (ส่วน `/* Base Styles */` ลงไปคงไว้):

```css
@import "tailwindcss";
@import "tw-animate-css";

/* Enterprise color tokens — shadcn/ui naming. Every text pair is checked by tests/design-tokens-contrast.test.ts. */
:root {
  --brand-navy: #0F172A;
  --brand-accent: #3B82F6;
  --background: #F8FAFC;
  --foreground: #0F172A;
  --card: #FFFFFF;
  --card-foreground: #0F172A;
  --surface: var(--card);
  --popover: #FFFFFF;
  --popover-foreground: #0F172A;
  --primary: #2563EB;
  --primary-foreground: #FFFFFF;
  --primary-soft: #EFF6FF;
  --primary-hover: #1D4ED8;
  --secondary: #F1F5F9;
  --secondary-foreground: #0F172A;
  --muted: #F1F5F9;
  --muted-foreground: #475569;
  --accent: #F1F5F9;
  --accent-foreground: #0F172A;
  --border: #E2E8F0;
  --input: #E2E8F0;
  --ring: #3B82F6;
  --success: #15803D;
  --success-foreground: #FFFFFF;
  --success-soft: #F0FDF4;
  --success-border: #BBF7D0;
  --success-hover: #166534;
  --warning: #B45309;
  --warning-foreground: #FFFFFF;
  --warning-soft: #FFFBEB;
  --warning-border: #FDE68A;
  --warning-hover: #92400E;
  --danger: #B91C1C;
  --danger-foreground: #FFFFFF;
  --danger-soft: #FEF2F2;
  --danger-border: #FECACA;
  --danger-hover: #991B1B;
  --destructive: var(--danger);
  --destructive-foreground: var(--danger-foreground);
  --info: #2563EB;
  --info-foreground: #FFFFFF;
  --info-soft: #EFF6FF;
  --info-border: #BFDBFE;
  --info-hover: #1D4ED8;
  --sidebar: #0F172A;
  --sidebar-foreground: #CBD5E1;
  --sidebar-muted: #94A3B8;
  --sidebar-hover: #1E293B;
  --sidebar-active: #1E3A8A;
  --radius: 0.5rem;
}

@theme inline {
  --font-sans: var(--font-inter), var(--font-thai), ui-sans-serif, system-ui, sans-serif;
  --color-brand-navy: var(--brand-navy);
  --color-brand-accent: var(--brand-accent);
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  --color-card: var(--card);
  --color-card-foreground: var(--card-foreground);
  --color-surface: var(--surface);
  --color-popover: var(--popover);
  --color-popover-foreground: var(--popover-foreground);
  --color-primary: var(--primary);
  --color-primary-foreground: var(--primary-foreground);
  --color-primary-soft: var(--primary-soft);
  --color-primary-hover: var(--primary-hover);
  --color-secondary: var(--secondary);
  --color-secondary-foreground: var(--secondary-foreground);
  --color-muted: var(--muted);
  --color-muted-foreground: var(--muted-foreground);
  --color-accent: var(--accent);
  --color-accent-foreground: var(--accent-foreground);
  --color-border: var(--border);
  --color-input: var(--input);
  --color-ring: var(--ring);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
  --color-success-soft: var(--success-soft);
  --color-success-border: var(--success-border);
  --color-success-hover: var(--success-hover);
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-warning-soft: var(--warning-soft);
  --color-warning-border: var(--warning-border);
  --color-warning-hover: var(--warning-hover);
  --color-danger: var(--danger);
  --color-danger-foreground: var(--danger-foreground);
  --color-danger-soft: var(--danger-soft);
  --color-danger-border: var(--danger-border);
  --color-danger-hover: var(--danger-hover);
  --color-destructive: var(--destructive);
  --color-destructive-foreground: var(--destructive-foreground);
  --color-info: var(--info);
  --color-info-foreground: var(--info-foreground);
  --color-info-soft: var(--info-soft);
  --color-info-border: var(--info-border);
  --color-info-hover: var(--info-hover);
  --color-sidebar: var(--sidebar);
  --color-sidebar-foreground: var(--sidebar-foreground);
  --color-sidebar-muted: var(--sidebar-muted);
  --color-sidebar-hover: var(--sidebar-hover);
  --color-sidebar-active: var(--sidebar-active);
  --radius-sm: calc(var(--radius) - 4px);
  --radius-md: var(--radius);
  --radius-lg: calc(var(--radius) + 4px);
}
```

ในส่วน scrollbar ของไฟล์เดียวกัน แก้ `::-webkit-scrollbar-thumb:hover { background: var(--secondary); }` เป็น `background: var(--muted-foreground);`

- [ ] **Step 8: แก้จุดเดียวที่ใช้ `secondary` ความหมายเดิม**

`src/components/assets/asset-label-batch-tool.tsx:377` เปลี่ยน `disabled:bg-secondary` เป็น `disabled:bg-muted disabled:text-muted-foreground` (ปุ่มนี้ใช้ `text-white` ตอนปกติ ถ้าไม่เปลี่ยนสีตัวหนังสือด้วย ปุ่มที่ disabled จะเป็นตัวขาวบนพื้นเทาอ่อน)

- [ ] **Step 9: ฟอนต์ใน `src/app/layout.tsx`**

```tsx
import { Inter, Noto_Sans_Thai } from "next/font/google"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" })
const notoSansThai = Noto_Sans_Thai({ subsets: ["thai"], variable: "--font-thai", display: "swap" })
```

และใน `RootLayout`:

```tsx
    <html lang="th" suppressHydrationWarning className={`${inter.variable} ${notoSansThai.variable}`}>
      <body className="bg-background font-sans text-foreground antialiased">
```

(ลบ `const inter = Inter({ subsets: ["latin"] })` และ `${inter.className}` เดิม)

- [ ] **Step 10: แก้ `tests/modern-enterprise-theme.test.ts` ให้ตรงความหมายใหม่**

ลบ test วน `for (const tone of ["success", "warning", "danger", "info"] as const) { test(\`${tone} badge foreground meets WCAG AA against its 10% tint\` … }` ทั้งก้อน (ความหมายใหม่ตรวจใน `tests/design-tokens-contrast.test.ts` แล้ว) และใน test `"semantic badge foreground tokens are exposed to Tailwind and used by StatusPill"` เปลี่ยนบรรทัด

```ts
    assert.match(source, new RegExp(`--color-${tone}-foreground:\\s*var\\(--${tone}-foreground\\);`))
```

เป็น

```ts
    assert.match(source, new RegExp(`--color-${tone}-soft:\\s*var\\(--${tone}-soft\\);`))
```

(บรรทัดที่ตรวจ `asset-register-table.tsx` คงไว้ก่อน — Task 2 จะแก้)

- [ ] **Step 11: แก้ `DESIGN.md` ส่วนสีและฟอนต์**

frontmatter `colors:` — เปลี่ยน `success: "#16A34A"` → `success: "#15803D"`, `warning: "#F59E0B"` → `warning: "#B45309"`, `danger: "#DC2626"` → `danger: "#B91C1C"` · ลบ `slate-secondary: "#64748B"` · เพิ่มต่อท้ายบล็อก `colors:`

```yaml
  primary-soft: "#EFF6FF"
  primary-hover: "#1D4ED8"
  success-soft: "#F0FDF4"
  warning-soft: "#FFFBEB"
  danger-soft: "#FEF2F2"
  info-soft: "#EFF6FF"
```

frontmatter `typography:` — ทุกบรรทัด `fontFamily: "Inter, system-ui, sans-serif"` เป็น `fontFamily: "Inter, Noto Sans Thai, system-ui, sans-serif"`

หัวข้อ `### Secondary` ใน §2 — แทนบรรทัด `- **Slate Secondary**: …` ด้วย `- **Secondary Surface** (#F1F5F9 + Primary Slate Ink): Secondary button and quiet chip background (shadcn \`secondary\`).`

ต่อท้าย `### Named Rules` ใน §2 (ก่อน `## 3. Typography`):

```markdown
**The Token Contrast Rule.** Status text uses the status ink (`text-success`, `text-warning`, `text-danger`, `text-info`) on white, the page background, muted, or its own soft surface (`bg-{tone}-soft`). Never tint with opacity (`bg-warning/10`, `bg-primary/10`) and never lighten solid fills on hover (`/90`): use `bg-{tone}-soft` and `hover:bg-{tone}-hover`. `{tone}-foreground` means text on the solid fill. `tests/design-tokens-contrast.test.ts` enforces every pair at 4.5:1.
```

§3 — แทน 2 บรรทัด `**Display Font:** …` และ `**Body Font:** …` ด้วย

```markdown
**Display Font:** Inter for Latin letters and numbers, Noto Sans Thai for Thai (both variable, loaded with `next/font/google` in `src/app/layout.tsx`, system-ui fallback)
**Body Font:** Inter + Noto Sans Thai (same stack as display)
```

และในย่อหน้า `**Character:**` เปลี่ยน `One well-tuned sans-serif family keeps` เป็น `One sans-serif stack (Inter + Noto Sans Thai) keeps`

- [ ] **Step 12: รัน test ทั้งหมด + type + lint**

```bash
node --test tests/design-tokens-contrast.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS ทั้งหมด · ถ้า test อื่นล้มเพราะอ้าง token เดิม ให้แก้ test นั้นให้ตรงความหมายใหม่ แล้วบันทึกชื่อไฟล์ไว้ในรายงาน

- [ ] **Step 13: Commit**

```bash
git add components.json package.json package-lock.json src/app/globals.css src/app/layout.tsx src/lib/color-contrast.ts tests/design-tokens-contrast.test.ts tests/modern-enterprise-theme.test.ts src/components/assets/asset-label-batch-tool.tsx DESIGN.md
git commit -m "feat(ui): shadcn tokens with AA status colors and Noto Sans Thai

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: codemod พื้นโปร่ง / hover / foreground + guard สี

**Files:**
- Modify: ทุกไฟล์ใน `src/` ที่มีคลาสตามกฎ (ราว 120 ไฟล์ — codemod) · `src/app/[locale]/(dashboard)/assets/page.tsx:812` · `src/app/[locale]/(dashboard)/assets/[id]/page.tsx:2050,2057`
- Create: `tests/ui-overlay-guards.test.ts`
- Modify tests: `tests/modern-enterprise-theme.test.ts`, `tests/maintenance-contrast.test.ts`, `tests/asset-register-ux.test.ts:252`, `tests/audit-scan-field-mode-ux.test.ts:204,381`, `tests/master-data-brand-supplier-ui.test.ts:40,44`

**Interfaces:**
- Consumes: utility จาก Task 1 (`bg-{tone}-soft`, `bg-{tone}-hover`, `bg-primary-soft`, `bg-primary-hover`)
- Produces: `tests/ui-overlay-guards.test.ts` พร้อม helper `readSourceFiles(root: string): Array<{ path: string; source: string }>` (path ใช้ `/` เสมอ) ให้ Task 6 และ 16 เพิ่ม test ในไฟล์เดียวกัน

- [ ] **Step 1: เขียน guard test ที่ล้ม — `tests/ui-overlay-guards.test.ts`**

```ts
import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

export function readSourceFiles(root: string): Array<{ path: string; source: string }> {
  const files: Array<{ path: string; source: string }> = []
  for (const entry of readdirSync(root)) {
    const path = join(root, entry)
    if (statSync(path).isDirectory()) files.push(...readSourceFiles(path))
    else if (/\.(ts|tsx)$/.test(entry)) {
      files.push({ path: path.replace(/\\/g, "/"), source: readFileSync(path, "utf8").replace(/\r\n/g, "\n") })
    }
  }
  return files
}

const sources = readSourceFiles("src")

function findMatches(pattern: RegExp, allow: (path: string) => boolean = () => false) {
  return sources
    .filter((file) => !allow(file.path))
    .flatMap((file) => [...file.source.matchAll(pattern)].map((match) => `${file.path}: ${match[0]}`))
}

test("status tints use soft tokens instead of opacity", () => {
  assert.deepEqual(findMatches(/\bbg-(?:success|warning|danger|info)\/\d+\b/g), [])
  assert.deepEqual(findMatches(/\bbg-primary\/(?:5|10|15|20)\b/g), [])
})

test("solid fills darken on hover instead of fading", () => {
  assert.deepEqual(findMatches(/\bbg-(?:primary|success|warning|danger|info)\/90\b/g), [])
})

test("status foreground tokens only appear inside shared ui components", () => {
  assert.deepEqual(
    findMatches(/\btext-(?:success|warning|danger|info)-foreground\b/g, (path) => path.startsWith("src/components/ui/")),
    [],
  )
})

test("primary text is never faded below AA", () => {
  assert.deepEqual(findMatches(/\btext-primary\/\d+\b/g), [])
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/ui-overlay-guards.test.ts`
Expected: FAIL ทั้ง 4 test พร้อมรายการไฟล์ยาว

- [ ] **Step 3: รัน codemod (สคริปต์ครั้งเดียว ไม่ commit)**

```bash
node - <<'EOF'
const fs = require("node:fs")
const path = require("node:path")
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else if (/\.(ts|tsx)$/.test(entry.name)) out.push(full)
  }
  return out
}
const rules = [
  [/\bbg-(success|warning|danger|info)\/(5|10|15|20)\b/g, "bg-$1-soft"],
  [/\bbg-primary\/(5|10|15)\b/g, "bg-primary-soft"],
  [/\bbg-(primary|success|warning|danger|info)\/90\b/g, "bg-$1-hover"],
  [/\btext-(success|warning|danger|info)-foreground\b/g, "text-$1"],
]
let changed = 0
for (const file of walk("src")) {
  const before = fs.readFileSync(file, "utf8")
  let after = before
  for (const [pattern, replacement] of rules) after = after.replace(pattern, replacement)
  if (after !== before) {
    fs.writeFileSync(file, after)
    changed += 1
  }
}
console.log(`changed ${changed} files`)
EOF
```

Expected: `changed N files` (N ราว 100–130)

- [ ] **Step 4: แก้ `text-primary/NN` 3 จุดด้วยมือ**

- `src/app/[locale]/(dashboard)/assets/page.tsx:812` `text-xs text-primary/70` → `text-xs text-primary`
- `src/app/[locale]/(dashboard)/assets/[id]/page.tsx:2050` และ `:2057` `text-primary/60` → `text-primary`

- [ ] **Step 5: ตรวจคลาสสีพาเลตที่ใส่ตรง (ไม่ใช้ token)**

```bash
grep -rnoE "[a-z:-]*(text|bg|border)-(red|green|amber|yellow|blue|slate|gray|emerald|orange|rose|sky|indigo)-[0-9]{2,3}(/[0-9]+)?" src --include=*.tsx | sort | uniq
```

ทุกคลาส `text-*` ในรายการต้องผ่าน 4.5:1 กับพื้นของ element เดียวกัน (คำนวณด้วย `contrastRatio` จาก `src/lib/color-contrast.ts` ผ่าน `node -e`) · ผลที่ตรวจไว้ตอนเขียน plan: ทุกคู่ผ่าน (`text-amber-700` บน `bg-amber-100` 4.59 · `text-slate-500` บนขาว 4.76 · คลาส `-800/-900/-950` บนพื้น `-50/-100`) ยกเว้น `text-red-600/10` ใน `src/components/asset-operations/operation-document-print.tsx:97` ซึ่งเป็นลายน้ำ `aria-hidden` ตอนพิมพ์ (ตกแต่ง ไม่นับ) · ถ้าเจอคู่ไม่ผ่าน ให้เปลี่ยนเป็น token ที่ผ่าน (`text-{tone}` บน `bg-{tone}-soft`) และบอกในรายงาน

- [ ] **Step 6: แก้ test เดิมที่ตรึงคลาสเก่า**

- `tests/modern-enterprise-theme.test.ts` บรรทัดใน test `"semantic badge foreground tokens…"`: `bg-${tone}\\/10 text-${tone}-foreground` → `bg-${tone}-soft text-${tone}` และเปลี่ยนชื่อ test เป็น `"semantic soft tokens are exposed to Tailwind and used by the register"`
- `tests/maintenance-contrast.test.ts`: แทน 4 บรรทัด assert ด้วย

```ts
  assert.doesNotMatch(source, /text-(?:warning|success)-foreground/)
  assert.match(source, /text-warning\b/)
  assert.match(source, /text-success\b/)
```

  และเปลี่ยนชื่อ test เป็น `"maintenance warning and success copy uses AA status ink"`
- `tests/asset-register-ux.test.ts:252`: `bg-primary\/5` → `bg-primary-soft`
- `tests/audit-scan-field-mode-ux.test.ts:204`: `bg-warning\/10` → `bg-warning-soft` · `:381`: `bg-primary\/5` → `bg-primary-soft`
- `tests/master-data-brand-supplier-ui.test.ts:40,44`: `hover:bg-primary\/10` → `hover:bg-primary-soft`
- `tests/visual-consistency-ui.test.ts:27-30` (ตรวจ `status-pill.tsx`): เปลี่ยนเป็น `bg-${tone}-soft text-${tone}` ตามที่ codemod ทำกับไฟล์นั้น — Task 4 จะลบไฟล์และ test นี้ทีหลัง

- [ ] **Step 7: รัน test ทั้งหมด + type + lint**

```bash
node --test tests/ui-overlay-guards.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS ทั้งหมด · ถ้า test อื่นล้มเพราะตรึงคลาสเก่า ให้แก้ regex ให้ตรงคลาสใหม่ตามกฎ codemod เดียวกัน (ห้ามลบ assertion) และระบุไฟล์ในรายงาน

- [ ] **Step 8: Commit**

```bash
git add -A src tests
git commit -m "refactor(ui): soft and hover status tokens replace opacity tints

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(ก่อน `git add -A` ให้ `git status --short` ตรวจว่าไม่มีไฟล์นอก `src/` `tests/` ปนมา — ไฟล์ untracked ของเครื่องมือ เช่น `.codex/`, `.superpowers/` ห้าม add)

---

### Task 3: Button

**Files:**
- Create: `src/components/ui/button-variants.ts`, `src/components/ui/button.tsx` (จาก CLI แล้วแก้)
- Modify: `src/lib/design-system.ts:1-90` (`getActionButtonClasses`), `src/components/ui/action-button.tsx`, `tests/design-system.test.ts`

**Interfaces:**
- Produces: `buttonVariants(options?: { variant?: "default" | "destructive" | "warning" | "outline" | "secondary" | "ghost" | "link"; size?: "default" | "sm" | "lg" | "icon" | "icon-sm" }) => string` · `type ButtonVariantProps` · `Button` (props ของ `<button>` + `variant`, `size`, `asChild`) · `getActionButtonClasses(variant: UiButtonVariant = "secondary", size: UiButtonSize = "md"): string` (ลายเซ็นเดิม)

- [ ] **Step 1: เขียน test ที่ล้มใน `tests/design-system.test.ts`**

เพิ่มท้ายไฟล์:

```ts
import { buttonVariants } from "../src/components/ui/button-variants.ts"

test("button variants keep 44px mobile touch targets and AA hover fills", () => {
  const primary = buttonVariants({ variant: "default" })
  assert.match(primary, /bg-primary text-primary-foreground/)
  assert.match(primary, /hover:bg-primary-hover/)
  assert.match(primary, /min-h-11/)
  assert.match(primary, /sm:h-10 sm:min-h-0/)
  assert.match(buttonVariants({ variant: "destructive" }), /bg-destructive text-destructive-foreground hover:bg-danger-hover/)
  assert.match(buttonVariants({ variant: "warning" }), /bg-warning text-warning-foreground hover:bg-warning-hover/)
  assert.match(buttonVariants({ variant: "outline" }), /border border-border bg-surface/)
  assert.match(buttonVariants({ size: "sm" }), /min-h-11 px-3 text-xs sm:h-8 sm:min-h-0/)
  assert.match(buttonVariants({ size: "icon" }), /min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0/)
  assert.doesNotMatch(`${primary} ${buttonVariants({ variant: "destructive" })}`, /dark:/)
})

test("legacy action button classes map onto shadcn variants", () => {
  assert.equal(getActionButtonClasses("primary", "md"), buttonVariants({ variant: "default", size: "default" }))
  assert.equal(getActionButtonClasses("secondary", "sm"), buttonVariants({ variant: "outline", size: "sm" }))
  assert.equal(getActionButtonClasses("danger"), buttonVariants({ variant: "destructive", size: "default" }))
  assert.equal(getActionButtonClasses("ghost"), buttonVariants({ variant: "ghost", size: "default" }))
})
```

(ให้ย้าย `import { buttonVariants } …` ไปรวมกับ import อื่นด้านบนไฟล์)

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/design-system.test.ts`
Expected: FAIL — `Cannot find module '../src/components/ui/button-variants.ts'`

- [ ] **Step 3: สร้าง `src/components/ui/button-variants.ts`**

```ts
import { cva, type VariantProps } from "class-variance-authority"

export const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary-hover",
        destructive: "bg-destructive text-destructive-foreground hover:bg-danger-hover",
        warning: "bg-warning text-warning-foreground hover:bg-warning-hover",
        outline: "border border-border bg-surface text-foreground hover:bg-accent",
        secondary: "bg-secondary text-secondary-foreground hover:bg-accent",
        ghost: "text-foreground hover:bg-accent",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "min-h-11 px-4 text-sm sm:h-10 sm:min-h-0",
        sm: "min-h-11 px-3 text-xs sm:h-8 sm:min-h-0",
        lg: "min-h-11 px-6 text-sm sm:h-11",
        icon: "min-h-11 min-w-11 sm:size-10 sm:min-h-0 sm:min-w-0",
        "icon-sm": "min-h-11 min-w-11 sm:size-8 sm:min-h-0 sm:min-w-0",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
```

- [ ] **Step 4: เพิ่ม Button ด้วย CLI แล้วแก้ให้ใช้ไฟล์ด้านบน**

```bash
npx shadcn@latest add button --yes
git diff --stat
```

ถ้า `src/app/globals.css` เปลี่ยน → `git checkout -- src/app/globals.css` · จากนั้นเขียนทับ `src/components/ui/button.tsx` เป็น:

```tsx
import * as React from "react"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"
import { buttonVariants, type ButtonVariantProps } from "@/components/ui/button-variants"

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  type,
  ...props
}: React.ComponentProps<"button"> & ButtonVariantProps & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button"

  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      type={asChild ? type : (type ?? "button")}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
}

export { Button, buttonVariants }
```

- [ ] **Step 5: `getActionButtonClasses` ใช้ `buttonVariants`**

ใน `src/lib/design-system.ts` เพิ่ม import บนสุด `import { buttonVariants } from "../components/ui/button-variants.ts"` แล้วแทนฟังก์ชัน `getActionButtonClasses` ทั้งฟังก์ชันด้วย:

```ts
const legacyButtonVariant = {
  primary: "default",
  secondary: "outline",
  danger: "destructive",
  ghost: "ghost",
} as const

const legacyButtonSize = {
  md: "default",
  sm: "sm",
} as const

export function getActionButtonClasses(variant: UiButtonVariant = "secondary", size: UiButtonSize = "md") {
  return buttonVariants({ variant: legacyButtonVariant[variant], size: legacyButtonSize[size] })
}
```

- [ ] **Step 6: `ActionButton` ใช้ `Button`**

แทนเนื้อ `src/components/ui/action-button.tsx`:

```tsx
import type React from "react"
import { Button } from "@/components/ui/button"
import type { UiButtonSize, UiButtonVariant } from "@/lib/design-system"

type ActionButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: UiButtonVariant
  size?: UiButtonSize
}

const variantMap = { primary: "default", secondary: "outline", danger: "destructive", ghost: "ghost" } as const
const sizeMap = { md: "default", sm: "sm" } as const

export function ActionButton({ variant = "secondary", size = "md", type = "button", ...props }: ActionButtonProps) {
  return <Button type={type} variant={variantMap[variant]} size={sizeMap[size]} {...props} />
}
```

- [ ] **Step 7: รัน test + type + lint**

```bash
node --test tests/design-system.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS · test เดิม `getActionButtonClasses("secondary", "sm")` ที่ตรวจ `/h-8/` ยังผ่าน (`sm:h-8`)

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/button-variants.ts src/components/ui/button.tsx src/components/ui/action-button.tsx src/lib/design-system.ts tests/design-system.test.ts package.json package-lock.json
git commit -m "feat(ui): shadcn Button behind the existing action button helpers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(ถ้า CLI ไม่ได้แก้ `package.json`/lockfile ก็ไม่ต้อง add สองไฟล์นั้น)

---

### Task 4: ป้ายสถานะตัวเดียวแบบ C

**Files:**
- Create: `src/components/ui/badge-variants.ts`, `src/components/ui/badge.tsx` (CLI แล้วแก้), `src/lib/status-tone.ts`, `tests/status-badge.test.ts`
- Modify: `src/components/ui/status-badge.tsx`, `src/app/[locale]/(dashboard)/my-assets/page.tsx`, `src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx`, `src/app/[locale]/(dashboard)/assets/[id]/page.tsx`, `tests/visual-consistency-ui.test.ts`
- Delete: `src/components/ui/status-pill.tsx`

**Interfaces:**
- Produces: `src/lib/status-tone.ts`: `type StatusTone = "neutral" | "muted" | "primary" | "info" | "success" | "warning" | "danger"`, `getStatusTone(status: string | null | undefined): StatusTone` (ย้ายมาจาก `status-badge.tsx` ตารางเดิมทุกค่า), `getStatusDotColor(color: string | null | undefined): string | undefined` · `badge-variants.ts`: `badgeVariants`, `statusBadgeVariants({ tone, size })`, `statusDotVariants({ tone })` · `StatusBadge({ label, status?, tone?, size?: "xs" | "sm", color?, className? })`

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/status-badge.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getStatusDotColor, getStatusTone } from "../src/lib/status-tone.ts"
import { statusBadgeVariants, statusDotVariants } from "../src/components/ui/badge-variants.ts"

test("status tones keep the existing workflow mapping", () => {
  assert.equal(getStatusTone("closed"), "success")
  assert.equal(getStatusTone("in_progress"), "warning")
  assert.equal(getStatusTone("cancelled"), "danger")
  assert.equal(getStatusTone("open"), "info")
  assert.equal(getStatusTone("approved"), "primary")
  assert.equal(getStatusTone("unknown_status"), "muted")
  assert.equal(getStatusTone(null), "muted")
})

test("status badge style C: soft background, status border, AA ink", () => {
  assert.match(statusBadgeVariants({ tone: "warning", size: "xs" }), /border-warning-border bg-warning-soft text-warning/)
  assert.match(statusBadgeVariants({ tone: "success" }), /border-success-border bg-success-soft text-success/)
  assert.match(statusBadgeVariants({ tone: "neutral" }), /bg-muted text-foreground/)
  assert.match(statusDotVariants({ tone: "danger" }), /bg-danger/)
})

test("custom DB colors only ever reach the dot, and only when they are safe hex colors", () => {
  assert.equal(getStatusDotColor("#16A34A"), "#16A34A")
  assert.equal(getStatusDotColor("#abc"), "#abc")
  for (const value of [null, undefined, "", "red", "#12", "#1234567", "url(x)", "#16A34A; color: red"]) {
    assert.equal(getStatusDotColor(value), undefined, String(value))
  }
})

test("StatusBadge applies custom color to the dot only", () => {
  const source = readFileSync("src/components/ui/status-badge.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /style=\{dotColor \? \{ backgroundColor: dotColor \} : undefined\}/)
  assert.doesNotMatch(source, /color: dotColor|style=\{\{ color/)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/status-badge.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/status-tone.ts'`

- [ ] **Step 3: สร้าง `src/lib/status-tone.ts`**

ย้าย `statusToneMap` และ `getStatusTone` จาก `src/components/ui/status-badge.tsx` มาทั้งตาราง (ค่าเดิมทุกตัว) แล้วเพิ่ม:

```ts
export type StatusTone = "neutral" | "muted" | "primary" | "info" | "success" | "warning" | "danger"

const statusToneMap: Record<string, StatusTone> = {
  // คัดลอกทุก key/value จาก status-badge.tsx เดิม (active … primary)
}

export function getStatusTone(status: string | null | undefined): StatusTone {
  if (!status) return "muted"
  return statusToneMap[status] ?? "muted"
}

export function getStatusDotColor(color: string | null | undefined) {
  if (typeof color !== "string") return undefined
  const value = color.trim()
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i.test(value) ? value : undefined
}
```

(คอมเมนต์ `// คัดลอก…` ให้แทนด้วยตารางจริง ห้ามเหลือคอมเมนต์นี้ในโค้ด)

- [ ] **Step 4: สร้าง `src/components/ui/badge-variants.ts`**

```ts
import { cva } from "class-variance-authority"

export const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center justify-center gap-1 overflow-hidden rounded-md border px-2 py-0.5 text-xs font-medium whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-transparent bg-primary text-primary-foreground",
        secondary: "border-transparent bg-secondary text-secondary-foreground",
        destructive: "border-transparent bg-destructive text-destructive-foreground",
        outline: "border-border text-foreground",
      },
    },
    defaultVariants: { variant: "default" },
  },
)

export const statusBadgeVariants = cva(
  "inline-flex w-fit max-w-full shrink-0 items-center gap-1.5 rounded-md border font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        success: "border-success-border bg-success-soft text-success",
        warning: "border-warning-border bg-warning-soft text-warning",
        danger: "border-danger-border bg-danger-soft text-danger",
        info: "border-info-border bg-info-soft text-info",
        primary: "border-info-border bg-primary-soft text-primary",
        neutral: "border-border bg-muted text-foreground",
        muted: "border-border bg-muted text-muted-foreground",
      },
      size: {
        xs: "px-2 py-0.5 text-xs",
        sm: "px-2.5 py-1 text-sm",
      },
    },
    defaultVariants: { tone: "muted", size: "sm" },
  },
)

export const statusDotVariants = cva("size-1.5 shrink-0 rounded-full", {
  variants: {
    tone: {
      success: "bg-success",
      warning: "bg-warning",
      danger: "bg-danger",
      info: "bg-info",
      primary: "bg-primary",
      neutral: "bg-muted-foreground",
      muted: "bg-muted-foreground",
    },
  },
  defaultVariants: { tone: "muted" },
})
```

- [ ] **Step 5: Badge จาก CLI แล้วชี้ไป `badge-variants.ts`**

```bash
npx shadcn@latest add badge --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน) แล้วเขียนทับ `src/components/ui/badge.tsx`:

```tsx
import * as React from "react"
import type { VariantProps } from "class-variance-authority"
import { Slot } from "radix-ui"
import { cn } from "@/lib/utils"
import { badgeVariants } from "@/components/ui/badge-variants"

function Badge({
  className,
  variant = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span"
  return <Comp data-slot="badge" data-variant={variant} className={cn(badgeVariants({ variant }), className)} {...props} />
}

export { Badge, badgeVariants }
```

- [ ] **Step 6: เขียน `src/components/ui/status-badge.tsx` ใหม่**

```tsx
import { cn } from "@/lib/utils"
import { getStatusDotColor, getStatusTone, type StatusTone } from "@/lib/status-tone"
import { statusBadgeVariants, statusDotVariants } from "@/components/ui/badge-variants"

export { getStatusTone, type StatusTone } from "@/lib/status-tone"

const knownTones = new Set<StatusTone>(["neutral", "muted", "primary", "info", "success", "warning", "danger"])

export function StatusBadge({
  label,
  status,
  tone,
  size = "sm",
  color,
  className,
}: {
  label: string
  status?: string | null
  tone?: StatusTone | string
  size?: "xs" | "sm"
  color?: string | null
  className?: string
}) {
  const resolvedTone: StatusTone =
    tone && knownTones.has(tone as StatusTone) ? (tone as StatusTone) : getStatusTone(status)
  const dotColor = getStatusDotColor(color)

  return (
    <span data-slot="status-badge" className={cn(statusBadgeVariants({ tone: resolvedTone, size }), className)}>
      <span
        aria-hidden="true"
        className={statusDotVariants({ tone: resolvedTone })}
        style={dotColor ? { backgroundColor: dotColor } : undefined}
      />
      <span className="min-w-0 truncate">{label}</span>
    </span>
  )
}
```

- [ ] **Step 7: ย้ายผู้ใช้ `StatusPill` 3 ไฟล์ แล้วลบไฟล์**

ใน `my-assets/page.tsx`, `my-assets/[id]/page.tsx`, `assets/[id]/page.tsx`: เปลี่ยน `import { StatusPill } from "@/components/ui/status-pill"` เป็น `import { StatusBadge } from "@/components/ui/status-badge"` และทุก `<StatusPill label={…} color={…} tone={…} className={…} />` เป็น `<StatusBadge size="xs" label={…} color={…} tone={…} className={…} />` (ส่ง prop เดิมครบ · `StatusPill` ที่ไม่มี `tone` และไม่มี `color` เดิมเป็น `neutral` → ใส่ `tone="neutral"`) · ถ้าไฟล์ใช้ type `StatusPillTone` ให้เปลี่ยนเป็น `StatusTone` จาก `@/lib/status-tone` · จากนั้น `git rm src/components/ui/status-pill.tsx`

- [ ] **Step 8: แก้ `tests/visual-consistency-ui.test.ts`**

test `"shared status pill owns semantic tones…"` แทนทั้งตัวด้วย:

```ts
test("one shared status badge replaces the old status pill", () => {
  const assetDetail = readSource("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  const myAssets = readSource("src/app/[locale]/(dashboard)/my-assets/page.tsx")
  const myAssetDetail = readSource("src/app/[locale]/(dashboard)/my-assets/[id]/page.tsx")

  for (const source of [assetDetail, myAssets, myAssetDetail]) {
    assert.match(source, /import \{ StatusBadge \} from "@\/components\/ui\/status-badge"/)
    assert.doesNotMatch(source, /status-pill|function StatusPill|function StatusBadge/)
  }
})
```

และเพิ่มใน `tests/ui-overlay-guards.test.ts`:

```ts
test("nothing imports the removed status pill", () => {
  assert.deepEqual(findMatches(/components\/ui\/status-pill/g), [])
})
```

- [ ] **Step 9: รัน test + type + lint**

```bash
node --test tests/status-badge.test.ts tests/visual-consistency-ui.test.ts tests/ui-overlay-guards.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 10: Commit**

```bash
git add src/lib/status-tone.ts src/components/ui/badge-variants.ts src/components/ui/badge.tsx src/components/ui/status-badge.tsx "src/app/[locale]/(dashboard)/my-assets" "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" tests/status-badge.test.ts tests/visual-consistency-ui.test.ts tests/ui-overlay-guards.test.ts
git commit -m "feat(ui): one status badge with dot, soft fill and AA ink

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git rm` ใน Step 7 stage การลบไว้แล้ว)

---

### Task 5: Dialog + คอมโพเนนต์ dialog กลาง 3 ตัว

**Files:**
- Create: `src/components/ui/dialog.tsx` (CLI แล้วแก้)
- Modify: `src/components/ui/accessible-dialog.tsx` (เขียนใหม่), `src/components/ui/confirm-text-dialog.tsx` (เขียนใหม่), `src/components/ui/operation-review-dialog.tsx` (เขียนใหม่)
- Modify tests: `tests/accessible-dialog.test.ts`, `tests/confirm-text-dialog-ui.test.ts:5-15`, `tests/asset-operation-confirmation-ui.test.ts:25-34`

**Interfaces:**
- Consumes: `Button` (Task 3)
- Produces:
  - `DialogContent` รับ prop เพิ่ม `closeLabel?: string` (ค่าเริ่ม `"Close"`) และ `closeDisabled?: boolean`
  - `type AccessibleDialogSize = "sm" | "md" | "lg" | "xl"` (`sm`=`sm:max-w-lg` · `md`=`sm:max-w-2xl` ค่าเริ่ม · `lg`=`sm:max-w-4xl` · `xl`=`sm:max-w-5xl`)
  - `AccessibleDialog({ open, title, description?, busy?, initialFocusRef?, returnFocusRef?, size?, closeLabel?, onClose, children })` — `initialFocusRef`/`returnFocusRef`: `RefObject<HTMLElement | null>`
  - `ConfirmTextDialog`, `OperationReviewDialog` props เดิมทุกตัว

- [ ] **Step 1: เขียน test ใหม่ (ล้ม) — แทนเนื้อ `tests/accessible-dialog.test.ts` ทั้งไฟล์**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("accessible dialog is a Radix dialog that cannot be dismissed while busy", () => {
  const source = read("src/components/ui/accessible-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/dialog"/)
  assert.match(source, /if \(!nextOpen && !busy\) onClose\(\)/)
  assert.match(source, /onEscapeKeyDown=\{\(event\) => \{\s*if \(busy\) event\.preventDefault\(\)/)
  assert.match(source, /onInteractOutside=\{\(event\) => \{\s*if \(busy\) event\.preventDefault\(\)/)
  assert.match(source, /closeDisabled=\{busy\}/)
  assert.doesNotMatch(source, /document\.addEventListener|role="dialog"|fixed inset-0|event\.key === "Tab"/)
})

test("accessible dialog keeps caller focus targets", () => {
  const source = read("src/components/ui/accessible-dialog.tsx")
  assert.match(source, /onOpenAutoFocus=\{\(event\) => \{[\s\S]*initialFocusRef\?\.current[\s\S]*event\.preventDefault\(\)/)
  assert.match(source, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*returnFocusRef\?\.current[\s\S]*isConnected[\s\S]*event\.preventDefault\(\)/)
})

test("dialog close button is labelled, disable-able and touch sized", () => {
  const source = read("src/components/ui/dialog.tsx")
  assert.match(source, /closeLabel = "Close"/)
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /disabled=\{closeDisabled\}/)
  assert.match(source, /min-h-11 min-w-11/)
  assert.doesNotMatch(source, /dark:/)
})
```

แทน test แรกของ `tests/confirm-text-dialog-ui.test.ts` (`"shared confirmation dialog manages focus…"` บรรทัด 5-15) ด้วย:

```ts
test("shared confirmation dialog is built on the accessible dialog", () => {
  const dialogPath = "src/components/ui/confirm-text-dialog.tsx"
  assert.ok(existsSync(dialogPath), "shared confirmation dialog should exist")
  const source = readFileSync(dialogPath, "utf8")
  assert.match(source, /<AccessibleDialog/)
  assert.match(source, /initialFocusRef=\{inputRef\}/)
  assert.match(source, /busy=\{busy\}/)
  assert.doesNotMatch(source, /onKeyDown=|restoreFocusRef|role="dialog"/)
})
```

(test ที่สองของไฟล์นั้นที่ตรวจ `asset-component-manager.tsx` คงไว้ก่อน — Task 10 แก้)

แทน test `"operation review dialog is focus-managed and mobile-safe"` ใน `tests/asset-operation-confirmation-ui.test.ts` ด้วย:

```ts
test("operation review dialog is focus-managed and mobile-safe", () => {
  const dialogPath = "src/components/ui/operation-review-dialog.tsx"
  assert.ok(existsSync(dialogPath))
  const source = readFileSync(dialogPath, "utf8")
  assert.match(source, /<AccessibleDialog/)
  assert.match(source, /initialFocusRef=\{confirmButtonRef\}/)
  assert.match(source, /<Button/)
  assert.doesNotMatch(source, /onKeyDown=|restoreFocusRef|role="dialog"/)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/accessible-dialog.test.ts tests/confirm-text-dialog-ui.test.ts tests/asset-operation-confirmation-ui.test.ts`
Expected: FAIL — `dialog.tsx` ยังไม่มี และซอร์สเดิมยังมี `role="dialog"`

- [ ] **Step 3: เพิ่ม Dialog ด้วย CLI แล้วแก้ `DialogContent`**

```bash
npx shadcn@latest add dialog --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน · ถ้า CLI ถามทับ `button.tsx` ให้ตอบ No) แล้วใน `src/components/ui/dialog.tsx` แทนฟังก์ชัน `DialogContent` ทั้งฟังก์ชันด้วย:

```tsx
function DialogContent({
  className,
  children,
  showCloseButton = true,
  closeLabel = "Close",
  closeDisabled = false,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content> & {
  showCloseButton?: boolean
  closeLabel?: string
  closeDisabled?: boolean
}) {
  return (
    <DialogPortal data-slot="dialog-portal">
      <DialogOverlay />
      <DialogPrimitive.Content
        data-slot="dialog-content"
        className={cn(
          "fixed top-[50%] left-[50%] z-50 grid w-full max-w-[calc(100%-2rem)] translate-x-[-50%] translate-y-[-50%] gap-4 rounded-lg border bg-background p-6 shadow-lg duration-200 outline-none data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95 sm:max-w-lg",
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton && (
          <DialogPrimitive.Close
            data-slot="dialog-close"
            disabled={closeDisabled}
            aria-label={closeLabel}
            title={closeLabel}
            className="absolute top-3 right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 sm:size-10 sm:min-h-0 sm:min-w-0"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </DialogPortal>
  )
}
```

ลบคลาส `dark:` ทุกตัวในไฟล์ (ถ้ามี) · `DialogFooter` ที่มีปุ่ม `Close` ภาษาอังกฤษ — คงไว้แต่ไม่ใช้

- [ ] **Step 4: เขียน `src/components/ui/accessible-dialog.tsx` ใหม่**

```tsx
"use client"

import type { ReactNode, RefObject } from "react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export type AccessibleDialogSize = "sm" | "md" | "lg" | "xl"

const sizeClasses: Record<AccessibleDialogSize, string> = {
  sm: "sm:max-w-lg",
  md: "sm:max-w-2xl",
  lg: "sm:max-w-4xl",
  xl: "sm:max-w-5xl",
}

export function AccessibleDialog({
  open,
  title,
  description,
  busy = false,
  initialFocusRef,
  returnFocusRef,
  size = "md",
  closeLabel,
  onClose,
  children,
}: {
  open: boolean
  title: string
  description?: string
  busy?: boolean
  initialFocusRef?: RefObject<HTMLElement | null>
  returnFocusRef?: RefObject<HTMLElement | null>
  size?: AccessibleDialogSize
  closeLabel?: string
  onClose: () => void
  children: ReactNode
}) {
  const tCommon = useTranslations("common")

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !busy) onClose()
      }}
    >
      <DialogContent
        closeLabel={closeLabel ?? tCommon("close")}
        closeDisabled={busy}
        aria-busy={busy || undefined}
        {...(description ? {} : { "aria-describedby": undefined })}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
        onInteractOutside={(event) => {
          if (busy) event.preventDefault()
        }}
        onOpenAutoFocus={(event) => {
          const target = initialFocusRef?.current
          if (!target) return
          event.preventDefault()
          target.focus()
        }}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
        className={cn(
          "top-auto bottom-3 flex max-h-[92dvh] w-[calc(100%-1.5rem)] max-w-none translate-y-0 flex-col gap-0 overflow-hidden rounded-lg border-border bg-surface p-0 shadow-xl sm:top-[50%] sm:bottom-auto sm:translate-y-[-50%]",
          sizeClasses[size],
        )}
      >
        <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-16 text-left">
          <DialogTitle className="text-base font-semibold text-foreground">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 5: เขียน `src/components/ui/confirm-text-dialog.tsx` ใหม่**

```tsx
"use client"

import { useId, useRef, useState, type FormEvent, type RefObject } from "react"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"

type ConfirmTextDialogTone = "default" | "danger" | "warning"

type ConfirmTextDialogProps = {
  open: boolean
  title: string
  description?: string
  fieldLabel: string
  placeholder?: string
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  defaultValue?: string
  busy?: boolean
  tone?: ConfirmTextDialogTone
  onClose: () => void
  onConfirm: (value: string) => void
}

const confirmVariantByTone = { default: "default", danger: "destructive", warning: "warning" } as const

export function ConfirmTextDialog({ open, title, description, closeLabel, busy = false, onClose, ...formProps }: ConfirmTextDialogProps) {
  const inputRef = useRef<HTMLTextAreaElement | null>(null)

  return (
    <AccessibleDialog
      open={open}
      title={title}
      description={description}
      busy={busy}
      size="sm"
      closeLabel={closeLabel}
      initialFocusRef={inputRef}
      onClose={onClose}
    >
      <ConfirmTextForm {...formProps} busy={busy} inputRef={inputRef} onClose={onClose} />
    </AccessibleDialog>
  )
}

function ConfirmTextForm({
  fieldLabel,
  placeholder,
  confirmLabel,
  cancelLabel,
  defaultValue = "",
  busy,
  tone = "default",
  inputRef,
  onClose,
  onConfirm,
}: Pick<
  ConfirmTextDialogProps,
  "fieldLabel" | "placeholder" | "confirmLabel" | "cancelLabel" | "defaultValue" | "tone" | "onClose" | "onConfirm"
> & { busy: boolean; inputRef: RefObject<HTMLTextAreaElement | null> }) {
  const fieldId = useId()
  const [value, setValue] = useState(defaultValue)

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!busy) onConfirm(value.trim())
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="px-4 py-4">
        <label htmlFor={fieldId} className="text-sm font-medium text-foreground">{fieldLabel}</label>
        <textarea
          ref={inputRef}
          id={fieldId}
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={busy}
          rows={4}
          placeholder={placeholder}
          className="mt-2 min-h-28 w-full resize-y rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-60"
        />
      </div>
      <div className="grid gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button type="submit" variant={confirmVariantByTone[tone]} disabled={busy}>{confirmLabel}</Button>
      </div>
    </form>
  )
}
```

- [ ] **Step 6: เขียน `src/components/ui/operation-review-dialog.tsx` ใหม่**

```tsx
"use client"

import { useRef } from "react"
import type { OperationReviewItem } from "@/lib/asset-operation-review"
import { AccessibleDialog } from "@/components/ui/accessible-dialog"
import { Button } from "@/components/ui/button"

type OperationReviewDialogProps = {
  open: boolean
  title: string
  description: string
  items: OperationReviewItem[]
  confirmLabel: string
  cancelLabel: string
  closeLabel: string
  busy?: boolean
  onClose: () => void
  onConfirm: () => void
}

export function OperationReviewDialog({
  open,
  title,
  description,
  items,
  confirmLabel,
  cancelLabel,
  closeLabel,
  busy = false,
  onClose,
  onConfirm,
}: OperationReviewDialogProps) {
  const confirmButtonRef = useRef<HTMLButtonElement | null>(null)

  return (
    <AccessibleDialog
      open={open}
      title={title}
      description={description}
      busy={busy}
      size="sm"
      closeLabel={closeLabel}
      initialFocusRef={confirmButtonRef}
      onClose={onClose}
    >
      <dl className="divide-y divide-border px-4 py-2">
        {items.map((item) => (
          <div key={item.label} className="grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.4fr)] gap-4 py-3 text-sm">
            <dt className="text-muted-foreground">{item.label}</dt>
            <dd className="break-words text-right font-medium text-foreground">{item.value}</dd>
          </div>
        ))}
      </dl>
      <div className="grid gap-2 border-t border-border bg-muted/20 px-4 py-4 sm:grid-cols-2">
        <Button type="button" variant="outline" onClick={onClose} disabled={busy}>{cancelLabel}</Button>
        <Button ref={confirmButtonRef} type="button" onClick={onConfirm} disabled={busy}>{confirmLabel}</Button>
      </div>
    </AccessibleDialog>
  )
}
```

- [ ] **Step 7: รัน test + type + lint**

```bash
node --test tests/accessible-dialog.test.ts tests/confirm-text-dialog-ui.test.ts tests/asset-operation-confirmation-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS · ผู้ใช้ `AccessibleDialog` เดิม 5 ไฟล์ (`asset-state-review-dialog`, `transaction-cancel-dialog`, `repair-record-actions`, `maintenance-plan-state-actions`, `maintenance-attachments`) compile ได้โดยไม่ต้องแก้

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/dialog.tsx src/components/ui/accessible-dialog.tsx src/components/ui/confirm-text-dialog.tsx src/components/ui/operation-review-dialog.tsx tests/accessible-dialog.test.ts tests/confirm-text-dialog-ui.test.ts tests/asset-operation-confirmation-ui.test.ts
git commit -m "feat(ui): Radix dialog under the shared accessible dialogs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(ถ้า CLI แก้ `package.json`/lockfile ให้ add ด้วย)

---

### Task 6: `ConfirmProvider` + confirm แบบ await 10 จุด

**Files:**
- Create: `src/lib/confirm-queue.ts`, `src/components/ui/alert-dialog.tsx` (CLI), `src/components/ui/confirm-dialog.tsx`, `tests/confirm-queue.test.ts`, `tests/confirm-dialog-ui.test.ts`
- Modify: `src/components/layout/dashboard-shell.tsx` (ห่อ `ConfirmProvider`), `messages/th.json`, `messages/en.json` (`common.deletedSuccess`)
- Modify (เปลี่ยน `window.confirm`): `src/components/admin/IntegrationClientManager.tsx:189,245,250`, `src/components/admin/storage-archive-button.tsx:15`, `src/components/assets/asset-attachments.tsx:126`, `src/components/assets/asset-purchase-documents.tsx:44`, `src/components/audit/audit-round-close-button.tsx:33`, `src/components/disposal/disposal-attachments.tsx:59`, `src/components/master-data/asset-model-form.tsx:189`, `src/components/master-data/master-data-delete-button.tsx:15`
- Modify tests: `tests/integration-api-client-admin.test.ts:144`, `tests/storage-archive-ui.test.ts:57`, `tests/ui-overlay-guards.test.ts`

**Interfaces:**
- Produces:
  - `src/lib/confirm-queue.ts`: `type ConfirmTone = "default" | "destructive"` · `type ConfirmOptions = { title: string; description?: string; confirmLabel?: string; cancelLabel?: string; tone?: ConfirmTone }` · `type ConfirmRequest = ConfirmOptions & { id: number; resolve: (confirmed: boolean) => void }` · `type ConfirmQueue = { current: ConfirmRequest | null; pending: ConfirmRequest[] }` · `emptyConfirmQueue` · `enqueueConfirm(queue, request): ConfirmQueue` · `settleConfirm(queue, id): { queue: ConfirmQueue; settled: ConfirmRequest | null }`
  - `src/components/ui/confirm-dialog.tsx`: `ConfirmProvider({ children })`, `useConfirm(): (options: ConfirmOptions) => Promise<boolean>`
  - i18n `common.deletedSuccess` = `"ลบแล้ว"` / `"Deleted"`

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/confirm-queue.test.ts`**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { emptyConfirmQueue, enqueueConfirm, settleConfirm, type ConfirmRequest } from "../src/lib/confirm-queue.ts"

function request(id: number): ConfirmRequest {
  return { id, title: `confirm ${id}`, resolve: () => {} }
}

test("first request shows immediately, later ones wait in order", () => {
  const first = enqueueConfirm(emptyConfirmQueue, request(1))
  const second = enqueueConfirm(first, request(2))
  const third = enqueueConfirm(second, request(3))
  assert.equal(third.current?.id, 1)
  assert.deepEqual(third.pending.map((item) => item.id), [2, 3])
})

test("settling the shown request promotes the next one", () => {
  const queue = enqueueConfirm(enqueueConfirm(emptyConfirmQueue, request(1)), request(2))
  const { queue: next, settled } = settleConfirm(queue, 1)
  assert.equal(settled?.id, 1)
  assert.equal(next.current?.id, 2)
  assert.deepEqual(next.pending, [])
})

test("a stale or repeated settle never touches the next request", () => {
  const queue = enqueueConfirm(enqueueConfirm(emptyConfirmQueue, request(1)), request(2))
  const { queue: afterFirst } = settleConfirm(queue, 1)
  const repeated = settleConfirm(afterFirst, 1)
  assert.equal(repeated.settled, null)
  assert.equal(repeated.queue, afterFirst)
  assert.equal(repeated.queue.current?.id, 2)
})

test("settling an empty queue is a no-op", () => {
  const result = settleConfirm(emptyConfirmQueue, 1)
  assert.equal(result.settled, null)
  assert.equal(result.queue, emptyConfirmQueue)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/confirm-queue.test.ts`
Expected: FAIL — `Cannot find module '../src/lib/confirm-queue.ts'`

- [ ] **Step 3: สร้าง `src/lib/confirm-queue.ts`**

```ts
export type ConfirmTone = "default" | "destructive"

export type ConfirmOptions = {
  title: string
  description?: string
  confirmLabel?: string
  cancelLabel?: string
  tone?: ConfirmTone
}

export type ConfirmRequest = ConfirmOptions & {
  id: number
  resolve: (confirmed: boolean) => void
}

export type ConfirmQueue = {
  current: ConfirmRequest | null
  pending: ConfirmRequest[]
}

export const emptyConfirmQueue: ConfirmQueue = { current: null, pending: [] }

export function enqueueConfirm(queue: ConfirmQueue, request: ConfirmRequest): ConfirmQueue {
  if (!queue.current) return { current: request, pending: queue.pending }
  return { current: queue.current, pending: [...queue.pending, request] }
}

export function settleConfirm(queue: ConfirmQueue, id: number): { queue: ConfirmQueue; settled: ConfirmRequest | null } {
  if (!queue.current || queue.current.id !== id) return { queue, settled: null }
  const [next = null, ...rest] = queue.pending
  return { queue: { current: next, pending: rest }, settled: queue.current }
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `node --test tests/confirm-queue.test.ts`
Expected: PASS 4 tests

- [ ] **Step 5: เขียน test ซอร์สที่ล้ม — `tests/confirm-dialog-ui.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("confirm provider renders an alert dialog and settles by request id", () => {
  const source = read("src/components/ui/confirm-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/alert-dialog"/)
  assert.match(source, /settleConfirm\(queueRef\.current, id\)/)
  assert.match(source, /<AlertDialogCancel[\s\S]*?event\.preventDefault\(\)[\s\S]*?settle\(current\.id, false\)/)
  assert.match(source, /<AlertDialogAction[\s\S]*?event\.preventDefault\(\)[\s\S]*?settle\(current\.id, true\)/)
  assert.match(source, /variant=\{current\.tone === "destructive" \? "destructive" : "default"\}/)
  assert.match(source, /throw new Error\("useConfirm must be used inside <ConfirmProvider>"\)/)
})

test("dashboard shell mounts one confirm provider", () => {
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /<ConfirmProvider>/)
})

test("deletes report a delete, not a save", () => {
  for (const path of [
    "src/components/master-data/master-data-delete-button.tsx",
    "src/components/assets/asset-attachments.tsx",
    "src/components/assets/asset-purchase-documents.tsx",
    "src/components/disposal/disposal-attachments.tsx",
    "src/components/master-data/asset-model-form.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /tCommon\("deletedSuccess"\)/, path)
    assert.match(source, /tone: "destructive"/, path)
  }
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))
  assert.equal(th.common.deletedSuccess, "ลบแล้ว")
  assert.equal(en.common.deletedSuccess, "Deleted")
})
```

เพิ่มใน `tests/ui-overlay-guards.test.ts` (Task 7 จะลบ allowlist):

```ts
const pendingNavigationGuards = new Set([
  "src/components/disposal/disposal-bulk-approval.tsx",
  "src/components/disposal/disposal-bulk-execution.tsx",
  "src/components/master-data/supplier-form.tsx",
])

test("no browser confirm dialogs", () => {
  assert.deepEqual(findMatches(/window\.confirm\(/g, (path) => pendingNavigationGuards.has(path)), [])
})
```

- [ ] **Step 6: AlertDialog ด้วย CLI**

```bash
npx shadcn@latest add alert-dialog --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน · ตอบ No ถ้าถามทับ `button.tsx`) · ลบคลาส `dark:` ในไฟล์ที่ได้ · ตรวจว่า `AlertDialogAction`/`AlertDialogCancel` import `Button` จาก `@/components/ui/button`

- [ ] **Step 7: สร้าง `src/components/ui/confirm-dialog.tsx`**

```tsx
"use client"

import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from "react"
import { useTranslations } from "next-intl"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  emptyConfirmQueue,
  enqueueConfirm,
  settleConfirm,
  type ConfirmOptions,
  type ConfirmQueue,
} from "@/lib/confirm-queue"

type ConfirmFn = (options: ConfirmOptions) => Promise<boolean>

const ConfirmContext = createContext<ConfirmFn | null>(null)

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const tCommon = useTranslations("common")
  const [queue, setQueue] = useState<ConfirmQueue>(emptyConfirmQueue)
  const queueRef = useRef<ConfirmQueue>(emptyConfirmQueue)
  const nextIdRef = useRef(0)

  const commit = useCallback((next: ConfirmQueue) => {
    queueRef.current = next
    setQueue(next)
  }, [])

  const confirm = useCallback<ConfirmFn>(
    (options) =>
      new Promise<boolean>((resolve) => {
        nextIdRef.current += 1
        commit(enqueueConfirm(queueRef.current, { ...options, id: nextIdRef.current, resolve }))
      }),
    [commit],
  )

  const settle = useCallback(
    (id: number, confirmed: boolean) => {
      const { queue: next, settled } = settleConfirm(queueRef.current, id)
      if (!settled) return
      commit(next)
      settled.resolve(confirmed)
    },
    [commit],
  )

  const current = queue.current

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <AlertDialog
        open={current !== null}
        onOpenChange={(open) => {
          if (!open && current) settle(current.id, false)
        }}
      >
        {current ? (
          <AlertDialogContent key={current.id} {...(current.description ? {} : { "aria-describedby": undefined })}>
            <AlertDialogHeader>
              <AlertDialogTitle>{current.title}</AlertDialogTitle>
              {current.description ? <AlertDialogDescription>{current.description}</AlertDialogDescription> : null}
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel
                onClick={(event) => {
                  event.preventDefault()
                  settle(current.id, false)
                }}
              >
                {current.cancelLabel ?? tCommon("cancel")}
              </AlertDialogCancel>
              <AlertDialogAction
                variant={current.tone === "destructive" ? "destructive" : "default"}
                onClick={(event) => {
                  event.preventDefault()
                  settle(current.id, true)
                }}
              >
                {current.confirmLabel ?? tCommon("confirm")}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        ) : null}
      </AlertDialog>
    </ConfirmContext.Provider>
  )
}

export function useConfirm(): ConfirmFn {
  const confirm = useContext(ConfirmContext)
  if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>")
  return confirm
}
```

- [ ] **Step 8: วาง provider ใน `DashboardShell` และเพิ่ม i18n**

`src/components/layout/dashboard-shell.tsx`: import `{ ConfirmProvider } from "@/components/ui/confirm-dialog"` แล้วห่อ JSX ที่ return ทั้งก้อน: `return (<ConfirmProvider><div ref={shellRef} …>…</div></ConfirmProvider>)` — ห้ามแก้ className ของ div shell

`messages/th.json` ใน `common` เพิ่ม `"deletedSuccess": "ลบแล้ว"` · `messages/en.json` ใน `common` เพิ่ม `"deletedSuccess": "Deleted"` (วางต่อจาก `savedSuccess`)

- [ ] **Step 9: เปลี่ยน `window.confirm` แบบ await 10 จุด**

ทุกไฟล์: `import { useConfirm } from "@/components/ui/confirm-dialog"` แล้ว `const confirm = useConfirm()` ใน component

| ไฟล์ | โค้ดใหม่ |
|---|---|
| `master-data/master-data-delete-button.tsx:15` | `if (!(await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" }))) return` · toast สำเร็จ `tCommon("savedSuccess")` → `tCommon("deletedSuccess")` |
| `assets/asset-attachments.tsx:126` | เหมือนแถวบน · toast ลบสำเร็จ (`:139`) → `tCommon("deletedSuccess")` |
| `assets/asset-purchase-documents.tsx:44` | เหมือนแถวบน · toast (`:54`) → `tCommon("deletedSuccess")` |
| `disposal/disposal-attachments.tsx:59` | เหมือนแถวบน · toast หลังลบในฟังก์ชันเดียวกัน → `tCommon("deletedSuccess")` |
| `master-data/asset-model-form.tsx:189` | เหมือนแถวบน · เปลี่ยนเฉพาะ toast ในฟังก์ชันลบ (toast ตอนบันทึกฟอร์มคง `savedSuccess`) |
| `admin/storage-archive-button.tsx:15` | `if (!(await confirm({ title: t("archiveConfirm", { … }), confirmLabel: <ป้ายปุ่มที่กด> }))) return` (อาร์กิวเมนต์ของ `t(...)` คงเดิม) |
| `audit/audit-round-close-button.tsx:33` | `if (!(await confirm({ title: t("closeConfirm"), confirmLabel: <ป้ายปุ่มที่กด> }))) return` |
| `admin/IntegrationClientManager.tsx:189` | helper ที่เรียก `window.confirm(labels.confirmScopeExpansion)` เปลี่ยนเป็น `async` คืน `Promise<boolean>` ด้วย `confirm({ title: labels.confirmScopeExpansion })` และผู้เรียก (`updateEditingClient` :221) `await` ผล |
| `admin/IntegrationClientManager.tsx:245` | `if (!(await confirm({ title: labels.confirmRotate, confirmLabel: <ป้ายปุ่มหมุนเวียน token>, tone: "destructive" }))) return` |
| `admin/IntegrationClientManager.tsx:250` | เปิดใช้: `confirm({ title: labels.confirmEnable, confirmLabel: <ป้ายปุ่มเปิดใช้> })` · ปิดใช้: `confirm({ title: labels.confirmDisable, confirmLabel: <ป้ายปุ่มปิดใช้>, tone: "destructive" })` |

"<ป้ายปุ่ม…>" = expression ที่ไฟล์นั้นใช้แสดงข้อความบนปุ่มที่ผู้ใช้กดก่อนเปิด confirm (เช่น `labels.rotate` หรือ `t("archive")`) — ถ้าไม่มี ให้ละ `confirmLabel` (ได้ "ยืนยัน")

- [ ] **Step 10: แก้ test ที่ตรึง `window.confirm`**

- `tests/integration-api-client-admin.test.ts:144` `/window\.confirm\(/` → `/await confirm\(\{/`
- `tests/storage-archive-ui.test.ts:57` เปลี่ยน regex ที่ตรวจ `window.confirm(t("archiveConfirm", …))` เป็น `/await confirm\(\{\s*title: t\("archiveConfirm"/`

- [ ] **Step 11: รัน test + type + lint**

```bash
node --test tests/confirm-queue.test.ts tests/confirm-dialog-ui.test.ts tests/ui-overlay-guards.test.ts tests/integration-api-client-admin.test.ts tests/storage-archive-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/lib/confirm-queue.ts src/components/ui/alert-dialog.tsx src/components/ui/confirm-dialog.tsx src/components/layout/dashboard-shell.tsx messages/th.json messages/en.json src/components/admin src/components/assets/asset-attachments.tsx src/components/assets/asset-purchase-documents.tsx src/components/audit/audit-round-close-button.tsx src/components/disposal/disposal-attachments.tsx src/components/master-data tests
git commit -m "feat(ui): in-app confirm dialog replaces window.confirm for actions

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: ตัวกันออกจากหน้า 3 จุดแบบ async

**Files:**
- Create: `src/lib/navigation-guard.ts`, `tests/navigation-guard.test.ts`
- Modify: `src/components/disposal/disposal-bulk-approval.tsx:310-330`, `src/components/disposal/disposal-bulk-execution.tsx:475-505`, `src/components/master-data/supplier-form.tsx:84-87`, `src/components/ui/clickable-table-row.tsx:30-37`
- Modify tests: `tests/ui-overlay-guards.test.ts` (ลบ allowlist) และ test เดิมที่ตรึง `window.confirm(copy.discardSelection)` / `confirmDiscard` ถ้ามี

**Interfaces:**
- Consumes: `useConfirm()` (Task 6)
- Produces: `shouldGuardLinkClick(event: LinkClickLike, anchor: AnchorLike): boolean` · `type LinkClickLike = { button: number; metaKey: boolean; ctrlKey: boolean; shiftKey: boolean; altKey: boolean; defaultPrevented: boolean }` · `type AnchorLike = { target: string; hasAttribute(name: string): boolean; getAttribute(name: string): string | null }` · event `CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT` มี `detail: { href: string }`

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/navigation-guard.test.ts`**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { shouldGuardLinkClick, type AnchorLike, type LinkClickLike } from "../src/lib/navigation-guard.ts"

const click = (overrides: Partial<LinkClickLike> = {}): LinkClickLike => ({
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
  ...overrides,
})

const anchor = (attributes: Record<string, string> = { href: "/th/disposal" }, target = ""): AnchorLike => ({
  target,
  hasAttribute: (name) => name in attributes,
  getAttribute: (name) => attributes[name] ?? null,
})

test("plain left clicks on in-app links are guarded", () => {
  assert.equal(shouldGuardLinkClick(click(), anchor()), true)
})

test("new-tab and modified clicks pass through without asking", () => {
  for (const key of ["metaKey", "ctrlKey", "shiftKey", "altKey"] as const) {
    assert.equal(shouldGuardLinkClick(click({ [key]: true }), anchor()), false, key)
  }
  assert.equal(shouldGuardLinkClick(click({ button: 1 }), anchor()), false)
  assert.equal(shouldGuardLinkClick(click(), anchor({ href: "/x" }, "_blank")), false)
  assert.equal(shouldGuardLinkClick(click(), anchor({ href: "/x", download: "" })), false)
})

test("links that do not leave the page are not guarded", () => {
  assert.equal(shouldGuardLinkClick(click(), anchor({ href: "#section" })), false)
  assert.equal(shouldGuardLinkClick(click(), anchor({})), false)
  assert.equal(shouldGuardLinkClick(click({ defaultPrevented: true }), anchor()), false)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/navigation-guard.test.ts`
Expected: FAIL — module ไม่มี

- [ ] **Step 3: สร้าง `src/lib/navigation-guard.ts`**

```ts
export type LinkClickLike = {
  button: number
  metaKey: boolean
  ctrlKey: boolean
  shiftKey: boolean
  altKey: boolean
  defaultPrevented: boolean
}

export type AnchorLike = {
  target: string
  hasAttribute(name: string): boolean
  getAttribute(name: string): string | null
}

export function shouldGuardLinkClick(event: LinkClickLike, anchor: AnchorLike) {
  if (event.defaultPrevented || event.button !== 0) return false
  if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return false
  if (anchor.target && anchor.target !== "_self") return false
  if (anchor.hasAttribute("download")) return false
  const href = anchor.getAttribute("href")
  return href !== null && href !== "" && !href.startsWith("#")
}
```

- [ ] **Step 4: รัน test ให้ผ่าน**

Run: `node --test tests/navigation-guard.test.ts`
Expected: PASS

- [ ] **Step 5: ลบ allowlist ใน guard test (ล้ม)**

ใน `tests/ui-overlay-guards.test.ts` ลบ `pendingNavigationGuards` และให้ test เป็น:

```ts
test("no browser confirm dialogs", () => {
  assert.deepEqual(findMatches(/window\.confirm\(/g), [])
})

test("navigation guards ask with the in-app confirm and let new-tab clicks through", () => {
  for (const path of [
    "src/components/disposal/disposal-bulk-approval.tsx",
    "src/components/disposal/disposal-bulk-execution.tsx",
    "src/components/master-data/supplier-form.tsx",
  ]) {
    const source = sources.find((file) => file.path === path)?.source ?? ""
    assert.match(source, /shouldGuardLinkClick\(/, path)
    assert.match(source, /confirm\(\{/, path)
  }
})
```

Run: `node --test tests/ui-overlay-guards.test.ts` → FAIL (ยังมี `window.confirm` 3 ไฟล์)

- [ ] **Step 6: ส่ง href ไปกับ event นำทางแถว**

`src/components/ui/clickable-table-row.tsx` ใน `openDetail()`:

```ts
    const beforeNavigateEvent = new CustomEvent<{ href: string }>(CLICKABLE_ROW_BEFORE_NAVIGATE_EVENT, {
      bubbles: true,
      cancelable: true,
      detail: { href },
    })
```

- [ ] **Step 7: `disposal-bulk-approval.tsx` — แทน `confirmDiscard`, `handleClickCapture`, `handleSubmitCapture`**

เพิ่ม import `useConfirm` (`@/components/ui/confirm-dialog`) และ `shouldGuardLinkClick` (`@/lib/navigation-guard`) · ใน `DisposalBulkApprovalProvider` เพิ่ม `const confirm = useConfirm()` และ `const bypassGuardRef = useRef(false)` แล้วแทน 3 ฟังก์ชันเดิมด้วย:

```tsx
  async function discardSelectionThen(proceed: () => void) {
    const confirmed = await confirm({ title: copy.discardSelection, tone: "destructive" })
    if (!confirmed) return
    clear()
    bypassGuardRef.current = true
    try {
      proceed()
    } finally {
      bypassGuardRef.current = false
    }
  }

  function handleClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (bypassGuardRef.current || selected.size === 0) return
    const link = (event.target as HTMLElement | null)?.closest("a")
    if (!link || !shouldGuardLinkClick(event, link)) return
    event.preventDefault()
    event.stopPropagation()
    const href = link.getAttribute("href") ?? ""
    void discardSelectionThen(() => router.push(href))
  }

  function handleSubmitCapture(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement | null
    if (!form) return
    if (form.dataset.disposalBulkDialog) {
      event.preventDefault()
      return
    }
    if (bypassGuardRef.current || selected.size === 0) return
    event.preventDefault()
    event.stopPropagation()
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const submitButton = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : undefined
    void discardSelectionThen(() => form.requestSubmit(submitButton))
  }
```

(ถ้าใน provider ยังไม่มี `router` ให้ `const router = useRouter()` จาก `next/navigation`)

- [ ] **Step 8: `disposal-bulk-execution.tsx` — แทน `confirmDiscard`, `onClickCapture`, `onSubmitCapture`, `onBeforeNavigate`**

เพิ่ม import เดียวกับ Step 7 · `const confirm = useConfirm()`, `const bypassGuardRef = useRef(false)` แล้ว:

```tsx
  async function discardSelectionThen(proceed: () => void) {
    const confirmed = await confirm({ title: copy.discardSelection, tone: "destructive" })
    if (!confirmed) return
    clear()
    bypassGuardRef.current = true
    try {
      proceed()
    } finally {
      bypassGuardRef.current = false
    }
  }

  function hasGuardedSelection() {
    return !bypassGuardRef.current && selection.selectedIds.length > 0
  }

  function onClickCapture(event: MouseEvent<HTMLDivElement>) {
    if (!hasGuardedSelection()) return
    const link = (event.target as HTMLElement | null)?.closest("a")
    if (!link || !shouldGuardLinkClick(event, link)) return
    event.preventDefault()
    event.stopPropagation()
    const href = link.getAttribute("href") ?? ""
    void discardSelectionThen(() => router.push(href))
  }

  function onSubmitCapture(event: FormEvent<HTMLDivElement>) {
    const form = event.target as HTMLFormElement | null
    if (!form || form.dataset.disposalBulkDialog || !hasGuardedSelection()) return
    event.preventDefault()
    event.stopPropagation()
    const submitter = (event.nativeEvent as SubmitEvent).submitter
    const submitButton = submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement ? submitter : undefined
    void discardSelectionThen(() => form.requestSubmit(submitButton))
  }

  function onBeforeNavigate(event: Event) {
    if (!hasGuardedSelection()) return
    event.preventDefault()
    const href = (event as CustomEvent<{ href?: string }>).detail?.href
    if (href) void discardSelectionThen(() => router.push(href))
  }
```

(เดิม `onSubmitCapture` ของไฟล์นี้ไม่ `preventDefault` ฟอร์ม dialog — คงพฤติกรรมนั้น)

- [ ] **Step 9: `supplier-form.tsx` — แทน `confirmNavigation`**

```tsx
  function confirmNavigation(event: React.MouseEvent<HTMLAnchorElement>) {
    if (!isDirty || !shouldGuardLinkClick(event, event.currentTarget)) return
    event.preventDefault()
    const href = event.currentTarget.getAttribute("href")
    if (!href) return
    void confirm({ title: t("unsavedChangesConfirm"), tone: "destructive" }).then((confirmed) => {
      if (confirmed) router.push(href)
    })
  }
```

(เพิ่ม `const confirm = useConfirm()` · ถ้าไม่มี `router` ให้ `useRouter()` · `beforeunload` เดิมคงไว้)

- [ ] **Step 10: แก้ test เดิมที่ตรึงโค้ดเก่า**

`grep -rn "confirmDiscard\|discardSelection\|unsavedChangesConfirm" tests` — assertion ที่ตรวจ `window.confirm(...)` หรือชื่อ `confirmDiscard` ให้เปลี่ยนเป็นตรวจ `discardSelectionThen` / `confirm({ title: copy.discardSelection` / `confirm({ title: t("unsavedChangesConfirm")` ตามไฟล์ (ห้ามลบ assertion ทิ้ง)

- [ ] **Step 11: รัน test + type + lint**

```bash
node --test tests/navigation-guard.test.ts tests/ui-overlay-guards.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 12: Commit**

```bash
git add src/lib/navigation-guard.ts src/components/disposal/disposal-bulk-approval.tsx src/components/disposal/disposal-bulk-execution.tsx src/components/master-data/supplier-form.tsx src/components/ui/clickable-table-row.tsx tests
git commit -m "feat(ui): async leave-page guards with the in-app confirm

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: กล่องโต้ตอบงานจำหน่าย 4 ตัว → `AccessibleDialog`

**Files:**
- Modify: `src/components/disposal/disposal-decision-button.tsx` (`DecisionDialog` :120-260), `src/components/disposal/disposal-execution-button.tsx` (`ExecutionDialog` :161-272), `src/components/disposal/disposal-bulk-approval.tsx` (`DisposalBulkApprovalDialog` :483-588), `src/components/disposal/disposal-bulk-execution.tsx` (`function Dialog` :718-1020)
- Modify tests: `tests/disposal-detail-workspace.test.ts:71-87`, `tests/disposal-bulk-approval.test.ts:71-90`, `tests/disposal-bulk-execution-ui.test.ts:26`

**Interfaces:**
- Consumes: `AccessibleDialog` (Task 5: `open`, `title`, `description`, `busy`, `initialFocusRef`, `returnFocusRef`, `size`, `closeLabel`, `onClose`)

**สูตรย้าย (ทุกไฟล์ใน task นี้):**
1. ลบ `<div className="fixed inset-0 …" onMouseDown={…}>` ชั้นนอก
2. ลบหัวกล่องที่เขียนเอง (`<h2 id={titleId}>`, `<p id={descriptionId}>`, ปุ่ม X) — `AccessibleDialog` แสดงหัว + ปุ่ม X ให้
3. ลบ `role`, `aria-modal`, `aria-labelledby`, `aria-describedby`, `tabIndex={-1}`, `onKeyDown={handleKeyDown}` จาก element ข้างใน · ลบฟังก์ชัน `handleKeyDown`, `restoreFocusRef` และ `useEffect` ที่จัดโฟกัส/rAF · ลบ `titleId`/`descriptionId`/`dialogRef` ถ้าไม่มีที่ใช้แล้ว
4. ห่อด้วย `<AccessibleDialog open title={…} description={…} busy={…} size={…} initialFocusRef={…} returnFocusRef={…} onClose={closeDialog}>` · `<form>` เดิมอยู่ข้างในพร้อม `onSubmit`, `data-*`, `aria-busy` เดิม · เนื้อหาและปุ่มท้ายกล่องคงเดิม
5. ขนาด: `max-w-lg` → `size="sm"` · `max-w-xl`/`max-w-2xl` → `"md"` · `max-w-3xl`/`max-w-4xl` → `"lg"` · `max-w-5xl` ขึ้นไป → `"xl"`
6. ถ้าโค้ดเดิมโฟกัส element เฉพาะตอนเปิด (ใน rAF) ให้ส่ง ref นั้นเป็น `initialFocusRef` · ถ้าเดิมคืนโฟกัสไป `triggerRef` ให้ส่ง `returnFocusRef={triggerRef}`
7. ลบ import ที่ไม่ใช้แล้ว (`X`, `useId`, `KeyboardEvent`)

**ค่าต่อไฟล์:**

| ไฟล์ | `busy` | `title` / `description` | `size` | focus |
|---|---|---|---|---|
| `disposal-decision-button.tsx` | `saving` | ข้อความใน `<h2>`/`<p>` เดิม | ตามข้อ 5 (เดิม `max-w-2xl` → `md`) | `initialFocusRef` = ref ที่ rAF เดิมโฟกัส · `returnFocusRef={triggerRef}` |
| `disposal-execution-button.tsx` | `saving` | `t("executionTitle")` / ข้อความ `<p>` เดิม (มี `disposalNo`) | ตามข้อ 5 จากคลาสเดิม | `initialFocusRef={executionDateRef}` · `returnFocusRef={triggerRef}` |
| `disposal-bulk-approval.tsx` | `busy` | `dialogState === "result" ? copy.resultTitle : copy.previewTitle` / ข้อความ `<p>` เดิม | `xl` | `returnFocusRef={triggerRef}` · ไม่ส่ง `initialFocusRef` · ลบ `closeRef` ถ้าไม่มีที่ใช้ · `data-disposal-bulk-dialog="true"` ต้องอยู่บน `<form>` |
| `disposal-bulk-execution.tsx` | `committing` (ระหว่าง preview ยังปิดได้ — `closeDialog` เดิมยกเลิก preview ให้) | ตาม `<h2>`/`<p>` เดิม | `xl` | `returnFocusRef={triggerRef}` · เปลี่ยนชื่อ `function Dialog` → `function BulkExecutionDialog` (และจุดที่เรียก) · คง `aria-busy={busy}` และ `data-disposal-bulk-dialog` บน `<form>` |

- [ ] **Step 1: เขียน test ใหม่ (ล้ม)**

แทน assertion ใน `tests/disposal-detail-workspace.test.ts:71-87` (ที่ตรวจ `restoreFocusRef`, `requestAnimationFrame`, `Escape`, `event.key !== "Tab"`, `event.target === event.currentTarget`, `if (!saving) onClose()`, `max-h-[92dvh]`) ด้วย:

```ts
  for (const path of [
    "src/components/disposal/disposal-decision-button.tsx",
    "src/components/disposal/disposal-execution-button.tsx",
  ]) {
    const dialogSource = readFileSync(path, "utf8").replace(/\r\n/g, "\n")
    assert.match(dialogSource, /<AccessibleDialog[\s\S]*?busy=\{saving\}/, path)
    assert.match(dialogSource, /returnFocusRef=\{triggerRef\}/, path)
    assert.doesNotMatch(dialogSource, /fixed inset-0|role="dialog"|restoreFocusRef|event\.key === "Tab"|handleKeyDown/, path)
  }
  assert.match(
    readFileSync("src/components/disposal/disposal-execution-button.tsx", "utf8"),
    /initialFocusRef=\{executionDateRef\}/,
  )
```

แทน assertion ใน `tests/disposal-bulk-approval.test.ts:71-90` ด้วย:

```ts
  const dialogSource = readFileSync("src/components/disposal/disposal-bulk-approval.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(dialogSource, /<AccessibleDialog[\s\S]*?busy=\{busy\}/)
  assert.match(dialogSource, /returnFocusRef=\{triggerRef\}/)
  assert.match(dialogSource, /size="xl"/)
  assert.match(dialogSource, /data-disposal-bulk-dialog="true"/)
  assert.doesNotMatch(dialogSource, /fixed inset-0|role="dialog"|restoreFocusRef|tabIndex=\{-1\}/)
```

แทน `tests/disposal-bulk-execution-ui.test.ts:26` (`role="dialog"`, `aria-modal`) ด้วย:

```ts
  assert.match(source, /<AccessibleDialog[\s\S]*?busy=\{committing\}/)
  assert.match(source, /aria-busy=\{busy\}/)
  assert.match(source, /function BulkExecutionDialog/)
  assert.doesNotMatch(source, /fixed inset-0|role="dialog"|restoreFocusRef/)
```

(ถ้าชื่อตัวแปรซอร์สในไฟล์ test ไม่ใช่ `source` ให้ใช้ชื่อที่ไฟล์นั้นมี · import `readFileSync` ถ้ายังไม่มี)

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/disposal-detail-workspace.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-bulk-execution-ui.test.ts`
Expected: FAIL (ยังเป็น markup เดิม)

- [ ] **Step 3: ย้าย 4 ไฟล์ตามสูตรและตาราง**

- [ ] **Step 4: รัน test + type + lint**

```bash
node --test tests/disposal-detail-workspace.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-bulk-execution-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/disposal tests/disposal-detail-workspace.test.ts tests/disposal-bulk-approval.test.ts tests/disposal-bulk-execution-ui.test.ts
git commit -m "refactor(disposal): decision, execution and bulk dialogs on Radix

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: กล่องโต้ตอบงานตรวจนับ → `AccessibleDialog`

**Files:**
- Modify: `src/components/audit/audit-finding-review-actions.tsx` (ลบ `Modal` :491-506 · จุดใช้ :199, :339, :452), `src/components/audit/audit-mark-not-found-button.tsx:92`, `src/components/audit/audit-round-cancel-button.tsx:76`, `src/components/audit/audit-scan-form.tsx:1926`
- Modify tests: `tests/audit-not-found-dialog.test.ts`, `tests/audit-round-cancellation.test.ts:107`, `tests/audit-mobile-flow-completion.test.ts:17`, `tests/ui-overlay-guards.test.ts`

**Interfaces:**
- Consumes: `AccessibleDialog` (Task 5)

**สูตรย้าย (ทุกไฟล์ใน task นี้):**
1. ลบ `<div className="fixed inset-0 …">` ชั้นนอก
2. ลบหัวกล่องที่เขียนเอง (`<h2>`, `<p>` คำอธิบาย, ปุ่ม X) — `AccessibleDialog` แสดงให้
3. ลบ `role`, `aria-modal`, `aria-labelledby`, `aria-describedby` จาก `<form>` · ลบ `titleId`/`descriptionId` ที่ไม่ใช้แล้ว
4. ห่อด้วย `<AccessibleDialog open={…} title={…} description={…} busy={…} size={…} onClose={…}>` · `<form>` เดิมอยู่ข้างใน (คง `onSubmit`) · เนื้อหาและปุ่มท้ายกล่องคงเดิม
5. ขนาด: `max-w-lg` → `"sm"` · `max-w-xl`/`max-w-2xl` → `"md"`
6. `busy` = state ที่ไฟล์ใช้ disable ปุ่มยืนยันตอนส่ง (เช่น `saving`, `submitting`) · ถ้าไม่มี ไม่ต้องส่ง
7. ลบ import ที่ไม่ใช้แล้ว

**ค่าต่อไฟล์:**

| ไฟล์ | `open` | `title` / `description` | `size` | `onClose` |
|---|---|---|---|---|
| `audit-finding-review-actions.tsx` (3 จุดที่ใช้ `Modal`) | เงื่อนไขเดิมที่ render `Modal` | `title` เดิมที่ส่งให้ `Modal` | `md` | `onClose` เดิม · ห่อ children ด้วย `<div className="p-5">` · ลบฟังก์ชัน `Modal` |
| `audit-mark-not-found-button.tsx` | `dialogOpen` | `t("notFoundDialogTitle")` / ข้อความ `<p>` เดิม | `sm` | ฟังก์ชันปิดเดิม |
| `audit-round-cancel-button.tsx` | `dialogOpen` | `t("cancelDialogTitle")` / ข้อความ `<p>` เดิม | `sm` | ฟังก์ชันปิดเดิม |
| `audit-scan-form.tsx` | `componentMissingDraft !== null` | `t("componentMissingDialogTitle")` / `t("componentMissingDialogDescription", { asset: … })` เดิม | `sm` | ฟังก์ชันที่ตั้ง `componentMissingDraft` เป็น `null` เดิม · render `<form>` เฉพาะเมื่อมี draft (`{componentMissingDraft ? <form>…</form> : null}`) |

- [ ] **Step 1: แก้ test ให้ตรวจโครงสร้างใหม่ (ล้ม)**

ใน `tests/audit-not-found-dialog.test.ts` และ `tests/audit-round-cancellation.test.ts:107` เปลี่ยน assertion `role="dialog"` / `aria-modal` เป็น:

```ts
  assert.match(source, /<AccessibleDialog/)
  assert.doesNotMatch(source, /fixed inset-0|role="dialog"/)
```

ใน `tests/audit-mobile-flow-completion.test.ts:17` เปลี่ยน `role="dialog"` เป็น `/<AccessibleDialog[\s\S]*?open=\{componentMissingDraft !== null\}/` (assertion บรรทัด 9 ที่ตรวจ state `componentMissingDraft` คงไว้)

เพิ่มใน `tests/ui-overlay-guards.test.ts`:

```ts
test("finding review actions use the shared accessible dialog", () => {
  const source = sources.find((file) => file.path === "src/components/audit/audit-finding-review-actions.tsx")?.source ?? ""
  assert.match(source, /<AccessibleDialog/)
  assert.doesNotMatch(source, /function Modal\(|fixed inset-0/)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/audit-not-found-dialog.test.ts tests/audit-round-cancellation.test.ts tests/audit-mobile-flow-completion.test.ts tests/ui-overlay-guards.test.ts`
Expected: FAIL

- [ ] **Step 3: ย้าย 4 ไฟล์ตามสูตรและตาราง**

- [ ] **Step 4: รัน test + type + lint**

```bash
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/audit tests
git commit -m "refactor(audit): finding, not-found, cancel and missing-component dialogs on Radix

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: กล่องโต้ตอบแอดมิน/ทรัพย์สิน + ภาพ/PDF ตัวอย่าง

**Files:**
- Create: `src/components/ui/attachment-preview-dialog.tsx`, `tests/attachment-preview-dialog-ui.test.ts`
- Modify: `src/components/admin/IntegrationClientManager.tsx:381`, `src/components/admin/system-settings-form.tsx:1344`, `src/components/assets/asset-component-manager.tsx:562`, `src/components/assets/asset-register-table.tsx:853`, `src/components/assets/asset-attachments.tsx` (`PhotoLightbox` :470-525 + effect Escape :64-75 + จุด render :328), `src/components/maintenance/maintenance-attachments.tsx:221-265`
- Modify tests: `tests/confirm-text-dialog-ui.test.ts:17-27` (ส่วน component manager)

**Interfaces:**
- Consumes: `AccessibleDialog` (Task 5), `Dialog`, `DialogContent` (`closeLabel`), `DialogHeader`, `DialogTitle`, `DialogDescription` (Task 5), `buttonVariants` (Task 3)
- Produces: `AttachmentPreviewDialog({ open, onOpenChange, title, subtitle?, kind: "image" | "pdf", src, alt?, downloadHref?, downloadLabel?, closeLabel? })`

**สูตรย้ายกล่องโต้ตอบ (4 ไฟล์แรก):**
1. ลบ `<div className="fixed inset-0 …">` ชั้นนอก และ `onMouseDown` ปิดกล่อง
2. ลบหัวกล่องที่เขียนเอง (`<h2>`/`<h3>`, `<p>` คำอธิบาย, ปุ่ม X)
3. ลบ `role`, `aria-modal`, `aria-label(ledby)` · ลบ rAF/focus effect ที่เขียนเอง
4. ห่อด้วย `<AccessibleDialog …>` · `<form>`/เนื้อหาเดิมอยู่ข้างใน · ปุ่มท้ายกล่องคงเดิม
5. ขนาด: `max-w-lg` → `"sm"` · `max-w-xl`/`max-w-2xl` → `"md"` · `max-w-5xl` → `"xl"`
6. ลบ import ที่ไม่ใช้แล้ว

| ไฟล์ | `open` | `title` / `description` | `busy` | `size` | อื่น ๆ |
|---|---|---|---|---|---|
| `IntegrationClientManager.tsx` | `editingClient !== null` | `labels.editScopes` / `editingClient?.clientId` | state saving ของฟอร์มแก้ scope (ถ้ามี) | `md` | `onClose` = ฟังก์ชันที่ตั้ง `editingClient` เป็น `null` · render `<form onSubmit={updateEditingClient}>` เฉพาะเมื่อมี `editingClient` |
| `system-settings-form.tsx` | `prefixEditor !== null` | `prefixEditor?.previousPrefix ? labels.editPrefix : labels.addPrefix` / `labels.categoryPrefixesDescription` | — | `xl` | `onClose={closePrefixEditor}` · `closeLabel={labels.cancel}` (ปุ่ม X เดิมใช้ป้ายนี้) |
| `asset-component-manager.tsx` | `component !== null` (เดิม `if (!component) return null` — ย้ายเงื่อนไขไปที่ children) | `labels.removeTitle` / `` `${component.componentAsset.assetTag} - ${component.componentAsset.name}` `` | `busy` | `sm` | `initialFocusRef` = ref ของ textarea ที่ rAF เดิมโฟกัส |
| `asset-register-table.tsx` | `bulkUpdateOpen` | `labels.bulkUpdateTitle` / `` `${labels.bulkUpdateDescription} (${selectedAssets.length} ${labels.selectedCount})` `` | state saving ของ bulk update (ถ้ามี) | `md` | `onClose={() => setBulkUpdateOpen(false)}` · `closeLabel={labels.close}` · **ห้ามแตะ** ส่วนอื่นของตาราง (ส่วน B จะทำ) |

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/attachment-preview-dialog-ui.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("attachment preview is a Radix dialog with image and pdf modes", () => {
  const source = read("src/components/ui/attachment-preview-dialog.tsx")
  assert.match(source, /from "@\/components\/ui\/dialog"/)
  assert.match(source, /kind === "image"/)
  assert.match(source, /<iframe/)
  assert.match(source, /downloadHref/)
})

test("both lightboxes use the shared preview dialog", () => {
  for (const path of ["src/components/assets/asset-attachments.tsx", "src/components/maintenance/maintenance-attachments.tsx"]) {
    const source = read(path)
    assert.match(source, /<AttachmentPreviewDialog/, path)
    assert.doesNotMatch(source, /fixed inset-0|function PhotoLightbox|addEventListener\("keydown"/, path)
  }
})

test("admin and asset dialogs use the shared accessible dialog", () => {
  for (const path of [
    "src/components/admin/IntegrationClientManager.tsx",
    "src/components/admin/system-settings-form.tsx",
    "src/components/assets/asset-component-manager.tsx",
    "src/components/assets/asset-register-table.tsx",
  ]) {
    const source = read(path)
    assert.match(source, /<AccessibleDialog/, path)
    assert.doesNotMatch(source, /fixed inset-0|role="dialog"|aria-modal/, path)
  }
})
```

และใน `tests/confirm-text-dialog-ui.test.ts` test ที่สอง เปลี่ยน 2 บรรทัด `assert.match(componentSource, /role="dialog"/)` และ `/aria-modal="true"/` เป็น `assert.match(componentSource, /<AccessibleDialog/)` (คงบรรทัด `FileDropzone` และ `window.prompt`)

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/attachment-preview-dialog-ui.test.ts`
Expected: FAIL — ไฟล์ยังไม่มี

- [ ] **Step 3: สร้าง `src/components/ui/attachment-preview-dialog.tsx`**

```tsx
"use client"

import Image from "next/image"
import { Download } from "lucide-react"
import { useTranslations } from "next-intl"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { buttonVariants } from "@/components/ui/button-variants"

export function AttachmentPreviewDialog({
  open,
  onOpenChange,
  title,
  subtitle,
  kind,
  src,
  alt,
  downloadHref,
  downloadLabel,
  closeLabel,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  subtitle?: string
  kind: "image" | "pdf"
  src: string
  alt?: string
  downloadHref?: string
  downloadLabel?: string
  closeLabel?: string
}) {
  const tCommon = useTranslations("common")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        closeLabel={closeLabel ?? tCommon("close")}
        {...(subtitle ? {} : { "aria-describedby": undefined })}
        className="flex h-[92dvh] w-[calc(100%-1.5rem)] max-w-none flex-col gap-0 overflow-hidden border-border bg-card p-0 sm:max-w-5xl"
      >
        <DialogHeader className="shrink-0 border-b border-border px-4 py-3 pr-16 text-left">
          <DialogTitle className="truncate text-sm font-semibold text-foreground">{title}</DialogTitle>
          {subtitle ? <DialogDescription className="truncate text-xs text-muted-foreground">{subtitle}</DialogDescription> : null}
        </DialogHeader>
        <div className="relative min-h-0 flex-1 bg-black">
          {kind === "image" ? (
            <Image src={src} alt={alt ?? title} fill unoptimized className="object-contain" />
          ) : (
            <iframe src={src} title={title} className="h-full w-full bg-white" />
          )}
        </div>
        {downloadHref && downloadLabel ? (
          <div className="flex shrink-0 justify-end border-t border-border px-4 py-3">
            <a href={downloadHref} className={buttonVariants({ variant: "outline", size: "sm" })}>
              <Download aria-hidden="true" />
              {downloadLabel}
            </a>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
```

- [ ] **Step 4: ใช้ใน `asset-attachments.tsx`**

ลบ `useEffect` ที่ฟัง `keydown` Escape (:64-75) และฟังก์ชัน `PhotoLightbox` ทั้งตัว · แทนจุด render (:328 `{previewPhoto ? (<PhotoLightbox …/>) : null}`) ด้วย:

```tsx
      <AttachmentPreviewDialog
        open={previewPhoto !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewPhoto(null)
        }}
        title={previewPhoto?.title ?? ""}
        subtitle={previewPhoto?.attachment.originalName}
        kind="image"
        src={previewPhoto ? `/api/attachments/${previewPhoto.attachment.id}?inline=1` : ""}
        alt={previewPhoto?.attachment.originalName}
        downloadHref={previewPhoto ? `/api/attachments/${previewPhoto.attachment.id}` : undefined}
        downloadLabel={t("download")}
        closeLabel={tCommon("close")}
      />
```

- [ ] **Step 5: ใช้ใน `maintenance-attachments.tsx`**

แทนบล็อก `{preview ? (<div className="fixed inset-0 …">…</div>) : null}` (:221-265) ด้วย:

```tsx
      <AttachmentPreviewDialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        title={preview ? getMaintenanceAttachmentDisplayName(preview.originalName) : ""}
        subtitle={preview ? `${preview.fileType} · ${formatFileSize(preview.fileSize)}` : undefined}
        kind={preview && isImage(preview) ? "image" : "pdf"}
        src={preview ? `/api/attachments/${preview.id}?inline=1` : ""}
        alt={preview?.originalName}
        downloadHref={preview ? `/api/attachments/${preview.id}` : undefined}
        downloadLabel={t("download")}
        closeLabel={tCommon("close")}
      />
```

(`open={… !== null}` ทำให้เนื้อหา mount เฉพาะตอนมีค่า `src` จึงไม่ว่าง)

- [ ] **Step 6: ย้าย 4 กล่องโต้ตอบตามสูตรและตาราง**

- [ ] **Step 7: รัน test + type + lint**

```bash
node --test tests/attachment-preview-dialog-ui.test.ts tests/confirm-text-dialog-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS · `tests/asset-register-ux.test.ts` ต้องผ่านโดยไม่แก้

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/attachment-preview-dialog.tsx src/components/admin src/components/assets src/components/maintenance/maintenance-attachments.tsx tests
git commit -m "refactor(ui): admin, asset and attachment preview dialogs on Radix

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Sheet — drawer กิจกรรม · drawer หลักฐาน · เมนูมือถือ

**Files:**
- Create: `src/components/ui/sheet.tsx` (CLI แล้วแก้), `tests/sheet-drawers-ui.test.ts`
- Modify: `src/components/ui/activity-drawer.tsx`, `src/components/assets/asset-evidence-drawer.tsx`, `src/components/layout/sidebar.tsx`, `src/components/layout/dashboard-shell.tsx:87-107,172-177`
- Modify tests: `tests/mobile-field-navigation-ui.test.ts:59-82`

**Interfaces:**
- Consumes: `Button` (Task 3)
- Produces:
  - `SheetContent` รับ prop เพิ่ม `closeLabel?: string` (ค่าเริ่ม `"Close"`)
  - `ActivityDrawer` props เดิม + `open?: boolean`, `onOpenChange?: (open: boolean) => void`, `hideTrigger?: boolean`, `returnFocusRef?: RefObject<HTMLElement | null>` · export `type ActivityDrawerItem`
  - `AssetEvidenceDrawer` props เดิม + `open?`, `onOpenChange?`, `hideTrigger?`, `returnFocusRef?` (ชนิดเดียวกัน) · export type ของ `items` และ `labels` (`AssetEvidenceDrawerItem`, `AssetEvidenceDrawerLabels`)

**กติกา controlled/uncontrolled (ทั้งสอง drawer):**

```tsx
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen
  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }
```

(`open: controlledOpen` ใน destructuring props)

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/sheet-drawers-ui.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("sheet close button is labelled and touch sized", () => {
  const source = read("src/components/ui/sheet.tsx")
  assert.match(source, /closeLabel = "Close"/)
  assert.match(source, /aria-label=\{closeLabel\}/)
  assert.match(source, /min-h-11 min-w-11/)
  assert.doesNotMatch(source, /dark:/)
})

test("activity and evidence drawers are Radix sheets that can be opened from outside", () => {
  for (const path of ["src/components/ui/activity-drawer.tsx", "src/components/assets/asset-evidence-drawer.tsx"]) {
    const source = read(path)
    assert.match(source, /<SheetContent[\s\S]*?side="right"/, path)
    assert.match(source, /controlledOpen \?\? uncontrolledOpen/, path)
    assert.match(source, /hideTrigger/, path)
    assert.match(source, /returnFocusRef\?\.current/, path)
    assert.doesNotMatch(source, /fixed inset-0|aria-label="Close"/, path)
  }
})

test("mobile navigation drawer is a left sheet; desktop sidebar stays static", () => {
  const sidebar = read("src/components/layout/sidebar.tsx")
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(sidebar, /<SheetContent[\s\S]*?side="left"[\s\S]*?id="mobile-primary-navigation-drawer"/)
  assert.match(sidebar, /<SheetTitle className="sr-only">/)
  assert.match(sidebar, /hidden[^"]*lg:flex/)
  assert.doesNotMatch(shell, /fixed inset-0 z-30 bg-black\/50|addEventListener\("keydown"/)
})
```

แก้ `tests/mobile-field-navigation-ui.test.ts:59-82`: assertion ที่ตรวจ `aria-expanded={sidebarOpen}` และ `aria-controls`/id `mobile-primary-navigation-drawer` ของปุ่ม "เพิ่มเติม" ใน `mobile-field-navigation.tsx` คงไว้ · assertion ที่ตรวจโค้ดคืนโฟกัสเอง (`restoreMobileMoreFocusRef`, `mobileMoreTriggerRef.current?.focus()`, `closeButtonRef.current?.focus()` ฯลฯ) ใน shell/sidebar เปลี่ยนเป็น `assert.match(sidebar, /<Sheet\b/)` (Radix คืนโฟกัสให้ปุ่มที่เปิด)

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/sheet-drawers-ui.test.ts tests/mobile-field-navigation-ui.test.ts`
Expected: FAIL

- [ ] **Step 3: Sheet ด้วย CLI แล้วแก้ `SheetContent`**

```bash
npx shadcn@latest add sheet --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน) · ใน `src/components/ui/sheet.tsx` เพิ่ม prop `closeLabel = "Close"` ให้ `SheetContent` แล้วแทนปุ่ม close เดิมด้วย:

```tsx
        {showCloseButton && (
          <SheetPrimitive.Close
            aria-label={closeLabel}
            title={closeLabel}
            className="absolute top-3 right-3 inline-flex min-h-11 min-w-11 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none sm:size-10 sm:min-h-0 sm:min-w-0"
          >
            <XIcon className="size-4" aria-hidden="true" />
          </SheetPrimitive.Close>
        )}
```

(type ของ props: `& { side?: …; showCloseButton?: boolean; closeLabel?: string }`) · ลบคลาส `dark:` ถ้ามี

- [ ] **Step 4: `ActivityDrawer` บน Sheet**

เขียน `src/components/ui/activity-drawer.tsx` ใหม่ทั้งไฟล์:

```tsx
"use client"

import { useState, type RefObject } from "react"
import { Activity } from "lucide-react"
import { useTranslations } from "next-intl"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"

export type ActivityDrawerItem = {
  label: string
  value: string
  meta?: string
  tone?: "neutral" | "primary" | "info" | "success" | "warning" | "danger"
}

export function ActivityDrawer({
  title,
  triggerLabel,
  emptyLabel,
  items,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
  returnFocusRef,
}: {
  title: string
  triggerLabel: string
  emptyLabel: string
  items: ActivityDrawerItem[]
  open?: boolean
  onOpenChange?: (open: boolean) => void
  hideTrigger?: boolean
  returnFocusRef?: RefObject<HTMLElement | null>
}) {
  const tCommon = useTranslations("common")
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false)
  const open = controlledOpen ?? uncontrolledOpen

  function setOpen(next: boolean) {
    if (controlledOpen === undefined) setUncontrolledOpen(next)
    onOpenChange?.(next)
  }

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      {hideTrigger ? null : (
        <SheetTrigger asChild>
          <Button variant="outline">
            <Activity aria-hidden="true" />
            {triggerLabel}
          </Button>
        </SheetTrigger>
      )}
      <SheetContent
        side="right"
        closeLabel={tCommon("close")}
        aria-describedby={undefined}
        onCloseAutoFocus={(event) => {
          const target = returnFocusRef?.current
          if (!target?.isConnected) return
          event.preventDefault()
          target.focus()
        }}
        className="w-full gap-0 bg-surface p-0 sm:max-w-md"
      >
        <SheetHeader className="border-b border-border px-4 py-3 pr-16">
          <SheetTitle className="text-base font-semibold text-foreground">{title}</SheetTitle>
        </SheetHeader>
        <div className="flex-1 overflow-y-auto p-4">
          {items.length === 0 ? (
            <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              {emptyLabel}
            </div>
          ) : (
            <ol className="space-y-3">
              {items.map((item, index) => (
                <li key={`${item.label}-${index}`} className="rounded-md border border-border bg-background p-3">
                  <div className="flex items-start gap-3">
                    <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", getToneDotClass(item.tone))} />
                    <div className="min-w-0">
                      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{item.label}</div>
                      <div className="mt-1 break-words text-sm font-semibold text-foreground">{item.value}</div>
                      {item.meta ? <div className="mt-1 text-xs text-muted-foreground">{item.meta}</div> : null}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}

function getToneDotClass(tone: ActivityDrawerItem["tone"]) {
  if (tone === "danger") return "bg-danger"
  if (tone === "warning") return "bg-warning"
  if (tone === "success") return "bg-success"
  if (tone === "info") return "bg-info"
  if (tone === "primary") return "bg-primary"
  return "bg-muted-foreground"
}
```

- [ ] **Step 5: `AssetEvidenceDrawer` บน Sheet**

ทำแบบเดียวกับ Step 4 ใน `src/components/assets/asset-evidence-drawer.tsx`: เพิ่ม props `open`, `onOpenChange`, `hideTrigger`, `returnFocusRef` + กติกา controlled · ปุ่มเปิดเดิม (:44) ห่อด้วย `<SheetTrigger asChild>` เมื่อ `!hideTrigger` · `<div className="fixed inset-0 z-50">` + ปุ่ม backdrop `aria-label="Close"` + `<aside>` (:53-…) แทนด้วย `<SheetContent side="right" closeLabel={tCommon("close")} aria-describedby={undefined} onCloseAutoFocus={…เหมือน Step 4…} className="w-full gap-0 bg-surface p-0 sm:max-w-md">` + `<SheetHeader><SheetTitle>{labels.title}</SheetTitle></SheetHeader>` · ลบปุ่ม X เดิม · เนื้อหา (ตัวกรองกลุ่ม, รายการไฟล์) คงเดิม · export type `AssetEvidenceDrawerItem` (ชนิดของ `items[number]`) และ `AssetEvidenceDrawerLabels` (ชนิดของ `labels`)

- [ ] **Step 6: เมนูมือถือเป็น Sheet ด้านซ้าย**

`src/components/layout/sidebar.tsx`:
1. ภายในฟังก์ชัน `Sidebar` (หลังคำนวณ `visibleMenuItems`) สร้าง render function `const renderBody = (mobile: boolean) => (<>…</>)` ที่คืน JSX เดิมทั้งหมดที่อยู่ข้างใน `<aside>` (โลโก้, ปุ่มปิด, รายการเมนู, ส่วนท้าย) โดยใช้ตัวแปรในฟังก์ชันเดิมได้ตรง ๆ · ใน `renderBody` ให้แสดงปุ่มปิดเฉพาะเมื่อ `mobile` เป็น `true` (แทนคลาส `lg:hidden` เดิมของปุ่ม) และเมื่อ `mobile` เป็น `true` ให้ใช้ค่า `collapsed = false` สำหรับคลาสที่ขึ้นกับ `collapsed`
2. `<aside>` เดิม → desktop เท่านั้น มีลูกเป็น `{renderBody(false)}`: `className={cn("relative hidden max-h-dvh flex-col border-r border-white/10 bg-sidebar text-sidebar-foreground transition-all duration-300 lg:flex", collapsed ? "lg:w-16" : "lg:w-64")}` · ลบ `id` และคลาส translate ออกจาก aside
3. เพิ่มมือถือ:

```tsx
      <Sheet
        open={mobileOpen}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) onMobileClose()
        }}
      >
        <SheetContent
          side="left"
          id="mobile-primary-navigation-drawer"
          showCloseButton={false}
          aria-describedby={undefined}
          className="w-[min(18rem,85vw)] gap-0 border-r border-white/10 bg-sidebar p-0 text-sidebar-foreground lg:hidden"
        >
          <SheetTitle className="sr-only">{t("mainNavigation")}</SheetTitle>
          {renderBody(true)}
        </SheetContent>
      </Sheet>
```

   (`t("mainNavigation")` — ถ้าไม่มี key นี้ใน namespace `nav` ให้เพิ่ม `"mainNavigation": "เมนูหลัก"` / `"Main navigation"` ทั้ง th/en) · ลบ `useEffect` ที่ rAF โฟกัส `closeButtonRef` (Radix โฟกัสให้)
4. `src/components/layout/dashboard-shell.tsx`: ลบ `useEffect` Escape (:98-107), `useEffect` คืนโฟกัส `mobileMoreTriggerRef` (:87-96) และ `restoreMobileMoreFocusRef`, และ backdrop `{mobileSidebarOpen && (<div className="fixed inset-0 z-30 bg-black/50 lg:hidden" …/>)}` · `closeMobileSidebar` เหลือแค่ `setMobileSidebarOpen(false)` (ถ้ายังมีพารามิเตอร์ restoreFocus ให้ลบออกพร้อมจุดเรียก) · `onOpenMore` ยังเก็บ `mobileMoreTriggerRef` ได้ถ้ามีที่ใช้ ถ้าไม่มีให้ลบ · **ห้ามแก้ className ของ div shell**

- [ ] **Step 7: รัน test + type + lint**

```bash
node --test tests/sheet-drawers-ui.test.ts tests/mobile-field-navigation-ui.test.ts tests/dashboard-layout-scroll.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS · `tests/dashboard-layout-scroll.test.ts` ผ่านโดยไม่แก้

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/sheet.tsx src/components/ui/activity-drawer.tsx src/components/assets/asset-evidence-drawer.tsx src/components/layout/sidebar.tsx src/components/layout/dashboard-shell.tsx messages tests
git commit -m "refactor(ui): activity, evidence and mobile navigation drawers on Radix sheet

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: DropdownMenu — เมนูรายละเอียดทรัพย์สิน · เมนูแถวทะเบียน · เมนูภาษา/ผู้ใช้

**Files:**
- Create: `src/components/ui/dropdown-menu.tsx` (CLI แล้วแก้), `src/components/master-data/use-delete-action.ts`, `tests/dropdown-menus-ui.test.ts`
- Modify: `src/components/assets/asset-detail-action-menu.tsx` (เขียนใหม่), `src/app/[locale]/(dashboard)/assets/[id]/page.tsx:934-1005`, `src/components/asset-operations/transaction-cancel-dialog.tsx`, `src/components/assets/asset-register-action-menus.tsx` (เขียนใหม่), `src/components/master-data/master-data-delete-button.tsx`, `src/components/layout/topbar.tsx:236-290`
- Modify tests: `tests/confirm-dialog-ui.test.ts` (test "deletes report a delete")

**Interfaces:**
- Consumes: `ActivityDrawer`/`AssetEvidenceDrawer` controlled props (Task 11) · `useConfirm` (Task 6) · `Button` (Task 3)
- Produces:
  - `useDeleteAction(endpoint: string): { deleting: boolean; runDelete: () => Promise<void> }`
  - `type TransactionCancelDialogHandle = { open: () => void }` · `TransactionCancelDialog` props เดิม + `ref?: Ref<TransactionCancelDialogHandle>`, `hideTrigger?: boolean`, `returnFocusRef?: RefObject<HTMLElement | null>` · export `type TransactionCancelDialogProps` (props เดิมไม่รวม 3 ตัวใหม่)
  - `AssetDetailActionMenu({ label, cancelTransaction?, activity, evidence, links })` — `cancelTransaction?: TransactionCancelDialogProps` · `activity: { title: string; triggerLabel: string; emptyLabel: string; items: ActivityDrawerItem[] }` · `evidence: { items: AssetEvidenceDrawerItem[]; labels: AssetEvidenceDrawerLabels }` · `links: Array<{ key: "print" | "components" | "clone" | "edit"; href: string; label: string; mobileOnly?: boolean }>`

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/dropdown-menus-ui.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("asset detail menu owns its dialogs outside the menu and returns focus to the trigger", () => {
  const menu = read("src/components/assets/asset-detail-action-menu.tsx")
  assert.match(menu, /<DropdownMenu modal=\{false\}>/)
  assert.match(menu, /onCloseAutoFocus=\{\(event\) => \{[\s\S]*?openingDialogRef\.current/)
  assert.equal(menu.match(/returnFocusRef=\{triggerRef\}/g)?.length, 3)
  assert.match(menu, /<\/DropdownMenu>\s*\{cancelTransaction/)
  assert.doesNotMatch(menu, /fixed inset-0|children/)

  const page = read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
  assert.match(page, /<AssetDetailActionMenu\b[\s\S]*?\/>/)
  assert.doesNotMatch(page, /<\/AssetDetailActionMenu>/)
})

test("transaction cancel dialog can be opened by its owner without its own trigger", () => {
  const source = read("src/components/asset-operations/transaction-cancel-dialog.tsx")
  assert.match(source, /useImperativeHandle\(ref, \(\) => \(\{ open: \(\) => void openPreview\(\) \}\)\)/)
  assert.match(source, /hideTrigger \? null/)
  assert.match(source, /returnFocusRef=\{returnFocusRef\}/)
})

test("register row menus are Radix dropdowns and delete through the shared action", () => {
  const source = read("src/components/assets/asset-register-action-menus.tsx")
  assert.match(source, /<DropdownMenuContent/)
  assert.match(source, /useDeleteAction\(`\/api\/assets\/\$\{assetId\}`\)/)
  assert.match(source, /variant="destructive"/)
  assert.equal(source.match(/<DropdownMenuContent data-no-row-click/g)?.length, 2)
  assert.doesNotMatch(source, /createPortal|getBoundingClientRect|addEventListener|AssetDeleteButton/)
})

test("topbar language and user menus are Radix dropdowns", () => {
  const source = read("src/components/layout/topbar.tsx")
  assert.ok((source.match(/<DropdownMenu\b/g)?.length ?? 0) >= 2)
  assert.doesNotMatch(source, /langMenuOpen|userMenuOpen/)
})
```

แก้ test `"deletes report a delete, not a save"` ใน `tests/confirm-dialog-ui.test.ts`: เปลี่ยน path `src/components/master-data/master-data-delete-button.tsx` ในรายการเป็น `src/components/master-data/use-delete-action.ts` และเพิ่ม `assert.match(read("src/components/master-data/master-data-delete-button.tsx"), /useDeleteAction\(endpoint\)/)`

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/dropdown-menus-ui.test.ts`
Expected: FAIL

- [ ] **Step 3: DropdownMenu ด้วย CLI แล้วปรับเป้าแตะ**

```bash
npx shadcn@latest add dropdown-menu --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน) · ใน `src/components/ui/dropdown-menu.tsx` คลาสฐานของ `DropdownMenuItem`, `DropdownMenuCheckboxItem`, `DropdownMenuRadioItem`, `DropdownMenuSubTrigger`: เปลี่ยน `py-1.5` เป็น `min-h-11 py-2 sm:min-h-9` · ลบคลาส `dark:` ทุกตัว · `data-[variant=destructive]:focus:bg-destructive/10` คงได้ (อยู่ใน `src/components/ui/` และ contrast 5.46:1)

- [ ] **Step 4: สร้าง `src/components/master-data/use-delete-action.ts`**

```ts
"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useTranslations } from "next-intl"
import { toast } from "sonner"
import { useConfirm } from "@/components/ui/confirm-dialog"

export function useDeleteAction(endpoint: string) {
  const router = useRouter()
  const confirm = useConfirm()
  const tCommon = useTranslations("common")
  const [deleting, setDeleting] = useState(false)

  async function runDelete() {
    const confirmed = await confirm({ title: tCommon("deleteConfirm"), confirmLabel: tCommon("delete"), tone: "destructive" })
    if (!confirmed) return

    setDeleting(true)
    try {
      const response = await fetch(endpoint, { method: "DELETE" })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        throw new Error(result?.error ?? tCommon("error"))
      }
      toast.success(tCommon("deletedSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setDeleting(false)
    }
  }

  return { deleting, runDelete }
}
```

`master-data-delete-button.tsx`: ลบ state/ฟังก์ชันลบเดิม ใช้ `const { deleting, runDelete } = useDeleteAction(endpoint)` และ `onClick={() => void runDelete()}` (ปุ่มและคลาสเดิมคงไว้)

- [ ] **Step 5: `TransactionCancelDialog` เปิดจากภายนอกได้**

ใน `src/components/asset-operations/transaction-cancel-dialog.tsx`:
1. export `type TransactionCancelDialogProps` = ชนิด props เดิม (type, transactionId, expectedUpdatedAt, originalOperator, currentState, restoreState, componentCount, labels) และ `export type TransactionCancelDialogHandle = { open: () => void }`
2. props เพิ่ม `ref?: Ref<TransactionCancelDialogHandle>`, `hideTrigger?: boolean` (ค่าเริ่ม `false`), `returnFocusRef?: RefObject<HTMLElement | null>`
3. เพิ่ม `useImperativeHandle(ref, () => ({ open: () => void openPreview() }))`
4. ปุ่มเปิดเดิม: `{hideTrigger ? null : (<button …>…</button>)}`
5. ส่ง `returnFocusRef={returnFocusRef}` ให้ `<AccessibleDialog>`

- [ ] **Step 6: เขียน `src/components/assets/asset-detail-action-menu.tsx` ใหม่**

```tsx
"use client"

import { useRef, useState } from "react"
import Link from "next/link"
import { Activity, Copy, Edit, FolderOpen, MoreHorizontal, Printer, Puzzle, Undo2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ActivityDrawer, type ActivityDrawerItem } from "@/components/ui/activity-drawer"
import {
  AssetEvidenceDrawer,
  type AssetEvidenceDrawerItem,
  type AssetEvidenceDrawerLabels,
} from "@/components/assets/asset-evidence-drawer"
import {
  TransactionCancelDialog,
  type TransactionCancelDialogHandle,
  type TransactionCancelDialogProps,
} from "@/components/asset-operations/transaction-cancel-dialog"

const linkIcons = { print: Printer, components: Puzzle, clone: Copy, edit: Edit }

export function AssetDetailActionMenu({
  label,
  cancelTransaction,
  activity,
  evidence,
  links,
}: {
  label: string
  cancelTransaction?: TransactionCancelDialogProps
  activity: { title: string; triggerLabel: string; emptyLabel: string; items: ActivityDrawerItem[] }
  evidence: { items: AssetEvidenceDrawerItem[]; labels: AssetEvidenceDrawerLabels }
  links: Array<{ key: keyof typeof linkIcons; href: string; label: string; mobileOnly?: boolean }>
}) {
  const triggerRef = useRef<HTMLButtonElement | null>(null)
  const openingDialogRef = useRef(false)
  const cancelDialogRef = useRef<TransactionCancelDialogHandle | null>(null)
  const [panel, setPanel] = useState<"activity" | "evidence" | null>(null)

  function openFromMenu(open: () => void) {
    openingDialogRef.current = true
    open()
  }

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button ref={triggerRef} variant="outline" size="icon" aria-label={label} title={label}>
            <MoreHorizontal className="size-5" aria-hidden="true" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          className="w-72"
          onCloseAutoFocus={(event) => {
            if (!openingDialogRef.current) return
            openingDialogRef.current = false
            event.preventDefault()
          }}
        >
          {cancelTransaction ? (
            <DropdownMenuItem variant="destructive" onSelect={() => openFromMenu(() => cancelDialogRef.current?.open())}>
              <Undo2 aria-hidden="true" />
              {cancelTransaction.labels.action}
            </DropdownMenuItem>
          ) : null}
          <DropdownMenuItem onSelect={() => openFromMenu(() => setPanel("activity"))}>
            <Activity aria-hidden="true" />
            {activity.triggerLabel}
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => openFromMenu(() => setPanel("evidence"))}>
            <FolderOpen aria-hidden="true" />
            {evidence.labels.triggerLabel}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          {links.map((link) => {
            const Icon = linkIcons[link.key]
            return (
              <DropdownMenuItem key={link.key} asChild className={link.mobileOnly ? "md:hidden" : undefined}>
                <Link href={link.href}>
                  <Icon aria-hidden="true" />
                  {link.label}
                </Link>
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuContent>
      </DropdownMenu>
      {cancelTransaction ? (
        <TransactionCancelDialog ref={cancelDialogRef} hideTrigger returnFocusRef={triggerRef} {...cancelTransaction} />
      ) : null}
      <ActivityDrawer
        hideTrigger
        open={panel === "activity"}
        onOpenChange={(open) => setPanel(open ? "activity" : null)}
        returnFocusRef={triggerRef}
        {...activity}
      />
      <AssetEvidenceDrawer
        hideTrigger
        open={panel === "evidence"}
        onOpenChange={(open) => setPanel(open ? "evidence" : null)}
        returnFocusRef={triggerRef}
        {...evidence}
      />
    </>
  )
}
```

(ถ้า `AssetEvidenceDrawerLabels` ไม่มี `triggerLabel` ให้ใช้ key ที่ปุ่มเปิดเดิมใช้ — ในหน้าปัจจุบันคือ `labels.triggerLabel`)

- [ ] **Step 7: หน้า `assets/[id]/page.tsx` ส่งข้อมูลแทน children**

แทนบล็อก `<AssetDetailActionMenu label={…} closeLabel={…}> … </AssetDetailActionMenu>` (:934-1005) ด้วย:

```tsx
          <AssetDetailActionMenu
            label={t("detailMoreActions")}
            cancelTransaction={
              canEditAsset && latestAssetTransaction?.transactionStatus === "active"
                ? {
                    type: latestAssetTransaction.type,
                    transactionId: latestAssetTransaction.id,
                    expectedUpdatedAt: latestAssetTransaction.updatedAt.toISOString(),
                    originalOperator: latestAssetTransaction.operator,
                    currentState: formatCancellationSnapshot(cancellationAfterSnapshot, cancellationReferenceLabels),
                    restoreState: formatCancellationSnapshot(cancellationBeforeSnapshot, cancellationReferenceLabels),
                    componentCount: cancellationBeforeSnapshot?.components.length ?? 0,
                    labels: buildCancellationLabels(tCancellation),
                  }
                : undefined
            }
            activity={{
              title: t("activityDrawerTitle"),
              triggerLabel: t("activityDrawerOpen"),
              emptyLabel: tCommon("noData"),
              items: activityDrawerItems,
            }}
            evidence={{
              items: evidenceDrawerItems,
              labels: {
                title: t("evidenceCenter"),
                triggerLabel: t("detailSections.evidence"),
                emptyLabel: t("noEvidenceHelp"),
                total: t("evidenceTotal"),
                images: t("evidenceImages"),
                documents: t("evidenceDocuments"),
                all: t("movementFilters.all"),
                openFile: t("openEvidenceFile"),
              },
            }}
            links={[
              { key: "print", href: `/${locale}/assets/${asset.id}/label`, label: t("printLabel") },
              ...(canEditAsset ? [{ key: "components" as const, href: componentsManagerHref, label: t("manageComponents") }] : []),
              ...(canCreateAsset ? [{ key: "clone" as const, href: cloneHref, label: t("cloneAsset") }] : []),
              ...(canEditAsset ? [{ key: "edit" as const, href: editHref, label: tCommon("edit"), mobileOnly: true }] : []),
            ]}
          />
```

(เงื่อนไขของแต่ละลิงก์ตรงกับของเดิม: จัดการชิ้นส่วน `canEditAsset` · คัดลอก `canCreateAsset` · แก้ไข `canEditAsset` และแสดงเฉพาะมือถือ) · ลบ import `TransactionCancelDialog`, `ActivityDrawer`, `AssetEvidenceDrawer` และไอคอนที่ไม่ใช้แล้วจากหน้า

- [ ] **Step 8: เขียน `src/components/assets/asset-register-action-menus.tsx` ใหม่**

คง export `AssetRegisterTransactionMenu({ actions, labels, variant })` และ `AssetRegisterMoreMenu({ assetId, cloneHref, labels })` กับ type `Labels` และ `transactionIcon` เดิม · ลบ `FixedActionMenu` ทั้งตัว (portal, `getBoundingClientRect`, listener) แล้วใช้:

```tsx
export function AssetRegisterTransactionMenu({ actions, labels, variant = "icon" }: { … เดิม … }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={labels.transaction}
          aria-label={labels.transaction}
          className={variant === "full"
            ? "inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-md border border-primary/30 bg-primary-soft px-3 text-sm font-medium text-primary transition-colors hover:bg-primary-soft"
            : "inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          }
        >
          <ArrowRightLeft className="h-4 w-4" aria-hidden="true" />
          {variant === "full" ? <><span>{labels.transaction}</span><ChevronDown className="h-4 w-4" aria-hidden="true" /></> : null}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-no-row-click align="end" className="w-72">
        <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">{labels.transaction}</DropdownMenuLabel>
        {actions.map((action) => {
          const Icon = transactionIcon[action.action]
          const title = labels[action.action]
          if (!action.enabled) {
            return (
              <DropdownMenuItem key={action.action} disabled className="items-start">
                <Icon className="mt-0.5" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block font-medium text-foreground">{title}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {action.reason ? labels.reason[action.reason] : ""}
                  </span>
                </span>
              </DropdownMenuItem>
            )
          }
          return (
            <DropdownMenuItem key={action.action} asChild>
              <Link href={action.href}>
                <Icon className="text-primary" aria-hidden="true" />
                <span>{title}</span>
                <Check className="ml-auto size-3.5 text-success" aria-hidden="true" />
              </Link>
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function AssetRegisterMoreMenu({ assetId, cloneHref, labels }: { assetId: string; cloneHref: string; labels: Labels }) {
  const { deleting, runDelete } = useDeleteAction(`/api/assets/${assetId}`)
  const tCommon = useTranslations("common")

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          title={labels.more}
          aria-label={labels.more}
          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        >
          <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent data-no-row-click align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href={cloneHref}>
            <Copy aria-hidden="true" />
            {labels.cloneAsset}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem variant="destructive" disabled={deleting} onSelect={() => void runDelete()}>
          <Trash2 aria-hidden="true" />
          {tCommon("delete")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
```

`data-no-row-click` บน `DropdownMenuContent` จำเป็น: เมนูอยู่ในแถวที่คลิกแล้วเปิดรายละเอียด (`ClickableTableRow` ข้ามคลิกที่อยู่ใน `[data-no-row-click]`) และ event จาก portal ยัง bubble ผ่าน React tree · คลาสปุ่มเปิดคือคลาสเดิมหลัง codemod ของ Task 2 · `AssetDeleteButton` ในตาราง (`asset-register-table.tsx:639`) คงไว้ · import ที่ใช้: `Link`, `useTranslations`, ไอคอน `ArrowRightLeft`, `Check`, `ChevronDown`, `Copy`, `MoreHorizontal`, `PackageCheck`, `Trash2`, `Undo2`, ส่วนประกอบ `DropdownMenu*` และ `useDeleteAction`

- [ ] **Step 9: Topbar — เมนูภาษาและผู้ใช้**

`src/components/layout/topbar.tsx`: ลบ state `userMenuOpen`, `langMenuOpen` และบล็อก `{langMenuOpen && …}`, `{userMenuOpen && …}` · ปุ่มเปิดเดิมทั้งสองห่อด้วย `<DropdownMenuTrigger asChild>` (คงคลาส ไอคอน และ `aria-label` เดิม · ลบ `onClick` toggle) แล้ว:

```tsx
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuItem onSelect={() => switchLocale("th")} className={cn(locale === "th" && "font-medium text-primary")}>
                🇹🇭 ภาษาไทย
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => switchLocale("en")} className={cn(locale === "en" && "font-medium text-primary")}>
                🇺🇸 English
              </DropdownMenuItem>
            </DropdownMenuContent>
```

```tsx
            <DropdownMenuContent align="end" className="w-[calc(100vw-2rem)] max-w-[16rem]">
              <DropdownMenuLabel className="font-normal">
                <span className="block truncate text-sm font-medium">{userDisplayLabel}</span>
                {userSecondaryLabel ? <span className="mt-0.5 block truncate text-xs text-muted-foreground">{userSecondaryLabel}</span> : null}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onSelect={() => void signOut({ callbackUrl: `/${locale}/login` })}>
                <LogOut aria-hidden="true" />
                {tAuth("logout")}
              </DropdownMenuItem>
            </DropdownMenuContent>
```

(กระดิ่งแจ้งเตือนทำใน Task 13)

- [ ] **Step 10: รัน test + type + lint**

```bash
node --test tests/dropdown-menus-ui.test.ts tests/confirm-dialog-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS · `tests/asset-register-ux.test.ts` ผ่าน (ถ้ามี assertion ที่ตรึงโค้ด `FixedActionMenu` ให้เปลี่ยนเป็นตรวจ `DropdownMenuContent` และระบุในรายงาน)

- [ ] **Step 11: Commit**

```bash
git add src/components/ui/dropdown-menu.tsx src/components/master-data/use-delete-action.ts src/components/master-data/master-data-delete-button.tsx src/components/asset-operations/transaction-cancel-dialog.tsx src/components/assets/asset-detail-action-menu.tsx src/components/assets/asset-register-action-menus.tsx "src/app/[locale]/(dashboard)/assets/[id]/page.tsx" src/components/layout/topbar.tsx tests
git commit -m "refactor(ui): Radix dropdown menus with dialogs opened outside the menu

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Popover — กระดิ่งแจ้งเตือน · คำอธิบายสถานะ

**Files:**
- Create: `src/components/ui/popover.tsx` (CLI)
- Modify: `src/components/layout/topbar.tsx:150-230` (กระดิ่ง), `src/components/assets/asset-state-help-popover.tsx`
- Modify tests: `tests/asset-status-help-ui.test.ts` (test แรก), `tests/dropdown-menus-ui.test.ts` (เพิ่ม test กระดิ่ง)

**Interfaces:**
- Produces: `Popover`, `PopoverTrigger`, `PopoverContent`, `PopoverAnchor` (shadcn) — Task 14, 15 ใช้

- [ ] **Step 1: แก้ test (ล้ม)**

แทน test แรกของ `tests/asset-status-help-ui.test.ts` (`"asset status and condition help uses an accessible popover component"`) ด้วย:

```ts
test("asset status and condition help uses a Radix popover that opens on hover, focus and tap", () => {
  const source = helpComponentSource()

  assert.match(source, /"use client"/)
  assert.match(source, /CircleHelp/)
  assert.match(source, /<Popover open=\{open\} onOpenChange=\{setOpen\}>/)
  assert.match(source, /<PopoverTrigger asChild>/)
  assert.match(source, /onMouseEnter/)
  assert.match(source, /onFocus/)
  assert.match(source, /onOpenAutoFocus=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(source, /size = "default"/)
  assert.match(source, /isCompact/)
  assert.doesNotMatch(source, /getBoundingClientRect|addEventListener|style=\{\{ top/)
})
```

เพิ่มใน `tests/dropdown-menus-ui.test.ts`:

```ts
test("notification bell is a Radix popover", () => {
  const source = read("src/components/layout/topbar.tsx")
  assert.match(source, /<Popover open=\{notificationOpen\} onOpenChange=/)
  assert.match(source, /<PopoverContent[\s\S]*?align="end"/)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/asset-status-help-ui.test.ts tests/dropdown-menus-ui.test.ts`
Expected: FAIL

- [ ] **Step 3: Popover ด้วย CLI**

```bash
npx shadcn@latest add popover --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน · ลบ `dark:` ถ้ามี)

- [ ] **Step 4: เขียน `asset-state-help-popover.tsx` ใหม่**

```tsx
"use client"

import { CircleHelp } from "lucide-react"
import { useState } from "react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

type AssetStateHelpPopoverProps = {
  title: string
  description: string
  items: string[]
  srLabel?: string
  size?: "default" | "compact"
}

export function AssetStateHelpPopover({ title, description, items, srLabel, size = "default" }: AssetStateHelpPopoverProps) {
  const [open, setOpen] = useState(false)
  const isCompact = size === "compact"
  const buttonClassName = isCompact
    ? "inline-flex h-4 w-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    : "inline-flex h-6 w-6 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
  const iconClassName = isCompact ? "h-3.5 w-3.5" : "h-4 w-4"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={srLabel ?? title}
          onMouseEnter={() => setOpen(true)}
          onMouseLeave={() => setOpen(false)}
          onFocus={() => setOpen(true)}
          className={buttonClassName}
        >
          <CircleHelp className={iconClassName} aria-hidden="true" />
        </button>
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        className="w-[min(20rem,calc(100vw-1.5rem))] p-3 text-left"
      >
        <span role="status" aria-live="polite" className="block">
          <span className="block text-sm font-semibold text-foreground">{title}</span>
          <span className="mt-1 block text-xs leading-relaxed text-muted-foreground">{description}</span>
          <span className="mt-2 block space-y-1">
            {items.map((item) => (
              <span key={item} className="block text-xs leading-relaxed text-foreground">
                {item}
              </span>
            ))}
          </span>
        </span>
      </PopoverContent>
    </Popover>
  )
}
```

คลิก/แตะ: Radix สลับ `open` ผ่าน `onOpenChange` ให้เอง

- [ ] **Step 5: กระดิ่งแจ้งเตือนใน `topbar.tsx`**

ห่อปุ่มกระดิ่งเดิมด้วย `<Popover open={notificationOpen} onOpenChange={…}>` + `<PopoverTrigger asChild>` (ลบ `onClick` toggle ของปุ่ม · ถ้า toggle เดิมทำงานอื่นด้วย เช่นโหลดสรุปแจ้งเตือนตอนเปิด ให้ย้ายไปไว้ใน `onOpenChange` เมื่อ `next === true`) · `{notificationOpen ? (<div className="absolute right-0 top-full z-50 mt-1 …">…</div>) : null}` แทนด้วย `<PopoverContent align="end" className="w-[calc(100vw-2rem)] max-w-[20rem] p-0">` ที่มีเนื้อหาเดิมทั้งหมด (หัว, รายการ, ลิงก์ท้าย) · ลิงก์ท้ายที่เรียก `setNotificationOpen(false)` คงไว้

- [ ] **Step 6: รัน test + type + lint**

```bash
node --test tests/asset-status-help-ui.test.ts tests/dropdown-menus-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/components/ui/popover.tsx src/components/assets/asset-state-help-popover.tsx src/components/layout/topbar.tsx tests/asset-status-help-ui.test.ts tests/dropdown-menus-ui.test.ts
git commit -m "refactor(ui): notification bell and status help on Radix popover

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 14: `SearchableSelect` บน Popover + Command

**Files:**
- Create: `src/components/ui/command.tsx` (CLI), `src/lib/searchable-select-filter.ts`, `tests/searchable-select-filter.test.ts`
- Modify: `src/components/ui/searchable-select.tsx` (เขียนใหม่), `tests/searchable-select-accessibility.test.ts`
- Delete: `src/lib/searchable-select-navigation.ts`, `tests/searchable-select-navigation.test.ts`

**Interfaces:**
- Consumes: `Popover`, `PopoverTrigger`, `PopoverContent` (Task 13)
- Produces: `type SearchableSelectOption = { id: string; label: string; disabled?: boolean }` (ย้ายมา `src/lib/searchable-select-filter.ts` และ re-export จาก `searchable-select.tsx`) · `filterSearchableOptions(options: SearchableSelectOption[], query: string): SearchableSelectOption[]` · `SearchableSelect` props เดิมทุกตัว

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/searchable-select-filter.test.ts`**

```ts
import assert from "node:assert/strict"
import test from "node:test"
import { filterSearchableOptions } from "../src/lib/searchable-select-filter.ts"

const options = [
  { id: "1", label: "นางสาวศิริวรรณ ปิ่นทอง" },
  { id: "2", label: "Dell Latitude 5420" },
  { id: "3", label: "ฝ่ายซ่อมบำรุง", disabled: true },
]

test("empty query keeps every option in order", () => {
  assert.equal(filterSearchableOptions(options, ""), options)
  assert.equal(filterSearchableOptions(options, "   "), options)
})

test("Thai search ignores spaces", () => {
  assert.deepEqual(filterSearchableOptions(options, "ศิริวรรณปิ่น").map((option) => option.id), ["1"])
  assert.deepEqual(filterSearchableOptions(options, "ซ่อม บำรุง").map((option) => option.id), ["3"])
})

test("Latin search ignores case and spaces", () => {
  assert.deepEqual(filterSearchableOptions(options, "dell lat").map((option) => option.id), ["2"])
})
```

แทนเนื้อ `tests/searchable-select-accessibility.test.ts` ทั้งไฟล์ด้วย:

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("searchable select is a modal Radix popover with a cmdk listbox", () => {
  const source = readFileSync("src/components/ui/searchable-select.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<Popover modal open=\{open && !disabled\} onOpenChange=\{setOpenState\}>/)
  assert.match(source, /<Command shouldFilter=\{false\} loop/)
  assert.match(source, /filterSearchableOptions\(options, query\)/)
  assert.match(source, /w-\(--radix-popover-trigger-width\)/)
  assert.match(source, /<CommandItem[\s\S]*?disabled=\{option\.disabled\}/)
  assert.doesNotMatch(source, /document\.addEventListener|searchable-select-navigation/)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/searchable-select-filter.test.ts tests/searchable-select-accessibility.test.ts`
Expected: FAIL

- [ ] **Step 3: สร้าง `src/lib/searchable-select-filter.ts`**

```ts
export type SearchableSelectOption = {
  id: string
  label: string
  disabled?: boolean
}

function normalize(value: string) {
  return value.toLocaleLowerCase().replace(/\s+/g, "")
}

export function filterSearchableOptions(options: SearchableSelectOption[], query: string) {
  const normalizedQuery = normalize(query)
  if (!normalizedQuery) return options
  return options.filter((option) => normalize(option.label).includes(normalizedQuery))
}
```

- [ ] **Step 4: Command ด้วย CLI**

```bash
npx shadcn@latest add command --yes
git diff --stat
```

(คืน `globals.css` ถ้าเปลี่ยน · ตอบ No ถ้าถามทับ `dialog.tsx`/`button.tsx` · ลบ `dark:`) · ใน `CommandItem` เปลี่ยน `py-1.5` เป็น `min-h-11 py-2 sm:min-h-9`

- [ ] **Step 5: เขียน `src/components/ui/searchable-select.tsx` ใหม่**

```tsx
"use client"

import { useId, useMemo, useState } from "react"
import { Check, ChevronsUpDown, X } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
import { filterSearchableOptions, type SearchableSelectOption } from "@/lib/searchable-select-filter"

export type { SearchableSelectOption } from "@/lib/searchable-select-filter"

export function SearchableSelect({
  label,
  value,
  options,
  required,
  disabled,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  clearLabel,
  onSearchChange,
  onChange,
}: {
  label: string
  value: string
  options: SearchableSelectOption[]
  required?: boolean
  disabled?: boolean
  placeholder: string
  searchPlaceholder: string
  emptyLabel: string
  clearLabel?: string
  onSearchChange?: (query: string) => void
  onChange: (value: string) => void
}) {
  const labelId = useId()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const selectedOption = options.find((option) => option.id === value)
  const filteredOptions = useMemo(() => filterSearchableOptions(options, query), [options, query])
  const showClear = Boolean(value) && !required && !disabled

  function setOpenState(next: boolean) {
    setOpen(next)
    if (!next) setQuery("")
  }

  function updateQuery(next: string) {
    setQuery(next)
    onSearchChange?.(next)
  }

  function selectValue(nextValue: string) {
    onChange(nextValue)
    setOpenState(false)
  }

  return (
    <div className="block min-w-0 max-w-full">
      {label ? (
        <span id={labelId} className="mb-1.5 block text-sm font-medium text-foreground">
          {label}
          {required && <span className="ml-1 text-danger">*</span>}
        </span>
      ) : null}
      <div className="relative min-w-0 max-w-full">
        <Popover modal open={open && !disabled} onOpenChange={setOpenState}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={disabled}
              className={`flex min-h-11 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-border bg-background px-3 text-left text-sm outline-none transition-colors hover:bg-accent focus:border-primary focus:ring-1 focus:ring-primary disabled:cursor-not-allowed disabled:bg-muted disabled:text-muted-foreground sm:h-10 sm:min-h-0 ${showClear ? "pr-24 sm:pr-20" : "pr-10"}`}
              aria-labelledby={label ? labelId : undefined}
              aria-label={label ? undefined : placeholder}
            >
              <span className={selectedOption ? "min-w-0 truncate text-foreground" : "min-w-0 truncate text-muted-foreground"}>
                {selectedOption?.label ?? placeholder}
              </span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="start" className="w-(--radix-popover-trigger-width) max-w-[calc(100vw-2rem)] p-0">
            <Command shouldFilter={false} loop defaultValue={value || undefined}>
              <CommandInput value={query} onValueChange={updateQuery} placeholder={searchPlaceholder} aria-label={searchPlaceholder} />
              <CommandList className="max-h-64">
                <CommandEmpty>{emptyLabel}</CommandEmpty>
                {filteredOptions.map((option) => (
                  <CommandItem
                    key={option.id}
                    value={option.id}
                    disabled={option.disabled}
                    onSelect={() => selectValue(option.id)}
                  >
                    <Check className={option.id === value ? "size-4 text-primary" : "size-4 text-transparent"} aria-hidden="true" />
                    <span className="min-w-0 truncate">{option.label}</span>
                  </CommandItem>
                ))}
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        {showClear ? (
          <button
            type="button"
            onClick={() => selectValue("")}
            className="absolute inset-y-0 right-8 inline-flex min-h-11 w-11 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:min-h-0 sm:w-10"
            aria-label={clearLabel ?? placeholder}
            title={clearLabel ?? placeholder}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        ) : null}
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 shrink-0 text-muted-foreground" aria-hidden="true" />
      </div>
    </div>
  )
}
```

(`modal` ทำให้เลื่อนรายการได้เมื่อ popover อยู่ใน Dialog — Dialog ของ Radix ล็อกการเลื่อนนอกเนื้อหาของตัวเอง)

- [ ] **Step 6: ลบ helper เก่า**

```bash
git rm src/lib/searchable-select-navigation.ts tests/searchable-select-navigation.test.ts
grep -rn "searchable-select-navigation" src tests
```

Expected: grep ไม่เจออะไร

- [ ] **Step 7: รัน test + type + lint**

```bash
node --test tests/searchable-select-filter.test.ts tests/searchable-select-accessibility.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS · ผู้ใช้ `SearchableSelect` 12 ไฟล์ + `MaintenanceOptionSelect` compile โดยไม่แก้

- [ ] **Step 8: Commit**

```bash
git add src/components/ui/command.tsx src/components/ui/searchable-select.tsx src/lib/searchable-select-filter.ts tests/searchable-select-filter.test.ts tests/searchable-select-accessibility.test.ts
git commit -m "refactor(ui): searchable select on Radix popover and cmdk

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(`git rm` ใน Step 6 stage การลบไว้แล้ว)

---

### Task 15: ช่องค้นหาด้านบนบน Popover

**Files:**
- Modify: `src/components/layout/global-search.tsx`
- Create: `tests/global-search-ui.test.ts`

**Interfaces:**
- Consumes: `Popover`, `PopoverAnchor`, `PopoverContent` (Task 13), `StatusBadge` (Task 4: `color` ใช้กับจุดเท่านั้น)

**หมายเหตุการออกแบบ:** spec §5 เขียนว่า "Popover + Command list" — plan นี้ใช้ Popover ยึดช่องค้นหา + `role="listbox"`/`role="option"` + `aria-activedescendant` กับตรรกะปุ่มลูกศรเดิมแทน cmdk เพราะ cmdk ต้องให้ input อยู่ใน `<Command>` เดียวกับรายการ แต่ช่องค้นหาอยู่บน topbar และรายการอยู่ใน portal · ผลต่อผู้ใช้เหมือนกัน (ปุ่มลูกศร, Enter, Esc, คลิกนอกปิด, โปรแกรมอ่านจออ่านรายการได้)

- [ ] **Step 1: เขียน test ที่ล้ม — `tests/global-search-ui.test.ts`**

```ts
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("global search results are a Radix popover listbox anchored to the field", () => {
  const source = readFileSync("src/components/layout/global-search.tsx", "utf8").replace(/\r\n/g, "\n")
  assert.match(source, /<PopoverAnchor asChild>/)
  assert.match(source, /<PopoverContent[\s\S]*?id="global-search-results"/)
  assert.match(source, /onOpenAutoFocus=\{\(event\) => event\.preventDefault\(\)\}/)
  assert.match(source, /role="listbox"/)
  assert.match(source, /role="option"/)
  assert.match(source, /aria-activedescendant=/)
  assert.match(source, /<StatusBadge/)
  assert.doesNotMatch(source, /document\.addEventListener|style=\{\{/)
})
```

- [ ] **Step 2: รันให้ล้ม**

Run: `node --test tests/global-search-ui.test.ts`
Expected: FAIL

- [ ] **Step 3: แก้ `global-search.tsx`**

1. ลบ `useEffect` ที่ฟัง `mousedown` บน `document` (:45-51) และ `containerRef` · เพิ่ม `const anchorRef = useRef<HTMLDivElement | null>(null)` · import `Popover`, `PopoverAnchor`, `PopoverContent` จาก `@/components/ui/popover` และ `StatusBadge` จาก `@/components/ui/status-badge`
2. แทน `return (…)` ของ `GlobalSearch` ทั้งก้อน (:127-236) ด้วย:

```tsx
  return (
    <Popover
      open={showPanel}
      onOpenChange={(next) => {
        if (!next) setOpen(false)
      }}
    >
      <PopoverAnchor asChild>
        <div ref={anchorRef} className="relative hidden min-w-0 max-w-full lg:block">
          <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            value={query}
            onChange={(event) => handleQueryChange(event.target.value)}
            onFocus={() => setOpen(true)}
            onKeyDown={handleKeyDown}
            placeholder={t("placeholder")}
            className="h-9 w-[min(28rem,36vw)] min-w-0 rounded-md border border-border bg-background pl-10 pr-10 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            role="combobox"
            aria-label={t("label")}
            aria-expanded={showPanel}
            aria-autocomplete="list"
            aria-controls="global-search-results"
            aria-activedescendant={showPanel && selectedResult ? `global-search-option-${selectedIndex}` : undefined}
          />
          <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            ) : query ? (
              <button
                type="button"
                onClick={() => {
                  setQuery("")
                  setResults([])
                  setOpen(false)
                }}
                className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                aria-label={t("clear")}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            ) : null}
          </div>
        </div>
      </PopoverAnchor>
      <PopoverContent
        id="global-search-results"
        align="start"
        sideOffset={8}
        onOpenAutoFocus={(event) => event.preventDefault()}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onInteractOutside={(event) => {
          if (anchorRef.current?.contains(event.target as Node)) event.preventDefault()
        }}
        className="w-[min(36rem,calc(100vw-2rem))] overflow-hidden p-0"
      >
        {!canSearch ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{t("minChars")}</div>
        ) : loading && results.length === 0 ? (
          <div className="flex items-center gap-2 px-4 py-3 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            {t("loading")}
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-3 text-sm text-muted-foreground">{t("noResults")}</div>
        ) : (
          <ul role="listbox" aria-label={t("label")} className="max-h-[26rem] overflow-y-auto py-1">
            {results.map((result, index) => {
              const selected = index === selectedIndex

              return (
                <li
                  key={`${result.type}-${result.id}`}
                  id={`global-search-option-${index}`}
                  role="option"
                  aria-selected={selected}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseEnter={() => setSelectedIndex(index)}
                  onClick={() => openResult(result)}
                  className={[
                    "flex w-full min-w-0 cursor-pointer gap-3 px-4 py-3 text-left transition-colors",
                    selected ? "bg-accent" : "hover:bg-accent/60",
                  ].join(" ")}
                >
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary-soft text-primary">
                    {getResultIcon(result.type)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-2">
                      <span className="min-w-0 truncate font-medium text-foreground">{result.title}</span>
                      <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                        {result.typeLabel}
                      </span>
                      {result.badge.label !== result.typeLabel ? (
                        <StatusBadge size="xs" tone="neutral" label={result.badge.label} color={result.badge.colorCode} />
                      ) : null}
                    </span>
                    <span className="mt-0.5 block truncate text-sm text-foreground">{result.subtitle}</span>
                    <span className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      {result.metadata.slice(0, 3).map((item) => (
                        <span key={`${result.id}-${item.label}`} className="min-w-0 truncate">
                          {item.label}: {item.value}
                        </span>
                      ))}
                    </span>
                  </span>
                </li>
              )
            })}
          </ul>
        )}
        {results.length > 0 ? (
          <div className="border-t border-border px-4 py-2 text-xs text-muted-foreground">{t("keyboardHint")}</div>
        ) : null}
      </PopoverContent>
    </Popover>
  )
```

3. `handleKeyDown`, `openResult`, `handleQueryChange`, `getResultIcon` และ effect ค้นหาคงเดิม · `useRef` import ยังใช้ (`anchorRef`)

- [ ] **Step 4: รัน test + type + lint**

```bash
node --test tests/global-search-ui.test.ts
npm test
npx tsc --noEmit -p tsconfig.json
npm run lint
```

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/global-search.tsx tests/global-search-ui.test.ts
git commit -m "refactor(ui): global search results in a Radix popover listbox

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 16: guard สุดท้าย · เอกสาร · ตรวจทั้งชุด

**Files:**
- Modify: `tests/ui-overlay-guards.test.ts`, `DESIGN.md` (§5 Components), `DEVELOPER_HANDOFF.md`, `docs/99_CHANGELOG.md`, `docs/superpowers/specs/2026-10-07-ui-shadcn-foundation-design.md` (บรรทัดสถานะ)

- [ ] **Step 1: เพิ่ม guard สุดท้ายใน `tests/ui-overlay-guards.test.ts`**

```ts
test("no hand-rolled overlay backdrops outside shared ui components", () => {
  assert.deepEqual(
    findMatches(/\bfixed inset-0\b/g, (path) => path.startsWith("src/components/ui/") || path === "src/components/layout/dashboard-shell.tsx"),
    [],
  )
})

test("no global listeners for closing overlays", () => {
  assert.deepEqual(findMatches(/(?:document|window)\.addEventListener\("(?:keydown|mousedown|pointerdown)"/g), [])
})

test("no portals or manual positioning for menus", () => {
  assert.deepEqual(findMatches(/createPortal\(/g), [])
})

test("no dark-mode classes", () => {
  assert.deepEqual(findMatches(/\bdark:/g), [])
})
```

Run: `node --test tests/ui-overlay-guards.test.ts`
Expected: PASS · ถ้าล้ม: ตัวที่เจอเป็นกล่องลอยที่ตกหล่น → ย้ายตามสูตรของ Task 8 แล้วระบุในรายงาน · ถ้าเป็นของที่ไม่ใช่กล่องลอย (เช่น listener ของเครื่องสแกนบาร์โค้ด) ให้หยุดและรายงาน ห้ามเพิ่ม allowlist เอง

- [ ] **Step 2: `DESIGN.md` §5 Components**

แทนหัวข้อ `### Buttons` ข้อ `- **Hover / Focus:** …` ด้วย:

```markdown
- **Hover / Focus:** Solid buttons darken on hover with the hover token (`hover:bg-primary-hover`, `hover:bg-danger-hover`) — never fade with opacity. Focus uses a visible Electric Blue ring with offset. Disabled states reduce opacity and block pointer actions. Build buttons with `Button` / `buttonVariants` from `src/components/ui/` (shadcn); `getActionButtonClasses` maps legacy variants onto the same classes.
```

แทนหัวข้อ `### Chips` ทั้งหัวข้อด้วย:

```markdown
### Status Badges

- **Style:** One `StatusBadge` (`src/components/ui/status-badge.tsx`): 6px radius, a status dot, the tone's soft background (`bg-{tone}-soft`), its border (`border-{tone}-border`) and AA ink text (`text-{tone}`). The dot keeps status readable without relying on hue alone.
- **Custom colors:** A status color stored in the database colors the dot only, and only when it is a valid hex value. Badge text is always the tone ink.
- **State:** Every badge carries a text label. Warning, danger, success, info, and primary tones follow workflow meaning (`getStatusTone`, `getAssetStateTone`).

### Dialogs, Menus and Confirmation

- **Primitives:** Overlays use shadcn/ui on Radix (`src/components/ui/`): `AccessibleDialog` for forms and reviews, `Sheet` for side drawers and mobile navigation, `DropdownMenu` for action menus, `Popover` for help and pickers, `AttachmentPreviewDialog` for image/PDF preview. Every overlay closes with Escape, traps focus, returns focus to its trigger, locks page scroll, and renders in a portal.
- **Busy dialogs:** Pass `busy` while saving; the dialog then ignores Escape, outside clicks and the close button.
- **Confirmation:** Never use `window.confirm`. Call `await confirm({ title, confirmLabel, tone })` from `useConfirm()`; destructive actions use `tone: "destructive"` and report the actual result ("ลบแล้ว", not "บันทึกสำเร็จ").
- **Menus never contain dialogs.** A menu item only opens a dialog or drawer that is rendered outside the menu, and that dialog returns focus to the menu trigger.
```

- [ ] **Step 3: `DEVELOPER_HANDOFF.md`**

เพิ่มหัวข้อใหม่ก่อน `## Open Go-Live Decisions`:

```markdown
## shadcn/ui Foundation (2026-10-07)

- UI primitives are shadcn/ui (style `new-york`, Tailwind 4, package `radix-ui`) in `src/components/ui/`. Add more with `npx shadcn@latest add <name>`; afterwards check `git diff --stat` and restore `src/app/globals.css` if the CLI touched it, remove any `dark:` classes, and give touch targets `min-h-11` on mobile.
- Tokens live in `:root` of `src/app/globals.css` with shadcn names plus five values per status tone (`{tone}`, `-foreground`, `-soft`, `-border`, `-hover`). `tests/design-tokens-contrast.test.ts` fails the build if a pair drops below 4.5:1. Use `bg-{tone}-soft` and `hover:bg-{tone}-hover`; opacity tints are blocked by `tests/ui-overlay-guards.test.ts`.
- Fonts: Inter (Latin, numbers) + Noto Sans Thai (Thai) through `next/font/google` in `src/app/layout.tsx`; `font-sans` resolves to both.
- `Button`/`Badge` variants are in `button-variants.ts` / `badge-variants.ts` so `node --test` can import them.
- Confirmation: `useConfirm()` from `src/components/ui/confirm-dialog.tsx` (provider mounted in `DashboardShell`). Leave-page guards use `shouldGuardLinkClick` from `src/lib/navigation-guard.ts`.
- Rules: menus never contain dialogs; busy dialogs pass `busy`; database status colors only color the badge dot. Design spec: `docs/superpowers/specs/2026-10-07-ui-shadcn-foundation-design.md`.
```

- [ ] **Step 4: `docs/99_CHANGELOG.md`**

ใต้ `## 2026-10-07` เพิ่มหัวข้อแรก (ก่อน `### บันทึกการซ่อมแบบฟอร์มเดียว`):

```markdown
### รากฐาน UI บน shadcn/ui (รอบที่ 3 ส่วน A)

Branch `feat/ui-shadcn-foundation` · design `docs/superpowers/specs/2026-10-07-ui-shadcn-foundation-design.md` · plan `docs/superpowers/plans/2026-10-07-ui-shadcn-foundation.md`

- ย้ายไป shadcn/ui (Radix) ทั้งชุด: Button, Badge, Dialog, AlertDialog, Sheet, DropdownMenu, Popover, Command · คอมโพเนนต์กลางเดิมคง props
- token สีใหม่ผ่าน WCAG AA: success #15803D · warning #B45309 · danger #B91C1C + พื้นอ่อน/เส้นขอบ/hover ต่อโทน · `primary-soft` / `primary-hover` · codemod พื้นโปร่งและ `/90` ทั้งแอป · มี test ตรวจ contrast
- ฟอนต์ Noto Sans Thai (ไทย) + Inter (อังกฤษ/ตัวเลข)
- ป้ายสถานะตัวเดียวแบบมีจุดสี (รวม `StatusPill` เข้า `StatusBadge`) · สีจาก DB ใช้กับจุดเท่านั้น
- `window.confirm` 13 จุดเป็น AlertDialog ในแอป (`useConfirm`) · ลบแล้วแจ้ง "ลบแล้ว"
- กล่องลอยที่เขียนเองทุกตัวย้ายไป Radix (dialog 12, ภาพตัวอย่าง 2, drawer 3, เมนู 5, popover 3) · กด Esc ปิดได้ ล็อกการเลื่อนหน้า คืนโฟกัส
- ยกไปส่วน B: ตารางทะเบียน/ตัวเลือกคอลัมน์ · ตัวกรอง · การสแกน · ข้อความไทย/อังกฤษ
```

- [ ] **Step 5: บรรทัดสถานะของ spec**

ใน `docs/superpowers/specs/2026-10-07-ui-shadcn-foundation-design.md` เปลี่ยนบรรทัด `> สถานะ: **design approved** …` เป็น `> สถานะ: **implemented** บน branch \`feat/ui-shadcn-foundation\` (2026-10-07) · ยังไม่ merge/deploy`

- [ ] **Step 6: ตรวจทั้งชุด + lockfile**

```bash
npm run verify
npx -y npm@10.9.4 install --package-lock-only --ignore-scripts
git diff --exit-code package-lock.json
```

Expected: lint → test → build ผ่าน · lockfile ไม่เปลี่ยน (exit 0) · บันทึกขนาด First Load JS ของ `/[locale]/assets` และ `/[locale]/assets/[id]` จาก output ของ `next build` ไว้ในรายงาน

- [ ] **Step 7: Commit**

```bash
git add tests/ui-overlay-guards.test.ts DESIGN.md DEVELOPER_HANDOFF.md docs/99_CHANGELOG.md docs/superpowers/specs/2026-10-07-ui-shadcn-foundation-design.md
git commit -m "docs(ui): shadcn foundation rules, handoff and changelog

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```
