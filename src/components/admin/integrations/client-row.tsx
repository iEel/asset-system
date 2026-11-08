"use client"

import { useId, useMemo, useState, type RefObject } from "react"
import { ChevronDown, Copy, History, Loader2, Pencil, Power, RotateCw } from "lucide-react"
import { useTranslations } from "next-intl"
import type { IntegrationLabels } from "@/components/admin/IntegrationClientManager"
import { Button } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { DataTableCell, DataTableRow, dataTableCellClasses, dataTableRowClasses } from "@/components/ui/data-table"
import { RowActions, type RowActionItem } from "@/components/ui/row-actions"
import { StatusBadge } from "@/components/ui/status-badge"
import { formatCount } from "@/lib/display-format"
import { buildIntegrationPowerShellExamples, type IntegrationPowerShellExample } from "@/lib/integration-client-operations"
import type { IntegrationClientDto } from "@/lib/integration-client-store"
import { clientUsage, creatorLabel } from "@/lib/integration-clients-page-model"
import { buildSystemLogRecordHref } from "@/lib/system-log-history"
import { cn } from "@/lib/utils"

// The list GET's DTO. Over JSON its dates arrive as ISO strings, so every date is read through new Date() below.
export type IntegrationClient = IntegrationClientDto

// Every route of the Integration API (src/app/api/integrations/v1) is a GET handler, and the call log stores the route
// only, so the top endpoint shows this method beside it.
const INTEGRATION_API_METHOD = "GET"

export type ClientRowProps = {
  client: IntegrationClient
  labels: IntegrationLabels
  scopeLabels: Readonly<Record<string, string>>
  locale: string
  canEdit: boolean
  // system:view: the history item opens /admin/logs, which needs it.
  canViewLogs: boolean
  isNew: boolean
  busy: boolean
  openerRef: RefObject<HTMLElement | null>
  onEdit: () => void
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
  onCopyPowerShell: (example: IntegrationPowerShellExample) => void
}

// The desktop table's columns: client, status, scopes, token, last used, actions, expand.
export const CLIENT_TABLE_COLUMNS = 7

// Board AD-Integrations (group 12 spec §10): one client as a table row and, under it, the expand with the 24-hour count,
// the top endpoint and the latest error. A row created on this visit carries the "ใหม่" badge and a green edge until the
// page reloads (no fill: color only marks).
export function ClientTableRows(props: ClientRowProps) {
  const { client, isNew, busy } = props
  const [open, setOpen] = useState(false)
  const detailId = useId()
  return (
    <>
      <DataTableRow data-new={isNew || undefined} aria-busy={busy || undefined} className={cn(isNew && "shadow-[inset_3px_0_0_var(--success)]")}>
        <DataTableCell className="min-w-56 align-top">
          <ClientIdentity {...props} />
        </DataTableCell>
        <DataTableCell className="align-top">
          <ClientStatus enabled={client.enabled} labels={props.labels} />
        </DataTableCell>
        <DataTableCell className="min-w-40 align-top">
          <ScopeBadges scopes={client.scopes} scopeLabels={props.scopeLabels} />
        </DataTableCell>
        <DataTableCell className="align-top">
          <TokenPreview {...props} />
        </DataTableCell>
        <DataTableCell className="align-top">
          <ClientUsageSummary {...props} />
        </DataTableCell>
        <DataTableCell align="right" className="align-top">
          <ClientActions {...props} />
        </DataTableCell>
        <DataTableCell align="right" className="w-12 align-top">
          <ExpandButton open={open} controls={detailId} name={client.displayName} onToggle={() => setOpen((value) => !value)} />
        </DataTableCell>
      </DataTableRow>
      <tr hidden={!open} className={dataTableRowClasses}>
        <td id={detailId} colSpan={CLIENT_TABLE_COLUMNS} className={cn(dataTableCellClasses, "bg-background")}>
          <ClientUsageDetails client={client} labels={props.labels} locale={props.locale} />
        </td>
      </tr>
    </>
  )
}

// Below md: a card per client with the same parts.
export function ClientCard(props: ClientRowProps) {
  const { client, isNew, busy } = props
  const [open, setOpen] = useState(false)
  const detailId = useId()
  return (
    <li
      data-new={isNew || undefined}
      aria-busy={busy || undefined}
      className={cn("min-w-0 rounded-lg border border-border bg-surface p-4", isNew && "border-success-border shadow-[inset_3px_0_0_var(--success)]")}
    >
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <ClientIdentity {...props} />
        </div>
        <ClientStatus enabled={client.enabled} labels={props.labels} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div className="grid gap-1">
          <span className="text-meta text-muted-foreground">{props.labels.scopes}</span>
          <ScopeBadges scopes={client.scopes} scopeLabels={props.scopeLabels} />
        </div>
        <div className="grid gap-1">
          <span className="text-meta text-muted-foreground">{props.labels.tokenPreview}</span>
          <TokenPreview {...props} />
        </div>
        <div className="grid gap-1">
          <span className="text-meta text-muted-foreground">{props.labels.lastUsed}</span>
          <ClientUsageSummary {...props} />
        </div>
      </div>
      <div className="mt-3 flex items-center justify-between gap-2 border-t border-border-soft pt-3">
        <ClientActions {...props} />
        <ExpandButton open={open} controls={detailId} name={client.displayName} onToggle={() => setOpen((value) => !value)} />
      </div>
      <div id={detailId} hidden={!open} className="mt-3 border-t border-border-soft pt-3">
        <ClientUsageDetails client={client} labels={props.labels} locale={props.locale} />
      </div>
    </li>
  )
}

