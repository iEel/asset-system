import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

// The brands and models E2E spec of page group 7 plan 1 (plan docs/superpowers/plans/2026-11-05-group7-brands-models.md,
// Task 5): what it stands on — the app's own words, the suite's fixtures, the IT head's run role with brand:create and
// IT staff without it, run-marked names only, axe through recordSettled, and no DELETE. The spec runs with
// `npx playwright test e2e/master-data`; these pins need no app. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the brands and models spec reads the app's own words (group 7 plan 1 task 5)", async () => {
  const { BRAND_MODEL_WORDS } = await import("../e2e/master-data/brands-models-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(BRAND_MODEL_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(BRAND_MODEL_WORDS.createModel, th.brandModel.quickAdd.createModel)
  assert.equal(BRAND_MODEL_WORDS.noPermission, th.brandModel.quickAdd.noPermission)
  assert.equal(BRAND_MODEL_WORDS.exists, th.brandModel.clash.exists)
  assert.equal(BRAND_MODEL_WORDS.use, th.brandModel.clash.use)
  assert.equal(BRAND_MODEL_WORDS.sourceAssetForm, th.brandModel.recent.sourceAssetForm)
  assert.equal(BRAND_MODEL_WORDS.deactivateBodyModel, th.brandModel.deactivate.confirmBodyModel)
})

test("the IT head's run role adds brands and models, IT staff do not (group 7 plan 1 task 5 ruling)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  for (const permission of ["brand:view", "brand:create", "brand:edit"]) assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes(permission), permission)
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => permission.startsWith("brand:")), `${key} holds no brand permission`)
  }
})

test("the brands and models spec: the quick add with its similar name, the duplicate rule, เพิ่มล่าสุด, the confirm cancelled, the phone, IT staff's hint (group 7 plan 1 task 5)", () => {
  const spec = read("e2e/master-data/brands-models.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!/import \{[^}]*\b(?:test|expect)\b[^}]*\} from "@playwright\/test"/.test(spec), "test and expect from the fixtures")
  assert.ok(spec.includes(`asUser("itHead")`) && spec.includes(`asUser("itStaff")`))
  // Run-marked names only: every brand and model name starts with the run and project marker.
  for (const name of ["const brandName = `${mark} Brandtest`", "const similarName = `${mark} Nova 54`", "const newName = `${mark} Nova54 Plus`"]) assert.ok(spec.includes(name), name)
  assert.ok(spec.includes("return txAssetName(readRunState().runId, projectName, \"\").trim()"))
  // The quick add: the create row, the similar name, the save, the typed fields unchanged (Review Focus 5).
  assert.ok(spec.includes("fillTemplate(W.createModel, { query: newName })"))
  assert.ok(spec.includes("dialog.getByRole(\"heading\", { name: W.similarHeading, exact: true })"))
  for (const field of ["#asset-tag\")).toHaveValue(tag)", "#asset-name\")).toHaveValue(assetName)", "#asset-serial-number\")).toHaveValue(serial)", "#asset-category\")).toHaveValue(masters.categoryId)"]) assert.ok(spec.includes(field), field)
  // The duplicate rule: a 409 the test expects, then ใช้ picks the existing model.
  assert.ok(spec.includes("measure.expectRefusal({ method: \"POST\", url: /\\/api\\/models$/, status: 409"))
  assert.ok(spec.includes("fillTemplate(W.use, { name: newName })"))
  // เพิ่มล่าสุด from the filter form, and ปิดใช้งาน's confirm cancelled: the suite sends no DELETE.
  assert.ok(spec.includes("await expect(page).toHaveURL(/[?&]added=7(?:&|$)/)"))
  assert.ok(spec.includes("source: W.sourceAssetForm"))
  assert.ok(spec.includes("fillTemplate(W.deactivateBodyModel, { assets: 1 })"))
  assert.ok(spec.includes("await confirm.getByRole(\"button\", { name: W.cancel, exact: true }).click()"))
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(/)
  // The phone's brand select and cards; IT staff's hint without a create row (Review Focus 4).
  assert.ok(spec.includes("page.getByLabel(W.phoneBrandSelect, { exact: true })"))
  assert.ok(spec.includes("popover.getByText(W.noPermission, { exact: true })"))
  // axe through recordSettled; no shared master data and no sign-in.
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 7)
  assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin|categories)|signInOnce\(/)
})

