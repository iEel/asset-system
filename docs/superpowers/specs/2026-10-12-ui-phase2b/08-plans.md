> ร่างส่วนที่ 8 ของสเปก 2B "หน้ารายการและโครงหน้า" · ตัวเลขและบรรทัดอ้างที่ `master` `d38a0ee` (เลขของ 2C ที่เป็นของ `5ffee76` เขียนกำกับไว้) · ข้อตัดสิน B1–B10 (`2026-10-12-ui-phase2b/00-decisions.md`) และ R-a…R-s (`2026-10-12-ui-phase2b/00-synthesis.md` ข้อ 1.1) ใช้ตามนั้น

## 8. แบ่ง plan ลำดับงาน รั้ว และการ deploy

ส่วนนี้บอกว่า 2B แบ่งเป็น 5 plan อย่างไร แต่ละ plan แตะไฟล์ไหน ปลด 2C plan ไหน ห้ามแตะอะไร ตัวเลข guard หลังแต่ละ plan และ deploy เมื่อไร · API ของ primitive อยู่ในส่วนที่ถือ primitive นั้น ส่วนนี้ไม่ระบุซ้ำ

ตัวย่อ: `D/` = `src/app/[locale]/(dashboard)/` · `c/` = `src/components/` · **VFG** = `tests/visual-foundation-guards.test.ts` · **FMG** = `tests/form-migration-guards.test.ts` · **DS** = `DESIGN.md` · **DH** = `DEVELOPER_HANDOFF.md` · **A** = `docs/superpowers/specs/2026-10-11-ui-phase2a-design.md` · **C** = `docs/superpowers/specs/2026-10-11-ui-phase2c-design.md` · **C/0N** = `docs/superpowers/specs/2026-10-11-ui-phase2c/0N-*.md` · **F** = `docs/superpowers/specs/2026-10-10-ui-foundation-design.md` · **WIKI** = `D:/Obsidian/Eltross/AssetSystem/ams-open-questions.md`

วิธีนับ (อ่านอย่างเดียว · สคริปต์อยู่ที่ `scratchpad/p2b-spec/work/` ไม่อยู่ใน repo):
- `s8-guards.mjs`: regex เดียวกับ VFG:223-224 (R1), :233 (R7), :258 (R2) นับทีละบรรทัดทั้ง `src` (.ts/.tsx แปลงเป็น LF แบบ `tests/helpers/source-files.ts:7-17`)
- `s8-plans.mjs`: รายการไฟล์ของ 2B-1…2B-5 และ 2C-3…2C-5 · ตรวจว่าไฟล์มีจริง · ตัดกันทุกคู่ที่ทำพร้อมกันได้ · หา test ที่อ่านไฟล์ของทั้งสองฝ่าย (ชื่อ path หรือชื่อไฟล์ใน test)
- `s8-imports.mjs`: import จาก `@/components/` ของทุกไฟล์ใน `D/` (86 ไฟล์)
- ทุก file:line ในส่วนนี้เปิดดูแล้วที่ HEAD

---

### 8.1 สายท่อ (B7)

```
สาย 2B (checkout หลัก):  2B-1 ─▶ 2B-2 ─▶ 2B-3 ─▶ 2B-4 ─▶ 2B-5 ─┐
                                   │        │        │          ├─▶ 2D ─▶ (V ข้อ 8.13 ข้อ 9) ─▶ deploy ครั้งเดียว (B9)
สาย 2C (worktree):                 └─▶ 2C-3 ┴─▶ 2C-4 ┴─▶ 2C-5 ─┘
```

| plan | เริ่มได้เมื่อบน `master` มี | ทำพร้อมกับ | ปลด |
|---|---|---|---|
| 2B-1 | ตอนนี้ (`feat/ui-phase2b` = `d38a0ee` · 2C plan 2 merge แล้ว DH:449-475) | — | 2B-2 |
| 2B-2 | 2B-1 | — | 2B-3 · **2C-3** |
| 2B-3 | 2B-2 | 2C-3 | 2B-4 · **2C-4** (ต้องมี 2C-3 ด้วย) |
| 2B-4 | 2B-3 | 2C-3 · 2C-4 | 2B-5 · **2C-5** (ต้องมี 2C-4 ด้วย) |
| 2B-5 | 2B-4 | 2C-3 · 2C-4 · 2C-5 | **2D** (ต้องมี 2C-5 ด้วย) |
| 2C-3 | 2B-2 | 2B-3 · 2B-4 · 2B-5 | 2C-4 |
| 2C-4 | 2B-3 และ 2C-3 | 2B-4 · 2B-5 | 2C-5 |
| 2C-5 | 2B-4 และ 2C-4 | 2B-5 | 2D |
| 2D | 2B-5 และ 2C-5 | — | V |

- สาย 2B ไม่รอสาย 2C · สาย 2C รอ 2B ตามตาราง · คู่ที่เกิดได้จริงจึงมี **6 คู่**: 2B-3∥2C-3 · 2B-4∥2C-3 · 2B-4∥2C-4 · 2B-5∥2C-3 · 2B-5∥2C-4 · 2B-5∥2C-5 (B7 เขียนไว้ 3 คู่ · ข้อ 8.3 พิสูจน์ครบ 6 คู่)
- 2B-1 และ 2B-2 เปิดสายเดียว: 2B-1 แตะไฟล์ใน `BATCH_FILES` ของ FMG 21 จาก 66 ไฟล์ (ข้อ 8.5 · ไม่แตะ 2 เครื่องมือชุด 4 ตาม I13) · 2B-2 ทำส่วนรายการของไฟล์ร่วม 3 ไฟล์ที่ 2C-3 รออยู่ (`c/disposal/disposal-bulk-approval.tsx`, `c/disposal/disposal-bulk-execution.tsx`, `c/audit/audit-findings-batch-actions.tsx`)
- ข้อนี้แทน: I28 ของสเปก 2C (C:148 "plan 3 และ 4 เริ่มหลัง 2B merge · plan 5 หลัง 2B merge") · C:207-209 · DH:442-445 ("Plans 3–5 start after 2B merges") · DH:475 · A:15 ("2A → (2B ∥ 2C) → 2D") · ไม่แก้สเปก 2C · บันทึกการแทนใน DH และ wiki (ข้อ 8.14)
- งาน V: เงื่อนไขเดิม "หลังชุด 1 อยู่บน Production" (C:210) เป็นไปไม่ได้แล้วเพราะ B9 · ส่วนนี้เสนอ V เริ่มหลัง 2D merge เพราะ V แก้ฟอร์มที่ 2D ก็กวาดแผงฟอร์ม (K28, O15) · ผู้ใช้ตัดสิน (ข้อ 8.13 ข้อ 9)

### 8.2 กฎสายท่อ

**ที่ทำงานและ branch**

| สาย | ที่ | branch |
|---|---|---|
| 2B | checkout หลัก `D:/Antigravity/asset-system` | 2B-1 `feat/ui-phase2b` (มีอยู่แล้ว = `d38a0ee`) · 2B-N `feat/ui-phase2b-planN` แตกจาก `master` หลัง 2B-(N-1) merge |
| 2C | worktree `D:/Antigravity/asset-system/.worktrees/ui-phase2c-planN` (`.worktrees/` อยู่ใน `.gitignore:49-50`) | `feat/ui-phase2c-planN` แตกจาก `master` ตอนเงื่อนไขครบ: `git worktree add .worktrees/ui-phase2c-plan3 -b feat/ui-phase2c-plan3 master` |

2B อยู่ checkout หลักเพราะเป็น critical path และ `uploads/` (`.gitignore:47`) กับ `.env` อยู่ที่นี่

ตั้ง worktree (controller ทำ ไม่ใช่ผู้ทำงาน):
1. `npm ci` (lockfile เดิม ไม่มี dependency ใหม่) แล้ว `npm run prisma:generate` (`src/generated/prisma` ถูก ignore `.gitignore:46`)
2. คัดลอก `.env` ของ checkout หลักไปที่ worktree โดยไม่เปิดดูค่า (ต้องให้ผู้ใช้ยืนยันครั้งแรกใน plan 2C-3 · I30) · ห้ามคัดลอก `.env.prod-admin` · ตรวจ key `DATABASE_URL` / `DB_USER` เป็น `asset_management_dev` / `asset_dev` แบบงาน 0 ของ 2C plan 2 (`docs/superpowers/plans/2026-10-12-ui-phase2c-plan2.md:137`) · ไม่มี `.env` แล้ว `next build` เก็บข้อมูล route ไม่ได้ (`docs/superpowers/plans/2026-07-10-asset-detail-components-ux-implementation.md:382`)
3. port: `scripts/next-with-env-port.mjs:17` ใช้ `WEB_PORT || PORT || "3000"` และ dotenv ไม่ทับค่าที่ตั้งใน shell · checkout หลัก dev 3000 · `next start` 3001 · worktree ตั้ง `$env:WEB_PORT = "3100"` (dev) และ `"3101"` (`next start`)
4. สองสายใช้ DB dev ตัวเดียวกัน · ตรวจบนแอป dev ห้ามบันทึกข้อมูล (แบบ 2C plan 2 DH:468) · หน้าที่ต้องเห็นไฟล์แนบตรวจบน checkout หลัก เพราะ worktree ไม่มี `uploads/`
5. merge แล้วลบ worktree (`git worktree remove`)

**merge**
- เข้า `master` แบบ fast-forward เท่านั้น (`git merge --ff-only`) · `ab1b873..d38a0ee` 107 commit ไม่มี merge commit (`git log --merges --oneline ab1b873..d38a0ee` ได้ 0)
- `npm run verify` ต้องผ่านบน commit ที่จะ merge (หลัง rebase ถ้ามี)
- ก่อน merge: `git diff --name-only master...<branch>` ต้องอยู่ในรายการไฟล์ของ plan + test + เอกสาร · ไฟล์นอกรายการต้องมีเหตุผลใน ledger ของ plan
- push `master` ไป remote `company` เมื่อผู้ใช้สั่ง (แบบ 2C plan 1–2 `00-decisions.md:3`) · push ไม่ใช่ deploy

**rebase (ฝ่ายที่ merge ทีหลัง rebase · C/08:37 กฎ 5)**
1. สายที่ยังเปิดอยู่ rebase ทันทีที่คู่ merge (ที่ขอบงานถัดไป ไม่รอท้าย plan) และอีกครั้งก่อน merge ถ้า `master` ขยับ
2. conflict ที่ยอมรับ และวิธีแก้:

| ไฟล์ | แก้อย่างไร |
|---|---|
| `DESIGN.md` | เก็บทั้งสองฝ่าย · ถ้าบรรทัดเดียวกัน เขียนรวมให้ตรงโค้ดหลังทั้งสองฝ่าย merge |
| VFG | เก็บทั้งสองฝ่าย · แถว budget ที่ทั้งสองฝ่ายลด ใช้เลขที่ต่ำกว่า · ห้ามเพิ่ม |
| `messages/th.json` · `messages/en.json` | ใช้ฉบับของ `master` แล้วรัน change file ของ commit นั้นซ้ำ `node scripts/messages-edit.mjs <change>.json` · script เขียนทั้งไฟล์ใหม่ (`scripts/messages-edit.mjs:13-18`) และใส่ key ใหม่ท้าย namespace (`scripts/lib/messages-edit-core.mjs:14-22`) จึงชนเมื่อสองฝ่ายเพิ่มใน namespace เดียวกัน · change file ต้องอยู่ใน plan |
| DH · `docs/99_CHANGELOG.md` · `docs/14_UI_UX_DESIGN_SYSTEM.md` · `.impeccable/design.json` | เก็บทั้งสองหัวข้อ เรียงตามลำดับ merge |

3. conflict ในไฟล์อื่น = รั้วรั่ว → หยุด · controller หา commit ที่แตะไฟล์ของอีกสาย แล้ว revert ใน branch ของตัวเองและทำใหม่หลังคู่ merge
4. หลัง rebase: `npm run verify` ทั้งชุด + production build + ตรวจบนแอป dev เฉพาะแถว "หลัง rebase" ในตารางตรวจของ plan นั้น

**ทุก commit**
- `npm test` และ `npx tsc --noEmit` ผ่าน · งานย้ายหน้า 1 ไฟล์ 1 commit (C ข้อ 10.3)
- ห้าม formatter บนไฟล์ 2C (DH:385) · regex ใน test ที่อ่าน CRLF โดยไม่แปลงห้ามมี `\n` (C:302)
- ไม่แก้ FMG (DH:384 · C:146 I26) · ไม่เพิ่ม token และไม่แก้ `tests/design-tokens-contrast.test.ts` (A:120 I21)
- ข้อความใหม่ผ่าน `node scripts/messages-edit.mjs` เท่านั้น · คำไทยตาม `docs/19_THAI_GLOSSARY.md`

**คนทำและคนตรวจ (B10):** เลือก Codex หรือ subagent ตอนส่ง plan · controller ตรวจทุกงานเอง · ตอนสองสายเปิดพร้อมกัน ไม่ส่งงานถัดไปของสายใดจนกว่าจะตรวจงานก่อนหน้าของสายนั้นเสร็จ

**plan ที่ยังไม่เขียน:** plan ของ 2B-2…2B-5 และ 2C-3…2C-5 เขียนตอนเงื่อนไขเริ่มครบ · 2B จากส่วนนี้ · 2C จาก C/08 ข้อ 8.9 และ C ข้อ 10.3 · เลขบรรทัดของ 2C เป็นของ `5ffee76` ต้องนับใหม่ในงาน 0 (ข้อ 8.10)

### 8.3 พิสูจน์ว่าคู่ที่ทำพร้อมกันไม่มีไฟล์โค้ดร่วม

**รายการไฟล์ของ 2C ที่ใช้ตัด**

