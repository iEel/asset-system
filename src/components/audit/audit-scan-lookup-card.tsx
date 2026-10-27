"use client"

import { Loader2, SearchCheck } from "lucide-react"
import { useTranslations } from "next-intl"
import { ApiErrorText } from "@/components/ui/api-error-text"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Notice } from "@/components/ui/notice"
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
  title,
  onSearchRegister,
  onRecordOutOfScope,
  onPickMatch,
}: {
  state: AuditLookupState
  /** The first line: "ไม่พบในรอบนี้" by default; "ไม่ใช่รายการข้างบน" under matches. */
  title?: string
  onSearchRegister: () => void
  onRecordOutOfScope: (asset: AuditLookupAsset) => void
  onPickMatch: (match: AuditLookupMatch) => void
}) {
  const t = useTranslations("auditScan")

  return (
    <ContentPanel>
      <p className="text-sm font-medium text-foreground">{title ?? t("searchNoResult")}</p>
      {state.status === "idle" ? (
        <Button type="button" variant="outline" className="mt-2 w-full" onClick={onSearchRegister}>
          <SearchCheck aria-hidden="true" />
          {t("searchRegister")}
        </Button>
      ) : null}
      {state.status === "loading" ? (
        <p className="mt-2 flex items-center gap-2 text-sm text-muted-foreground" role="status">
          <Loader2 className="size-4 animate-spin motion-reduce:animate-none" aria-hidden="true" />
          {t("searchRegisterLoading")}
        </p>
      ) : null}
      {state.status === "out_of_scope" ? (
        <Notice
          tone="warning"
          className="mt-2"
          title={t("lookupOutOfScope", { assetTag: state.asset.assetTag })}
          action={
            <Button type="button" variant="outline" size="md" onClick={() => onRecordOutOfScope(state.asset)}>
              {t("recordOutOfScope")}
            </Button>
          }
        >
          {state.asset.subtitle}
        </Notice>
      ) : null}
      {state.status === "candidates" ? (
        <div className="mt-2">
          <p className="text-meta text-muted-foreground">{t("lookupCandidates", { count: state.matches.length })}</p>
          {/* The register matches sit in the quiet grouping inside the panel (no frame in a frame). */}
          <ul className="mt-1 divide-y divide-border rounded-md border border-border bg-background">
            {state.matches.map((match) => (
              <li key={match.assetId}>
                {/* A raw button on purpose: a two-line register match that opens it (2D-5 lists it). */}
                <button
                  type="button"
                  onClick={() => onPickMatch(match)}
                  className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm text-foreground"><span className="tag font-medium">{match.assetTag}</span></span>
                    <span className="block truncate text-meta text-muted-foreground">{match.title}</span>
                  </span>
                  <StatusBadge label={match.inRound ? t("lookupInRound") : t("lookupNotInRound")} tone={match.inRound ? "info" : "muted"} className="shrink-0" />
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      {state.status === "unknown" ? <EmptyNote className="mt-2">{t("lookupUnknown")}</EmptyNote> : null}
      {/* Offline is a condition of the search, not a fault: the offline bar above already warns. */}
      {state.status === "offline" ? <Notice tone="neutral" className="mt-2">{t("lookupOffline")}</Notice> : null}
      {state.status === "error" ? <Notice tone="danger" role="alert" className="mt-2"><ApiErrorText error={state.message} /></Notice> : null}
    </ContentPanel>
  )
}
