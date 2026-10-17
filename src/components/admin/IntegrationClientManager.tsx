"use client"

import { useEffect, useMemo, useState } from "react"
import { Copy, Loader2, Pencil, Plus, RotateCw } from "lucide-react"
import {
  buildIntegrationPowerShellExamples,
  type IntegrationClientOperationSummary,
  type IntegrationPowerShellExample,
} from "@/lib/integration-client-operations"
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
import { Chip } from "@/components/ui/chip"
import { ContentPanel } from "@/components/ui/content-panel"
import { DataTable, DataTableBody, DataTableCell, DataTableHead, DataTableHeader, DataTableRow } from "@/components/ui/data-table"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { Notice } from "@/components/ui/notice"
import { StatStrip } from "@/components/ui/stat-strip"
import { StatusBadge } from "@/components/ui/status-badge"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors, useValidationMessage } from "@/components/ui/use-field-errors"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"
import { atLeastOne, maxLength, minLength, pattern, required } from "@/lib/validation-rules"

type IntegrationClient = {
  id: string
  clientId: string
  displayName: string
  tokenPreview: string
  scopes: string[]
  enabled: boolean
  createdAt: string
  updatedAt: string
  lastUsedAt: string | null
  lastUsedIp: string | null
  lastRotatedAt: string | null
  operations: IntegrationClientOperationSummary
}

type OneTimeToken = {
  clientId: string
  token: string
}

type CopyFeedback = {
  tone: "success" | "error"
  message: string
}

