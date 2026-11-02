import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

test("component manager accepts a return path to its own asset detail or to the register", () => {
  const source = readFileSync("src/lib/asset-return-navigation.ts", "utf8")

  assert.match(source, /normalizeAssetComponentManagerReturnTo/)
  assert.match(source, /const allowedPath = `\/\$\{locale\}\/assets\/\$\{encodeURIComponent\(assetId\)\}`/)
  assert.match(source, /const fallback = `\$\{allowedPath\}\?view=components`/)
})

test("component candidate route avoids database lookup below two characters", () => {
  const source = readFileSync("src/app/api/assets/component-candidates/route.ts", "utf8")

  assert.match(source, /if \(search\.length < 2\) return NextResponse\.json\(\{ data: \[\] \}\)/)
})

test("component manager provides scan, review, and integrated removal evidence", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx", "utf8")
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.match(page, /requirePagePermission\(locale, "asset", "view"\)/)
  assert.match(page, /hasPermission\(user, "asset", "edit"\)/)
  assert.match(page, /normalizeAssetComponentManagerReturnTo/)
  assert.match(manager, /ScannerTextInput/)
  assert.match(manager, /type InstallStep = "identify" \| "details" \| "review"/)
  assert.match(manager, /componentSearch\.trim\(\)\.length >= 2/)
  assert.match(manager, /installEvidence/)
  assert.match(manager, /removeEvidence/)
  assert.match(manager, /\/api\/assets\/\$\{assetId\}\/components/)
  assert.match(manager, /canEdit/)
})

