"use client"

import { useMemo, useState } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { formatCount } from "@/lib/display-format"
import { cn } from "@/lib/utils"

type DataQualityRuleFormProps = {
  rules: AssetDataQualityRule[]
  labels: {
    save: string
    saved: string
    error: string
    enabled: string
    warning: string
    danger: string
    severity: string
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
    <ContentPanel
      title={`${labels.enabled}: ${formatCount(enabledCount)}`}
      actions={
        <Button busy={saving} onClick={save} className="w-fit">
          <Save aria-hidden="true" />
          {labels.save}
        </Button>
      }
    >
      <div className="grid gap-3">
        {items.map((rule) => (
          <div key={rule.key} className="grid gap-3 rounded-md border border-border bg-background p-4 md:grid-cols-[1fr_auto_auto] md:items-center">
            <label className="flex min-h-11 items-start gap-3 py-2">
              <input
                type="checkbox"
                checked={rule.enabled}
                onChange={(event) => updateRule(rule.key, { enabled: event.target.checked })}
                className={cn(checkboxVariants(), "mt-0.5")}
              />
              <span>
                <span id={`data-quality-rule-${rule.key}`} className="block font-medium text-foreground">{labels.ruleLabels[rule.key]}</span>
                <span className="mt-1 block text-sm text-muted-foreground">{labels.ruleDescriptions[rule.key]}</span>
              </span>
            </label>
            <Field label={labels.severity}>
              <NativeSelect
                value={rule.severity}
                onChange={(event) => updateRule(rule.key, { severity: event.target.value as AssetDataQualityRule["severity"] })}
                aria-describedby={`data-quality-rule-${rule.key}`}
              >
                <option value="warning">{labels.warning}</option>
                <option value="danger">{labels.danger}</option>
              </NativeSelect>
            </Field>
          </div>
        ))}
      </div>
    </ContentPanel>
  )
}
