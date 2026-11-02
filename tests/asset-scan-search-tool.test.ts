import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { buildDirectAssetHrefFromScanValue } from "../src/lib/asset-scan-routing.ts"
import { getAssetScanEnterTarget, getAssetScanHeading, getAssetScanSharedMatchField } from "../src/lib/asset-scan-search-rules.ts"

const toolPath = "src/components/assets/asset-scan-search-tool.tsx"
const pagePath = "src/app/[locale]/(dashboard)/asset-management/scan/page.tsx"
const readTool = () => readFileSync(toolPath, "utf8").replace(/\r\n/g, "\n")
const readPage = () => readFileSync(pagePath, "utf8").replace(/\r\n/g, "\n")
const th = () => JSON.parse(readFileSync("messages/th.json", "utf8"))
const en = () => JSON.parse(readFileSync("messages/en.json", "utf8"))

test("asset scan page auto-opens direct QR resolver matches", () => {
  const source = readFileSync(toolPath, "utf8")

  assert.match(source, /const directAssetHref = buildDirectAssetHrefFromScanValue/)
  assert.match(source, /const scanReturnHref = `\/\$\{locale\}\/asset-management\/scan`/)
  assert.match(source, /if \(!directAssetHref\) return[\s\S]+router\.push\(appendReturnTo\(directAssetHref, scanReturnHref\)\)/)
  assert.match(source, /onScanSuccess=\{handleScannedValue\}/)
  assert.match(source, /function handleScannedValue\(value: string\)[\s\S]+router\.push\(appendReturnTo\(href, scanReturnHref\)\)/)
})

test("a QR or URL with the asset id still opens at once; a typed tag still does not (P4-R2: the routing lib is unchanged)", () => {
  assert.equal(buildDirectAssetHrefFromScanValue("https://asset.example.com/q/a/0f8fad5b-d9cb-469f-a165-70867728950e", "th"), "/th/assets/0f8fad5b-d9cb-469f-a165-70867728950e")
  assert.equal(buildDirectAssetHrefFromScanValue("SNI-EQU-16-0031", "th"), "")
})

test("asset scan page provides camera utility labels for QR scanning", () => {
  const page = readFileSync(pagePath, "utf8")

  assert.match(page, /cameraOpening: t\("cameraOpening"\)/)
  assert.match(page, /torchOn: t\("torchOn"\)/)
  assert.match(page, /torchOff: t\("torchOff"\)/)
  assert.match(page, /torchUnsupported: t\("torchUnsupported"\)/)
  assert.match(page, /zoomCamera: t\.raw\("zoomCamera"\)/)
  assert.match(page, /zoomUnsupported: t\("zoomUnsupported"\)/)

  for (const messages of [th(), en()]) {
    assert.equal(typeof messages.assetTools.cameraOpening, "string")
    assert.equal(typeof messages.assetTools.torchOn, "string")
    assert.equal(typeof messages.assetTools.torchOff, "string")
    assert.equal(typeof messages.assetTools.torchUnsupported, "string")
    assert.equal(typeof messages.assetTools.zoomCamera, "string")
    assert.equal(typeof messages.assetTools.zoomUnsupported, "string")
  }
})

test("asset scan page labels only the native input; its own placeholder and the hint under the field (group 4 plan 4)", () => {
  const tool = readFileSync(toolPath, "utf8")
  const page = readFileSync(pagePath, "utf8")

  assert.match(tool, /<Field label=\{labels\.queryLabel\} hint=\{labels\.hint\}>\s*<ScannerTextInput\s+id="asset-scan-query"/)
  assert.match(tool, /<ScannerTextInput[\s\S]+id="asset-scan-query"/)
  assert.doesNotMatch(tool, /<label className="block">[\s\S]+<ScannerTextInput/)
  assert.doesNotMatch(tool, /inputClassName=/)
  assert.match(page, /placeholder: t\("scanPagePlaceholder"\)/)
  assert.match(page, /hint: t\("scanHint"\)/)
  assert.doesNotMatch(page, /placeholder: tGlobalSearch\("placeholder"\)|t\("scanPlaceholder"\)/)
  // The label page still reads scanPlaceholder (tests/asset-label-print-ui.test.ts), so its words stay as they were.
  assert.equal(th().assetTools.scanPlaceholder, "ค้นหาด้วยรหัสทรัพย์สิน, Serial Number, ผู้ถือครอง หรือที่ตั้ง")
  assert.equal(en().assetTools.scanPlaceholder, "Search by Asset Tag, Serial Number, custodian, or location")
  assert.equal(th().assetTools.scanPagePlaceholder, "รหัสทรัพย์สิน, Serial หรือชื่อ")
  assert.equal(th().assetTools.scanHint, "ป้าย QR ยังติดไม่ครบ พิมพ์รหัสบางส่วน, Serial ใต้เครื่อง หรือชื่อแทนได้")
  assert.equal(typeof en().assetTools.scanPagePlaceholder, "string")
  assert.equal(typeof en().assetTools.scanHint, "string")
})

