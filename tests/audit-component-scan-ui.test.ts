import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r\n/g, "\n")

test("the scan page no longer preloads component relationships; the workspace loads them per asset", () => {
  const page = read("src/app/[locale]/(dashboard)/audit/rounds/[id]/scan/page.tsx")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")

  assert.doesNotMatch(page, /parentComponents|installedInLinks|buildAuditScanComponentRows/)
  assert.match(workspace, /const loadComponents = useCallback\(async \(assetId: string\) =>/)
  assert.match(workspace, /fetch\(`\/api\/audit-rounds\/\$\{roundId\}\/scan-lookup`/)
  assert.match(workspace, /components: normalizeAuditLookupComponents\(payload\.asset\.components\)/)
  assert.match(workspace, /installedIn: normalizeAuditLookupInstalledIn\(payload\.asset\.installedIn\)/)
  assert.match(workspace, /void loadComponents\(item\.assetId\)/)
})

test("the check form renders the installed component panel with its confirmation actions wired", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  const types = read("src/components/audit/audit-scan-types.ts")

  assert.match(types, /export type AuditScanComponent/)
  assert.match(panels, /export function AuditComponentPanel/)
  assert.match(panels, /componentStatusConfirmedWithParent/)
  assert.match(form, /<AuditComponentPanel/)
  assert.match(form, /onScanComponent=\{onScanComponent\}/)
  assert.match(form, /onConfirmWithParent=\{\(component\) => onConfirmComponent\(component, \{ values, remark \}\)\}/)
  assert.match(form, /onMarkMissing=\{onMarkComponentMissing\}/)
  // The form awaits the handler (one row or "พบครบทุกชิ้น"), so the workspace hands it over as is (D3).
  assert.match(workspace, /onConfirmComponent=\{confirmComponent\}/)
  assert.match(workspace, /onScanComponent=\{scanComponent\}/)
  assert.match(workspace, /setMissingComponent\(component\)/)
  assert.match(workspace, /submitComponentMissing/)
  assert.doesNotMatch(form, /window\.prompt/)
  assert.doesNotMatch(workspace, /window\.prompt/)
  assert.match(workspace, /confirmedWithParentAssetId/)
  assert.match(workspace, /componentConfirmationReason/)
  assert.match(workspace, /mark-not-found/)
})

test("out-of-scope assets keep their component context from the lookup", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const types = read("src/components/audit/audit-scan-types.ts")

  assert.match(types, /export type AuditLookupComponent/)
  assert.match(types, /components:\s*AuditLookupComponent\[\]/)
  assert.match(types, /installedIn:\s*AuditLookupInstalledInParent\[\]/)
  assert.match(workspace, /function openOutOfScope\(asset: AuditLookupAsset\)[\s\S]*?components: normalizeAuditLookupComponents\(asset\.components\), installedIn: normalizeAuditLookupInstalledIn\(asset\.installedIn\)/)
  assert.match(form, /components\.installedIn\.length > 0/)
  assert.match(form, /components\.components\.length > 0/)
  assert.match(form, /components=\{components\.components\}/)
})

test("audit scan component UI copy is translated", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const en = JSON.parse(readFileSync("messages/en.json", "utf8"))

  for (const messages of [th, en]) {
    assert.equal(typeof messages.auditScan.componentsSection, "string")
    assert.equal(typeof messages.auditScan.componentsCheckedCount, "string")
    assert.equal(typeof messages.auditScan.componentStatusPending, "string")
    assert.equal(typeof messages.auditScan.componentStatusScanned, "string")
    assert.equal(typeof messages.auditScan.componentStatusConfirmedWithParent, "string")
    assert.equal(typeof messages.auditScan.componentFound, "string")
    assert.equal(typeof messages.auditScan.componentScanQr, "string")
    assert.equal(typeof messages.auditScan.componentMarkMissing, "string")
    assert.equal(typeof messages.auditScan.componentMissingDefaultRemark, "string")
    assert.equal(typeof messages.auditScan.componentMissingSaved, "string")
    assert.equal(typeof messages.auditScan.installedInParentNotice, "string")
  }
})

const sliceFrom = (source: string, start: string, end: string) => source.slice(source.indexOf(start), source.indexOf(end, source.indexOf(start)))

