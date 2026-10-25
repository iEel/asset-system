import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { pickShellBanner } from "../src/lib/shell-banner.ts"
import { readOnlineStatus, subscribeOnlineStatus } from "../src/lib/use-online-status.ts"

const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")

test("offline wins the banner and carries the page's line; the session message shows only online (menu B shell §6.7)", () => {
  assert.equal(pickShellBanner({ online: true, session: null, pageLine: null }), null)
  assert.equal(pickShellBanner({ online: true, session: null, pageLine: "q" }), null, "the page line rides on the offline message only")
  assert.deepEqual(pickShellBanner({ online: false, session: null, pageLine: null }), { kind: "offline", pageLine: null })
  assert.deepEqual(pickShellBanner({ online: false, session: "s", pageLine: "q" }), { kind: "offline", pageLine: "q" })
  assert.deepEqual(pickShellBanner({ online: true, session: "s", pageLine: "q" }), { kind: "session", session: "s" })
})

test("useOnlineStatus reads navigator.onLine (true with no navigator) and follows the online and offline events", () => {
  assert.equal(readOnlineStatus(undefined), true)
  assert.equal(readOnlineStatus({ onLine: false }), false)
  const target = new EventTarget(); let calls = 0
  const stop = subscribeOnlineStatus(target, () => { calls += 1 })
  target.dispatchEvent(new Event("offline")); target.dispatchEvent(new Event("online"))
  assert.equal(calls, 2)
  stop(); target.dispatchEvent(new Event("offline"))
  assert.equal(calls, 2)
  assert.match(read("src/lib/use-online-status.ts"), /useSyncExternalStore\(\s*\(onChange\) => subscribeOnlineStatus\(window, onChange\),\s*\(\) => readOnlineStatus\(navigator\),\s*\(\) => true,?\s*\)/)
})

test("the shell has one banner region between the top bar and main: a polite status in the warning fill, its height in --shell-banner (§6.7, The One Banner Rule)", () => {
  const banner = read("src/components/layout/shell-banner.tsx")
  assert.match(banner, /<div\s+ref=\{regionRef\}\s+role="status"\s+data-shell-banner/)
  assert.match(banner, /"flex items-start gap-2 border-b border-warning-border bg-warning-soft px-4 py-2 text-sm text-warning sm:px-6"/)
  assert.match(banner, /const online = useOnlineStatus\(\)/)
  assert.match(banner, /pickShellBanner\(\{ online, session, pageLine \}\)/)
  assert.match(banner, /tCommon\("offlineBanner"\)/)
  assert.match(banner, /view\.pageLine \? tCommon\("offlineBannerWith", \{ detail: view\.pageLine \}\) : tCommon\("offlineBanner"\)/)
  assert.match(banner, /<WifiOff aria-hidden="true"/)
  assert.match(banner, /new ResizeObserver\(/)
  assert.match(banner, /setProperty\("--shell-banner", /)
  assert.match(banner, /removeProperty\("--shell-banner"\)/)
  assert.equal(banner.match(/createContext</g)?.length, 2, "stable setters apart from the state, so a slot never re-renders itself")
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /<ShellBannerProvider>/)
  const at = ["<Topbar", "<ShellBanner />", "<main"].map((m) => shell.indexOf(m))
  assert.ok(at[0] > 0 && at[0] < at[1] && at[1] < at[2], `order ${at}`)
})

test("the audit scan page's offline line moves into the region; its queue tools stay on the page (§6.7 ruling)", () => {
  const workspace = read("src/components/audit/audit-scan-workspace.tsx")
  assert.match(workspace, /const online = useOnlineStatus\(\)/)
  assert.match(workspace, /useShellBannerSlot\(sendableQueue\.length > 0 \? t\("bannerQueued", \{ count: sendableQueue\.length \}\) : t\("bannerOfflineSaves"\)\)/)
  assert.doesNotMatch(workspace, /setOnline|addEventListener\("offline"/)
  assert.match(workspace, /window\.addEventListener\("online", handleOnline\)/)
  const bar = read("src/components/audit/audit-scan-offline-bar.tsx")
  assert.match(bar, /const failed = queue\.filter\(\(entry\) => entry\.syncStatus === "failed"\)\n\s+if \(\(queue\.length === 0 \|\| \(!online && failed\.length === 0\)\) && held\.length === 0\) return null/)
  assert.match(bar, /title=\{queue\.length > 0 \? t\("offlineBarPending", \{ count: queue\.length \}\) : undefined\}/)
  assert.doesNotMatch(bar, /offlineBarOffline/)
  const copy = {
    th: ["ออฟไลน์อยู่ · บันทึกไม่ได้จนกว่าจะกลับมาออนไลน์", "การตรวจนับ {count} รายการรอส่ง จะส่งเองเมื่อออนไลน์", "ออฟไลน์อยู่ · {detail}", "ผลตรวจนับจะเก็บไว้ในเครื่อง แล้วส่งเองเมื่อออนไลน์"],
    en: ["You're offline · Nothing can be saved until you're back online", "{count} audit checks waiting to send · they send by themselves once you're online", "You're offline · {detail}", "Checks are kept on this device and send by themselves once you're online"],
  }
  for (const [locale, [offline, queued, offlineWith, offlineSaves]] of Object.entries(copy)) {
    const messages = JSON.parse(read(`messages/${locale}.json`))
    assert.equal(messages.common.offlineBanner, offline, locale)
    assert.equal(messages.auditScan.bannerQueued, queued, locale)
    assert.equal(messages.common.offlineBannerWith, offlineWith, locale)
    assert.equal(messages.auditScan.bannerOfflineSaves, offlineSaves, locale)
    assert.equal(messages.auditScan.offlineBarOffline, undefined, locale)
  }
})
