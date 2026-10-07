"use client"

import { Loader2, SearchCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AuditLookupAsset, AuditLookupMatch } from "@/components/audit/audit-scan-types"

export type { AuditLookupMatch } from "@/components/audit/audit-scan-types"

export type AuditLookupState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "out_of_scope"; asset: AuditLookupAsset }
  | { status: "candidates"; matches: AuditLookupMatch[] }
  | { status: "unknown" }
  | { status: "offline" }
  | { status: "error"; message: string }

export function AuditScanLookupCard({
  state,
  onSearchRegister,
  onRecordOutOfScope,
  onPickMatch,
}: {
  state: AuditLookupState
  onSearchRegister: () => void
  onRecordOutOfScope: (asset: AuditLookupAsset) => void
  onPickMatch: (match: AuditLookupMatch) => void
}) {
  const t = useTranslations("auditScan")

  return (
    <div data-audit-scan-lookup className="rounded-md border border-border bg-surface p-3">
      <p className="text-sm font-medium text-foreground">{t("searchNoResult")}</p>
      {state.status === "idle" ? (
        <Button type="button" variant="outline" className="mt-2 w-full" onClick={onSearchRegister}>
          <SearchCheck aria-hidden="true" />
          {t("searchRegister")}
        </Button>
      ) : null}
      {state.status === "loading" ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
          {t("searchRegisterLoading")}
        </p>
      ) : null}
      {state.status === "out_of_scope" ? (
        <div className="mt-2 rounded-md border border-warning-border bg-warning-soft p-3">
          <p className="text-sm font-semibold text-warning">{t("lookupOutOfScope", { assetTag: state.asset.assetTag })}</p>
          <p className="mt-0.5 text-xs text-foreground">{state.asset.subtitle}</p>
          <Button type="button" variant="outline" className="mt-2" onClick={() => onRecordOutOfScope(state.asset)}>
            {t("recordOutOfScope")}
          </Button>
        </div>
      ) : null}
      {state.status === "candidates" ? (
        <div className="mt-2">
          <p className="text-xs text-muted-foreground">{t("lookupCandidates", { count: state.matches.length })}</p>
          <ul className="mt-1 divide-y divide-border rounded-md border border-border">
            {state.matches.map((match) => (
              <li key={match.assetId}>
                <button
                  type="button"
                  onClick={() => onPickMatch(match)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold">{match.assetTag}</span>
                    <span className="block truncate text-xs text-muted-foreground">{match.title}</span>
                  </span>
                  <StatusBadge size="xs" label={match.inRound ? t("lookupInRound") : t("lookupNotInRound")} tone={match.inRound ? "info" : "muted"} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.status === "unknown" ? <p className="mt-2 text-sm text-muted-foreground">{t("lookupUnknown")}</p> : null}
      {state.status === "offline" ? <p className="mt-2 text-sm text-warning">{t("lookupOffline")}</p> : null}
      {state.status === "error" ? <p className="mt-2 text-sm text-danger" role="alert">{state.message}</p> : null}
    </div>
  )
}
