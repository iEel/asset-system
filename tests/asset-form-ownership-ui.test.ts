import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// Group 4 plan 2 Task 6b (spec §7.3, §8, P2-R2, P2-R11): the ownership block. The type is a Segmented from 768 px and the
// native #asset-ownership-type below, one at a time; the holder picker shows for every type that can have a holder; the
// employee list is scoped by company and branch only; แผนก follows the holder on บุคคล and Stock; "ใช้ที่ตั้งประจำ" copies
// the home location to the current one. The working tree is CRLF on Windows: every read strips \r.
const C = "src/components/assets/"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const messages = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Record<string, Record<string, string>>

test("the ownership type: a Segmented named ประเภทการถือครอง from 768 px, the native select below, one rendered at a time", () => {
  const ownership = read(`${C}asset-form-ownership.tsx`)
  const form = read(`${C}asset-form.tsx`)
  assert.match(ownership, /const isDesktop = useMediaQuery\("\(min-width: 768px\)"\)/)
  assert.match(ownership, /\{isDesktop \? \(\n\s+<FieldGroup\n\s+legend=\{t\("ownershipType"\)\}\n\s+id=\{FIELD_IDS\.ownershipType\}\n\s+required\n/)
  assert.match(ownership, /<Segmented\n\s+labelledBy=\{`\$\{FIELD_IDS\.ownershipType\}-legend`\}\n\s+showCheck\n\s+value=\{ownershipType\}/)
  assert.match(ownership, /options=\{assetOwnershipTypes\.map\(\(type\) => \(\{ value: type, label: t\(`ownershipType_\$\{type\}`\) \}\)\)\}/)
  // The phone's control keeps the stable E2E hook; the id is written once, on the native select.
  assert.match(ownership, /\) : \(\n\s+<SelectField\n\s+label=\{t\("ownershipType"\)\}\n\s+id="asset-ownership-type"\n/)
  assert.equal([ownership, form].join("\n").match(/\bid="asset-ownership-type"/g)?.length, 1)
  const th = messages("th").asset
  assert.equal(th.ownershipType, "ประเภทการถือครอง")
  assert.notEqual(th.ownershipType, th.createModeLabel, "distinct from the workspace's วิธีเพิ่มทรัพย์สิน")
  // The form renders the block inside the required card, between the basic info and the location groups.
  const at = ['<CardGroup title={t("basicInfo")}>', "<AssetFormOwnership", '<CardGroup title={t("locationStatus")}>'].map((tag) => form.indexOf(tag))
  assert.ok(at.every((index, position) => index > 0 && (position === 0 || index > at[position - 1])), at.join(","))
  assert.match(ownership, /<CardGroup title=\{t\("ownership"\)\}>/)
})

test("the holder picker shows for every type that can have a holder; ส่วนควบ keeps the note", () => {
  const ownership = read(`${C}asset-form-ownership.tsx`)
  assert.match(ownership, /\{ownershipMayHaveHolder\(ownershipType\) \? \(/)
  assert.doesNotMatch(ownership, /ownershipType === "personal" \|\| isSoftwareLicense/)
  assert.match(ownership, /<Notice tone="neutral" title=\{t\("custodianNotRequired"\)\}>\n\s+\{t\("custodianNotRequiredHelp"\)\}\n\s+<\/Notice>/)
  assert.match(ownership, /id="asset-custodian"\n\s+label=\{isSoftwareLicense \? t\("licenseAssignee"\) : t\("custodian"\)\}/)
})

test("a change of the type keeps the holder except ส่วนควบ, which also opens the install section on create", () => {
  const form = read(`${C}asset-form.tsx`)
  const handler = form.slice(form.indexOf("function handleOwnershipTypeChange("), form.indexOf("function handleCategoryChange("))
  assert.match(handler, /setValues\(\(current\) => withDepartmentLock\(changeOwnershipType\(current, nextOwnershipType\), employees, asset, editContext\)\)/)
  assert.match(handler, /if \(!isEdit && normalizeAssetOwnershipType\(nextOwnershipType\) === "component"\) openSection\("install"\)/)
  assert.doesNotMatch(handler, /custodianId: nextOwnershipType === "personal"/)
})

test("the employee list is scoped by company and branch only, with the cross-company toggle (spec §7.3, Appendix A)", () => {
  const form = read(`${C}asset-form.tsx`)
  const list = form.slice(form.indexOf("const filteredEmployees = "), form.indexOf("const selectedCustodian = "))
  assert.match(list, /allowCrossCompanyCustodian \? employees : employees\.filter/)
  assert.match(list, /companyId: values\.companyId,\n\s+branchId: values\.branchId,\n\s+branchCode: selectedBranch\?\.code,\n\s+\}\)/)
  assert.doesNotMatch(list, /department/i)
  const scopeStart = form.indexOf("function employeeMatchesAssetScope(")
  const scope = form.slice(scopeStart, form.indexOf("\n}\n", scopeStart))
  assert.match(scope, /^function employeeMatchesAssetScope\(employee: Option \| undefined, current: AssetFormValues, branches: Option\[\]\) \{/)
  assert.doesNotMatch(scope, /department/i)
  assert.match(form, /useState\(\(\) => shouldAllowCrossCompanyCustodianOnLoad\(asset, employees, branches\)\)/)
})

test("แผนก follows the holder: the form writes the locked department and shows the select disabled with the lock text", () => {
  const form = read(`${C}asset-form.tsx`)
  const ownership = read(`${C}asset-form-ownership.tsx`)
  // On load (a clone is locked too), on the holder pick and on the type change.
  assert.match(form, /useState<AssetFormValues>\(\(\) => withDepartmentLock\(asset \?\? emptyAssetFormValues, employees, asset, editContext\)\)/)
  assert.match(form, /setValues\(\(current\) => withDepartmentLock\(\{ \.\.\.current, custodianId \}, employees, asset, editContext\)\)/)
  assert.match(form, /const departmentLock = departmentLockOf\(values, employees, asset, editContext\)/)
  const lockOf = form.slice(form.indexOf("function departmentLockOf("), form.indexOf("function withDepartmentLock("))
  assert.match(lockOf, /return getAssetFormDepartmentLock\(\{/)
  // Task 7: an inactive stored holder takes its department from the edit page; an open handover frees the lock (the
  // stored department stays) and makes แผนก read-only.
  assert.match(lockOf, /holderDepartmentName: holder\?\.departmentName \?\? \(storedHolder \? context\?\.holder\?\.departmentName \?\? null : null\),/)
  assert.match(lockOf, /openHandover: context \? context\.openHandover !== null : false,/)
  assert.match(ownership, /disabled=\{departmentLock\.locked \|\| custodyLocked\}/)
  assert.match(ownership, /tTransfer\("followsHolder", \{ department: departmentLockText \}\)/)
  assert.match(read(`${C}asset-form-section.tsx`), /<NativeSelect value=\{value\} required=\{required\} disabled=\{disabled\} onChange=\{\(event\) => onChange\(event\.target\.value\)\}>/)
  assert.equal(messages("th").transfer.followsHolder, "ตามผู้ถือครอง: {department}")
  // Each employee option carries its department's name.
  const options = read("src/lib/asset-form-options.ts")
  assert.match(options, /department: \{ select: \{ code: true, name: true \} \},/)
  assert.match(options, /departmentName: employee\.department\.name,/)
})

test("ใช้ที่ตั้งประจำ copies the home location to the current one; the home location has its id", () => {
  const form = read(`${C}asset-form.tsx`)
  assert.match(form, /label=\{t\("homeLocation"\)\}\n\s+id="asset-home-location"/)
  assert.match(form, /\{!custodyLocked && values\.homeLocationId && values\.homeLocationId !== values\.currentLocationId \? \(/)
  assert.match(form, /<Button variant="outline" size="sm" onClick=\{\(\) => setField\("currentLocationId", values\.homeLocationId \?\? ""\)\}>\n\s+\{t\("useHomeLocation"\)\}/)
  assert.equal(messages("th").asset.useHomeLocation, "ใช้ที่ตั้งประจำ")
  assert.equal(messages("en").asset.useHomeLocation, "Use home location")
})
