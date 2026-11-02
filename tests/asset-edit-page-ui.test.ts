import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 4 plan 2 Task 7 (spec §7.1-§7.3, P2-R3, P2-R6): the edit page. The header names the asset and shows its code,
// status, holder and room with a link to the asset page; the first card is ข้อมูลหลัก with no counter; the tag is text
// behind "เปลี่ยนรหัส", whose dialog only sets the form's tag; an open handover makes holder, room and แผนก read-only
// with a notice that links the handover document (not โอนย้าย). The working tree is CRLF on Windows: every read strips \r.
const C = "src/components/assets/"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/edit/page.tsx"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

test("the words of the edit page, verbatim", () => {
  const th = messages("th").asset
  assert.equal(th.editTitleNamed, "แก้ไข {name}")
  assert.equal(th.viewAssetPage, "ดูหน้าทรัพย์สิน")
  assert.equal(th.mainCardTitle, "ข้อมูลหลัก")
  assert.equal(th.changeTag, "เปลี่ยนรหัส")
  assert.equal(th.changeTagWarning, "ป้ายที่พิมพ์ไว้จะยังแสดงรหัสเดิม และค้นด้วยรหัสเดิมจะไม่พบ ป้าย QR ยังเปิดทรัพย์สินนี้ได้")
  assert.equal(th.openHandoverLock, "ใบส่งมอบ {documentNo} ยังเปิดอยู่ ถ้าผู้ถือครองหรือที่ตั้งผิด ให้ยกเลิกใบส่งมอบแล้วส่งมอบใหม่ หรือรับคืน")
  // The link sits on the words โอนย้ายทรัพย์สิน; the text reads as the spec's sentence.
  assert.equal(th.correctionHint.replace(/<\/?link>/g, ""), "ใช้แก้ข้อมูลที่บันทึกผิด ถ้าย้ายเครื่องหรือเปลี่ยนคนใช้จริง ใช้ โอนย้ายทรัพย์สิน เพื่อให้มีใบโอนย้ายและประวัติครบ")
  assert.match(th.correctionHint, /<link>โอนย้ายทรัพย์สิน<\/link>/)
  assert.equal(th.saveCorrection, "บันทึกการแก้ไข")
  assert.equal(messages("th").common.save, "บันทึก", "create keeps บันทึก")
  const en = messages("en").asset
  for (const key of ["editTitleNamed", "viewAssetPage", "mainCardTitle", "changeTag", "changeTagTitle", "changeTagNew", "changeTagConfirm", "changeTagWarning", "openHandoverLock", "openHandoverLink", "correctionHint", "saveCorrection", "editHolderLine", "editHolderOnly"]) {
    assert.ok(th[key], `th asset.${key}`)
    assert.ok(en[key], `en asset.${key}`)
  }
  assert.match(en.correctionHint, /<link>[^<]+<\/link>/)
  const glossary = read("docs/19_THAI_GLOSSARY.md")
  assert.match(glossary, /\*\*เปลี่ยนรหัส\*\*/, "the glossary has the row for เปลี่ยนรหัส")
  assert.match(glossary, /เปลี่ยนรหัสทรัพย์สิน/)
})

