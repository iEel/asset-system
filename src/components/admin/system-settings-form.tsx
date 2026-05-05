"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import {
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
  defaultAssetTagFormatTemplate,
} from "@/lib/system-setting-defaults"

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
    assetTagFormat: string
    assetTagFormatDescription: string
    assetTagTemplate: string
    assetTagTemplateHelp: string
    availableTokens: string
    exampleFormat: string
    formatPresets: string
    presetCompanyPrefixMonthRunning: string
    presetCompanyBranchPrefixRunning: string
    presetGlobalPrefixYearRunning: string
    numberingOptions: string
    runningDigits: string
    separator: string
    globalPrefix: string
    invalidFormatTemplate: string
    categoryPrefixes: string
    categoryPrefixesDescription: string
    noCategoryPrefixes: string
    category: string
    prefix: string
    addPrefix: string
    removePrefix: string
    selectCategory: string
    duplicateCategory: string
    invalidPrefix: string
    organizationDefaults: string
    organizationDefaultsDescription: string
    companyName: string
    defaultCurrency: string
    advancedSettings: string
    advancedSettingsDescription: string
    save: string
    success: string
    error: string
  }
}

type PrefixRow = {
  categoryId: string
  prefix: string
}

const assetTagFormatTokens = [
  "companyCode",
  "branchCode",
  "categoryCode",
  "assetPrefix",
  "globalPrefix",
  "year",
  "year2",
  "month",
  "day",
  "running",
  "separator",
]

const formatPresets = [
  {
    labelKey: "presetCompanyPrefixMonthRunning",
    value: "{companyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}",
  },
  {
    labelKey: "presetCompanyBranchPrefixRunning",
    value: defaultAssetTagFormatTemplate,
  },
  {
    labelKey: "presetGlobalPrefixYearRunning",
    value: "{globalPrefix}{separator}{assetPrefix}{separator}{year2}{separator}{running}",
  },
] as const

const friendlySettingKeys = new Set([
  "asset_tag_prefix",
  "asset_tag_separator",
  "asset_tag_running_digits",
  "company_name",
  "default_currency",
  assetTagCategoryPrefixesKey,
  assetTagFormatTemplateKey,
])

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
  const generalSettings = settings.filter(
    (setting) => !friendlySettingKeys.has(setting.key)
  )
  const formatTemplate = values[assetTagFormatTemplateKey] ?? defaultAssetTagFormatTemplate
  const getValue = (key: string) => values[key] ?? ""
  const setValue = (key: string, value: string) => setValues((current) => ({ ...current, [key]: value }))

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const selectedCategories = prefixRows.map((row) => row.categoryId).filter(Boolean)
    const hasDuplicateCategory = new Set(selectedCategories).size !== selectedCategories.length
    const hasInvalidPrefix = prefixRows.some((row) => row.categoryId && !/^[A-Z0-9]{2,10}$/.test(row.prefix.trim().toUpperCase()))
    const templateTokens = Array.from(formatTemplate.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
    const hasInvalidTemplate =
      !formatTemplate.includes("{running}") || templateTokens.some((token) => !assetTagFormatTokens.includes(token))

    if (hasDuplicateCategory) {
      toast.error(labels.duplicateCategory)
      return
    }
    if (hasInvalidPrefix) {
      toast.error(labels.invalidPrefix)
      return
    }
    if (hasInvalidTemplate) {
      toast.error(labels.invalidFormatTemplate)
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
        <SectionHeader title={labels.assetTagFormat} description={labels.assetTagFormatDescription} />
        <div className="space-y-4 px-4 py-4">
          <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
            <div className="space-y-2">
              <label className="block text-sm font-medium text-foreground" htmlFor="asset-tag-template">
                {labels.assetTagTemplate}
              </label>
              <input
                id="asset-tag-template"
                value={formatTemplate}
                onChange={(event) => setValue(assetTagFormatTemplateKey, event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-background px-3 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
              <p className="text-sm text-muted-foreground">{labels.assetTagTemplateHelp}</p>
            </div>
            <div className="space-y-2">
              <div className="text-sm font-medium text-foreground">{labels.formatPresets}</div>
              <div className="grid gap-2">
                {formatPresets.map((preset) => (
                  <button
                    type="button"
                    key={preset.value}
                    onClick={() => setValue(assetTagFormatTemplateKey, preset.value)}
                    className="min-h-10 rounded-md border border-border px-3 py-2 text-left text-sm text-foreground transition-colors hover:bg-accent"
                  >
                    {labels[preset.labelKey]}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="text-xs font-semibold uppercase tracking-normal text-muted-foreground">{labels.availableTokens}</div>
            <div className="flex flex-wrap gap-2">
              {assetTagFormatTokens.map((token) => (
                <button
                  type="button"
                  key={token}
                  onClick={() =>
                    setValues((current) => ({
                      ...current,
                      [assetTagFormatTemplateKey]: `${current[assetTagFormatTemplateKey] ?? defaultAssetTagFormatTemplate}{${token}}`,
                    }))
                  }
                  className="inline-flex h-8 items-center rounded-md border border-border px-2 font-mono text-xs text-foreground transition-colors hover:bg-accent"
                >
                  {`{${token}}`}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-md border border-border bg-muted/30 px-3 py-2 font-mono text-xs text-muted-foreground">
            {labels.exampleFormat}: {"{companyCode}{separator}{assetPrefix}{separator}{month}{separator}{running}"}
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
        <SectionHeader title={labels.numberingOptions} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-3">
          <Field label={labels.runningDigits} htmlFor="asset-tag-running-digits">
            <input
              id="asset-tag-running-digits"
              type="number"
              min={1}
              max={12}
              value={getValue("asset_tag_running_digits")}
              onChange={(event) => setValue("asset_tag_running_digits", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.separator} htmlFor="asset-tag-separator">
            <input
              id="asset-tag-separator"
              value={getValue("asset_tag_separator")}
              onChange={(event) => setValue("asset_tag_separator", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.globalPrefix} htmlFor="asset-tag-global-prefix">
            <input
              id="asset-tag-global-prefix"
              value={getValue("asset_tag_prefix")}
              onChange={(event) => setValue("asset_tag_prefix", event.target.value.toUpperCase())}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
      </div>

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
              {prefixRows.length === 0 ? (
                <tr>
                  <td className="px-4 py-6 text-sm text-muted-foreground" colSpan={3}>
                    {labels.noCategoryPrefixes}
                  </td>
                </tr>
              ) : null}
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
        <SectionHeader title={labels.organizationDefaults} description={labels.organizationDefaultsDescription} />
        <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
          <Field label={labels.companyName} htmlFor="company-name">
            <input
              id="company-name"
              value={getValue("company_name")}
              onChange={(event) => setValue("company_name", event.target.value)}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
          <Field label={labels.defaultCurrency} htmlFor="default-currency">
            <input
              id="default-currency"
              value={getValue("default_currency")}
              onChange={(event) => setValue("default_currency", event.target.value.toUpperCase())}
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm uppercase outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
      </div>

      {generalSettings.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-border bg-surface shadow-sm">
          <SectionHeader title={labels.advancedSettings} description={labels.advancedSettingsDescription} />
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
      ) : null}

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

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-foreground" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
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
