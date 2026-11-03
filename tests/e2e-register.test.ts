import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import path from "node:path"
import test from "node:test"

// The register's E2E specs of page group 4 plan 1 (plan docs/superpowers/plans/2026-11-01-group4-register.md, Task 8;
// spec docs/superpowers/specs/2026-11-01-page-group-4-register-form-design.md §17): what they stand on — the app's own
// words, the suite's fixtures and user, the stable hooks the plan keeps, assets of their own and no master data — and
// the locators the register's change moved (the dashboard's สถานะอื่น tab, the import wizard's page in the viewer's
// lists). The specs run with `npm run test:e2e`; these pins need no app. Reads strip \r (the working tree may be CRLF).
const read = (file: string) => readFileSync(file, "utf8").replace(/\r/g, "")
const values = (node: unknown): string[] => typeof node === "string" ? [node] : node && typeof node === "object" ? Object.values(node).flatMap(values) : []
// A words-file template and a th.json value are the same text whatever their placeholders are named.
const shape = (text: string) => text.replace(/\{\w+\}/g, "{}")

test("the register's specs read the app's own words (group 4 plan 1 task 8)", async () => {
  const { REGISTER_WORDS } = await import("../e2e/assets/register-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(REGISTER_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  assert.equal(REGISTER_WORDS.tabOther, th.asset.quickFilterOther)
  assert.equal(REGISTER_WORDS.sumLine, th.asset.statusSumLine)
  assert.equal(REGISTER_WORDS.mobileEnd, th.asset.registerMobileEnd)
  assert.equal(REGISTER_WORDS.bulkCorrectionTitle, th.asset.bulkCorrectionTitle)
  assert.equal(REGISTER_WORDS.departmentFollows, th.asset.bulkDepartmentFollows)
  assert.equal(REGISTER_WORDS.holderCorrected, th.asset.movementTypes.register_custodian_correction)
  assert.equal(REGISTER_WORDS.departmentCorrected, th.asset.movementTypes.register_department_correction)
  assert.equal(REGISTER_WORDS.saveView, th.asset.saveView)
  assert.equal(REGISTER_WORDS.viewNameRequired, th.asset.viewNameRequired)
})

test("the register finds a person's assets, lists the สถานะอื่น tab and keeps a saved view; the bulk correction follows the department rule (group 4 plan 1 task 8)", () => {
  const find = read("e2e/assets/register-find.spec.ts")
  const correction = read("e2e/assets/register-bulk-correction.spec.ts")
  for (const [file, spec] of [["register-find", find], ["register-bulk-correction", correction]] as const) {
    assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), `${file}: the suite's fixtures`)
    assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("itStaff")`), `${file}: IT staff`)
    // Assets of their own through the asset API, never master data (spec §7), never a sign-in or a DELETE.
    assert.ok(spec.includes("await createTxAsset(page, masters, testInfo.project.name, "), `${file}: its own assets`)
    assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin)|createRoom\(|signInOnce\(/, `${file}: no master data`)
  }
  // Find: the holder is the IT head's employee (no other spec gives them an asset); the register's own search typed
  // and sent with Enter; the desktop row and the phone card each read as the spec says.
  assert.ok(find.includes("const holder = readRunData().employees.itHead"))
  assert.ok(find.includes("await field.press(\"Enter\")"))
  assert.ok(find.includes('page.locator("[data-asset-desktop-table] tbody tr").filter({ has: page.getByRole("checkbox", { name: assetTag, exact: true }) })'))
  assert.ok(find.includes("await expect(row.getByText(`${holder.fullNameTh} · ${run.location.name}`, { exact: true })).toBeVisible()"))
  // สถานะอื่น: a disposal request (IT staff's own, its route's body) leaves the asset in Pending Disposal.
  assert.ok(find.includes('page.request.post("/api/disposal-requests", {'))
  assert.ok(find.includes('expect(status.name, "a status with no tab of its own").toBe("Pending Disposal")'))
  assert.ok(find.includes('url.searchParams.get("statusGroup") === "other"'))
  assert.ok(find.includes('page.locator("[data-asset-status-sum]")'))
  // Saved views: desktop only, the error first, then kept and opened again from the row.
  assert.ok(find.includes("test.skip(e2eDevice === \"phone\", DESKTOP_ONLY)"))
  assert.ok(find.includes('await expectFieldError(page, "asset-saved-view-name", REGISTER_WORDS.viewNameRequired)'))
  assert.ok(find.includes("const name = `E2E ${runId}`"))
  // The correction: desktop only, a บุคคล and a ส่วนกลาง asset in another department, through the bar's อื่น ๆ, the
  // errors first, then read back with the department rule and the history's correction lines.
  assert.ok(correction.includes("test.skip(e2eDevice === \"phone\", DESKTOP_ONLY)"))
  assert.ok(correction.includes("const other = await readSecondDepartment()"))
  assert.ok(correction.includes('{ ownershipType: "shared", departmentId: other.id }'))
  assert.ok(correction.includes('const BAR = "[data-asset-selection-bar]"'))
  for (const id of ["#asset-bulk-custodian", "#asset-bulk-reason", "#asset-bulk-location"]) assert.ok(correction.includes(id), id)
  assert.ok(correction.includes("expect([personalAfter.custodianId, personalAfter.departmentId, personalAfter.status.name]).toEqual([holder.id, data.departmentId, \"In Use\"])"))
  assert.ok(correction.includes("expect([sharedAfter.custodianId, sharedAfter.departmentId, sharedAfter.status.name]).toEqual([holder.id, other.id, \"Ready\"])"))
  assert.ok(correction.includes("await expect(main).not.toContainText(REGISTER_WORDS.departmentCorrected)"))
})

test("the specs the register's change moved: the dashboard's status list reads สถานะอื่น, and the viewer's lists hold the import wizard's page (group 4 plan 1 task 8)", async () => {
  const dashboard = read("e2e/dashboard/dashboard.spec.ts")
  assert.ok(dashboard.includes("const currentStatusTab = page.locator('[data-asset-status-tabs] a[aria-current=\"page\"]')"))
  assert.ok(dashboard.includes("if ((await statusTab.count()) === 0) await expect(currentStatusTab).toHaveText(new RegExp(`^${escapeRegExp(DASHBOARD_WORDS.otherStatusTab)}`))"))
  const { DASHBOARD_WORDS } = await import("../e2e/dashboard/dashboard-words.ts")
  assert.equal(DASHBOARD_WORDS.otherStatusTab, JSON.parse(read("messages/th.json")).asset.quickFilterOther)
  const refusals = await import("../e2e/cross-cutting/support/refusals.ts")
  // The import wizard left the register (Task 4); the viewer reads its page. Since group 4 plan 5 the import card opens
  // on arrival (no "เปิดตัวช่วยนำเข้า"), and the control only an importer sees there is the template link.
  assert.ok(refusals.READ_ONLY_LISTS.includes("/th/asset-management/import-export"))
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(th.asset.openImportWizard, undefined)
  assert.ok(!refusals.WRITE_BUTTON_NAMES.includes("เปิดตัวช่วยนำเข้า"))
  // The template link is a link, caught by its pattern (writeControls reads buttons by name only): plan 5 final review.
  assert.ok(!refusals.WRITE_BUTTON_NAMES.includes(th.asset.importPage.templateDownload))
  assert.ok(refusals.isWriteLink("/api/assets/import-template"))
  assert.ok(read("src/components/assets/asset-import-preview-panel.tsx").includes('<a href="/api/assets/import-template" download className={buttonVariants({ variant: "outline" })}>\n                <Download aria-hidden="true" />\n                {t("importPage.templateDownload")}'))
  assert.doesNotMatch(read("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx"), /templateDownload|import-template/)
  assert.doesNotMatch(read("src/app/[locale]/(dashboard)/assets/page.tsx"), /AssetImportPreviewPanel/)
})

test("the edit page's spec reads the app's own words and keeps to the correction's rules (group 4 plan 2 task 9)", async () => {
  const { REGISTER_WORDS } = await import("../e2e/assets/register-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(REGISTER_WORDS.editTitleNamed, th.asset.editTitleNamed)
  assert.equal(REGISTER_WORDS.viewAssetPage, th.asset.viewAssetPage)
  assert.equal(REGISTER_WORDS.departmentFollowsHolder, th.transfer.followsHolder)
  assert.equal(REGISTER_WORDS.correctionReasonRequired, th.asset.correctionReasonRequired)
  assert.equal(REGISTER_WORDS.changeCount, th.asset.changeCount)
  assert.equal(REGISTER_WORDS.changeListReason, th.asset.changeListReason)
  assert.equal(REGISTER_WORDS.holderLabel, th.asset.custodian)
  assert.equal(REGISTER_WORDS.departmentLabel, th.asset.department)
  assert.equal(REGISTER_WORDS.saveCorrection, th.asset.saveCorrection)
  assert.equal(REGISTER_WORDS.fieldChanged, th.asset.fieldChanged)
  assert.equal(REGISTER_WORDS.fieldWas, th.asset.fieldWas)
  assert.equal(REGISTER_WORDS.holderChanged, th.asset.movementTypes.custodian_change)
  assert.equal(REGISTER_WORDS.changeTag, th.asset.changeTag)
  assert.equal(REGISTER_WORDS.changeTagTitle, th.asset.changeTagTitle)
  assert.equal(REGISTER_WORDS.changeTagConfirm, th.asset.changeTagConfirm)
  assert.equal(REGISTER_WORDS.changeTagWarning, th.asset.changeTagWarning)
  assert.equal(REGISTER_WORDS.tagChanged, th.asset.movementTypes.asset_tag_change)
  assert.equal(REGISTER_WORDS.openHandoverLock, th.asset.openHandoverLock)
  assert.equal(REGISTER_WORDS.openHandoverLink, th.asset.openHandoverLink)
  assert.equal(REGISTER_WORDS.required, th.common.validation.required)

  const spec = read("e2e/assets/register-edit-correction.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("itStaff")`), "IT staff")
  assert.ok(spec.includes("await createTxAsset(page, masters, testInfo.project.name, "), "its own assets")
  assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin)|createRoom\(|signInOnce\(/, "no master data")
  // (a) both devices: a บุคคล asset in another department, a holder picked, แผนก locked, the reason asked first with no
  // PUT, the change list as a dialog (popover or sheet), read back with the holder's department, the history's lines.
  assert.ok(spec.includes('"RE1", "โน้ตบุ๊กแก้ไขผู้ถือครองหน้าแก้ไข", { departmentId: other.id })'))
  // Opened from the asset page (returnTo), so the save goes back there and the spec waits for that page (final review);
  // without returnTo the edit goes to the register and the wait would never match.
  assert.ok(spec.includes("const editFromAssetPage = (assetId: string) => `/th/assets/${assetId}/edit?returnTo=${encodeURIComponent(`/th/assets/${assetId}`)}`"))
  assert.equal(spec.split("visitAssetEdit(measure, editFromAssetPage(asset.id), ").length - 1, 2, "both saving tests open the edit page from the asset page")
  // E2E-1103C: every edit page is recorded once its duplicate check has answered, so axe never reads the save button's
  // colour fade half way. The wait lives in tx-support.ts's visitAssetEdit (E2E-1103G/H), shared with the other specs.
  assert.equal(spec.split("await visitAssetEdit(measure, ").length - 1, 3, "the three edit pages")
  assert.match(spec, /^\s+visitAssetEdit,$/m)
  assert.doesNotMatch(spec, /await visit\(measure, |visitEdit\(/)
  const support = read("e2e/transactions/tx-support.ts")
  const visitAssetEdit = support.slice(support.indexOf("export async function visitAssetEdit(measure: Measure, path: string, label: string, testInfo: TestInfo) {"))
  assert.ok(visitAssetEdit.length < support.length, "tx-support.ts exports visitAssetEdit")
  assert.ok(visitAssetEdit.includes('const checked = page.waitForResponse((response) => new URL(response.url()).pathname === "/api/assets/duplicates")\n  await page.goto(path, { waitUntil: "load" })'))
  assert.ok(visitAssetEdit.includes('await checked\n  await expect(page.locator("#asset-save-reason")).toHaveCount(0)\n  return record(measure, label, testInfo)'))
  assert.equal(spec.split("await page.waitForURL((url) => url.pathname === `/th/assets/${asset.id}`)").length - 1, 2)
  assert.ok(spec.includes('await pickSearchable(page, "asset-custodian", holder.code, `${holder.code} - ${holder.fullNameTh}`)'))
  assert.ok(spec.includes("await expect(department).toContainText(fillTemplate(REGISTER_WORDS.departmentFollowsHolder, { department: runDepartment.name }))"))
  assert.ok(spec.includes('await expectFieldError(page, "asset-correction-reason", REGISTER_WORDS.correctionReasonRequired)'))
  assert.ok(spec.includes('expect(put, "the wrong entry sends nothing").toBe(0)'))
  assert.ok(spec.includes('const list = page.getByRole("dialog", { name: count })'))
  assert.ok(spec.includes("expect([after.custodianId, after.departmentId]).toEqual([holder.id, data.departmentId])"))
  assert.ok(spec.includes("await expect(main).not.toContainText(REGISTER_WORDS.holderChanged)"))
  // (b) desktop only: the tag dialog, its error, the new tag saved and its history line.
  assert.ok(spec.includes('test.skip(e2eDevice === "phone", DESKTOP_ONLY)'))
  assert.ok(spec.includes('await expectFieldError(page, "asset-tag-new", REGISTER_WORDS.required)'))
  assert.ok(spec.includes("name: `${REGISTER_WORDS.assetTagLabel} ${asset.assetTag} ${REGISTER_WORDS.changeTag}`, exact: true"), "the tag button's name")
  assert.ok(spec.includes("expect((await readAsset(page, asset.id)).assetTag).toBe(newTag)"))
  assert.ok(spec.includes('await expect(page.getByRole("main")).toContainText(REGISTER_WORDS.tagChanged)'))
  // (c) an open handover: the notice and its link to the document, never โอนย้าย; the three controls read-only.
  assert.ok(spec.includes("const handover = await handoverByApi(page, asset.id, receiver.id, masters.goodConditionId)"))
  assert.ok(spec.includes('toHaveAttribute("href", `/th/asset-management/checkouts/${handover.id}`)'))
  assert.ok(spec.includes(`await expect(main.locator('a[href*="/asset-management/transfer"]')).toHaveCount(0)`))
  for (const id of ["#asset-custodian", "#asset-current-location", "#asset-department"]) assert.ok(spec.includes(`page.locator("${id}")`), id)
})

test("the purchase-document spec reads the app's own words, finds a document by a linked asset's model, uploads with the save and the batch, and never unlinks (group 4 plan 3 task 7)", async () => {
  const { REGISTER_WORDS } = await import("../e2e/assets/register-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  assert.equal(REGISTER_WORDS.purchaseDocuments, th.asset.purchaseDocuments)
  assert.equal(REGISTER_WORDS.purchaseDocumentLinkedNames, th.asset.purchaseDocumentLinkedNames)
  assert.equal(REGISTER_WORDS.purchaseDocumentLinkedCount, th.asset.purchaseDocumentLinkedCount)
  assert.equal(REGISTER_WORDS.purchaseDocumentChosen, th.asset.purchaseDocumentChosen)
  assert.equal(REGISTER_WORDS.purchaseDocumentSearchFooter, th.asset.purchaseDocumentSearchFooter)
  assert.equal(REGISTER_WORDS.documentsSelected, th.asset.sectionSummary.documentsSelected)
  assert.equal(REGISTER_WORDS.documentsLinked, th.asset.sectionSummary.documentsLinked)
  assert.equal(REGISTER_WORDS.purchaseDocumentRemoveNamed, th.asset.purchaseDocumentRemoveNamed)
  assert.equal(REGISTER_WORDS.purchaseDocumentExists, th.apiErrors.purchaseDocumentExists)
  assert.equal(REGISTER_WORDS.typePurchaseOrder, th.asset.purchaseDocumentTypes.purchase_order)
  assert.equal(REGISTER_WORDS.typeInvoice, th.asset.purchaseDocumentTypes.invoice)
  assert.equal(REGISTER_WORDS.typeDeliveryNote, th.asset.purchaseDocumentTypes.delivery_note)
  assert.equal(REGISTER_WORDS.savedSuccess, th.common.savedSuccess)
  assert.equal(REGISTER_WORDS.createModeBatch, th.asset.createModeBatch)
  assert.equal(REGISTER_WORDS.batchSubmit, th.asset.batchSubmit)
  assert.equal(REGISTER_WORDS.batchReviewTitle, th.asset.batchReviewTitle)
  assert.equal(REGISTER_WORDS.batchReviewConfirm, th.asset.batchReviewConfirm)
  assert.equal(REGISTER_WORDS.batchCreatedTitle, th.asset.batchCreatedTitle)

  const spec = read("e2e/assets/register-purchase-documents.spec.ts")
  const steps = read("e2e/assets/purchase-steps.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("itStaff")`), "IT staff")
  assert.ok(spec.includes("await createTxAsset(page, masters, testInfo.project.name, "), "its own assets")
  // No master data: the model is read by the seed admin with a GET, never made; no sign-in.
  for (const [file, source] of [["spec", spec], ["steps", steps]] as const) {
    assert.doesNotMatch(source, /\/api\/(?:locations|departments|employees|admin|brands)|createRoom\(|signInOnce\(/, `${file}: no master data`)
  }
  assert.ok(steps.includes('const response = await admin.get("/api/models")'))
  assert.equal(steps.split("admin.").length - 1, 2, "the seed admin's context only reads the models, then is disposed")
  assert.ok(steps.includes("storageState: fromRoot(ADMIN_STATE_FILE)"))
  // The asset takes the model with its brand and category (CreateAssetOptions); D1 is made and linked in one request.
  const support = read("e2e/transactions/tx-support.ts")
  assert.ok(support.includes("categoryId: options.categoryId ?? masters.categoryId,"))
  assert.ok(support.includes('brandId: options.brandId ?? "",') && support.includes('modelId: options.modelId ?? "",'))
  assert.ok(spec.includes("modelId: model.id,"))
  assert.ok(steps.includes("page.request.post(`/api/assets/${assetId}/purchase-documents`, {") && steps.includes("multipart: {"))
  // PD1, all four projects: the two-word query (the model's name and A's tag), one result with the linked line and the
  // footer, the badge, the duplicate under its field with nothing posted and the file kept, the save's requests, the
  // read-back counts, and the edit page folded with its summary and both chips.
  assert.ok(spec.includes("const query = `${model.name} ${assetA.assetTag}`"))
  assert.ok(steps.includes('url.pathname === PURCHASE_DOCUMENT_SEARCH_PATH && url.searchParams.get("q") === text'))
  assert.ok(spec.includes("fillTemplate(REGISTER_WORDS.purchaseDocumentLinkedNames, { count: 1, names: assetA.name })"))
  assert.ok(spec.includes('templatePattern(REGISTER_WORDS.purchaseDocumentSearchFooter, { count: "1" })'))
  assert.ok(spec.includes("fillTemplate(REGISTER_WORDS.documentsSelected, { count: 1 })"))
  assert.ok(spec.includes('await expectFieldError(page, "asset-purchase-document-no", REGISTER_WORDS.purchaseDocumentExists)'))
  assert.ok(spec.includes('expect(posted, "the refused document posts nothing").toBe(0)'))
  assert.ok(spec.includes('isAssetDocumentPost(response, "multipart")') && spec.includes('isAssetDocumentPost(response, "json")'))
  assert.ok(spec.includes("expect([d1After.id, d1After.linkedAssetCount]).toEqual([d1.id, 2])"))
  assert.ok(spec.includes('await expect(edit.section).not.toHaveAttribute("open", "")'))
  assert.ok(spec.includes("fillTemplate(REGISTER_WORDS.documentsLinked, { count: 2 })"))
  assert.ok(spec.includes("await expect(chips).toHaveCount(2)"))
  // Never a chip's × on the edit page: its unlink is a request the suite never sends.
  assert.doesNotMatch(spec, /purchaseDocumentRemoveNamed[^\n]*\.click\(/)
  assert.doesNotMatch(spec, /(?:data-purchase-document-chip|\bchips?\b)[^\n]*\.click\(/)
  // PD2, desktop only: one search and one upload for the batch, 2 created, D1 linked to 4, the new one to 2.
  assert.ok(spec.includes('test.skip(e2eDevice === "phone", DESKTOP_ONLY)'))
  assert.ok(spec.includes('searchPurchaseDocuments(page, before.query, "asset-batch-purchase-document")'))
  assert.ok(spec.includes('page.locator("#asset-batch-purchase-document-file").setInputFiles(PDF_FIXTURE)'))
  assert.ok(spec.includes("expect(batch.created).toBe(2)"))
  assert.ok(spec.includes("expect((await readPurchaseDocument(page, before.document.documentNo)).linkedAssetCount).toBe(4)"))
  assert.ok(spec.includes('expect([delivery.documentType, delivery.linkedAssetCount]).toEqual(["delivery_note", 2])'))
  // The hooks the spec stands on are the app's.
  const section = read("src/components/assets/asset-form-documents.tsx")
  for (const id of ["asset-purchase-document", "asset-purchase-document-file", "asset-purchase-document-type", "asset-purchase-document-no"]) assert.ok(section.includes(`id="${id}"`), id)
  const picker = read("src/components/assets/purchase-document-picker.tsx")
  for (const hook of ["data-purchase-document-chip={row.id}", "data-purchase-document-option={row.id}", "data-purchase-document-footer", "const searchId = `${id}-search`", "const listboxId = `${id}-listbox`"]) assert.ok(picker.includes(hook), hook)
  const batch = read("src/components/assets/asset-batch-form.tsx")
  for (const id of ["asset-batch-purchase-document", "asset-batch-purchase-document-file", "asset-batch-purchase-document-type"]) assert.ok(batch.includes(`id="${id}"`), id)
  assert.ok(batch.includes('purchaseDocumentNo: "asset-batch-purchase-document-no"'))
})

test("the components and scan specs read the app's own words, remove a component through POST …/remove and find a card by a run-unique Serial (group 4 plan 4 task 6)", async () => {
  const { COMPONENT_WORDS, SCAN_WORDS } = await import("../e2e/assets/register-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of [...Object.entries(COMPONENT_WORDS), ...Object.entries(SCAN_WORDS)]) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  const a = th.asset
  assert.deepEqual(
    [COMPONENT_WORDS.title, COMPONENT_WORDS.installAction, COMPONENT_WORDS.installPanelStep, COMPONENT_WORDS.notInstalled, COMPONENT_WORDS.removedHere, COMPONENT_WORDS.roleAdapter],
    [a.manageComponents, a.componentInstallAction, a.componentInstallPanelStep, a.componentCandidateNotInstalled, a.componentCandidateRemovedHere, a.componentRoles.adapter],
  )
  assert.deepEqual(
    [COMPONENT_WORDS.continueReview, COMPONENT_WORDS.confirmInstall, COMPONENT_WORDS.installSuccess, COMPONENT_WORDS.history, COMPONENT_WORDS.historyCount, COMPONENT_WORDS.stillInstalled, COMPONENT_WORDS.photoCount],
    [a.componentContinueReview, a.componentConfirmInstall, a.componentInstallSuccess, a.componentHistory, a.componentHistoryCount, a.componentStillInstalled, a.componentPhotoCount],
  )
  assert.deepEqual(
    [COMPONENT_WORDS.moreActionsFor, COMPONENT_WORDS.openAsset, COMPONENT_WORDS.remove, COMPONENT_WORDS.removeTitle, COMPONENT_WORDS.removeNow, COMPONENT_WORDS.removeAfter, COMPONENT_WORDS.status],
    [th.common.moreActionsFor, a.componentOpenAsset, a.removeComponent, a.componentRemoveTitle, a.componentRemoveNow, a.componentRemoveAfter, a.componentStatus],
  )
  assert.deepEqual(
    [COMPONENT_WORDS.installedState, COMPONENT_WORDS.removedState, COMPONENT_WORDS.countHere, COMPONENT_WORDS.countValue, COMPONENT_WORDS.evidenceChosen, COMPONENT_WORDS.confirmRemove, COMPONENT_WORDS.noCustodian],
    [a.componentInstalled, a.componentStateRemoved, a.componentCountHere, a.componentCountValue, a.componentEvidenceSelected, a.componentConfirmRemove, a.noCustodian],
  )
  const tools = th.assetTools
  assert.deepEqual(
    [SCAN_WORDS.title, SCAN_WORDS.queryLabel, SCAN_WORDS.foundMatch, SCAN_WORDS.matchSerial, SCAN_WORDS.condition, SCAN_WORDS.components, SCAN_WORDS.componentsValue],
    [tools.scanTitle, tools.scanQueryLabel, tools.scanFoundMatch, tools.scanMatchFields.serial, tools.scanCondition, tools.scanComponents, tools.scanComponentsValue],
  )
  assert.deepEqual(
    [SCAN_WORDS.openAsset, SCAN_WORDS.nextActions, SCAN_WORDS.checkin, SCAN_WORDS.recordRepair, SCAN_WORDS.printLabel, SCAN_WORDS.recent, SCAN_WORDS.recentClear],
    [tools.openAsset, tools.scanNextActions, a.rowActionCheckin, a.quickMaintenance, a.printLabel, tools.scanRecent, tools.scanRecentClear],
  )

  const components = read("e2e/assets/register-components.spec.ts")
  const scan = read("e2e/assets/scan-search.spec.ts")
  for (const [file, spec] of [["register-components", components], ["scan-search", scan]] as const) {
    assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), `${file}: the suite's fixtures`)
    assert.ok(spec.split("\n").some((line) => line.trim() === `asUser("itStaff")`), `${file}: IT staff`)
    assert.ok(spec.includes("await createTxAsset(page, masters, testInfo.project.name, "), `${file}: its own assets`)
    // No master data, no sign-in, no DELETE: the removal is a POST (P4-R1).
    assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin)|createRoom\(|signInOnce\(|request\.delete|DELETE/, `${file}: no master data, nothing deleted`)
    // Not limited to a device: all four projects.
    assert.ok(!spec.includes("test.skip("), `${file}: all four projects`)
  }
  // Components: the panel from the header's button, the search's own answer, the role by its Thai label (P4-R4), the
  // install POST, the row's ⋯ by its name (P4-R3), the dialog's before/after rows, the POST …/remove answering 200
  // with a reason and a photo, the past row, and the candidate's line about this parent (P4-R5).
  for (const hook of [
    'main.getByRole("button", { name: COMPONENT_WORDS.installAction, exact: true })',
    'await expect(page.locator("#component-install")).toHaveCount(0)',
    'url.pathname === CANDIDATES_PATH && url.searchParams.get("search") === text',
    'await page.locator("#component-install-role").selectOption({ label: COMPONENT_WORDS.roleAdapter })',
    'expect((await installed).status(), "the install").toBe(201)',
    "fillTemplate(COMPONENT_WORDS.moreActionsFor, { code: assetTag })",
    "await menuItem(menu, COMPONENT_WORDS.remove).click()",
    ".toHaveText([COMPONENT_WORDS.status, COMPONENT_WORDS.installedState, COMPONENT_WORDS.removedState])",
    "fillTemplate(COMPONENT_WORDS.countValue, { count: 1 }), fillTemplate(COMPONENT_WORDS.countValue, { count: 0 })",
    'response.request().method() === "POST" && url.pathname.startsWith(`/api/assets/${parent.id}/components/`) && url.pathname.endsWith("/remove")',
    'expect((await removed).status(), "the removal").toBe(200)',
    'await dialog.locator("input[type=file]").setInputFiles(PHOTO_FIXTURE)',
    "await expect(rowMenuTrigger(page, component.assetTag)).toHaveCount(0)",
    "fillTemplate(COMPONENT_WORDS.removedHere, { date: removedOn })",
  ]) assert.ok(components.includes(hook), hook)
  // The hooks the components spec stands on are the app's.
  const manager = read("src/components/assets/asset-component-manager.tsx")
  for (const hook of [
    'const INSTALL_SEARCH_ID = "component-install-search"',
    'id="component-install"',
    'id="component-install-role"',
    'id="component-install-slot"',
    'id="component-remove-reason"',
    'menuLabel={tCommon("moreActionsFor", { code: row.componentAsset.assetTag })}',
    "/api/assets/component-candidates?",
    '/components/${component.id}/remove`, { method: "POST"',
  ]) assert.ok(manager.includes(hook), hook)
  // Scan: a run-unique Serial (CreateAssetOptions.serialNumber), a component and a handover by API, the route's own
  // answer, one card that matched the Serial, its action links, the way back, the recent list cleared, Enter on the tag.
  assert.ok(scan.includes("const typed = `${runId}-${projectCode(testInfo.project.name)}-SCAN`"))
  assert.ok(scan.includes('"SCN1", "โน้ตบุ๊กสแกนค้นหา", { serialNumber: serial })'))
  assert.ok(scan.includes("await installComponentByApi(page, asset.id, component.id, ") && scan.includes("await handoverByApi(page, asset.id, holder.id, masters.goodConditionId)"))
  for (const hook of [
    'const SCAN_SEARCH_PATH = "/api/assets/scan-search"',
    'url.pathname === SCAN_SEARCH_PATH && url.searchParams.get("q") === text',
    "fillTemplate(SCAN_WORDS.foundMatch, { count: 1, field: SCAN_WORDS.matchSerial })",
    "await expect(cards).toHaveCount(1)",
    "fillTemplate(SCAN_WORDS.componentsValue, { count: 1, names: component.name })",
    "toHaveText([SCAN_WORDS.checkin, SCAN_WORDS.recordRepair, SCAN_WORDS.printLabel])",
    'toEqual(["/th/asset-management/checkin", handover.id, SCAN_PATH])',
    'url.searchParams.get("returnTo") === SCAN_PATH',
    'getByRole("link", { name: SCAN_WORDS.backToScan, exact: true })',
    'await page.getByRole("button", { name: SCAN_WORDS.recentClear, exact: true }).click()',
    'await page.locator("#asset-scan-query").fill(asset.assetTag)',
  ]) assert.ok(scan.includes(hook), hook)
  assert.equal(scan.split('await page.locator("#asset-scan-query").press("Enter")').length - 1, 2, "Enter on a part (stays) and on the full tag (opens)")
  const tool = read("src/components/assets/asset-scan-search-tool.tsx")
  for (const hook of ['id="asset-scan-query"', 'aria-labelledby="asset-scan-results-title"', 'aria-labelledby="asset-scan-recent-title"', 'role="group" aria-label={t("scanNextActions")}']) assert.ok(tool.includes(hook), hook)
  assert.ok(read("src/lib/asset-scan-search-rules.ts").includes('export const assetScanSearchPath = "/api/assets/scan-search"'))
})

// Group 4 plan 5 Task 6 (P5-R1, the user 2026-11-02: the suite may run the Excel import on the dev database; every
// other ban stays): the import spec reads the app's own words, imports a file it builds itself as IT staff, with a
// run-marked tag on every row, never fetches the template (it lists every active employee of a Production copy, and a
// failure's trace keeps network bodies), changes no master data, deletes nothing, and is the only file of the suite that
// drives the import's file input.
function suiteFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const full = path.join(directory, entry)
    return statSync(full).isDirectory() ? suiteFiles(full) : [full.replaceAll("\\", "/")]
  })
}

test("the import spec imports a file of its own as IT staff on the dev database, reads the app's words and touches no master data; the viewer gets the export only (group 4 plan 5 task 6)", async () => {
  const { IMPORT_WORDS } = await import("../e2e/assets/import-export-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(IMPORT_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  const page = th.asset.importPage
  const issue = th.asset.importIssue
  const tools = th.assetTools.importExportPage
  assert.deepEqual(
    [IMPORT_WORDS.pageTitle, IMPORT_WORDS.cardTitle, IMPORT_WORDS.templateDownload, IMPORT_WORDS.resultTitle, IMPORT_WORDS.statRows, IMPORT_WORDS.statReady, IMPORT_WORDS.statErrors],
    [th.assetTools.importExportTitle, page.title, page.templateDownload, page.resultTitle, page.statRows, page.statReady, page.statErrors],
  )
  assert.deepEqual(
    [IMPORT_WORDS.filterErrors, IMPORT_WORDS.filterReady, IMPORT_WORDS.filterAll, IMPORT_WORDS.rowReady, IMPORT_WORDS.footerSummary, IMPORT_WORDS.confirm, IMPORT_WORDS.doneSummary, IMPORT_WORDS.doneAssets],
    [page.filterErrors, page.filterReady, page.filterAll, page.rowReady, page.footerSummary, page.confirm, page.doneSummary, page.doneAssets],
  )
  assert.deepEqual(
    [IMPORT_WORDS.issueLine, IMPORT_WORDS.issueValue, IMPORT_WORDS.issueSeparator, IMPORT_WORDS.usedBy, IMPORT_WORDS.fieldCurrentLocation, IMPORT_WORDS.fieldSerial, IMPORT_WORDS.notFound, IMPORT_WORDS.duplicateExisting],
    [issue.line, issue.value, issue.separator, issue.usedBy, th.asset.importField.currentLocationCode, th.asset.importField.serialNumber, th.asset.importError.notFound, th.asset.importError.duplicateExisting],
  )
  assert.deepEqual(
    [IMPORT_WORDS.historyTitle, IMPORT_WORDS.historyCounts, IMPORT_WORDS.outcomePartial, IMPORT_WORDS.exportAll, IMPORT_WORDS.exportAllCount],
    [tools.historyTitle, tools.historyCounts, tools.outcomePartial, tools.exportAll, tools.exportAllCount],
  )

  const spec = read("e2e/assets/import-export.spec.ts")
  const file = read("e2e/assets/import-file.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  const lines = spec.split("\n").map((line) => line.trim())
  assert.ok(lines.includes(`asUser("itStaff")`) && lines.includes(`asUser("viewer")`), "IT staff import; the viewer reads")
  assert.ok(!spec.includes("test.skip("), "all four projects")
  // The Serial holder is an asset of its own; every tag in the file is run-marked and never blank, so the confirm never
  // takes a number from a company's sequence (critic R3); Serials and the file name carry the run and the project.
  assert.ok(spec.includes('await createTxAsset(page, masters, testInfo.project.name, "IMPS", '), "the Serial holder")
  assert.ok(spec.includes("{ serialNumber: holderSerial }"))
  for (const key of ["IMP1", "IMP2", "IMP3"]) assert.ok(spec.includes(`assetTag: txAssetTag(runId, testInfo.project.name, "${key}")`), key)
  assert.equal(spec.split("assetTag:").length - 1, 3, "three rows, each with its run-marked tag")
  assert.ok(spec.includes("const serialPrefix = `SN-${runId}-${code}-IMP`"))
  assert.ok(spec.includes("const holderSerial = `${serialPrefix}S`"))
  assert.ok(spec.includes("const fileName = `${runId}-${code}-import.xlsx`"))
  assert.ok(spec.includes("const missingRoom = `${runId}-${code}-NOLOC`"))
  assert.ok(file.includes("if (!row.assetTag?.trim()) throw new Error("), "the helper refuses a blank tag")
  // The file is built in memory from the template's own columns, as an .xlsx the upload check takes.
  assert.ok(file.includes('import { assetImportColumns } from "../../src/lib/asset-excel.ts"'))
  assert.ok(file.includes('export const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"'))
  assert.ok(file.includes('workbook.addWorksheet("Asset Import")'))
  assert.doesNotMatch(file, /writeFile|saveAs|import-(?:preview|confirm|template)/, "in memory, and the helper sends nothing")
  // Never the template's body: the link is checked by its href and download attribute only.
  assert.equal(spec.split("import-template").length - 1, spec.split('a[href="/api/assets/import-template"]').length - 1, "import-template only in the link's locator")
  assert.doesNotMatch(spec, /waitForEvent\("download"\)|downloadBy\(|templateDownload[^\n]*\.click\(|saveAs\(/)
  assert.ok(spec.includes('await expect(template).toHaveAttribute("download", "")'))
  // No master data, no sign-in, nothing deleted; the codes come from the asset form's option labels.
  assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin|companies|branches|categories)|createRoom\(|signInOnce\(|request\.delete|DELETE/)
  assert.doesNotMatch(file, /\/api\/|DELETE/)
  for (const select of ["#asset-company", "#asset-branch", "#asset-category"]) assert.ok(spec.includes(select), select)
  // Only this spec drives the import's file input (critic X7): the browser no longer stops the import routes.
  const drivers = suiteFiles("e2e").filter((name) => /\.(?:ts|mjs|js)$/.test(name) && read(name).includes("asset-import-file"))
  assert.deepEqual(drivers, ["e2e/assets/import-export.spec.ts"])
  // The steps: the upload and its answer, the tiles, the two Thai lines with the holder's tag, the filter, the honest
  // confirm, the done state, the history row by the file name, the asset opened; axe on review and done.
  for (const hook of [
    'await page.locator("#asset-import-file").setInputFiles(file)',
    "url.pathname === IMPORT_PREVIEW_PATH",
    "url.pathname === IMPORT_CONFIRM_PATH",
    "const filterButton = (value: string) => page.locator(`button:has([data-import-filter=\"${value}\"])`)",
    "page.locator(`[data-import-row=\"${rowNumber}\"]`).filter({ visible: true })",
    'await expect(stat(IMPORT_WORDS.statRows)).toHaveText("3")',
    'await expect(stat(IMPORT_WORDS.statReady)).toHaveText("1")',
    'await expect(stat(IMPORT_WORDS.statErrors)).toHaveText("2")',
    "fillTemplate(IMPORT_WORDS.usedBy, { tag: holder.assetTag })",
    'toHaveAttribute("href", `/th/assets/${holder.id}`)',
    "fillTemplate(IMPORT_WORDS.confirm, { count: 1 })",
    "fillTemplate(IMPORT_WORDS.doneSummary, { imported: 1, skipped: 2 })",
    "fillTemplate(IMPORT_WORDS.historyCounts, { imported: 1, total: 3, skipped: 2 })",
    'page.getByRole("heading", { level: 3, name: fileName, exact: true })',
    "await page.waitForURL((url) => url.pathname === `/th/assets/${imported.id}`)",
  ]) assert.ok(spec.includes(hook), hook)
  assert.ok(spec.includes('await record(measure, "import, the file checked (review)", testInfo)'))
  assert.ok(spec.includes('await record(measure, "import, done", testInfo)'))
  // The viewer: the export card and its count line (never a fixed number: dev grows), no dropzone, no template, no
  // confirm, and both import routes refused.
  assert.ok(spec.includes('templatePattern(IMPORT_WORDS.exportAllCount, { count: "[\\\\d,]+" })'))
  assert.ok(spec.includes("await expect(main.locator('input[type=\"file\"]')).toHaveCount(0)"))
  assert.ok(spec.includes('await expectRefused(page.request, VIEWER_API_REFUSALS.filter((refusal) => refusal.file.startsWith("assets/import-")))'))

  // The hooks the spec stands on are the app's.
  const panel = read("src/components/assets/asset-import-preview-panel.tsx")
  for (const hook of [
    'id="asset-import-file"',
    '<span data-import-filter="error">',
    '<span data-import-filter="ready">',
    '<span data-import-filter="all">',
    "data-import-row={row.rowNumber}",
    't("importPage.confirm", { count: preview.summary.readyRows })',
    'section aria-labelledby="asset-import-result-title"',
    "<Link href={`/${locale}/assets/${asset.id}`}",
  ]) assert.ok(panel.includes(hook), hook)
  assert.equal(panel.split("data-import-row={row.rowNumber}").length - 1, 2, "the desktop row and the phone row")
  assert.ok(read("src/components/ui/file-dropzone.tsx").includes("id={inputId}"))
  assert.ok(read("src/components/ui/segmented.tsx").includes("aria-pressed={pressed}"))
  const importExportPage = read("src/app/[locale]/(dashboard)/asset-management/import-export/page.tsx")
  assert.ok(importExportPage.includes('href="/api/assets/export"'))
  assert.ok(importExportPage.includes("{batch.fileName}</h3>"))
  for (const route of ["import-preview", "import-confirm"]) assert.ok(read(`src/app/api/assets/${route}/route.ts`).includes('requirePermission(user, "asset", "create")'), route)
})

// Group 4 plan 6 Task 7 (spec §11, §17; P6-R1, P6-R3, P6-R9, P6-R10; call 19): the labels spec reads the app's own
// words, adds three run assets of its own from the run room's queue, checks the add-all line by its relation (never a
// pinned count: the run room grows, critic §5.1), prints them on the desktop through the popup's URL opened in the
// measured page with window.print stubbed, and finds them under เคยพิมพ์แล้ว; the phone checks its inline actions only.
// The viewer sees the page with the print actions enabled and prints nothing. The register's bulk correction spec follows
// its พิมพ์ป้าย to the labels page and reads the from-register line.
test("the labels spec adds three run assets from the run room's queue, prints them on the desktop and finds them printed; the viewer prints nothing (group 4 plan 6 task 7)", async () => {
  const { LABEL_WORDS } = await import("../e2e/assets/labels-words.ts")
  const th = JSON.parse(read("messages/th.json"))
  const shapes = new Set(values(th).map(shape))
  for (const [name, text] of Object.entries(LABEL_WORDS)) assert.ok(shapes.has(shape(text)), `${name}: "${text}" is a value of messages/th.json`)
  const labels = th.assetTools.labelsPage
  assert.deepEqual(
    [LABEL_WORDS.title, LABEL_WORDS.queueModeLabel, LABEL_WORDS.filtersLabel, LABEL_WORDS.filterLocation, LABEL_WORDS.filterSort, LABEL_WORDS.sortNewest, LABEL_WORDS.locationSearch],
    [labels.title, labels.queueModeLabel, labels.filtersLabel, labels.filter.location, labels.filter.sort, labels.sort.newest, labels.locationSearchPlaceholder],
  )
  assert.deepEqual(
    [LABEL_WORDS.addAllSummary, LABEL_WORDS.addAll, LABEL_WORDS.addSome, LABEL_WORDS.addFirst100, LABEL_WORDS.addRemaining, LABEL_WORDS.rowListed, LABEL_WORDS.badgePrinted, LABEL_WORDS.queueEmpty],
    [labels.addAllSummary, labels.addAll, labels.addSome, labels.addFirst100, labels.addRemaining, labels.rowListed, labels.badgePrinted, labels.queueEmpty],
  )
  assert.deepEqual(
    [LABEL_WORDS.listTitle, LABEL_WORDS.listCount, LABEL_WORDS.listEmpty, LABEL_WORDS.fromRegister, LABEL_WORDS.note, LABEL_WORDS.previewName, LABEL_WORDS.barSummary, LABEL_WORDS.testPrint, LABEL_WORDS.print],
    [labels.listTitle, labels.listCount, labels.listEmpty, labels.fromRegister, labels.note, labels.previewName, labels.barSummary, labels.testPrint, labels.print],
  )
  assert.deepEqual(
    [LABEL_WORDS.printRouteTitle, LABEL_WORDS.printRouteButton, LABEL_WORDS.printRecorded],
    [th.asset.printLabelsTitle, th.asset.printLabel, th.asset.labelPrintRecorded],
  )

  const spec = read("e2e/assets/labels.spec.ts")
  assert.ok(spec.includes(`from "../support/fixtures.ts"`) && !spec.includes(`from "@playwright/test"`), "the suite's fixtures")
  const lines = spec.split("\n").map((line) => line.trim())
  assert.ok(lines.includes(`asUser("itStaff")`) && lines.includes(`asUser("viewer")`), "IT staff print; the viewer looks")
  // All four projects: the phone takes its own branch, never a skip.
  assert.ok(!spec.includes("test.skip("), "all four projects")
  assert.ok(spec.includes('if (e2eDevice === "desktop") {'), "the print path is the desktop's")
  // Three run-marked assets of its own in the run room; no master data, no sign-in, nothing deleted, no settings save.
  for (const key of ["LB1", "LB2", "LB3"]) assert.ok(spec.includes(`await createTxAsset(page, masters, testInfo.project.name, "${key}", `), key)
  assert.doesNotMatch(spec, /\/api\/(?:locations|departments|employees|admin|companies|branches|categories)|createRoom\(|signInOnce\(|request\.delete|DELETE/)
  // The run room through the room chip's search; the queue's own answers awaited; nothing left in flight on leaving.
  for (const hook of [
    "const { location: runRoom } = runRecords(runId)",
    'url.searchParams.get("locationId") === readRunData().locationId',
    'await popover.getByRole("combobox", { name: LABEL_WORDS.locationSearch, exact: true }).fill(runRoom.code)',
    'await popover.getByRole("option", { name: `${runRoom.code} - ${runRoom.name}` }).click()',
    "fillTemplate(CHIP, { label: LABEL_WORDS.filterLocation, value: runRoom.name })",
    'await page.getByRole("menuitemradio", { name: LABEL_WORDS.sortNewest, exact: true }).click()',
    "await queueRequests.idle()",
    // A chip by its role and name (E2E-1103A: Radix's trigger replaced the part's data-slot, so no chip was found).
    '.getByRole("button", { name: new RegExp(`^${escapeRegExp(label)}: `) })',
    // On arrival axe waits for the queue's answer and the add-all button's fade from waiting to ready (E2E-1103A:
    // color-contrast on the button read half way through its transition-colors).
    "await expect(page.getByText(LABEL_WORDS.queueLoading, { exact: true })).toHaveCount(0)",
  ]) assert.ok(spec.includes(hook), hook)
  assert.equal(LABEL_WORDS.queueLoading, labels.queueLoading)
  // Past 100 matches the add-all line names the first 100 (final review); the spec reads either wording.
  assert.equal(LABEL_WORDS.addAllSummaryFirst100, labels.addAllSummaryFirst100)
  assert.ok(spec.includes("page.getByText(ADD_ALL_LINE).or(page.getByText(ADD_ALL_LINE_FIRST_100))"))
  assert.ok(!spec.includes('[data-slot="filter-menu-chip"]'), "the chip is found by role, not by a slot the trigger may replace")
  // openLabels navigates, awaits the first page, then records (settled), so axe never reads the button mid-fade.
  assert.match(spec, /async function openLabels[^]*?await page\.goto\(LABELS_PATH[^]*?await firstPage[^]*?queueLoading[^]*?await record\(measure, label, testInfo\)[^]*?\n\}/)
  // The add-all line by its relation (P6-R3, critic §5.1): a is read from the page, never pinned.
  for (const hook of [
    'expect(line.c, "c = min(a, 100) − b").toBe(Math.min(line.a, 100) - line.b)',
    "expect(before.b).toBe(0)",
    "expect(after.b).toBe(3)",
  ]) assert.ok(spec.includes(hook), hook)
  assert.doesNotMatch(spec, /addAllSummary, \{ matched: \d/, "a is never pinned")
  // The three added by their rows, the numbered list in that order, the preview's tag.
  for (const hook of [
    'page.locator(`[data-label-queue-row="${asset.id}"]`)',
    "fillTemplate(LABEL_WORDS.rowListed, { name: asset.name })",
    'page.getByRole("list", { name: LABEL_WORDS.listTitle, exact: true })',
    '.locator("[data-label-selected-row]")',
    "toHaveText(`${index + 1}${asset.name}${asset.assetTag}`)",
    'templatePattern(LABEL_WORDS.previewName, { size: "[^]+?", tag: escapeRegExp(lb1.assetTag) })',
  ]) assert.ok(spec.includes(hook), hook)
  // The desktop: the bar's print opens the popup; its URL carries the ids in the query and tape and note in the hash
  // (P6-R9); the popup is closed and its URL opened in the measured page, where window.print is stubbed, the print
  // records 3 and the page says so; the queue's เคยพิมพ์แล้ว lists the three.
  for (const hook of [
    "const BAR = '[data-slot=\"desktop-selection-bar\"]'",
    'const popupOpened = page.context().waitForEvent("page")',
    "await popup.close()",
    'expect(printUrl.searchParams.getAll("id")).toEqual(assets.map((asset) => asset.id))',
    'expect(hash.get("note")).toBe(note)',
    "window.print = () => {",
    'response.request().method() === "POST" && new URL(response.url()).pathname === LABEL_PRINTS_PATH',
    "expect(await (await recorded).json()).toMatchObject({ assetCount: 3 })",
    "await expect.poll(() => page.evaluate(() => (window as Window & { __e2ePrints?: number }).__e2ePrints)).toBe(1)",
    "page.locator('button:has([data-label-mode=\"printed\"])').filter({ visible: true })",
  ]) assert.ok(spec.includes(hook), hook)
  // Axe (the measure fixture) on the labels page with the list filled and on the print route, in each project's theme.
  for (const label of ["labels, three listed with the preview", "the print route, recorded", "labels, the three under เคยพิมพ์แล้ว"]) assert.ok(spec.includes(`"${label}", testInfo)`), label)
  // The viewer: the print actions enabled once a row is listed, and no print recorded.
  assert.ok(spec.includes('expect(posted, "the viewer records no print").toBe(0)'))

  // The hooks the spec stands on are the app's.
  const queue = read("src/components/assets/asset-label-queue.tsx")
  for (const hook of ['"data-label-queue-row": row.id', "label: <span data-label-mode={mode}>", 'role="group" aria-label={t("filtersLabel")}', "aria-describedby={`${metaId} ${stateId}`}"]) assert.ok(queue.includes(hook), hook)
  const list = read("src/components/assets/asset-label-print-list.tsx")
  for (const hook of ["data-label-selected-row={asset.id}", '<ol aria-label={t("listTitle")}', 'label={t("previewName", { size: tapeText, tag: sheetAsset.assetTag })}', '{t("print", { count })}']) assert.ok(list.includes(hook), hook)
  assert.ok(read("src/components/assets/asset-label-sheet.tsx").includes('role={label ? "group" : undefined}'))
  assert.ok(read("src/components/ui/filter-menu-chip.tsx").includes('<PopoverContent align="start" aria-label={label}'))
  assert.ok(read("src/components/ui/desktop-selection-bar.tsx").includes('data-slot="desktop-selection-bar"'))
  assert.ok(read("src/components/assets/asset-label-batch-tool.tsx").includes('window.open(buildLabelPrintUrl({ locale, ids, tapeSize, note: printNote }), "_blank", "noopener,noreferrer")'))
  const print = read("src/components/assets/asset-label-print.tsx")
  for (const hook of ['id="asset-label-print-reason"', 'fetch("/api/assets/label-prints", {', "window.print()"]) assert.ok(print.includes(hook), hook)
  assert.ok(read("src/app/api/assets/label-prints/route.ts").includes("assetCount: orderedAssets.length,"))

  // The register's พิมพ์ป้าย opens the labels page in the same tab with the from-register line (P6-R1).
  const correction = read("e2e/assets/register-bulk-correction.spec.ts")
  for (const hook of [
    'import { LABEL_WORDS } from "./labels-words.ts"',
    'await bar.getByRole("button", { name: fillTemplate(REGISTER_WORDS.printLabelsCount, { count: 2 }), exact: true }).click()',
    'url.pathname === "/th/asset-management/labels" && url.searchParams.get("from") === "register"',
    "fillTemplate(LABEL_WORDS.fromRegister, { count: 2 })",
    'await expect(page.locator("[data-label-selected-row]")).toHaveCount(2)',
  ]) assert.ok(correction.includes(hook), hook)
})

// E2E-1103C: a createTxAsset key is a tag's last part (`${runId}-${projectCode}-${key}`), so two specs with one key
// clash in the same run and project ("Asset tag already exists"). Every literal key of the suite is one spec's own.
test("every createTxAsset key of the suite belongs to one call, so no two specs make the same tag (E2E-1103C)", () => {
  const seen = new Map<string, string>()
  for (const file of suiteFiles("e2e").filter((name) => name.endsWith(".ts") && !name.includes("/.state/"))) {
    for (const match of read(file).matchAll(/createTxAsset\([^,]+,[^,]+,[^,]+,\s*"([A-Z0-9]+)"/g)) {
      const key = match[1]
      assert.ok(!seen.has(key), `the key ${key} is in ${seen.get(key)} and ${file}`)
      seen.set(key, file)
    }
  }
  assert.equal(seen.get("SCN1"), "e2e/assets/scan-search.spec.ts")
  assert.equal(seen.get("SC1"), "e2e/transactions/findings.spec.ts")
})
