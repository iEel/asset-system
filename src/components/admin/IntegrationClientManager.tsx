"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Info, Loader2, Pencil, Plus, ScrollText } from "lucide-react"
import { ClientCreateSheet, type CopyFeedback, type OneTimeToken } from "@/components/admin/integrations/client-create-sheet"
import { ClientCard, ClientTableRows, type IntegrationClient } from "@/components/admin/integrations/client-row"
import { ClientStatusChips, ClientTiles } from "@/components/admin/integrations/client-tiles"
import { type IntegrationPowerShellExample } from "@/lib/integration-client-operations"
import { filterClients, integrationSummary, statusCounts, type IntegrationStatusFilter } from "@/lib/integration-clients-page-model"
import { buildSystemLogFilterHref } from "@/lib/system-log-history"
import { useConfirm } from "@/components/ui/confirm-dialog"
import {
  AccessibleDialog,
  AccessibleDialogBody,
  AccessibleDialogCancel,
  AccessibleDialogFooter,
  accessibleDialogFormClasses,
} from "@/components/ui/accessible-dialog"
import { ActionEmptyState } from "@/components/ui/action-empty-state"
import { Button } from "@/components/ui/button"
import { buttonVariants } from "@/components/ui/button-variants"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableHead, DataTableHeader } from "@/components/ui/data-table"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { PageHeader } from "@/components/ui/page-header"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { atLeastOne, maxLength, minLength, pattern, required } from "@/lib/validation-rules"

export type IntegrationLabels = {
  title: string
  subtitle: string
  historyLink: string
  summaryActive: string
  summaryDisabled: string
  summaryLastUsed: string
  clientId: string
  clientIdPlaceholder: string
  displayName: string
  displayNamePlaceholder: string
  scopes: string
  scopeAssetRead: string
  scopeReferenceRead: string
  scopeIntegrationRead: string
  createClient: string
  clientsTitle: string
  emptyTitle: string
  emptyDescription: string
  stepDetails: string
  tokenFor: string
  dismissHint: string
  rotatedTitle: string
  tokenPanelTitle: string
  tokenPanelWarning: string
  copyToken: string
  copied: string
  tokenAcknowledgement: string
  dismissToken: string
  rotate: string
  editScopes: string
  saveScopes: string
  cancel: string
  enable: string
  disable: string
  confirmRotate: string
  confirmScopeExpansion: string
  confirmScopeExpansionAction: string
  confirmEnable: string
  confirmDisable: string
  loading: string
  error: string
  loadFailed: string
  createFailed: string
  actionFailed: string
  active: string
  disabled: string
  noLastUsed: string
  lastUsed: string
  tokenPreview: string
  token: string
  client: string
  requests24h: string
  topEndpoint: string
  latestError: string
  noOperationalData: string
  copyPowerShell: string
  powerShellCopied: string
  status: string
  actions: string
  hashNote: string
  usageDetails: string
  filterEmpty: string
}

const scopeOptions = [
  { value: "asset:read", labelKey: "scopeAssetRead" },
  { value: "reference:read", labelKey: "scopeReferenceRead" },
  { value: "integration:read", labelKey: "scopeIntegrationRead" },
] as const

// The fields of the create form and of the edit dialog in visual order, keyed like the server's fieldErrors, with the
// id focus moves to (v-track M-R1). A scope group's id is its FieldGroup's.
const CREATE_FIELD_IDS = {
  clientId: "integration-client-id",
  displayName: "integration-display-name",
  scopes: "integration-scopes",
} as const
type CreateField = keyof typeof CREATE_FIELD_IDS
const CREATE_FIELD_ORDER = Object.keys(CREATE_FIELD_IDS) as CreateField[]
const EDIT_FIELD_IDS = {
  displayName: "integration-edit-display-name",
  scopes: "integration-edit-scopes",
} as const
type EditField = keyof typeof EDIT_FIELD_IDS
const EDIT_FIELD_ORDER = Object.keys(EDIT_FIELD_IDS) as EditField[]