type Labels = {
  summaryActive: string
  summaryDisabled: string
  summaryLastUsed: string
  createTitle: string
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
  operations: string
  requests24h: string
  requests7d: string
  errors7d: string
  topEndpoint: string
  latestError: string
  noOperationalData: string
  copyPowerShell: string
  powerShellCopied: string
  status: string
  actions: string
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

export function IntegrationClientManager({ labels }: { labels: Labels }) {
  const confirm = useConfirm()
  const apiError = useApiError()
  const createErrors = useFieldErrors<CreateField>()
  const editErrors = useFieldErrors<EditField>()
  const validationMessage = useValidationMessage()
  const [clients, setClients] = useState<IntegrationClient[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [mutatingId, setMutatingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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

  const summary = useMemo(() => {
    const active = clients.filter((client) => client.enabled).length
    const lastUsed = clients.filter((client) => client.lastUsedAt).length
    return {
      active,
      disabled: clients.length - active,
      lastUsed,
      requests7d: clients.reduce((sum, client) => sum + client.operations.requestCount7d, 0),
    }
  }, [clients])

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

  // The last scope can be unchecked now: "at least one" shows as an error on submit (spec §4.4).
  function toggleScope(scope: string) {
    setSelectedScopes((current) => (current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope]))
    createErrors.clear("scopes")
  }

  function openEditClient(client: IntegrationClient) {
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
    const hasNewScope = nextScopes.some((scope) => !client.scopes.includes(scope))
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
      setClients((current) => [payload.data, ...current.filter((client) => client.id !== payload.data.id)])
      setOneTimeToken({ clientId: payload.data.clientId, token: payload.token })
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
      setClients((current) => current.map((client) => (client.id === payload.data.id ? payload.data : client)))
      closeEditClient()
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : labels.actionFailed)
    } finally {
      setUpdatingClient(false)
      setMutatingId(null)
    }
  }

  async function rotateClient(client: IntegrationClient) {
    if (!(await confirm({ title: labels.confirmRotate, confirmLabel: labels.rotate, tone: "destructive" }))) return
    await mutateClient(client, "rotate")
  }

  async function setClientEnabled(client: IntegrationClient, enabled: boolean) {
    const confirmed = await confirm(
      enabled
        ? { title: labels.confirmEnable, confirmLabel: labels.enable }
        : { title: labels.confirmDisable, confirmLabel: labels.disable, tone: "destructive" },
    )
    if (!confirmed) return
    await mutateClient(client, enabled ? "enable" : "disable")
  }

  async function mutateClient(client: IntegrationClient, action: "rotate" | "enable" | "disable") {
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
      setClients((current) => current.map((item) => (item.id === payload.data.id ? payload.data : item)))
      if (action === "rotate" && payload.token) {
        setOneTimeToken({ clientId: payload.data.clientId, token: payload.token })
        setTokenAcknowledgement(false)
        setCopyFeedback(null)
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
  }

  return (
    <div className="space-y-4">
      {/* The 7-day count reads "การใช้งาน" with "7 วัน" as its foot: "7 วัน" alone would not say what is counted. */}
      <StatStrip
        items={[
          { key: "active", label: labels.summaryActive, value: formatCount(summary.active) },
          { key: "disabled", label: labels.summaryDisabled, value: formatCount(summary.disabled) },
          { key: "lastUsed", label: labels.summaryLastUsed, value: formatCount(summary.lastUsed) },
          { key: "requests7d", label: labels.operations, value: formatCount(summary.requests7d), foot: labels.requests7d },
        ]}
      />

      {/* The token panel (R15): a panel with a warning Notice, not a warning box around controls, so the copy result
          (success inline, an error as its own box) never sits in a box in a box. */}
      {oneTimeToken ? (
        <ContentPanel divided title={labels.tokenPanelTitle}>
          <div className="space-y-4">
            <Notice tone="warning">{labels.tokenPanelWarning}</Notice>
            <div className="rounded-md border border-border bg-background p-3">
              <div className="text-xs text-muted-foreground"><span className="tag">{oneTimeToken.clientId}</span></div>
              {/* The token is long and must wrap, so it keeps font-mono and is not a tag (R3). */}
              <div className="mt-1 break-all font-mono text-sm text-foreground">{oneTimeToken.token}</div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="outline" onClick={copyToken}>
                <Copy aria-hidden="true" />
                {labels.copyToken}
              </Button>
              {copyFeedback ? (
                <Notice tone={copyFeedback.tone === "success" ? "success" : "danger"} role="status">
                  {copyFeedback.message}
                </Notice>
              ) : null}
            </div>
            <div className="flex flex-col gap-3 border-t border-border-soft pt-4 md:flex-row md:items-center md:justify-between">
              <label className="flex min-h-11 items-start gap-3 py-2 text-sm text-foreground">
                <input
                  type="checkbox"
                  checked={tokenAcknowledgement}
                  onChange={(event) => setTokenAcknowledgement(event.target.checked)}
                  className={cn(checkboxVariants(), "mt-0.5")}
                />
                <span>{labels.tokenAcknowledgement}</span>
              </label>
              <Button onClick={dismissToken} disabled={!tokenAcknowledgement}>
                {labels.dismissToken}
              </Button>
            </div>
          </div>
        </ContentPanel>
      ) : null}

      {error && !editingClient ? (
        <Notice tone="danger" role="alert">
          {labels.error}: {error}
        </Notice>
      ) : null}

      <AccessibleDialog
        open={editingClient !== null}
        title={labels.editScopes}
        description={editingClient ? <span className="tag">{editingClient.clientId}</span> : undefined}
        busy={updatingClient}
        size="md"
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

      <ContentPanel divided title={labels.createTitle}>
        <form onSubmit={createClient} noValidate className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
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
          <FieldGroup legend={labels.scopes} id="integration-scopes" className="lg:col-span-2" error={createErrors.message("scopes")}>
            <div className="grid gap-2 md:grid-cols-3">
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
          <div className="lg:col-span-2">
            <Button type="submit" busy={saving} className="w-fit">
              <Plus aria-hidden="true" />
              {labels.createClient}
            </Button>
          </div>
        </form>
      </ContentPanel>

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
            <DataTable framed={false} caption={labels.clientsTitle} minWidth={1040} className="hidden md:block">
              <DataTableHeader>
                <tr>
                  <DataTableHead>{labels.clientId}</DataTableHead>
                  <DataTableHead>{labels.status}</DataTableHead>
                  <DataTableHead>{labels.scopes}</DataTableHead>
                  <DataTableHead>{labels.tokenPreview}</DataTableHead>
                  <DataTableHead>{labels.lastUsed}</DataTableHead>
                  <DataTableHead>{labels.operations}</DataTableHead>
                  <DataTableHead align="right">{labels.actions}</DataTableHead>
                </tr>
              </DataTableHeader>
              <DataTableBody>
                {clients.map((client) => (
                  <ClientRow
                    key={client.id}
                    client={client}
                    labels={labels}
                    busy={mutatingId === client.id}
                    onEdit={() => openEditClient(client)}
                    onRotate={() => rotateClient(client)}
                    onEnable={() => setClientEnabled(client, true)}
                    onDisable={() => setClientEnabled(client, false)}
                    onCopyPowerShell={copyPowerShellExample}
                  />
                ))}
              </DataTableBody>
            </DataTable>
            <div className="grid gap-3 p-4 md:hidden">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  labels={labels}
                  busy={mutatingId === client.id}
                  onEdit={() => openEditClient(client)}
                  onRotate={() => rotateClient(client)}
                  onEnable={() => setClientEnabled(client, true)}
                  onDisable={() => setClientEnabled(client, false)}
                  onCopyPowerShell={copyPowerShellExample}
                />
              ))}
            </div>
          </>
        )}
      </ContentPanel>
    </div>
  )
}

