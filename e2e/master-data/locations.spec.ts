// Page group 7 plan 3 (spec docs/superpowers/specs/2026-11-05-page-group-7-master-data-design.md §6, §7; plan
// docs/superpowers/plans/2026-11-06-group7-locations.md Task 5): a building's chain of locations, in all four projects,
// as the IT head (the run's role holds location:view, create and edit since this task; no location:delete).
// - The seed admin creates a run-marked building → floor → room under the run's branch (the locations API, as createRoom
//   does), and the IT head one run asset in the room (the asset API).
// - Crafted requests the form never sends are refused with the field's code (409): the building under its own room
//   (LOCATION_PARENT_CYCLE, Review Focus 1) and the floor, or a new location, under another branch's location
//   (LOCATION_PARENT_OTHER_BRANCH, Review Focus 2). Nothing changes, so the tree still shows the chain.
// - The tree (the default view): the room counts 1 and its count opens the register by the room, whose chip names the
//   path; the floor and the building count 0 of their own and read "รวมที่ตั้งย่อย 1" (G7P3-R2, R3; Review Focus 3).
// - A search shows the list with the name path from the branch down (the phone's cards).
// - The tree shows 100 locations of one level at a time (the run's branch holds thousands of roots on dev): the spec
//   presses "แสดงอีก {n} รายการ" until the run's building shows; a closed level is not in the page at all.
// - "เพิ่มที่ตั้งในนี้" on the floor opens the form with the branch and the floor chosen; saving lands the new location
//   under the floor (Review Focus 5).
// - Editing the floor: the parent picker offers the building but neither the floor nor its room (Review Focus 1).
// - ปิดใช้งาน on the floor and the room: the confirm names each blocker with its count and offers only ปิด (Review
//   Focus 4); nothing is deactivated through it (the suite sends no DELETE).
// - เปิดใช้งาน: the new location is set inactive by a PUT on run-marked data (isActive false; it has no blockers), then
//   the inactive filter shows it with ไม่ใช้งาน and the IT head brings it back through the page's own button.
// - The parent picker's rows (group 7 follow-ups Task 4, MD-Location-New; plan
//   docs/superpowers/plans/2026-11-07-group7-followups.md Task 5), on the เพิ่มที่ตั้งในนี้ form: each row is named by
//   "name · code", reads the path from the branch on its second line, the type as a chip and "ย่อย {n}" (active children);
//   typing the building's name finds the floor and the room, whose labels do not hold it, through the path (keywords).
// Every location and asset made here carries the run id and the project's code; no shared master data is changed.
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { asUser, expect, test } from "../support/fixtures.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { recordSettled } from "../audit/settle.ts"
import { escapeRegExp, expectToast, readRunBranch, seedAdminApi } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { projectCode, txAssetName, txAssetTag } from "../transactions/tx-plan.ts"
import { readAssetMasters, type AssetMasters } from "../transactions/tx-support.ts"
import { LOCATION_WORDS as W } from "./locations-words.ts"

// The seed admin's request context (seedAdminApi): the type comes from the helper, as specs import nothing from
// @playwright/test but the suite's fixtures.
type APIRequestContext = Awaited<ReturnType<typeof seedAdminApi>>

type RunLocation = { id: string; code: string; name: string; locationType: string; branchId: string; parentId: string | null }

const PATH = " › "

// The locations API's whole body (locationSchema): the record's own fields, the parent and the status given.
function locationBody(location: RunLocation, change: { parentId?: string | null; isActive?: boolean } = {}) {
  return {
    code: location.code,
    name: location.name,
    branchId: location.branchId,
    parentId: change.parentId === undefined ? location.parentId : change.parentId,
    locationType: location.locationType,
    description: null,
    isActive: change.isActive ?? true,
  }
}