| plan | ไฟล์ | ที่มา |
|---|---|---|
| 2C-3 | 9 ไฟล์ของ FMG:35 · ไม่มีข้อความใหม่ (ตารางข้อความ C:158-171 ไม่มีแถวชุด 3) | C/05:355 |
| 2C-4 | 18 ไฟล์ของ FMG:36 + `D/assets/page.tsx:451` และ `D/asset-management/import-export/page.tsx:82` (ลบ `currentStep`, C/07:136) + `D/admin/data-quality/page.tsx:146` (เพิ่ม `severity` ใน labels ของ `DataQualityRuleForm`, C/04:262) + messages (`asset.createModeLabel` · ลบ `asset.importWizardCurrentStep`, C:170) | C/05:356 · C/07:516 |
| 2C-5 | 5 ไฟล์ของ FMG:37 + `c/ui/action-bar.tsx` (ใหม่) + `c/maintenance/maintenance-attachments.tsx` + ป้ายคำกริยา: `c/admin/IntegrationClientManager.tsx`, `D/admin/integrations/page.tsx` (ข้าง `:52`), bulk ×2, `D/disposal/page.tsx` (`bulkApprovalCopy` `:185`, `bulkExecutionCopy` `:230`), `c/master-data/supplier-form.tsx` (`confirm(` `:96`) + O11 4 หน้า + O7 `c/admin/system-settings-form.tsx:948-967` + messages (C:171) | C/05:264-266 · C/05:357 · C/08:48 · C/08:52 |

**ผลตัด (`s8-plans.mjs`)**

| คู่ | ไฟล์โค้ด 2B | ไฟล์โค้ด 2C | ร่วม (โค้ด) | ร่วม (อื่น) |
|---|---|---|---|---|
| 2B-3 ∥ 2C-3 | 14 | 9 | ไม่มี | DS · VFG · เอกสาร |
| 2B-4 ∥ 2C-3 | 14 | 9 | ไม่มี | DS · VFG · เอกสาร |
| 2B-4 ∥ 2C-4 | 14 | 21 | ไม่มี | DS · VFG · messages · เอกสาร |
| 2B-5 ∥ 2C-3 | 25 | 9 | ไม่มี | DS · VFG · เอกสาร |
| 2B-5 ∥ 2C-4 | 25 | 21 | ไม่มี | DS · VFG · messages · เอกสาร |
| 2B-5 ∥ 2C-5 | 25 | 18 | ไม่มี | DS · VFG · messages · เอกสาร |

messages และเอกสารเป็นไฟล์ร่วมที่หลีกไม่ได้ (ทุก plan ต้องเขียน DH และ changelog · 2C-4/2C-5 เพิ่มข้อความ) · B7 ยกเว้นไว้แค่ DS และ VFG · ยอมเพิ่มภายใต้กฎ rebase ข้อ 8.2 โดยต้องให้ผู้ใช้ยืนยัน (I29 · ข้อ 8.13 ข้อ 1)

**ย้ายจากข้อ 3 ของ `00-synthesis.md` เพื่อให้ผลตัดเป็น "ไม่มี"**

| งาน | จาก → ไป | เหตุ |
|---|---|---|
| `D/admin/data-quality/page.tsx` + `c/admin/asset-state-review-workspace.tsx` (O3) | 2B-5 → 2B-2 | 2C-4 แก้ `D/admin/data-quality/page.tsx:146` · 2B-5 ทำพร้อม 2C-4 ได้ · synthesis เทียบ 2B-5 กับไฟล์ component ของ 2C-4 อย่างเดียว |
| `D/admin/integrations/page.tsx` (หัวหน้า) | 2B-5 → 2B-2 | 2C-5 แก้ข้าง `:52` (C/05:264) |
| `c/admin/depreciation-policy-builder.tsx` (R-f) | 2B-5 → 2B-1 | ไฟล์ 2C ที่ย้ายแล้ว (FMG:33 "1f") · 2B แตะไฟล์ของ 2C เฉพาะตอนที่ไม่มี plan 2C เปิด (หลักเดียวกับ R-e) |
| หัวของฟอร์มงาน 2C 6 ไฟล์ที่ไม่มีปุ่มกลับ เป็น `PageHeader` (I13) | ไม่มีเจ้าของ → 2B-1 | B3 ข้อ 1 ให้ h1 เป็น 600 ทั้งระบบ · 2B-1 เป็นช่วงเดียวที่แตะไฟล์ 2C ได้โดยไม่ชน (ข้อ 8.13 ข้อ 3) · `asset-label-batch-tool.tsx`, `asset-scan-search-tool.tsx` ไม่แตะ → 2C plan 4 ใช้ `PageHeader` (I13) |

2B-2 เลือกแทน 2B-3 เพราะยังเปิดสายเดียว controller ตรวจสายเดียว · 2B-3 ก็ได้ (2C-3 ไม่แตะสองหน้านี้)

**ไฟล์ที่ 2C แก้ต่อจาก 2B (เหตุที่ 2C ต้องรอ · เกิดทีละฝ่าย จึงไม่ต้อง rebase)**

| 2B | ไฟล์ (บรรทัดที่ HEAD) | 2C ที่แก้ต่อ | ที่มา |
|---|---|---|---|
| 2B-1 | `c/audit/audit-round-form.tsx` (h1 `:134`) | 2C-3 | FMG:35 |
| 2B-1 | `c/admin/admin-user-form.tsx` (`:115-121`) · `c/admin/role-permission-form.tsx` (`:128-134`) · (`asset-label-batch-tool.tsx`, `asset-scan-search-tool.tsx` 2B ไม่แตะ · I13) | 2C-4 | FMG:36 · C/08:57 (O16) |
| 2B-1 | `c/master-data/supplier-form.tsx` (ปุ่มกลับ `:155-162`) · `c/admin/system-settings-form.tsx` (หัวตาราง `:1269`, `:1973`, `:2006`) | 2C-5 (`confirm(` `:96` · O7 `:948-967`) | C/05:266 · C/08:48 |
| 2B-2 | bulk ×2 · `c/audit/audit-findings-batch-actions.tsx` | 2C-3 | C/08:45-46 (O4, O5) |
| 2B-2 | `D/admin/data-quality/page.tsx` | 2C-4 | C/04:262 |
| 2B-2 | `D/disposal/page.tsx` · bulk ×2 · `D/audit/rounds/[id]/page.tsx` (O11 `:408` และแถบ `:474-481`) · `D/admin/integrations/page.tsx` | 2C-5 | C/05:357 · C/08:52 |
| 2B-3 | `D/assets/page.tsx` · `D/asset-management/import-export/page.tsx` · `c/assets/asset-register-table.tsx` (dialog `:697-774`) | 2C-4 | C/07:516 · C/08:42 |
| 2B-4 | `D/assets/[id]/page.tsx` (`:882`) · `D/maintenance/[id]/page.tsx` (`:105`) · `D/disposal/[id]/page.tsx` (`:170`, `:205-215`) | 2C-5 | C/08:52-53 |

**test ที่อ่านไฟล์ของทั้งสองฝ่ายในคู่** · กฎ: test 1 ไฟล์มีคนแก้ได้ฝ่ายเดียว · อีกฝ่ายต้องทำให้ผ่านโดยไม่แก้ · ถ้าจำเป็นต้องแก้ทั้งคู่ ให้เลื่อน commit นั้นไปหลังคู่ merge

| คู่ | test (นอกจาก VFG) | ใครแก้ | อีกฝ่ายต้องคง |
|---|---|---|---|
| 2B-3∥2C-3 | FMG | 2C-3 | 2B-3 ไม่แก้ FMG |
| 2B-4∥2C-3 | — | — | — |
| 2B-4∥2C-4 | `asset-operation-status-policy` · `asset-return-navigation` · `asset-scan-return-navigation` · `asset-status-help-ui` · `asset-transaction-cancellation-ui` · `dropdown-menus-ui` · `open-repair-filter` · `performance-route-instrumentation` | `asset-transaction-cancellation-ui:13` = 2C-4 (C:208) · ที่เหลือไม่มีใครแก้ | ใน `D/assets/[id]/page.tsx`: `cancelTransaction={` และ `transactionStatus === "active"` (`asset-transaction-cancellation-ui.test.ts:35-36`) · `<AssetDetailActionMenu … />` ไม่มีลูก (`dropdown-menus-ui.test.ts:15-17`) · `href={returnToHref}` (`asset-return-navigation.test.ts:46`) |
| 2B-5∥2C-3 | `audit-round-cancellation` | ไม่มีใครแก้ (C/05:339 ให้ 2C-3 คง `:107-108`) | ตัวกรองรอบที่ยกเลิกใน `D/work-center/page.tsx` และ `D/dashboard/page.tsx` (`audit-round-cancellation.test.ts:124-131`) |
| 2B-5∥2C-4 | `asset-label-print-ui` · `asset-register-filter-ui` · `asset-register-ux` · `performance-route-instrumentation` · `permission-aware-navigation` | `asset-label-print-ui:155` = 2C-4 · ที่เหลือไม่มีใครแก้ | `D/access-denied/page.tsx` ใช้ `<ActionEmptyState … tone="permission"` (`asset-register-ux.test.ts:80`) · `shouldUseEmployeeHome(user)` ใน `D/dashboard/page.tsx` (`permission-aware-navigation.test.ts:98`) |
| 2B-5∥2C-5 | `asset-label-print-ui` · `audit-round-cancellation` · `audit-scan-search-ui` · `field-primitives` · `performance-route-instrumentation` · `settings-depreciation-policy-ui` · `settings-ldap-role-ui` · `system-log-history` · `visual-consistency-ui` | `audit-scan-search-ui:182` = 2C-5 (C/09:391) · ที่เหลือไม่มีใครแก้ | ไม่แตะ `getMobileSafeBottomPaddingClasses` (`src/lib/design-system.ts:112-114`, pin `audit-scan-search-ui.test.ts:188`) · `buildLdapSyncHistoryItems` และ `ldapSyncHistory={ldapSyncHistory}` ใน `D/admin/settings/page.tsx` (`system-log-history.test.ts:73-74`) · `systemLogQuickFilters` ใน `D/admin/logs/page.tsx` (`:77`) · import `StatusBadge` + `getAssetStateTone` ใน `D/my-assets/page.tsx` (`visual-consistency-ui.test.ts:23-34`) |

### 8.4 ตัวเลขหลังแต่ละ plan

| หลัง | R1 จุด/ไฟล์ | R7 จุด/ไฟล์ | R2 จุด/ไฟล์ | `toLocaleString()` จุด/ไฟล์ | ผู้เรียก `MasterDataHeader` | B4 แบ่งหน้าแล้ว (จาก 9) | `pb-24` ซ้อน (จาก 4) |
|---|---|---|---|---|---|---|---|
| HEAD | 1/1 | 44/31 (ยอดรวม ≤44, VFG:249-254) | 10/9 | 44/17 | 11 | 0 | 4 |
| 2B-1 | 1/1 | 29/20 (budget รายไฟล์) | 10/9 | 20/8 | 3 | 1 | 4 |
| 2B-2 | 0 · budget `{}` | 17/11 | 10/9 | 19/7 | 1 | 6 | 3 |
| 2B-3 | 0 | 17/11 | 10/9 | 19/7 | 0 | 6 | 3 |
| 2B-4 | 0 | 11/8 | 10/9 | 15/4 | 0 | 6 | 0 |
| 2B-5 | 0 | 3/3 · ไม่มีตัวกรองบรรทัด `<th` | 10/9 | 8/3 | ลบ component แล้ว | 9 | 0 |

- R7 ที่เหลือ 3: `c/admin/role-permission-form.tsx:213` · `c/assets/asset-import-preview-panel.tsx:338` · `c/admin/IntegrationClientManager.tsx:547` → 2C-4 หรือ 2D (R-e) · `toLocaleString()` ที่เหลือ 8: `IntegrationClientManager.tsx` 3 · `asset-import-preview-panel.tsx` 4 · `asset-label-batch-tool.tsx` 1 → 2C-4 หรือ 2D (R-f)
- R2 ไม่ขยับทั้ง 2B: ปุ่มลอย `D/admin/users/page.tsx:177`, `D/admin/roles/page.tsx:245` เป็นของ 2D · แถบคำสั่งกลุ่ม `c/assets/asset-register-table.tsx:455` เป็นของเฟส 3 (R-q) · ไฟล์ใหม่ของ 2B ได้ 0 (VFG:203-210)
- B4: 2B-1 `departments` · 2B-2 `audit/findings` (`take: 200` `:82`) · `audit/rounds/[id]/pending` (`take: 200` `:81`) · `disposal/batches` (`take: 100` `:24`) · `maintenance/pm` (`take: 500` `:34`) · `audit/rounds` (ไม่จำกัด `:88`) · 2B-5 `admin/logs` (`take: 100` `:42`) · `admin/approvals/history` (`take: 150` `:52`) · `my-assets` (ไม่จำกัด `:62`)
- `pb-24` ซ้อน: `D/disposal/batches/[id]/page.tsx:52` (2B-2) · `D/master-data/employees/[id]/page.tsx:254` · `D/master-data/suppliers/[id]/page.tsx:150` · `D/my-assets/[id]/page.tsx:56` (2B-4) · `pb-*` ของ 4 หน้า O11 ไม่ใช่ของ 2B

budget R7 รายไฟล์ที่ 2B-1 งาน 1 เขียน (ที่ HEAD · commit ที่ย้ายตารางลบแถวของตัวเอง · ห้ามเพิ่ม):

