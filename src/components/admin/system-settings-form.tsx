"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import { assetTagCategoryPrefixesKey } from "@/lib/system-setting-defaults"

type SystemSettingItem = {
  key: string
  value: string
  description?: string | null
}

type SystemSettingsFormProps = {
  settings: SystemSettingItem[]
  categories: Array<{
    id: string
    code: string
    name: string
  }>
  labels: {
    key: string
    value: string
    description: string
    generalSettings: string
    categoryPrefixes: string
    categoryPrefixesDescription: string
    category: string
    prefix: string
    addPrefix: string
    removePrefix: string
    selectCategory: string
    duplicateCategory: string
    invalidPrefix: string
    save: string
    success: string
    error: string
  }
}

type PrefixRow = {
  categoryId: string
  prefix: string
}

function parsePrefixRows(value?: string) {
  try {
    const parsed = JSON.parse(value || "{}") as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return []
    return Object.entries(parsed)
      .map(([categoryId, prefix]) => ({
        categoryId,
        prefix: typeof prefix === "string" ? prefix.trim().toUpperCase() : "",
      }))
      .filter((row) => row.categoryId && row.prefix)
  } catch {
    return []
  }
}

function serializePrefixRows(rows: PrefixRow[]) {
  return JSON.stringify(
    Object.fromEntries(
      rows
        .map((row) => [row.categoryId, row.prefix.trim().toUpperCase()])
        .filter(([categoryId, prefix]) => categoryId && prefix)
    )
  )
}

export function SystemSettingsForm({ settings, categories, labels }: SystemSettingsFormProps) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(settings.map((setting) => [setting.key, setting.value]))
  )
  const [prefixRows, setPrefixRows] = useState<PrefixRow[]>(() =>
    parsePrefixRows(settings.find((setting) => setting.key === assetTagCategoryPrefixesKey)?.value)
  )
  const generalSettings = settings.filter((setting) => setting.key !== assetTagCategoryPrefixesKey)

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedCategories = prefixRows.map((row) => row.categoryId).filter(Boolean)
    const hasDuplicateCategory = new Set(selectedCategories).size !== selectedCategories.length
    const hasInvalidPrefix = prefixRows.some((row) => row.categoryId && !/^[A-Z0-9]{2,10}$/.test(row.prefix.trim().toUpperCase()))

    if (hasDuplicateCategory) {
      toast.error(labels.duplicateCategory)
      return
    }
    if (hasInvalidPrefix) {
      toast.error(labels.invalidPrefix)
      return
    }

    setSaving(true)
    const nextValues: Record<string, string> = {
      ...values,
      [assetTagCategoryPrefixesKey]: serializePrefixRows(prefixRows),
    }
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: settings.map((setting) => ({
            key: setting.key,
            value: nextValues[setting.key] ?? "",
          })),
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? labels.error)
      toast.success(labels.success)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : labels.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.categoryPrefixes} description={labels.categoryPrefixesDescription} />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Head>{labels.category}</Head>
                <Head>{labels.prefix}</Head>
                <Head>
                  <span className="sr-only">{labels.removePrefix}</span>
                </Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {prefixRows.map((row, index) => (
                <tr key={`${row.categoryId}-${index}`} className="hover:bg-accent/50">
                  <td className="min-w-80 px-4 py-3">
                    <select
                      value={row.categoryId}
                      onChange={(event) =>
                        setPrefixRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, categoryId: event.target.value } : item
                          )
                        )
                      }
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    >
                      <option value="">{labels.selectCategory}</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.code} - {category.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="min-w-48 px-4 py-3">
                    <input
                      value={row.prefix}
                      onChange={(event) =>
                        setPrefixRows((current) =>
                          current.map((item, itemIndex) =>
                            itemIndex === index ? { ...item, prefix: event.target.value.toUpperCase() } : item
                          )
                        )
                      }
                      maxLength={10}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="w-16 px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => setPrefixRows((current) => current.filter((_, itemIndex) => itemIndex !== index))}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                      title={labels.removePrefix}
                      aria-label={labels.removePrefix}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="border-t border-border px-4 py-3">
          <button
            type="button"
            onClick={() => setPrefixRows((current) => [...current, { categoryId: "", prefix: "" }])}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            <Plus className="h-4 w-4" />
            {labels.addPrefix}
          </button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.generalSettings} />
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-border text-sm">
            <thead className="bg-muted/40">
              <tr>
                <Head>{labels.key}</Head>
                <Head>{labels.value}</Head>
                <Head>{labels.description}</Head>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {generalSettings.map((setting) => (
                <tr key={setting.key} className="hover:bg-accent/50">
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-foreground">{setting.key}</td>
                  <td className="min-w-80 px-4 py-3">
                    <input
                      value={values[setting.key] ?? ""}
                      onChange={(event) => setValues((current) => ({ ...current, [setting.key]: event.target.value }))}
                      className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                    />
                  </td>
                  <td className="min-w-80 px-4 py-3 text-muted-foreground">{setting.description || "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={saving}
          className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          {labels.save}
        </button>
      </div>
    </form>
  )
}

function SectionHeader({ title, description }: { title: string; description?: string }) {
  return (
    <div className="border-b border-border px-4 py-4">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description ? <p className="mt-1 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  )
}

function Head({ children }: { children: React.ReactNode }) {
  return <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-normal text-muted-foreground">{children}</th>
}
