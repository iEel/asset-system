"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { NativeSelect } from "@/components/ui/native-select"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
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

// One severity per rule, keyed <rule>.severity, with the id focus moves to (v-track M-R1).
const severityId = (key: string) => `data-quality-severity-${key}`

// The form's one rule: a severity is one of the two choices (the select offers only those). noValidate keeps the
// browser out, like every form of the V track (v-track M-R2, M-R12).
function validate(items: readonly AssetDataQualityRule[]) {
  const errors: Partial<Record<string, string>> = {}
  const check = (key: string, code: string | null) => {
    if (code) errors[key] = code
  }
  for (const rule of items) check(`${rule.key}.severity`, rule.severity === "warning" || rule.severity === "danger" ? null : "invalidChoice")
  return errors
}

export function DataQualityRuleForm({ rules, labels }: DataQualityRuleFormProps) {
  const apiError = useApiError()
  const fieldErrors = useFieldErrors<string>()
  const [items, setItems] = useState(rules)
  const [saving, setSaving] = useState(false)
  const enabledCount = useMemo(() => items.filter((item) => item.enabled).length, [items])
  const focusFirstError = () =>
    fieldErrors.focusFirst(items.map((item) => `${item.key}.severity`), { idFor: (key) => severityId(key.slice(0, key.indexOf("."))) })

  const updateRule = (key: string, patch: Partial<AssetDataQualityRule>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
    if (patch.severity) fieldErrors.clear(`${key}.severity`)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    fieldErrors.setErrors(validate(items))
    if (focusFirstError()) return
    setSaving(true)
    try {
      const response = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: [{ key: assetDataQualityRulesKey, value: JSON.stringify(items) }],
        }),
      })
      if (!response.ok) {
        const result = await response.json().catch(() => null)
        if (fieldErrors.applyServer(result) && focusFirstError()) return
        throw new Error(result?.error ?? labels.error)
      }
      toast.success(labels.saved)
    } catch (error) {
      // The server's reason, described like every other server error (it was a bare catch with a fixed text).
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <ContentPanel
        title={`${labels.enabled}: ${formatCount(enabledCount)}`}
        actions={
          <Button type="submit" busy={saving} className="w-fit">
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
              <Field label={labels.severity} id={severityId(rule.key)} error={fieldErrors.message(`${rule.key}.severity`)}>
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
    </form>
  )
}
