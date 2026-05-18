"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"

type DataQualityRuleFormProps = {
  rules: AssetDataQualityRule[]
  labels: {
    save: string
    saved: string
    error: string
    enabled: string
    warning: string
    danger: string
    ruleLabels: Record<string, string>
    ruleDescriptions: Record<string, string>
  }
}

export function DataQualityRuleForm({ rules, labels }: DataQualityRuleFormProps) {
  const [items, setItems] = useState(rules)
  const [saving, setSaving] = useState(false)
  const enabledCount = useMemo(() => items.filter((item) => item.enabled).length, [items])

  const updateRule = (key: string, patch: Partial<AssetDataQualityRule>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
  }

  const save = async () => {
    setSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [{ key: assetDataQualityRulesKey, value: JSON.stringify(items) }],
        }),
      })
      if (!response.ok) throw new Error(await response.text())
      toast.success(labels.saved)
    } catch {
      toast.error(labels.error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="font-semibold text-foreground">{labels.enabled}: {enabledCount.toLocaleString("th-TH")}</h2>
        </div>
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex h-10 w-fit items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {labels.save}
        </button>
      </div>
      <div className="grid gap-3">
        {items.map((rule) => (
          <div key={rule.key} className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <label className="flex items-start gap-3">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(event) => updateRule(rule.key, { enabled: event.target.checked })}
                className="mt-1 h-4 w-4 rounded border-border"
              />
              <span>
                <span className="block font-medium text-foreground">{labels.ruleLabels[rule.key]}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{labels.ruleDescriptions[rule.key]}</span>
              </span>
            </label>
            <select
              value={rule.severity}
              onChange={(event) => updateRule(rule.key, { severity: event.target.value as AssetDataQualityRule["severity"] })}
              className="h-10 rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            >
              <option value="warning">{labels.warning}</option>
              <option value="danger">{labels.danger}</option>
            </select>
          </div>
        ))}
      </div>
    </section>
  )
}
