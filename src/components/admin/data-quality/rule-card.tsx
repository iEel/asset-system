"use client"

import Link from "next/link"
import { useTranslations } from "next-intl"
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
// Off, the knob and the track's border are muted-foreground on the muted track, so the state reads at 3:1 in both
// themes (WCAG 1.4.11, final review); on, the knob is primary-foreground on primary.
const switchClasses =
  "relative h-6 w-10 shrink-0 cursor-pointer appearance-none rounded-full border border-muted-foreground bg-muted transition-colors motion-reduce:transition-none before:absolute before:top-0.5 before:left-0.5 before:size-4.5 before:rounded-full before:bg-muted-foreground before:transition-transform motion-reduce:before:transition-none checked:border-primary checked:bg-primary checked:before:translate-x-4 checked:before:bg-primary-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:checked:border-faint-foreground disabled:checked:bg-faint-foreground forced-colors:appearance-auto"

// One rule on board AD-DataQuality: the switch and the name, the severity choice, then the count. An off rule is dimmed
// (muted words on the canvas fill) and shows no count.
export function DataQualityRuleCard({ rule, name, description, countState, count, href, severityId, error, disabled, labels, onChange }: DataQualityRuleCardProps) {
  const t = useTranslations("dataQualityPage")
  const nameId = `data-quality-rule-${rule.key}`
  const switchId = `${nameId}-switch`
  const viewText = t("viewAssets", { count })
  return (
    <article aria-labelledby={nameId} className={cn(getPanelClasses(), "flex flex-col gap-4 p-4 sm:p-5", !rule.enabled && "bg-background")}>
      <div className="flex items-start gap-3">
        {/* The padding gives the 24x40 switch a 44px hit area on phones without changing its drawing (final review). */}
        <label htmlFor={switchId} className="-m-2.5 inline-flex shrink-0 cursor-pointer p-2.5 md:m-0 md:p-0">
          <input
            type="checkbox"
            role="switch"
            id={switchId}
            checked={rule.enabled}
            aria-labelledby={nameId}
            aria-describedby={`${nameId}-description`}
            disabled={disabled}
            onChange={(event) => onChange({ enabled: event.target.checked })}
            className={cn(switchClasses, "mt-0.5")}
          />
        </label>
        <div className="min-w-0 flex-1">
          {/* A tap on the rule name toggles it too, as the old row label did. */}
          <h3 id={nameId} className={cn("font-semibold", rule.enabled ? "text-foreground" : "text-muted-foreground")}>
            <label htmlFor={switchId} className="cursor-pointer">{name}</label>
          </h3>
          <p id={`${nameId}-description`} className={cn("mt-1 text-sm", rule.enabled ? "text-muted-foreground" : "text-faint-foreground")}>{description}</p>
        </div>
      </div>

      <FieldGroup legend={labels.severity} id={severityId} error={error}>
        <Segmented
          labelledBy={`${severityId}-legend ${nameId}`}
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
