"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, PackagePlus, Wrench } from "lucide-react"
import { toast } from "sonner"
import { formatDateTime } from "@/lib/utils"

type AssetOption = {
  id: string
  assetTag: string
  name: string
  serialNumber?: string | null
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
  componentAsset: AssetOption
}

export function AssetComponentsPanel({
  assetId,
  currentComponents,
  componentHistory,
  availableAssets,
}: {
  assetId: string
  currentComponents: ComponentRecord[]
  componentHistory: ComponentRecord[]
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
  const [reason, setReason] = useState("")
  const [saving, setSaving] = useState(false)
  const [removingId, setRemovingId] = useState<string | null>(null)
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
      const response = await fetch(`/api/assets/${assetId}/components`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          componentAssetId,
          componentRole,
          slotNo,
          reason,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))

      setComponentAssetId("")
      setComponentSearch("")
      setComponentRole("")
      setSlotNo("")
      setReason("")
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
      const response = await fetch(`/api/assets/${assetId}/components/${componentId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: removeReason }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))

      toast.success(t("componentRemoveSuccess"))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setRemovingId(null)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-foreground">
        <PackagePlus className="h-5 w-5 text-primary" />
        {t("assetComponents")}
      </h2>

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
        <label className="block md:col-span-2 xl:col-span-3">
          <span className="mb-1.5 block text-sm font-medium text-foreground">{t("reason")}</span>
          <input
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            maxLength={500}
            className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </label>
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
                <ComponentSummary component={component} locale={locale} />
                <div className="mt-3 flex justify-end">
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
              <div key={component.id} className="rounded-md border border-border bg-background p-4">
                <ComponentSummary component={component} locale={locale} />
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

function ComponentSummary({ component, locale }: { component: ComponentRecord; locale: string }) {
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
        <div>{formatDateTime(component.installedAt)}</div>
        {component.removedAt && <div>{formatDateTime(component.removedAt)}</div>}
      </div>
    </div>
  )
}

function Empty({ label }: { label: string }) {
  return (
    <div className="rounded-md border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
      {label}
    </div>
  )
}