function ClientRow({
  client,
  labels,
  busy,
  onEdit,
  onRotate,
  onEnable,
  onDisable,
  onCopyPowerShell,
}: {
  client: IntegrationClient
  labels: Labels
  busy: boolean
  onEdit: () => void
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
  onCopyPowerShell: (example: IntegrationPowerShellExample) => void
}) {
  return (
    <DataTableRow>
      <DataTableCell>
        <div className="font-medium text-foreground"><span className="tag">{client.clientId}</span></div>
        <div className="mt-0.5 text-xs text-muted-foreground">{client.displayName}</div>
      </DataTableCell>
      <DataTableCell>
        <ClientStatus enabled={client.enabled} labels={labels} />
      </DataTableCell>
      <DataTableCell>
        <ScopeList scopes={client.scopes} />
      </DataTableCell>
      <DataTableCell className="text-xs text-foreground"><span className="tag">{client.tokenPreview}</span></DataTableCell>
      <DataTableCell className="text-muted-foreground">{formatDate(client.lastUsedAt, labels.noLastUsed)}</DataTableCell>
      <DataTableCell>
        <OperationsPanel client={client} labels={labels} onCopyPowerShell={onCopyPowerShell} />
      </DataTableCell>
      <DataTableCell align="right">
        <ActionButtons
          client={client}
          labels={labels}
          busy={busy}
          onEdit={onEdit}
          onRotate={onRotate}
          onEnable={onEnable}
          onDisable={onDisable}
          alignEnd
        />
      </DataTableCell>
    </DataTableRow>
  )
}

function ClientCard({
  client,
  labels,
  busy,
  onEdit,
  onRotate,
  onEnable,
  onDisable,
  onCopyPowerShell,
}: {
  client: IntegrationClient
  labels: Labels
  busy: boolean
  onEdit: () => void
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
  onCopyPowerShell: (example: IntegrationPowerShellExample) => void
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground"><span className="tag">{client.clientId}</span></div>
          <div className="mt-0.5 text-sm text-muted-foreground">{client.displayName}</div>
        </div>
        <ClientStatus enabled={client.enabled} labels={labels} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">{labels.scopes}: </span>
          <ScopeList scopes={client.scopes} />
        </div>
        <div>
          <span className="text-muted-foreground">{labels.tokenPreview}: </span>
          <span className="text-foreground"><span className="tag">{client.tokenPreview}</span></span>
        </div>
        <div>
          <span className="text-muted-foreground">{labels.lastUsed}: </span>
          <span className="text-foreground">{formatDate(client.lastUsedAt, labels.noLastUsed)}</span>
        </div>
        <OperationsPanel client={client} labels={labels} onCopyPowerShell={onCopyPowerShell} />
      </div>
      <div className="mt-4">
        <ActionButtons
          client={client}
          labels={labels}
          busy={busy}
          onEdit={onEdit}
          onRotate={onRotate}
          onEnable={onEnable}
          onDisable={onDisable}
        />
      </div>
    </div>
  )
}