// Phase 2C batch 4 (spec 2C §8.9 O19, §6.4.2; 2B spec I13): the scan tool's header is PageHeader, the open button is
// Button, the result cards are links and the status-line spinner stops for users who reduce motion (I27).
test("the asset scan tool uses PageHeader, Field and Button (2C batch 4)", () => {
  const tool = readTool()
  assert.match(tool, /<PageHeader title=\{labels\.title\} meta=\{labels\.subtitle\} \/>/)
  assert.match(tool, /<Field label=\{labels\.queryLabel\} hint=\{labels\.hint\}>\n\s+<ScannerTextInput\n\s+id="asset-scan-query"[\s\S]*?onScanSuccess=\{handleScannedValue\}\n\s+\/>\n\s+<\/Field>/)
  assert.match(tool, /<Button onClick=\{\(\) => openAsset\(directAssetHref\)\} className="w-full sm:w-auto">\n\s+<PackageSearch aria-hidden="true" \/>\n\s+\{labels\.openAsset\}\n\s+<\/Button>/)
  assert.match(tool, /<Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" \/>/)
  assert.doesNotMatch(tool, /<button\b/, "the cards' actions are links (plan 2D-3, group 4 plan 4)")
  assert.doesNotMatch(tool, /<h1\b|<label\b|mb-1\.5 block text-sm font-medium/)
})

test("typed text of 2+ characters asks the scan route, debounced and aborted on change; nothing is fetched on mount (group 4 plan 4)", () => {
  const tool = readTool()
  assert.match(tool, /buildAssetScanSearchHref\(\{ q: trimmedQuery, locale: searchLocale \}\)/)
  assert.doesNotMatch(tool, /\/api\/search\b/)
  assert.match(tool, /if \(directAssetHref \|\| !isAssetOperationSearchReady\(trimmedQuery\) \|\| isAssetOperationSearchTooLong\(trimmedQuery\)\) return/)
  assert.match(tool, /const controller = new AbortController\(\)/)
  assert.match(tool, /controller\.abort\(\)\n\s+window\.clearTimeout\(timeout\)/)
  assert.match(tool, /\}, 180\)/)
  assert.match(tool, /\{ data\?: AssetScanSearchAnswer \}/)
})