// The employees E2E spec of page group 7 plan 2 (plan docs/superpowers/plans/2026-11-06-group7-employees.md, Task 5).
test("the employees spec reads the app's own words (group 7 plan 2 task 5)", async () => {
  const { EMPLOYEE_WORDS } = await import("../e2e/master-data/employees-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(EMPLOYEE_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(EMPLOYEE_WORDS.formerCard, th.employee.summaryFormerWithAssets)
  assert.equal(EMPLOYEE_WORDS.formerChip, th.employee.formerFilterChip)
  assert.equal(EMPLOYEE_WORDS.handOverToPerson, th.employee.detail.handOverToPerson)
  assert.equal(EMPLOYEE_WORDS.formerHoldingTitle, th.employee.detail.formerHoldingTitle)
  assert.equal(EMPLOYEE_WORDS.returnAsset, th.employee.detail.returnAsset)
  assert.equal(EMPLOYEE_WORDS.reasonOpenRepair, th.asset.transactionReasonActiveMaintenance)
  assert.equal(EMPLOYEE_WORDS.legacyConfirmTitle, th.checkin.legacyReturnConfirmTitle)
  assert.equal(EMPLOYEE_WORDS.legacyConfirm, th.checkin.legacyReturnConfirm)
})

test("the IT head's run role views employees, IT staff do not (group 7 plan 2 task 5)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes("employee:view"))
  assert.ok(!E2E_ROLE_PERMISSIONS.itHead.some((permission) => permission.startsWith("employee:") && permission !== "employee:view"), "view only")
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => permission.startsWith("employee:")), `${key} holds no employee permission`)
  }
})

test("the employees spec: a run employee marked ลาออก by the seed admin, the former card, the held assets, รับคืน back to the page, the legacy path, an open repair's reason (group 7 plan 2 task 5)", () => {
  const spec = read("e2e/master-data/employees.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(spec.includes(`asUser("itHead")`))
  // Run-marked: the employee's code and name, and the assets' tags, carry the run and the project.
  assert.ok(spec.includes("code: `${runId}-${projectCode(projectName)}-FH`"))
  assert.ok(spec.includes(`txAssetName(runId, projectName, "พนักงานพ้นสภาพ")`))
  for (const key of [`"EMH"`, `"EML"`, `"EMR"`]) assert.ok(spec.includes(`createTxAsset(page, masters, project, ${key}`), key)
  // The seed admin creates the employee and marks it ลาออก through the employee API; no LDAP, no isActive false, no DELETE.
  assert.ok(spec.includes(`admin.post("/api/employees"`) && spec.includes("admin.put(`/api/employees/${employee.id}`"))
  assert.ok(spec.includes(`employeeBody(employee, "resigned")`))
  assert.doesNotMatch(spec, /isActive: false|method: "DELETE"|\.delete\(/)
  assert.doesNotMatch(spec, /\/api\/admin\/settings/)
  // The card, the page, the two returns back to the page and the disabled one.
  assert.ok(spec.includes(`url.searchParams.get("former") === "withAssets"`))
  assert.ok(spec.includes(`url.searchParams.get("custodianId") === employee.id`))
  assert.ok(spec.includes(`url.searchParams.get("checkoutId") === handover.id`))
  assert.ok(spec.includes(`url.searchParams.get("assetId") === legacy.id`))
  assert.ok(spec.includes(`page.getByRole("alertdialog", { name: W.legacyConfirmTitle })`))
  for (const count of [3, 2, 1]) assert.ok(spec.includes(`warning(page, ${count})`), `${count} held`)
  assert.ok(spec.includes(`repairEntry.locator('[aria-disabled="true"]')).toHaveText(W.returnLabel)`))
  // The phone's card and axe through recordSettled.
  assert.ok(spec.includes("[data-employee-mobile-list] article"))
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 7)
})

// The locations E2E spec of page group 7 plan 3 (plan docs/superpowers/plans/2026-11-06-group7-locations.md, Task 5).
test("the locations spec reads the app's own words (group 7 plan 3 task 5)", async () => {
  const { LOCATION_WORDS } = await import("../e2e/master-data/locations-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(LOCATION_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(LOCATION_WORDS.subtree, th.location.tree.subtree)
  assert.equal(LOCATION_WORDS.assetsAt, th.location.tree.assetsAt)
  assert.equal(LOCATION_WORDS.addChild, th.location.tree.addChild)
  assert.equal(LOCATION_WORDS.deactivateTitle, th.location.deactivate.confirmTitle)
  assert.equal(LOCATION_WORDS.blockedActiveChildren, th.location.deactivate.blocked.activeChildren)
  assert.equal(LOCATION_WORDS.blockedCurrentAssets, th.location.deactivate.blocked.currentAssets)
  assert.equal(LOCATION_WORDS.blockedHomeAssets, th.location.deactivate.blocked.homeAssets)
  assert.equal(LOCATION_WORDS.blockedFooter, th.location.deactivate.blockedFooter)
  assert.equal(LOCATION_WORDS.reactivateTitle, th.location.reactivate.confirmTitle)
  assert.equal(LOCATION_WORDS.parentEmpty, th.location.form.parentEmpty)
})

test("the IT head's run role views, adds and edits locations, no one deletes them, IT staff hold none (group 7 plan 3 task 5)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  for (const permission of ["location:view", "location:create", "location:edit"]) assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes(permission), permission)
  for (const key of ["itHead", "itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].includes("location:delete"), `${key} holds no location:delete`)
  }
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => permission.startsWith("location:")), `${key} holds no location permission`)
  }
})

