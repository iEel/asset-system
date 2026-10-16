"use client"

import { useId, useMemo, useState } from "react"
import { statusMarkerVariants } from "@/components/ui/badge-variants"
import { linkVariants } from "@/components/ui/button-variants"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { KeyValueList } from "@/components/ui/key-value-list"
import { StatusBadge } from "@/components/ui/status-badge"
import { cn, formatDateTime } from "@/lib/utils"

type MovementTone = "neutral" | "success" | "info" | "warning" | "danger"

export type AssetMovementTimelineItem = {
  id: string
  title: string
  summary: string
  category: string
  tone: MovementTone
  performedAt: string
  from: string | null
  to: string | null
  reason: string | null
  details: {
    label: string
    value?: string | null
    href?: string
  }[]
}

export function AssetMovementTimeline({
  items,
  labels,
}: {
  items: AssetMovementTimelineItem[]
  labels: {
    all: string
    filterLabel: string
    fromValue: string
    toValue: string
    noData: string
    filters: Record<string, string>
  }
}) {
  const filterName = useId()
  const [activeFilter, setActiveFilter] = useState("all")
  const availableFilters = useMemo(() => {
    const categories = Array.from(new Set(items.map((item) => item.category)))
    return ["all", ...categories]
  }, [items])
  const filteredItems = activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter)

  return (
    <div className="space-y-4">
      {/* Spec 2D D19: one filter is on at a time, so the filters are radio ChoiceChips in a named group; they wrap at 375. */}
      <fieldset className="min-w-0">
        <legend className="sr-only">{labels.filterLabel}</legend>
        <div className="flex flex-wrap gap-2">
          {availableFilters.map((filter) => (
            <ChoiceChip
              key={filter}
              type="radio"
              name={filterName}
              checked={filter === activeFilter}
              onChange={() => setActiveFilter(filter)}
              label={filter === "all" ? labels.all : labels.filters[filter] ?? filter}
            />
          ))}
        </div>
      </fieldset>

      {filteredItems.length === 0 ? (
        <EmptyNote>{labels.noData}</EmptyNote>
      ) : (
        <ol className="space-y-4">
          {filteredItems.map((movement) => (
            <li key={movement.id} className="relative border-l border-border pl-4">
              {/* The tone is a status shape on the line, and the badge says it in words (spec 2D M22). */}
              <span aria-hidden="true" className={cn(statusMarkerVariants({ tone: movement.tone }), "absolute top-2 -left-1")} />
              <div className="rounded-md bg-background p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge label={movement.title} tone={movement.tone} />
                  <span className="text-meta text-muted-foreground">{formatDateTime(movement.performedAt)}</span>
                </div>
                <div className="mt-2 text-sm font-medium text-foreground">{movement.summary}</div>
                <KeyValueList
                  className="mt-3"
                  items={[
                    { key: "from", label: labels.fromValue, value: movement.from },
                    { key: "to", label: labels.toValue, value: movement.to },
                  ]}
                />
                {movement.details.length ? (
                  <KeyValueList
                    className="mt-3 border-t border-border-soft pt-3"
                    items={movement.details.map((detail) => ({
                      key: detail.label,
                      label: detail.label,
                      value:
                        detail.href && detail.value ? (
                          <a href={detail.href} className={linkVariants({ size: "inherit" })}>
                            {detail.value}
                          </a>
                        ) : (
                          detail.value
                        ),
                    }))}
                  />
                ) : null}
                {movement.reason && <p className="mt-2 text-sm text-muted-foreground">{movement.reason}</p>}
              </div>
            </li>
          ))}
        </ol>
      )}
    </div>
  )
}
