import assert from "node:assert/strict"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"
import { IntlMessageFormat } from "intl-messageformat"

// An en plural reads "NaN" when its argument is a grouped string such as formatCount(1234) = "1,234", so every call
// passes the number. Thai has no plural; its value writes the argument as {count, number} so it still groups "1,234"
// (a plain {count} prints String(1234) = "1234"). Group 3 follow-ups A3, controller ruling 2026-11-01.

type Messages = Record<string, unknown>
const load = (locale: "th" | "en") => JSON.parse(readFileSync(`messages/${locale}.json`, "utf8")) as Messages
const flat = (value: Messages, prefix = ""): Array<[string, string]> =>
  Object.entries(value).flatMap(([key, child]) => (typeof child === "object" && child !== null ? flat(child as Messages, `${prefix}${key}.`) : [[`${prefix}${key}`, String(child)]]))
const th = new Map(flat(load("th")))
const en = new Map(flat(load("en")))

// key → the argument the en value pluralises (or selects on).
const pluralKeys = new Map<string, string>()
for (const [key, value] of en) {
  const match = value.match(/\{\s*(\w+)\s*,\s*(?:plural|select|selectordinal)\s*,/)
  if (match) pluralKeys.set(key, match[1])
}

function sourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const path = join(directory, entry)
    return statSync(path).isDirectory() ? sourceFiles(path) : /\.(?:ts|tsx)$/.test(entry) ? [path] : []
  })
}

