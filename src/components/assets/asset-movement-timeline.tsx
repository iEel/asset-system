"use client"

import { useMemo, useState } from "react"

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
    fromValue: string
    toValue: string
    noData: string
    filters: Record<string, string>
  }
}) {
  const [activeFilter, setActiveFilter] = useState("all")
  const availableFilters = useMemo(() => {
    const categories = Array.from(new Set(items.map((item) => item.category)))
    return ["all", ...categories]
  }, [items])
  const filteredItems = activeFilter === "all" ? items : items.filter((item) => item.category === activeFilter)

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {availableFilters.map((filter) => {
          const active = filter === activeFilter
          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={
                active
                  ? "inline-flex h-8 items-center rounded-md bg-primary px-3 text-xs font-medium text-white"
                  : "inline-flex h-8 items-center rounded-md border border-border bg-surface px-3 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-primary"
              }
            >
              {filter === "all" ? labels.all : labels.filters[filter] ?? filter}
            </button>
          )
        })}
      </div>

      {filteredItems.length === 0 ? (
        <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          {labels.noData}
        </div>
      ) : (
        <ol className="space-y-4">
          {filteredItems.map((movement) => (
            <li key={movement.id} className="relative border-l border-border pl-4">
              <span className={`absolute -left-1.5 top-1.5 h-3 w-3 rounded-full ${getMovementDotClass(movement.tone)}`} />
              <div className="rounded-md bg-background p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getMovementBadgeClass(movement.tone)}`}>
                        {movement.title}
                      </span>
                      <span className="text-xs text-muted-foreground">{formatDateTime(movement.performedAt)}</span>
                    </div>
                    <div className="mt-2 text-sm font-medium text-foreground">{movement.summary}</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-1 gap-2 text-sm text-muted-foreground md:grid-cols-2">
                  <Info label={labels.fromValue} value={movement.from} compact />
                  <Info label={labels.toValue} value={movement.to} compact />
                </div>
                {movement.details.length ? (
                  <div className="mt-3 grid grid-cols-1 gap-2 rounded-md border border-border bg-surface/70 p-3 text-sm text-muted-foreground md:grid-cols-2 xl:grid-cols-3">
                    {movement.details.map((detail) => (
                      <MovementInfo key={`${movement.id}-${detail.label}`} detail={detail} />
                    ))}
                  </div>
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

function MovementInfo({
  detail,
}: {
  detail: {
    label: string
    value?: string | null
    href?: string
  }
}) {
  const value = detail.value || "-"

  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{detail.label}</div>
      {detail.href && detail.value ? (
        <a href={detail.href} className="mt-0.5 block text-sm font-medium text-primary hover:underline">
          {value}
        </a>
      ) : (
        <div className="mt-0.5 text-sm text-foreground">{value}</div>
      )}
    </div>
  )
}

function Info({
  label,
  value,
  compact,
}: {
  label: string
  value?: string | number | null
  compact?: boolean
}) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className={compact ? "mt-0.5 text-sm text-foreground" : "mt-1 text-sm font-medium text-foreground"}>
        {value || "-"}
      </div>
    </div>
  )
}

function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return "-"
  return new Date(date).toLocaleString("th-TH", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

function getMovementDotClass(tone: MovementTone) {
  const map: Record<MovementTone, string> = {
    neutral: "bg-muted-foreground",
    success: "bg-success",
    info: "bg-info",
    warning: "bg-warning",
    danger: "bg-danger",
  }

  return map[tone]
}

function getMovementBadgeClass(tone: MovementTone) {
  const map: Record<MovementTone, string> = {
    neutral: "bg-muted text-muted-foreground",
    success: "bg-success/10 text-success",
    info: "bg-info/10 text-info",
    warning: "bg-warning/10 text-warning",
    danger: "bg-danger/10 text-danger",
  }

  return map[tone]
}