// The display name first, then the client ID in mono, then "สร้าง {date} · {creator or ไม่ทราบผู้สร้าง}".
function ClientIdentity({ client, isNew, locale }: ClientRowProps) {
  const t = useTranslations("integrationApiPage")
  const { formatDay } = useDateFormatters(locale)
  const creator = creatorLabel(client)
  return (
    <div className="min-w-0">
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="min-w-0 break-words font-semibold text-foreground">{client.displayName}</span>
        {isNew ? <StatusBadge tone="success" label={t("newBadge")} /> : null}
      </div>
      <span className="block truncate text-meta text-muted-foreground">
        <span className="tag">{client.clientId}</span>
      </span>
      <span className="block text-meta text-muted-foreground">
        {t("createdLine", { date: formatDay(client.createdAt), creator: creator.kind === "name" ? creator.name : t("createdUnknown") })}
      </span>
    </div>
  )
}

function ClientStatus({ enabled, labels }: { enabled: boolean; labels: IntegrationLabels }) {
  return <StatusBadge label={enabled ? labels.active : labels.disabled} tone={enabled ? "success" : "muted"} />
}

// Scopes in Thai (the create form's labels); a scope the form does not offer (a wildcard) keeps its code as a tag.
function ScopeBadges({ scopes, scopeLabels }: { scopes: readonly string[]; scopeLabels: Readonly<Record<string, string>> }) {
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <Chip key={scope}>{scopeLabels[scope] ?? <span className="tag">{scope}</span>}</Chip>
      ))}
    </div>
  )
}

// The real first and last 4 characters (spec §10, my call), so a token can be matched on the other system.
function TokenPreview({ client, locale }: ClientRowProps) {
  const t = useTranslations("integrationApiPage")
  const { formatDay } = useDateFormatters(locale)
  return (
    <div className="min-w-0 text-meta text-foreground">
      <span className="tag">{client.tokenPreview}</span>
      {client.lastRotatedAt ? <span className="block text-meta text-muted-foreground">{t("rotatedOn", { date: formatDay(client.lastRotatedAt) })}</span> : null}
    </div>
  )
}

// Last used, the 7-day count and, when there were errors in 7 days, a danger badge.
function ClientUsageSummary({ client, labels, locale }: ClientRowProps) {
  const t = useTranslations("integrationApiPage")
  const { formatDateTime } = useDateFormatters(locale)
  const usage = clientUsage(client)
  return (
    <div className="grid min-w-0 justify-items-start gap-0.5 text-meta">
      <span className={cn("num", usage.neverUsed ? "text-muted-foreground" : "text-foreground")}>
        {usage.neverUsed ? labels.noLastUsed : formatDateTime(usage.lastUsedAt)}
      </span>
      <span className="num text-muted-foreground">{t("calls7d", { count: usage.calls7d })}</span>
      {usage.hasErrors ? <StatusBadge tone="danger" label={t("errorsBadge", { count: usage.errors7d })} /> : null}
    </div>
  )
}