test("each component is one compact row: tag, StatusBadge, name · role · slot, a พบ Button and a ⋯ menu (D2)", () => {
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  const panel = sliceFrom(panels, "export function AuditComponentPanel", "export function AuditQrScannerOverlay")
  assert.doesNotMatch(panel, /<button\b|rounded-full|lg:min-w-\[28rem\]|Loader2/, "shared Button, StatusBadge and menu only")
  assert.match(panel, /<li key=\{component\.assetId\} data-audit-component-row className="flex min-h-16 items-center gap-2 px-3 py-2">/)
  // The tag takes its size from a wrapper (visual-foundation-guards: a tag sizes itself under its parent).
  assert.match(panel, /<span className="min-w-0 truncate text-sm text-foreground">\s*<span className="tag font-medium">\{component\.assetTag\}<\/span>/)
  assert.match(panel, /<StatusBadge label=\{statusMeta\.label\} tone=\{statusMeta\.tone\} \/>/)
  assert.match(panel, /\[component\.name, component\.componentRole, component\.slotNo\]\.filter\(Boolean\)\.join\(" · "\)/)
  assert.match(panel, /<p className="truncate text-xs text-muted-foreground">/)
  // A confirmed row shows a check mark where the พบ button was; an out-of-round row keeps a disabled พบ.
  assert.match(panel, /\{isConfirmedWithParent \? \([\s\S]*?<CheckCircle2[\s\S]*?\) : \([\s\S]*?<Button[\s\S]*?variant="outline"[\s\S]*?size="sm"[\s\S]*?disabled=\{rowDisabled\}[\s\S]*?t\("componentFound"\)/)
  assert.match(panel, /const rowDisabled = saving \|\| confirmingAll \|\| componentActionsDisabled \|\| !component\.auditItemId/)
  // The ⋯ menu: the shared dropdown, a 44px icon button below md, scan QR and mark missing.
  assert.match(panel, /<DropdownMenuTrigger asChild>\s*<Button variant="ghost" size="icon-sm" aria-label=\{tCommon\("moreActionsFor", \{ code: component\.assetTag \}\)\}/)
  assert.match(panel, /<DropdownMenuItem disabled=\{saving \|\| confirmingAll\} onSelect=\{\(\) => onScanComponent\(component\)\}>[\s\S]*?t\("componentScanQr"\)/)
  assert.match(panel, /<DropdownMenuItem disabled=\{rowDisabled\} onSelect=\{\(\) => openMissing\(component\)\}>[\s\S]*?t\("componentMarkMissing"\)/)
  // The missing dialog takes focus, so the closing menu must not pull it back to ⋯ (as asset-detail-action-menu).
  assert.match(panel, /onCloseAutoFocus=\{\(event\) => \{\s*if \(!openingDialogRef\.current\) return\s*openingDialogRef\.current = false\s*event\.preventDefault\(\)/)
  // Status pills are StatusBadge tones, not hand-written fills.
  const meta = sliceFrom(panels, "function getAuditComponentStatusMeta", "export function AuditQrScannerOverlay")
  assert.doesNotMatch(meta, /className:/)
  for (const tone of ["muted", "info", "warning", "success"]) assert.match(meta, new RegExp(`tone: "${tone}"`), tone)
})

test("the component list is shown expanded under its heading, with a loading line while it loads (D2)", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  assert.doesNotMatch(form, /componentsOpen|aria-expanded=\{componentsOpen\}/)
  assert.match(form, /\{target\.kind === "item" && components\.components\.length > 0 \? \(\s*<AuditComponentPanel/)
  assert.match(form, /\{target\.kind === "item" && components\.status === "loading" && components\.components\.length === 0 \? \(\s*<p role="status" className="flex min-h-11 items-center gap-2 text-sm text-muted-foreground">\s*<Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" \/>\s*\{t\("componentsLoading"\)\}/)
  assert.match(panels, /<h3 id=\{headingId\} className="text-sm font-semibold text-foreground">\{t\("componentsSection", \{ count: components\.length \}\)\}<\/h3>/)
  assert.match(panels, /t\("componentsCheckedCount", \{ checked: checkedCount, total: components\.length \}\)/)
  // A reload after a confirmation keeps the rows on screen (so focus and "พบครบทุกชิ้น" stay); another asset starts empty.
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /const reload = componentsAssetRef\.current === assetId/)
  assert.match(workspace, /setComponents\(\(current\) => \(reload \? \{ \.\.\.current, status: "loading" \} : \{ status: "loading", components: \[\], installedIn: \[\] \}\)\)/)
  assert.match(workspace, /componentsAssetRef\.current = asset\.id/)
})

test("พบครบทุกชิ้น confirms each pending component through the per-row handler, one at a time, and stops on the first failure (D3)", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  const panels = read("src/components/audit/audit-scan-panels.tsx")
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  const helpers = read("src/components/audit/audit-scan-helpers.ts")
  assert.match(helpers, /export function isAuditComponentPending\(component: AuditScanComponent\) \{\s*return Boolean\(component\.auditItemId && component\.auditStatus === "pending"\)/)
  assert.match(form, /onConfirmComponent: \(component: AuditScanComponent, context: \{ values: AuditCheckValues; remark: string \}\) => Promise<boolean>/)
  const confirmAll = sliceFrom(form, "async function confirmAllComponents()", "\n  }\n")
  assert.match(confirmAll, /const pending = components\.components\.filter\(isAuditComponentPending\)/)
  assert.match(confirmAll, /const context = \{ values, remark \}/)
  assert.match(confirmAll, /setConfirmingAll\(true\)/)
  assert.match(confirmAll, /for \(const component of pending\) \{\s*if \(!mountedRef\.current\) break\s*if \(!\(await onConfirmComponent\(component, context\)\)\) break\s*\}/)
  assert.match(confirmAll, /finally \{\s*setConfirmingAll\(false\)/)
  assert.match(form, /onConfirmAll=\{\(\) => void confirmAllComponents\(\)\}/)
  assert.match(form, /confirmingAll=\{confirmingAll\}/)
  // The button: shown while something is pending (and while it runs), busy while it runs, outline like the row button.
  assert.match(panels, /\{pendingCount > 0 \|\| confirmingAll \? \(\s*<Button variant="outline" size="sm" busy=\{confirmingAll\} disabled=\{confirmAllDisabled\} onClick=\{onConfirmAll\}>/)
  assert.match(panels, /const confirmAllDisabled = componentActionsDisabled \|\| \(saving && !confirmingAll\)/)
  assert.match(panels, /t\("componentsConfirmAll"\)/)
  // The per-row handler reports success, so the loop can stop on the first failure (its error toast stays as it was).
  const handler = sliceFrom(workspace, "async function confirmComponent(", "async function submitComponentMissing")
  assert.match(handler, /async function confirmComponent\(component: AuditScanComponent, context: \{ values: AuditCheckValues; remark: string \}\): Promise<boolean> \{/)
  assert.match(handler, /toast\.success\(t\("componentConfirmedWithParentSuccess"\)\)\s*void loadComponents\(parent\.assetId\)\s*return true/)
  assert.match(handler, /catch \(error\) \{\s*apiError\.toast\(error\)\s*return false/)
  assert.equal((handler.match(/fetch\(/g) ?? []).length, 1, "one request per component, no new endpoint")
})

test("saving the parent with components still pending asks first, and cancelling sends nothing (D4)", () => {
  const form = read("src/components/audit/audit-scan-check-form.tsx")
  assert.match(form, /const confirm = useConfirm\(\)/)
  assert.match(form, /const pendingComponents = target\.kind === "item" \? components\.components\.filter\(isAuditComponentPending\) : \[\]/)
  const save = sliceFrom(form, "async function save()", "\n  }\n")
  assert.match(save, /if \(pendingComponents\.length > 0\) \{\s*const proceed = await confirm\(\{\s*title: t\("componentsPendingSaveTitle", \{ count: pendingComponents\.length \}\),\s*description: t\("componentsPendingSaveDescription"\),\s*confirmLabel: t\("componentsPendingSaveAction"\),\s*\}\)\s*if \(!proceed\) return\s*\}\s*onSubmit\(\{ values, remark, photos, applyCorrections, diff, mode \}\)/)
  assert.match(form, /onClick=\{\(\) => void save\(\)\}/)
  // The one-line hint sits in the pinned bar, above the save button, only while something is pending.
  const actions = form.indexOf("data-audit-check-actions")
  const hint = form.indexOf('t("componentsSaveHint"')
  assert.ok(actions < hint && hint < form.indexOf("{saveLabel}"), "the hint is in the action bar above save")
  assert.match(form, /\{pendingComponents\.length > 0 \? \(\s*<p className="text-sm text-muted-foreground">\{t\("componentsSaveHint", \{ checked: checkedComponents, total: components\.components\.length \}\)\}<\/p>/)
})

test("component copy for D2-D4 exists in Thai and English with the agreed Thai words", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).auditScan
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")).auditScan
  const keys = ["componentsSection", "componentsCheckedCount", "componentFound", "componentMarkMissing", "componentsConfirmAll", "componentsLoading", "componentsSaveHint", "componentsPendingSaveTitle", "componentsPendingSaveDescription", "componentsPendingSaveAction"]
  for (const messages of [th, en]) assert.deepEqual(keys.filter((key) => typeof messages[key] !== "string"), [])
  assert.equal(th.componentsSection, "ส่วนควบ {count} ชิ้น")
  assert.equal(th.componentsCheckedCount, "ตรวจแล้ว {checked} / {total}")
  assert.equal(th.componentFound, "พบ")
  assert.equal(th.componentsConfirmAll, "พบครบทุกชิ้น")
  assert.equal(th.componentMarkMissing, "ไม่พบส่วนควบนี้")
  assert.equal(th.componentsSaveHint, "ส่วนควบตรวจแล้ว {checked} / {total}")
  assert.equal(th.componentsPendingSaveTitle, "ส่วนควบยังตรวจไม่ครบ {count} ชิ้น")
  assert.match(th.componentsPendingSaveDescription, /ยังไม่ตรวจ/)
  assert.equal(th.componentsPendingSaveAction, "บันทึกตัวหลัก")
  for (const gone of ["componentsPanelTitle", "componentsPanelHelp", "componentConfirmWithParent", "componentMissing"]) {
    assert.equal(th[gone], undefined, gone)
    assert.equal(en[gone], undefined, gone)
  }
})