test("the edit header: แก้ไข {name}, then the code, a StatusBadge, the holder and room lines and ดูหน้าทรัพย์สิน", () => {
  const form = read(`${C}asset-form.tsx`)
  const header = read(`${C}asset-form-header.tsx`)
  assert.match(form, /isEdit \? t\("editTitleNamed", \{ name: asset\?\.name \?\? "" \}\) : t\("createTitle"\)/)
  assert.match(form, /<AssetFormHeader mode=\{isEdit \? "edit" : "create"\} title=\{title\} backHref=\{backHref\} actions=\{headerActions\} edit=\{headerEdit\} \/>/)
  assert.match(header, /<span className="tag">\{assetTag\}<\/span>/)
  assert.match(header, /<StatusBadge label=\{context\.statusNameTh\} tone=\{getAssetStateTone\(context\.statusName\)\} \/>/)
  assert.match(header, /t\("editHolderLine", \{ name: context\.holder\.name, department: context\.holder\.departmentName \}\)/)
  assert.match(header, /t\("editHolderOnly", \{ name: context\.holder\.name \}\)/)
  assert.match(header, /\{context\.locationLine\}/)
  assert.match(header, /<Link href=\{context\.viewHref\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\n\s+\{t\("viewAssetPage"\)\}/)
})

test("the edit page reads the header's facts, the open handover and the stored labels with the asset", () => {
  const page = read(PAGE)
  for (const relation of ["status", "condition", "category", "brand", "model", "company", "branch", "department", "supplier", "homeLocation"]) {
    assert.match(page, new RegExp(`\\n\\s+${relation}: (?:codeName|\\{ select: )`), relation)
  }
  assert.match(page, /custodian: \{ select: \{ code: true, fullNameTh: true, departmentId: true, department: \{ select: \{ name: true \} \} \} \}/)
  assert.match(page, /currentLocation: \{ select: \{ code: true, name: true, branch: \{ select: \{ name: true \} \} \} \}/)
  assert.match(page, /prisma\.assetCheckout\.findFirst\(\{\n\s+where: \{ assetId: asset\.id, isReturned: false, transactionStatus: "active" \},/)
  assert.match(page, /href: `\/\$\{locale\}\/asset-management\/checkouts\/\$\{openHandover\.id\}`/)
  assert.match(page, /const viewHref = appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{asset\.id\}`, returnToHref\)/)
  assert.match(page, /transferHref: buildAssetRegisterTransactionHref\(locale, asset\.id, "transfer", viewHref\)/)
  assert.match(page, /editContext=\{editContext\}/)
  // "code - name", as the pickers read (spec §5, call 1).
  assert.match(page, /custodianId: asset\.custodian \? `\$\{asset\.custodian\.code\} - \$\{asset\.custodian\.fullNameTh\}` : undefined/)
  assert.match(page, /companyId: `\$\{asset\.company\.code\} - \$\{asset\.company\.nameTh\}`/)
  // Kept: the sanitized return target and no components panel.
  assert.match(page, /backHref=\{returnToHref\}/)
  assert.doesNotMatch(page, /AssetComponentsPanel/)
  const rules = read("src/lib/asset-form-rules.ts")
  assert.match(rules, /export type AssetEditContext = \{/)
  assert.match(rules, /openHandover: \{ id: string; documentNo: string \| null; href: string \} \| null/)
  assert.match(rules, /originalLabels: Partial<Record<AssetOriginalLabelField, string>>/)
  assert.match(rules, /export type AssetOriginalLabelField = AssetField \| "brandId" \| "modelId" \| "supplierId"/)
})

test("the first card is ข้อมูลหลัก on edit with no counter; the primary reads บันทึกการแก้ไข on edit and บันทึก on create", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /<AssetFormRequiredCard title=\{isEdit \? t\("mainCardTitle"\) : t\("requiredCardTitle"\)\} counter=\{isEdit \? null : requiredProgress\}>/)
  assert.match(form, /\{isEdit \? t\("saveCorrection"\) : tCommon\("save"\)\}/)
})

test("the tag: an editable field on create; on edit text behind เปลี่ยนรหัส, whose dialog only sets values.assetTag (P2-R6)", () => {
  const form = read(`${C}asset-form.tsx`)
  const dialog = read(`${C}asset-form-tag-dialog.tsx`)
  // One Field keeps the id, the live duplicate check and the error on both pages.
  assert.equal(form.match(/id="asset-tag"\n/g)?.length, 1)
  assert.match(form, /\{isEdit \? \(\n\s+\(control\) => \(\n\s+<div id=\{control\.id\} className="flex flex-wrap items-center gap-2">\n\s+<span className="tag">\{values\.assetTag\}<\/span>\n\s+<AssetFormTagDialog currentTag=\{values\.assetTag \?\? ""\} describedBy=\{control\["aria-describedby"\]\} onConfirm=\{\(next\) => setField\("assetTag", next\)\} \/>/)
  assert.match(form, /\) : \(\n\s+<Input\n\s+value=\{values\.assetTag \?\? ""\}/)
  // The dialog: the app's dialog, an Input, the warning, no form, no live region.
  assert.match(dialog, /from "@\/components\/ui\/accessible-dialog"/)
  assert.match(dialog, /<AccessibleDialog\n/)
  assert.match(dialog, /<Notice tone="warning">\{t\("changeTagWarning"\)\}<\/Notice>/)
  assert.match(dialog, /<Input\n\s+ref=\{inputRef\}/)
  assert.match(dialog, /maxLength=\{50\}/)
  assert.match(dialog, /\{t\("changeTag"\)\}/)
  assert.doesNotMatch(dialog, /<form\b|liveError|fetch\(/)
  assert.match(dialog, /onConfirm\(next\)/)
})

test("an open handover: holder, room and แผนก read-only, a notice with the handover link and no โอนย้าย link (P2-R3)", () => {
  const form = read(`${C}asset-form.tsx`)
  const ownership = read(`${C}asset-form-ownership.tsx`)
  assert.match(form, /const custodyLocked = openHandover !== null/)
  // The lock reads the open handover, on load too.
  assert.match(form, /useState<AssetFormValues>\(\(\) => withDepartmentLock\(asset \?\? emptyAssetFormValues, employees, asset, editContext\)\)/)
  assert.match(form, /openHandover: context \? context\.openHandover !== null : false,/)
  assert.doesNotMatch(form, /openHandover: false,/)
  assert.match(form, /<Notice\n\s+tone="warning"\n\s+action=\{\n\s+<Link href=\{openHandover\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\n\s+\{t\("openHandoverLink"\)\}/)
  assert.match(form, /\{t\("openHandoverLock", \{ documentNo: openHandover\.documentNo \?\? "" \}\)\}/)
  // The room: read-only, and no ใช้ที่ตั้งประจำ while locked.
  assert.match(form, /id="asset-current-location"\n\s+value=\{values\.currentLocationId\}\n\s+required\n\s+disabled=\{custodyLocked\}/)
  assert.match(form, /\{!custodyLocked && values\.homeLocationId && values\.homeLocationId !== values\.currentLocationId \? \(/)
  // Holder and แผนก.
  assert.match(ownership, /disabled=\{departmentLock\.locked \|\| custodyLocked\}/)
  assert.match(ownership, /id="asset-custodian"[\s\S]*?disabled=\{custodyLocked\}/)
  assert.match(ownership, /checked=\{allowCrossCompanyCustodian\}\n\s+disabled=\{custodyLocked\}/)
  // The notice links the handover, never โอนย้าย; the correction hint (which links โอนย้าย) shows only without one.
  assert.match(form, /const correctionHint = isEdit && editContext && !custodyLocked \? \(/)
  assert.match(form, /t\.rich\("correctionHint", \{\n\s+link: \(chunks\) => <Link href=\{editContext\.transferHref\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{chunks\}<\/Link>,/)
  assert.match(form, /hint=\{correctionHint\}/)
  assert.match(ownership, /hint=\{correctionHint\}/)
  // A company or branch change keeps the holder, แผนก and the room while they are locked.
  assert.match(form, /function handleCompanyChange\(companyId: string\) \{\n\s+fieldErrors\.clear\([^)]*\)\n(?:\s+\/\/.*\n)?\s+setValues\(\(current\) => \(\{\n\s+\.\.\.current,\n\s+companyId,\n\s+branchId: "",\n\s+\.\.\.\(custodyLocked \? \{\} : \{ departmentId: "", custodianId: "", currentLocationId: "" \}\),/)
})

test("the edit save of handover-condition.spec.ts presses บันทึกการแก้ไข", () => {
  const spec = read("e2e/transactions/handover-condition.spec.ts")
  assert.ok(spec.includes('await page.getByRole("button", { name: "บันทึกการแก้ไข", exact: true }).filter({ visible: true }).click()'))
  assert.ok(!spec.includes('{ name: "บันทึก", exact: true }'))
})