```ts
// R7: table-header fills (bg-muted/NN, bg-accent/NN, border-border/NN) by file at d38a0ee. The commit that moves a
// table onto DataTable deletes its row. Phase 2B plan 5 drops the <th line filter; 2C plan 4 or 2D empties the rest.
const D = "src/app/[locale]/(dashboard)/"
const TABLE_HEADER_FILLS: Record<string, number> = {
  // 2B-1
  [`${D}master-data/branches/page.tsx`]: 1, [`${D}master-data/brands/page.tsx`]: 1, [`${D}master-data/categories/page.tsx`]: 1,
  [`${D}master-data/companies/page.tsx`]: 1, [`${D}master-data/departments/page.tsx`]: 1, [`${D}master-data/employees/page.tsx`]: 1,
  [`${D}master-data/locations/page.tsx`]: 1, [`${D}admin/users/page.tsx`]: 1, "src/components/master-data/supplier-list-view.tsx": 1,
  "src/components/admin/system-settings-form.tsx": 3, "src/components/assets/asset-batch-form.tsx": 3,
  // 2B-2
  [`${D}disposal/page.tsx`]: 2, [`${D}disposal/batches/page.tsx`]: 2, [`${D}disposal/batches/[id]/page.tsx`]: 2,
  [`${D}audit/findings/page.tsx`]: 1, [`${D}audit/rounds/page.tsx`]: 1, [`${D}audit/rounds/[id]/page.tsx`]: 1,
  [`${D}audit/rounds/[id]/pending/page.tsx`]: 1, [`${D}maintenance/page.tsx`]: 1, "src/components/admin/asset-state-review-workspace.tsx": 1,
  // 2B-4
  [`${D}assets/[id]/page.tsx`]: 2, [`${D}master-data/employees/[id]/page.tsx`]: 3, "src/components/master-data/supplier-purchase-documents.tsx": 1,
  // 2B-5
  [`${D}admin/logs/page.tsx`]: 1, [`${D}admin/roles/page.tsx`]: 2, [`${D}admin/storage/page.tsx`]: 3,
  [`${D}my-assets/page.tsx`]: 1, "src/components/reports/responsive-report-list.tsx": 1,
  // 2C plan 4 or 2D (2C batch 4 files)
  "src/components/admin/role-permission-form.tsx": 1, "src/components/assets/asset-import-preview-panel.tsx": 1,
  "src/components/admin/IntegrationClientManager.tsx": 1,
}
```

### 8.5 plan 2B-1 · ของกลาง ข้อมูลหลัก ผู้ใช้ เมนูข้าง หัวฟอร์ม

branch `feat/ui-phase2b` · รอ: ไม่มี · ทำพร้อม: ไม่มี · ปลด: 2B-2 · ส่งให้ 2C: ปุ่มกลับ O16 ของ 2 ไฟล์ชุด 4 (2C-4) · `TabNav` ที่รับ `onSelect` (R-g) สำหรับ O7 (2C-5) · หัวของ `asset-scan-search-tool.tsx`, `asset-label-batch-tool.tsx` ให้ 2C plan 4 ใช้ `PageHeader` (I13 · เขียนลง DH)

**ไฟล์ (53 ไฟล์โค้ด + ลบ 9 + `messages/{th,en}.json`)** · บรรทัด = `ArrowLeft` หรือ `<Link` ที่ HEAD

| กลุ่ม | ไฟล์ | จำนวน |
|---|---|---|
| primitive ใหม่ (ชื่อไฟล์ตามส่วนที่ถือ API) | `c/ui/page-header.tsx` (`PageHeader`, `PageBackLink` · I1) · `data-table.tsx` (+ `TableEmptyRow`, หัวเรียงลำดับ `aria-sort` · ไม่มี `density` I3) · `data-table-scroll.tsx` (`DataTableScrollArea` · I4) · `filter-select.tsx` (I6) · `filter-chips.tsx` (`FilterChipList` · I7) · `row-actions.tsx` (I5) · `tab-nav.tsx` (I9) · `stat-strip.tsx` · `key-value-list.tsx` · `src/lib/list-pagination.ts` (`LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage`) | 10 |
| primitive เดิม | `c/ui/pagination.tsx` (R-k) · `c/ui/content-panel.tsx` (หัวแผง แถวคั่น) · `c/ui/clickable-table-row.tsx` (`group/row`, R-j · `:56`) · `c/ui/filter-panel.tsx` (`FilterFormActions`) · `c/ui/dropdown-menu.tsx` (`export` 2 ค่าคงที่ `:16`, `:22`) | 5 |
| โครงและเมนู | `c/layout/sidebar.tsx` (B1 · `:115-144`) · `c/master-data/master-data-layout.tsx` (`MasterDataSearch` `:42-80` ช่องดิบ `:63` → `SearchField` + `Button` O20 · markup ข้อ 6.3.5 I8 · `MasterDataHeader` `:5-40` เป็นตัวห่อบาง R-h · I2) | 2 |
| หน้ารายการ | `D/master-data/{branches,brands,categories,companies,departments,employees,locations,suppliers}/page.tsx` · `c/master-data/supplier-list-view.tsx` · `D/admin/users/page.tsx` | 10 |
| ปุ่มกลับ 15 (O16) + "ยกเลิก" 3 (B2) + h1 600 ในไฟล์เดียวกัน | `c/admin/admin-user-form.tsx:119` · `c/admin/role-permission-form.tsx:132` · `c/assets/asset-form.tsx:825` · `c/master-data/asset-model-form.tsx:230` · `c/master-data/branch-form.tsx:107` · `brand-form.tsx:85` · `category-form.tsx:117` · `company-form.tsx:100` · `department-form.tsx:102` · `employee-form.tsx:163` · `location-form.tsx:122` · `supplier-form.tsx:160` · `c/assets/asset-component-manager.tsx:271` · `D/disposal/new/page.tsx:58` · `D/disposal/batch/new/page.tsx:26` · ยกเลิก `D/maintenance/new/page.tsx:52` · `D/maintenance/pm/new/page.tsx:38` · `D/maintenance/pm/[id]/edit/page.tsx:34` | 18 |
| ฟอร์มงานของ 2C ที่ไม่มีปุ่มกลับ: หัวเป็น `PageHeader` ไฟล์ละ 1 commit (I13) | `c/asset-operations/checkin-form.tsx:296` · `checkout-form.tsx:394` (หัวใน `OperationShell`) · `transfer-form.tsx:125` · `bulk-move-form.tsx:85` · `c/audit/audit-round-form.tsx:134` · `c/assets/asset-batch-form.tsx:610` · **ไม่แตะ** `c/assets/asset-label-batch-tool.tsx:293`, `c/assets/asset-scan-search-tool.tsx:110` (2C plan 4 ใช้ `PageHeader`) | 6 |
| ไฟล์ 2C ที่ย้ายแล้ว (R-e, R-f) | `c/admin/system-settings-form.tsx` หัวตาราง `:1269`, `:1973`, `:2006` · `c/assets/asset-batch-form.tsx` หัวตาราง `:886`, `:979`, `:1037` (นับในกลุ่มบนแล้ว) · `c/admin/depreciation-policy-builder.tsx` `toLocaleString()` `:302` และ `formatMoney` ประจำไฟล์ `:437` | 2 |
| ลบ | wrapper `c/master-data/{branch,category,company,department,employee,location,supplier,brand,asset-model}-delete-button.tsx` ลบใน commit ที่ผู้เรียกตัวสุดท้ายย้ายไป `RowActions` (I5) | 9 |

`c/master-data/master-data-delete-button.tsx` ไม่อยู่ในรายการแก้: คงไว้ไม่มีผู้เรียก (pin `tests/confirm-dialog-ui.test.ts:36` · ลบใน 2D · I5) · ลบใน B5 ใช้ hook ตัวเดียวกันใน `RowActions` (`deleteAction`) · `c/master-data/asset-delete-button.tsx` ไม่มีผู้เรียกใน `src` และ `tests` อยู่แล้ว ปล่อยให้ 2D

**งาน** (ตามข้อ 10.3 · ใช้แทนตารางร่างเดิม) · ทุกงานจบด้วย `npm test` และ `npx tsc --noEmit` · ห้ามรัน formatter (ไฟล์ 2C 21 ไฟล์ในงาน 22–24) · commit ที่ย้ายตารางลบแถว R7 ของตัวเองใน VFG และลดแถว LFG ของไฟล์นั้น แล้วเพิ่ม path ใน `MIGRATED_LIST_FILES` ถ้า 2B ไม่แตะไฟล์อีก · ผู้ทำเลือกตอนส่ง plan (B10) · controller รีวิวทุกงาน

