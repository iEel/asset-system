"use client"

import type React from "react"
import Link from "next/link"
import { useTranslations } from "next-intl"
import { Field } from "@/components/ui/field"
import { NativeSelect } from "@/components/ui/native-select"
import { StatusBadge } from "@/components/ui/status-badge"
import { SETTINGS_GROUPS, type SettingsGroupKey } from "@/lib/settings-page-model"
import type { SettingsTabId } from "@/lib/settings-information-architecture"
import { cn } from "@/lib/utils"

export type SettingsMenuItem = {
  tab: SettingsTabId
  label: string
  // The tab's own URL (?tab=), so Ctrl+click opens it in a new tab.
  href: string
  // One line from the values on screen (the old overview panel); null when the tab has none.
  summary: React.ReactNode
  unsaved: number
}

// The settings page's left menu (board AD-Settings, group 12 plan 5 Task 3): the eleven tabs under the four group
// headings, each with its one-line summary and an unsaved badge; each heading counts its group's unsaved values. The
// settings search sits on top. A plain click runs onSelect through Link onNavigate, which cancels the navigation and
// switches in place, so unsaved edits stay; Ctrl+click opens the tab's URL.
// Below lg (my call): the search, a jump select over the same items (grouped, with the unsaved count in the option
// text) and the stacked list itself in a disclosure, so a phone reaches the summaries without a long list above the form.
export function SettingsMenu({
  items,
  activeTab,
  groupUnsaved,
  search,
  onSelect,
  "aria-label": ariaLabel,
}: {
  items: readonly SettingsMenuItem[]
  activeTab: SettingsTabId
  groupUnsaved: Partial<Record<SettingsGroupKey, number>>
  search: React.ReactNode
  onSelect: (tab: SettingsTabId) => void
  "aria-label": string
}) {
  const t = useTranslations("systemSettingsPage")
  const byTab = new Map(items.map((item) => [item.tab, item]))
  const groups = SETTINGS_GROUPS.map((group) => ({
    key: group.key,
    items: group.tabs.map((tab) => byTab.get(tab)).filter((item): item is SettingsMenuItem => Boolean(item)),
  }))

  // Rendered twice (the lg sidebar and the phone disclosure), so each copy gets its own heading ids.
  const renderList = (idPrefix: string) => (
    <div className="space-y-4">
      {groups.map((group) => {
        const groupCount = groupUnsaved[group.key] ?? 0
        return (
          <section key={group.key} aria-labelledby={`${idPrefix}-${group.key}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 px-2">
              <h2 id={`${idPrefix}-${group.key}`} className="text-meta font-semibold text-muted-foreground">
                {t(`menuGroup.${group.key}`)}
              </h2>
              {groupCount > 0 ? <StatusBadge tone="primary" label={t("unsavedBadge", { count: groupCount })} /> : null}
            </div>
            <ul className="space-y-0.5">
              {group.items.map((item) => {
                const selected = item.tab === activeTab
                return (
                  <li key={item.tab}>
                    <Link
                      href={item.href}
                      scroll={false}
                      aria-current={selected ? "page" : undefined}
                      onNavigate={(event) => {
                        event.preventDefault()
                        onSelect(item.tab)
                      }}
                      className={cn(
                        "block min-w-0 rounded-md px-2 py-2 transition-colors motion-reduce:transition-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                        selected ? "bg-primary-soft text-foreground forced-colors:border forced-colors:border-[CanvasText]" : "text-foreground hover:bg-row-hover",
                      )}
                    >
                      <span className="flex min-w-0 items-center justify-between gap-2">
                        <span className={cn("min-w-0 truncate text-sm", selected ? "font-semibold" : "font-medium")}>{item.label}</span>
                        {item.unsaved > 0 ? <StatusBadge tone="primary" label={t("unsavedBadge", { count: item.unsaved })} /> : null}
                      </span>
                      {item.summary ? <span className="mt-0.5 block min-w-0 truncate text-meta text-muted-foreground">{item.summary}</span> : null}
                    </Link>
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}
    </div>
  )

  return (
    <nav aria-label={ariaLabel} data-slot="settings-menu" className="min-w-0 space-y-4 lg:sticky lg:top-0 lg:max-h-[calc(100dvh_-_var(--shell-top)_-_8rem)] lg:overflow-y-auto lg:overscroll-contain">
      {search}
      <div className="hidden lg:block">{renderList("settings-menu")}</div>
      <div className="space-y-3 lg:hidden">
        <Field label={t("menuJump")}>
          <NativeSelect
            id="settings-menu-jump"
            value={activeTab}
            onChange={(event) => onSelect(event.target.value as SettingsTabId)}
          >
            {groups.map((group) => (
              <optgroup key={group.key} label={t(`menuGroup.${group.key}`)}>
                {group.items.map((item) => (
                  <option key={item.tab} value={item.tab}>
                    {item.unsaved > 0 ? `${item.label} · ${t("unsavedBadge", { count: item.unsaved })}` : item.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </NativeSelect>
        </Field>
        <details className="rounded-md border border-border px-2 py-2">
          <summary className="cursor-pointer px-2 text-sm font-medium text-foreground">{t("menuShowAll")}</summary>
          <div className="mt-3">{renderList("settings-menu-phone")}</div>
        </details>
      </div>
    </nav>
  )
}
