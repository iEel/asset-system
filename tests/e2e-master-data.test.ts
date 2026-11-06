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
  assert.equal(ORG_LIST_WORDS.noNameEn, th.company.list.noNameEn)
  assert.equal(ORG_LIST_WORDS.assetTagCodeFallback, th.company.list.assetTagCodeFallback)
  assert.equal(ORG_LIST_WORDS.taxIdMissing, th.company.list.taxIdMissing)
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
  for (const code of ["`${prefix}C`", "`${prefix}B`", "`${prefix}D`", "`${prefix}R`", "`${prefix}E`"]) assert.ok(spec.includes(code), code)
  for (const route of ["/api/companies", "/api/branches", "/api/departments", "/api/locations", "/api/employees"]) assert.ok(spec.includes(`admin.post("${route}"`), route)
  // The company has no asset-tag code, so the run setup (the first company with one) never picks it.
  assert.ok(spec.includes("assetTagCode: null"))
  // The segmented counts, the presets with returnTo and กลับ, the department filter's chip.
  assert.ok(spec.includes(`await expectStatusCounts(page, "active", { active: 1, inactive: 0, all: 1 })`))
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
