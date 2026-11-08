"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
import { linkVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { Nil } from "@/components/ui/nil"
import { StatusBadge } from "@/components/ui/status-badge"
import { SETTING_LABEL_KEYS, SETTING_LABEL_NAMESPACE, reviewValue } from "@/lib/settings-page-model"
import type { SettingsTabId } from "@/lib/settings-information-architecture"

export type SettingsReviewRow = {
  key: string
  before: string
  after: string
  tab: SettingsTabId
  // The tab's own URL, so Ctrl+click opens it.
  href: string
}

// The change review (board AD-Settings, group 12 plan 5 Task 3): the Thai setting name first with the key small in mono
// (a link to its tab; a plain click switches in place), then the saved and the new value as reviewValue formats them:
// เปิดใช้งาน / ปิดใช้งาน for a switch, a secret never shows (a new one reads เปลี่ยนรหัสผ่าน), and a default role that
// no longer exists is tagged ไม่พบบทบาท, and any other value goes through the page's valueLabel (a select's option, a
// preset schedule, a role by its name, the prefix groups and the depreciation policy in words, never raw codes or JSON).
// A key the page has no label for (the advanced table) shows the key alone.
export function SettingsReviewTable({
  rows,
  roleNames,
  valueLabel,
  onOpenTab,
}: {
  rows: readonly SettingsReviewRow[]
  roleNames: Set<string>
  // A stored value → its words on the page (the same function as the "เดิม" marker); a value it does not know stays.
  valueLabel: (key: string, text: string) => string
  onOpenTab: (tab: SettingsTabId) => void
}) {
  const t = useTranslations(SETTING_LABEL_NAMESPACE)
  const tCommon = useTranslations("common")

  const display = (key: string, raw: string, side: "before" | "after") => {
    const value = reviewValue(key, raw, { roleNames })
    switch (value.kind) {
      case "bool":
        return value.on ? t("enabled") : t("disabled")
      case "secret":
        // The saved side never says more than that a password is there; the new side says it changes.
        if (!raw) return <Nil />
        return side === "after" ? t("reviewSecretChanged") : "••••••••"
      case "missingRole":
        return (
          <span className="inline-flex flex-wrap items-center gap-2">
            <span className="tag">{value.name}</span>
            <StatusBadge tone="warning" label={t("reviewRoleMissing")} />
          </span>
        )
      case "text":
        if (!value.text.trim()) return <Nil />
        return valueLabel(key, value.text)
    }
  }

  return (
    <ContentPanel divided flush className="overflow-hidden" title={t("changeReview")} description={t("changeReviewDescription")}>
      <DataTable framed={false} caption={t("changeReview")} scrollHint={tCommon("tableScrollHint")}>
        <DataTableHeader>
          <tr>
            <DataTableHead>{t("reviewSetting")}</DataTableHead>
            <DataTableHead>{t("beforeValue")}</DataTableHead>
            <DataTableHead>{t("afterValue")}</DataTableHead>
          </tr>
        </DataTableHeader>
        <DataTableBody>
          {rows.map((row) => {
            const labelKey = SETTING_LABEL_KEYS[row.key]
            return (
              <DataTableRow key={row.key}>
                <DataTableCell className="min-w-56">
                  <Link
                    href={row.href}
                    scroll={false}
                    onNavigate={(event) => {
                      event.preventDefault()
                      onOpenTab(row.tab)
                    }}
                    className={linkVariants({ size: "inherit" })}
                  >
                    {labelKey ? <span className="block font-medium">{t(labelKey)}</span> : null}
                    <span className="block text-meta text-muted-foreground"><span className="tag">{row.key}</span></span>
                  </Link>
                </DataTableCell>
                <DataTableCell className="max-w-md break-words text-muted-foreground">{display(row.key, row.before, "before")}</DataTableCell>
                <DataTableCell className="max-w-md break-words font-medium text-foreground">{display(row.key, row.after, "after")}</DataTableCell>
              </DataTableRow>
            )
          })}
        </DataTableBody>
      </DataTable>
    </ContentPanel>
  )
}
