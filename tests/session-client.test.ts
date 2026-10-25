import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"

const read = (p: string) => readFileSync(p, "utf8").replace(/\r/g, "")

test("the layout reads the session once and the shell mounts one SessionKeeper with its clock", () => {
  const layout = read("src/app/[locale]/(dashboard)/layout.tsx")
  assert.match(layout, /const shell = await getShellSession\(\)\n\s+if \(!shell\) return redirectToLogin\(locale\)\n\s+const \{ user \} = shell/)
  assert.match(layout, /<DashboardShell user=\{user\} account=\{account\} initialSidebar=\{initialSidebar\} sessionClock=\{shell\.clock\}>/)
  const shell = read("src/components/layout/dashboard-shell.tsx")
  assert.match(shell, /sessionClock: SessionClock \| null/)
  assert.equal(shell.match(/<SessionKeeper initialClock=\{sessionClock\} \/>/g)?.length, 1)
})

test("SessionKeeper asks the status on mount, turns input into a throttled keep-alive and asks the server before it warns or signs out", () => {
  const s = read("src/components/layout/session-keeper.tsx")
  assert.match(s, /^"use client"/)
  assert.match(s, /export function SessionKeeper\(\{ initialClock \}: \{ initialClock: SessionClock \| null \}\)/)
  assert.match(s, /const \[lastCheckAt, setLastCheckAt\] = useState<number \| null>\(null\)/)
  assert.match(s, /nextSessionStep\(\{ online, times, offsetMs, now: clientNow, lastCheckAt \}\)/)
  assert.match(s, /readSessionAnswer\(/); assert.match(s, /shouldSendKeepAlive\(/); assert.match(s, /planSessionTimers\(/)
  assert.match(s, /for \(const type of SESSION_ACTIVITY_EVENTS\) window\.addEventListener\(type, onActivity, \{ capture: true, passive: true \}\)/)
  assert.match(s, /fetch\("\/api\/session\/keep-alive", \{ method: "POST", cache: "no-store", keepalive: true \}\)/)
  assert.match(s, /fetch\("\/api\/session\/status", \{ cache: "no-store" \}\)/)
  assert.match(s, /redirectToSessionExpiredLogin\(locale\)/)
  assert.match(s, /const online = useOnlineStatus\(\)/); assert.match(s, /useShellBannerSession\(bannerContent\)/)
  assert.match(s, /document\.addEventListener\("visibilitychange"/); assert.match(s, /t\("stay"\)/); assert.match(s, /t\("ceilingWarning"/)
  assert.match(s, /aria-hidden="true"/); assert.match(s, /t\("idleWarningSr"/)
  assert.doesNotMatch(s, /next-auth\/react|useSession|window\.location|useShellBannerSlot/)
  assert.equal(s.match(/setInterval\(/g)?.length, 1); assert.match(s, /setInterval\(\(\) => setClientNow\(Date\.now\(\)\), 1000\)/)
})

test("an API 401 sends the person to the login with the reason instead of only a toast", () => {
  const hook = read("src/components/ui/use-api-error.ts")
  assert.match(hook, /if \(isUnauthorizedError\(error\) && redirectToSessionExpiredLogin\(locale\)\) return/)
  assert.match(hook, /toast\.error\(message, detail \? \{ description: detail \} : undefined\)/)
  assert.match(read("src/components/ui/api-error-text.tsx"), /if \(isUnauthorizedError\(error\)\) redirectToSessionExpiredLogin\(locale\)/)
  const expiry = read("src/lib/session-expiry.ts")
  assert.match(expiry, /window\.location\.assign\(href\)/); assert.match(expiry, /navigator\.onLine/)
})

test("the session copy is the spec's", () => {
  const th = JSON.parse(readFileSync("messages/th.json", "utf8")).session
  assert.equal(th.stay, "อยู่ในระบบต่อ")
  assert.equal(th.idleWarning, "จะออกจากระบบใน {time} นาทีเพราะไม่มีการใช้งาน · งานที่กรอกค้างไว้ยังไม่ถูกบันทึก")
  assert.equal(th.ceilingWarning, "จะออกจากระบบเวลา {time} · ครบ {hours} ชั่วโมงของการเข้าระบบ บันทึกงานก่อนแล้วเข้าใหม่")
})
