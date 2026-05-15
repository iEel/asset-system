"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Download, Loader2, PackagePlus, Printer, Wrench } from "lucide-react"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/utils"
import { FileDropzone } from "@/components/ui/file-dropzone"

type AssetOption = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
}

type ComponentAttachment = {
  id: string
  originalName: string
  fileType: string
  module: string
}

type ComponentRecord = {
  id: string
  componentRole: string
  slotNo?: string | null
  installedAt: Date | string
  removedAt?: Date | string | null
  status: string
  reason?: string | null
  referenceType?: string | null
  referenceId?: string | null
  createdBy?: string | null
  updatedBy?: string | null
  installedByLabel?: string | null
  removedByLabel?: string | null
  componentAsset: AssetOption
  parentAsset?: AssetOption
  attachments?: ComponentAttachment[]
}

export function AssetComponentsPanel({
  assetId,
  currentComponents,
  componentHistory,
  installedInLinks = [],
  availableAssets,
}: {
  assetId: string
  currentComponents: ComponentRecord[]
  componentHistory: ComponentRecord[]
  installedInLinks?: ComponentRecord[]
  availableAssets: AssetOption[]
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("asset")
  const tCommon = useTranslations("common")
  const [componentAssetId, setComponentAssetId] = useState("")
  const [componentSearch, setComponentSearch] = useState("")
  const [componentResults, setComponentResults] = useState<AssetOption[]>(availableAssets)
  const [searchingComponents, setSearchingComponents] = useState(false)
  const [componentRole, setComponentRole] = useState("")
  const [slotNo, setSlotNo] = useState("")
  const [installedAt, setInstalledAt] = useState(() => toLocalDatetimeInputValue(new Date()))
  const [reason, setReason] = useState("")
  const [installEvidence, setInstallEvidence] = useState<File | null>(null)
  const [removeEvidenceById, setRemoveEvidenceById] = useState<Record<string, File | null>>({})
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
  const missingSerialCount = currentComponents.filter((component) => !component.componentAsset.serialNumber).length
  const selectedComponentAsset = useMemo(
    () => componentResults.find((asset) => asset.id === componentAssetId) ?? availableAssets.find((asset) => asset.id === componentAssetId),
    [availableAssets, componentAssetId, componentResults]
  )

  useEffect(() => {
    const controller = new AbortController()
    const timer = window.setTimeout(async () => {
      setSearchingComponents(true)
      try {
        const params = new URLSearchParams({
          parentAssetId: assetId,
          search: componentSearch,
        })
        const response = await fetch(`/api/assets/component-candidates?${params.toString()}`, {
          signal: controller.signal,
        })
        const payload = await response.json().catch(() => null)
        if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
        setComponentResults(payload?.data ?? [])
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return
        toast.error(error instanceof Error ? error.message : tCommon("error"))
      } finally {
        setSearchingComponents(false)
      }
    }, 250)

    return () => {
      window.clearTimeout(timer)
      controller.abort()
    }
  }, [assetId, componentSearch, tCommon])

  async function handleInstall(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)

    try {
      const formData = new FormData()
      formData.set("componentAssetId", componentAssetId)
      formData.set("componentRole", componentRole)
      if (slotNo) formData.set("slotNo", slotNo)
      if (installedAt) formData.set("installedAt", installedAt)
      if (reason) formData.set("reason", reason)
      if (installEvidence) formData.set("installEvidence", installEvidence)

      const response = await fetch(`/api/assets/${assetId}/components`, {
        method: "POST",
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))

      setComponentAssetId("")
      setComponentSearch("")
      setComponentRole("")
      setSlotNo("")
      setInstalledAt(toLocalDatetimeInputValue(new Date()))
      setReason("")
      setInstallEvidence(null)
      toast.success(t("componentInstallSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove(componentId: string) {
    const removeReason = window.prompt(t("componentRemoveReason"))
    if (removeReason === null) return
    setRemovingId(componentId)

    try {
      const formData = new FormData()
      if (removeReason) formData.set("reason", removeReason)
      const removeEvidence = removeEvidenceById[componentId]
      if (removeEvidence) formData.set("removeEvidence", removeEvidence)

      const response = await fetch(`/api/assets/${assetId}/components/${componentId}`, {
        method: "DELETE",
        body: formData,
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))

      toast.success(t("componentRemoveSuccess"))
      setRemoveEvidenceById((current) => ({ ...current, [componentId]: null }))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <PackagePlus className="h-5 w-5 text-primary" />
            {t("assetComponents")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("componentSummaryHelp")}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent"
          >
            <Printer className="h-4 w-4" />
            {t("printComponentList")}
          </button>
          <button
            type="button"
            onClick={() => exportComponentCsv([...currentComponents, ...componentHistory], t)}
            className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium hover:bg-accent"
          >
            <Download className="h-4 w-4" />
            {t("exportComponentList")}
          </button>
        </div>
      </div>

      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-3">
        <SummaryTile label={t("currentComponents")} value={currentComponents.length} />
        <SummaryTile label={t("componentHistory")} value={componentHistory.length} />
        <SummaryTile label={t("componentMissingSerial")} value={missingSerialCount} tone={missingSerialCount > 0 ? "warning" : "normal"} />
      </div>

      {installedInLinks.length > 0 ? (
        <div className="mb-5 rounded-md border border-primary/20 bg-primary/5 p-4">
          <div className="text-sm font-semibold text-foreground">{t("installedInParent")}</div>
          <div className="mt-2 grid gap-2">
            {installedInLinks.map((link) => (
              <Link key={link.id} href={`/${locale}/assets/${link.parentAsset?.id}`} className="text-sm font-medium text-primary hover:underline">
                {link.parentAsset?.assetTag} - {link.parentAsset?.name}
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mb-5 rounded-md border border-border bg-background px-3 py-2 text-xs text-muted-foreground">
        {t("componentGuardNote")}
      </div>

      <form onSubmit={handleInstall} className="mb-5 grid grid-cols-1 gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-2 xl:grid-cols-4">
        <label className="block xl:col-span-2">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("componentAsset")}</span>
          <input
            value={componentSearch}
            onChange={(event) => {
              setComponentSearch(event.target.value)
              setComponentAssetId("")
            }}
            placeholder={t("componentSearchPlaceholder")}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <div className="mt-1 text-xs text-muted-foreground">{t("componentSearchHelp")}</div>
          <div className="mt-2 max-h-56 overflow-auto rounded-md border border-border bg-surface">
            {searchingComponents ? (
              <div className="flex items-center gap-2 px-3 py-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("searchingAssets")}
              </div>
            ) : componentResults.length === 0 ? (
              <div className="px-3 py-3 text-sm text-muted-foreground">{t("noComponentSearchResults")}</div>
            ) : (
              componentResults.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    setComponentAssetId(asset.id)
                    setComponentSearch(asset.assetTag)
                  }}
                  className={[
                    "block w-full px-3 py-2 text-left text-sm transition-colors hover:bg-accent",
                    componentAssetId === asset.id ? "bg-primary/10 text-primary" : "text-foreground",
                  ].join(" ")}
                >
                  <span className="block font-medium">{asset.assetTag} - {asset.name}</span>
                  {asset.serialNumber ? <span className="mt-0.5 block text-xs text-muted-foreground">SN: {asset.serialNumber}</span> : null}
                </button>
              ))
            )}
          </div>
          {selectedComponentAsset ? (
            <div className="mt-2 rounded-md border border-success/30 bg-success/10 px-3 py-2 text-xs text-success">
              {t("componentSelected")}: {selectedComponentAsset.assetTag} - {selectedComponentAsset.name}
            </div>
          ) : null}
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("componentRole")}</span>
          <input
            value={componentRole}
            onChange={(event) => setComponentRole(event.target.value)}
            required
            maxLength={100}
            placeholder="Harddisk"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("slotNo")}</span>
          <input
            value={slotNo}
            onChange={(event) => setSlotNo(event.target.value)}
            maxLength={50}
            placeholder="Slot 1"
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("installedAt")}</span>
          <input
            type="datetime-local"
            value={installedAt}
            onChange={(event) => setInstalledAt(event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <label className="block md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("reason")}</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
        <div className="md:col-span-2 xl:col-span-3">
          <FileDropzone
            file={installEvidence}
            onFileChange={setInstallEvidence}
            disabled={saving}
            accept="image/*"
            capture="environment"
            title={t("componentInstallEvidence")}
            hint={t("componentEvidenceSelected")}
            browseLabel={t("componentEvidenceHelp")}
          />
        </div>
        <button
          type="submit"
          disabled={saving || !componentAssetId}
          className="inline-flex h-10 items-center justify-center gap-2 self-end rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackagePlus className="h-4 w-4" />}
          {t("installComponent")}
        </button>
      </form>

      <div className="mb-6">
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t("currentComponents")}</h3>
        {currentComponents.length === 0 ? (
          <Empty label={t("noCurrentComponents")} />
        ) : (
          <div className="space-y-3">
            {currentComponents.map((component) => (
              <div key={component.id} className="rounded-md border border-border bg-background p-4">
                <ComponentSummary component={component} locale={locale} labels={{
                  installedAt: t("installedAt"),
                  installedBy: t("installedBy"),
                  removedAt: t("removedAt"),
                  removedBy: t("removedBy"),
                }} />
                <div className="mt-3 grid gap-3 md:grid-cols-[1fr_auto] md:items-end">
                  <FileDropzone
                    file={removeEvidenceById[component.id] ?? null}
                    onFileChange={(file) => setRemoveEvidenceById((current) => ({ ...current, [component.id]: file }))}
                    disabled={removingId === component.id}
                    accept="image/*"
                    capture="environment"
                    title={t("componentRemoveEvidence")}
                    hint={t("componentEvidenceSelected")}
                    browseLabel={t("componentEvidenceHelp")}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemove(component.id)}
                    disabled={removingId === component.id}
                    className="inline-flex h-8 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-danger transition-colors hover:bg-danger/10 disabled:opacity-50"
                  >
                    {removingId === component.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Wrench className="h-3.5 w-3.5" />}
                    {t("removeComponent")}
                  </button>
                </div>
                <ComponentEvidence attachments={component.attachments ?? []} />
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-3 text-sm font-semibold text-foreground">{t("componentHistory")}</h3>
        {componentHistory.length === 0 ? (
          <Empty label={t("noComponentHistory")} />
        ) : (
          <div className="space-y-3">
            {componentHistory.map((component) => (
              <details key={component.id} className="group rounded-md border border-border bg-background">
                <summary className="cursor-pointer list-none p-4 marker:hidden">
                  <ComponentSummary component={component} locale={locale} labels={{
                    installedAt: t("installedAt"),
                    installedBy: t("installedBy"),
                    removedAt: t("removedAt"),
                    removedBy: t("removedBy"),
                  }} />
                  <div className="mt-2 text-xs font-medium text-primary group-open:hidden">{t("viewEvidence")}</div>
                </summary>
                <div className="border-t border-border px-4 pb-4 pt-3">
                  <ComponentEvidence attachments={component.attachments ?? []} />
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ComponentSummary({
  component,
  locale,
  labels,
}: {
  component: ComponentRecord
  locale: string
  labels: { installedAt: string; installedBy: string; removedAt: string; removedBy: string }
}) {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_auto]">
      <div>
        <Link href={`/${locale}/assets/${component.componentAsset.id}`} className="font-medium text-primary hover:underline">
          {component.componentAsset.assetTag} - {component.componentAsset.name}
        </Link>
        <div className="mt-1 text-xs text-muted-foreground">
          {component.componentRole}
          {component.slotNo ? ` · ${component.slotNo}` : ""}
          {component.componentAsset.serialNumber ? ` · SN: ${component.componentAsset.serialNumber}` : ""}
        </div>
        {component.reason && <div className="mt-2 text-sm text-muted-foreground">{component.reason}</div>}
      </div>
      <div className="text-xs text-muted-foreground md:text-right">
        <div>{component.status}</div>
        <div>{labels.installedAt}: {formatDateTime(component.installedAt)}</div>
        {component.installedByLabel ? <div>{labels.installedBy}: {component.installedByLabel}</div> : null}
        {component.removedAt && <div>{labels.removedAt}: {formatDateTime(component.removedAt)}</div>}
        {component.removedAt && component.removedByLabel ? <div>{labels.removedBy}: {component.removedByLabel}</div> : null}
      </div>
    </div>
  )
}

function ComponentEvidence({ attachments }: { attachments: ComponentAttachment[] }) {
  if (attachments.length === 0) return null

  return (
    <div className="mt-3 grid gap-2 md:grid-cols-2 xl:grid-cols-3">
      {attachments.map((attachment) => (
        <a
          key={attachment.id}
          href={`/api/attachments/${attachment.id}?inline=1`}
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-md border border-border bg-surface transition-colors hover:border-primary/40"
        >
          <div className="flex aspect-video items-center justify-center bg-muted/40 p-2">
            {attachment.fileType.startsWith("image/") ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={`/api/attachments/${attachment.id}?inline=1`} alt={attachment.originalName} className="max-h-full w-full object-contain" />
            ) : (
              <span className="text-xs font-medium text-muted-foreground">{attachment.fileType}</span>
            )}
          </div>
          <div className="truncate border-t border-border px-2 py-1.5 text-xs font-medium text-foreground">
            {attachment.originalName}
          </div>
        </a>
      ))}
    </div>
  )
}

function SummaryTile({ label, value, tone = "normal" }: { label: string; value: number; tone?: "normal" | "warning" }) {
  return (
    <div className={["rounded-md border p-3", tone === "warning" ? "border-warning/30 bg-warning/10" : "border-border bg-background"].join(" ")}>
      <div className="text-xs font-medium uppercase tracking-normal text-muted-foreground">{label}</div>
      <div className="mt-1 text-2xl font-semibold text-foreground">{value}</div>
    </div>
  )
}

function toLocalDatetimeInputValue(value: Date) {
  const offset = value.getTimezoneOffset()
  const local = new Date(value.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

function exportComponentCsv(components: ComponentRecord[], t: (key: string) => string) {
  const header = [
    t("assetTag"),
    t("componentRole"),
    t("slotNo"),
    t("status"),
    t("installedAt"),
    t("installedBy"),
    t("removedAt"),
    t("removedBy"),
  ]
  const rows = components.map((component) => [
    `${component.componentAsset.assetTag} - ${component.componentAsset.name}`,
    component.componentRole,
    component.slotNo ?? "",
    component.status,
    formatDateTime(component.installedAt),
    component.installedByLabel ?? "",
    component.removedAt ? formatDateTime(component.removedAt) : "",
    component.removedByLabel ?? "",
  ])
  const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n")
  const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = "asset-components.csv"
  link.click()
  URL.revokeObjectURL(url)
}

function csvCell(value: string) {
  return `"${value.replaceAll("\"", "\"\"")}"`
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}
