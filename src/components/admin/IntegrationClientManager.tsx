"use client"

import { useEffect, useMemo, useState } from "react"
import { AlertTriangle, CheckCircle2, Copy, KeyRound, Loader2, Plus, RotateCw, ShieldOff } from "lucide-react"

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
  enable: string
  disable: string
  confirmRotate: string
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
  status: string
  actions: string
}

const scopeOptions = [
  { value: "asset:read", labelKey: "scopeAssetRead" },
  { value: "reference:read", labelKey: "scopeReferenceRead" },
  { value: "integration:read", labelKey: "scopeIntegrationRead" },
] as const

export function IntegrationClientManager({ labels }: { labels: Labels }) {
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

  const summary = useMemo(() => {
    const active = clients.filter((client) => client.enabled).length
    const lastUsed = clients.filter((client) => client.lastUsedAt).length
    return {
      active,
      disabled: clients.length - active,
      lastUsed,
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

  function toggleScope(scope: string) {
    setSelectedScopes((current) => {
      if (current.includes(scope)) {
        const next = current.filter((item) => item !== scope)
        return next.length > 0 ? next : current
      }
      return [...current, scope]
    })
  }

  async function createClient(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/integration-clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clientId, displayName, scopes: selectedScopes }),
      })
      if (!response.ok) throw new Error(labels.createFailed)
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

  async function rotateClient(client: IntegrationClient) {
    if (!window.confirm(labels.confirmRotate)) return
    await mutateClient(client, "rotate")
  }

  async function setClientEnabled(client: IntegrationClient, enabled: boolean) {
    if (!window.confirm(enabled ? labels.confirmEnable : labels.confirmDisable)) return
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

  function dismissToken() {
    if (!tokenAcknowledgement) return
    setOneTimeToken(null)
    setTokenAcknowledgement(false)
    setCopyFeedback(null)
  }

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryCard icon={<CheckCircle2 className="h-5 w-5" />} label={labels.summaryActive} value={summary.active} tone="success" />
        <SummaryCard icon={<ShieldOff className="h-5 w-5" />} label={labels.summaryDisabled} value={summary.disabled} tone="muted" />
        <SummaryCard icon={<KeyRound className="h-5 w-5" />} label={labels.summaryLastUsed} value={summary.lastUsed} tone="primary" />
      </section>

      {oneTimeToken ? (
        <section className="rounded-lg border border-warning/40 bg-warning/5 p-4 shadow-sm">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-warning">
                <AlertTriangle className="h-5 w-5 shrink-0" />
                <h2 className="font-semibold text-foreground">{labels.tokenPanelTitle}</h2>
              </div>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{labels.tokenPanelWarning}</p>
              <div className="mt-3 rounded-md border border-border bg-surface p-3 font-mono text-sm text-foreground">
                <div className="text-xs font-sans text-muted-foreground">{oneTimeToken.clientId}</div>
                <div className="mt-1 break-all">{oneTimeToken.token}</div>
              </div>
            </div>
            <div className="flex w-fit flex-col gap-2">
              <button
                type="button"
                onClick={copyToken}
                className="inline-flex h-10 min-h-11 w-fit items-center justify-center gap-2 rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <Copy className="h-4 w-4" />
                {labels.copyToken}
              </button>
              {copyFeedback ? (
                <div
                  role="status"
                  className={`rounded-md px-3 py-2 text-sm ${
                    copyFeedback.tone === "success" ? "bg-success/10 text-success" : "bg-danger/5 text-danger"
                  }`}
                >
                  {copyFeedback.message}
                </div>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-warning/20 pt-4 md:flex-row md:items-center md:justify-between">
            <label className="flex items-start gap-3 text-sm text-foreground">
              <input
                type="checkbox"
                checked={tokenAcknowledgement}
                onChange={(event) => setTokenAcknowledgement(event.target.checked)}
                className="mt-0.5 h-4 w-4 rounded border-border"
              />
              <span>{labels.tokenAcknowledgement}</span>
            </label>
            <button
              type="button"
              onClick={dismissToken}
              disabled={!tokenAcknowledgement}
              className="inline-flex h-10 min-h-11 w-fit items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {labels.dismissToken}
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <div className="rounded-md border border-danger/30 bg-danger/5 p-3 text-sm text-danger" role="alert">
          {labels.error}: {error}
        </div>
      ) : null}

      <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-foreground">{labels.createTitle}</h2>
        </div>
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]" onSubmit={createClient}>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {labels.clientId}
            <input
              value={clientId}
              onChange={(event) => setClientId(event.target.value)}
              required
              minLength={3}
              maxLength={100}
              pattern="[A-Za-z0-9._:-]+"
              placeholder={labels.clientIdPlaceholder}
              className="h-10 min-h-11 rounded-md border border-border bg-background px-3 text-sm font-normal outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <label className="grid gap-1.5 text-sm font-medium text-foreground">
            {labels.displayName}
            <input
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              required
              maxLength={200}
              placeholder={labels.displayNamePlaceholder}
              className="h-10 min-h-11 rounded-md border border-border bg-background px-3 text-sm font-normal outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </label>
          <fieldset className="lg:col-span-2">
            <legend className="mb-2 text-sm font-medium text-foreground">{labels.scopes}</legend>
            <div className="grid gap-2 md:grid-cols-3">
              {scopeOptions.map((scope) => (
                <label key={scope.value} className="flex min-h-11 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    checked={selectedScopes.includes(scope.value)}
                    onChange={() => toggleScope(scope.value)}
                    className="h-4 w-4 rounded border-border"
                  />
                  <span>{labels[scope.labelKey]}</span>
                </label>
              ))}
            </div>
          </fieldset>
          <div className="lg:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex h-10 min-h-11 w-fit items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              {labels.createClient}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-border bg-surface shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-border p-4">
          <h2 className="font-semibold text-foreground">{labels.clientsTitle}</h2>
          {loading ? <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /> : null}
        </div>
        {loading ? (
          <div className="grid gap-2 p-4">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-12 rounded-md bg-muted" />
            ))}
          </div>
        ) : clients.length === 0 ? (
          <div className="p-6">
            <div className="rounded-md border border-dashed border-border bg-background p-4">
              <h3 className="font-medium text-foreground">{labels.emptyTitle}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{labels.emptyDescription}</p>
            </div>
          </div>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="border-b border-border bg-muted/50 text-muted-foreground">
                  <tr>
                    <th className="px-4 py-3 font-medium">{labels.clientId}</th>
                    <th className="px-4 py-3 font-medium">{labels.status}</th>
                    <th className="px-4 py-3 font-medium">{labels.scopes}</th>
                    <th className="px-4 py-3 font-medium">{labels.tokenPreview}</th>
                    <th className="px-4 py-3 font-medium">{labels.lastUsed}</th>
                    <th className="px-4 py-3 text-right font-medium">{labels.actions}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {clients.map((client) => (
                    <ClientRow
                      key={client.id}
                      client={client}
                      labels={labels}
                      busy={mutatingId === client.id}
                      onRotate={() => rotateClient(client)}
                      onEnable={() => setClientEnabled(client, true)}
                      onDisable={() => setClientEnabled(client, false)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
            <div className="grid gap-3 p-4 md:hidden">
              {clients.map((client) => (
                <ClientCard
                  key={client.id}
                  client={client}
                  labels={labels}
                  busy={mutatingId === client.id}
                  onRotate={() => rotateClient(client)}
                  onEnable={() => setClientEnabled(client, true)}
                  onDisable={() => setClientEnabled(client, false)}
                />
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  )
}

function ClientRow({
  client,
  labels,
  busy,
  onRotate,
  onEnable,
  onDisable,
}: {
  client: IntegrationClient
  labels: Labels
  busy: boolean
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
}) {
  return (
    <tr className="align-top">
      <td className="px-4 py-3">
        <div className="font-medium text-foreground">{client.clientId}</div>
        <div className="mt-0.5 text-xs text-muted-foreground">{client.displayName}</div>
      </td>
      <td className="px-4 py-3">
        <StatusBadge enabled={client.enabled} labels={labels} />
      </td>
      <td className="px-4 py-3">
        <ScopeList scopes={client.scopes} />
      </td>
      <td className="px-4 py-3 font-mono text-xs text-foreground">{client.tokenPreview}</td>
      <td className="px-4 py-3 text-muted-foreground">{formatDate(client.lastUsedAt, labels.noLastUsed)}</td>
      <td className="px-4 py-3">
        <ActionButtons client={client} labels={labels} busy={busy} onRotate={onRotate} onEnable={onEnable} onDisable={onDisable} alignEnd />
      </td>
    </tr>
  )
}

function ClientCard({
  client,
  labels,
  busy,
  onRotate,
  onEnable,
  onDisable,
}: {
  client: IntegrationClient
  labels: Labels
  busy: boolean
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
}) {
  return (
    <div className="rounded-md border border-border bg-background p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate font-medium text-foreground">{client.clientId}</div>
          <div className="mt-0.5 text-sm text-muted-foreground">{client.displayName}</div>
        </div>
        <StatusBadge enabled={client.enabled} labels={labels} />
      </div>
      <div className="mt-3 grid gap-2 text-sm">
        <div>
          <span className="text-muted-foreground">{labels.scopes}: </span>
          <ScopeList scopes={client.scopes} />
        </div>
        <div>
          <span className="text-muted-foreground">{labels.tokenPreview}: </span>
          <span className="font-mono text-xs text-foreground">{client.tokenPreview}</span>
        </div>
        <div>
          <span className="text-muted-foreground">{labels.lastUsed}: </span>
          <span className="text-foreground">{formatDate(client.lastUsedAt, labels.noLastUsed)}</span>
        </div>
      </div>
      <div className="mt-4">
        <ActionButtons client={client} labels={labels} busy={busy} onRotate={onRotate} onEnable={onEnable} onDisable={onDisable} />
      </div>
    </div>
  )
}

function SummaryCard({ icon, label, value, tone }: { icon: React.ReactNode; label: string; value: number; tone: "primary" | "success" | "muted" }) {
  const toneClass = tone === "success" ? "text-success" : tone === "primary" ? "text-primary" : "text-muted-foreground"
  return (
    <div className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value.toLocaleString()}</p>
        </div>
        <div className={toneClass}>{icon}</div>
      </div>
    </div>
  )
}

function StatusBadge({ enabled, labels }: { enabled: boolean; labels: Labels }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
        enabled ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
      }`}
    >
      {enabled ? labels.active : labels.disabled}
    </span>
  )
}

function ScopeList({ scopes }: { scopes: string[] }) {
  return (
    <div className="flex flex-wrap gap-1">
      {scopes.map((scope) => (
        <span key={scope} className="rounded-full bg-muted px-2 py-1 font-mono text-xs text-muted-foreground">
          {scope}
        </span>
      ))}
    </div>
  )
}

function ActionButtons({
  client,
  labels,
  busy,
  onRotate,
  onEnable,
  onDisable,
  alignEnd = false,
}: {
  client: IntegrationClient
  labels: Labels
  busy: boolean
  onRotate: () => void
  onEnable: () => void
  onDisable: () => void
  alignEnd?: boolean
}) {
  return (
    <div className={`flex flex-wrap gap-2 ${alignEnd ? "justify-end" : ""}`}>
      <button
        type="button"
        onClick={onRotate}
        disabled={busy}
        className="inline-flex h-10 min-h-11 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
        {labels.rotate}
      </button>
      {client.enabled ? (
        <button
          type="button"
          onClick={onDisable}
          disabled={busy}
          className="inline-flex h-10 min-h-11 items-center justify-center rounded-md border border-danger/30 bg-danger/5 px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.disable}
        </button>
      ) : (
        <button
          type="button"
          onClick={onEnable}
          disabled={busy}
          className="inline-flex h-10 min-h-11 items-center justify-center rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          {labels.enable}
        </button>
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
