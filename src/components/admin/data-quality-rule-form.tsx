"use client"

import { useMemo, useState } from "react"
import type { FormEvent } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Save } from "lucide-react"
import { DataQualityRuleCard, type DataQualityRuleCardLabels } from "@/components/admin/data-quality/rule-card"
import { Button } from "@/components/ui/button"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { countsAfterSave, rulesChange } from "@/lib/data-quality-page-model"
import { assetDataQualityRulesKey, type AssetDataQualityRule } from "@/lib/data-quality-rules"
import { formatCount } from "@/lib/display-format"

type DataQualityRuleFormProps = {
  rules: AssetDataQualityRule[]
  // The saved rules' issue counts and register links, by rule key.
  counts: Record<string, number>
  hrefs: Record<string, string>
  // setting:edit. Without it the cards show their controls disabled, the line ดูอย่างเดียว, and no save bar.
  canEdit: boolean
  labels: DataQualityRuleCardLabels & {
    saveRules: string
    cancel: string
    saved: string
    error: string
    readOnly: string
    // Raw texts with {rules}, {before} and {after}, filled here.
    changeTurnedOn: string
    changeTurnedOff: string
    changeEnabled: string
    noChanges: string
    ruleLabels: Record<string, string>
    ruleDescriptions: Record<string, string>
  }
}

// One severity per rule, keyed <rule>.severity, with the id focus moves to (v-track M-R1): the severity fieldset.
const severityId = (key: string) => `data-quality-severity-${key}`

// The form's one rule: a severity is one of the two choices (the Segmented offers only those). noValidate keeps the
// browser out, like every form of the V track (v-track M-R2, M-R12).
function validate(items: readonly AssetDataQualityRule[]) {
  const errors: Partial<Record<string, string>> = {}
  const check = (key: string, code: string | null) => {
    if (code) errors[key] = code
  }
  for (const rule of items) check(`${rule.key}.severity`, rule.severity === "warning" || rule.severity === "danger" ? null : "invalidChoice")
  return errors
}

// Board AD-DataQuality: the rule cards and the sticky save bar. The draft is items; saved is what the server holds, so
// the bar can say what changes and a rule switched on but not saved says นับหลังบันทึก. After a save the page refreshes,
// so the counts (and the tab's number) are the saved rules' counts (spec §7).
export function DataQualityRuleForm({ rules, counts, hrefs, canEdit, labels }: DataQualityRuleFormProps) {
  const router = useRouter()
  const apiError = useApiError()
  const fieldErrors = useFieldErrors<string>()
  const [saved, setSaved] = useState(rules)
  const [items, setItems] = useState(rules)
  const [saving, setSaving] = useState(false)
  const savedByKey = useMemo(() => new Map(saved.map((rule) => [rule.key, rule])), [saved])
  const change = useMemo(() => rulesChange(saved, items), [saved, items])
  const focusFirstError = () =>
    fieldErrors.focusFirst(items.map((item) => `${item.key}.severity`), { idFor: (key) => severityId(key.slice(0, key.indexOf("."))) })

  const updateRule = (key: string, patch: Partial<AssetDataQualityRule>) => {
    setItems((current) => current.map((item) => (item.key === key ? { ...item, ...patch } : item)))
    if (patch.severity) fieldErrors.clear(`${key}.severity`)
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!canEdit) return
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
      setSaved(items)
      router.refresh()
    } catch (error) {
      // The server's reason, described like every other server error (it was a bare catch with a fixed text).
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  const ruleNames = (keys: readonly string[]) => keys.map((key) => labels.ruleLabels[key] ?? key).join(", ")
  const summary =
    change.changed === 0
      ? labels.noChanges
      : [
          change.turnedOn.length > 0 ? labels.changeTurnedOn.replace("{rules}", ruleNames(change.turnedOn)) : null,
          change.turnedOff.length > 0 ? labels.changeTurnedOff.replace("{rules}", ruleNames(change.turnedOff)) : null,
          labels.changeEnabled.replace("{before}", formatCount(change.enabledBefore)).replace("{after}", formatCount(change.enabledAfter)),
        ]
          .filter(Boolean)
          .join(" · ")

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-3">
      {canEdit ? null : <p className="text-meta text-muted-foreground">{labels.readOnly}</p>}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
        {items.map((rule) => (
          <DataQualityRuleCard
            key={rule.key}
            rule={rule}
            name={labels.ruleLabels[rule.key]}
            description={labels.ruleDescriptions[rule.key]}
            countState={countsAfterSave(rule, savedByKey.get(rule.key))}
            count={counts[rule.key] ?? 0}
            href={hrefs[rule.key]}
            severityId={severityId(rule.key)}
            error={fieldErrors.message(`${rule.key}.severity`)}
            disabled={!canEdit || saving}
            labels={labels}
            onChange={(patch) => updateRule(rule.key, patch)}
          />
        ))}
      </div>
      {canEdit ? (
        <StickyFormFooter status={<p aria-live="polite">{summary}</p>}>
          <Button
            type="button"
            variant="outline"
            disabled={saving || change.changed === 0}
            onClick={() => {
              setItems(saved)
              fieldErrors.setErrors({})
            }}
          >
            {labels.cancel}
          </Button>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {labels.saveRules}
          </Button>
        </StickyFormFooter>
      ) : null}
    </form>
  )
}
