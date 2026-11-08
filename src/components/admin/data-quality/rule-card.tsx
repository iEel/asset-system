"use client"

import Link from "next/link"
import { FieldGroup } from "@/components/ui/field-group"
import { linkVariants } from "@/components/ui/button-variants"
import { Segmented } from "@/components/ui/segmented"
import { StatusBadge } from "@/components/ui/status-badge"
import type { AssetDataQualityRule } from "@/lib/data-quality-rules"
import { formatCount } from "@/lib/display-format"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"

export type DataQualityRuleCardLabels = {
  severity: string
  warning: string
  danger: string
  inactive: string
  countAfterSave: string
  // "ดูทรัพย์สิน {count} รายการ", filled here with the formatted count.
  viewAssets: string
}

type DataQualityRuleCardProps = {
  rule: AssetDataQualityRule
  name: string
  description: string
  // From countsAfterSave: "off" shows no count, "afterSave" says the count comes after saving, "count" links the count.
  countState: "count" | "afterSave" | "off"
  count: number
  href: string
  // The fieldset's id: focusFirst moves to the severity group, and its legend names the Segmented.
  severityId: string
  error?: string
  disabled: boolean
  labels: DataQualityRuleCardLabels
  onChange: (patch: Partial<AssetDataQualityRule>) => void
}

// The app has no switch control (no role="switch" before this card), so the switch is the native checkbox with
// role="switch", drawn as a 40x24 track whose knob moves on: it keeps the keyboard (Space) and the checked state.
const switchClasses =
  "relative h-6 w-10 shrink-0 cursor-pointer appearance-none rounded-full border border-control-border bg-muted transition-colors motion-reduce:transition-none before:absolute before:top-0.5 before:left-0.5 before:size-4.5 before:rounded-full before:bg-surface before:transition-transform motion-reduce:before:transition-none checked:border-primary checked:bg-primary checked:before:translate-x-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:checked:border-faint-foreground disabled:checked:bg-faint-foreground forced-colors:appearance-auto"

// One rule on board AD-DataQuality: the switch and the name, the severity choice, then the count. An off rule is dimmed
// (muted words on the canvas fill) and shows no count.
export function DataQualityRuleCard({ rule, name, description, countState, count, href, severityId, error, disabled, labels, onChange }: DataQualityRuleCardProps) {
  const nameId = `data-quality-rule-${rule.key}`
  const viewText = labels.viewAssets.replace("{count}", formatCount(count))
  return (
    <article aria-labelledby={nameId} className={cn(getPanelClasses(), "flex flex-col gap-4 p-4 sm:p-5", !rule.enabled && "bg-background")}>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          role="switch"
          checked={rule.enabled}
          aria-labelledby={nameId}
          aria-describedby={`${nameId}-description`}
          disabled={disabled}
          onChange={(event) => onChange({ enabled: event.target.checked })}
          className={cn(switchClasses, "mt-0.5")}
        />
        <div className="min-w-0 flex-1">
          <h3 id={nameId} className={cn("font-semibold", rule.enabled ? "text-foreground" : "text-muted-foreground")}>{name}</h3>
          <p id={`${nameId}-description`} className={cn("mt-1 text-sm", rule.enabled ? "text-muted-foreground" : "text-faint-foreground")}>{description}</p>
        </div>
      </div>

      <FieldGroup legend={labels.severity} id={severityId} error={error}>
        <Segmented
          labelledBy={`${severityId}-legend`}
          value={rule.severity}
          options={[
            { value: "warning", label: labels.warning },
            { value: "danger", label: labels.danger },
          ]}
          onValueChange={(severity) => onChange({ severity })}
          showCheck
          disabled={disabled}
        />
      </FieldGroup>

      <div className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border-soft pt-3">
        {countState === "off" ? (
          <StatusBadge label={labels.inactive} tone="muted" />
        ) : countState === "afterSave" ? (
          <StatusBadge label={labels.countAfterSave} tone="info" />
        ) : (
          <>
            <span className="text-count num text-foreground">{formatCount(count)}</span>
            <StatusBadge label={rule.severity === "danger" ? labels.danger : labels.warning} tone={count > 0 ? rule.severity : "muted"} />
            {/* The same words on every card but the count, so the name adds the rule it opens (as the old "ดู" link did). */}
            <Link href={href} aria-label={`${viewText} ${name}`} className={cn(linkVariants(), "ms-auto inline-flex min-h-11 items-center md:min-h-0")}>
              {viewText}
            </Link>
          </>
        )}
      </div>
    </article>
  )
}