// One run-marked location under the run's branch, created by the seed admin (as createRoom creates the run's rooms).
async function createRunLocation(admin: APIRequestContext, code: string, name: string, locationType: string, parentId: string | null): Promise<RunLocation> {
  const location: RunLocation = { id: "", code, name, locationType, branchId: readRunData().branchId, parentId }
  const response = await admin.post("/api/locations", { data: locationBody(location) })
  expect(response.status(), `POST /api/locations ${code}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return { ...location, id: ((await response.json()) as { id: string }).id }
}

// A refused request answers 409 with the rule's code and the field it names (locationParentRefusalBody).
async function expectRefused(response: Awaited<ReturnType<APIRequestContext["put"]>>, code: string, fieldKey: string) {
  expect(response.status(), `${code}: ${(await response.text()).slice(0, 300)}`).toBe(409)
  const body = (await response.json()) as { code?: string; fieldErrors?: Record<string, string> }
  expect(body.code).toBe(code)
  expect(body.fieldErrors).toEqual({ parentId: fieldKey })
}

// The run asset in the room (the asset API as the IT head): every key of the form's body, Ready, Good, the room as
// both its current and its home location.
async function createRoomAsset(page: Page, masters: AssetMasters, projectName: string, roomId: string) {
  const { runId } = readRunState()
  const data = readRunData()
  const assetTag = txAssetTag(runId, projectName, "LT1")
  const response = await page.request.post("/api/assets", {
    data: {
      assetTag, name: txAssetName(runId, projectName, "เครื่องทดสอบที่ตั้ง"), categoryId: masters.categoryId, brandId: "", modelId: "", serialNumber: "",
      licenseTotalSeats: "", licenseUsedSeats: "", licenseAssignedAssetId: "", companyId: data.companyId, branchId: data.branchId,
      ownershipType: "personal", departmentId: data.departmentId, custodianId: "", homeLocationId: roomId, currentLocationId: roomId,
      statusId: masters.readyStatusId, conditionId: masters.goodConditionId, purchaseDate: "", purchasePrice: "", supplierId: "",
      warrantyStartDate: "", warrantyEndDate: "", fixedAssetCode: "", poNumber: "", invoiceNumber: "", remark: "", customFieldsJson: "",
      isActive: true,
    },
  })
  expect(response.status(), `POST /api/assets ${assetTag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return { id: ((await response.json()) as { id: string }).id, assetTag }
}

// One location's own row of the tree (its <li>'s first <div>): the row of a parent does not hold its children's links.
const treeRow = (page: Page, location: RunLocation): Locator =>
  page.locator("li > div").filter({ has: page.getByRole("link", { name: location.name, exact: true }) })

// Open one level of the tree: the disclosure named "ขยาย <name>" turns into "ยุบ <name>", expanded.
async function expand(page: Page, location: RunLocation) {
  const button = page.getByRole("button", { name: fillTemplate(W.expand, { name: location.name }), exact: true })
  await expect(button).toHaveAttribute("aria-expanded", "false")
  await button.click()
  await expect(page.getByRole("button", { name: fillTemplate(W.collapse, { name: location.name }), exact: true })).toHaveAttribute("aria-expanded", "true")
}

// The run's building among the branch's roots: one level shows 100 at a time, so press the root level's "แสดงอีก {n}
// รายการ" (the only one while nothing is expanded) until the building's row is there.
async function revealRoot(page: Page, location: RunLocation) {
  const showMore = page.locator("[data-location-tree-more]").last().getByRole("button")
  for (let round = 0; round < 100 && (await treeRow(page, location).count()) === 0; round += 1) {
    await expect(showMore).toHaveText(new RegExp(`^${escapeRegExp(W.showMore).replace(escapeRegExp("{n}"), "[\\d,]+")}$`))
    await showMore.click()
  }
  await expect(treeRow(page, location)).toBeVisible()
}

// ⋯ of a location: the menu on the computer, the sheet on the phone; then one of its items.
async function rowAction(page: Page, entry: Locator, location: RunLocation, item: string) {
  await entry.getByRole("button", { name: fillTemplate(W.moreActionsFor, { code: location.code }), exact: true }).click()
  const menu = page.getByRole("menu").or(page.getByRole("dialog")).filter({ visible: true }).last()
  await expect(menu).toBeVisible()
  await menu.getByRole("menuitem", { name: item, exact: true }).or(menu.getByRole("link", { name: item, exact: true })).or(menu.getByRole("button", { name: item, exact: true })).first().click()
}

test.describe("the IT head reads and arranges a building's locations", () => {
  asUser("itHead")

  test("the tree shows the chain with own and subtree counts, the room's count opens the register by its path, เพิ่มที่ตั้งในนี้ presets the form, the floor's picker leaves out itself and its room, crafted parents are refused, ปิดใช้งาน names its blockers, เปิดใช้งาน brings one back (group 7 spec §6, §7; Review Focus 1–5)", async ({ page, measure, e2eDevice }, testInfo) => {
    test.setTimeout(420_000)
    const project = testInfo.project.name
    const { runId } = readRunState()
    const prefix = `${runId}-${projectCode(project)}-LT`
    const runBranch = await readRunBranch()

    // The chain (the seed admin) and the room's asset (the IT head).
    const admin = await seedAdminApi()
    let building: RunLocation, floor: RunLocation, room: RunLocation
    try {
      building = await createRunLocation(admin, `${prefix}B`, txAssetName(runId, project, "อาคารทดสอบที่ตั้ง"), "Building", null)
      floor = await createRunLocation(admin, `${prefix}F`, txAssetName(runId, project, "ชั้นทดสอบที่ตั้ง"), "Floor", building.id)
      room = await createRunLocation(admin, `${prefix}R`, txAssetName(runId, project, "ห้องทดสอบที่ตั้ง"), "Room", floor.id)

      // Crafted parents the form never offers (Review Focus 1, 2): refused, nothing saved.
      await expectRefused(await admin.put(`/api/locations/${building.id}`, { data: locationBody(building, { parentId: room.id }) }), "LOCATION_PARENT_CYCLE", "locationParentCycle")
      const others = (await (await admin.get("/api/locations")).json()) as { id: string; branchId: string }[]
      const otherBranchLocation = others.find((location) => location.branchId !== runBranch.id)
      expect(otherBranchLocation, "the dev data has an active location in a branch other than the run's").toBeTruthy()
      await expectRefused(await admin.put(`/api/locations/${floor.id}`, { data: locationBody(floor, { parentId: otherBranchLocation!.id }) }), "LOCATION_PARENT_OTHER_BRANCH", "locationParentOtherBranch")
      const crafted = { id: "", code: `${prefix}X`, name: txAssetName(runId, project, "ที่ตั้งข้ามสาขา"), locationType: "Room", branchId: runBranch.id, parentId: otherBranchLocation!.id }
      await expectRefused(await admin.post("/api/locations", { data: locationBody(crafted) }), "LOCATION_PARENT_OTHER_BRANCH", "locationParentOtherBranch")
    } finally {
      await admin.dispose()
    }
    const masters = await readAssetMasters(page)
    const asset = await createRoomAsset(page, masters, project, room.id)
    const chainPath = [building.name, floor.name, room.name].join(PATH)

    // The tree, the default view: the run's branch shows its roots; the building and the floor open one level each.
    await page.goto(`/th/master-data/locations?branchId=${runBranch.id}`, { waitUntil: "load" })
    await expect(page.getByRole("heading", { level: 1, name: W.title, exact: true })).toBeVisible()
    await expect(page.getByRole("navigation", { name: W.viewLabel }).getByRole("link", { name: W.viewTree, exact: true })).toHaveAttribute("aria-current", "page")
    await revealRoot(page, building)
    // A closed level is not rendered: the floor is not in the page until the building opens.
    await expect(treeRow(page, floor)).toHaveCount(0)
    await expand(page, building)
    await expand(page, floor)
    await expect(treeRow(page, room)).toBeVisible()
    // Own counts: the room 1 (a link), the floor and the building 0; each parent reads "รวมที่ตั้งย่อย 1" (G7P3-R2).
    for (const parent of [building, floor]) {
      await expect(treeRow(page, parent).getByText(fillTemplate(W.subtree, { n: 1 }), { exact: true }).filter({ visible: true })).toHaveCount(1)
      await expect(treeRow(page, parent).getByRole("link", { name: fillTemplate(W.assetsAt, { name: parent.name, n: 0 }) })).toHaveCount(0)
    }
    const roomCount = treeRow(page, room).getByRole("link", { name: fillTemplate(W.assetsAt, { name: room.name, n: 1 }), exact: true }).filter({ visible: true })
    await expect(roomCount).toHaveText("1")
    await expect(treeRow(page, room).getByText(fillTemplate(W.subtree, { n: 1 }), { exact: true })).toHaveCount(0)
    // No axe on this page: the dev data's run branch holds every run's rooms at its top (2,311 rows in E2E-1106K), and
    // axe over the whole tree took 189 s. axe reads the tree's markup on the inactive filter below (a few rows).

    // The room's count opens the register by the room alone (G7P3-R3); the chip names the path from the branch down.
    await roomCount.click()
    await page.waitForURL((url) => url.pathname === "/th/assets" && url.searchParams.get("locationId") === room.id)
    await expect(page.getByRole("group", { name: W.activeFilters }).filter({ visible: true })).toContainText(`${W.locationChip}: ${runBranch.name}${PATH}${chainPath}`)
    await expect(page.getByRole("main").getByText(asset.assetTag, { exact: true }).filter({ visible: true }).first()).toBeVisible()
    await recordSettled(page, measure, "register by the room, from the tree")

    // A search shows the list with the name path: the table on the computer, the cards on the phone.
    await page.goto(`/th/master-data/locations?search=${encodeURIComponent(prefix)}`, { waitUntil: "load" })
    await expect(page.getByRole("navigation", { name: W.viewLabel }).getByRole("link", { name: W.viewList, exact: true })).toHaveAttribute("aria-current", "page")
    const listEntry = (location: RunLocation) => e2eDevice === "desktop"
      ? page.locator("table tbody tr").filter({ hasText: location.code })
      : page.locator("[data-location-mobile-list] article").filter({ hasText: location.code })
    await expect(listEntry(room)).toHaveCount(1)
    // The list's path starts with the branch name, like the form and the register chip.
    await expect(listEntry(room)).toContainText(`${runBranch.name}${PATH}${chainPath}`)
    await recordSettled(page, measure, "locations list, a search with paths")

    // ปิดใช้งาน on the floor and on the room, from the list's ⋯ (the tree's ⋯ is the same LocationDeactivateButton): the
    // confirm names the blockers with their counts and offers only ปิด (Review Focus 4).
    const blockers = [
      { location: floor, lines: [fillTemplate(W.blockedActiveChildren, { n: 1 })] },
      { location: room, lines: [fillTemplate(W.blockedCurrentAssets, { n: 1 }), fillTemplate(W.blockedHomeAssets, { n: 1 })] },
    ]
    for (const { location, lines } of blockers) {
      await rowAction(page, listEntry(location), location, W.deactivate)
      const confirm = page.getByRole("alertdialog", { name: fillTemplate(W.deactivateTitle, { name: location.name }), exact: true })
      await expect(confirm).toBeVisible()
      for (const line of lines) await expect(confirm).toContainText(line)
      await expect(confirm).toContainText(W.blockedFooter)
      await expect(confirm.getByRole("button", { name: W.deactivate, exact: true })).toHaveCount(0)
      if (location === floor) await recordSettled(page, measure, "locations list, ปิดใช้งาน's blockers")
      await confirm.getByRole("button", { name: W.close, exact: true }).click()
      await expect(confirm).toHaveCount(0)
    }


    // เพิ่มที่ตั้งในนี้ on the floor: the form with the run's branch and the floor chosen (Review Focus 5).
    await page.goto(`/th/master-data/locations?branchId=${runBranch.id}`, { waitUntil: "load" })
    await revealRoot(page, building)
    await expand(page, building)
    await rowAction(page, treeRow(page, floor), floor, W.addChild)
    await page.waitForURL((url) => url.pathname === "/th/master-data/locations/new" && url.searchParams.get("parentId") === floor.id && url.searchParams.get("branchId") === runBranch.id)
    await expect(page.getByRole("heading", { level: 1, name: W.createTitle, exact: true })).toBeVisible()
    await expect(page.locator("#location-branch")).toHaveValue(runBranch.id)
    // Group 7 follow-ups Task 4: the picker's label is the name · code; the path from the branch is in the preview.
    await expect(page.locator("#location-parent")).toContainText(`${floor.name} · ${floor.code}`)
    await expect(page.locator("[data-location-preview-path]")).toContainText(`${runBranch.name}${PATH}${building.name}${PATH}${floor.name}`)
    await recordSettled(page, measure, "location form, เพิ่มที่ตั้งในนี้ on the floor")

    // The picker's rows (group 7 follow-ups Task 4): the building's name typed finds the building by its label and the
    // floor and the room by their paths (keywords: neither label holds the building's name). Each row is named by
    // "name · code" (aria-labelledby) and shows the path, the type chip and "ย่อย {n}" (the new location is not saved yet).
    await page.locator("#location-parent").click()
    const parentSearch = page.getByRole("dialog").last().getByRole("combobox")
    await parentSearch.fill(building.name)
    const parentRows = [
      { location: building, path: [building], type: W.typeBuilding, children: 1 },
      { location: floor, path: [building, floor], type: W.typeFloor, children: 1 },
      { location: room, path: [building, floor, room], type: W.typeRoom, children: 0 },
    ]
    for (const { location, path, type, children } of parentRows) {
      const row = page.getByRole("option", { name: `${location.name} · ${location.code}`, exact: true })
      await expect(row).toHaveCount(1)
      await expect(row).toContainText([runBranch.name, ...path.map((step) => step.name)].join(PATH))
      await expect(row.locator('[data-slot="chip"]')).toHaveText(type)
      await expect(row).toContainText(fillTemplate(W.parentChildCount, { count: children }))
      await expect(row).toHaveAccessibleDescription(new RegExp(`${escapeRegExp(type)}.*${escapeRegExp(fillTemplate(W.parentChildCount, { count: children }))}`))
    }
    expect(`${floor.name} · ${floor.code}`).not.toContain(building.name)
    await recordSettled(page, measure, "location form, the parent picker's rows")
    await page.keyboard.press("Escape")
    await expect(page.locator("#location-parent")).toContainText(`${floor.name} · ${floor.code}`)
    const added: RunLocation = { id: "", code: `${prefix}N`, name: txAssetName(runId, project, "ห้องใหม่ทดสอบที่ตั้ง"), locationType: "Room", branchId: runBranch.id, parentId: floor.id }
    await page.locator("#location-name").fill(added.name)
    await page.locator("#location-code").fill(added.code)
    const createdResponse = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/locations" && response.request().method() === "POST")
    await page.getByRole("button", { name: W.save, exact: true }).click()
    const createdAnswer = await createdResponse
    expect(createdAnswer.status()).toBe(201)
    added.id = ((await createdAnswer.json()) as { id: string }).id
    await page.waitForURL((url) => url.pathname === "/th/master-data/locations")
    await expectToast(page, W.saved)
    await revealRoot(page, building)
    await expand(page, building)
    await expand(page, floor)
    await expect(treeRow(page, added)).toBeVisible()
    await expect(treeRow(page, floor).getByText(fillTemplate(W.subtree, { n: 1 }), { exact: true }).filter({ visible: true })).toHaveCount(1)
    // The whole branch's tree again: no axe here (see above).

    // Editing the floor (its name opens the form): the picker offers the building, not the floor itself nor its room.
    await treeRow(page, floor).getByRole("link", { name: floor.name, exact: true }).click()
    await page.waitForURL((url) => url.pathname === `/th/master-data/locations/${floor.id}/edit`)
    await expect(page.getByRole("heading", { level: 1, name: W.editTitle, exact: true })).toBeVisible()
    await expect(page.locator("#location-parent")).toContainText(building.name)
    await recordSettled(page, measure, "location form, editing the floor")
    await page.locator("#location-parent").click()
    const search = page.getByRole("dialog").last().getByRole("combobox")
    for (const left of [room, added, floor]) {
      await search.fill(left.code)
      await expect(page.getByRole("option", { name: new RegExp(escapeRegExp(left.code)) })).toHaveCount(0)
      await expect(page.getByText(W.parentEmpty, { exact: true }).filter({ visible: true })).toBeVisible()
    }
    await search.fill(building.code)
    await expect(page.getByRole("option", { name: new RegExp(escapeRegExp(building.code)) })).toHaveCount(1)
    await recordSettled(page, measure, "location form, the floor's parent picker")
    await page.keyboard.press("Escape")

    // เปิดใช้งาน: the new location (no blockers) set inactive by a PUT on run-marked data, then brought back on the page.
    const adminAgain = await seedAdminApi()
    try {
      const response = await adminAgain.put(`/api/locations/${added.id}`, { data: locationBody(added, { isActive: false }) })
      expect(response.status(), `PUT /api/locations/${added.id}: ${(await response.text()).slice(0, 300)}`).toBe(200)
    } finally {
      await adminAgain.dispose()
    }
    await page.goto(`/th/master-data/locations?branchId=${runBranch.id}&status=inactive`, { waitUntil: "load" })
    // The inactive filter's tree: its parent is active, so the location shows as a root of the branch.
    const inactiveRow = treeRow(page, added)
    await expect(inactiveRow.getByText(W.inactive, { exact: true }).filter({ visible: true })).toBeVisible()
    await recordSettled(page, measure, "locations tree, an inactive location")
    await inactiveRow.getByRole("button", { name: W.reactivate, exact: true }).filter({ visible: true }).click()
    const reactivate = page.getByRole("alertdialog", { name: fillTemplate(W.reactivateTitle, { name: added.name }), exact: true })
    await expect(reactivate).toBeVisible()
    await reactivate.getByRole("button", { name: W.reactivate, exact: true }).click()
    await expectToast(page, W.reactivated)
    await expect(treeRow(page, added)).toHaveCount(0)
    await recordSettled(page, measure, "locations tree, after เปิดใช้งาน")
  })
})