test("the locations spec: a run-marked chain by the seed admin, the tree's counts, the register by path, เพิ่มที่ตั้งในนี้, the floor's picker, crafted parents refused, blockers then ปิด, เปิดใช้งาน (group 7 plan 3 task 5)", () => {
  const spec = read("e2e/master-data/locations.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(spec.includes(`asUser("itHead")`))
  // Run-marked: every code starts with the run and the project; the seed admin creates the chain.
  assert.ok(spec.includes("const prefix = `${runId}-${projectCode(project)}-LT`"))
  for (const code of ["`${prefix}B`", "`${prefix}F`", "`${prefix}R`", "`${prefix}N`", "`${prefix}X`"]) assert.ok(spec.includes(code), code)
  assert.ok(spec.includes(`admin.post("/api/locations"`))
  // The crafted refusals (Review Focus 1, 2).
  assert.ok(spec.includes(`"LOCATION_PARENT_CYCLE", "locationParentCycle"`))
  assert.equal((spec.match(/"LOCATION_PARENT_OTHER_BRANCH", "locationParentOtherBranch"/g) ?? []).length, 2)
  // The tree's counts, the register by the room with its path, the list by a search, the preset form, the picker.
  assert.ok(spec.includes("fillTemplate(W.subtree, { n: 1 })"))
  assert.ok(spec.includes(`url.searchParams.get("locationId") === room.id`))
  assert.ok(spec.includes("`${W.locationChip}: ${runBranch.name}${PATH}${chainPath}`"))
  assert.ok(spec.includes("[data-location-mobile-list] article"))
  assert.ok(spec.includes(`url.searchParams.get("parentId") === floor.id && url.searchParams.get("branchId") === runBranch.id`))
  assert.ok(spec.includes("for (const left of [room, added, floor])"))
  // ปิดใช้งาน is checked up to its confirm: no deactivate button, closed with ปิด; the suite sends no DELETE.
  assert.ok(spec.includes(`confirm.getByRole("button", { name: W.deactivate, exact: true })).toHaveCount(0)`))
  assert.ok(spec.includes(`confirm.getByRole("button", { name: W.close, exact: true }).click()`))
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(/)
  // isActive false only on the location this test made, through a PUT; no settings, no LDAP.
  assert.equal((spec.match(/isActive: false/g) ?? []).length, 1)
  assert.ok(spec.includes("adminAgain.put(`/api/locations/${added.id}`, { data: locationBody(added, { isActive: false }) })"))
  assert.doesNotMatch(spec, /\/api\/admin|signInOnce\(/)
  // axe through recordSettled.
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 8)
})

// Group 7 follow-ups Task 5 (plan docs/superpowers/plans/2026-11-07-group7-followups.md): the new words the two specs
// read are the app's own keys, and the employees spec still sends no DELETE and opens no ปิดใช้งาน confirm.
test("the group 7 follow-ups words and the employees spec's limits (group 7 follow-ups task 5)", async () => {
  const { EMPLOYEE_WORDS } = await import("../e2e/master-data/employees-words.ts")
  const { LOCATION_WORDS } = await import("../e2e/master-data/locations-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(EMPLOYEE_WORDS.recordStatusLabel, th.common.recordStatus.label)
  assert.equal(EMPLOYEE_WORDS.recordAll, th.common.recordStatus.all)
  assert.equal(EMPLOYEE_WORDS.listTotals, th.employee.listTotals)
  assert.equal(EMPLOYEE_WORDS.viewHeldAssets, th.employee.viewHeldAssets)
  assert.equal(EMPLOYEE_WORDS.heldStatFootSplit, th.employee.detail.heldStatFootSplit)
  assert.equal(EMPLOYEE_WORDS.currentAuditEmpty, th.employee.detail.currentAuditEmpty)
  assert.equal(EMPLOYEE_WORDS.openRepair, th.employee.detail.openRepair)
  assert.equal(EMPLOYEE_WORDS.reasonOpenCheckout, th.asset.transactionReasonOpenCheckout)
  assert.equal(LOCATION_WORDS.parentChildCount, th.location.form.parentChildCount)
  const spec = read("e2e/master-data/employees.spec.ts")
  assert.ok(spec.includes("code: `${runId}-${projectCode(projectName)}-FN`"), "the idle employee is run-marked")
  assert.ok(spec.includes("await expect(menuItem(rowMenu, W.deactivate)).toHaveCount(0)"), "no ปิดใช้งาน without employee:delete")
  assert.doesNotMatch(spec, /deactivateTitle|confirmTitle/)
})

// The companies, branches and departments E2E spec of page group 8 plan 1 (plan
// docs/superpowers/plans/2026-11-07-group8-org-lists.md, Task 5).
test("the org lists spec reads the app's own words, and the department guard's reason is the server's (group 8 plan 1 task 5)", async () => {
  const { ORG_LIST_WORDS } = await import("../e2e/master-data/org-lists-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(ORG_LIST_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(ORG_LIST_WORDS.recordStatusLabel, th.common.recordStatus.label)
  assert.equal(ORG_LIST_WORDS.footerCounts, th.common.recordStatus.footerCounts)
  assert.equal(ORG_LIST_WORDS.moreActionsFor, th.common.moreActionsFor)
  assert.equal(ORG_LIST_WORDS.tableScrollHint, th.common.tableScrollHint)
  assert.equal(ORG_LIST_WORDS.addBranch, th.company.list.addBranch)
  assert.equal(ORG_LIST_WORDS.addLocation, th.branch.list.addLocation)
  assert.equal(ORG_LIST_WORDS.viewEmployees, th.branch.list.viewEmployees)
  assert.equal(ORG_LIST_WORDS.branchFooterTotals, th.branch.list.footerTotals)
  assert.equal(ORG_LIST_WORDS.moveBeforeDeactivate, th.department.list.moveBeforeDeactivate)
  assert.equal(ORG_LIST_WORDS.departmentSummaryLine, th.department.list.summaryLine)
  assert.equal(ORG_LIST_WORDS.departmentNameSort, th.department.name)
  assert.equal(ORG_LIST_WORDS.departmentChip, th.asset.department)
  assert.equal(ORG_LIST_WORDS.branchCreateTitle, th.branch.createTitle)
  assert.equal(ORG_LIST_WORDS.companyCreateTitle, th.company.createTitle)
  assert.equal(ORG_LIST_WORDS.departmentCreateTitle, th.department.createTitle)
  assert.equal(ORG_LIST_WORDS.locationCreateTitle, th.location.createTitle)
  // The 409's reason is a server string (not a message): the spec's constant is what the guard gives for one employee
  // and one asset.
  const { getDepartmentDeleteBlockReason } = await import("../src/lib/organization-master-query.ts")
  const spec = read("e2e/master-data/org-lists.spec.ts")
  const reason = getDepartmentDeleteBlockReason({ employees: 1, assets: 1, openAuditRounds: 0 })
  assert.ok(spec.includes(`const DEPARTMENT_BLOCKED = "${reason}"`), reason ?? "a reason")
})

test("the IT head's run role views the companies, branches and departments lists and adds a branch, deletes and edits none of them, IT staff hold none (group 8 plan 1 task 5)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  for (const permission of ["company:view", "branch:view", "branch:create", "department:view"]) assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes(permission), permission)
  for (const moduleName of ["company", "branch", "department"]) {
    for (const action of ["edit", "delete"]) assert.ok(!E2E_ROLE_PERMISSIONS.itHead.includes(`${moduleName}:${action}`), `the IT head holds no ${moduleName}:${action}`)
  }
  assert.ok(!E2E_ROLE_PERMISSIONS.itHead.includes("company:create") && !E2E_ROLE_PERMISSIONS.itHead.includes("department:create"))
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => /^(?:company|branch|department):/.test(permission)), `${key} holds no company, branch or department permission`)
  }
})