// noValidate turns the browser's check off, so this restates the controls' required, minLength, maxLength and pattern,
// and the server's rule of at least one scope (a content rule: the button no longer waits for it, spec §4.4). The edit
// dialog has no client id (v-track M-R2).
function validate(values: { clientId?: string; displayName: string; scopes: readonly string[] }) {
  const errors: Partial<Record<CreateField, string>> = {}
  const check = (key: CreateField, code: string | null) => {
    if (code) errors[key] = code
  }
  if (values.clientId !== undefined) {
    check("clientId", required(values.clientId) ?? minLength(values.clientId, 3) ?? maxLength(values.clientId, 100) ?? pattern(values.clientId, /^[A-Za-z0-9._:-]+$/))
  }
  check("displayName", required(values.displayName) ?? maxLength(values.displayName, 200))
  check("scopes", atLeastOne(values.scopes))
  return errors
}

// Only the list GET looks up the creator's name: the create, update, rotate, enable and disable responses carry
// createdByName null, so a row keeps the name it had.
function mergeClient(previous: IntegrationClient | undefined, next: IntegrationClient): IntegrationClient {
  return { ...next, createdByName: next.createdByName ?? previous?.createdByName ?? null }
}

// Board AD-Integrations (page group 12 plan 4, spec §10): the header with ประวัติการเรียกใช้ and สร้าง client (a side
// panel that keeps the one-time token gate), four tiles, status chips, rows with the creator, the rotation date and the
// usage, an expand that keeps the 24-hour count, the top endpoint and the latest error, and a ⋯ menu for the rest.
// The page needs setting:view; สร้าง client, แก้ไข, เปลี่ยน token and the status items need setting:edit (canEdit).
// The plain token lives in this component's state only: never stored, logged or put in a URL, and gone on dismiss.
export function IntegrationClientManager({
  labels,
  locale,
  canEdit,
  viewerName,
}: {
  labels: IntegrationLabels
  locale: string
  canEdit: boolean
  viewerName: string | null
}) {
  const confirm = useConfirm()
  const apiError = useApiError()
  const createErrors = useFieldErrors<CreateField>()
  const editErrors = useFieldErrors<EditField>()
  const validationMessage = useValidationMessage()
  const editOpenerRef = useRef<HTMLElement | null>(null)
  const [clients, setClients] = useState<IntegrationClient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<IntegrationStatusFilter>("all")
  const [newClientIds, setNewClientIds] = useState<ReadonlySet<string>>(() => new Set())
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetMode, setSheetMode] = useState<"create" | "rotate">("create")
  const [clientId, setClientId] = useState("")
  const [displayName, setDisplayName] = useState("")
  const [selectedScopes, setSelectedScopes] = useState<string[]>(["asset:read", "reference:read"])
  const [oneTimeToken, setOneTimeToken] = useState<OneTimeToken | null>(null)
  const [tokenAcknowledgement, setTokenAcknowledgement] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState<CopyFeedback | null>(null)
  const [editingClient, setEditingClient] = useState<IntegrationClient | null>(null)
  const [editDisplayName, setEditDisplayName] = useState("")
  const [editScopes, setEditScopes] = useState<string[]>([])
  const [updatingClient, setUpdatingClient] = useState(false)
  const [exampleCopyFeedback, setExampleCopyFeedback] = useState<CopyFeedback | null>(null)

  const scopeLabels = useMemo(
    () => Object.fromEntries(scopeOptions.map((scope) => [scope.value, labels[scope.labelKey]])) as Record<string, string>,
    [labels],
  )
  const summary = useMemo(() => integrationSummary(clients), [clients])
  const visibleClients = useMemo(() => filterClients(clients, statusFilter), [clients, statusFilter])

  useEffect(() => {
    let cancelled = false

    fetch("/api/admin/integration-clients", { cache: "no-store" })
      .then(async (response) => {
        if (!response.ok) throw new Error(labels.loadFailed)
        return (await response.json()) as { data?: IntegrationClient[] }
      })
      .then((payload) => {
        if (!cancelled) {
          setClients(payload.data ?? [])
          setError(null)
        }
      })
      .catch((loadError) => {
        if (!cancelled) setError(loadError instanceof Error ? loadError.message : labels.loadFailed)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [labels.loadFailed])

  const focusFirstCreateError = () => createErrors.focusFirst(CREATE_FIELD_ORDER, { idFor: (key) => CREATE_FIELD_IDS[key] })
  const focusFirstEditError = () => editErrors.focusFirst(EDIT_FIELD_ORDER, { idFor: (key) => EDIT_FIELD_IDS[key] })

  function openCreate() {
    if (!canEdit) return
    setSheetMode("create")
    setError(null)
    createErrors.setErrors({})
    setSheetOpen(true)
  }

  // The panel's own gate refuses a close while a token waits for its acknowledgement; this is the close after it.
  function changeSheetOpen(open: boolean) {
    if (open) {
      setSheetOpen(true)
      return
    }
    if (oneTimeToken && !tokenAcknowledgement) return
    setOneTimeToken(null)
    setTokenAcknowledgement(false)
    setCopyFeedback(null)
    setSheetOpen(false)
  }

  // The last scope can be unchecked now: "at least one" shows as an error on submit (spec §4.4).
  function toggleScope(scope: string) {
    setSelectedScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]))
    createErrors.clear("scopes")
  }

  function openEditClient(client: IntegrationClient) {
    if (!canEdit) return
    setEditingClient(client)
    setEditDisplayName(client.displayName)
    setEditScopes(client.scopes)
    setError(null)
    editErrors.setErrors({})
  }

  function closeEditClient() {
    if (updatingClient) return
    setEditingClient(null)
    setEditDisplayName("")
    setEditScopes([])
  }

  function toggleEditScope(scope: string) {
    setEditScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]))
    editErrors.clear("scopes")
  }

  async function confirmScopeExpansion(client: IntegrationClient, nextScopes: string[]): Promise<boolean> {
    const current: readonly string[] = client.scopes
    const hasNewScope = nextScopes.some((scope) => !current.includes(scope))
    if (!hasNewScope) return true
    return confirm({ title: labels.confirmScopeExpansion, confirmLabel: labels.confirmScopeExpansionAction })
  }

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    createErrors.setErrors(validate({ clientId, displayName, scopes: selectedScopes }))
    if (focusFirstCreateError()) return
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/integration-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, displayName, scopes: selectedScopes }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        // A refusal that names a field shows under it; any other shows the server's reason, no longer a fixed text.
        if (createErrors.applyServer(result) && focusFirstCreateError()) return
        throw new Error(apiError.describe(result?.error ?? labels.createFailed).message)
      }
      const payload = (await response.json()) as { data: IntegrationClient; token: string }
      // The viewer made it, so the new row names them until the next load reads the name from the server.
      const created = { ...payload.data, createdByName: payload.data.createdByName ?? viewerName }
      setClients((current) => [created, ...current.filter((client) => client.id !== payload.data.id)])
      setNewClientIds((current) => new Set(current).add(payload.data.id))
      setOneTimeToken({ clientId: payload.data.clientId, displayName: payload.data.displayName, scopes: payload.data.scopes, token: payload.token })
      setTokenAcknowledgement(false)
      setCopyFeedback(null)
      setClientId("")
      setDisplayName("")
      setSelectedScopes(["asset:read", "reference:read"])
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : labels.createFailed)
    } finally {
      setSaving(false)
    }
  }

  async function updateEditingClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!editingClient) return
    editErrors.setErrors(validate({ displayName: editDisplayName, scopes: editScopes }))
    if (focusFirstEditError()) return
    if (!(await confirmScopeExpansion(editingClient, editScopes))) return

    setUpdatingClient(true)
    setMutatingId(editingClient.id)
    setError(null)
    try {
      const response = await fetch(`/api/admin/integration-clients/${editingClient.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: editDisplayName, scopes: editScopes }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        if (editErrors.applyServer(result) && focusFirstEditError()) return
        throw new Error(apiError.describe(result?.error ?? labels.actionFailed).message)
      }
      const payload = (await response.json()) as { data: IntegrationClient }
      setClients((current) => current.map((client) => (client.id === payload.data.id ? mergeClient(client, payload.data) : client)))
      closeEditClient()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : labels.actionFailed)
    } finally {
      setUpdatingClient(false)
      setMutatingId(null)
    }
  }

  async function rotateClient(client: IntegrationClient) {
    if (!canEdit) return
    if (!(await confirm({ title: labels.confirmRotate, confirmLabel: labels.rotate, tone: "destructive" }))) return
    await mutateClient(client, "rotate")
  }

  async function setClientEnabled(client: IntegrationClient, enabled: boolean) {
    if (!canEdit) return
    const confirmed = await confirm(
      enabled
        ? { title: labels.confirmEnable, confirmLabel: labels.enable }
        : { title: labels.confirmDisable, confirmLabel: labels.disable, tone: "destructive" },
    )
    if (!confirmed) return
    await mutateClient(client, enabled ? "enable" : "disable")
  }

  async function mutateClient(client: IntegrationClient, action: "rotate" | "enable" | "disable") {
    if (mutatingId) return
    setMutatingId(client.id)
    setError(null)
    try {
      const endpoint =
        action === "rotate"
          ? `/api/admin/integration-clients/${client.id}/rotate`
          : action === "enable"
            ? `/api/admin/integration-clients/${client.id}/enable`
            : `/api/admin/integration-clients/${client.id}/disable`
      const response = await fetch(endpoint, { method: "POST" })
      if (!response.ok) throw new Error(labels.actionFailed)
      const payload = (await response.json()) as { data: IntegrationClient; token?: string }
      setClients((current) => current.map((item) => (item.id === payload.data.id ? mergeClient(item, payload.data) : item)))
      // A rotate shows its new token in the same panel, at step 2, behind the same acknowledgement.
      if (action === "rotate" && payload.token) {
        setOneTimeToken({ clientId: payload.data.clientId, displayName: payload.data.displayName, scopes: payload.data.scopes, token: payload.token })
        setTokenAcknowledgement(false)
        setCopyFeedback(null)
        setSheetMode("rotate")
        setSheetOpen(true)
      }
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : labels.actionFailed)
    } finally {
      setMutatingId(null)
    }
  }

  async function copyToken() {
    if (!oneTimeToken) return
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(oneTimeToken.token)
      setCopyFeedback({ tone: "success", message: labels.copied })
    } catch {
      setCopyFeedback({ tone: "error", message: labels.error })
    }
  }

  async function copyPowerShellExample(example: IntegrationPowerShellExample) {
    try {
      if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable")
      await navigator.clipboard.writeText(example.command)
      setExampleCopyFeedback({ tone: "success", message: labels.powerShellCopied })
    } catch {
      setExampleCopyFeedback({ tone: "error", message: labels.error })
    }
  }

  function dismissToken() {
    if (!tokenAcknowledgement) return
    setOneTimeToken(null)
    setTokenAcknowledgement(false)
    setCopyFeedback(null)
    setSheetOpen(false)
  }

  const rowProps = (client: IntegrationClient) => ({
    client,
    labels,
    scopeLabels,
    locale,
    canEdit,
    isNew: newClientIds.has(client.id),
    busy: mutatingId === client.id,
    openerRef: editOpenerRef,
    onEdit: () => openEditClient(client),
    onRotate: () => void rotateClient(client),
    onEnable: () => void setClientEnabled(client, true),
    onDisable: () => void setClientEnabled(client, false),
    onCopyPowerShell: copyPowerShellExample,
  })

  return (
    <div className="space-y-6">
      <PageHeader
        title={labels.title}
        meta={labels.subtitle}
        actions={
          <>
            <Link href={buildSystemLogFilterHref(locale, "integration_api")} className={buttonVariants({ variant: "outline" })}>
              <ScrollText aria-hidden="true" />
              {labels.historyLink}
            </Link>
            {canEdit ? (
              <Button onClick={openCreate}>
                <Plus aria-hidden="true" />
                {labels.createClient}
              </Button>
            ) : null}
          </>
        }
      />

      <div className="space-y-4">
        <ClientTiles summary={summary} labels={labels} />

        {error && !editingClient && !sheetOpen ? (
          <Notice tone="danger" role="alert">
            {labels.error}: {error}
          </Notice>
        ) : null}

        <ClientCreateSheet
          open={sheetOpen}
          onOpenChange={changeSheetOpen}
          title={sheetMode === "rotate" ? labels.rotatedTitle : labels.createClient}
          labels={labels}
          scopeLabels={scopeLabels}
          error={sheetOpen && !oneTimeToken ? error : null}
          token={oneTimeToken}
          tokenAcknowledgement={tokenAcknowledgement}
          onTokenAcknowledgementChange={setTokenAcknowledgement}
          copyFeedback={copyFeedback}
          onCopyToken={copyToken}
          dismissToken={dismissToken}
          form={
            <form onSubmit={createClient} noValidate className="grid gap-4">
              <Field
                label={labels.clientId}
                id="integration-client-id"
                required
                error={createErrors.errors.clientId ? validationMessage(createErrors.errors.clientId, { min: 3, max: 100 }) : undefined}
              >
                <Input
                  value={clientId}
                  onChange={(event) => {
                    setClientId(event.target.value)
                    createErrors.clear("clientId")
                  }}
                  required
                  minLength={3}
                  maxLength={100}
                  pattern="[A-Za-z0-9._:-]+"
                  placeholder={labels.clientIdPlaceholder}
                />
              </Field>
              <Field label={labels.displayName} id="integration-display-name" required error={createErrors.message("displayName")}>
                <Input
                  value={displayName}
                  onChange={(event) => {
                    setDisplayName(event.target.value)
                    createErrors.clear("displayName")
                  }}
                  required
                  maxLength={200}
                  placeholder={labels.displayNamePlaceholder}
                />
              </Field>
              <FieldGroup legend={labels.scopes} id="integration-scopes" error={createErrors.message("scopes")}>
                <div className="grid gap-2">
                  {scopeOptions.map((scope) => (
                    <label key={scope.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                      <input
                        type="checkbox"
                        checked={selectedScopes.includes(scope.value)}
                        onChange={() => toggleScope(scope.value)}
                        className={checkboxVariants()}
                      />
                      <span>{labels[scope.labelKey]}</span>
                    </label>
                  ))}
                </div>
              </FieldGroup>
              <div>
                <Button type="submit" busy={saving} className="w-fit">
                  <Plus aria-hidden="true" />
                  {labels.createClient}
                </Button>
              </div>
            </form>
          }
        />

        <AccessibleDialog
          open={editingClient !== null}
          title={labels.editScopes}
          description={editingClient ? <span className="tag">{editingClient.clientId}</span> : undefined}
          busy={updatingClient}
          size="md"
          returnFocusRef={editOpenerRef}
          onClose={closeEditClient}
        >
          {editingClient ? (
            <form onSubmit={updateEditingClient} noValidate className={accessibleDialogFormClasses}>
              <AccessibleDialogBody className="grid gap-4">
                {error ? (
                  <Notice tone="danger" role="alert">
                    {labels.error}: {error}
                  </Notice>
                ) : null}
                <Field label={labels.displayName} id="integration-edit-display-name" required error={editErrors.message("displayName")}>
                  <Input
                    value={editDisplayName}
                    onChange={(event) => {
                      setEditDisplayName(event.target.value)
                      editErrors.clear("displayName")
                    }}
                    required
                    maxLength={200}
                  />
                </Field>
                <FieldGroup legend={labels.scopes} id="integration-edit-scopes" error={editErrors.message("scopes")}>
                  <div className="grid gap-2">
                    {scopeOptions.map((scope) => (
                      <label
                        key={scope.value}
                        className="flex min-h-11 items-center justify-between gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                      >
                        <span>{labels[scope.labelKey]}</span>
                        <input
                          type="checkbox"
                          checked={editScopes.includes(scope.value)}
                          onChange={() => toggleEditScope(scope.value)}
                          className={checkboxVariants()}
                        />
                      </label>
                    ))}
                  </div>
                </FieldGroup>
              </AccessibleDialogBody>
              <AccessibleDialogFooter>
                <AccessibleDialogCancel>{labels.cancel}</AccessibleDialogCancel>
                <Button type="submit" busy={updatingClient}>
                  <Pencil aria-hidden="true" />
                  {labels.saveScopes}
                </Button>
              </AccessibleDialogFooter>
            </form>
          ) : null}
        </AccessibleDialog>

        <ContentPanel
          divided
          flush
          className="overflow-hidden"
          title={labels.clientsTitle}
          actions={
            loading ? (
              <span role="status" className="inline-flex">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground motion-reduce:animate-none" />
                <span className="sr-only">{labels.loading}</span>
              </span>
            ) : clients.length > 0 ? (
              <ClientStatusChips value={statusFilter} counts={statusCounts(clients)} labels={labels} onChange={setStatusFilter} />
            ) : null
          }
        >
          {exampleCopyFeedback ? (
            <Notice tone={exampleCopyFeedback.tone === "success" ? "success" : "danger"} role="status" className="mx-4 mt-3 md:mx-5">
              {exampleCopyFeedback.message}
            </Notice>
          ) : null}
          {loading ? (
            <div className="grid gap-2 p-4">
              {[0, 1, 2].map((item) => (
                <div key={item} className="h-12 rounded-md bg-muted" />
              ))}
            </div>
          ) : clients.length === 0 ? (
            <ActionEmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
          ) : (
            <>
              {visibleClients.length === 0 ? (
                <EmptyNote padded>{labels.filterEmpty}</EmptyNote>
              ) : (
                <>
                  <DataTable framed={false} caption={labels.clientsTitle} minWidth={960} className="hidden md:block">
                    <DataTableHeader>
                      <tr>
                        <DataTableHead>{labels.client}</DataTableHead>
                        <DataTableHead>{labels.status}</DataTableHead>
                        <DataTableHead>{labels.scopes}</DataTableHead>
                        <DataTableHead>{labels.token}</DataTableHead>
                        <DataTableHead>{labels.lastUsed}</DataTableHead>
                        <DataTableHead align="right">{labels.actions}</DataTableHead>
                        <DataTableHead hideLabel>{labels.usageDetails}</DataTableHead>
                      </tr>
                    </DataTableHeader>
                    <DataTableBody>
                      {visibleClients.map((client) => (
                        <ClientTableRows key={client.id} {...rowProps(client)} />
                      ))}
                    </DataTableBody>
                  </DataTable>
                  <ul className="grid gap-3 p-4 md:hidden">
                    {visibleClients.map((client) => (
                      <ClientCard key={client.id} {...rowProps(client)} />
                    ))}
                  </ul>
                </>
              )}
              <p className="flex items-start gap-2 border-t border-border px-4 py-2.5 text-meta text-muted-foreground md:px-5">
                <Info aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />
                <span>{labels.hashNote}</span>
              </p>
            </>
          )}
        </ContentPanel>
      </div>
    </div>
  )
}
