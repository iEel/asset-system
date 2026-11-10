// The scan page's photos (audit photos spec §3, plan 1 task 5), in all four projects as IT staff, the phone on WebKit as
// the field audit's walk. The test opens its own round on its own room of five run assets:
// - A has a photo of its own (uploaded through the files tab's route);
// - B has none, but its run model has one (uploaded as the IT head, who holds brand:edit; the model is the run's own);
// - C has neither;
// - D is a parent with E installed in it, and E has a photo of its own.
// The room list shows A's thumb, B's model thumb with รูปประจำรุ่น in its meta line and C's neutral square; the check form
// shows A's card, B's card with the รูปประจำรุ่น chip and C's card empty (ยังไม่มีรูป); D's check lists E with E's thumb; and a photo
// taken in A's check form uploads with the audit item's id, so the upload answers auditLinked: true (the only check of
// the link in plan 1). The IT head cancels the round whatever happens (never a DELETE); no shared master data is changed.
// Plan 2 task 5 (spec §4-§6), in the same round before it is cancelled: C is checked too, with no photo; A's files tab
// chips the round (its line names the round, the scan time, พบตรง and IT staff); the round page's A thumbnail opens the
// round's dialog, whose ดูในแท็บไฟล์ lands on the chip, C reads ไม่มีรูป, and under รอตรวจ B shows the model photo plainly
// with รูปประจำรุ่น, E its own with รูปทะเบียน and D —; A's history audit row has ดูรูป to the chip and C's none; and the
// viewer keeps ดูรูป without the round's link (skipped, saying so, while the run's viewer holds audit:view).
import { readFileSync } from "node:fs"
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import type { E2eDevice } from "../support/matrix.ts"
import { authStateFile, fromRoot } from "../support/paths.ts"
import { E2E_ROLE_PERMISSIONS } from "../support/run-plan.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createRoom, readAssetChoices, recordPrefix, type AssetChoices } from "../disposal/disposal-support.ts"
import { fillTemplate, templatePattern } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { installComponentByApi } from "../transactions/tx-support.ts"
import * as roundPage from "./round-page-steps.ts"
import { ROUND_PAGE_WORDS } from "./round-page-words.ts"
import * as rounds from "./round-steps.ts"
import * as scan from "./scan-steps.ts"
import { recordSettled } from "./settle.ts"
import { SCAN_PHOTO_WORDS as W } from "./scan-photos-words.ts"

runPhoneOnWebKit()
asUser("itStaff")

const PHOTO = fromRoot("e2e/fixtures/photo.png")
const png = (name: string) => ({ file: { name, mimeType: "image/png", buffer: readFileSync(PHOTO) } })
const thumbSrc = (attachmentId: string) => `/api/attachments/${attachmentId}/thumbnail`
const cardSrc = (attachmentId: string) => `${thumbSrc(attachmentId)}?size=card`

type RunAsset = { id: string; assetTag: string; name: string }