test("the en plural messages are known: 78 keys, so a new one is checked by the rules below", () => {
  // Group 4 plan 2 Task 6a added 9: the asset form's required counter, section count, missing line and six section summaries.
  // Task 8 added the edit footer's "แก้ไข n ช่อง" (asset.changeCount).
  // Group 4 plan 3 Task 4 added 4: the purchase-document picker's footer and linked lines, and the edit badge "ผูกไว้ n ใบ".
  // Group 4 plan 4 Task 5 added 3: the scan page's heading with and without the matched field, and a card's components.
  // The final review of plan 4 added 1: the scan heading's "แสดง n รายการแรก" past 8 results.
  // Group 4 plan 5 Task 3 added 15: the import card (file line, column mapping, repeated problems, the 100-row note, the
  // hint under the table, the footer, the confirm button, the done line and its asset list) and the export and history
  // card (the count line, its capped variant, "10 รอบล่าสุด" and the skipped rows' "และอีก n แถว").
  // Group 4 plan 6 Task 3 added 10: the labels page's add-all line and its three counts on buttons and the rest line,
  // the room the print list has left, the queue list's name, the print list's "n ดวง", the from-register line, and the
  // bar's summary and print button. The Task 4 review added 1: the add-all line that says how many deactivated assets
  // were not added. The plan 6 final review added 1: the add-all line past 100 matches, whose b counts the first 100.
  // Group 5 plan 3 Task 4 added 1: the repair record's attachment head "n ไฟล์" (maintenancePage.attachmentCount).
  // The plan 3 final review added 4: the record's day counts while sent out or in repair, the history's attachment run
  // and the asset panel's repair count.
  // Group 5 plan 4 Task 3 added 4: the PM page's plan count, the overdue cell's "นานสุด n วัน", the cells' sum line and
  // its out-of-scope tail.
  // Group 5 plan 4 Task 4 added 6: the PM form's "+n เดือน" and "+n วัน" steps, the change count "แก้ n ช่อง", the edit
  // footer with that count, the impact title "ใช้งาน n แผน" and a custom rhythm's "ทุก n วัน".
  // The group 7 follow-ups final review added 3: the employee list's "{n} คน · ถือครองรวม {a} รายการ" (keyed on people;
  // assets is a plural too), the employee page's open audit round "{n} รายการ" and the location parent row's "ย่อย {n}".
  // Group 8 plan 1 Task 2 added 1: the companies total card's foot "รวมสาขา {b} · พนักงาน {e} · ทรัพย์สิน {a}" (keyed on
  // branches; employees and assets are plurals too).
  // Group 8 plan 1 Task 3 added 1: the branches footer "ที่ตั้ง {l} · พนักงาน {e} · ทรัพย์สิน {a}" (keyed on locations;
  // employees and assets are plurals too).
  // Group 8 plan 1 Task 4 added 2: the departments card foot "รวมพนักงาน {e} คน" and the summary line
  // "{n} แผนก · ยังมีทรัพย์สินผูกอยู่ {d} แผนก รวม {a} รายการ" (keyed on departments; withAssets and assets are plurals too).
  // Group 8 plan 2 Task 1 added 3: the categories' "รุ่นรวม {m} · ทรัพย์สินรวม {a}" (keyed on models; assets is a plural
  // too) on the total card and the footer, and the cells "{n} ช่อง" and "{n} รายการ".
  // Group 8 plan 2 Task 2 added 5: the category form's usage line (keyed on models; assets is a plural too), the template
  // head "{n} ช่อง · จำเป็น {r}", the table's caption, the rename warning "ทรัพย์สิน {n} รายการ" and the saved-values note.
  // Group 8 plan 2 Task 3 added 10: the side panel's "{n} ช่อง" and "{n} รายการ", its two notes on the existing assets,
  // the create footer "ช่องข้อมูล {f} ช่อง · รายการรูป {p} รายการ" (keyed on fields; photos is a plural too) and the
  // footer's five counted changes (เพิ่ม/แก้/ลบช่องข้อมูล, เพิ่ม/ลบรายการรูป).
  // Group 8 plan 3 Task 1 added 3: the suppliers' มีทรัพย์สิน foot "ผูกทรัพย์สินรวม {a} รายการ", the ยังไม่มีเอกสารจัดซื้อ
  // foot "ในจำนวนนี้มีทรัพย์สินผูกอยู่ {n} ราย" and the summary line (keyed on suppliers; assets and openRepairs are
  // plurals too).
  // Group 8 plan 3 Task 3 added 10: the supplier page's "{n} รายการยังไม่ผูกเอกสาร", "รวมจากใบซ่อม {n} ใบที่มีค่าใช้จ่าย",
  // the documents' description, caption and total row, "{n} เรื่อง", "เปิดงานเมื่อ {date} ({n} วัน)" (keyed on days),
  // "และอีก {n} งาน" and the repair history's two descriptions (keyed on total).
  // The plan 3 final review added 1: สิ่งที่ควรติดตาม's "ทรัพย์สิน {n} รายการยังไม่ผูกเอกสารจัดซื้อ" (the strip's count).
  // Group 9 plan 1 Task 6 added 1: the bell's name "การแจ้งเตือน มี {n} หัวข้อที่ยังไม่อ่าน" (notifications.bellLabel).
  // Group 9 plan 2 Task 2 added 9: the work center's notifications link name, "พิจารณา {n} งาน", "{n} ชิ้น", แสดงเพิ่ม,
  // the two age lines, เกิน SLA, เกินกำหนด and the due-in line (keyed on days).
  // Group 9 plan 3 Task 1 added 1: the notifications page's repair line "นานสุด {days} วัน" (keyed on days).
  // Group 9 plan 3 Task 2 added 7: the notifications page's bell line, the list's name, the backlog section's queue
  // count, a section's items, the footer sum (keyed on total), a digest day (keyed on topics; items is a plural too) and
  // ดูย้อนหลังทั้งหมด (n วัน).
  // Group 10 plan 1 Task 2 added 11: the reports header's export caption with and without filters, the strip's active
  // foot (with and without examples) and purchase foot, the group tables' count, others and view-all lines (keyed on
  // count, the dimension a select inside), the department equation (keyed on limit), and the phone export card's two counts.
  // The group 10 plan 1 final review added 2: the register's capped line under the header's exports and on the phone
  // export card ("ไฟล์มี 5,000 รายการที่เพิ่มล่าสุด จาก {n} รายการ", keyed on count).
  // Group 10 plan 2 Task 1 added 10: the operations chips line with and without filters, the warranty cell's foot (keyed
  // on days), the queue's equation (keyed on distinct; issueTotal is a plural too) and header, its export and capped line,
  // the cross-scope equation (keyed on sum; all is a plural too) and the top lists' asset and repair counts.
  // Group 10 plan 2 Task 2 added 7: the catalog's chips line "{k} จาก {n} รายงาน" (keyed on count), a group's report
  // count, the cross-scope and pending-findings descriptions (count), the findings description (keyed on total) and
  // the scope legend's line with and without filters (count).
  // Group 11 plan 1 Task 2 added 5: the user list's warning title and link (count), a left employee's held assets
  // (count), the +N roles label (count) and the phone list's "พบ {shown} จาก {total} บัญชี" (keyed on total since the plan 1 final review, so English
  // reads "1 of 5 accounts": the noun follows the total, not the shown count).
  // Group 11 plan 2 Task 4 added 4: the user form's held assets, "เลือกไว้ n บทบาท", a role's "n สิทธิ์" and the footer's
  // "เปลี่ยน n อย่าง" (all keyed on count).
  // The group 11 plan 2 look step added 1: the role list's "แสดงทั้งหมด n บทบาท" (keyed on count).
  // Group 11 plan 3 Task 3 added 2: the role list's inactive-role warning (keyed on count; users is a plural too) and a
  // role's "ยังมีผู้ใช้ n คน" (count).
  // Group 11 plan 3 Task 4 added 9: the role editor's users in the role, a group line (modules), the applies-to lines
  // with and without names (count), the footer status (users), and the add dialog's picked, confirm, done and refused (count).
  assert.equal(pluralKeys.size, 196,[...pluralKeys.keys()].join(", "))
  assert.equal(pluralKeys.get("notifications.detail.openRepairsOldest"), "days")
  assert.equal(pluralKeys.get("category.form.footerCreateCounts"), "fields")
  assert.match(en.get("category.form.footerCreateCounts") ?? "", /\{photos, plural, one \{# photo item\} other \{# photo items\}\}/)
  assert.equal(pluralKeys.get("category.form.usageLine"), "models")
  assert.match(en.get("category.form.usageLine") ?? "", /\{assets, plural, one \{# asset\} other \{# assets\}\}/)
  for (const key of ["templateCount", "templateCaption", "renameWarning", "savedValuesNote"]) assert.equal(pluralKeys.get(`category.form.${key}`), "count", key)
  assert.equal(pluralKeys.get("supplier.list.withAssetsFoot"), "assets")
  assert.equal(pluralKeys.get("supplier.list.withoutDocumentsFoot"), "count")
  assert.equal(pluralKeys.get("supplier.list.summaryLine"), "suppliers")
  assert.match(en.get("supplier.list.summaryLine") ?? "", /\{openRepairs, plural, one \{# open repair\} other \{# open repairs\}\}/)
  assert.equal(pluralKeys.get("department.summaryWithEmployeesFoot"), "employees")
  assert.equal(pluralKeys.get("department.list.summaryLine"), "departments")
  assert.equal(pluralKeys.get("branch.list.footerTotals"), "locations")
  assert.match(en.get("branch.list.footerTotals") ?? "", /\{employees, plural, one \{# employee\} other \{# employees\}\} · \{assets, plural, one \{# asset\} other \{# assets\}\}/)
  assert.equal(pluralKeys.get("company.summaryTotalFoot"), "branches")
  assert.match(en.get("company.summaryTotalFoot") ?? "", /\{employees, plural, one \{# employee\} other \{# employees\}\} · \{assets, plural, one \{# asset\} other \{# assets\}\}/)
  assert.equal(pluralKeys.get("employee.listTotals"), "people")
  assert.match(en.get("employee.listTotals") ?? "", /\{assets, plural, one \{# asset\} other \{# assets\}\}/)
  assert.equal(pluralKeys.get("employee.detail.currentAuditMeta"), "count")
  assert.equal(pluralKeys.get("location.form.parentChildCount"), "count")
  for (const [key, arg] of [["pmFormStepMonths", "n"], ["pmFormStepDays", "n"], ["pmFormChangeCount", "count"], ["pmFormFooterEdit", "count"], ["pmFormImpactTitle", "count"], ["pmFormFrequencyCustomDays", "days"]]) {
    assert.equal(pluralKeys.get(`maintenancePage.${key}`), arg, key)
  }
  assert.equal(pluralKeys.get("maintenancePage.pmPlanCount"), "count")
  assert.equal(pluralKeys.get("maintenancePage.pmDueCellOverdueFoot"), "days")
  assert.equal(pluralKeys.get("maintenancePage.pmDueSum"), "total")
  assert.equal(pluralKeys.get("maintenancePage.pmDueOutOfScope"), "count")
  assert.equal(pluralKeys.get("maintenancePage.attachmentCount"), "count")
  assert.equal(pluralKeys.get("repairRecord.detail.sentDays"), "days")
  assert.equal(pluralKeys.get("repairRecord.detail.repairDays"), "days")
  assert.equal(pluralKeys.get("repairRecord.detail.attachedFiles"), "count")
  assert.equal(pluralKeys.get("repairRecord.detail.assetRepairHistory"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addAllSummary"), "matched")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addAllSummaryFirst100"), "matched")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addAll"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addSome"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addRemaining"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addAllRoom"), "room")
  assert.equal(pluralKeys.get("assetTools.labelsPage.addAllSkipped"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.queueListLabel"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.listCount"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.fromRegister"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.barSummary"), "count")
  assert.equal(pluralKeys.get("assetTools.labelsPage.print"), "count")
  assert.equal(pluralKeys.get("asset.importPage.dropzoneHint"), "count")
  assert.equal(pluralKeys.get("asset.importPage.mappingMatched"), "total")
  assert.equal(pluralKeys.get("asset.importPage.mappingMissingOptional"), "count")
  assert.equal(pluralKeys.get("asset.importPage.mappingMissingRequired"), "count")
  assert.equal(pluralKeys.get("asset.importPage.issueSummaryRows"), "count")
  assert.equal(pluralKeys.get("asset.importPage.shownFirst"), "count")
  assert.equal(pluralKeys.get("asset.importPage.tableHint"), "errors")
  // Its ready count is a plural too, so one ready row reads "the 1 ready row" (plan 5 final review).
  assert.match(en.get("asset.importPage.tableHint") ?? "", /\{ready, plural, one \{the # ready row\} other \{the # ready rows\}\}/)
  assert.equal(pluralKeys.get("asset.importPage.footerSummary"), "ready")
  assert.equal(pluralKeys.get("asset.importPage.confirm"), "count")
  assert.equal(pluralKeys.get("asset.importPage.doneSummary"), "imported")
  assert.equal(pluralKeys.get("asset.importPage.doneMoreAssets"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.exportAllCount"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.exportAllCapped"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.historyRecent"), "count")
  assert.equal(pluralKeys.get("assetTools.importExportPage.skippedRowsMore"), "count")
  assert.equal(pluralKeys.get("assetTools.scanShownFirst"), "shown")
  assert.equal(pluralKeys.get("assetTools.scanFound"), "count")
  assert.equal(pluralKeys.get("assetTools.scanFoundMatch"), "count")
  assert.equal(pluralKeys.get("assetTools.scanComponentsValue"), "count")
  // Group 4 plan 4 Task 3: the components page's count line, photo count and the remove dialog's count.
  assert.equal(pluralKeys.get("asset.componentHistoryCount"), "total")
  assert.equal(pluralKeys.get("asset.componentPhotoCount"), "count")
  assert.equal(pluralKeys.get("asset.componentCountValue"), "count")
  assert.equal(pluralKeys.get("asset.changeCount"), "count")
  assert.equal(pluralKeys.get("asset.purchaseDocumentSearchFooter"), "count")
  assert.equal(pluralKeys.get("asset.purchaseDocumentLinkedNames"), "count")
  assert.equal(pluralKeys.get("asset.purchaseDocumentLinkedCount"), "count")
  assert.equal(pluralKeys.get("asset.sectionSummary.documentsLinked"), "count")
  assert.equal(pluralKeys.get("asset.requiredFilled"), "total")
  assert.equal(pluralKeys.get("asset.sectionFilled"), "total")
  assert.equal(pluralKeys.get("asset.requiredMissing"), "count")
  assert.equal(pluralKeys.get("common.searchSelectResultCount"), "count")
  assert.equal(pluralKeys.get("session.idleWarningSr"), "minutes")
  assert.equal(pluralKeys.get("adminUsersPage.foundCount"), "total")
  assert.equal(pluralKeys.get("adminRolesPage.inactiveWarning"), "count")
  assert.equal(pluralKeys.get("adminRolesPage.stillHasUsers"), "count")
})

test("no source call passes formatCount(…) into a message whose en value is a plural", () => {
  const offenders: string[] = []
  for (const file of sourceFiles("src")) {
    const source = readFileSync(file, "utf8")
    // The namespace of each translator in the file: const t = useTranslations("ns") or await getTranslations("ns").
    const namespaces = new Map([...source.matchAll(/const (\w+) = (?:await )?(?:useTranslations|getTranslations)\(\s*"([\w.]+)"\s*\)/g)].map((match) => [match[1], match[2]]))
    for (const [key, arg] of pluralKeys) {
      const last = key.slice(key.lastIndexOf(".") + 1)
      const call = new RegExp(String.raw`(\w*)\(\s*"((?:[\w.]+\.)?${last})"\s*,\s*\{[^}]*\b${arg}\s*:\s*formatCount\(`, "g")
      for (const match of source.matchAll(call)) {
        // Group 11 plan 1 Task 2: a call whose translator's namespace is known and that names another key with the same
        // last segment (batchCheckin.reviewTitle, not adminUsersPage.reviewTitle) is not this plural.
        const namespace = namespaces.get(match[1])
        if (namespace !== undefined && `${namespace}.${match[2]}` !== key) continue
        offenders.push(`${file}:${source.slice(0, match.index).split("\n").length} ${key}`)
      }
    }
  }
  assert.deepEqual(offenders, [])
})

test("the th value of every en plural message writes its argument as {<arg>, number}, never a plain {<arg>}", () => {
  const wrong = [...pluralKeys].filter(([key, arg]) => {
    const value = th.get(key) ?? ""
    return !value.includes(`{${arg}, number}`) || new RegExp(String.raw`\{\s*${arg}\s*\}`).test(value)
  })
  assert.deepEqual(wrong.map(([key]) => key), [])
})

test("common.searchSelectResultCount reads 1234 grouped in both languages through intl-messageformat, never NaN", () => {
  const read = (locale: "th" | "en", count: unknown) => String(new IntlMessageFormat(locale === "th" ? th.get("common.searchSelectResultCount")! : en.get("common.searchSelectResultCount")!, locale).format({ count }))
  assert.equal(read("en", 1234), "1,234 results")
  assert.equal(read("en", 1), "1 result")
  assert.equal(read("th", 1234), "พบ 1,234 รายการ")
  assert.doesNotMatch(read("en", 1234), /NaN/)
})