test("component manager derives hidden search and reset state without synchronous effect updates", () => {
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.doesNotMatch(manager, /if \(!canSearchCandidates\) \{\s*setCandidates\(\[\]\)/)
  assert.doesNotMatch(manager, /if \(!component\) \{\s*setReason\(""\)/)
  assert.match(manager, /key=\{removeTarget\?\.id \?\? "closed"\}/)
})

test("component manager progressively reveals bounded history", () => {
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.match(manager, /historyVisibleCount/)
  assert.match(manager, /componentHistory\.slice\(0, historyVisibleCount\)/)
  assert.match(manager, /setHistoryVisibleCount\(\(current\) => current \+ 10\)/)
})

test("component manager confirms a completed install before offering the next component", () => {
  const manager = readFileSync("src/components/assets/asset-component-manager.tsx", "utf8")

  assert.match(manager, /lastInstalledAssetTag/)
  assert.match(manager, /setLastInstalledAssetTag\(selectedComponent\.assetTag\)/)
  assert.match(manager, /\{labels\.addAnother\}/)
})

test("component manager uses the shared asset scan messages for scanner controls", () => {
  const page = readFileSync("src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx", "utf8")

  assert.match(page, /getTranslations\("assetTools"\)/)
  assert.match(page, /start: tAssetTools\("scannerStart"\)/)
  assert.match(page, /zoomCamera: tAssetTools\.raw\("zoomCamera"\)/)
  assert.doesNotMatch(page, /start: t\("scannerStart"\)/)
})

// Group 4 plan 4 Task 3 (spec §12, P4-R3..R6, R8): the components page.
const readText = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const MANAGER = "src/components/assets/asset-component-manager.tsx"
const PAGE = "src/app/[locale]/(dashboard)/assets/[id]/components/page.tsx"
const assetWords = (locale: "th" | "en") => JSON.parse(readText(`messages/${locale}.json`)).asset

test("the header names the parent, its tag, holder and room; an editor's primary ติดตั้งส่วนควบ opens the closed install panel and moves focus into it", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /<span className="min-w-0 break-words">\{header\.name\}<\/span>\n\s+<span className="tag">\{header\.assetTag\}<\/span>\n\s+<span>\{holderText\}<\/span>\n\s+\{header\.room \? <span>\{header\.room\}<\/span> : null\}/)
  assert.match(manager, /header\.holder\.kind === "holder" \? `\$\{t\("custodian"\)\} \$\{header\.holder\.name\}` : header\.holder\.kind === "shared" \? t\("holderShared"\) : t\("noCustodian"\)/)
  assert.match(manager, /const \[installOpen, setInstallOpen\] = useState\(false\)/)
  assert.match(manager, /actions=\{\n\s+canEdit \? \(\n\s+<Button ref=\{installButtonRef\} size="md" aria-expanded=\{installOpen\} aria-controls="component-install" onClick=\{openInstall\}>\n\s+<PackagePlus aria-hidden="true" \/>\n\s+\{t\("componentInstallAction"\)\}/)
  assert.match(manager, /\{canEdit && installOpen \? \(\n\s+<div id="component-install" ref=\{installPanelRef\} tabIndex=\{-1\} className="scroll-mt-24 focus-visible:outline-none">/)
  assert.match(manager, /focusInstallPendingRef\.current = true\n\s+setInstallOpen\(true\)/)
  assert.match(manager, /\(document\.getElementById\(INSTALL_SEARCH_ID\) \?\? installPanelRef\.current\)\?\.focus\(\)/)
  assert.match(manager, /<ContentPanel title=\{t\("componentInstallPanelStep", \{ step: installStepOrder\.indexOf\(installStep\) \+ 1, total: installStepOrder\.length \}\)\} description=\{labels\.candidateHelp\}>/)
  // Cancel closes it and gives focus back to the header button.
  assert.match(manager, /function closeInstall\(\) \{\n\s+resetInstallFlow\(\)\n\s+setLastInstalledAssetTag\(null\)\n\s+setInstallOpen\(false\)\n\s+installButtonRef\.current\?\.focus\(\)/)
  // The map sits under the header, before the panel (P4-R3: the map as it is, no menu slot).
  assert.ok(manager.indexOf("{relationshipMap}") > manager.indexOf("<PageHeader") && manager.indexOf("{relationshipMap}") < manager.indexOf('<div id="component-install"'))
  const th = assetWords("th")
  assert.equal(th.componentInstallAction, "ติดตั้งส่วนควบ")
  assert.equal(th.componentInstallPanelStep, "ติดตั้งส่วนควบ ขั้น {step, number} จาก {total, number}")
})

test("the role is a NativeSelect of the 8 stored values with Thai labels; any other stored text shows as stored (P4-R4)", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /<NativeSelect\n\s+value=\{componentRole\}/)
  assert.match(manager, /<option value="">\{t\("componentRoleChoose"\)\}<\/option>\n\s+\{COMPONENT_ROLE_VALUES\.map\(\(role\) => \(\n\s+<option key=\{role\} value=\{role\}>\n\s+\{roleText\(role\)\}/)
  assert.match(manager, /const roleText = \(stored: string\) => \{\n\s+const key = componentRoleLabelKey\(stored\)\n\s+return key \? t\(key\) : stored\n\s+\}/)
  assert.doesNotMatch(manager, /<datalist|component-role-suggestions|const componentRoles = /)
  assert.match(manager, /\{ key: "role", label: labels\.componentRole, value: componentRole \? roleText\(componentRole\) : null \}/)
  const th = assetWords("th")
  const en = assetWords("en")
  assert.deepEqual(th.componentRoles, { ram: "หน่วยความจำ (RAM)", ssd: "SSD", hdd: "HDD", powerSupply: "แหล่งจ่ายไฟ", networkCard: "การ์ดเครือข่าย", monitor: "จอภาพ", adapter: "อะแดปเตอร์", other: "อื่น ๆ" })
  assert.deepEqual(Object.keys(en.componentRoles), Object.keys(th.componentRoles))
  // The asset page's components tab shows the same labels, through its pinned roleWithSlot shape.
  const tab = readText("src/components/assets/detail/asset-components-tab.tsx")
  assert.match(tab, /const shown = \{ \.\.\.item, role: roleText\(item\.role\) \}/)
  assert.match(tab, /t\("componentsTab\.roleWithSlot", \{ role: shown\.role, slot: shown\.slotNo \}\)/)
})

test("a candidate reads name first, then tag · S/N · ยังไม่ได้ติดตั้ง, and when it was linked here before เคยติดตั้งกับเครื่องนี้ · ถอดออก <date> (P4-R5)", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /lastRemovalHere\?: \{ removedAt: string \} \| null/)
  assert.match(manager, /<span className="block text-sm font-medium text-foreground">\{candidate\.name\}<\/span>\n\s+<span className="mt-0\.5 block text-meta text-muted-foreground">\n\s+<span className="tag font-medium">\{candidate\.assetTag\}<\/span>\n\s+\{candidate\.serialNumber \? ` · S\/N \$\{candidate\.serialNumber\}` : null\} · \{t\("componentCandidateNotInstalled"\)\}/)
  assert.match(manager, /\{candidate\.lastRemovalHere \? \(\n\s+<span className="mt-0\.5 block text-meta text-muted-foreground">\n\s+\{t\("componentCandidateRemovedHere", \{ date: formatAssetDetailDate\(new Date\(candidate\.lastRemovalHere\.removedAt\), locale\) \}\)\}/)
  const th = assetWords("th")
  assert.deepEqual([th.componentCandidateNotInstalled, th.componentCandidateRemovedHere], ["ยังไม่ได้ติดตั้ง", "เคยติดตั้งกับเครื่องนี้ · ถอดออก {date}"])
})

test("the details step's footer says the count after saving", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /<p className="text-sm text-muted-foreground">\{t\("componentCountAfterInstall", \{ from: linkRows\.installedCount, to: linkRows\.installedCount \+ 1 \}\)\}<\/p>/)
  assert.equal(assetWords("th").componentCountAfterInstall, "หลังบันทึก: ส่วนควบของเครื่องนี้ {from, number} → {to, number} รายการ")
})

test("one table of current and past links: the columns, the count line, ติดตั้งอยู่, Nil, the outstanding line, and ⋯ only on current rows for editors (P4-R3)", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /<ContentPanel divided flush title=\{labels\.history\} description=\{t\("componentHistoryCount", \{ total: linkRows\.rows\.length, installed: linkRows\.installedCount, removed: linkRows\.removedCount \}\)\}>/)
  assert.match(manager, /<DataTable framed=\{false\} className="hidden md:block" caption=\{labels\.history\} scrollHint=\{tCommon\("tableScrollHint"\)\}>/)
  const heads = [...manager.matchAll(/<DataTableHead>\{t\("(componentColumn\w+)"\)\}<\/DataTableHead>/g)].map((match) => match[1])
  assert.deepEqual(heads, ["componentColumnComponent", "componentColumnRoleSlot", "componentColumnInstalled", "componentColumnRemoved", "componentColumnReason", "componentColumnEvidence"])
  assert.match(manager, /\{canEdit \? <DataTableHead hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead> : null\}/)
  assert.match(manager, /<ContentPanelRows className="md:hidden">/)
  assert.match(manager, /row\.state === "installed" \? t\("componentStillInstalled"\)/)
  assert.match(manager, /\{row\.outstandingLine \? <div className="mt-1 text-meta font-medium text-warning">\{row\.outstandingLine\}<\/div> : null\}/)
  assert.match(manager, /row\.evidenceCount > 0 \? t\("componentPhotoCount", \{ count: row\.evidenceCount \}\) : <Nil \/>/)
  assert.ok((manager.match(/<Nil \/>/g)?.length ?? 0) >= 4, "the empty cells are Nil, never a dash")
  // Current rows first, then the past ones with the progressive reveal.
  assert.match(manager, /const currentRows = linkRows\.rows\.filter\(\(row\) => row\.state !== "removed"\)/)
  assert.match(manager, /const componentHistory = linkRows\.rows\.filter\(\(row\) => row\.state === "removed"\)/)
  assert.match(manager, /const visibleRows = \[\.\.\.currentRows, \.\.\.visibleHistory\]/)
  // ⋯ only for an editor on a current row: open the asset, and the destructive removal.
  assert.match(manager, /const showMenu = \(row: ComponentLinkRow\) => canEdit && row\.state !== "removed"/)
  assert.match(manager, /menuLabel=\{tCommon\("moreActionsFor", \{ code: row\.componentAsset\.assetTag \}\)\}/)
  assert.match(manager, /\{ kind: "link", key: "open", label: t\("componentOpenAsset"\), href: assetHref\(row\) \}/)
  assert.match(manager, /\{ kind: "action", key: "remove", label: labels\.remove, destructive: true, onSelect: \(\) => setRemoveTarget\(row\) \}/)
  assert.match(manager, /openerRef=\{removeOpenerRef\}/)
  assert.doesNotMatch(manager, /variant="danger"|menu="dropdown"|menu="sheet"/)
  const th = assetWords("th")
  assert.equal(th.componentHistoryCount, "{total, number} รายการ · ติดตั้งอยู่ {installed, number} · ถอดแล้ว {removed, number}")
  assert.deepEqual(
    [th.componentColumnComponent, th.componentColumnRoleSlot, th.componentColumnInstalled, th.componentColumnRemoved, th.componentColumnReason, th.componentColumnEvidence, th.componentStillInstalled, th.componentOpenAsset],
    ["ส่วนควบ", "บทบาท · ช่อง", "ติดตั้ง", "ถอด", "เหตุผล", "หลักฐาน", "ติดตั้งอยู่", "เปิดหน้าทรัพย์สิน"],
  )
})

test("the remove dialog shows ตอนนี้ | หลังยืนยัน with the state and the count from componentCountAfterRemoval, the reason labelled เหตุผล, and gives focus back to ⋯", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /<DataTableHead>\{t\("componentRemoveNow"\)\}<\/DataTableHead>\n\s+<DataTableHead>\{t\("componentRemoveAfter"\)\}<\/DataTableHead>/)
  assert.match(manager, /component\.state === "installed" \? labels\.installedState : labels\.outstandingState/)
  assert.match(manager, /\{t\("componentStateRemoved"\)\}/)
  assert.match(manager, /const countAfter = component && component\.state !== "removed" \? componentCountAfterRemoval\(\{ status: component\.state \}, installedCount\) : installedCount/)
  assert.match(manager, /\{t\("componentCountValue", \{ count: installedCount \}\)\}/)
  assert.match(manager, /\{t\("componentCountValue", \{ count: countAfter \}\)\}/)
  assert.match(manager, /<Field label=\{labels\.reason\} id="component-remove-reason" error=\{removeErrors\.message\("reason"\)\}>\n\s+<Textarea\n\s+ref=\{reasonRef\}\n\s+placeholder=\{labels\.removeReason\}/)
  assert.match(manager, /returnFocusRef=\{removeOpenerRef\}/)
  const th = assetWords("th")
  assert.deepEqual(
    [th.componentRemoveNow, th.componentRemoveAfter, th.componentStatus, th.componentInstalled, th.componentOutstanding, th.componentStateRemoved, th.componentCountHere, th.componentCountValue, th.reason, th.componentRemoveReason, th.componentConfirmRemove],
    ["ตอนนี้", "หลังยืนยัน", "สถานะส่วนควบ", "ติดตั้งกับทรัพย์สินหลัก", "ค้างคืน", "ถอดแล้ว", "ส่วนควบของเครื่องนี้", "{count, number} รายการ", "เหตุผล", "ระบุเหตุผลการถอดส่วนควบ", "ยืนยันถอดส่วนควบ"],
  )
})