test("the org lists spec: run-marked organisation by the seed admin, the three boards, the presets with กลับ, no ปิดใช้งาน without delete, the guard's 409 through PUT, the phone's table (group 8 plan 1 task 5)", () => {
  const spec = read("e2e/master-data/org-lists.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!/import \{[^}]*\b(?:test|expect)\b[^}]*\} from "@playwright\/test"/.test(spec), "test and expect from the fixtures")
  assert.ok(spec.includes(`asUser("itHead")`))
  // Run-marked: every code starts with the run and the project; the seed admin creates them through the setup's APIs.
  assert.ok(spec.includes("const prefix = `${runId}-${projectCode(projectName)}-OG`"))
  for (const code of ["`${prefix}B`", "`${prefix}D`", "`${prefix}R`", "`${prefix}E`"]) assert.ok(spec.includes(code), code)
  for (const route of ["/api/branches", "/api/departments", "/api/locations", "/api/employees"]) assert.ok(spec.includes(`admin.post("${route}"`), route)
  // No company per run (E2E-1107E: the dashboard's company tabs stop at four companies): the run's company, read through
  // the API, never a POST to /api/companies and no company code of the spec's own.
  assert.ok(spec.includes("const companyId = readRunData().companyId"))
  assert.ok(spec.includes("admin.get(`/api/companies/${companyId}`)"))
  assert.doesNotMatch(spec, /\.post\(\s*["'`]\/api\/companies/)
  assert.ok(!spec.includes("`${prefix}C`"), "no company code of the spec's own")
  // The real company's counts are not the test's: the chosen option and numbers, the branch and asset links at least 1.
  assert.equal((spec.match(/await expectStatusChosen\(page, "(?:active|all)"\)/g) ?? []).length, 2)
  assert.equal((spec.match(/await expectCountAtLeastOne\(countLink\(companyRow, `\/th\/(?:master-data\/branches|assets)\?companyId=\$\{company\.id\}&page=1`\)\)/g) ?? []).length, 2)
  // The branch form opened from the companies list is never saved (no extra branch on the real company).
  assert.doesNotMatch(spec, /getByRole\("button", \{ name: W\.save/)
  // The segmented counts on the run's own branch and department, the presets with returnTo and กลับ, the department
  // filter's chip.
  assert.equal((spec.match(/await expectStatusCounts\(page, "active", \{ active: 1, inactive: 0, all: 1 \}\)/g) ?? []).length, 2)
  assert.ok(spec.includes(`url.pathname === "/th/master-data/branches/new" && url.searchParams.get("companyId") === company.id`))
  assert.ok(spec.includes(`await expect(page.locator("#branch-company")).toHaveValue(company.id)`))
  assert.ok(spec.includes(`url.pathname === "/th/master-data/locations/new" && url.searchParams.get("branchId") === branch.id`))
  assert.ok(spec.includes(`await expect(page.locator("#location-branch")).toHaveValue(branch.id)`))
  assert.ok(spec.includes("await expectBackTo(page, companiesPath, company.code)") && spec.includes("await expectBackTo(page, branchesPath, branch.code)"))
  assert.ok(spec.includes(`url.searchParams.get("departmentId") === department.id`))
  assert.ok(spec.includes("`${W.departmentChip}: ${department.code} - ${department.name}`"))
  // ปิดใช้งาน absent on the companies and branches ⋯ (no delete permission); the departments row has no ⋯ at all.
  assert.equal((spec.match(/await expect\(menuItem\(\w+Menu, W\.deactivate\)\)\.toHaveCount\(0\)/g) ?? []).length, 2)
  // Final review: no แก้ไข and plain rows without <module>:edit, the header's เพิ่ม… only with <module>:create.
  assert.equal((spec.match(/await expect\(menuItem\(\w+Menu, W\.edit\)\)\.toHaveCount\(0\)/g) ?? []).length, 2)
  assert.equal((spec.match(/await expectPlainRow\(\w+Row\)/g) ?? []).length, 3)
  assert.ok(spec.includes("await expect(headerCreateLink(page, W.companyCreateTitle)).toHaveCount(0)"))
  assert.ok(spec.includes("await expect(headerCreateLink(page, W.branchCreateTitle)).toHaveCount(1)"))
  assert.ok(spec.includes("await expect(headerCreateLink(page, W.departmentCreateTitle)).toHaveCount(0)"))
  assert.ok(spec.includes("await expect(departmentRow.getByRole(\"button\", { name: fillTemplate(W.moreActionsFor, { code: department.code }), exact: true })).toHaveCount(0)"))
  assert.doesNotMatch(spec, /\{ label: W\.edit, reason: null, available: true \}/)
  // The guard through PUT isActive false on the spec's own department, refused with 409; never a DELETE.
  assert.equal((spec.match(/isActive: false/g) ?? []).length, 1)
  assert.ok(spec.includes("admin.put(`/api/departments/${department.id}`"))
  assert.ok(spec.includes(".toBe(409)") && spec.includes(".error).toBe(DEPARTMENT_BLOCKED)"))
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(/)
  assert.doesNotMatch(spec, /\/api\/admin|signInOnce\(/)
  // The phone's table and sheet, axe through recordSettled.
  assert.equal((spec.match(/if \(phone\) await expectPhoneTable\(page, W\.\w+Title\)/g) ?? []).length, 3)
  assert.ok(spec.includes(`page.getByRole("dialog")`))
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 10)
})

// The categories list and form E2E spec of page group 8 plan 2 (plan docs/superpowers/plans/2026-11-07-group8-categories.md,
// Task 4).
test("the categories spec reads the app's own words, and the category guard's reason is the server's (group 8 plan 2 task 4)", async () => {
  const { CATEGORY_WORDS } = await import("../e2e/master-data/categories-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(CATEGORY_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(CATEGORY_WORDS.categoriesTitle, th.category.title)
  assert.equal(CATEGORY_WORDS.createTitle, th.category.createTitle)
  assert.equal(CATEGORY_WORDS.recordStatusLabel, th.common.recordStatus.label)
  assert.equal(CATEGORY_WORDS.footerCounts, th.common.recordStatus.footerCounts)
  assert.equal(CATEGORY_WORDS.moreActionsFor, th.common.moreActionsFor)
  assert.equal(CATEGORY_WORDS.tableScrollHint, th.common.tableScrollHint)
  assert.equal(CATEGORY_WORDS.save, th.common.save)
  assert.equal(CATEGORY_WORDS.listTotals, th.category.list.totals)
  assert.equal(CATEGORY_WORDS.prefixMissing, th.category.list.prefixMissing)
  assert.equal(CATEGORY_WORDS.prefixFallback, th.category.list.prefixFallback)
  assert.equal(CATEGORY_WORDS.customFieldCount, th.category.list.customFieldCount)
  assert.equal(CATEGORY_WORDS.none, th.category.list.none)
  assert.equal(CATEGORY_WORDS.viewModels, th.category.list.viewModels)
  assert.equal(CATEGORY_WORDS.viewAssets, th.category.list.viewAssets)
  assert.equal(CATEGORY_WORDS.setPrefixInSettings, th.category.list.setPrefixInSettings)
  assert.equal(CATEGORY_WORDS.deactivate, th.category.deactivate.action)
  assert.equal(CATEGORY_WORDS.editTitle, th.category.form.editTitle)
  assert.equal(CATEGORY_WORDS.usageLine, th.category.form.usageLine)
  assert.equal(CATEGORY_WORDS.formPrefixFallback, th.category.form.prefixFallback)
  assert.equal(CATEGORY_WORDS.addCustomField, th.category.addCustomField)
  assert.equal(CATEGORY_WORDS.fieldTypeDate, th.category.fieldTypeDate)
  assert.equal(CATEGORY_WORDS.fieldTypeBoolean, th.category.fieldTypeBoolean)
  assert.equal(CATEGORY_WORDS.newBadge, th.category.form.newBadge)
  assert.equal(CATEGORY_WORDS.summaryTitle, th.category.form.summaryTitle)
  assert.equal(CATEGORY_WORDS.summaryModels, th.category.form.summaryModels)
  assert.equal(CATEGORY_WORDS.summaryFieldCount, th.category.form.summaryFieldCount)
  assert.equal(CATEGORY_WORDS.summaryNewFields, th.category.form.summaryNewFields)
  assert.equal(CATEGORY_WORDS.footerEdit, th.category.form.footerEdit)
  assert.equal(CATEGORY_WORDS.noChanges, th.category.form.noChanges)
  assert.equal(CATEGORY_WORDS.changeFieldsAdded, th.category.form.changeFieldsAdded)
  // The locked status's reason is a server string (not a message): the spec's constant is what the guard gives for one
  // model and no asset.
  const { getCategoryDeleteBlockReason } = await import("../src/lib/category-delete-guard.ts")
  const spec = read("e2e/master-data/categories.spec.ts")
  const reason = getCategoryDeleteBlockReason({ assets: 0, models: 1 })
  assert.ok(spec.includes(`const CATEGORY_BLOCKED = "${reason}"`), reason ?? "a reason")
})

test("the IT head's run role views and edits categories, creates and deletes none, IT staff hold none (group 8 plan 2 task 4)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  for (const permission of ["category:view", "category:edit"]) assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes(permission), permission)
  for (const action of ["create", "delete"]) assert.ok(!E2E_ROLE_PERMISSIONS.itHead.includes(`category:${action}`), `the IT head holds no category:${action}`)
  // The prefix lives in the settings: the run's role cannot open them, so ⋯ has no prefix link.
  assert.ok(!E2E_ROLE_PERMISSIONS.itHead.some((permission) => permission.startsWith("setting:")), "no setting permission")
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => permission.startsWith("category:")), `${key} holds no category permission`)
  }
})

test("the categories spec: a run-marked category with a run model by the seed admin, the list's board facts and ⋯, the locked status, two fields added and kept, the phone (group 8 plan 2 task 4)", () => {
  const spec = read("e2e/master-data/categories.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!/import \{[^}]*\b(?:test|expect)\b[^}]*\} from "@playwright\/test"/.test(spec), "test and expect from the fixtures")
  assert.ok(spec.includes(`asUser("itHead")`))
  // Run-marked: the category's code carries the run and the project; the seed admin creates the category, brand and model.
  assert.ok(spec.includes("code: `${runId}-${projectCode(projectName)}-CTG`"))
  for (const route of ["/api/categories", "/api/brands", "/api/models"]) assert.ok(spec.includes(`admin.post("${route}"`), route)
  // The model's name has four words, so readOneModel (one to three) never picks it.
  assert.ok(spec.includes(`name("รุ่น ทดสอบหมวดหมู่")`))
  // The list: the counts, the row, ⋯ with แก้ไข / ดูรุ่น / ดูทรัพย์สิน only.
  assert.ok(spec.includes(`await expectStatusCounts(page, "active", { active: 1, inactive: 0, all: 1 })`))
  assert.ok(spec.includes("{ label: W.edit, reason: null, available: true }"))
  assert.ok(spec.includes("await expect(menuItem(rowMenu, W.deactivate)).toHaveCount(0)"))
  assert.ok(spec.includes("await expect(menuItem(rowMenu, W.setPrefixInSettings)).toHaveCount(0)"))
  // The form: the locked status, the panel and the footer, the two types, the save and the reopen.
  assert.ok(spec.includes("await expect(statusBox).toBeDisabled()"))
  assert.ok(spec.includes(`fieldType: "date"`) && spec.includes(`fieldType: "boolean"`))
  assert.ok(spec.includes("fillTemplate(W.summaryFieldCount, { count: 3 })"))
  assert.ok(spec.includes("fillTemplate(W.changeFieldsAdded, { count: 2 })"))
  assert.ok(spec.includes(`response.request().method() === "PUT"`))
  assert.ok(spec.includes("await page.goto(editPath, { waitUntil: \"load\" })"))
  assert.ok(spec.includes(`getByText(W.newBadge, { exact: true })).toHaveCount(0)`))
  // Never a DELETE, never isActive false, never the settings.
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(|isActive: false/)
  assert.doesNotMatch(spec, /\/api\/admin|signInOnce\(/)
  // The phone's table and sheet, axe through recordSettled.
  assert.ok(spec.includes("if (phone) await expectPhoneTable(page, W.categoriesTitle)"))
  assert.ok(spec.includes(`page.getByRole("dialog")`))
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 7)
})

// The suppliers list and page E2E spec of page group 8 plan 3 (plan docs/superpowers/plans/2026-11-07-group8-suppliers.md,
// Task 4).
test("the suppliers spec reads the app's own words, and the supplier guard's reason is the server's (group 8 plan 3 task 4)", async () => {
  const { SUPPLIER_WORDS } = await import("../e2e/master-data/suppliers-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(SUPPLIER_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(SUPPLIER_WORDS.suppliersTitle, th.supplier.title)
  assert.equal(SUPPLIER_WORDS.createTitle, th.supplier.createTitle)
  assert.equal(SUPPLIER_WORDS.recordStatusLabel, th.common.recordStatus.label)
  assert.equal(SUPPLIER_WORDS.moreActionsFor, th.common.moreActionsFor)
  assert.equal(SUPPLIER_WORDS.edit, th.common.edit)
  assert.equal(SUPPLIER_WORDS.back, th.common.back)
  assert.equal(SUPPLIER_WORDS.assetsColumn, th.supplier.list.assets)
  assert.equal(SUPPLIER_WORDS.purchaseDocumentsColumn, th.supplier.purchaseDocuments)
  assert.equal(SUPPLIER_WORDS.repairsColumn, th.supplier.maintenanceTickets)
  assert.equal(SUPPLIER_WORDS.noContact, th.supplier.noContactDetail)
  assert.equal(SUPPLIER_WORDS.addContact, th.supplier.list.addContact)
  assert.equal(SUPPLIER_WORDS.none, th.supplier.list.none)
  assert.equal(SUPPLIER_WORDS.openRepairs, th.supplier.list.openRepairs)
  assert.equal(SUPPLIER_WORDS.summaryLine, th.supplier.list.summaryLine)
  assert.equal(SUPPLIER_WORDS.nameSort, th.supplier.name)
  assert.equal(SUPPLIER_WORDS.contactLine, th.supplier.detail.contactLine)
  assert.equal(SUPPLIER_WORDS.repairCostLabel, th.supplier.totalMaintenanceCost)
  assert.equal(SUPPLIER_WORDS.baht, th.common.baht)
  assert.equal(SUPPLIER_WORDS.assetsWithoutDocument, th.supplier.detail.assetsWithoutDocument)
  assert.equal(SUPPLIER_WORDS.purchaseAmountFoot, th.supplier.detail.purchaseAmountFoot)
  assert.equal(SUPPLIER_WORDS.repairsFoot, th.supplier.detail.repairsFoot)
  assert.equal(SUPPLIER_WORDS.repairCostFoot, th.supplier.detail.repairCostFoot)
  assert.equal(SUPPLIER_WORDS.assetsPanelTitle, th.supplier.linkedAssetsTitle)
  assert.equal(SUPPLIER_WORDS.latestAssets, th.supplier.detail.latestAssets)
  assert.equal(SUPPLIER_WORDS.viewAllAssets, th.supplier.detail.viewAllAssets)
  assert.equal(SUPPLIER_WORDS.assetsCaption, th.supplier.detail.assetsCaption)
  assert.equal(SUPPLIER_WORDS.noDocument, th.supplier.detail.noDocument)
  assert.equal(SUPPLIER_WORDS.moreDocuments, th.supplier.detail.moreDocuments)
  assert.equal(SUPPLIER_WORDS.documentsCaption, th.supplier.detail.documentsCaption)
  assert.equal(SUPPLIER_WORDS.documentsTotal, th.supplier.detail.documentsTotal)
  assert.equal(SUPPLIER_WORDS.typePurchaseOrder, th.asset.purchaseDocumentTypes.purchase_order)
  assert.equal(SUPPLIER_WORDS.typeInvoice, th.asset.purchaseDocumentTypes.invoice)
  assert.equal(SUPPLIER_WORDS.amountUnset, th.supplier.detail.amountUnset)
  assert.equal(SUPPLIER_WORDS.followUpTitle, th.supplier.followUpTitle)
  assert.equal(SUPPLIER_WORDS.followUpCount, th.supplier.detail.followUpCount)
  assert.equal(SUPPLIER_WORDS.openRepairLink, th.supplier.detail.openRepairLink)
  assert.equal(SUPPLIER_WORDS.repairHistoryTitle, th.supplier.maintenanceHistoryTitle)
  assert.equal(SUPPLIER_WORDS.profileTitle, th.supplier.profileTitle)
  assert.equal(SUPPLIER_WORDS.activeFilters, th.asset.activeFilters)
  assert.equal(SUPPLIER_WORDS.supplierChip, th.asset.supplier)
  // ข้อมูลผู้ขาย's reason is a server string (not a message): the spec's constant is what the guard gives for three
  // assets, two repairs and three documents.
  const { getSupplierDeactivateBlockReason } = await import("../src/lib/organization-master-query.ts")
  const spec = read("e2e/master-data/suppliers.spec.ts")
  const reason = getSupplierDeactivateBlockReason({ assets: 3, maintenanceTickets: 2, maintenancePlans: 0, purchaseDocuments: 3 })
  assert.ok(spec.includes(`const SUPPLIER_BLOCKED = "${reason}"`), reason ?? "a reason")
})

test("the IT head's run role views suppliers only, IT staff hold none (group 8 plan 3 task 4)", async () => {
  const { E2E_ROLE_PERMISSIONS } = await import("../e2e/support/run-plan.ts")
  assert.ok(E2E_ROLE_PERMISSIONS.itHead.includes("supplier:view"))
  for (const action of ["create", "edit", "delete"]) assert.ok(!E2E_ROLE_PERMISSIONS.itHead.includes(`supplier:${action}`), `the IT head holds no supplier:${action}`)
  for (const key of ["itStaff", "viewer", "employee"] as const) {
    assert.ok(!E2E_ROLE_PERMISSIONS[key].some((permission) => permission.startsWith("supplier:")), `${key} holds no supplier permission`)
  }
})

test("the suppliers spec: run-marked suppliers by the seed admin, run assets, documents and repairs by the IT head, the list's facts without ⋯, the four figures, the total row as the sum, the register by supplierId, the back link, the phone (group 8 plan 3 task 4)", () => {
  const spec = read("e2e/master-data/suppliers.spec.ts")
  assert.ok(spec.includes(`import { asUser, expect, test } from "../support/fixtures.ts"`), "the suite's fixtures")
  assert.ok(!/import \{[^}]*\b(?:test|expect)\b[^}]*\} from "@playwright\/test"/.test(spec), "test and expect from the fixtures")
  assert.ok(spec.includes(`asUser("itHead")`))
  // Run-marked: the suppliers' codes, the assets' tags and the documents' numbers carry the run and the project.
  assert.ok(spec.includes("const prefix = `${runId}-${projectCode(projectName)}-SU`"))
  assert.ok(spec.includes("code: `${prefix}P`") && spec.includes("code: `${prefix}N`"))
  assert.ok(spec.includes(`admin.post("/api/suppliers"`))
  for (const key of [`"SPA"`, `"SPB"`, `"SPC"`]) assert.ok(spec.includes(`createSupplierAsset(page, masters, project, ${key}`), key)
  assert.ok(spec.includes("const docNo = (key: string) => `${runId}-${projectCode(project)}-${key}`"))
  assert.ok(spec.includes("vendorId: supplierId"))
  // The list: the segmented counts, the summary line, ค้าง 1, no ⋯ and no เพิ่มข้อมูลติดต่อ without the permissions.
  assert.ok(spec.includes("await expectStatusCounts(page, { active: 1, inactive: 0, all: 1 })"))
  assert.ok(spec.includes("fillTemplate(W.summaryLine, { suppliers: 1, assets: 3, openRepairs: 1, sort: W.nameSort })"))
  assert.ok(spec.includes("fillTemplate(W.openRepairs, { count: 1 })"))
  assert.ok(spec.includes("await expect(moreActions(supplier.code)).toHaveCount(0)"))
  assert.ok(spec.includes(`await expect(bareEntry.getByRole("link", { name: W.addContact, exact: true })).toHaveCount(0)`))
  // The page: the four figures, the total row as the rows' sum, the guard's reason, the register by supplierId, กลับ.
  assert.ok(spec.includes("fillTemplate(W.repairsFoot, { open: 1, closed: 1, cancelled: 0 })"))
  assert.ok(spec.includes("fillTemplate(W.repairCostFoot, { count: 1 })"))
  assert.ok(spec.includes("fillTemplate(W.assetsWithoutDocument, { count: 1 })"))
  assert.ok(spec.includes(`await expect(totalRow.locator("td").last()).toHaveText(money(documentsTotal))`))
  assert.ok(spec.includes("getByText(SUPPLIER_BLOCKED, { exact: true })"))
  assert.ok(spec.includes(`url.pathname === "/th/assets" && url.searchParams.get("supplierId") === supplier.id`))
  assert.ok(spec.includes("`${W.supplierChip}: ${supplier.code} - ${supplier.name}`"))
  assert.ok(spec.includes(`expect(backHref.searchParams.get("search")).toBe(supplier.code)`))
  // Never a DELETE, never isActive false, never the settings.
  assert.doesNotMatch(spec, /method: "DELETE"|\.delete\(|isActive: false/)
  assert.doesNotMatch(spec, /\/api\/admin|signInOnce\(/)
  // The phone's cards, axe through recordSettled.
  assert.ok(spec.includes("[data-supplier-mobile-list] article") && spec.includes("[data-supplier-documents-mobile] article"))
  assert.ok((spec.match(/await recordSettled\(page, measure, /g) ?? []).length >= 5)
})