| # | งาน | ส่วน | ต้องรอ | test ที่แก้ (A) หรือเพิ่ม (B) |
|---|---|---|---|---|
| 0 | (controller) ตรวจฐานตามข้อ 8.10 ข้อ 1–7 · รัน `p2b-spec/work/10/recount10.mjs` และ `work/09/count09.mjs` เทียบข้อ 10.8 · baseline `npm test` (DH:467: 1,812 · ผ่าน 1,811 · ข้าม 1) · ภาพก่อนแก้ `.superpowers/sdd/screenshots/ui-phase2b-plan1/before/` | 8.10 · 10.8 | — | — |
| 1 | guard: VFG R7 รายไฟล์ (`TABLE_HEADER_FILLS` 31 แถว ข้อ 8.4) · สร้าง LFG (`BUDGETS` ตาราง C ข้อ 10.4 + LB1 `0→1` 2 แถว · `KEEP` ข้อ 9.4.3 + I11 + I14 · `MIGRATED_LIST_FILES = []` · test ตัวอย่างของตัวนับ) | 8.4 · 9.2–9.4 · I15 | 0 | A: VFG:249-254 · B: LFG |
| 2 | เมนูข้าง B1 (`c/layout/sidebar.tsx:115-166`, import `:7-40`, `depth` `:340`, `:347`, `:373-378`, `:389`) · ลบ key | 4.2 · I27 | 0 | B: `tests/sidebar-menu-structure.test.ts` (ข้อ 4.11) · ผ่านต่อ: `dashboard-shell-theme`, `navigation-active` (fixture `:49`), `permission-aware-navigation`, `my-assets-route-ui:35-45`, `integration-api-client-admin:117-122`, `sheet-drawers-ui:47-60`, `mobile-field-navigation-ui:59-80` |
| 3 | `c/ui/page-header.tsx` (`PageHeader`, `PageBackLink`) · `MasterDataHeader` เป็นตัวห่อบาง | 3.3 · 4.3 · I1 · I2 | 1 | A: `breadcrumbs-ui.test.ts:38-40` (R-i: นับ `<Breadcrumbs` และ `breadcrumbs={[…]}` ข้าม `page-header.tsx` · คง 11/8) · `asset-register-filter-ui.test.ts:112-119` (string ของ I1 + `compactOnMobile \? "mb-4 md:mb-6" : "mb-6"`) · `supplier-adaptive-ui.test.ts:58` (`href=\{createHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}`) · B: `list-primitives-ui` หัวหน้า |
| 4 | `c/ui/data-table.tsx` (ทุก part · `TableEmptyRow` · ไม่มี `density`) · `c/ui/data-table-scroll.tsx` · `c/ui/clickable-table-row.tsx:56` · key `common.tableScrollHint` | 3.4–3.7 · I3 · I4 | 1 | B: `list-primitives-ui` ตาราง (ไม่มี `group-data-[density` และ `data-density`) · ผ่านต่อ: `clickable-table-row-navigation:6-18`, `asset-register-ux:95-100`, `:169-175` |
| 5 | ขยาย `c/ui/pagination.tsx` · `src/lib/list-pagination.ts` (`LIST_PAGE_SIZES`, `parseListPage`, `listPageWindow`, `lastListPage`, `appendListPage`) · key 2 ตัว | 3.8 · 5.9.1 · I21 · I33 | 4 | B: `list-primitives-ui` แบ่งหน้า · `tests/list-pagination.test.ts` · ผ่านต่อ: `asset-register-building-blocks-ui:8-17` (ไม่แก้) |
| 6 | `c/ui/filter-select.tsx` · `c/ui/filter-chips.tsx` · `FilterFormActions` ใน `c/ui/filter-panel.tsx` | 3.9–3.10 · 6.3.1–6.3.3 · I6 · I7 | 1 | B: `list-primitives-ui` ตัวกรอง · `tests/list-filters-ui.test.ts` ข้อ 2 |
| 7 | `c/ui/row-actions.tsx` · `export` 2 ค่าคงที่ใน `c/ui/dropdown-menu.tsx:16`, `:22` · key `common.moreActionsFor` | 3.11 · I5 | 4 | B: `tests/row-actions-ui.test.ts` · ผ่านต่อ: `menu-primitives-ui:60-103`, `dialog-trigger-handles`, `dropdown-menus-ui` |
| 8 | `c/ui/tab-nav.tsx` | 3.12 · I9 | 1 | B: `list-primitives-ui` แท็บ (มี `{...navProps}` หรือ `...props` บน `<nav` · ไม่มี `fullBleed`) |
| 9 | `c/ui/stat-strip.tsx` | 3.13 | 1 | B: `list-primitives-ui` ตัวเลข |
| 10 | `c/ui/key-value-list.tsx` | 3.14 | 1 | B: `list-primitives-ui` ค่า |
| 11 | `c/ui/content-panel.tsx` (`divided`, `flush`, `ContentPanelRows`) | 3.15 | 1 | B: `list-primitives-ui` แผง |
| 12 | `MasterDataSearch` → `SearchField` + `Button` (หน้าตาเปลี่ยนทันที 6 หน้า) | 3.16 · 6.3.5 · I8 | 3 | B: `list-primitives-ui` ค้นหา · ผ่านต่อ: `operational-return-navigation:69`, `:83` · `audit-pending-mobile-ux:14-15` |
| 13 | `D/master-data/branches/page.tsx` (DataTable · `TableEmptyRow` · `Pagination` + redirect เกินหน้า · ตัวกรอง · `RowActions` + ลบ `branch-delete-button.tsx` · `StatStrip` · `PageHeader` · `formatCount`/`Nil`/`tag`) | 5.3 · 6.5 · I5 · I21 | 2–12 | B: สร้าง `tests/list-pages-ui.test.ts` · `list-filters-ui` ข้อ 5–6 เพิ่มไฟล์ |
| 14 | `D/master-data/brands/page.tsx` (+ ลบ `brand-delete-button.tsx`, `asset-model-delete-button.tsx`) | 5.3 · I11 | 13 | A: `master-data-brand-supplier-ui.test.ts:9-10` · ผ่านต่อ `:11`, `:22`, `:40`, `:44`, `:80` |
| 15 | `D/master-data/categories/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 16 | `D/master-data/companies/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 17 | `D/master-data/departments/page.tsx` (+ B4 · ลบ wrapper) | 5.3 · 5.9 | 13 | B: `list-pages-ui` (`parseListPage`, ไม่มี `take: \d+`) |
| 18 | `D/master-data/employees/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 19 | `D/master-data/locations/page.tsx` (+ ลบ wrapper) | 5.3 | 13 | — |
| 20 | `D/master-data/suppliers/page.tsx` + `c/master-data/supplier-list-view.tsx` (+ ลบ wrapper) · 1 commit | 5.3 · 6.5 | 13 | A: `supplier-adaptive-ui.test.ts:16`, `:24`, `:29`, `:37-38`, `:46` (ตามข้อ 9.5) และย้าย `:58` ไปอ่านหน้า suppliers · ผ่านต่อ `:50-55` |
| 21 | `D/admin/users/page.tsx` (`next` อย่างเดียว · ไม่มี ⋯ · ปุ่มลอยคงไว้ R-q) | 5.3 | 13 | — |
| 22 | ปุ่มกลับ 15 + "ยกเลิก" 3 + h1 600 ของไฟล์เดียวกัน · 5 commit (ฟอร์มข้อมูลหลัก 9 · `admin-user-form` + `role-permission-form` (แตะแค่ `:112-134`, I32) · `asset-form` + `asset-component-manager` · `D/disposal/new` + `D/disposal/batch/new` · `D/maintenance/new`, `pm/new`, `pm/[id]/edit`) · คง `onClick={confirmNavigation}` ของ supplier | 4.4.2 · 4.5 · I1 · I19 | 3 | A: `disposal-route-structure.test.ts:33` · ผ่านต่อ: ตารางข้อ 4.5.6 · `supplier-form-ui:30-35` · ลิงก์ยกเลิกท้ายฟอร์ม 8 ไฟล์ · `asset-component-manager.test.ts` |
| 23 | หัว 5 ฟอร์มงานเป็น `PageHeader` (`checkin`, `checkout`, `transfer`, `bulk-move`, `audit-round-form`) ไฟล์ละ 1 commit | 4.4.6 · I13 | 3 | LFG LH1 |
| 24 | ไฟล์ 2C ที่ย้ายแล้ว ไฟล์ละ 1 commit: `system-settings-form` (`<thead` `:1269`, `:1973`, `:2006` + `Head` `:2669-2671` · ไม่แตะ `:948-967`) · `asset-batch-form` (`<thead` `:886`, `:979`, `:1037` + h1 `:610` เป็น `PageHeader`) · `depreciation-policy-builder` (`formatCount` แทน `:302` · ลบ `formatMoney` ประจำไฟล์ `:437`) | 9.2.1 · R-e · R-f · I12 · I13 | 4 | VFG R7 6 จุด · ผ่านต่อ: `asset-batch-form-layout:5-60`, `settings-depreciation-policy-ui`, `settings-tab-persistence-ui:5-13`, `settings-ldap-role-ui` |
| 25 | (controller) `npm run verify` + production build (`next build` + `next start`) + ตรวจบนแอป dev (ข้อ 10.5) | 10.5 | 24 | — |
| 26 | เอกสาร repo (ข้อ 10.6 แถว 2B-1) | 10.6 | 25 | — |
| 27 | (controller) ตัวเลข verify และผลตรวจลง DH/changelog · wiki (ปิดข้อ 28) · memory | 10.6 | 26 | — |

ราว 36 commit · ไฟล์โค้ด 53 (ใหม่ 10 · ของกลางเดิม 5 · เมนูและ layout 2 · หน้ารายการ 10 · หัวฟอร์มและหน้า new 18 · ฟอร์มงาน 6 · ไฟล์ 2C ที่ย้ายแล้ว 2) + ลบ 9 + `messages/{th,en}.json` · R7 44 → 29 · LFG ตามตาราง C ข้อ 10.4

**ห้ามแตะ:** ทุกแถวของข้อ 8.11 · ใน `system-settings-form.tsx` แตะแค่ `:1269`, `:1973`, `:2006` (ไม่แตะ `:948-967`) · ใน `admin-user-form.tsx` และ `role-permission-form.tsx` แตะแค่หัว (`:112-121`, `:125-134`) · ใน 6 ฟอร์มงานแตะแค่หัว · ไม่แตะ 2 เครื่องมือ (`asset-label-batch-tool.tsx`, `asset-scan-search-tool.tsx` · I13)

**ตรวจบนแอป dev** (บน `next start` ของ production build · ไทยเป็นหลัก อังกฤษ 1 รอบ · คีย์บอร์ด · forced colors · reduced motion · axe 0 · ไม่บันทึกข้อมูล · เทียบภาพก่อนหลัง · รายการเต็มที่ใช้ตรวจอยู่ข้อ 10.5)

| หน้า | จอ | ดูอะไร |
|---|---|---|
| เมนูข้าง | 1440 กางและพับ · 1024 · 375 (sheet) | "ทะเบียนทรัพย์สิน" รายการแรกของหมวดทรัพย์สิน คลิกเดียวถึง `/th/assets` · ส่งมอบ/รับคืน 2 คลิก · ไม่มีชั้นที่ 3 · ไอคอนไม่ซ้ำตอนพับ · แถว active ถูกที่ `/th/assets/<id>` และ `/th/asset-management/checkout` · sheet คืนโฟกัส |
| ข้อมูลหลัก 8 หน้า · `/th/admin/users` | 1440 · 768 · 375 | h1 600 · แผงตัวกรองที่มีป้าย `lg` 40 (มือถือ 44) อยู่ใน `FilterPanel` มีกรอบ · ช่องค้นหา `MasterDataSearch` (users, departments) ไม่มีกรอบ 36 (I23) · หัวตารางพื้นขาว 13/500 สีจาง ไม่ uppercase มุม 12 · แถวราว 46 · "แก้ไข" + ⋯ → "ลบ" → ยืนยันเดิม (กดยกเลิก) · คลิกแถวไปหน้าแก้ไข · คลิก ⋯ ไม่ทะลุแถว · มือถือเลื่อนแนวนอนมีตัวบอก (B6) · แบ่งหน้า ช่วงแถว 25/50/100 · แถวว่างตอนค้นไม่เจอ + "ล้างตัวกรอง" · StatStrip ไม่มีพื้นสี · ตัวเลข th-TH · รหัสคลิกเดียวเลือกทั้งรหัส |
| `/th/master-data/departments` | 1440 · 375 | B4: ยอดรวมเท่าจำนวนแถวก่อนแก้ · ไปหน้า 2 → แก้ไข → "กลับ" ได้หน้า 2 ขนาดเดิม |
| หน้าแก้ไข/สร้างทั้ง 18 จุด | 1440 · 375 | ปุ่มกลับ outline + ลูกศรซ้าย · มือถือไอคอน 44 · พา `returnTo` · supplier ยังถามก่อนทิ้งที่แก้ |
| ส่งมอบ · รับคืน · โอน · ย้ายหลายรายการ · เพิ่มเป็นชุด · รอบตรวจนับใหม่ | 1440 | หัวเป็น `PageHeader` h1 600 · ความกว้างฟอร์มเดิม · `OperationShell` ยังเป็นการ์ด (I13) · พิมพ์ป้ายและสแกนค้นหาไม่เปลี่ยน |
| ตั้งค่า · เพิ่มเป็นชุด · ตัวสร้างนโยบายค่าเสื่อม | 1440 · 375 | หัวตารางใหม่ 6 จุด · อายุเดือนในตัวอย่าง th-TH · แถวแท็บตั้งค่าเหมือนเดิม (O7) |
| หลัง rebase | — | ไม่มี (สายเดียว) |

### 8.6 plan 2B-2 · ตัดจำหน่าย ตรวจนับ ซ่อมบำรุง + data-quality และ integrations

branch `feat/ui-phase2b-plan2` · รอ: 2B-1 · ทำพร้อม: ไม่มี · ปลด: **2C-3** และ 2B-3

**ไฟล์ (18 ไฟล์โค้ด + messages ถ้ามีข้อความใหม่)**

| # | ไฟล์ | เปลี่ยน (บรรทัดที่ HEAD) |
|---|---|---|
| 1 | `D/disposal/page.tsx` | แท็บขั้น → `TabNav` · ฟอร์มกรอง 2 ชุด (`:281` จอใหญ่ · `:390` มือถือ) → ชุดเดียว · ⋯ ใช้ `RowActions` เปิด `DisposalDecisionButton` / `DisposalExecutionButton` ผ่าน handle (`:426-427`, R-m) · R7 `:363` ×2 · คงชื่อ `bulkApprovalCopy` `:185` และ `bulkExecutionCopy` `:230` (2C-5 เพิ่ม key ในนั้น) |
| 2 | `c/disposal/disposal-pagination.tsx` | → `Pagination` กลาง (ลบไฟล์ได้ · ไม่อยู่ใน FMG) |
| 3 | `c/disposal/disposal-bulk-approval.tsx` | ส่วนรายการเท่านั้น: checkbox `:456`, `:499` → `checkboxVariants` · ปุ่ม toolbar `:421-423` → `Button` · spinner `:424` → `busy` · ไม่แตะ dialog `:533-563` |
| 4 | `c/disposal/disposal-bulk-execution.tsx` | ส่วนรายการเท่านั้น: checkbox `:689`, `:738` · trigger toolbar `:644` · ไม่แตะ dialog `:812-986` และ `SharedValueFields` |
| 5 | `D/disposal/batches/page.tsx` | B4 แทน `take: 100` `:24` · ลิงก์กลับ `:31` · R7 `:50` ×2 |
| 6 | `D/disposal/batches/[id]/page.tsx` | `pb-24` `:52` · ปุ่มกลับ `:60` · `BatchMetric` `:108` → `StatStrip` · `BatchInfo` `:109` → `KeyValueList` · R7 `:95` ×2 |
| 7 | `D/audit/findings/page.tsx` | `MasterDataHeader` → `PageHeader` (ไอคอน `Plus` บนปุ่มกลับหายที่นี่ · I2) · B4 แทน `take: 200` `:82` (กล่องตัวเลขยังนับยอดเต็ม `:91-94`) · `ResolutionMetric` `:517` → `StatStrip` (คง `aria-current`) · ลิงก์ตัวกรอง → `TabNav` · ชิปรอบ/ประเภท (หารอบด้วย `findUnique` อ่านอย่างเดียว · key `auditFinding.activeFilters` · I24) · ปุ่มในแถวคงในเซลล์ (I21) · R7 `:381` |
| 8 | `c/audit/audit-findings-batch-actions.tsx` | checkbox `:109` · ปุ่ม `:86` `bg-success` → `default` · `:95` → `danger` (R-c) · spinner `:88`, `:97` → `busy` · ไม่แตะ `ConfirmTextDialog` |
| 9 | `c/audit/audit-finding-review-actions.tsx` | trigger ในแถว `:113`, `:123` เท่านั้น · dialog `:212`, `:336`, `:445` เป็นของ 2C (O21) |
| 10 | `D/audit/rounds/page.tsx` | `QuickFilterBar` `:565` คงชื่อเป็นตัวห่อบางของ `TabNav` (R1 `:597` หาย · แก้แค่ `tests/audit-rounds-ux.test.ts:39` · I20) · B4 (เดิมไม่จำกัด `:88` · ตัดหน้าในหน่วยความจำ query เดิม · clamp แทน `redirect()` · I21) · R7 `:419` |
| 11 | `D/audit/rounds/[id]/page.tsx` | หัวและส่วนรายการ · `AuditRoundResultPagination` `:861` → `Pagination` · ไอคอนกลับในแถบล่าง `:479` (Download → ลูกศรซ้าย, B2) · R7 `:697` · ไม่แตะ `:408` และ `MobileActionBar` ส่วนอื่น |
| 12 | `D/audit/rounds/[id]/pending/page.tsx` | B4 แทน `take: 200` `:81` · ⋯ เปิด `AuditMarkNotFoundButton` ผ่าน handle (`:230`, `:290`) · ลิงก์ข้อความ `:127-129` → ปุ่มกลับ · R7 `:188` |
| 13 | `D/maintenance/page.tsx` | R7 `:244` · ตัวแบ่งหน้า · ชิป "เฉพาะทรัพย์สินนี้" ลบแค่ `assetId` และฟอร์มส่ง `pageSize` (I24) |
| 14 | `c/maintenance/maintenance-pagination.tsx` | → `Pagination` (คง `aria-live` ตาม R-k) |
| 15 | `D/maintenance/pm/page.tsx` | B4 แทน `take: 500` `:34` · ปุ่มกลับใหม่ `` back={<PageBackLink href={`/${locale}/maintenance`} label={tCommon("back")} />} `` · ลบไอคอนใน h1 `:42-43` (I25) · ปุ่มในแถวคงในเซลล์ (I21) |
| 16 | `D/admin/data-quality/page.tsx` | หัวหน้า (`:39`) · ไม่แตะ labels ของ `DataQualityRuleForm` `:146-…` (2C-4 เพิ่ม `severity`) |
| 17 | `c/admin/asset-state-review-workspace.tsx` | `Filter` `:238` → `FilterSelect` (O3) · R7 `:174` · `toLocaleString()` 1 · ไม่แตะ `asset-state-review-dialog.tsx` |
| 18 | `D/admin/integrations/page.tsx` | หัวหน้าอย่างเดียว (`:17`) · ไม่แตะ object `labels` (2C-5 เพิ่ม `confirmScopeExpansionAction` ข้าง `confirmScopeExpansion` `:52`) |

**งาน:** 0 (controller) → ไฟล์ละ 1 commit ตามลำดับตาราง (3 และ 4 ก่อน 1 ได้ เพราะ `D/disposal/page.tsx` ส่ง prop ให้) → verify (controller) → เอกสาร → wiki (controller)

**สถานะไฟล์ร่วมที่ส่งให้ 2C-3** (budget ใน FMG ไม่เปลี่ยน เพราะ 2B ไม่แก้ FMG · เป็นค่าสูงสุดจึงผ่าน · 2C-3 ลดแถวเองตอนแตะไฟล์):

| FMG | แถว | budget | หลัง 2B-2 | จุดที่เหลือ (HEAD) |
|---|---|---|---|---|
| GF7 `OLD_MARKUP` | `:282` bulk-approval | 3 | 1 | dialog `:552` |
| GF7 | `:283` bulk-execution | 5 | 3 | dialog `:872`, `:903`, `:932` |
| GF7 | `:285` audit-findings-batch-actions | 1 | 0 | — |
| GB1 `LOADER2` | `:307` audit-finding-review-actions | 2 | 0 | — (comment ยังอ้าง `:102`, `:112` ของ `5ffee76`) |
| GB1 | `:314` bulk-approval | 4 | 3 | `:546`, `:547`, `:559` |
| GB1 | `:315` bulk-execution | 2 | 2 | `:971`, `:993` (ของ 2C) |
| GB1 | `:318` audit-findings-batch-actions | 2 | 0 | — |
| GF5 `CONSTRAINT_FLOORS` | `:236`, `:255`, `:256` | `[1,3,0]` · `[0,1,0]` · `[5,2,1]` | ห้ามลด | อยู่ใน dialog ทั้งหมด |

**ห้ามแตะ:** ข้อ 8.11 · dialog ในไฟล์ร่วม · `D/audit/rounds/[id]/page.tsx:408` และแถบล่าง (ยกเว้นไอคอน `:479`) · labels ของ `DataQualityRuleForm` และ `IntegrationClientManager` · ไม่มีหน้า route ใหม่ (GL2 FMG:660-672)

**ตรวจบนแอป dev**

| หน้า | จอ | ดูอะไร |
|---|---|---|
| `/th/disposal` | 1440 · 768 · 375 | TabNav ขั้น (เส้นใต้ ตัวนับ `aria-current`) · ฟอร์มกรองชุดเดียวทุกขนาด · ⋯ → พิจารณา/ดำเนินการ เปิด dialog เดิม ปิดโดยไม่บันทึก โฟกัสกลับ ⋯ · checkbox เป้า 44 · ปุ่ม "ตรวจและอนุมัติ" มี spinner แบบ `busy` (ไม่ส่งจริง) |
| `/th/disposal/batches` · `/th/disposal/batches/<id>` | 1440 · 375 | แบ่งหน้าแทนเพดาน 100 · เนื้อไม่ถูกแถบล่างบังหลังลบ `pb-24` |
| `/th/audit/findings` | 1440 · 1024 · 375 | ยอดรวมของตัวแบ่งหน้า = ยอดในกล่องตัวเลข · StatStrip ที่เป็นตัวกรองคง `aria-current` · ชิปบอกรอบและประเภทที่กรองอยู่ (I24) · ตาราง 13 คอลัมน์เลื่อนได้ · "อนุมัติที่เลือก" สีหลัก "ปฏิเสธที่เลือก" `danger` (เปิด dialog แล้วยกเลิก) |
| `/th/audit/rounds` · `/th/audit/rounds/<id>` · `…/pending` | 1440 · 768 · 375 | TabNav ตัวกรองด่วน ตัวนับไม่ใช้พื้นโปร่ง · แบ่งหน้ารอบ (เดิมไม่จำกัด) และรายการค้าง (เดิม 200) · ⋯ → "ไม่พบ" เปิด dialog แล้วยกเลิก · แถบล่างของรอบเปลี่ยนแค่ไอคอนกลับ |
| `/th/maintenance` · `/th/maintenance/pm` | 1440 · 375 | ตัวแบ่งหน้ากลาง (25/50/100 · `aria-live`) · PM แบ่งหน้าแทนเพดาน 500 · PM มีปุ่มกลับไป `/th/maintenance` และ h1 ไม่มีไอคอน (I25) · PM ยังมีแถบล่าง (navigation) · ชิป "เฉพาะทรัพย์สินนี้" ลบแล้วตัวกรองอื่นไม่หาย (I24) |
| `/th/admin/data-quality` · `/th/admin/integrations` | 1440 · 375 | หัวหน้าใหม่ · ตัวกรองของ workspace · เนื้อ `IntegrationClientManager` ไม่เปลี่ยน |
| เวลาโหลด 6 หน้าที่เพิ่ม query นับ | — | เทียบก่อนหลังบน DB dev · ช้าชัดเจนให้บันทึกเป็นความเสี่ยงใน DH (ห้ามเพิ่ม index, B4) |
| หลัง rebase | — | ไม่มี (สายเดียว) |

### 8.7 plan 2B-3 · ทะเบียนทรัพย์สิน

branch `feat/ui-phase2b-plan3` · รอ: 2B-2 · ทำพร้อม: 2C-3 · ปลด: **2C-4** (เมื่อ 2C-3 merge ด้วย) และ 2B-4

**ไฟล์ (14 ไฟล์โค้ด + messages ถ้ามีข้อความใหม่)**

| # | ไฟล์ | เปลี่ยน (บรรทัดที่ HEAD) |
|---|---|---|
| 1 | `c/assets/asset-register-table.tsx` | ใช้ `DataTableBody`, `ClickableTableRow`, `TableEmptyRow`, `DataTableFoot` และ `DataTableHead sort` เฉพาะคอลัมน์กลาง โดยคงสัญญา DS:500-510 (`table-fixed`, `<colgroup>`, คอลัมน์หลักและคำสั่งติดขอบ) · `DataTable` ไม่มี `density` · class ประจำไฟล์ (I3): `headerClasses = "border-b border-border bg-surface px-3 py-2.5 text-left align-bottom text-meta font-medium whitespace-nowrap text-faint-foreground"` · `cellClasses = "border-b border-border-soft px-3 py-2 align-top"` · ช่องคำสั่ง `cn(cellClasses, "pl-1.5 pr-2")` · คง `isOverflowing` + `asset.tableScrollHint` (`:202-213`, `:519-526` · I4) · checkbox `:545`, `:616` (O1) · แถวว่าง → `TableEmptyRow` · `Nil` `:644` · `formatMoney` `:660` · `Pagination` `:683` · ลบเงา `:152` (R-j) · คง `px-3 py-2` (แถวจริง 56 เพราะรูปย่อ 40 · B3 ข้อ 3 · I26) · คอลัมน์ "CODE - ชื่อ" ไม่ห่อ `tag` (เฟส 3 · I26) · key `asset.noCustodian` (I26) · ไม่แตะ dialog `:697-774` และแถบคำสั่งกลุ่ม `:455` (R-q) |
| 2 | `c/assets/asset-register-row-actions.tsx` | `AssetRegisterRowActions` คงไฟล์และชื่อ export เป็นตัวห่อ client ของ `RowActions` (I5): `next` (`getRowNextAction` · ส่งเฉพาะจอใหญ่) · `groups` (`t("transactionMenu")` + รายการธุรกรรม `link`/`unavailable` ตาม `reasonOf` · แก้ไข · คัดลอก) · `` deleteAction={permissions.canDelete ? { endpoint: `/api/assets/${assetId}` } : undefined} `` (คงเงื่อนไขสิทธิ์ลบเดิม · ข้อ 7.9) · `menuLabel={t("rowActionsMenu", { assetTag })}` · `menu={variant === "desktop" ? "dropdown" : "sheet"}` · ลบ sheet ⋯ ที่เขียนเอง `:160-243` และ `sheetItemClasses` · หัว sheet ของ primitive เป็น `<span className="tag font-medium">{code}</span>` (R-p) |
| 3 | `c/assets/asset-register-mobile-list.tsx` | checkbox `:93` |
| 4 | `c/assets/asset-register-toolbar.tsx` | ไม่มีการ์ดตั้งแต่ md · ช่องและปุ่ม 36 (B3 ข้อ 4) · คงแถบติดบน `:36` (VFG:109-115) · select `:41`, `:53`, `:65` → `FilterSelect hideLabel fieldSize="md"` (คง `key`, `defaultValue`, `onChange` · I6) |
| 5 | `c/assets/asset-register-search-field.tsx` | `:77` → `SearchField onClear` · คง debounce 400ms, IME, Enter (R-l, DS:502) |
| 6 | `c/assets/asset-register-filter-sheet.tsx` | เนื้อใน `:90-180` · `LabeledSelect` `:194` (เรียก 7 ครั้ง) → `FilterSelect` 7 จุดด้วย `labelAction={<AssetStateHelpPopover … />}` (สถานะ สภาพ) + `key={value}` + `defaultValue` + `onChange` · ลบ `function LabeledSelect` (LFG LF1 KEEP 0 · I6) · ลบ `closeLabel` `:92`, `pr-14` `:96` · spinner `:176` · `busy` บนปุ่ม "แสดง N รายการ" · ปุ่มช่วยเหลือ 24px (I26) |
| 7 | `c/assets/asset-register-status-tabs.tsx` | → `TabNav` เส้นใต้ทุกขนาด เป้า 44 บนมือถือ (B3 ข้อ 5) · คงแถบเต็มขอบด้วย `className="-mx-4 mb-2 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:mb-3 md:px-0"` + `data-asset-status-tabs` (ไม่มี `fullBleed` · I9) |
| 8 | `c/assets/asset-register-filter-chips.tsx` | ตัวห่อ server ของ `FilterChipList` (`c/ui/filter-chips.tsx` · I7) |
| 9 | `c/assets/asset-register-sort-menu.tsx` · `-column-picker.tsx` · `-export-menu.tsx` | trigger → `Button` (ปุ่มเรียง `ghost` + `md:` ทับ · I26) (3 ไฟล์ 3 commit) |
| 10 | `D/assets/page.tsx` | `MasterDataHeader compactOnMobile` → `PageHeader` (คง `mb-4 md:mb-6` · I32) · ตัวนับ → `formatCount` · ไม่แตะ `:451` (2C-4 ลบ) |
| 11 | `D/asset-management/import-export/page.tsx` | หัว `:32-35` · ไม่แตะ `:82` (2C-4 ลบ) |
| 12 | `src/lib/asset-register-columns.ts` | ความกว้างตาม I26: `actions` 172 + `companyBranch` 116 (ชุด operations และ accounting 1,116 ≤ 1,117 · `tests/asset-register-view-model.test.ts:164` 1094 → 1116) |

**ตัวเลข:** R7 ไม่เปลี่ยน เพราะหัวทะเบียนเป็น `bg-muted` ทึบ (`asset-register-table.tsx:541`) · R2 คง 1 แถวของไฟล์นี้ (VFG:270 แก้ comment เป็น "phase 3" ได้ เลขเท่าเดิม) · สถานะที่ส่งให้ 2C-4: GF7 `asset-register-table.tsx` (FMG:293) budget 6 → จริง 4 (dialog `:708`, `:723`, `:738`, `:748`) · GB1 (FMG:327) 1 (dialog `:769`) · GL1 (FMG:351) 1 (`:455`) · GF5 (FMG:265) `[1,1,0]` ห้ามลด

**ห้ามแตะ:** ข้อ 8.11 · chrome ของ sheet · ไฟล์ 9 ตัวของ 2C-3 (FMG:35) · ห้ามย้ายแถบคำสั่งกลุ่มไปไฟล์ใหม่ (GL1 + R2 budget 0)

**ตรวจบนแอป dev**

| หน้า | จอ | ดูอะไร |
|---|---|---|
| `/th/assets` | 1440 และ 1366 ทุก preset คอลัมน์ | ไม่เลื่อนแนวนอนที่ 1440 (DS:508) · ชุด operations และ accounting 1,116 ≤ 1,117 (`asset-register-view-model.test.ts:164` · I26) · คอลัมน์คำสั่ง 172 ไม่ตัดปุ่ม 120 + ⋯ (I3) · คอลัมน์รหัสไม่ตัด · สถานะ/สภาพไม่ตัดคำ · แถวคง `px-3 py-2` (แถวจริง 56 เพราะรูปย่อ 40 · I26) · ไม่มีเงาขอบคอลัมน์คำสั่ง |
| `/th/assets` | 1024 · 768 · 375 | แถบเครื่องมือไม่มีการ์ดตั้งแต่ md สูง 36 · มือถือแถบติดบน 44 · แท็บสถานะเส้นใต้ เป้า 44 · ชิป · sheet กรอง (ป้าย + ปุ่มช่วยเหลือ) · ค้นหา: 2 ตัวอักษร รอ 400ms · IME ไทย · Enter · × ล้าง · โหมด "เลือก" checkbox 44 · แถบคำสั่งกลุ่มที่เดิม · ⋯ บนมือถือเป็น sheet รายการสูง 44 |
| `/th/asset-management/import-export` | 1440 · 375 | หัวหน้าใหม่ · เนื้อไม่เปลี่ยน (O13) |
| หลัง rebase (ถ้า 2C-3 merge ก่อน) | 1440 · 375 | `/th/assets` ⋯ ลบ (ยืนยันแล้วยกเลิก) · sheet กรอง |

### 8.8 plan 2B-4 · หน้ารายละเอียดและ skeleton

branch `feat/ui-phase2b-plan4` · รอ: 2B-3 · ทำพร้อม: 2C-3 · 2C-4 · ปลด: **2C-5** (เมื่อ 2C-4 merge ด้วย) และ 2B-5

**ไฟล์ (14 ไฟล์โค้ด + messages ถ้ามีข้อความใหม่)**

| # | ไฟล์ | เปลี่ยน (บรรทัดที่ HEAD) |
|---|---|---|
| 1 | `D/assets/[id]/page.tsx` | หัว (h1 `:893` เป็นชื่อ · ป้ายใน meta · ปุ่มกลับ `:919-926` พา `returnTo`) · R7 `:1439`, `:1507` · `Info` `:2436` → `KeyValueList` · คง `<AssetDetailActionMenu … />` · ไม่แตะ `:882` และ `MobileActionBar` (O11) |
| 2 | `c/assets/asset-detail-tabs.tsx` | คงตัวห่อ client ที่ถือการเลื่อน ห่อ `TabNav` (ส่ง `ref`/`onScroll`/`style` และ `linkClassName="snap-start"` · I9) · ตัวนับ `bg-white/20` `:76` |
| 3 | `D/maintenance/[id]/page.tsx` | หัว (`:112`) · ไอคอน Wrench `:138` และในแถบล่าง `:147` → ลูกศรซ้าย (B2) · ไม่แตะ `:105` |
| 4 | `D/disposal/[id]/page.tsx` | หัว (`:181`) · ปุ่มกลับบนมือถือ (กลุ่ม `hidden … md:flex` `:186`, B2) · วางตำแหน่ง stepper `:205-215` · ไม่แตะ `:170` และ `DisposalMobileActionBar` |
| 5 | `D/master-data/employees/[id]/page.tsx` | `pb-24` `:254` · ปุ่มกลับ `:271-277` · R7 `:323`, `:368`, `:412` · `ColumnHeader` ประจำไฟล์ `:607` · `toLocaleString()` 1 |
| 6 | `D/master-data/suppliers/[id]/page.tsx` | `pb-24` `:150` · ปุ่มกลับ `:167-173` · ราคาว่าง `:240`, `:289` (`formatCurrency(Number(x ?? 0))` แสดง 0.00) → `Nil` / `formatMoney` · `MetricCard` ประจำไฟล์ `:306` · `toLocaleString()` 1 |
| 7 | `c/master-data/supplier-purchase-documents.tsx` | R7 `:45` · `toLocaleString()` 2 |
| 8 | `D/my-assets/[id]/page.tsx` | `pb-24` `:56` · ปุ่มกลับ `:62-65` |
| 9 | `c/ui/page-skeleton.tsx` + `D/loading.tsx` · `D/assets/loading.tsx` · `D/assets/[id]/loading.tsx` · `D/dashboard/loading.tsx` · `D/reports/loading.tsx` | skeleton 5 ตัวตรงหน้าจริง (`MetricGridSkeleton`: `grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border lg:auto-cols-fr lg:grid-flow-col lg:grid-cols-none` · เซลล์ `space-y-2 bg-surface px-4 py-3 md:px-5 md:py-4` · I28) · เลิก `max-w-7xl` (`:84`, `:111`, `:146`, `:168`, `:208`, R-o) |

**ห้ามแตะ:** ข้อ 8.11 · padding O11 3 หน้า · `c/ui/mobile-action-bar.tsx` · `c/disposal/disposal-mobile-action-bar.tsx` · `c/disposal/disposal-workflow-stepper.tsx` · ไฟล์ของ 2C-4 ที่ render บนหน้ารายละเอียด: `c/assets/asset-status-correction-button.tsx`, `c/assets/asset-evidence-drawer.tsx`, `c/ui/activity-drawer.tsx`, `c/asset-operations/transaction-cancel-dialog.tsx` (วางที่เดิม ไม่แก้ไฟล์) · `c/maintenance/maintenance-attachments.tsx` (2C-5) · ไฟล์ของ 2C-3

**ตรวจบนแอป dev**

| หน้า | จอ | ดูอะไร |
|---|---|---|
| `/th/assets/<id>` | 1440 · 1024 · 768 · 375 | เส้นทางนำทาง → h1 เป็นชื่อ ป้ายสถานะใน meta · เปิดจากทะเบียนหน้า 2 แล้ว "กลับ" ได้หน้า 2 · ⋯ ก่อน ปุ่มหลักท้าย · TabNav ตัวนับไม่ใช้พื้นโปร่ง · 2 ตาราง · KeyValueList 120px/1fr ซ้อนบนมือถือ · แถบล่างไม่เปลี่ยน |
| `/th/maintenance/<id>` · `/th/disposal/<id>` | 1440 · 375 | ไอคอนกลับเป็นลูกศรซ้ายทั้งหัวและแถบล่าง · ตัดจำหน่ายมีปุ่มกลับบนมือถือ · stepper ที่เดิม |
| `/th/master-data/employees/<id>` · `/suppliers/<id>` · `/th/my-assets/<id>` | 1440 · 375 | ไม่มี `pb-24` ซ้อน และเนื้อไม่ถูกแถบล่างบัง · ราคาว่างเป็น "—" ไม่ใช่ 0.00 · 3 ตารางของพนักงาน |
| skeleton | 1440 · 375 (throttle เครือข่าย) | 5 ตัวตรงหน้าจริง เต็มกว้าง |
| ช่วง 768–1023 | 768 · 1023 | เมนูข้าง แถบล่าง และแถบปุ่มสลับคนละ breakpoint (lg / md) |
| หลัง rebase (ถ้า 2C-3 หรือ 2C-4 merge ก่อน) | 1440 · 375 | `/th/assets/<id>`: ⋯ ยกเลิกรายการ · ลิ้นชักหลักฐาน · ลิ้นชักกิจกรรม |

### 8.9 plan 2B-5 · admin รายงาน แดชบอร์ด แจ้งเตือน + ล็อก guard

branch `feat/ui-phase2b-plan5` · รอ: 2B-4 · ทำพร้อม: 2C-3 · 2C-4 · 2C-5 · ปลด: **2D** (เมื่อ 2C-5 merge ด้วย)

**ไฟล์ (25 ไฟล์โค้ด + messages ถ้ามีข้อความใหม่)**

| # | ไฟล์ | เปลี่ยน (บรรทัดที่ HEAD) |
|---|---|---|
| 1 | `D/admin/roles/page.tsx` | หัว · R7 `:127`, `:195` · แถวว่าง (เดิมไม่มี) · ⋯ ช1 · ไม่แตะปุ่มลอย `:245` (2D, R-q) |
| 2 | `D/admin/logs/page.tsx` | B4 แทน `take: 100` `:42` · R7 `:100` · ตารางซ้อนใน `<details>` · คง `systemLogQuickFilters` |
| 3 | `D/admin/storage/page.tsx` | R7 `:99`, `:155`, `:250` · shell เลื่อนแนวนอนได้ (เดิม `getTableShellClasses()` `overflow-hidden` `:97`, `:153`, `:248`) · `toLocaleString()` 7 |
| 4 | `D/admin/approvals/page.tsx` · `D/admin/approvals/history/page.tsx` | ชิป → `TabNav` · B4 แทน `take: 150` `:52` · ไอคอน FileCheck2 `:83` → ลูกศรซ้าย (B2) |
| 5 | `D/admin/readiness/page.tsx` · `D/admin/settings/page.tsx` (หัว `:56` เท่านั้น) · `D/access-denied/page.tsx` | หัวหน้า · settings คง `buildLdapSyncHistoryItems` และ `ldapSyncHistory={ldapSyncHistory}` |
| 6 | `D/notifications/page.tsx` | ชนิดแจ้งเตือนเป็นคำไทย `:127` · ไม่แตะ `notification-center-actions.tsx` (O17) |
| 7 | `D/my-assets/page.tsx` | `PageHeader` ประจำไฟล์ `:163` → ตัวกลาง (ลบ `function PageHeader` `:163-170` ใน commit เดียว · I14) · B4 (เดิมไม่จำกัด `:62`) · R7 `:119` |
| 8 | รายงาน 11 ไฟล์: `D/reports/page.tsx` · `c/reports/report-header.tsx` · `report-filter-panel.tsx` (`ReportSelect` → `FilterSelect` · `ActionButton` `:75` → `Button`) · `report-active-filters.tsx` (ลบไฟล์ · ลบลิงก์ล้างของชิป · I24) · `report-view-tabs.tsx` คงตัวห่อ client ที่ถือการเลื่อน ห่อ `TabNav` (I9) · `responsive-report-list.tsx` (R7 `:31`) · `reports-accounting-view.tsx` · `reports-catalog-view.tsx` · `reports-operations-view.tsx` · `reports-overview-view.tsx` · `c/ui/metric-card.tsx` | `MetricCard` 14 จุด (page 2 · accounting 10 · catalog 1 · operations 1) → `StatStrip` (R-d · VFG:64, :90) · ไม่แตะ `report-preset-controls.tsx` (2C-4) |
| 9 | `D/dashboard/page.tsx` · `D/work-center/page.tsx` | h1 · สลับมุมมอง: `TabNav` 2 รายการ (`aria-label={t("viewNavigation")}` key ใหม่ `workCenter.viewNavigation`) แทน `WorkCenterViewLink` (`D/work-center/page.tsx:371-386`) · คงข้อความอธิบาย `:387-391` (ลิงก์ตาม R-g ไม่ใช้ `Segmented` · I10) · `MetricCard` ประจำไฟล์ `:597` |
| 10 | `c/master-data/master-data-layout.tsx` · `src/lib/design-system.ts` | ลบ `MasterDataHeader` (R-h) · `MasterDataPagination` · `SortableColumnHeader` · `ColumnHeader` เมื่อไม่มีผู้เรียก · ลบ `getTableShellClasses` เมื่อไม่มีผู้เรียก · คง `ActiveBadge` (2D) และ `MasterDataSearch` ถ้ายังมีผู้เรียก · ไม่แตะ `getMobileSafeBottomPaddingClasses` `:112-114` |

**งาน:** 0 (controller) → ตาราง ไฟล์ละ 1 commit → ล็อก R7 (VFG:233-254 เป็น test เดียว ข้อ 8.15) และ LFG (`BUDGETS = KEEP` + test L9 · I15) → verify (controller) → เอกสารรวมของ 2B → wiki (controller)

**ห้ามแตะ:** ข้อ 8.11 · `D/admin/data-quality/page.tsx` และ `D/admin/integrations/page.tsx` (ทำใน 2B-2 · 2C-4/2C-5 แก้ต่อ) · 4 หน้า O11 · `system-settings-form.tsx` · ไฟล์ทั้งหมดของ 2C-3/2C-4/2C-5 (ข้อ 8.3) · ไม่ลบ `ActionButton`, `getActionButtonClasses`, `getEmptyStateClasses` (2D)

**ตรวจบนแอป dev**

| หน้า | จอ | ดูอะไร |
|---|---|---|
| `/th/admin/roles` · `/logs` · `/storage` | 1440 · 375 | roles มีแถวว่าง · logs แบ่งหน้าแทนเพดาน 100 และตารางซ้อนยังเปิดได้ · storage 3 ตารางเลื่อนแนวนอนได้ |
| `/th/admin/approvals` · `/history` | 1440 · 375 | ชิปเป็น TabNav · history แบ่งหน้าแทนเพดาน 150 · ไอคอนกลับเป็นลูกศรซ้าย |
| `/th/admin/readiness` · `/th/admin/settings` · `/th/access-denied` | 1440 | หัวหน้าใหม่ · แถวแท็บตั้งค่าเป็นของ 2C-5 |
| `/th/notifications` · `/th/my-assets` | 1440 · 375 | ชนิดแจ้งเตือนเป็นคำไทย · my-assets แบ่งหน้า |
| `/th/reports` ทุกมุมมอง | 1440 · 768 · 375 | StatStrip แทนกล่องตัวเลข · แท็บมุมมองเป็น TabNav · ตัวกรองเป็น FilterSelect · ปุ่มส่งกรองเป็น `Button` |
| `/th/dashboard` · `/th/work-center` | 1440 · 375 | สลับมุมมองเป็น `TabNav` เส้นใต้ (ลิงก์ · Ctrl+คลิกและไม่มี JS ยังใช้ได้ · I10) · กล่องตัวเลข |
| หลัง rebase (คู่ที่ merge ก่อน) | 1440 · 375 | 2C-4: `/th/reports` (preset) · `/th/notifications` (ตัวเลือกชนิด) · 2C-5: `/th/admin/settings` แถวแท็บ · `/th/admin/integrations` |

### 8.10 สิ่งที่ controller ตรวจก่อนเริ่มทุก plan (งาน 0 ทั้งสองสาย)

| # | ตรวจ | คำสั่ง / ที่มา | ผ่านเมื่อ |
|---|---|---|---|
| 1 | branch และฐาน | `git rev-parse --abbrev-ref HEAD` · `git merge-base --is-ancestor <ฐานใน plan> HEAD && git diff --quiet <ฐาน> HEAD -- src tests messages scripts && echo BASE-OK` (แบบ `2026-10-12-ui-phase2c-plan2.md:128`) | `BASE-OK` · ถ้าไม่ผ่าน (คู่ merge ก่อน) นับข้อ 4 ใหม่ แก้ข้อความงาน และบันทึกใน ledger |
| 2 | merge ที่ต้องมีก่อน | `git log --oneline master` มี commit เอกสาร verify ของ plan ที่ข้อ 8.1 ระบุ | ครบ |
| 3 | tree สะอาด | `git status --short` | มีแค่ untracked 5 รายการเดิม: `.codex/` · `.impeccable/critique/` · `.playwright-mcp/` · `.superpowers/brainstorm/` · `docs/superpowers/plans/2026-06-22-audit-component-assets.untracked-backup.md` |
| 4 | นับใหม่ | สคริปต์ precheck ของ plan: R1/R2/R7 รายไฟล์ (แบบ `s8-guards.mjs`) · แถว FMG ของไฟล์ร่วม · ตัวเลขข้อ 8.4 · บรรทัดในตารางไฟล์ของ plan | ตรงกับแถว "หลัง" ของ plan ก่อนหน้าในข้อ 8.4 |
| 5 | baseline | `npm test` · `npx tsc --noEmit` · `npm run lint` | ที่ `d38a0ee`: test 1,812 ผ่าน 1,811 ข้าม 1 (DH:467) · lint 0 error 146 warning ใต้ `.agents/` (`2026-10-12-ui-phase2c-plan2.md:44`) · plan ถัดไปใช้ตัวเลขที่ plan ก่อนบันทึก |
| 6 | DB dev | อ่าน key `DATABASE_URL` / `DB_USER` ของ `.env` โดยไม่พิมพ์ค่า | `asset_management_dev` / `asset_dev` |
| 7 | คู่ที่เปิดอยู่ | `git worktree list` · `git diff --name-only master...<branch ของคู่>` ตัดกับรายการไฟล์ของ plan นี้ | เหลือแค่ DS · VFG · messages · เอกสาร |
| 8 | สถานะไฟล์ร่วม (เฉพาะงาน 0 ของ 2C) | 2C-3: ตาราง "สถานะไฟล์ร่วม" ข้อ 8.6 · `RowActions` ใช้ handle ได้ (`dialog-trigger-handles.test.ts` ผ่าน) · 2C-4: ข้อ 8.7 "ตัวเลข" · หัว `D/assets/page.tsx` และ `import-export/page.tsx` เป็น `PageHeader` · O16 ของ `admin-user-form.tsx` และ `role-permission-form.tsx` เสร็จแล้ว (2B-1) · หัวของ `asset-label-batch-tool.tsx`, `asset-scan-search-tool.tsx` ยังไม่ถูกแตะ (2C-4 ใช้ `PageHeader` · I13) · 2C-5: 4 หน้า O11 มีหัวหน้าใหม่ (`audit/rounds/[id]` จาก 2B-2 · อีก 3 จาก 2B-4) · `disposal/[id]` มีปุ่มกลับบนมือถือ · `TabNav` รับ `onSelect` · `bulkApprovalCopy` / `bulkExecutionCopy` ยังอยู่ใน `D/disposal/page.tsx` | ตรงทุกข้อ · เลขบรรทัดของ 2C (`5ffee76`) แก้ในข้อความงานก่อนส่ง |
| 9 | ภาพก่อนแก้ | `.superpowers/sdd/screenshots/ui-phase2b-planN/before/` (ignore โดย `.superpowers/sdd/.gitignore:1`) | ครบตามตารางตรวจของ plan |

### 8.11 รั้ว: สิ่งที่ 2B ห้ามแตะ

| # | ห้ามแตะ | เจ้าของ | ที่มา | 2B ทำได้แค่ | ระวังใน |
|---|---|---|---|---|---|
| 1 | chrome ของ `c/ui/sheet.tsx` · `dialog.tsx` · `accessible-dialog.tsx` · `alert-dialog.tsx` · `field.tsx` · `file-dropzone.tsx` · และ `c/ui/confirm-text-dialog.tsx` (ชุด 3), `c/ui/confirm-dialog.tsx` (ชุด 5) | 2C | C/08:35 (กฎ 3) · C/08:51 (O10) · FMG:35, :37 · `00-decisions.md:35` | ลบ sheet ⋯ ที่เขียนเองใน `asset-register-row-actions.tsx:160-243` (ใช้ sheet ของ `RowActions` · I5) · เนื้อใน `asset-register-filter-sheet.tsx:90-180` | 2B-3 |
| 2 | API ของ P0: `c/ui/segmented.tsx` · `Field labelAction` · handle `open()` / `hideTrigger` / `returnFocusRef` | ใช้ร่วม | C:57 (K2) · C:123 (I3) · C/08:49-50 | ใช้ตามที่มี · VFG:274-289 และ `tests/dialog-trigger-handles.test.ts` ผ่านต่อ | 2B-1 · 2B-2 · 2B-5 |
| 3 | dialog ในไฟล์ร่วม: `asset-register-table.tsx:697-774` · `disposal-bulk-approval.tsx:533-563` · `disposal-bulk-execution.tsx:812-986` + `SharedValueFields` · `ConfirmTextDialog` ที่ `audit-findings-batch-actions.tsx` เปิด | 2C-4 · 2C-3 | C/08:42, :45-46 | checkbox · ปุ่มใน toolbar · trigger | 2B-2 · 2B-3 |
| 4 | O7 แถวแท็บตั้งค่า `system-settings-form.tsx:948-967` | 2C-5 | C/08:48 (`:937-956` ที่ `5ffee76`) | ส่ง `TabNav` + `onSelect` (R-g) · หัวตาราง 3 จุดใน 2B-1 | 2B-1 · 2B-5 |
| 5 | O11 `c/ui/mobile-action-bar.tsx` · `c/disposal/disposal-mobile-action-bar.tsx` · padding `D/assets/[id]/page.tsx:882` · `D/audit/rounds/[id]/page.tsx:408` · `D/maintenance/[id]/page.tsx:105` · `D/disposal/[id]/page.tsx:170` | 2C-5 | C/08:52 · C:143 (I23) | หัวหน้า · ไอคอนปุ่มกลับใน `actions` (`D/audit/rounds/[id]/page.tsx:479`, `D/maintenance/[id]/page.tsx:147`) | 2B-2 · 2B-4 |
| 6 | O12 component `DisposalWorkflowStepper` | 2C-5 | C/08:53 | วางตำแหน่ง `D/disposal/[id]/page.tsx:205-215` | 2B-4 |
| 7 | O13 `asset-import-preview-panel.tsx` ทั้งไฟล์ (รวม R7 `:338` และ `toLocaleString()` 4) | 2C-4 | C/08:54 | ไม่แตะ | 2B-3 |
| 8 | O14 `asset-evidence-drawer.tsx:102` · `c/ui/activity-drawer.tsx:72` | 2C-4 | C/08:55 | วางที่เดิมบนหน้ารายละเอียด | 2B-4 |
| 9 | O17 `notification-center-actions.tsx:119` | 2C-4 | C/08:58 | `D/notifications/page.tsx` เท่านั้น | 2B-5 |
| 10 | O19 `asset-label-batch-tool.tsx` · `asset-label-print.tsx` · `asset-scan-search-tool.tsx` | 2C-4 | C/08:60 | ไม่แตะ (h1 `asset-label-batch-tool.tsx:293`, `asset-scan-search-tool.tsx:110` ให้ 2C plan 4 ใช้ `PageHeader` · I13) · `asset-label-print.tsx:301` เป็นหน้าพิมพ์ คง 700 | 2B-1 |
| 11 | O20 `audit-scan-search.tsx:51` · `audit-scan-room-picker.tsx:75` · `global-search.tsx:133` | ไม่แตะ / เฟส 3 | C/08:61 | `master-data-layout.tsx:63` เป็นของ 2B-1 | 2B-1 |
| 12 | O21 dialog อนุมัติ/ปฏิเสธ `audit-finding-review-actions.tsx:212`, `:336`, `:445` | 2C 1d | C/08:62 (`:202`, `:345`, `:461` ที่ `5ffee76`) | trigger ในแถว `:113`, `:123` | 2B-2 |
| 13 | ไฟล์ชุด 4 อื่น: `admin-user-form.tsx` · `role-permission-form.tsx` (ยกเว้นหัว O16) · `IntegrationClientManager.tsx` · `asset-state-review-dialog.tsx` · `data-quality-rule-form.tsx` · `asset-status-correction-button.tsx` · `asset-create-workspace.tsx` · `transaction-cancel-dialog.tsx` · `auth/login-form.tsx` · `report-preset-controls.tsx` | 2C-4 | FMG:36 · C/08:57 | หัว O16 ใน 2B-1 | 2B-1 · 2B-4 · 2B-5 |
| 14 | FMG | 2C | DH:384 · C:146 (I26) | ไม่แก้ · ไม่เปลี่ยนชื่อ ย้าย หรือลบไฟล์ใน `BATCH_FILES` (FMG:26-38, ตรวจที่ FMG:413-437) · ไม่ลด `CONSTRAINT_FLOORS` (FMG:220) · ไม่มี `flex-col-reverse` ใน `ui/` ใหม่ (GD4 FMG:589-603) · `busy` อยู่ในไฟล์ `"use client"` และไม่ซ้ำ `disabled` (GB4 FMG:532-548) · dialog ใหม่มี footer (GD2 FMG:559-572) · route รายการเป็นโหมด navigation (GL2 FMG:660-672) · ไม่ย้ายแถบคำสั่งกลุ่ม `asset-register-table.tsx:455` (GL1 FMG:351 + R2 budget 0 ของไฟล์ใหม่) | ทุก plan |
| 15 | formatter บนไฟล์ 2C · regex ที่มี `\n` | — | DH:385 · C:302 | แก้มือ | 2B-1 (21 ไฟล์ 2C ในงาน 22–24) |
| 16 | token `:root` / `@theme inline` / `@theme` · `tests/design-tokens-contrast.test.ts` | ไม่มีใคร | A:103 (I4) · A:120 (I21) | — | ทุก plan |
| 17 | ฐานข้อมูลและ server: migration · schema · API · dependency · index · คำสั่งที่ไม่ใช่ SELECT | — | AGENTS.md · B4 · `00-decisions.md:38` | query นับแบบอ่านอย่างเดียวใน `page.tsx` (B4) | 2B-1 · 2B-2 · 2B-5 |
| 18 | ของ 2D: pill เขียนเอง รวม `ActiveBadge` (`master-data-layout.tsx:195-201`) · ปุ่มลอย 2 จุด (VFG:268-269) · ค่าตั้งต้นปุ่ม 36 · ลบ `ActionButton` / `getActionButtonClasses` / `getEmptyStateClasses` · กล่องแจ้งและกล่องว่างนอกรายการ · แผงฟอร์ม (K28, O15) · `linkVariants` ที่เหลือ · `formatCurrency` ในหน้าพิมพ์ · ตัด Plex Mono 600 · budget ทุกตัวเป็น `{}` | 2D | A:60-70 · C/08:470 | เลิกใช้ `ActionButton` ในพื้นที่ของตัวเอง (`report-filter-panel.tsx:75`) แต่ไม่ลบ component | 2B-5 |
| 19 | เฟส 3: จัดหน้าใหม่ 5 หน้าจอ (F:43) · เลือกหลายแถว แถบคำสั่งกลุ่ม หัวตารางติดบน (F:45, ไปกับงานพิมพ์ QR) · แยกป้าย "พร้อมใช้งาน" (F:304) · ค้นหาบนแถบบนและ Ctrl K · โครงหน้า login (C/08:471) · มุมมองมือถือแบบแถวของ 10 หน้า (B6) · แถวทะเบียน 46 (B3 ข้อ 3) · ไอเดียเมนู 4 เรื่อง (B1, WIKI:52) | เฟส 3 | ตามช่องซ้าย | primitive ตามสูตรต้นแบบ วางในหน้าเดิม | ทุก plan |
| 20 | deploy | ครั้งเดียวหลังเฟส 2 | B9 | ข้อ 8.12 | ทุก plan |

### 8.12 deploy (B9)

- ไม่มี plan ใดของ 2B deploy เอง · deploy ครั้งเดียวหลังเฟส 2 ทั้งหมด: 2C plan 2–5 · 2B-1…2B-5 · 2D · V (B9 · DH:454 · WIKI:51 ข้อ 27)
- ข้อนี้ทับ: I22 ของ 2A ("ไม่ deploy 2A เดี่ยว ๆ ให้ deploy พร้อม 2C ชุดแรก" A:121) · ประตู deploy ของ 2C plan 1 (C/08:374-405) · "ทุกชุด deploy เอง" (C/08:409) · "deploy เองหลัง…" (C:205)
- สิ่งที่ขึ้นพร้อมกัน: `ab1b873..master` (107 commit ที่ `d38a0ee` · `git log --oneline ab1b873..d38a0ee`) + งานเฟส 2 ที่เหลือ
- ฐานข้อมูลและ env: ตั้งแต่ `ab1b873` มีแค่ `prisma/manual-migrations/2026-10-08-thai-status-wording.sql` (apply บน Production แล้ว 2026-10-08) และ `prisma/seed.ts` (`git diff --name-only ab1b873 d38a0ee -- prisma`) · `package.json` ไม่เปลี่ยน · 2B ไม่เพิ่ม migration, schema, ตัวแปร env, API หรือ dependency · query นับของ B4 อ่านอย่างเดียว ไม่เพิ่ม index
- จุดถอยกลับ: `ab1b873` (Production รันตั้งแต่ 2026-10-08 · `ams-status.md:61`) · ถอยได้สะอาดตราบที่ไม่มีงานในเฟส 2 เพิ่ม schema · ถ้า 2D หรือ V เพิ่ม migration ต้องประเมินใหม่ก่อน deploy
- ก่อน deploy (ไม่ใช่งานของ plan ใดใน 2B): `npm run verify` บน `master` ที่ merge ครบ · production build · งานตรวจด้วยคนที่ค้างทุกเฟส (DH ส่วน "Still open" ของเฟส 1, 2A, 2C plan 1–2 · WIKI ข้อ 24, 26 · รายการของ 2B แต่ละ plan) · ผู้ใช้อนุมัติ · ทำตาม `DEPLOYMENT_UBUNTU_CLOUDFLARE.md` หัวข้อ 19 (`:743`)
- ทุก plan ของ 2B เขียน "ไม่ deploy" ไว้ในข้อจำกัดรวม (`00-decisions.md:38`)

### 8.13 ข้อตัดสินย่อยของส่วนนี้

1. **ไฟล์ร่วมที่ยอมนอกจาก DS และ VFG (ต้องให้ผู้ใช้ยืนยันก่อน 2B-3 ∥ 2C-3 · I29):** `messages/{th,en}.json` และเอกสาร (DH · `docs/99_CHANGELOG.md` · `docs/14_UI_UX_DESIGN_SYSTEM.md` · `.impeccable/design.json`) หลีกไม่ได้ · ใช้กฎ rebase ข้อ 8.2 · ถ้าผู้ใช้ไม่ยอม ทางเลือกคือเลื่อนงานเอกสารและข้อความของ plan ที่ทำพร้อมคู่ไปหลังคู่ merge
2. **คู่ที่เกิดได้มี 6 คู่** เพราะสาย 2B ไม่รอ 2C · พิสูจน์ครบในข้อ 8.3
3. **h1 600 ในไฟล์ของ 2C ทำใน 2B-1 (I13):** 13 ไฟล์ที่แก้หัวอยู่แล้ว (งาน 22) + 6 ฟอร์มงานที่ไม่มีปุ่มกลับย้ายหัวเป็น `PageHeader` ไฟล์ละ 1 commit (`checkin`, `checkout` (หัวใน `OperationShell`), `transfer`, `bulk-move`, `audit-round-form` งาน 23 · `asset-batch-form` งาน 24) · `asset-scan-search-tool.tsx`, `asset-label-batch-tool.tsx` ไม่แตะ → 2C plan 4 ใช้ `PageHeader` (เขียนลง DH) · ไม่มี test ยึด `font-bold` ของ h1 ในฟอร์ม (grep `tests` เจอแค่ `asset-register-filter-ui.test.ts:118` ของ `MasterDataHeader` และ VFG:64 ของ `MetricCard`) · login `src/app/[locale]/(auth)/login/page.tsx:43` ไปเฟส 3 พร้อมโครงหน้า login · หน้าพิมพ์ (`asset-label-print.tsx:301`, `operation-document-print.tsx:103`) คง 700
4. **ย้าย 3 เรื่องออกจาก 2B-5** (ตาราง "ย้าย" ข้อ 8.3)
5. **R7 รายไฟล์เป็นงาน 1 ของ 2B-1** (synthesis วางไว้งาน 22) · ทุก commit ที่ย้ายตารางลบแถวของตัวเอง ไม่มีช่วงที่ fill ใหม่หลุด
6. **ตัวช่วยใน `master-data-layout.tsx` ลบรวดเดียวใน 2B-5** (ตาม R-h) แม้ผู้เรียกตัวสุดท้ายของ `MasterDataPagination` / `SortableColumnHeader` คือ admin/users ใน 2B-1
7. **สาย 2B อยู่ checkout หลัก สาย 2C อยู่ worktree** · controller คัดลอก `.env` (dev เท่านั้น) ไปที่ worktree โดยไม่เปิดดู (ข้อ 8.2) · ต้องให้ผู้ใช้ยืนยันว่าคัดลอกไฟล์ค่าลับได้ ครั้งแรกใน plan 2C-3 (I30)
8. **plan ของ 2C-3…2C-5 เขียนตอนเงื่อนไขครบ** และนับเลขบรรทัดใหม่ เพราะสเปก 2C อ้าง `5ffee76` (เช่น dialog bulk approval `:505-565` ตอนนี้ `:533-563` · `confirm(` ของ supplier `:93` ตอนนี้ `:96`)
9. **ตำแหน่งงาน V (ผู้ใช้ตัดสินก่อน 2D · I31):** เสนอหลัง 2D merge แล้วจึง deploy · ทางเลือก: คู่กับ 2D ถ้าแยกไฟล์ได้ (ต้องพิสูจน์แบบข้อ 8.3)
10. **ไอคอนไม่ซ้ำ (B1) ใช้ทั้งเมนู** เพราะแถบย่อแสดงแค่ไอคอน · ที่ HEAD ซ้ำ 8 ชื่อ: `Users` ×3 · `Settings` ×3 · `Package` ×3 · `MapPin` · `History` · `Database` · `ClipboardCheck` · `ArrowRightLeft` ×2 (นับ `icon: <` ใน `c/layout/sidebar.tsx`) · แก้ในไฟล์เดียวกันกับงาน 2 ของ 2B-1 · ตัดสินแล้ว (I27): ทั้งเมนู · เปลี่ยน 10 ตำแหน่งตามข้อ 4.2.2 · หลังแก้ 39 ตำแหน่ง 39 ชื่อ · `KeyRound` คง (`tests/integration-api-client-admin.test.ts:120`)

---

### 8.14 เอกสาร

**ต่อ plan** (งานเอกสาร repo 1 งานท้าย plan · wiki เป็นงานของ controller ทำทีละ plan ตามลำดับ merge จึงไม่ชนกัน · ตารางละเอียดที่ใช้จริงอยู่ข้อ 10.6 ตารางนี้เป็นสรุป)

| plan | DS | DH | อื่น ๆ |
|---|---|---|---|
| 2B-1 | :284 (Display 700 → 600, B3 ข้อ 1) · :489-491 (เมนูข้าง B1) · :493 และ :573 (ระยะ crumbs เป็นของ `PageHeader` · ข้อยกเว้น 20px ยังใช้ได้เพราะคงปุ่มกลับ B2) · :498 (R7 รายไฟล์) · :500-510 (แถบเครื่องมือ หัวตาราง แถว ช1 แบ่งหน้า มือถือเลื่อนแนวนอน) · :516 · :534 (รายการ primitive) | หัวข้อใหม่ "UI Round 4 Phase 2B Plan 1 …" ก่อน "Open Go-Live Decisions" (DH:477) · แทน DH:441-445 และ :475 ด้วยสายท่อข้อ 8.1 | `.impeccable/design.json` component ใหม่ (page-header, table, pagination, tabs, stat-strip, key-value, row-action, filter-chip · R-s · ข้อ 10.6) |
| 2B-2 | :258 (ปุ่มอนุมัติไม่ใช้สีเขียว) · :500-510 (StatStrip เป็นตัวกรอง · ⋯ เปิด dialog ของ 2C) · B4 | หัวข้อ plan 2 · ความเสี่ยงเวลาโหลดของ query นับ · "2C plan 3 เริ่มได้" | — |
| 2B-3 | :335 (แถบคำสั่งกลุ่ม → เฟส 3) · :500-510 สัญญาทะเบียน (แถบเครื่องมือ md+ ไม่มีการ์ด 36 · แท็บเส้นใต้ · แถวแน่นคง `px-3 py-2` (แถวจริง 56 เพราะรูปย่อ 40) เป็นข้อยกเว้น class ประจำไฟล์ I3 · คอลัมน์คำสั่ง 172 · ชุดค่าตั้งต้น 1,116 · I26) · :502 | หัวข้อ plan 3 · "2C plan 4 เริ่มได้เมื่อ 2C-3 merge" | — |
| 2B-4 | หัวหน้ารายละเอียด · `KeyValueList` · skeleton (DS ยังไม่มีหัวข้อ · ตามส่วนที่ถือ primitive) | หัวข้อ plan 4 · "2C plan 5 เริ่มได้เมื่อ 2C-4 merge" | — |
| 2B-5 | :301 · :375 · :459 · :498 (R7 ล็อก เหลือ 3 ในไฟล์ชุด 4) · :516 · :534 ฉบับสุดท้าย | หัวข้อ plan 5 · "Deferred" ใหม่: 2D · V · งานตรวจด้วยคนที่ค้าง | — |

ทุก plan: `docs/14_UI_UX_DESIGN_SYSTEM.md` ให้ตรง DS · `docs/99_CHANGELOG.md` หัวข้อภาษาไทยใต้วันที่ (แบบ `docs/99_CHANGELOG.md:7-26`) · ตัวเลข verify และผลตรวจบนแอป dev ลง DH และ changelog (แบบ commit `d38a0ee`)

**wiki (controller · ทุก plan):** `ams-status.md` (แถว 2B: plan N merge แล้ว ยังไม่ deploy) · `ams-log.md` 1 บรรทัด · `ams-open-questions.md` (เพิ่มรายการตรวจด้วยคนของ plan · 2B-1 ปิดข้อ 28 WIKI:52 · ข้อ 27 WIKI:51 คงไว้) · `ams-index.md` ถ้ามีหน้าใหม่ · รัน `node tools/wiki-lint.mjs AssetSystem --repo D:/Antigravity/asset-system --prefix ams-` ที่ `D:\Obsidian\Eltross` · commit vault ด้วย `ingest:`

**ส่วนนี้เอง:** สายท่อและการแทน I28 ของสเปก 2C ลง DH (2B-1) และ `ams-status.md` · ไม่แก้สเปก 2C · plan แต่ละตัวอยู่ที่ `docs/superpowers/plans/<วันที่>-ui-phase2b-planN.md` (2B-1 บน `feat/ui-phase2b`)

### 8.15 test

**เพิ่ม / แก้ที่ส่วนนี้กำหนด**

| plan | test | เปลี่ยน |
|---|---|---|
| 2B-1 งาน 1 | VFG:249-254 | `total <= 44` → `assertWithinBudget(NEUTRAL_FILL_OPACITY, TABLE_HEADER_FILLS)` 31 แถว (ข้อ 8.4) · ทุก commit ที่ย้ายตารางลบแถวของตัวเองใน commit เดียวกัน |
| 2B-1 งาน 1 → 2B-5 | `tests/list-frame-guards.test.ts` (LFG ใหม่ · I15) | สร้างในงาน 1: `BUDGETS` = ค่าที่ HEAD (ตาราง C ข้อ 10.4) + LB1 `0→1` 2 แถว · `KEEP` ตามข้อ 9.4.3 + I11 + I14 · ทุก commit ที่ย้ายไฟล์ลดแถวของตัวเอง · 2B-5 ล็อก `BUDGETS = KEEP` + test L9 |
| 2B-1 งาน 2 | `tests/sidebar-menu-structure.test.ts` (ใหม่) | รายการแรกของ `sectionAssets` คือ `/${locale}/assets` · ไม่มี `children` ซ้อนเกิน 2 ชั้น · ไอคอน 39 ชื่อไม่ซ้ำทั้งเมนู (I27) · ไม่มี key `nav.assetRegistryGroup` ใน th และ en |
| 2B-1 งาน 3 | `tests/breadcrumbs-ui.test.ts:38-40` | นับทั้ง `<Breadcrumbs` และ prop `breadcrumbs=` ข้าม `page-header.tsx` (R-i) · `:41` 11 และ `:42` 8 คงเดิม (ตาราง A ข้อ 10.4) |
| 2B-2 งาน 10 | VFG:226-231 | R1 budget `{}` และลบ comment แถว `audit/rounds/page.tsx` |
| 2B-3 | VFG:270 | comment "(2B / phase 3)" → "(phase 3)" · เลขคง 1 |
| 2B-5 | VFG:233-254 | ล็อก R7: ลบ `TABLE_HEADER_LINE` (`:234`) และ test interim · เหลือ test เดียว `assertWithinBudget(NEUTRAL_FILL_OPACITY, …)` บนทุกบรรทัด 3 แถว (ข้อ 8.4) · ถ้า 2C-4 merge ก่อนและลดแถวแล้ว ใช้เลขที่ต่ำกว่า |

test ที่พังโดยตั้งใจในแต่ละหน้า (เช่น `supplier-adaptive-ui`, `audit-rounds-ux`, `asset-register-table-ui`, `asset-detail-ux`, `reports-adaptive-ui` เฉพาะ `:88`, `:143` · คง `:13-27` ตาม I18) แก้ใน commit ที่ทำให้พัง · รายละเอียดอยู่ในส่วนที่ถือ primitive และหน้านั้น · รายการรวมต่อ plan อยู่ตาราง A ข้อ 10.4 (`audit-rounds-ux.test.ts` แก้แค่ `:39` ตาม I20)

**ต้องผ่านต่อโดยไม่แก้ (ทุก plan ทั้งสองสาย)**
- FMG ทั้งไฟล์ (2B ลด count ในไฟล์ร่วมได้โดยไม่แก้ budget)
- `tests/design-tokens-contrast.test.ts`
- `tests/dialog-trigger-handles.test.ts` (R-m) · VFG:274-289 (`Segmented`)
- `tests/settings-tab-persistence-ui.test.ts` (O7 จนถึง 2C-5)
- `tests/mobile-field-navigation.test.ts` · GL2 (route รายการเป็น navigation)
- `tests/sheet-drawers-ui.test.ts:20-30` (`SheetFooter` ของ sheet กรองคงตามเดิม) · `:47-60` (sheet เมนูข้าง)
- `tests/asset-return-navigation.test.ts:46` · `tests/master-data-return-navigation.test.ts:33-66`
- `tests/operational-return-navigation.test.ts:69`, `:83` และ `tests/audit-pending-mobile-ux.test.ts:14-15` ผ่านโดยไม่แก้ตลอด 2B-1 (API ของ `MasterDataSearch` คงเดิม) · **2B-2 แก้** `tests/operational-return-navigation.test.ts:54`, `:66`, `:69`, `:81-83` และ `tests/audit-pending-mobile-ux.test.ts:8`, `:15` โดยต่อท้ายส่วน `pageSize`/`page` ไม่ลบส่วนเดิม (I17 · B4 ต้องพา `page`/`pageSize` ในฟอร์มค้นหาและ href ตัวเอง)
- test ในตาราง "test ที่อ่านไฟล์ของทั้งสองฝ่ายในคู่" (ข้อ 8.3) ฝั่ง "อีกฝ่ายต้องคง"
- หลัง rebase ทุกครั้ง: `npm run verify` ทั้งชุด (lint + test + build)