test("the page feeds the manager from the loader alone, with the map built from the same rows and the parent links it loads", () => {
  const page = readText(PAGE)
  assert.doesNotMatch(page, /isCurrentLink|parentComponents|evidenceCounts|currentComponents|componentHistory=/, "the old duplicate reads are gone")
  assert.match(page, /installedInLinks: \{\n\s+where: installedOrOutstandingLinkWhere,/)
  assert.match(page, /<AssetRelationshipMap\n/)
  assert.match(page, /relationshipMap=\{relationshipMap\}/)
  assert.match(page, /childLinks=\{componentRows\.rows\.filter\(\(row\) => row\.state !== "removed"\)\.map\(/)
  assert.match(page, /licenseAssignedLinks=\{\[\]\}/)
  assert.doesNotMatch(page, /\?\? "-"/)
})

test("after a successful removal, focus goes to the next current row's ⋯, else the install button, else the links heading (final review)", () => {
  const manager = readText(MANAGER)
  assert.match(manager, /focusAfterRemovalRef\.current = \{ removedId: component\.id, order: currentRows\.map\(\(row\) => row\.id\) \}\n\s+setRemoveTarget\(null\)\n\s+router\.refresh\(\)/)
  // It waits for the refreshed rows: while the removed row is still current, nothing moves.
  assert.match(manager, /if \(stillCurrent\.has\(pending\.removedId\)\) return/)
  assert.match(manager, /componentFocusAfterRemoval\(/)
  assert.match(manager, /const target = \(targetId \? visibleRowMenu\(targetId\) : null\) \?\? installButtonRef\.current \?\? panelHeading\(historyPanelRef\.current\)/)
  // Both layouts mark their rows; the hidden layout's ⋯ is skipped.
  assert.equal(manager.match(/data-component-link=\{row\.id\}/g)?.length, 2)
  assert.match(manager, /getClientRects\(\)\.length > 0/)
  assert.match(manager, /<div ref=\{historyPanelRef\}>\n\s+<ContentPanel divided flush title=\{labels\.history\}/)
  assert.match(manager, /if \(heading\) heading\.tabIndex = -1/)
})

test("the four component messages the one-table rewrite left unread are gone (final review)", () => {
  for (const locale of ["th", "en"] as const) {
    const words = assetWords(locale)
    for (const key of ["currentComponents", "noCurrentComponents", "viewEvidence", "componentSummaryHelp"]) assert.equal(words[key], undefined, `${locale} asset.${key}`)
  }
})
