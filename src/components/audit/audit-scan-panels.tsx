"use client"

import { useId, useRef } from "react"
import { AlertTriangle, CheckCircle2, MoreHorizontal, ScanLine } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { StatusBadge, type StatusTone } from "@/components/ui/status-badge"
import { isAuditComponentChecked, isAuditComponentPending } from "./audit-scan-helpers"
import type { AuditScanComponent } from "./audit-scan-types"

export type AuditScanTranslator = {
  (key: string): string
  (key: string, values: Record<string, string | number | Date>): string
}

// The components of the asset in the check sheet (D2, D3): a heading with the count and "พบครบทุกชิ้น", then one
// compact row per component (about 64px): tag and status, then name · role · slot; on the right "พบ" (a check mark once
// it is confirmed with the parent) and ⋯ with scan QR and mark missing.
export function AuditComponentPanel({
  components,
  saving,
  componentActionsDisabled = false,
  confirmingAll,
  onScanComponent,
  onConfirmWithParent,
  onConfirmAll,
  onMarkMissing,
  t,
}: {
  components: AuditScanComponent[]
  saving: boolean
  componentActionsDisabled?: boolean
  confirmingAll: boolean
  onScanComponent: (component: AuditScanComponent) => void
  onConfirmWithParent: (component: AuditScanComponent) => void
  onConfirmAll: () => void
  onMarkMissing: (component: AuditScanComponent) => void
  t: AuditScanTranslator
}) {
  const tCommon = useTranslations("common")
  const headingId = useId()
  const openingDialogRef = useRef(false)
  const checkedCount = components.filter(isAuditComponentChecked).length
  const pendingCount = components.filter(isAuditComponentPending).length
  // Not while it runs: the busy button keeps focus while each confirmation sets saving (GB4).
  const confirmAllDisabled = componentActionsDisabled || (saving && !confirmingAll)

  function openMissing(component: AuditScanComponent) {
    openingDialogRef.current = true
    onMarkMissing(component)
  }

  return (
    <section aria-labelledby={headingId} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <h3 id={headingId} className="text-sm font-semibold text-foreground">{t("componentsSection", { count: components.length })}</h3>
          <p className="text-xs text-muted-foreground">{t("componentsCheckedCount", { checked: checkedCount, total: components.length })}</p>
        </div>
        {pendingCount > 0 || confirmingAll ? (
          <Button variant="outline" size="sm" busy={confirmingAll} disabled={confirmAllDisabled} onClick={onConfirmAll}>
            <CheckCircle2 aria-hidden="true" />
            {t("componentsConfirmAll")}
          </Button>
        ) : null}
      </div>
      <ul className="divide-y divide-border rounded-md border border-border">
        {components.map((component) => {
          const statusMeta = getAuditComponentStatusMeta(component, t)
          const isConfirmedWithParent = component.auditResult === "confirmed_with_parent"
          const rowDisabled = saving || confirmingAll || componentActionsDisabled || !component.auditItemId

          return (
            <li key={component.assetId} data-audit-component-row className="flex min-h-16 items-center gap-2 px-3 py-2">
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="min-w-0 truncate text-sm text-foreground">
                    <span className="tag font-medium">{component.assetTag}</span>
                  </span>
                  <StatusBadge label={statusMeta.label} tone={statusMeta.tone} />
                </div>
                <p className="truncate text-xs text-muted-foreground">
                  {[component.name, component.componentRole, component.slotNo].filter(Boolean).join(" · ")}
                </p>
              </div>
              {isConfirmedWithParent ? (
                <span className="inline-flex min-h-11 w-16 shrink-0 items-center justify-center md:min-h-8">
                  <CheckCircle2 className="size-5 text-success" aria-hidden="true" />
                </span>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="w-16"
                  disabled={rowDisabled}
                  onClick={() => onConfirmWithParent(component)}
                >
                  {t("componentFound")}
                  <span className="sr-only"> {component.assetTag}</span>
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon-sm" aria-label={tCommon("moreActionsFor", { code: component.assetTag })} title={tCommon("moreActionsFor", { code: component.assetTag })}>
                    <MoreHorizontal aria-hidden="true" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  onCloseAutoFocus={(event) => {
                    if (!openingDialogRef.current) return
                    openingDialogRef.current = false
                    event.preventDefault()
                  }}
                >
                  <DropdownMenuItem disabled={saving || confirmingAll} onSelect={() => onScanComponent(component)}>
                    <ScanLine aria-hidden="true" />
                    {t("componentScanQr")}
                  </DropdownMenuItem>
                  <DropdownMenuItem disabled={rowDisabled} onSelect={() => openMissing(component)}>
                    <AlertTriangle aria-hidden="true" />
                    {t("componentMarkMissing")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </li>
          )
        })}
      </ul>
    </section>
  )
}

function getAuditComponentStatusMeta(component: AuditScanComponent, t: AuditScanTranslator): { label: string; tone: StatusTone } {
  if (!component.auditItemId || component.auditStatus === "out_of_round") {
    return { label: t("componentStatusOutOfRound"), tone: "muted" }
  }

  if (component.auditResult === "confirmed_with_parent") {
    return { label: t("componentStatusConfirmedWithParent"), tone: "info" }
  }

  if (component.auditResult && component.auditResult !== "found") {
    return { label: t("componentStatusMismatch"), tone: "warning" }
  }

  if (component.auditStatus === "pending") {
    return { label: t("componentStatusPending"), tone: "warning" }
  }

  return { label: t("componentStatusScanned"), tone: "success" }
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
