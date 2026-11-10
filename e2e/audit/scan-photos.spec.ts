// The scan page's photos (audit photos spec §3, plan 1 task 5), in all four projects as IT staff, the phone on WebKit as
// the field audit's walk. The test opens its own round on its own room of five run assets:
// - A has a photo of its own (uploaded through the files tab's route);
// - B has none, but its run model has one (uploaded as the IT head, who holds brand:edit; the model is the run's own);
// - C has neither;
// - D is a parent with E installed in it, and E has a photo of its own.
// The room list shows A's thumb, B's model thumb with รูปประจำรุ่น in its meta line and C's neutral square; the check form
// shows A's card, B's card with the รูปประจำรุ่น chip and no card for C; D's check lists E with E's thumb; and a photo
// taken in A's check form uploads with the audit item's id, so the upload answers auditLinked: true (the only check of
// the link in plan 1). The IT head cancels the round whatever happens (never a DELETE); no shared master data is changed.
import { readFileSync } from "node:fs"
import type { Locator, Page } from "../asset-detail/detail-steps.ts"
import { asUser, expect, runPhoneOnWebKit, test } from "../support/fixtures.ts"
import { authStateFile, fromRoot } from "../support/paths.ts"
import { readRunData, readRunState } from "../support/state.ts"
import { createRoom, readAssetChoices, recordPrefix, type AssetChoices } from "../disposal/disposal-support.ts"
import { fillTemplate } from "../shell/shell-words.ts"
import { bangkokDate } from "../transactions/tx-plan.ts"
import { installComponentByApi } from "../transactions/tx-support.ts"
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

// The image was drawn by the thumbnail route (in view, so the lazy image loads).
async function expectDrawn(image: Locator) {
  await image.scrollIntoViewIfNeeded()
  await expect.poll(() => image.evaluate((element) => (element as HTMLImageElement).complete && (element as HTMLImageElement).naturalWidth > 0)).toBe(true)
}

test("the scan page shows the asset's photo, the model's as the fallback, the components' thumbs, and a photo taken in the check links to its round (audit photos spec §3)", async ({ page, measure, playwright, baseURL }, testInfo) => {
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
  expect(round.generatedItems, "the room's five assets").toBe(5)
  try {
    await measure.visit(`/th/audit/rounds/${round.id}/scan`, "scan page, a round with photos")
    await scan.pickRoom(page, { code: roomCode, name: roomName })
    await expect(scan.roomRows(page)).toHaveCount(5)

    await test.step("the room list shows A's thumb, B's thumb with รูปประจำรุ่น in its meta line, and C's neutral square", async () => {
      const aThumb = thumb(row(page, a)).locator("img")
      await expect(aThumb).toHaveAttribute("src", thumbSrc(aPhotoId))
      await expect(aThumb).toHaveAttribute("alt", `${a.assetTag} ${a.name}`)
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

    await test.step("the check form shows A's card without the chip and B's card with the chip, and C shows no card", async () => {
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
      await expect(photoCard(page)).toHaveCount(0)
    })

    await test.step("D's check form lists E with E's thumb", async () => {
      await openRow(page, d)
      const component = scan.checkForm(page).locator("[data-audit-component-row]").filter({ hasText: e.assetTag })
      await expect(component).toHaveCount(1)
      await expect(thumb(component).locator("img")).toHaveAttribute("src", thumbSrc(ePhotoId))
      await expect(thumb(component).locator("img")).toHaveAttribute("alt", `${e.assetTag} ${e.name}`)
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
      expect(await response.json(), "the photo is linked to the round").toMatchObject({ auditLinked: true })
      await recordSettled(page, measure, "A saved with a photo from the check")
    })
  } finally {
    await rounds.cancelAsItHead(playwright.request, baseURL, round.id, `${prefix} ยกเลิกรอบทดสอบรูปตรวจนับ`)
  }
})