test("Enter opens the single exact tag or Serial match; typing alone never jumps away (P4-R2)", () => {
  const row = (id: string, exact: boolean) => ({ id, exact })
  assert.deepEqual(getAssetScanEnterTarget([row("a", false), row("b", true), row("c", false)]), row("b", true))
  assert.equal(getAssetScanEnterTarget([row("a", true), row("b", true)]), null)
  assert.equal(getAssetScanEnterTarget([row("a", false)]), null)
  assert.equal(getAssetScanEnterTarget([]), null)

  const tool = readTool()
  assert.match(tool, /onKeyDown=\{handleQueryKeyDown\}/)
  assert.match(tool, /event\.key !== "Enter"/)
  assert.match(tool, /const target = getAssetScanEnterTarget\(rows\)/)
  // The answer for the typed text may still be on its way: Enter waits for it instead of doing nothing.
  assert.match(tool, /else pendingEnterRef\.current = trimmedQuery/)
  assert.match(tool, /if \(pendingEnterRef\.current === next\.q\) \{\n\s+pendingEnterRef\.current = null\n\s+const target = getAssetScanEnterTarget\(next\.rows\)/)
})

test("the heading names the matched field when every card matched the same one, else each card does (P4-R7)", () => {
  const row = (field: "tag" | "serial" | "name") => ({ match: { field } })
  assert.equal(getAssetScanSharedMatchField([row("serial"), row("serial")]), "serial")
  assert.equal(getAssetScanSharedMatchField([row("serial"), row("name")]), null)
  assert.equal(getAssetScanSharedMatchField([]), null)

  const tool = readTool()
  assert.match(tool, /const heading = getAssetScanHeading\(answer\)/)
  assert.match(tool, /t\("scanFoundMatch", \{ count: answer\.total, field: t\(`scanMatchFields\.\$\{heading\.field\}`\) \}\)/)
  assert.match(tool, /t\("scanFound", \{ count: answer\.total \}\)/)
  assert.match(tool, /t\("scanCardMatch", \{ field: t\(`scanMatchFields\.\$\{row\.match\.field\}`\) \}\)/)

  const thTools = th().assetTools
  const enTools = en().assetTools
  assert.equal(thTools.scanFound, "พบ {count, number} รายการ")
  assert.equal(thTools.scanFoundMatch, "พบ {count, number} รายการ · ตรงกับ {field}")
  assert.equal(thTools.scanCardMatch, "ตรงกับ {field}")
  assert.deepEqual(thTools.scanMatchFields, { tag: "รหัสทรัพย์สิน", serial: "Serial", name: "ชื่อ", holder: "ผู้ถือครอง", room: "ที่ตั้ง", model: "รุ่น" })
  assert.match(enTools.scanFound, /^\{count, plural, one \{# result\} other \{# results\}\}$/)
  assert.match(enTools.scanFoundMatch, /^\{count, plural, one \{# result\} other \{# results\}\} · /)
  assert.deepEqual(Object.keys(enTools.scanMatchFields), ["tag", "serial", "name", "holder", "room", "model"])
})

test("a card: name first, tag and Serial with the typed words marked, status and condition badges, the facts, the open link and the action links (P4-R7)", () => {
  const tool = readTool()
  assert.match(tool, /splitSearchHighlightWords\(value, words\)/)
  assert.match(tool, /<mark className="rounded-sm bg-warning-soft px-0\.5 text-foreground">\{part\.text\}<\/mark>/)
  assert.match(tool, /<h3 className="[^"]*">\s*<Highlighted value=\{row\.name\} words=\{words\} \/>\s*<\/h3>/)
  assert.match(tool, /<Highlighted value=\{row\.assetTag\} words=\{words\} \/>/)
  assert.match(tool, /<Highlighted value=\{row\.serialNumber\} words=\{words\} \/>/)
  assert.match(tool, /<StatusBadge label=\{row\.status\.label\} tone=\{getAssetStateTone\(row\.status\.name\)\} \/>/)
  assert.match(tool, /label=\{t\("scanCondition", \{ condition: row\.condition\.label \}\)\}/)
  assert.match(tool, /needsConditionAttention\(row\.condition\.name\) \? getAssetStateTone\(row\.condition\.name\) : "muted"/)
  assert.match(tool, /<KeyValueList/)
  assert.match(tool, /`\$\{row\.holder\.name\} · \$\{row\.holder\.department\}`/)
  assert.match(tool, /row\.holder\.kind === "shared" \? tAsset\("holderShared"\) : tAsset\("noCustodian"\)/)
  assert.match(tool, /`\$\{row\.room\.name\} · \$\{row\.room\.branchName\}`/)
  assert.match(tool, /t\("scanComponentsValue", \{ count: row\.components\.count, names: componentNames\(row\.components\) \}\)/)
  // The detail link keeps the scan page's returnTo exactly, so the asset page offers "สแกนรายการถัดไป".
  assert.match(tool, /href=\{appendReturnTo\(row\.href, scanReturnHref\)\}/)
  assert.match(tool, /\{labels\.openAsset\}/)
  assert.match(tool, /role="group" aria-label=\{t\("scanNextActions"\)\}/)
  assert.match(tool, /const Icon = assetActionIcons\[action\.key\]/)
  assert.match(tool, /tAll\(action\.labelKey\)/)
  assert.match(tool, /tAsset\("printLabel"\)/)

  const thTools = th().assetTools
  assert.equal(thTools.scanNextActions, "ทำต่อกับทรัพย์สินนี้")
  assert.equal(thTools.scanCondition, "สภาพ {condition}")
  assert.equal(thTools.scanComponentsValue, "{count, number} รายการ · {names}")
  assert.match(en().assetTools.scanComponentsValue, /^\{count, plural, one \{# component\} other \{# components\}\} · \{names\}$/)
})

test("เปิดล่าสุด: kept per user and locale after mount, added when a card opens or Enter/QR opens an asset, emptied by ล้างรายการ (group 4 plan 4)", () => {
  const tool = readTool()
  const page = readPage()
  assert.match(page, /const user = await requirePagePermission\(locale, "asset", "view"\)/)
  assert.match(page, /userId=\{user\.id\}/)
  assert.match(tool, /const recentKey = assetScanRecentKey\(userId, locale\)/)
  // The server and the first render read no list, so the page hydrates without a mismatch.
  assert.match(tool, /useSyncExternalStore\(subscribeRecent, \(\) => readStoredRecent\(recentKey\), \(\) => null\)/)
  assert.match(tool, /addAssetScanRecent\(/)
  assert.match(tool, /writeAssetScanRecent\(getStorage\(\), recentKey, \[\]\)/)
  assert.match(tool, /onClick=\{\(\) => rememberRecent\(row\)\}/)
  assert.match(tool, /t\("scanRecent"\)/)
  assert.match(tool, /t\("scanRecentClear"\)/)
  assert.equal(th().assetTools.scanRecent, "เปิดล่าสุด")
  assert.equal(th().assetTools.scanRecentClear, "ล้างรายการ")
  assert.equal(typeof en().assetTools.scanRecent, "string")
  assert.equal(typeof en().assetTools.scanRecentClear, "string")
})

test("the heading names the field only when every result is shown; past 8 it says the first n are shown (final review)", () => {
  const rows = (count: number, field: "tag" | "name" = "name") => Array.from({ length: count }, () => ({ match: { field } }))
  assert.deepEqual(getAssetScanHeading({ total: 3, rows: rows(3) }), { field: "name", shown: null })
  assert.deepEqual(getAssetScanHeading({ total: 8, rows: rows(8) }), { field: "name", shown: null })
  // 30 found, 8 shown, all 8 by name: the 22 unseen may have matched another field, so the heading names none.
  assert.deepEqual(getAssetScanHeading({ total: 30, rows: rows(8) }), { field: null, shown: 8 })
  assert.deepEqual(getAssetScanHeading({ total: 2, rows: [{ match: { field: "tag" } }, { match: { field: "name" } }] }), { field: null, shown: null })

  const tool = readTool()
  assert.match(tool, /showMatch=\{lines\.field === null\}/)
  assert.match(tool, /shown: heading\.shown !== null \? t\("scanShownFirst", \{ shown: heading\.shown \}\) : null/)
  assert.match(tool, /\{lines\.shown \? <p className="text-meta text-muted-foreground num">\{lines\.shown\}<\/p> : null\}/)
  assert.equal(th().assetTools.scanShownFirst, "แสดง {shown, number} รายการแรก")
  assert.equal(en().assetTools.scanShownFirst, "{shown, plural, one {Showing the first # result} other {Showing the first # results}}")
})

test("one polite live region announces loading, the count line, no results and a failed search (final review)", () => {
  const tool = readTool()
  assert.match(tool, /<p role="status" aria-live="polite" className="sr-only">\n\s+\{statusText\}\n\s+<\/p>/)
  assert.equal(tool.match(/role="status"/g)?.length, 1)
  assert.match(tool, /directAssetHref \|\| trimmedQuery\.length < 2\n\s+\? ""/)
  assert.match(tool, /\(currentAnswer && currentAnswer\.rows\.length === 0\)\n\s+\? labels\.noResults/)
  assert.match(tool, /\? \[headingLines\.found, headingLines\.shown\]\.filter\(Boolean\)\.join\(" · "\)/)
  assert.match(tool, /: failed\n\s+\? labels\.searchFailed\n\s+: labels\.loading/)
})

test("a failed search shows an inline error with retry, never no results, and drops a waiting Enter (final review)", () => {
  const tool = readTool()
  const page = readPage()
  assert.match(tool, /setFailedQuery\(trimmedQuery\)/)
  assert.doesNotMatch(tool, /next = \{ q: trimmedQuery, total: 0, rows: \[\] \}/, "a failure is not an empty answer")
  assert.match(tool, /if \(pendingEnterRef\.current === trimmedQuery\) pendingEnterRef\.current = null/)
  assert.match(tool, /const failed = !currentAnswer && failedQuery === trimmedQuery/)
  assert.match(tool, /<Notice\s+tone="danger"\s+action=\{\s*<Button variant="outline" size="md" onClick=\{retrySearch\}>/)
  assert.match(tool, /function retrySearch\(\) \{\n\s+setFailedQuery\(null\)\n\s+setAttempt\(\(current\) => current \+ 1\)/)
  assert.match(page, /searchFailed: tGlobalSearch\("failed"\)/)
  assert.match(page, /retry: tCommon\("tryAgain"\)/)
})
