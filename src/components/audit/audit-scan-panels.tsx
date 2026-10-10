"use client"

import { AlertTriangle, CheckCircle2, ListChecks, Loader2, ScanLine } from "lucide-react"
import { isAuditComponentChecked } from "./audit-scan-helpers"
import type { AuditScanComponent } from "./audit-scan-types"

export type AuditScanTranslator = {
  (key: string): string
  (key: string, values: Record<string, string | number | Date>): string
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
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    <ScanLine className="h-4 w-4" />
                    {t("componentScanQr")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onConfirmWithParent(component)}
                    disabled={isActionDisabled || isConfirmedWithParent}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-semibold text-white transition-colors hover:bg-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                    {t("componentConfirmWithParent")}
                  </button>
                  <button
                    type="button"
                    onClick={() => onMarkMissing(component)}
                    disabled={isActionDisabled}
                    className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-warning/40 bg-surface px-3 text-sm font-medium text-warning transition-colors hover:bg-warning-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
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
      className: "border-info/30 bg-info-soft text-info",
    }
  }

  if (component.auditResult && component.auditResult !== "found") {
    return {
      label: t("componentStatusMismatch"),
      className: "border-warning/30 bg-warning-soft text-warning",
    }
  }

  if (component.auditStatus === "pending") {
    return {
      label: t("componentStatusPending"),
      className: "border-warning/30 bg-warning-soft text-warning",
    }
  }

  return {
    label: t("componentStatusScanned"),
    className: "border-success/30 bg-success-soft text-success",
  }
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