// One row button (แก้ไข) and the ⋯ menu: Copy PowerShell, ดูประวัติ, เปลี่ยน token…, then the status item in its own
// group. แก้ไข, เปลี่ยน token and the status item need setting:edit; a viewer keeps Copy PowerShell, and ดูประวัติ shows
// only with system:view (canViewLogs). While an action of this client runs, a spinner shows beside the actions.
function ClientActions({ client, labels, locale, canEdit, canViewLogs, busy, openerRef, onEdit, onRotate, onEnable, onDisable, onCopyPowerShell }: ClientRowProps) {
  const t = useTranslations("integrationApiPage")
  const example = usePrimaryPowerShellExample(client)
  const disableItem: RowActionItem = { kind: "action", key: "disable", label: t("disableItem"), hint: t("disableHint"), destructive: true, onSelect: onDisable, icon: <Power aria-hidden="true" /> }
  const enableItem: RowActionItem = { kind: "action", key: "enable", label: t("enableItem"), onSelect: onEnable, icon: <Power aria-hidden="true" /> }
  return (
    <div className="inline-flex items-center gap-2">
      {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin text-muted-foreground motion-reduce:animate-none" /> : null}
      <RowActions
        code={client.clientId}
        name={client.displayName}
        menuLabel={t("moreActions", { name: client.displayName })}
        nextWidth="auto"
        openerRef={openerRef}
        next={canEdit ? { label: t("edit"), onSelect: onEdit, icon: <Pencil aria-hidden="true" /> } : undefined}
        groups={[
          {
            key: "use",
            items: [
              ...(example
                ? [
                    {
                      kind: "action",
                      key: "copyPowerShell", label: labels.copyPowerShell,
                      onSelect: () => onCopyPowerShell(example),
                      icon: <Copy aria-hidden="true" />,
                    } satisfies RowActionItem,
                  ]
                : []),
              ...(canViewLogs
                ? [
                    { kind: "link", key: "history", label: t("historyItem"), href: buildSystemLogRecordHref(locale, "integration_api", client.clientId), icon: <History aria-hidden="true" /> } satisfies RowActionItem,
                  ]
                : []),
              ...(canEdit
                ? [
                    {
                      kind: "action",
                      key: "rotate", label: t("rotateItem"), hint: t("rotateHint"),
                      onSelect: onRotate,
                      icon: <RotateCw aria-hidden="true" />,
                    } satisfies RowActionItem,
                  ]
                : []),
            ],
          },
          { key: "status", items: canEdit ? [client.enabled ? disableItem : enableItem] : [] },
        ]}
      />
    </div>
  )
}

function ExpandButton({ open, controls, name, onToggle }: { open: boolean; controls: string; name: string; onToggle: () => void }) {
  const t = useTranslations("integrationApiPage")
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-sm"
      aria-expanded={open}
      aria-controls={controls}
      aria-label={open ? t("hideUsage", { name }) : t("showUsage", { name })}
      onClick={onToggle}
      className="aria-expanded:text-primary"
    >
      <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform motion-reduce:transition-none", open && "rotate-180")} />
    </Button>
  )
}

// The expand keeps what the old operations panel showed (spec §10, my call): the 24-hour count, the top endpoint
// (method, path, count) and the latest error (time, status, path), or "ยังไม่มีการเรียกใช้".
function ClientUsageDetails({ client, labels, locale }: { client: IntegrationClient; labels: IntegrationLabels; locale: string }) {
  const t = useTranslations("integrationApiPage")
  const { formatDateTime } = useDateFormatters(locale)
  const operations = client.operations
  return (
    <div className="min-w-0 text-meta">
      {operations.requestCountTotal === 0 ? (
        <p className="text-muted-foreground">{labels.noOperationalData}</p>
      ) : (
        <dl className="grid min-w-0 gap-x-4 gap-y-2 md:grid-cols-[auto_minmax(0,1fr)]">
          <dt className="text-muted-foreground">{labels.requests24h}</dt>
          <dd className="num text-foreground">{t("calls24h", { count: operations.requestCount24h })}</dd>
          {operations.topEndpoint ? (
            <>
              <dt className="text-muted-foreground">{labels.topEndpoint}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-foreground">
                <span className="tag">{INTEGRATION_API_METHOD}</span>
                {/* An API route is long and must wrap, so it keeps font-mono and is not a tag (R3). */}
                <span className="break-all font-mono">{operations.topEndpoint.route}</span>
                <span className="num text-muted-foreground">({formatCount(operations.topEndpoint.count)})</span>
              </dd>
            </>
          ) : null}
          {operations.latestError ? (
            <>
              <dt className="text-muted-foreground">{labels.latestError}</dt>
              <dd className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-foreground">
                <span className="num">{formatDateTime(operations.latestError.at)}</span>
                <StatusBadge tone="danger" label={String(operations.latestError.status)} />
                <span className="break-all font-mono">{operations.latestError.route}</span>
              </dd>
            </>
          ) : null}
        </dl>
      )}
    </div>
  )
}

// The rows render only after the client list loads in the browser, so the browser's time zone is the one shown.
function useDateFormatters(locale: string) {
  return useMemo(() => {
    const tag = locale === "th" ? "th-TH" : "en-GB"
    const day = new Intl.DateTimeFormat(tag, { dateStyle: "medium" })
    const dayTime = new Intl.DateTimeFormat(tag, { dateStyle: "medium", timeStyle: "short" })
    const safe = (format: Intl.DateTimeFormat) => (value: Date | string | null) => {
      if (!value) return ""
      const date = new Date(value)
      return Number.isNaN(date.getTime()) ? "" : format.format(date)
    }
    return { formatDay: safe(day), formatDateTime: safe(dayTime) }
  }, [locale])
}

function usePrimaryPowerShellExample(client: IntegrationClient) {
  return useMemo(() => {
    const baseUrl = typeof window === "undefined" ? "https://asset.company.com" : window.location.origin
    const examples = buildIntegrationPowerShellExamples(client, baseUrl)
    return examples.find((example) => example.key !== "health") ?? examples[0] ?? null
  }, [client])
}
