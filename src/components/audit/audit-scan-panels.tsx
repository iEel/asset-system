"use client"

import Link from "next/link"
import { useState, type ReactNode } from "react"
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  Keyboard,
  ListChecks,
  Loader2,
  ScanLine,
  Search,
  WifiOff,
} from "lucide-react"
import {
  buildPendingQueueContext,
  isAuditComponentChecked,
} from "./audit-scan-helpers"
import type {
  AuditRecentScan,
  AuditScanComponent,
  AuditScanItem,
  LastAuditResult,
  Option,
  OptionLabelMaps,
  PendingQueueContextRow,
  ScanFeedback,
} from "./audit-scan-types"

export type AuditScanTranslator = {
  (key: string): string
  (key: string, values: Record<string, string | number | Date>): string
}

export function ScanResultPanel({
  feedback,
  t,
}: {
  feedback: ScanFeedback
  t: AuditScanTranslator
}) {
  const meta = getScanFeedbackMeta(feedback.status, t)
  const Icon = meta.icon

  return (
    <div role="status" aria-live="polite" className={`md:col-span-2 rounded-md border p-4 ${meta.cardClass}`}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-md ${meta.iconClass}`}>
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <div className="text-xs font-semibold tracking-normal text-muted-foreground">{t("scanResult")}</div>
            <div className="mt-1 break-words text-base font-semibold text-foreground">{feedback.title}</div>
            <div className="mt-1 break-words text-sm text-muted-foreground">{feedback.description}</div>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-xs font-semibold ${meta.chipClass}`}>
            {meta.label}
          </span>
        </div>
      </div>
    </div>
  )
}

export function RecentScansPanel({
  recentScans,
  onEditScan,
  t,
}: {
  recentScans: AuditRecentScan[]
  onEditScan: (scan: AuditRecentScan) => void
  t: AuditScanTranslator
}) {
  const [recentScansExpanded, setRecentScansExpanded] = useState(false)

  return (
    <div className="md:col-span-2 rounded-md border border-border bg-background p-3">
      <button
        type="button"
        aria-expanded={recentScansExpanded}
        aria-controls="audit-recent-scans-list"
        onClick={() => setRecentScansExpanded((current) => !current)}
        className="flex min-h-11 w-full flex-col gap-3 rounded-md p-2 text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary sm:flex-row sm:items-center sm:justify-between"
      >
        <span className="w-full min-w-0 sm:w-auto">
          <span className="block text-sm font-semibold text-foreground">{t("recentScansTitle")}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{t("recentScansHelp")}</span>
        </span>
        <span className="inline-flex w-full items-center justify-between gap-2 sm:w-auto sm:justify-end">
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {t("recentScansCount", { count: recentScans.length })}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            {t(recentScansExpanded ? "recentScansCollapse" : "recentScansExpand")}
            <ChevronDown className={`h-4 w-4 transition-transform ${recentScansExpanded ? "rotate-180" : ""}`} />
          </span>
        </span>
      </button>
      <div id="audit-recent-scans-list" hidden={!recentScansExpanded} className="mt-2 grid gap-1.5">
        {recentScans.map((scan) => (
          <RecentScanCompactRow key={scan.id} scan={scan} onEditScan={onEditScan} t={t} />
        ))}
      </div>
    </div>
  )
}

function RecentScanCompactRow({
  scan,
  onEditScan,
  t,
}: {
  scan: AuditRecentScan
  onEditScan: (scan: AuditRecentScan) => void
  t: AuditScanTranslator
}) {
  const meta = getScanFeedbackMeta(scan.status, t)
  const canEdit = Boolean(scan.assetId || scan.assetTag)

  return (
    <div className="grid gap-2 rounded-md border border-border bg-surface px-3 py-2 text-xs sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 shrink-0 rounded-full ${meta.dotClass}`} />
          <span className="min-w-0 flex-1 truncate font-medium text-foreground">{scan.title}</span>
          <span className={`shrink-0 rounded-full px-2 py-0.5 font-semibold ${meta.chipClass}`}>
            {meta.label}
          </span>
          <span className="shrink-0 text-muted-foreground">{formatRecentScanTime(scan.at)}</span>
        </div>
        {scan.description ? <div className="mt-1 truncate text-muted-foreground">{scan.description}</div> : null}
      </div>
      {canEdit ? (
        <button
          type="button"
          onClick={() => onEditScan(scan)}
          className="inline-flex min-h-8 items-center justify-center gap-1.5 rounded-md border border-primary/30 bg-background px-2.5 font-semibold text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          <Keyboard className="h-3.5 w-3.5" />
          {t("recentScansEdit")}
        </button>
      ) : null}
    </div>
  )
}

