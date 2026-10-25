import assert from "node:assert/strict"
import { readFileSync } from "node:fs"
import test from "node:test"
import { getNotificationBellNameKey, getNotificationHeaderAction, getNotificationRowState } from "../src/lib/notification-groups.ts"
const read = (path: string) => readFileSync(path, "utf8").replace(/\r/g, "")

test("a row is unread, read or snoozed; the bell's name and header follow the unread total (menu B shell task 7)", () => {
  assert.equal(getNotificationRowState({}), "unread"); assert.equal(getNotificationRowState({ isRead: true }), "read")
  assert.equal(getNotificationRowState({ isSnoozed: true }), "snoozed"); assert.equal(getNotificationRowState({ isRead: true, isSnoozed: true }), "read")
  assert.equal(getNotificationBellNameKey(null), "title"); assert.equal(getNotificationBellNameKey({ total: 0, items: [] }), "bellEmpty")
  assert.equal(getNotificationBellNameKey({ total: 0, items: [{}] }), "title"); assert.equal(getNotificationBellNameKey({ total: 4, items: [{}] }), "bellLabel")
  assert.equal(getNotificationHeaderAction(null), null); assert.equal(getNotificationHeaderAction({ total: 0, items: [] }), null)
  assert.equal(getNotificationHeaderAction({ total: 0, items: [{}] }), "allRead"); assert.equal(getNotificationHeaderAction({ total: 2, items: [{}] }), "markAllRead")
})

test("the bell reads the shell context, names its count, lists every row in two groups and dims read rows by ink (menu B shell task 7)", () => {
  const bell = read("src/components/layout/notification-bell.tsx")
  assert.match(bell, /const \{ summary, markRead, markAllRead \} = useShellNotifications\(\)/)
  assert.match(bell, /const total = summary\?\.total \?\? 0/); assert.match(bell, /const items = summary\?\.items \?\? \[\]/)
  assert.doesNotMatch(bell, /fetch\(|addEventListener\(|isSuppressed|readPill|\bopacity-/)
  assert.match(bell, /const bellName = tNotifications\(getNotificationBellNameKey\(summary\), \{ count: total \}\)/); assert.match(bell, /aria-label=\{bellName\}/)
  assert.match(bell, /<span aria-hidden="true" className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-danger px-1 text-xs font-semibold leading-none text-danger-foreground">/)
  assert.match(bell, /\{total > 99 \? "99\+" : total\}/)
  assert.match(bell, /<PopoverContent align="end" className="w-\[calc\(100vw-2rem\)\] max-w-\[22rem\] p-0" aria-labelledby=\{titleId\}>/)
  assert.match(bell, /tabIndex=\{-1\} className="text-sm font-semibold text-foreground outline-none"/)
  assert.match(bell, /const \{ decide, follow \} = groupNotificationItems\(items\)/); assert.match(bell, /tNotifications\("groupDecide"\)[\s\S]*tNotifications\("groupFollow"\)/)
  assert.match(bell, /statusMarkerVariants\(\{ tone: rowState === "unread" \? item\.tone : "muted" \}\)/)
  assert.match(bell, /<StatusBadge label=\{tNotifications\("read"\)\} tone="muted" \/>/); assert.match(bell, /<StatusBadge label=\{tNotifications\("snoozed"\)\} tone="muted" \/>/)
  assert.match(bell, /<Button variant="ghost" size="sm" busy=\{markingAll\} onClick=\{\(\) => void handleMarkAllRead\(\)\}>\s*\{tNotifications\("markAllRead"\)\}/)
  assert.match(bell, /if \(await markAllRead\(\)\) titleRef\.current\?\.focus\(\)\s*else toast\.error\(tNotifications\("saveFailed"\)\)/)
  assert.match(bell, /tNotifications\("allRead"\)/); assert.match(bell, /tNotifications\("updatedAt", \{ time: /)
  assert.match(bell, /<ActionEmptyState icon=\{<CircleCheck \/>\} title=\{tNotifications\("bellEmpty"\)\} description=\{tNotifications\("bellEmptyDetail"\)\} \/>/)
  assert.match(bell, /if \(getNotificationRowState\(item\) === "unread" && !\(await markRead\(item\.key\)\)\) toast\.error\(tNotifications\("saveFailed"\)\)/)
  assert.match(bell, /finally\s*\{[\s\S]*router\.push\(item\.href\)/)
  const topbar = read("src/components/layout/topbar.tsx")
  assert.match(topbar, /<div className="relative shrink-0">\s*<NotificationBell user=\{user\} \/>\s*<\/div>/)
  assert.doesNotMatch(topbar, /useTranslations\("notifications"\)|PopoverContent|useShellNotifications|\/work-center|\{\/\* Notifications \*\/\}/)
})

test("bell messages (Thai per the glossary) (menu B shell task 7)", () => {
  const CHANGE = { "set": {
    "th": { "notifications.bellLabel": "การแจ้งเตือน {count} รายการ", "notifications.bellEmpty": "ไม่มีงานค้าง", "notifications.bellEmptyDetail": "งานที่รอคุณตัดสินหรือควรติดตามจะขึ้นที่นี่", "notifications.groupDecide": "รอคุณตัดสิน", "notifications.groupFollow": "ควรติดตาม", "notifications.markAllRead": "อ่านแล้วทั้งหมด", "notifications.allRead": "อ่านครบแล้ว", "notifications.updatedAt": "อัปเดต {time} น.", "notifications.openNotificationCenter": "เปิดศูนย์แจ้งเตือน" },
    "en": { "notifications.bellLabel": "Notifications, {count} waiting", "notifications.bellEmpty": "Nothing waiting", "notifications.bellEmptyDetail": "Work that waits for your decision or needs follow-up shows up here.", "notifications.groupDecide": "Waiting for your decision", "notifications.groupFollow": "Follow up", "notifications.markAllRead": "Mark all read", "notifications.allRead": "All read", "notifications.updatedAt": "Updated {time}", "notifications.openNotificationCenter": "Open Notification Center" } },
    "delete": ["notifications.subtitle"] }
  for (const locale of ["th", "en"] as const) {
    const m = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")).notifications
    for (const [key, value] of Object.entries(CHANGE.set[locale])) assert.equal(m[key.replace("notifications.", "")], value, `${locale} ${key}`)
    assert.equal(m.read, { th: "อ่านแล้ว", en: "Read" }[locale]); assert.equal(m.title, { th: "การแจ้งเตือน", en: "Notifications" }[locale])
    assert.equal(m.readPill, undefined); assert.equal(m.subtitle, undefined)
  }
})
