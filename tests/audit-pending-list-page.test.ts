import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")
const PAGE = "src/app/[locale]/(dashboard)/audit/rounds/[id]/pending/page.tsx"
const DATA = "src/lib/audit-pending-list-data.ts"
const DIALOG = "src/components/audit/audit-mark-not-found-button.tsx"

test("the data: one load per page, the rows' where with the room, the chips' groupBy without it, names by id active or not (spec §9, bug 13, P2-R10)", () => {
  const data = read(DATA)
  assert.match(data, /export async function getAuditPendingListData\(\{ roundId, searchText, locationFilter, listPage \}: \{ roundId: string; searchText: string; locationFilter: string; listPage: ListPageState \}\): Promise<AuditPendingListData>/)
  assert.match(data, /getAuditRoundCounts\(\[roundId\]\)/)
  // The room chips count within the search (spec §5): the rows' where without the room.
  assert.match(data, /prisma\.auditItem\.groupBy\(\{ by: \["expectedLocationId"\], where: buildAuditPendingListWhere\(\{ roundId, search, room: null \}\), _count: \{ _all: true \} \}\)/)
  assert.match(data, /const where = buildAuditPendingListWhere\(\{ roundId, search, room: auditPendingRoomWhere\(locationFilter, roomChips\.topRoomIds\) \}\)/)
  // The room half is the round page's lookup (Task 2, P2-R25), kept to the pending rooms; the custodians come from the
  // round's own pending items, matched in chunks of 2,000.
  assert.match(data, /^import \{ findAuditRoundSearchLocationIds \} from "@\/lib\/audit-round-list-lookups"$/m)
  assert.match(data, /findAuditRoundSearchLocationIds\(roundId, searchText\)/)
  assert.match(data, /matchedRoomIds: roundRoomMatches\.filter\(\(id\) => pendingRoomIds\.has\(id\)\)/)
  assert.doesNotMatch(data, /prisma\.location\.findMany\(\{ where: \{ id: \{ in: chunk \}/, "no room lookup of its own")
  assert.match(data, /chunkAuditIds\(custodianIds\)\.map\(\(chunk\) => prisma\.employee\.findMany\(\{ where: \{ id: \{ in: chunk \}, OR: \[\{ code: \{ contains: searchText \} \}, \{ fullNameTh: \{ contains: searchText \} \}\] \}, select: \{ id: true \} \}\)\)/)
  assert.match(data, /buildAuditPendingSearchWhere\(searchText, \{/)
  // Rows show the item's expected room and custodian, never the asset's current ones.
  assert.doesNotMatch(data, /currentLocation|custodian: \{ select/)
  // ตรวจล่าสุด: the asset page's rule from the audit items, one read for the page's assets, never a movement (P2-R32).
  assert.match(data, /^import \{ latestAuditResultOrderBy, latestAuditResultSelect, latestAuditResultWhere, pickLatestAuditResultAt \} from "@\/lib\/latest-audit-result-rules"$/m)
  assert.match(data, /prisma\.auditItem\.findMany\(\{ where: \{ assetId: \{ in: assetIds \}, \.\.\.latestAuditResultWhere \}, orderBy: latestAuditResultOrderBy, select: latestAuditResultSelect \}\)/)
  assert.equal(data.match(/latestAuditResultWhere \}/g)?.length, 1, "one read, not one per row")
  assert.match(data, /lastAuditAt: pickLatestAuditResultAt\(auditRows\),/)
  assert.doesNotMatch(data, /movements|movementType|performedAt/)
  assert.doesNotMatch(data, /isActive/, "a room or person closed during the round keeps its name")
  assert.doesNotMatch(data, /\.(create|update|upsert|delete)(Many)?\(|\$queryRaw/)
})

test("the header: the round-wide pending count in the title, the trail, the round's facts and เดินตรวจต่อ for audit:edit (spec §9, P2-R12)", () => {
  const page = read(PAGE)
  assert.match(page, /const user = await requirePagePermission\(locale, "audit", "view"\)/)
  assert.match(page, /const canScan = hasPermission\(user, "audit", "edit"\)/)
  assert.match(page, /select: \{ id: true, auditNo: true, name: true, status: true, endDate: true \}/)
  assert.match(page, /withPerformanceTiming\("audit-pending\.page-data", \(\) =>\s*getAuditPendingListData\(\{ roundId: round\.id, searchText, locationFilter, listPage \}\),?\s*\)/)
  assert.match(page, /breadcrumbs=\{\[\n\s+\{ label: tRound\("title"\), href: `\/\$\{locale\}\/audit\/rounds` \},\n\s+\{ label: round\.auditNo, href: scanReturnToHref, code: true \},\n\s+\{ label: t\("title"\) \},\n\s+\]\}/)
  assert.match(page, /title=\{t\("titleWithCount", \{ count: formatCount\(data\.counts\.pending\) \}\)\}/)
  const at = (needle: string) => {
    const index = page.indexOf(needle)
    assert.ok(index !== -1, needle)
    return index
  }
  const meta = [
    '<span className="tag">{round.auditNo}</span>',
    '<StatusBadge label={tRound(auditRoundStatusLabelKey(round.status) ?? "statusOpen")} status={effectiveAuditRoundStatus(round.status)} />',
    't("checkedOfTotal", { checked: formatCount(data.counts.checked), total: formatCount(data.counts.total) })',
    'dueLine.kind === "left" ? tRound("daysLeft", { days: formatCount(dueLine.days) }) : tRound("daysOverdue", { days: formatCount(dueLine.days) })',
  ].map(at)
  assert.deepEqual(meta, [...meta].sort((a, b) => a - b))
  assert.match(page, /const dueLine = buildAuditRoundDueLine\(round\.status, round\.endDate, startOfBangkokDay\(new Date\(\)\)\)/)
  assert.match(page, /const continueScanHref = buildAuditPendingContinueScanHref\(\{ locale, roundId: round\.id, returnToHref, scanReturnToHref \}\)/)
  assert.match(page, /actions=\{\n\s+canScan && data\.counts\.pending > 0 \? \(\n\s+<Link href=\{continueScanHref\} className=\{buttonVariants\(\{ size: "md" \}\)\}>\n\s+<ScanLine aria-hidden="true" \/>\n\s+\{tRound\("nextStepContinueScan", \{ count: formatCount\(data\.counts\.pending\) \}\)\}/)
  assert.doesNotMatch(page, /<ContentPanel|t\("pendingCount"|t\("roomFilter"|t\("subtitle"/)
})

test("room chips: a TabNav of rooms counted within the search, the search at its right (spec §9, P2-R11, bug 16)", () => {
  const page = read(PAGE)
  assert.match(page, /const roomLabels = labelAuditPendingRoomChips\(data\.roomChips\.chips, data\.places\)/)
  assert.match(page, /label: chip\.kind === "all" \? t\("roomAll"\) : chip\.kind === "other" \? t\("roomOther"\) : formatAuditPendingRoomChip\(roomLabels\.get\(chip\.key\), t\("roomUnknown"\)\),/)
  assert.match(page, /count: formatCount\(chip\.count\),\n\s+href: listHref\(\{ locationId: chip\.kind === "all" \? "" : chip\.key \}\),/)
  assert.match(page, /<TabNav aria-label=\{t\("roomChips"\)\} items=\{roomTabs\} current=\{data\.roomChips\.current\} scroll=\{false\}/)
  assert.ok(page.indexOf("<TabNav") < page.indexOf("<MasterDataSearch"), "the search sits after the chips")
  assert.doesNotMatch(page, /locationFilterLabel|prisma\.location\./, "no raw id label and no lookup of its own")
})

test("rows: the expected room and custodian, the whole row and the name open the asset, two buttons for audit:edit only that the row ignores; the phone card the same (spec §9, Appendix A §9, bugs 13 and 14, P2-R7, P2-R14, P2-R28)", () => {
  const page = read(PAGE)
  assert.match(page, /<ClickableTableRow key=\{item\.id\} href=\{assetHref\} label=\{`\$\{tCommon\("view"\)\}: \$\{item\.asset\.assetTag\}`\}>/)
  assert.match(page, /<Link href=\{assetHref\} className=\{cn\(linkVariants\(\{ size: "inherit" \}\), "font-semibold"\)\}>\{item\.asset\.name\}<\/Link>/)
  assert.match(page, /formatAuditPendingCustodian\(facts\.custodian, t\("noCustodian"\)\) \?\? <Nil \/>/)
  assert.match(page, /formatAuditPendingLocation\(facts\.location, t\("roomUnknown"\)\)/)
  assert.match(page, /formatAuditPendingLastAudit\(facts\.lastAuditAt\) \?\? t\("lastAuditNever"\)/)
  assert.match(page, /formatAuditPendingLastAudit\(facts\.lastAuditAt\) \?\? labels\.lastAuditNever/, "the phone card reads the same date")
  assert.match(page, /function formatAuditPendingLastAudit\(at: Date \| null\) \{\n\s+return at \? formatDateTime\(at\) : null\n\}/, "date and time (P2-R13)")
  assert.doesNotMatch(page, /movements/)
  assert.match(page, /\{canScan \? \(\n\s+<DataTableHead align="right" sticky="right" hideLabel>\{tCommon\("actions"\)\}<\/DataTableHead>\n\s+\) : null\}/)
  assert.match(page, /\{canScan \? \(\n\s+<DataTableCell align="right" sticky="right">\n\s+<div className="flex items-center justify-end gap-2">\n\s+<Link href=\{scanHref\} className=\{buttonVariants\(\{ variant: "outline", size: "sm" \}\)\}>/)
  assert.match(page, /<AuditMarkNotFoundButton itemId=\{item\.id\} variant="row" asset=\{facts\.notFound\} \/>/)
  assert.match(page, /colSpan=\{canScan \? 4 : 3\}/)
  // The phone card: scan and not found for audit:edit, "ดูทรัพย์สิน" for everyone.
  assert.match(page, /\{canScan \? \(\n\s+<Link href=\{scanHref\} className=\{buttonVariants\(\)\}>/)
  assert.match(page, /\{canScan \? <AuditMarkNotFoundButton itemId=\{item\.id\} variant="button" asset=\{facts\.notFound\} \/> : null\}/)
  assert.match(page, /function describeAuditPendingItem\(item: AuditPendingListItem, places: ReadonlyMap<string, AuditPendingPlace>, people: ReadonlyMap<string, AuditPendingPlace>, lastAuditAt: ReadonlyMap<string, Date>\): AuditPendingItemFacts/)
  assert.doesNotMatch(page, /<DataTableRow\b|AuditPendingRowActions|currentLocation|asset\.custodian/)
  assert.equal(existsSync("src/components/audit/audit-pending-row-actions.tsx"), false)
})

test("empty states: ล้างคำค้น for a search, ดูทุกห้อง for a room, กลับ when the round has nothing left (spec §5, Appendix A §9)", () => {
  const page = read(PAGE)
  assert.match(page, /const empty = searchText\n\s+\? \{ title: t\("emptySearchTitle"\), help: t\("emptySearchHelp"\), href: clearSearchHref, label: t\("clearSearch"\) \}\n\s+: locationFilter\n\s+\? \{ title: t\("roomEmptyTitle"\), help: t\("roomEmptyHelp"\), href: clearRoomFilterHref, label: t\("roomFilterClear"\) \}\n\s+: \{ title: t\("emptyTitle"\), help: t\("emptyHelp"\), href: returnToHref, label: tCommon\("back"\) \}/)
})

test("the not-found dialog names the asset and says what follows, with no before/after numbers (spec §9, bug 15, P2-R15)", () => {
  const source = read(DIALOG)
  assert.match(source, /import type \{ AuditPendingCustodian, AuditPendingPlace \} from "@\/lib\/audit-pending-list-rules"/)
  assert.match(source, /export type AuditNotFoundAsset = \{ name: string; tag: string; location: AuditPendingPlace \| null; custodian: AuditPendingCustodian \}/)
  assert.match(source, /type AuditMarkNotFoundButtonVariant = "icon" \| "button" \| "row"/)
  assert.match(source, /asset: AuditNotFoundAsset\n/)
  assert.match(source, /variant === "row" \? \(\n\s+<Button variant="outline" size="sm" busy=\{saving\} onClick=\{openDialog\}>/)
  // In the clickable row (P2-R28): the trigger and the dialog's portal events stop before the row.
  assert.match(source, /<div data-no-row-click className="contents" onClick=\{stopRowEvent\} onKeyDown=\{stopRowEvent\}>/)
  assert.match(source, /<RowClickGuard active=\{variant === "row"\}>/)
  for (const label of ['label: t("asset")', 'label: t("expectedLocation")', 'label: t("expectedCustodian")', 't("roomUnknown")', 't("noCustodian")']) {
    assert.ok(source.includes(label), label)
  }
  const facts = source.indexOf("<KeyValueList")
  const result = source.indexOf('<Notice tone="info">{t("notFoundResult")}</Notice>')
  const remark = source.indexOf("<Textarea")
  assert.ok(facts !== -1 && facts < result && result < remark, "the facts, then the result line, then the optional fields")
  assert.doesNotMatch(source, /→/, "no before/after numbers (spec §9, §15)")
})