// A Ready asset in the test's room through the asset API the form posts to (the body of disposal-support's
// createAssets), with a model when given.
async function createRunAsset(page: Page, choices: AssetChoices, roomId: string, assetTag: string, model?: { brandId: string; modelId: string }): Promise<RunAsset> {
  const data = readRunData()
  const name = `${assetTag} เครื่องทดสอบรูปตรวจนับ`
  const response = await page.request.post("/api/assets", {
    data: {
      assetTag,
      name,
      categoryId: choices.categoryId,
      ...(model ? { brandId: model.brandId, modelId: model.modelId } : {}),
      companyId: data.companyId,
      branchId: data.branchId,
      currentLocationId: roomId,
      homeLocationId: roomId,
      statusId: choices.statusId,
      conditionId: choices.conditionId,
      remark: `${assetTag} สร้างโดยชุดทดสอบ E2E`,
      licenseTotalSeats: null,
      licenseUsedSeats: null,
      purchaseDate: null,
      purchasePrice: null,
      warrantyStartDate: null,
      warrantyEndDate: null,
    },
  })
  expect(response.status(), `POST /api/assets ${assetTag}: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return { id: ((await response.json()) as { id: string }).id, assetTag, name }
}

// The asset's own photo, through the upload route the files tab posts to (no audit item: not linked to a round).
async function uploadAssetPhoto(page: Page, asset: RunAsset): Promise<string> {
  const response = await page.request.post(`/api/assets/${asset.id}/attachments`, { multipart: png(`${asset.assetTag}.png`) })
  expect(response.status(), `POST /api/assets/${asset.id}/attachments: ${(await response.text()).slice(0, 300)}`).toBe(201)
  return ((await response.json()) as { id: string }).id
}

// A room row of the asset (its tag is the run's own, so it is in one row only).
const row = (page: Page, asset: RunAsset): Locator => scan.roomRows(page).filter({ hasText: asset.assetTag })
const thumb = (scope: Locator): Locator => scope.locator("[data-audit-scan-photo-thumb]")
const photoCard = (page: Page): Locator => scan.checkForm(page).locator("[data-audit-scan-photo-card]")

// Open the asset's check from its room row. On the phone the check is a modal sheet: the last one closes first.
async function openRow(page: Page, asset: RunAsset) {
  if ((await page.getByRole("dialog").count()) > 0) await page.keyboard.press("Escape")
  await expect(page.getByRole("dialog")).toHaveCount(0)
  await row(page, asset).click()
  await expect(scan.checkForm(page)).toBeVisible()
  await expect(scan.checkHeading(page, asset)).toBeVisible()
}

// The files tab's filter chips by round (spec §4), its photo tiles' buttons and the round chips on the tiles.
const roundFilter = (page: Page): Locator => page.getByRole("main").getByRole("navigation", { name: W.roundFilterLabel, exact: true })
const photoTiles = (scope: Locator): Locator => scope.getByRole("button", { name: templatePattern(W.openPhoto, { name: ".+" }) })
const tileRoundChips = (page: Page, auditNo: string): Locator =>
  page.getByRole("main").locator('li [data-slot="chip"]').filter({ hasText: new RegExp(`^${scan.escapeRegExp(auditNo)}$`) })
// The selected round's line, right after the chips (asset-attachments.tsx RoundLine).
const roundLine = (page: Page): Locator => roundFilter(page).locator("xpath=following-sibling::p[1]")

// One asset's result row on the round page, by its own tag only: the phone card's tag link, or the table's tag line
// (exact). A hasText filter on the tag also matches a component's card, whose "ติดตั้งอยู่ใน <parent tag>" line names
// the parent (E2E-1111C), so the shared resultRows serves the counts by the run prefix only.
function resultRow(page: Page, device: E2eDevice, asset: RunAsset): Locator {
  const exactTag = new RegExp(`^${scan.escapeRegExp(asset.assetTag)}$`)
  return device === "phone"
    ? page.locator("#audit-result-list article").filter({ has: page.getByRole("link", { name: asset.assetTag, exact: true }) })
    : page.locator("#audit-result-list tbody tr").filter({ has: page.locator("td:nth-child(2) span.tag").filter({ hasText: exactTag }) })
}

// The round page's photo cell of a result row: the phone card's รูป value, or the table's fifth cell.
function photoCell(row: Locator, device: E2eDevice): Locator {
  return device === "phone"
    ? row.locator("dt").filter({ hasText: new RegExp(`^${scan.escapeRegExp(W.photoColumn)}$`) }).locator("xpath=following-sibling::dd[1]")
    : row.locator("td").nth(4)
}

// The asset's files tab with a round's chip (the links' target, spec "Links to the files tab").
const onFilesChip = (assetId: string, auditNo: string) => (url: URL) =>
  url.pathname === `/th/assets/${assetId}` && url.searchParams.get("view") === "files" && url.searchParams.get("photoRound") === auditNo

// The image was drawn by the thumbnail route (in view, so the lazy image loads).
async function expectDrawn(image: Locator) {
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true)
}

test("the scan page shows the asset's photo, the model's as the fallback, the components' thumbs, and a photo taken in the check links to its round (audit photos spec §3)", async ({ page, measure, playwright, browser, baseURL, e2eDevice }, testInfo) => {
  test.setTimeout(300_000)
  const { runId } = readRunState()
  const prefix = recordPrefix(testInfo, "AUP")
  const roomCode = `${prefix}-R`
  const roomName = `${prefix} ห้องทดสอบรูปตรวจนับ`
  const roomId = await createRoom(roomCode, roomName)
  const choices = await readAssetChoices(page, measure)

  // The run's brand and model with the model's photo, as the IT head (brand:create, brand:edit): IT staff may not.
  const itHead = await playwright.request.newContext({ baseURL, storageState: fromRoot(authStateFile(runId, "itHead")) })
  const model = await (async () => {
    try {
      const brand = await itHead.post("/api/brands", { data: { name: `${prefix} Brandphoto` } })
      expect(brand.status(), `POST /api/brands: ${(await brand.text()).slice(0, 300)}`).toBe(201)
      const brandId = ((await brand.json()) as { id: string }).id
      const created = await itHead.post("/api/models", { data: { name: `${prefix} รุ่นทดสอบรูป`, brandId, categoryId: choices.categoryId } })
      expect(created.status(), `POST /api/models: ${(await created.text()).slice(0, 300)}`).toBe(201)
      const modelId = ((await created.json()) as { id: string }).id
      const photo = await itHead.post(`/api/models/${modelId}/attachments`, { multipart: png(`${prefix}-model.png`) })
      expect(photo.status(), `POST /api/models/${modelId}/attachments: ${(await photo.text()).slice(0, 300)}`).toBe(201)
      return { brandId, modelId, photoId: ((await photo.json()) as { id: string }).id }
    } finally {
      await itHead.dispose()
    }
  })()

  const a = await createRunAsset(page, choices, roomId, `${prefix}-A`)
  const b = await createRunAsset(page, choices, roomId, `${prefix}-B`, model)
  const c = await createRunAsset(page, choices, roomId, `${prefix}-C`)
  const d = await createRunAsset(page, choices, roomId, `${prefix}-D`)
  const e = await createRunAsset(page, choices, roomId, `${prefix}-E`)
  const aPhotoId = await uploadAssetPhoto(page, a)
  const ePhotoId = await uploadAssetPhoto(page, e)
  await installComponentByApi(page, d.id, e.id, `${prefix} ส่วนควบทดสอบรูป`, "1")

  // The body the form sends (spec §7: no status).
  const opened = await page.request.post("/api/audit-rounds", {
    data: {
      name: `${prefix} รอบทดสอบรูปตรวจนับ`,
      auditYear: Number(bangkokDate().slice(0, 4)),
      scopeLocationId: roomId,
      includeClosedAssets: false,
      riskPreset: "all",
      sampleRate: 100,
      startDate: bangkokDate(),
      endDate: bangkokDate(10),
    },
  })
  expect(opened.status(), await opened.text()).toBe(201)
  const round = (await opened.json()) as { id: string; auditNo: string; generatedItems: number }
  // The photo taken in A's check (test 4), the round's only photo.
  let checkPhotoId = ""
  try {
    // Inside the try, so a round that generates the wrong items is still cancelled (final review F2).
    expect(round.generatedItems, "the room's five assets").toBe(5)
    await measure.visit(`/th/audit/rounds/${round.id}/scan`, "scan page, a round with photos")
    await scan.pickRoom(page, { code: roomCode, name: roomName })
    await expect(scan.roomRows(page)).toHaveCount(5)

    await test.step("the room list shows A's thumb, B's thumb with รูปประจำรุ่น in its meta line, and C's neutral square", async () => {
      const aThumb = thumb(row(page, a)).locator("img")
      await expect(aThumb).toHaveAttribute("src", thumbSrc(aPhotoId))
      await expect(aThumb, "decorative: the row names the asset").toHaveAttribute("alt", "")
      await expect(aThumb).toHaveAttribute("loading", "lazy")
      await expectDrawn(aThumb)
      await expect(row(page, a).locator("[data-audit-scan-model-photo]")).toHaveCount(0)

      await expect(thumb(row(page, b)).locator("img")).toHaveAttribute("src", thumbSrc(model.photoId))
      await expect(thumb(row(page, b))).toHaveAttribute("data-from-model", "true")
      await expect(row(page, b).locator("[data-audit-scan-model-photo]")).toHaveText(W.modelPhoto)

      await expect(thumb(row(page, c))).toHaveAttribute("data-empty", "true")
      await expect(thumb(row(page, c)).locator("img")).toHaveCount(0)
      await recordSettled(page, measure, "room list with the photos")
    })

    await test.step("the check form shows A's card without the chip, B's card with the chip, and C's card empty with ยังไม่มีรูป", async () => {
      await openRow(page, a)
      await expect(photoCard(page).locator("img")).toHaveAttribute("src", cardSrc(aPhotoId))
      await expectDrawn(photoCard(page).locator("img"))
      await expect(photoCard(page).getByText(W.modelPhoto, { exact: true })).toHaveCount(0)
      await recordSettled(page, measure, "check of A, its own photo")

      await openRow(page, b)
      await expect(photoCard(page).locator("img")).toHaveAttribute("src", cardSrc(model.photoId))
      await expect(photoCard(page).getByText(W.modelPhoto, { exact: true })).toBeVisible()
      await recordSettled(page, measure, "check of B, the model's photo")

      await openRow(page, c)
      await expect(photoCard(page)).toHaveAttribute("data-empty", "true")
      await expect(photoCard(page).getByText(W.emptyTitle, { exact: true })).toBeVisible()
      await expect(photoCard(page).locator("img")).toHaveCount(0)
      await expect(photoCard(page).getByRole("link")).toHaveCount(0)
      await recordSettled(page, measure, "check of C, the empty frame")
    })

    await test.step("D's check form lists E with E's thumb", async () => {
      await openRow(page, d)
      const component = scan.checkForm(page).locator("[data-audit-component-row]").filter({ hasText: e.assetTag })
      await expect(component).toHaveCount(1)
      await expect(thumb(component).locator("img")).toHaveAttribute("src", thumbSrc(ePhotoId))
      await expect(thumb(component).locator("img"), "decorative: the row names the component").toHaveAttribute("alt", "")
      await recordSettled(page, measure, "check of D, its component's thumb")
    })

    await test.step("a photo taken in A's check form uploads with the item id", async () => {
      await openRow(page, a)
      await expect(scan.saveButton(page)).toHaveText(W.saveAllMatch)
      await scan.checkForm(page).getByRole("button", { name: W.addNotePhoto, exact: true }).click()
      await scan.addPhoto(page, PHOTO)
      await expect(scan.checkForm(page).getByRole("list", { name: fillTemplate(W.queuedPhotos, { count: 1 }), exact: true })).toBeVisible()
      const uploaded = page.waitForResponse((response) => response.request().method() === "POST" && new URL(response.url()).pathname === `/api/assets/${a.id}/attachments`)
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(fillTemplate(W.savedAllMatch, { assetTag: a.assetTag }))
      const response = await uploaded
      expect(response.status(), "the check's photo is uploaded after the save").toBe(201)
      expect(response.request().postDataBuffer()?.toString("latin1") ?? "", "the upload names the audit item").toContain('name="auditItemId"')
      const linked = (await response.json()) as { id: string; auditLinked?: boolean }
      expect(linked, "the photo is linked to the round").toMatchObject({ auditLinked: true })
      checkPhotoId = linked.id
      await recordSettled(page, measure, "A saved with a photo from the check")
    })

    await test.step("C is checked with no photo", async () => {
      await openRow(page, c)
      await expect(scan.saveButton(page)).toHaveText(W.saveAllMatch)
      await scan.saveButton(page).click()
      await expect(scan.savedBanner(page)).toContainText(fillTemplate(W.savedAllMatch, { assetTag: c.assetTag }))
      await recordSettled(page, measure, "C saved without a photo")
    })

    // Who scanned, as the history and the round's line name a linked user (assetHistoryActorLabel).
    const data = readRunData()
    const staff = data.users.itStaff
    const staffEmployee = Object.values(data.employees).find((employee) => employee.id === staff?.employeeId)
    const scannedBy = staffEmployee ? `${staffEmployee.code} - ${staffEmployee.fullNameTh}` : `${staff?.displayName} (${staff?.username})`

    await test.step("A's files tab chips the round, marks its tile and shows the round's line; an unknown photoRound shows ทั้งหมด", async () => {
      await roundPage.settlePageRequests(page)
      await measure.visit(`/th/assets/${a.id}?view=files`, "A's files tab with a round photo")
      // A's own photo (before the round) and the check's: two photos, one of the round, one from no round.
      await roundPage.expectChips(roundFilter(page), [[W.all, 2], [round.auditNo, 1], [W.notFromAudit, 1]])
      await expect(roundPage.chipByLabel(roundFilter(page), W.all)).toHaveAttribute("aria-current", "page")
      await expect(photoTiles(page.getByRole("main"))).toHaveCount(2)
      await expect(tileRoundChips(page, round.auditNo), "the round chip on the check photo's tile only").toHaveCount(1)
      await expect(roundLine(page), "no round chosen, no round line").toHaveCount(0)

      await roundPage.chipByLabel(roundFilter(page), round.auditNo).click()
      await page.waitForURL(onFilesChip(a.id, round.auditNo))
      await expect(roundPage.chipByLabel(roundFilter(page), round.auditNo)).toHaveAttribute("aria-current", "page")
      await expect(photoTiles(page.getByRole("main"))).toHaveCount(1)
      await expect(tileRoundChips(page, round.auditNo)).toHaveCount(1)
      // The round (linked: IT staff hold audit:view), the scan time, the result in words and who scanned; not cancelled.
      const line = roundLine(page)
      await expect(line.getByRole("link", { name: round.auditNo, exact: true })).toHaveAttribute("href", `/th/audit/rounds/${round.id}`)
      await expect(line).toContainText(/\d{2}:\d{2}/)
      await expect(line).toContainText(W.found)
      await expect(line).toContainText(fillTemplate(W.roundScannedBy, { name: scannedBy }))
      await expect(line).not.toContainText(W.roundCancelled)
      await recordSettled(page, measure, "A's files tab, the round's chip")

      await roundPage.chipByLabel(roundFilter(page), W.notFromAudit).click()
      await page.waitForURL((url) => url.searchParams.get("photoRound") === "none")
      await expect(roundPage.chipByLabel(roundFilter(page), W.notFromAudit)).toHaveAttribute("aria-current", "page")
      await expect(photoTiles(page.getByRole("main"))).toHaveCount(1)
      await expect(tileRoundChips(page, round.auditNo)).toHaveCount(0)
      await expect(roundLine(page)).toHaveCount(0)

      await roundPage.settlePageRequests(page)
      await measure.visit(`/th/assets/${a.id}?view=files&photoRound=JUNK`, "A's files tab, an unknown round")
      await expect(roundPage.chipByLabel(roundFilter(page), W.all)).toHaveAttribute("aria-current", "page")
      await expect(photoTiles(page.getByRole("main"))).toHaveCount(2)
      await expect(roundLine(page)).toHaveCount(0)
    })

    await test.step("the round page: A's thumbnail opens its round photos, C reads ไม่มีรูป, the pending rows show their register photos plainly, and ดูในแท็บไฟล์ lands on the chip", async () => {
      await roundPage.settlePageRequests(page)
      await measure.visit(`/th/audit/rounds/${round.id}`, "round page with a round photo")
      await expect(roundPage.resultRows(page, e2eDevice, prefix)).toHaveCount(5)
      const aRow = resultRow(page, e2eDevice, a)
      const cRow = resultRow(page, e2eDevice, c)
      const aButton = aRow.getByRole("button", { name: fillTemplate(W.roundPhotoCount, { label: W.photoAttached, count: 1 }), exact: true })
      await expect(aButton).toBeVisible()
      await expect(aButton.locator("img")).toHaveAttribute("src", thumbSrc(checkPhotoId))
      await expectDrawn(aButton.locator("img"))
      await expect(aButton, "one photo: no +n").not.toContainText("+")
      // C checked without a photo: the words, no button, no register photo standing in.
      await expect(photoCell(cRow, e2eDevice)).toHaveText(W.photoMissing)
      await expect(cRow.locator("[data-audit-round-photo], [data-audit-register-photo]")).toHaveCount(0)
      await recordSettled(page, measure, "round page, the photo column")

      // รอตรวจ: B, D and E. A pending row's register photo is plain (no button) and labelled.
      const pendingChip = roundPage.chipByLabel(roundPage.resultChips(page), ROUND_PAGE_WORDS.resultPending)
      await pendingChip.click()
      await expect(pendingChip).toHaveAttribute("aria-current", "page")
      await expect(roundPage.resultRows(page, e2eDevice, prefix)).toHaveCount(3)
      const bCell = photoCell(resultRow(page, e2eDevice, b), e2eDevice)
      const bPhoto = bCell.locator("[data-audit-register-photo]")
      await expect(bPhoto).toHaveAttribute("data-from-model", "true")
      await expect(bPhoto.locator("img")).toHaveAttribute("src", thumbSrc(model.photoId))
      await expect(bPhoto).toContainText(W.modelPhoto)
      await expect(bCell.getByRole("button")).toHaveCount(0)
      const eCell = photoCell(resultRow(page, e2eDevice, e), e2eDevice)
      const ePhoto = eCell.locator("[data-audit-register-photo]")
      await expect(ePhoto.locator("img")).toHaveAttribute("src", thumbSrc(ePhotoId))
      await expect(ePhoto).toContainText(W.registerPhoto)
      await expect(ePhoto).not.toHaveAttribute("data-from-model", "true")
      await expect(eCell.getByRole("button")).toHaveCount(0)
      // D: no photo of its own and no model (E's photo is E's): the dash.
      const dCell = photoCell(resultRow(page, e2eDevice, d), e2eDevice)
      await expect(dCell.locator('[data-slot="nil"]')).toHaveCount(1)
      await expect(dCell.locator("img, button")).toHaveCount(0)
      await recordSettled(page, measure, "round page, pending rows with their register photos")

      // Back to ทั้งหมด: A's thumbnail opens the round's dialog, one tile, whose link lands on the files tab's chip.
      const allChip = roundPage.chipByLabel(roundPage.resultChips(page), ROUND_PAGE_WORDS.resultAll)
      await allChip.click()
      await expect(allChip).toHaveAttribute("aria-current", "page")
      await aButton.click()
      const dialog = page.getByRole("dialog", { name: fillTemplate(W.roundPhotosTitle, { assetTag: a.assetTag, auditNo: round.auditNo }), exact: true })
      await expect(dialog).toBeVisible()
      await expect(photoTiles(dialog)).toHaveCount(1)
      await expect(photoTiles(dialog).locator("img")).toHaveAttribute("src", cardSrc(checkPhotoId))
      await expect(page, "the dialog does not open the asset").toHaveURL((url) => url.pathname === `/th/audit/rounds/${round.id}`)
      await recordSettled(page, measure, "round page, A's round photos")
      await dialog.getByRole("link", { name: W.roundPhotosViewInFiles, exact: true }).click()
      await page.waitForURL(onFilesChip(a.id, round.auditNo))
      await expect(roundPage.chipByLabel(roundFilter(page), round.auditNo)).toHaveAttribute("aria-current", "page")
      await expect(photoTiles(page.getByRole("main"))).toHaveCount(1)
      await recordSettled(page, measure, "A's files tab from the round's dialog")
    })

    await test.step("the history: A's audit row has ดูรูป, which lands on the chip; C's has none", async () => {
      await roundPage.settlePageRequests(page)
      await measure.visit(`/th/assets/${c.id}?view=history`, "C's history, a round without its photo")
      // C's audit row is there (its round's link), without ดูรูป.
      await expect(page.getByRole("main").getByRole("link", { name: new RegExp(scan.escapeRegExp(round.auditNo)) }).first()).toBeVisible()
      await expect(page.getByRole("main").getByRole("link", { name: templatePattern(W.viewPhotosLabel, {}) })).toHaveCount(0)

      await roundPage.settlePageRequests(page)
      await measure.visit(`/th/assets/${a.id}?view=history`, "A's history with the round's photos")
      const viewPhotos = page.getByRole("main").getByRole("link", { name: fillTemplate(W.viewPhotosLabel, { auditNo: round.auditNo }), exact: true })
      await expect(viewPhotos).toHaveCount(1)
      await expect(viewPhotos).toHaveText(W.viewPhotos)
      await recordSettled(page, measure, "A's history, ดูรูป")
      await viewPhotos.click()
      await page.waitForURL(onFilesChip(a.id, round.auditNo))
      await expect(roundPage.chipByLabel(roundFilter(page), round.auditNo)).toHaveAttribute("aria-current", "page")
      await expect(photoTiles(page.getByRole("main"))).toHaveCount(1)
      await recordSettled(page, measure, "A's files tab from the history")
    })

    await test.step("the viewer: A's history row keeps ดูรูป without the round's link", async () => {
      // Spec §6: ดูรูป needs asset:view only and stays when the round's link is dropped for lack of audit:view. The run's
      // viewer role (e2e/support/run-plan.ts) holds audit:view, so it would see the round's link: skipped, saying so.
      if (E2E_ROLE_PERMISSIONS.viewer.includes("audit:view")) {
        testInfo.annotations.push({ type: "skipped step", description: "the viewer step: the run's viewer role holds audit:view, so no run user has asset:view without audit:view" })
        return
      }
      const viewer = await browser.newContext({ baseURL, viewport: page.viewportSize(), storageState: fromRoot(authStateFile(runId, "viewer")) })
      try {
        const viewerPage = await viewer.newPage()
        await viewerPage.goto(`/th/assets/${a.id}?view=history`, { waitUntil: "load" })
        const viewPhotos = viewerPage.getByRole("main").getByRole("link", { name: fillTemplate(W.viewPhotosLabel, { auditNo: round.auditNo }), exact: true })
        await expect(viewPhotos).toHaveCount(1)
        await expect(viewerPage.getByRole("main").locator(`a[href="/th/audit/rounds/${round.id}"]`), "no round link without audit:view").toHaveCount(0)
        await viewPhotos.click()
        await viewerPage.waitForURL(onFilesChip(a.id, round.auditNo))
        await expect(roundLine(viewerPage).getByRole("link")).toHaveCount(0)
        await expect(roundLine(viewerPage)).toContainText(round.auditNo)
      } finally {
        await viewer.close()
      }
    })
  } finally {
    await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบรูปตรวจนับ`)
  }
})
