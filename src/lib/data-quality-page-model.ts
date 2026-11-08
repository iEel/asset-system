import type { AssetDataQualityRule, AssetDataQualityRuleKey } from "./data-quality-rules.ts"

// Page group 12 plan 3 (spec §7): the /admin/data-quality page model. Pure, so tests and the page both load it.

export type DataQualityTab = "rules" | "review"

export function parseDataQualityTab(value: string | string[] | undefined): DataQualityTab {
  const raw = Array.isArray(value) ? value[0] : value
  return String(raw ?? "").trim() === "review" ? "review" : "rules"
}

export type RuleCount = { key: AssetDataQualityRuleKey; count: number }

export function distribution(
  rules: readonly AssetDataQualityRule[],
  counts: readonly RuleCount[],
): { total: number; segments: { key: AssetDataQualityRuleKey; count: number; share: number }[] } {
  const countByKey = new Map(counts.map((entry) => [entry.key, entry.count]))
  const present = rules
    .filter((rule) => rule.enabled)
    .map((rule) => ({ key: rule.key, count: countByKey.get(rule.key) ?? 0 }))
    .filter((entry) => entry.count > 0)
  const total = present.reduce((sum, entry) => sum + entry.count, 0)
  if (total === 0) return { total: 0, segments: [] }
  return { total, segments: present.map((entry) => ({ ...entry, share: entry.count / total })) }
}

export function rulesChange(
  saved: readonly AssetDataQualityRule[],
  draft: readonly AssetDataQualityRule[],
): {
  changed: number
  enabledBefore: number
  enabledAfter: number
  turnedOn: AssetDataQualityRuleKey[]
  turnedOff: AssetDataQualityRuleKey[]
} {
  const savedByKey = new Map(saved.map((rule) => [rule.key, rule]))
  let changed = 0
  const turnedOn: AssetDataQualityRuleKey[] = []
  const turnedOff: AssetDataQualityRuleKey[] = []
  for (const rule of draft) {
    const before = savedByKey.get(rule.key)
    const wasEnabled = before?.enabled ?? false
    if (!before || before.enabled !== rule.enabled || before.severity !== rule.severity) changed += 1
    if (rule.enabled && !wasEnabled) turnedOn.push(rule.key)
    if (!rule.enabled && wasEnabled) turnedOff.push(rule.key)
  }
  return {
    changed,
    enabledBefore: saved.filter((rule) => rule.enabled).length,
    enabledAfter: draft.filter((rule) => rule.enabled).length,
    turnedOn,
    turnedOff,
  }
}

// "afterSave" = switched on in the draft but not yet saved, so the page has no count for it yet.
export function countsAfterSave(
  rule: AssetDataQualityRule,
  saved: AssetDataQualityRule | undefined,
): "count" | "afterSave" | "off" {
  if (!rule.enabled) return "off"
  return saved?.enabled ? "count" : "afterSave"
}