function OperationsPanel({
  client,
  labels,
  onCopyPowerShell,
}: {
  client: IntegrationClient
  labels: Labels
  onCopyPowerShell: (example: IntegrationPowerShellExample) => void
}) {
  const operations = client.operations
  const example = getPrimaryPowerShellExample(client)
  const hasOperationalData = operations.requestCountTotal > 0

  // The three counts are a small label and number list, not tiles. Red lives only in a badge: errors above 0 are a
  // danger StatusBadge, and so is the latest error, followed by its route (no red box in the cell).
  const counts = [
    { key: "24h", label: labels.requests24h, value: operations.requestCount24h, danger: false },
    { key: "7d", label: labels.requests7d, value: operations.requestCount7d, danger: false },
    { key: "errors7d", label: labels.errors7d, value: operations.errorCount7d, danger: operations.errorCount7d > 0 },
  ]

  return (
    <div className="grid min-w-[220px] gap-2">
      <dl className="grid grid-cols-3 gap-x-3 gap-y-0.5">
        {counts.map((count) => (
          <div key={count.key} className="min-w-0">
            <dt className="truncate text-xs text-muted-foreground">{count.label}</dt>
            <dd className="text-sm font-semibold text-foreground num">
              {count.danger ? <StatusBadge tone="danger" label={formatCount(count.value)} /> : formatCount(count.value)}
            </dd>
          </div>
        ))}
      </dl>

      {hasOperationalData && operations.topEndpoint ? (
        <div className="min-w-0 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{labels.topEndpoint}: </span>
          {/* An API route is long and must wrap, so it keeps font-mono and is not a tag (R3). */}
          <span className="break-all font-mono" title={operations.topEndpoint.route}>
            {operations.topEndpoint.route}
          </span>
          <span className="ml-1">({formatCount(operations.topEndpoint.count)})</span>
        </div>
      ) : (
        <div className="text-xs text-muted-foreground">{labels.noOperationalData}</div>
      )}

      {operations.latestError ? (
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
          <StatusBadge tone="danger" label={`${labels.latestError}: ${operations.latestError.status}`} />
          <span className="break-all font-mono">{operations.latestError.route}</span>
        </div>
      ) : null}

      {example ? (
        <Button variant="outline" size="sm" onClick={() => onCopyPowerShell(example)} className="w-fit">
          <Copy aria-hidden="true" />
          {labels.copyPowerShell}
        </Button>
      ) : null}
    </div>
  )
}

function ClientStatus({ enabled, labels }: { enabled: boolean; labels: Labels }) {
  return <StatusBadge label={enabled ? labels.active : labels.disabled} tone={enabled ? "success" : "muted"} />
}

// Scope codes are names, not states: the shared Chip with the code as a tag (R2, R3).
function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <ul className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <li key={scope}>
          <Chip>
            <span className="tag">{scope}</span>
          </Chip>
        </li>
      ))}
    </ul>
  )
}

function getPrimaryPowerShellExample(client: IntegrationClient) {
  const baseUrl = typeof window === "undefined" ? "https://asset.company.com" : window.location.origin
  const examples = buildIntegrationPowerShellExamples(client, baseUrl)
  return examples.find((example) => example.key !== "health") ?? examples[0] ?? null
}

function ActionButtons({
  client,
  labels,
  busy,
  onEdit,
  onRotate,
  onEnable,
  onDisable,
  alignEnd = false,
}: {
  client: IntegrationClient
  labels: Labels
  busy: boolean
  onEdit: () => void
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
  alignEnd?: boolean
}) {
  // One row of default Buttons (36px from md, 44px below). busy is the row's: the rotate button shows the spinner
  // while any action of this client runs, as before, and keeps focus (FMG GB4: no disabled with the same condition).
  return (
    <div className={cn("flex flex-wrap gap-2", alignEnd && "justify-end")}>
      <Button variant="outline" onClick={onEdit} disabled={busy}>
        <Pencil aria-hidden="true" />
        {labels.editScopes}
      </Button>
      <Button variant="outline" busy={busy} onClick={onRotate}>
        <RotateCw aria-hidden="true" />
        {labels.rotate}
      </Button>
      {client.enabled ? (
        <Button variant="danger" onClick={onDisable} disabled={busy}>
          {labels.disable}
        </Button>
      ) : (
        <Button variant="outline" onClick={onEnable} disabled={busy}>
          {labels.enable}
        </Button>
      )}
    </div>
  )
}

function formatDate(value: string | null, fallback: string) {
  if (!value) return fallback
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return fallback
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date)
}
