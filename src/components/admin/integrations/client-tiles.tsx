"use client"

import { useTranslations } from "next-intl"
import type { IntegrationLabels } from "@/components/admin/IntegrationClientManager"
import { Segmented } from "@/components/ui/segmented"
import { StatStrip } from "@/components/ui/stat-strip"
import { formatCount } from "@/lib/display-format"
import type { IntegrationStatusFilter, integrationSummary } from "@/lib/integration-clients-page-model"
import { cn } from "@/lib/utils"

// Board AD-Integrations (group 12 spec §10): four tiles. The usage tile reads "การใช้งาน · 7 วัน" with the count in
// ครั้ง and the 7-day errors as its foot.
export function ClientTiles({ summary, labels }: { summary: ReturnType<typeof integrationSummary>; labels: IntegrationLabels }) {
  const t = useTranslations("integrationApiPage")
  return (
    <StatStrip
      items={[
        { key: "active", label: labels.summaryActive, value: formatCount(summary.active) },
        { key: "disabled", label: labels.summaryDisabled, value: formatCount(summary.disabled) },
        { key: "usedEver", label: labels.summaryLastUsed, value: formatCount(summary.usedEver) },
        { key: "usage", label: t("usageTile"), value: formatCount(summary.calls7d), unit: t("usageUnit"), foot: t("usageErrors", { count: summary.errors7d }) },
      ]}
    />
  )
}

const filters: readonly IntegrationStatusFilter[] = ["all", "active", "disabled"]

// ทั้งหมด / เปิดใช้งาน / ปิดใช้งาน with counts. The filter is client state (the list loads in the browser), so the chips
// are the shared Segmented toggle buttons (aria-pressed), not links.
export function ClientStatusChips({
  value,
  counts,
  labels,
  onChange,
}: {
  value: IntegrationStatusFilter
  counts: Record<IntegrationStatusFilter, number>
  labels: IntegrationLabels
  onChange: (filter: IntegrationStatusFilter) => void
}) {
  const t = useTranslations("integrationApiPage")
  const labelOf = (filter: IntegrationStatusFilter) => (filter === "all" ? t("filterAll") : filter === "active" ? labels.active : labels.disabled)
  return (
    <Segmented
      aria-label={t("filterLabel")}
      value={value}
      onValueChange={onChange}
      options={filters.map((filter) => ({
        value: filter,
        label: (
          <span className="inline-flex items-center gap-1.5">
            {labelOf(filter)}
            <span className={cn("num", filter === value ? "text-primary" : "text-faint-foreground")}>{formatCount(counts[filter])}</span>
          </span>
        ),
      }))}
    />
  )
}