export function AuditComponentPanel({
  components,
  saving,
  componentActionsDisabled = false,
  onScanComponent,
  onConfirmWithParent,
  onMarkMissing,
  t,
}: {
  components: AuditScanComponent[]
  saving: boolean
  componentActionsDisabled?: boolean
  onScanComponent: (component: AuditScanComponent) => void
  onConfirmWithParent: (component: AuditScanComponent) => void
  onMarkMissing: (component: AuditScanComponent) => void
  t: AuditScanTranslator
}) {
  const checkedCount = components.filter(isAuditComponentChecked).length

  return (
    <div className="mt-4 rounded-md border border-border bg-surface p-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" />
            {t("componentsPanelTitle")}
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("componentsPanelHelp")}</div>
        </div>
        <span className="inline-flex w-fit shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
          {t("componentsCheckedCount", { checked: checkedCount, total: components.length })}
        </span>
      </div>
      <div className="mt-3 grid gap-2">
        {components.map((component) => {
          const statusMeta = getAuditComponentStatusMeta(component, t)
          const isConfirmedWithParent = component.auditResult === "confirmed_with_parent"
          const isActionDisabled = saving || componentActionsDisabled || !component.auditItemId

          return (
            <div key={component.assetId} className="rounded-md border border-border bg-background p-3">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="truncate text-sm font-semibold text-foreground">{component.assetTag}</div>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-semibold ${statusMeta.className}`}>
                      {statusMeta.label}
                    </span>
                  </div>
                  <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{component.name}</div>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                      {component.componentRole}
                    </span>
                    {component.slotNo ? (
                      <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                        {component.slotNo}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="grid shrink-0 gap-2 sm:grid-cols-3 lg:min-w-[28rem]">
                  <button
                    type="button"
                    onClick={() => onScanComponent(component)}
                    disabled={saving}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    <ScanLine className="h-4 w-4" />
                    {t("componentScanQr")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmWithParent(component)}
                    disabled={isActionDisabled || isConfirmedWithParent}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("componentConfirmWithParent")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkMissing(component)}
                    disabled={isActionDisabled}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 text-sm font-medium text-warning transition-colors hover:bg-warning/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <AlertTriangle className="h-4 w-4" />}
                    {t("componentMissing")}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function getAuditComponentStatusMeta(component: AuditScanComponent, t: AuditScanTranslator) {
  if (!component.auditItemId || component.auditStatus === "out_of_round") {
    return {
      label: t("componentStatusOutOfRound"),
      className: "border-border bg-muted text-muted-foreground",
    }
  }

  if (component.auditResult === "confirmed_with_parent") {
    return {
      label: t("componentStatusConfirmedWithParent"),
      className: "border-info/30 bg-info/10 text-info",
    }
  }

  if (component.auditResult && component.auditResult !== "found") {
    return {
      label: t("componentStatusMismatch"),
      className: "border-warning/30 bg-warning/10 text-warning",
    }
  }

  if (component.auditStatus === "pending") {
    return {
      label: t("componentStatusPending"),
      className: "border-warning/30 bg-warning/10 text-warning",
    }
  }

  return {
    label: t("componentStatusScanned"),
    className: "border-success/30 bg-success/10 text-success",
  }
}

export function ManualScanSuggestionList({
  items,
  onSelect,
  optionLabelMaps,
  t,
}: {
  items: AuditScanItem[]
  onSelect: (item: AuditScanItem) => void
  optionLabelMaps: OptionLabelMaps
  t: AuditScanTranslator
}) {
  const contextLabels = {
    location: t("pendingQueueLocation"),
    custodian: t("pendingQueueCustodian"),
    department: t("pendingQueueDepartment"),
    none: t("none"),
  }

  return (
    <div className="mt-3 rounded-md border border-border bg-surface p-3">
      <div className="flex items-start gap-2">
        <Search className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="min-w-0">
          <div className="text-sm font-semibold text-foreground">{t("manualSuggestionTitle")}</div>
          <div className="mt-0.5 text-xs text-muted-foreground">{t("manualSuggestionHelp")}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-2">
        {items.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onSelect(item)}
            className="w-full rounded-md border border-border bg-background p-3 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-foreground">{item.assetTag}</div>
                <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.label}</div>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                {t("manualSuggestionSelect")}
              </span>
            </div>
            <ContextChipList rows={buildPendingQueueContext(item, optionLabelMaps, contextLabels)} />
          </button>
        ))}
      </div>
    </div>
  )
}

export function PendingQueuePanel({
  items,
  total,
  pendingHref,
  onSelect,
  expanded,
  onExpandedChange,
  optionLabelMaps,
  t,
}: {
  items: AuditScanItem[]
  total: number
  pendingHref: string
  onSelect: (item: AuditScanItem) => void
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  optionLabelMaps: OptionLabelMaps
  t: AuditScanTranslator
}) {
  const contextLabels = {
    location: t("pendingQueueLocation"),
    custodian: t("pendingQueueCustodian"),
    department: t("pendingQueueDepartment"),
    none: t("none"),
  }

  return (
    <div id="audit-pending-queue-panel" className="md:col-span-2 rounded-md border border-border bg-background p-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListChecks className="h-4 w-4 text-primary" />
            {t("pendingQueuePanelTitle")}
            <span className="rounded-full bg-warning/10 px-2 py-0.5 text-xs font-semibold text-warning">
              {total.toLocaleString("th-TH")}
            </span>
          </div>
          <div className="mt-1 text-xs text-muted-foreground">{t("pendingQueuePanelHelp")}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <button
            type="button"
            aria-expanded={expanded}
            aria-controls="audit-pending-queue-content"
            onClick={() => onExpandedChange(!expanded)}
            className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            {t(expanded ? "pendingQueueCollapse" : "pendingQueueExpand")}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
          <Link
            href={pendingHref}
            className="inline-flex min-h-10 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("pendingQueueOpenFull")}
          </Link>
        </div>
      </div>

      <div id="audit-pending-queue-content" hidden={!expanded}>
        {items.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-border bg-surface p-4 text-sm text-muted-foreground">
            {t("pendingQueueEmpty")}
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <PendingQueueItem
                key={item.id}
                item={item}
                contextRows={buildPendingQueueContext(item, optionLabelMaps, contextLabels)}
                onSelect={onSelect}
                t={t}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function PendingQueueItem({
  item,
  contextRows,
  onSelect,
  t,
}: {
  item: AuditScanItem
  contextRows: PendingQueueContextRow[]
  onSelect: (item: AuditScanItem) => void
  t: AuditScanTranslator
}) {
  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-surface p-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <div className="truncate text-sm font-semibold text-foreground">{item.assetTag}</div>
        <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.label}</div>
        <ContextChipList rows={contextRows} />
      </div>
      <button
        type="button"
        onClick={() => onSelect(item)}
        className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-md border border-border bg-background px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <ScanLine className="h-4 w-4" />
        {t("pendingQueueSelect")}
      </button>
    </div>
  )
}

export function AssetFallbackPicker({
  expanded,
  items,
  query,
  selectedAssetId,
  total,
  onExpandedChange,
  onQueryChange,
  onSelect,
  optionLabelMaps,
  t,
}: {
  expanded: boolean
  items: AuditScanItem[]
  query: string
  selectedAssetId: string
  total: number
  onExpandedChange: (expanded: boolean) => void
  onQueryChange: (query: string) => void
  onSelect: (item: AuditScanItem) => void
  optionLabelMaps: OptionLabelMaps
  t: AuditScanTranslator
}) {
  const contextLabels = {
    location: t("pendingQueueLocation"),
    custodian: t("pendingQueueCustodian"),
    department: t("pendingQueueDepartment"),
    none: t("none"),
  }

  return (
    <div className="md:col-span-2 rounded-md border border-border bg-background p-3">
      <button
        type="button"
        aria-expanded={expanded}
        aria-controls="audit-asset-fallback-picker"
        onClick={() => onExpandedChange(!expanded)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md text-left transition-colors hover:bg-accent/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-foreground">{t("assetPickerTitle")}</span>
          <span className="mt-0.5 block text-xs text-muted-foreground">{t("assetPickerHelp")}</span>
        </span>
        <span className="inline-flex shrink-0 items-center gap-2">
          <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-semibold text-muted-foreground">
            {total.toLocaleString("th-TH")}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary">
            {t(expanded ? "assetPickerCollapse" : "assetPickerExpand")}
            <ChevronDown className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`} />
          </span>
        </span>
      </button>

      <div id="audit-asset-fallback-picker" hidden={!expanded} className="mt-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={t("assetPickerSearch")}
            className="h-11 w-full rounded-md border border-border bg-surface pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        {items.length === 0 ? (
          <div className="mt-3 rounded-md border border-dashed border-border bg-surface p-4 text-center text-sm text-muted-foreground">
            {t("assetPickerEmpty")}
          </div>
        ) : (
          <div className="mt-3 grid gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelect(item)}
                className={`w-full rounded-md border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  selectedAssetId === item.assetId
                    ? "border-primary bg-primary/10"
                    : "border-border bg-surface hover:bg-accent"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-foreground">{item.assetTag}</div>
                    <div className="mt-1 line-clamp-2 text-sm text-muted-foreground">{item.label}</div>
                  </div>
                  <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {item.auditStatus}
                  </span>
                </div>
                <ContextChipList rows={buildPendingQueueContext(item, optionLabelMaps, contextLabels)} />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function ContextChipList({ rows }: { rows: PendingQueueContextRow[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-1.5">
      {rows.map((row) => (
        <span key={row.label} className="inline-flex max-w-full items-center gap-1 rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">
          <span className="shrink-0 font-medium text-foreground">{row.label}:</span>
          <span className="truncate">{row.value}</span>
        </span>
      ))}
    </div>
  )
}

export function formatLastAuditResult(result: LastAuditResult, t: AuditScanTranslator) {
  const meta = getScanFeedbackMeta(result.status, t)
  return t("lastResultWithAsset", { asset: result.label, result: meta.label })
}

function getScanFeedbackMeta(status: ScanFeedback["status"], t: AuditScanTranslator) {
  if (status === "found" || status === "saved" || status === "found_later") {
    return {
      label:
        status === "found"
          ? t("feedbackStatusFound")
          : status === "found_later"
            ? t("feedbackStatusFoundLater")
            : t("feedbackStatusSaved"),
      icon: CheckCircle2,
      cardClass: "border-success/35 bg-success/10",
      chipClass: "bg-success/15 text-success",
      iconClass: "bg-success/15 text-success",
      dotClass: "bg-success",
    }
  }

  if (status === "unknown_asset") {
    return {
      label: t("feedbackStatusUnknownAsset"),
      icon: AlertTriangle,
      cardClass: "border-danger/35 bg-danger/10",
      chipClass: "bg-danger/15 text-danger",
      iconClass: "bg-danger/15 text-danger",
      dotClass: "bg-danger",
    }
  }

  if (status === "out_of_scope") {
    return {
      label: t("feedbackStatusOutOfScope"),
      icon: AlertTriangle,
      cardClass: "border-warning/35 bg-warning/10",
      chipClass: "bg-warning/15 text-warning",
      iconClass: "bg-warning/15 text-warning",
      dotClass: "bg-warning",
    }
  }

  if (status === "offline_queued") {
    return {
      label: t("feedbackStatusOfflineQueued"),
      icon: WifiOff,
      cardClass: "border-info/35 bg-info/10",
      chipClass: "bg-info/15 text-info",
      iconClass: "bg-info/15 text-info",
      dotClass: "bg-info",
    }
  }

  return {
    label: t("feedbackStatusMismatch"),
    icon: AlertTriangle,
    cardClass: "border-warning/35 bg-warning/10",
    chipClass: "bg-warning/15 text-warning",
    iconClass: "bg-warning/15 text-warning",
    dotClass: "bg-warning",
  }
}

function formatRecentScanTime(value: number) {
  return new Date(value).toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" })
}
export function AuditQrScannerOverlay() {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
      <div
        className="absolute left-1/2 top-1/2 aspect-square h-[78%] max-h-72 sm:max-h-80 -translate-x-1/2 -translate-y-1/2"
        style={{ boxShadow: "0 0 0 9999px rgba(15, 23, 42, 0.42)" }}
      >
        <span className="absolute left-0 top-0 h-10 w-10 border-l-4 border-t-4 border-white" />
        <span className="absolute right-0 top-0 h-10 w-10 border-r-4 border-t-4 border-white" />
        <span className="absolute bottom-0 left-0 h-10 w-10 border-b-4 border-l-4 border-white" />
        <span className="absolute bottom-0 right-0 h-10 w-10 border-b-4 border-r-4 border-white" />
      </div>
    </div>
  )
}
export function OptionList({ emptyLabel, options }: { emptyLabel?: string; options: Option[] }) {
  return (
    <>
      {emptyLabel && <option value="">{emptyLabel}</option>}
      {options.map((option) => (
        <option key={option.id} value={option.id}>
          {option.label}
        </option>
      ))}
    </>
  )
}

export function Field({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <label className="block w-full min-w-0">
      <span className="mb-1.5 flex items-center gap-1 text-sm font-medium text-foreground">
        <ScanLine className="h-3.5 w-3.5 text-muted-foreground" />
        {label}
        {required && <span className="text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

export function Select({ label, value, required, onChange, children }: { label: string; value: string; required?: boolean; onChange: (value: string) => void; children: ReactNode }) {
  return (
    <Field label={label} required={required}>
      <select value={value} required={required} onChange={(event) => onChange(event.target.value)} className="h-12 w-full rounded-md border border-border bg-background px-3 text-base outline-none focus:border-primary focus:ring-1 focus:ring-primary">
        {children}
      </select>
    </Field>
  )
}
