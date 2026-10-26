import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const page = () => read("src/app/[locale]/(dashboard)/assets/[id]/page.tsx")
const DETAIL = "src/components/assets/detail/"
const part = (name: string) => read(`${DETAIL}${name}.tsx`)

test("the page composes the parts and reads the frame in one round of parallel queries (spec §5 Performance, §7)", () => {
  const source = page()
  assert.match(source, /const registerParams = parseRegisterReturnTo\(rawSearchParams\.returnTo, locale\)/)
  assert.match(source, /const \{ view: assetDetailView, historyType \} = resolveAssetDetailView\(rawSearchParams\.view\)/)
  // Task 7 counts the tabs in the first round (detailCounts); the QR setting read is gone.
  assert.match(source, /const \[rawAsset, readyStatus, detailCounts\] = await withPerformanceTiming\(\s*"asset-detail\.initial-data",/)
  assert.match(source, /"asset-detail\.frame-data",\s*\(\) => Promise\.all\(\[\s*getAssetDetailFrame\(asset\.id\),\s*registerParams \? getAssetNeighbours\(registerParams, asset\.id\) : Promise\.resolve\(null\),\s*assetDetailView === "overview" \? getLatestAssetHistory\(asset\.id, locale, 3\) : Promise\.resolve\(null\),\s*\]\)/)
  assert.equal(source.match(/getAssetDetailCounts\(/g)?.length, 1, "the tab counts are read once, in Task 7's round")
  for (const name of ["AssetDetailHeader", "AssetDetailActions", "AssetDetailFactStrip", "AssetOverview"]) assert.match(source, new RegExp(`<${name}\\b`), name)
  assert.match(source, /className=\{assetDetailView === "overview" \? undefined : "max-md:hidden"\}/, "the strip on every desktop tab, on the phone's overview only (§7.4, R19)")
  assert.ok(source.indexOf("<AssetDetailTabs") < source.indexOf("<AssetDetailFactStrip"), "the strip sits under the tabs")
  assert.doesNotMatch(source, /AssetQrCode|buildAssetQrValue|assetQrPublicBaseUrlKey|AssetComponentContextBanner|AssetDetailActionMenu|SidebarPhotoCard|ActivitySummaryPanel|getOwnershipLifecycle|QuickAction|healthFixHref|evidenceDrawerItems|activityDrawerItems/)
})

test("the actions: the shared rule's primary and pinned บันทึกซ่อม, อื่น ๆ in the spec's order, the phone bar with its more slot (spec §7.1, §7.8)", () => {
  const source = page()
  // R1: the rule asks isLegacyReturnEligible and getCheckinHandoverStatusError itself from these two fields.
  assert.match(source, /custodianId: asset\.custodianId,\s*openCheckoutId: frame\.openCheckout\?\.id \?\? null,\s*openCheckoutHandoverMode: frame\.openCheckout\?\.handoverMode \?\? null,/)
  assert.match(source, /can: \{ assetEdit: canEditAsset, maintenanceCreate: canCreateMaintenance, maintenanceView: canViewMaintenance, disposalView: canViewDisposal \},/)
  assert.match(source, /const assetActions = getAssetActions\(actionInput\)/)
  assert.match(source, /const recordRepairAction = assetActions\.primary\?\.key === "recordRepair" \? null : getAssetRecordRepairAction\(actionInput\)/, "Task 1's one repair rule, never beside a primary that already says บันทึกซ่อม (R4)")
  assert.match(source, /recordRepair: isAssetScanReturn && recordRepair \? \{ label: recordRepair\.label, href: recordRepair\.href \} : null,/, "from the scan page บันทึกซ่อม moves into the sheet (R21)")
  assert.doesNotMatch(source, /isLegacyReturnEligible|legacyReturnEligible|canPinRepairRecord/)
  assert.match(source, /getDisposalRequestOffer\(\{ canCreate: canCreateDisposal, status: asset\.status, openDisposalId: frame\.openDisposalId, blockers: frame\.disposalBlockers \}\)/)
  assert.match(source, /reason: disposalOffer\.blocker \? tDisposal\(`readinessBlockers\.\$\{disposalOffer\.blocker\}`\) : null/)
  assert.match(source, /statusCorrection=\{statusCorrection\}/)
  const actions = part("asset-detail-actions")
  assert.match(actions, /^"use client"/)
  const desktop = actions.slice(actions.indexOf('<div className="hidden md:flex'), actions.indexOf("<ActionBar"))
  const order = ["<DropdownMenu", "{printLabel.label}", "{recordRepair.label}", "{primary.label}"].map((text) => desktop.indexOf(text))
  assert.ok(order.every((at, index) => at > -1 && (index === 0 || at > order[index - 1])), `DESIGN order: อื่น ๆ, the pinned links, the primary last (${order.join()})`)
  assert.match(desktop, /\{desktopGroups\.length > 0 \? \(/, "no อื่น ๆ when it would be empty (the viewer)")
  assert.match(desktop, /<DropdownMenuItem key=\{item\.key\} unavailable data-asset-action=\{item\.key\}>\s*<DropdownMenuItemText>\s*\{item\.label\}\s*<DropdownMenuItemDescription>\{item\.reason\}<\/DropdownMenuItemDescription>/)
  // R20, R21: everyone gets the bar (the viewer's holds only การดำเนินการอื่น, whose sheet has พิมพ์ป้าย); the sheet is titled with the code and name.
  assert.match(actions, /<ActionBar\s+label=\{tCommon\("actions"\)\}\s+actions=\{barActions\}\s+more=\{\{ label: t\("moreActions"\), code: asset\.assetTag, name: asset\.name, groups: phoneGroups, openerRef: moreTriggerRef \}\}\s*\/>/)
  assert.match(actions, /\.\.\.\(scanNext \? \[\{ \.\.\.scanNext, icon: <ScanLine className="h-4 w-4" \/>, primary: true \}\] : \[\]\),\s*\.\.\.\(primary \? \[\{ \.\.\.primary, primary: !scanNext \}\] : \[\]\),\s*\.\.\.\(recordRepair && !scanNext \? \[\{ \.\.\.recordRepair, icon: <Wrench className="h-4 w-4" \/> \}\] : \[\]\),/, "the rule's primary (wide) and บันทึกซ่อม; from the scan page สแกนรายการถัดไป (wide) and the primary (§7.8, R21)")
  assert.doesNotMatch(actions, /barActions\.length > 0|disabled[=:]|aria-disabled|fixed inset-0/)
})

test("the header: the trail with the search crumb as text, previous / next keeping returnTo, no edit button (spec §7.2; R8, R10)", () => {
  const source = page()
  assert.match(source, /const crumb = registerParams \? buildRegisterCrumbLabel\(registerParams\) : null/)
  assert.match(source, /crumbLabel=\{crumb \? \(crumb\.kind === "search" \? t\("registerCrumbSearch", \{ search: crumb\.text \}\) : t\("registerCrumbFilters"\)\) : null\}/)
  assert.match(source, /position: neighbours\.index,/, "Task 2's index is the 1-based position (R8)")
  assert.match(source, /previousHref: neighbours\.previousId \? appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(neighbours\.previousId\)\}`, returnToHref\) : null,/)
  assert.match(source, /nextHref: neighbours\.nextId \? appendReturnTo\(`\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(neighbours\.nextId\)\}`, returnToHref\) : null,/)
  const header = part("asset-detail-header")
  assert.match(header, /<nav aria-label=\{t\("neighbourNav"\)\}/)
  assert.match(header, /aria-label=\{t\("neighbourPrevious"\)\}[^>]*className=\{cn\(buttonVariants\(\{ variant: "outline", size: "icon" \}\), "max-md:hidden"\)\}/, "the phone shows only next (B-AssetDetail-Phone)")
  assert.match(header, /aria-label=\{t\("neighbourNext"\)\}/)
  assert.match(header, /<span aria-hidden="true" className="num px-1 text-meta text-muted-foreground">\{t\("neighbourPosition", \{ position, total \}\)\}<\/span>\s*<span className="sr-only">\{t\("neighbourPositionLabel", \{ position, total \}\)\}<\/span>/)
  assert.match(header, /actions=\{\s*<>\s*\{neighbours \? <AssetNeighbourNav neighbours=\{neighbours\} \/> : null\}\s*\{actions\}\s*<\/>\s*\}/, "previous / next right after the back link")
  assert.doesNotMatch(header, /hidden md:inline-flex|ArrowLeft|aria-current/)
})

test("the fact strip: four facts, each linking onward only for those who may open the page (spec §7.4; R18, R19, R30, R32)", () => {
  const strip = part("asset-detail-fact-strip")
  assert.match(strip, /<FactStrip label=\{tAsset\("factStripLabel"\)\} items=\{\[holderItem, locationItem, auditItem, warrantyItem\]\} className=\{className\} \/>/)
  assert.match(strip, /tAsset\("noCustodian"\)/, "one word for no custodian (R32)")
  assert.match(strip, /tAsset\("location"\)/)
  assert.match(strip, /t\("managingDepartment"\)/)
  assert.match(strip, /t\("usingDepartment"\)/)
  assert.match(strip, /buildCustodianHref\(locale, holder\.employeeId, canViewEmployee\)/)
  assert.match(strip, /buildLocationRegisterHref\(locale, location\.id\)/)
  assert.match(strip, /t\("heldFor", \{ days: formatCount\(holder\.heldDays\) \}\)/)
  assert.match(strip, /<StatusBadge label=\{audit\.labelKey \? tAudit\(audit\.labelKey\) : audit\.result\} tone=\{audit\.tone\} \/>/, "a result is a badge: status colour lives in badges (DESIGN.md Where Color Lives)")
  assert.match(strip, /canViewAudit \? \(/)
  assert.match(strip, /purchaseEditHref \? \(/, "บันทึกข้อมูลการซื้อ only with asset:edit")
  assert.doesNotMatch(strip, /text-(?:success|warning|danger)\b|"-"/)
})

test("the overview: the photo first on the phone, ข้อมูลทรัพย์สิน with id overview, the latest three events, the components (spec §7.5)", () => {
  const overview = part("asset-overview")
  assert.match(overview, /<div className="grid grid-cols-1 gap-6 lg:grid-cols-12">\s*<div className="min-w-0 lg:col-span-4 lg:col-start-9 lg:row-start-1">/)
  assert.match(overview, /<div id="overview" className="min-w-0 scroll-mt-24 lg:col-span-8 lg:col-start-1 lg:row-start-1">/)
  // R26, R27, R47: Task 4's frame (previewable by default) in the board's 4:3 box, the model photo captioned with the app's one word.
  assert.match(overview, /<AssetPhotoFrame\s+attachmentId=\{photo\.attachmentId\}\s+alt=\{photo\.alt\}\s+label=\{photo\.isModelPhoto \? tAsset\("modelPhoto"\) : undefined\}\s+canUpload=\{canEdit\}\s+uploadHref=\{photo\.uploadHref\}\s+className="w-full max-lg:max-h-80 lg:aspect-\[4\/3\]"\s*\/>/, "below lg the natural height capped at 20rem; from lg the board's 4:3 box (look step fix 1)")
  assert.doesNotMatch(overview, /\/api\/attachments|<img\b|inline=1/, "the photo loads through the card-size thumbnail (§7.5)")
  assert.match(overview, /<StatusBadge label=\{details\.condition\.nameTh\} tone=\{getAssetStateTone\(details\.condition\.name\)\} \/>\s*<AssetStateHelpPopover \{\.\.\.conditionHelp\} \/>/)
  assert.match(overview, /\{ key: "remark", label: tAsset\("remark"\), value: details\.remark \}/)
  // R23: the reports' warranty link lands on the purchase rows; R31: the row is เอกสารจัดซื้อ.
  assert.match(overview, /<div id="purchase" className="scroll-mt-24">\s*<h3\b/)
  assert.match(overview, /label: tAsset\("purchaseDocuments"\)/)
  assert.match(overview, /href=\{details\.purchase\.documentsHref\}/, "each purchase document number links to the files tab's เอกสารจัดซื้อ")
  assert.match(overview, /<DataTable framed=\{false\} className="hidden md:block" caption=\{t\("recentTitle"\)\}>/)
  for (const column of ["date", "event", "detail", "document"]) assert.match(overview, new RegExp(`tAsset\\("history\\.columns\\.${column}"\\)`), column)
  assert.match(overview, /<ContentPanelRows className="md:hidden">/)
  assert.match(overview, /t\("recentAll", \{ count: formatCount\(recent\.total\) \}\)/)
  // R12: a document shows, linked, only to those who may open it; otherwise no link and no code (the dashboard's rule).
  assert.match(overview, /event\.document && documentAccess\[event\.document\.kind\] \? \(/)
  assert.doesNotMatch(overview, /as AssetMovementDocumentKind/)
  assert.match(overview, /tAll\(event\.labelKey\)/)
  // Every write control needs asset:edit; the viewer E2E (roles.spec.ts) finds none.
  assert.match(overview, /actions=\{canEdit \? \(\s*<Link href=\{editHref\}/)
  // R55 (spec §7.5): with no purchase facts, only asset:edit reads the prompt and เพิ่มข้อมูล; everyone else reads the empty rows.
  assert.match(overview, /\{purchaseRows\.length > 0 \|\| !canEdit \? \(\s*<KeyValueList items=\{purchaseRows\.length > 0 \? purchaseRows : emptyPurchaseRows\} \/>\s*\) : \(\s*<>\s*<EmptyNote>\{t\("purchaseEmpty"\)\}<\/EmptyNote>\s*<Link href=\{purchaseEditHref\}/)
  for (const key of ["purchasePrice", "purchaseDate", "supplier", "warrantyEnd"]) assert.match(overview, new RegExp(`\\{ key: "${key}", label: tAsset\\("${key}"\\), value: <Nil \\/> \\}`), key)
  assert.match(overview, /components\.manageHref \? \(/)
  assert.equal(overview.match(/<ContentPanel divided\b/g)?.length, 4)
  assert.equal(overview.match(/<KeyValueList\b/g)?.length, 4, "the facts in two lists (identity, then where and when), the specs and the purchase rows")
  // Look step fix 1: the facts sit in two lists side by side from xl, identity first.
  assert.match(overview, /<div className="grid gap-x-8 gap-y-2 xl:grid-cols-2">\s*<KeyValueList items=\{identityRows\} \/>\s*<KeyValueList items=\{placeRows\} \/>\s*<\/div>/)
  assert.match(overview, /const identityRows: KeyValueItem\[\] = \[\s*\{ key: "category"[\s\S]*?\{ key: "ownershipType"[^\n]*\n\s*\]\s*const placeRows: KeyValueItem\[\] = \[\s*\.\.\.\(details\.department/, "identity rows end at ประเภทการถือครอง; the place rows start at แผนก")
  assert.doesNotMatch(overview, /"-"|toLocaleString|text-(?:success|warning|danger)\b|border-dashed|bg-\w+-soft/)
})

test("ข้อมูลยังไม่ครบ: one quiet line on the overview, for asset:edit only, each gap a link to where it is fixed (R59)", () => {
  const source = page()
  assert.match(source, /const dataGaps = canEditAsset\s*\?\s*listAssetDataGaps\(\{/)
  assert.match(source, /missingChecklistCount: getMissingPhotoChecklistLabels\(photoChecklist, assetAttachments\)\.length,/)
  assert.match(source, /hasResponsibility: hasAssetResponsibility\(asset\),/)
  assert.match(source, /const dataGapHref = \(gap: AssetDataGap\) =>/)
  const overview = part("asset-overview")
  assert.match(overview, /\{dataGaps\.length > 0 \? \(\s*<Notice tone="neutral" data-slot="asset-data-gaps">/)
  assert.match(overview, /tAsset\("dataGapsTitle", \{ count: formatCount\(dataGaps\.length\) \}\)/)
  assert.match(overview, /<Link href=\{gap\.href\} className=\{linkVariants\(\{ size: "inherit" \}\)\}>\{gap\.label\}<\/Link>/)
  const th = JSON.parse(read("messages/th.json")), en = JSON.parse(read("messages/en.json"))
  assert.deepEqual([th.asset.dataGapsTitle, th.asset.dataGapWarranty, th.asset.dataGapLicenseExpiry], ["ข้อมูลยังไม่ครบ {count} รายการ:", "วันหมดประกัน", "วันหมดอายุ License"])
  assert.deepEqual([en.asset.dataGapsTitle, en.asset.dataGapWarranty, en.asset.dataGapLicenseExpiry], ["Missing details ({count}):", "Warranty end date", "License expiry date"])
  // The rule's other labels are the app's own words (Task 8B), kept on purpose.
  assert.equal(th.asset.dataHealthChecklistMissing, "รูปที่ต้องถ่ายขาด {count} รายการ")
  assert.equal(typeof th.asset.primaryAssetPhoto, "string")
})

test("the edit form holds the purchase anchor the strip and the prompt open (spec §7.4)", () => {
  assert.match(read("src/components/assets/asset-form.tsx"), /<div id="purchase" className="scroll-mt-24">\s*<Section title=\{t\("purchaseWarranty"\)\}>/)
  assert.match(page(), /const purchaseEditHref = `\$\{editHref\}#purchase`/)
})

test("ข้อมูลทรัพย์สิน links the files tab's เอกสารจัดซื้อ (group 1 asset detail task 11)", () => {
  const source = page()
  assert.match(source, /documentsHref: sectionHref\("purchase-documents"\)/)
})

test("the words of the asset page (spec §7, docs/19_THAI_GLOSSARY.md; R10, R19, R27, R30-R33)", () => {
  const th = JSON.parse(read("messages/th.json")), en = JSON.parse(read("messages/en.json"))
  const thai: Record<string, string> = {
    backToResults: "กลับไปผลค้นหา", neighbourPrevious: "รายการก่อนหน้า", neighbourNext: "รายการถัดไป", more: "อื่น ๆ", moreActions: "การดำเนินการอื่น",
    cancelLatest: "ยกเลิกรายการล่าสุด", requestDisposal: "ขอตัดจำหน่าย", managingDepartment: "แผนกที่ดูแล", usingDepartment: "แผนกที่ใช้",
    componentOf: "เป็นส่วนควบของ", seats: "ที่นั่ง", heldFor: "ถือมาแล้ว {days} วัน", lastAudit: "ตรวจนับล่าสุด", auditNever: "ยังไม่เคยตรวจนับ", warrantyUntil: "ถึง {date}",
    warrantyEnded: "หมดแล้วเมื่อ {date}", warrantyUnknown: "ไม่ทราบ", addPurchaseDetails: "บันทึกข้อมูลการซื้อ", detailsTitle: "ข้อมูลทรัพย์สิน",
    ownerCompany: "บริษัทเจ้าของรหัส", brandModel: "ยี่ห้อ / รุ่น", latestHandover: "ใบส่งมอบล่าสุด", purchaseEmpty: "ยังไม่มีข้อมูลการซื้อ: ราคา ผู้ขาย วันหมดประกัน",
    purchaseAdd: "เพิ่มข้อมูล", photoTitle: "รูป", recentTitle: "ความเคลื่อนไหวล่าสุด", recentAll: "ดูประวัติทั้งหมด {count} รายการ",
    componentsTitle: "อุปกรณ์ส่วนควบ", componentsManage: "จัดการ", componentsEmpty: "ไม่มีส่วนควบ",
  }
  for (const [key, value] of Object.entries(thai)) assert.equal(th.assetDetail[key], value, `th assetDetail.${key}`)
  for (const key of Object.keys(th.assetDetail)) assert.equal(typeof en.assetDetail[key], "string", `en assetDetail.${key}`)
  for (const key of ["crumbSearch", "crumbFilters", "factsLabel", "noCustodianYet", "location", "purchaseDocumentsRow", "modelPhotoLabel", "columnDate"]) assert.equal(th.assetDetail[key], undefined, `assetDetail.${key}: one word for one thing`)
  assert.equal(th.asset.registerCrumbSearch, 'ผลค้นหา "{search}"')
  assert.equal(en.asset.registerCrumbSearch, 'Search results for "{search}"')
  assert.deepEqual([th.asset.registerCrumbFilters, en.asset.registerCrumbFilters], ["ผลการกรอง", "Filtered results"])
  assert.deepEqual([th.asset.factStripLabel, en.asset.factStripLabel], ["ข้อมูลสำคัญของทรัพย์สิน", "Key facts"])
  assert.deepEqual([th.asset.history.columns.date, en.asset.history.columns.date], ["วันที่", "Date"])
  assert.equal(th.asset.noCustodian, "ไม่มีผู้ถือครอง")
  assert.equal(th.asset.modelPhoto, "รูปประจำรุ่น")
  assert.equal(th.asset.purchaseDocuments, "เอกสารจัดซื้อ")
  assert.equal(th.asset.quickMaintenance, "บันทึกซ่อม", "the pinned repair link's name (repair-record.spec.ts:102)")
  for (const key of ["activitySummaryTitle", "dataHealthTitle", "quickActions", "quickCheckout", "quickAudit", "lifecyclePersonalTitle", "qrCode", "qrCodeTitle", "detailMoreActions", "componentContextTitle"]) assert.equal(th.asset[key], undefined, `asset.${key} is gone`)
  for (const key of ["quickIssueFromStock", "quickMoveStock", "quickAssignLicense"]) assert.equal(typeof th.asset[key], "string", `asset.${key}: the shared rule reads it (R2)`)
  assert.equal(typeof th.asset.activityIdle180d, "string", "the register's idle filter keeps its word")
})

test("the skeleton has the page's shape: the trail and the identity line, five tabs, the four facts, the 8 + 4 grid (DESIGN.md Loading skeletons)", () => {
  const source = read("src/components/ui/page-skeleton.tsx")
  const detail = source.slice(source.indexOf("export function AssetDetailPageSkeleton()"), source.indexOf("export function ReportsPageSkeleton()"))
  assert.match(detail, /<PageHeaderSkeleton crumbs meta="identity" \/>/)
  assert.match(detail, /<TabNavSkeleton count=\{5\} \/>/)
  assert.match(detail, /<MetricGridSkeleton count=\{4\} foot \/>/)
  assert.deepEqual([...detail.matchAll(/<DividedPanelSkeleton rows=\{(\d+)\} className="([^"]+)" \/>/g)].map((match) => `${match[1]} ${match[2]}`), [
    "2 lg:col-span-4 lg:col-start-9 lg:row-start-1",
    "6 lg:col-span-8 lg:col-start-1 lg:row-start-1",
    "3 lg:col-span-8",
    "3 lg:col-span-4",
  ])
  assert.doesNotMatch(detail, /280px|count=\{6\}|meta="badges"/)
  assert.match(source, /meta\?: "text" \| "identity" \| "none"/)
  assert.ok(!existsSync("src/components/assets/asset-detail-action-menu.tsx"))
})
