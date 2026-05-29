"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { Plus, Search, Trash2 } from "lucide-react"
import { parseDepreciationPolicySetting, type DepreciationPolicy } from "@/lib/asset-depreciation"
import {
  buildDepreciationPolicyEditorState,
  buildDepreciationPolicyPreview,
  sanitizeResidualPercentInput,
  sanitizeUsefulLifeMonthsInput,
  serializeDepreciationPolicyEditorState,
  type DepreciationPolicyEditorCategory,
  type DepreciationPolicyEditorGroup,
  type DepreciationPolicyEditorState,
} from "@/lib/depreciation-policy-editor"

type DepreciationPolicyBuilderLabels = {
  depreciationPolicyBuilderTitle: string
  depreciationPolicyBuilderDescription: string
  depreciationMethod: string
  depreciationMethodStraightLine: string
  depreciationStartBasis: string
  depreciationStartBasisPurchaseDate: string
  depreciationDefaultUsefulLifeMonths: string
  depreciationDefaultResidualPercent: string
  depreciationPolicyGroups: string
  depreciationPolicyGroupName: string
  depreciationUsefulLifeMonths: string
  depreciationResidualPercent: string
  depreciationAvailableCategories: string
  depreciationSelectedCategories: string
  depreciationSearchCategories: string
  depreciationAddGroup: string
  depreciationRemoveGroup: string
  depreciationAddSelectedCategories: string
  depreciationRemoveSelectedCategories: string
  depreciationNoGroups: string
  depreciationNoMatchingCategories: string
  depreciationNoSelectedCategories: string
  depreciationAssignedCategoryConflict: string
  depreciationLegacyRules: string
  depreciationLegacyRulesHelp: string
  depreciationPreviewTitle: string
  depreciationPreviewDescription: string
  depreciationPreviewPurchasePrice: string
  depreciationPreviewPurchaseDate: string
  depreciationPreviewMonthly: string
  depreciationPreviewAccumulated: string
  depreciationPreviewNetBook: string
  depreciationPreviewAgeMonths: string
  depreciationAdvancedJson: string
  depreciationAdvancedJsonDescription: string
}

type DepreciationPolicyBuilderProps = {
  categories: DepreciationPolicyEditorCategory[]
  policyJson: string
  labels: DepreciationPolicyBuilderLabels
  onPolicyJsonChange: (value: string) => void
}

export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange }: DepreciationPolicyBuilderProps) {
  const policyParse = useMemo(() => parseDepreciationPolicySetting(policyJson), [policyJson])
  const isPolicyJsonValid = policyParse.isValid
  const initialState = useMemo(() => buildDepreciationPolicyEditorState(parsePolicyForEditor(policyJson), categories), [categories, policyJson])
  const [state, setState] = useState<DepreciationPolicyEditorState>(() => initialState)
  const [activeGroupId, setActiveGroupId] = useState<string | null>(() => initialState.groups[0]?.id ?? null)
  const [categorySearch, setCategorySearch] = useState("")
  const [selectedAvailableIds, setSelectedAvailableIds] = useState<string[]>([])
  const [selectedAssignedIds, setSelectedAssignedIds] = useState<string[]>([])
  const [previewPurchasePrice, setPreviewPurchasePrice] = useState("120000")
  const [previewPurchaseDate, setPreviewPurchaseDate] = useState("2024-05-20")
  const lastEmittedPolicyJsonRef = useRef(policyJson)

  useEffect(() => {
    if (policyJson === lastEmittedPolicyJsonRef.current) return
    const nextState = buildDepreciationPolicyEditorState(parsePolicyForEditor(policyJson), categories)
    setState(nextState)
    setActiveGroupId(nextState.groups[0]?.id ?? null)
    setSelectedAvailableIds([])
    setSelectedAssignedIds([])
    lastEmittedPolicyJsonRef.current = policyJson
  }, [categories, policyJson])

  const activeGroup = state.groups.find((group) => group.id === activeGroupId) ?? state.groups[0] ?? null
  const assignedCategoryIds = useMemo(() => new Set(state.groups.flatMap((group) => group.categoryIds)), [state.groups])
  const assignedByOtherGroup = useMemo(
    () => new Set(state.groups.filter((group) => group.id !== activeGroup?.id).flatMap((group) => group.categoryIds)),
    [activeGroup?.id, state.groups]
  )
  const selectedCategoryIds = new Set(activeGroup?.categoryIds ?? [])
  const normalizedCategorySearch = categorySearch.trim().toLowerCase()
  const availableCategories = categories.filter((category) => {
    if (selectedCategoryIds.has(category.id)) return false
    if (!normalizedCategorySearch) return true
    return category.code.toLowerCase().includes(normalizedCategorySearch) || category.name.toLowerCase().includes(normalizedCategorySearch)
  })
  const selectedCategories = categories.filter((category) => selectedCategoryIds.has(category.id))
  const previewUsefulLifeMonths = activeGroup?.usefulLifeMonths ?? state.defaultUsefulLifeMonths
  const previewResidualRatePercent = activeGroup?.residualRatePercent ?? state.defaultResidualRatePercent
  const preview = buildDepreciationPolicyPreview({
    purchasePrice: Number(previewPurchasePrice) || 0,
    purchaseDate: previewPurchaseDate,
    usefulLifeMonths: Number(previewUsefulLifeMonths) || state.defaultUsefulLifeMonths || 60,
    residualRatePercent: Number(previewResidualRatePercent) || 0,
  })

  function emitState(nextState: DepreciationPolicyEditorState) {
    if (!isPolicyJsonValid) return
    setState(nextState)
    const nextPolicyJson = JSON.stringify(serializeDepreciationPolicyEditorState(nextState, categories), null, 2)
    lastEmittedPolicyJsonRef.current = nextPolicyJson
    onPolicyJsonChange(nextPolicyJson)
  }

  function updateState(patch: Partial<DepreciationPolicyEditorState>) {
    emitState({ ...state, ...patch })
  }

  function updateGroup(groupId: string, patch: Partial<DepreciationPolicyEditorGroup>) {
    emitState({
      ...state,
      groups: state.groups.map((group) => (group.id === groupId ? { ...group, ...patch } : group)),
    })
  }

  function addGroup() {
    const group: DepreciationPolicyEditorGroup = {
      id: `group-new-${Date.now()}`,
      name: labels.depreciationAddGroup,
      usefulLifeMonths: state.defaultUsefulLifeMonths,
      residualRatePercent: state.defaultResidualRatePercent,
      categoryIds: [],
    }
    emitState({ ...state, groups: [...state.groups, group] })
    setActiveGroupId(group.id)
  }

  function removeGroup(groupId: string) {
    const nextGroups = state.groups.filter((group) => group.id !== groupId)
    emitState({ ...state, groups: nextGroups })
    setActiveGroupId(nextGroups[0]?.id ?? null)
    setSelectedAvailableIds([])
    setSelectedAssignedIds([])
  }

  function addSelectedCategories() {
    if (!activeGroup) return
    const categoryIds = selectedAvailableIds.filter((categoryId) => !assignedCategoryIds.has(categoryId))
    updateGroup(activeGroup.id, { categoryIds: [...activeGroup.categoryIds, ...categoryIds] })
    setSelectedAvailableIds([])
  }

  function removeSelectedCategories() {
    if (!activeGroup) return
    updateGroup(activeGroup.id, { categoryIds: activeGroup.categoryIds.filter((categoryId) => !selectedAssignedIds.includes(categoryId)) })
    setSelectedAssignedIds([])
  }

  return (
    <div className="space-y-5 rounded-md border border-border bg-surface p-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPolicyBuilderTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPolicyBuilderDescription}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <ReadonlyFact label={labels.depreciationMethod} value={labels.depreciationMethodStraightLine} />
        <ReadonlyFact label={labels.depreciationStartBasis} value={labels.depreciationStartBasisPurchaseDate} />
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>{labels.depreciationDefaultUsefulLifeMonths}</span>
          <input
            type="number"
            min={1}
            max={600}
            value={state.defaultUsefulLifeMonths}
            disabled={!isPolicyJsonValid}
            onChange={(event) => updateState({ defaultUsefulLifeMonths: sanitizeUsefulLifeMonthsInput(event.target.value, state.defaultUsefulLifeMonths) })}
            className={inputClassName}
          />
        </label>
        <label className="space-y-1 text-sm font-medium text-foreground">
          <span>{labels.depreciationDefaultResidualPercent}</span>
          <input
            type="number"
            min={0}
            max={90}
            step={0.01}
            value={state.defaultResidualRatePercent}
            disabled={!isPolicyJsonValid}
            onChange={(event) => updateState({ defaultResidualRatePercent: sanitizeResidualPercentInput(event.target.value, state.defaultResidualRatePercent) })}
            className={inputClassName}
          />
        </label>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-base font-semibold text-foreground">{labels.depreciationPolicyGroups}</h3>
          <button type="button" onClick={addGroup} disabled={!isPolicyJsonValid} className={compactButtonClassName}>
            <Plus className="h-4 w-4" />
            {labels.depreciationAddGroup}
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {state.groups.length === 0 ? (
            <p className="text-sm text-muted-foreground">{labels.depreciationNoGroups}</p>
          ) : (
            state.groups.map((group) => (
              <button
                key={group.id}
                type="button"
                disabled={!isPolicyJsonValid}
                onClick={() => setActiveGroupId(group.id)}
                className={`rounded-md border px-3 py-2 text-left text-sm transition-colors ${
                  activeGroup?.id === group.id ? "border-primary bg-primary/10 text-primary" : "border-border text-foreground hover:bg-accent"
                }`}
              >
                <span className="block font-medium">{group.name}</span>
                <span className="block text-xs text-muted-foreground">{group.categoryIds.length} / {categories.length}</span>
              </button>
            ))
          )}
        </div>

        {activeGroup ? (
          <div className="space-y-4 rounded-md border border-border bg-background p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{labels.depreciationPolicyGroupName}</span>
                <input value={activeGroup.name} disabled={!isPolicyJsonValid} onChange={(event) => updateGroup(activeGroup.id, { name: event.target.value })} className={inputClassName} />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{labels.depreciationUsefulLifeMonths}</span>
                <input type="number" min={1} max={600} value={activeGroup.usefulLifeMonths} disabled={!isPolicyJsonValid} onChange={(event) => updateGroup(activeGroup.id, { usefulLifeMonths: sanitizeUsefulLifeMonthsInput(event.target.value, activeGroup.usefulLifeMonths) })} className={inputClassName} />
              </label>
              <label className="space-y-1 text-sm font-medium text-foreground">
                <span>{labels.depreciationResidualPercent}</span>
                <input type="number" min={0} max={90} step={0.01} value={activeGroup.residualRatePercent} disabled={!isPolicyJsonValid} onChange={(event) => updateGroup(activeGroup.id, { residualRatePercent: sanitizeResidualPercentInput(event.target.value, activeGroup.residualRatePercent) })} className={inputClassName} />
              </label>
            </div>

            <div className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
              <CategoryPicker
                title={labels.depreciationAvailableCategories}
                categories={availableCategories}
                selectedIds={selectedAvailableIds}
                onSelectedIdsChange={setSelectedAvailableIds}
                assignedByOtherGroup={assignedByOtherGroup}
                conflictLabel={labels.depreciationAssignedCategoryConflict}
                emptyLabel={labels.depreciationNoMatchingCategories}
                searchLabel={labels.depreciationSearchCategories}
                searchValue={categorySearch}
                onSearchChange={setCategorySearch}
                disabled={!isPolicyJsonValid}
              />
              <div className="flex flex-row items-center justify-center gap-2 xl:flex-col">
                <button type="button" onClick={addSelectedCategories} disabled={!isPolicyJsonValid || selectedAvailableIds.length === 0} className={compactButtonClassName}>
                  {labels.depreciationAddSelectedCategories}
                </button>
                <button type="button" onClick={removeSelectedCategories} disabled={!isPolicyJsonValid || selectedAssignedIds.length === 0} className={compactButtonClassName}>
                  {labels.depreciationRemoveSelectedCategories}
                </button>
              </div>
              <CategoryPicker
                title={labels.depreciationSelectedCategories}
                categories={selectedCategories}
                selectedIds={selectedAssignedIds}
                onSelectedIdsChange={setSelectedAssignedIds}
                assignedByOtherGroup={new Set()}
                conflictLabel={labels.depreciationAssignedCategoryConflict}
                emptyLabel={labels.depreciationNoSelectedCategories}
                disabled={!isPolicyJsonValid}
              />
            </div>

            <button type="button" onClick={() => removeGroup(activeGroup.id)} disabled={!isPolicyJsonValid} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-danger/40 px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10 disabled:cursor-not-allowed disabled:opacity-50">
              <Trash2 className="h-4 w-4" />
              {labels.depreciationRemoveGroup}
            </button>
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPreviewTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPreviewDescription}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{labels.depreciationPreviewPurchasePrice}</span>
            <input type="number" min={0} step={0.01} value={previewPurchasePrice} onChange={(event) => setPreviewPurchasePrice(event.target.value)} className={inputClassName} />
          </label>
          <label className="space-y-1 text-sm font-medium text-foreground">
            <span>{labels.depreciationPreviewPurchaseDate}</span>
            <input type="date" value={previewPurchaseDate} onChange={(event) => setPreviewPurchaseDate(event.target.value)} className={inputClassName} />
          </label>
          <PreviewMetric label={labels.depreciationPreviewMonthly} value={formatMoney(preview.monthlyDepreciation)} />
          <PreviewMetric label={labels.depreciationPreviewNetBook} value={formatMoney(preview.netBookValue)} />
          <PreviewMetric label={labels.depreciationPreviewAccumulated} value={formatMoney(preview.accumulatedDepreciation)} />
          <PreviewMetric label={labels.depreciationPreviewAgeMonths} value={preview.ageMonths.toLocaleString()} />
        </div>
      </div>

      {state.legacyRules.length > 0 ? (
        <div className="rounded-md border border-warning/30 bg-warning/5 p-3">
          <h3 className="text-sm font-semibold text-foreground">{labels.depreciationLegacyRules}</h3>
          <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationLegacyRulesHelp}</p>
          <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
            {state.legacyRules.map((rule) => (
              <li key={`${rule.match}-${rule.usefulLifeMonths}`}>{rule.match}: {rule.usefulLifeMonths} months</li>
            ))}
          </ul>
        </div>
      ) : null}

      <details className="rounded-md border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">{labels.depreciationAdvancedJson}</summary>
        <p className="mt-2 text-sm text-muted-foreground">{labels.depreciationAdvancedJsonDescription}</p>
        <textarea
          value={policyJson}
          onChange={(event) => onPolicyJsonChange(event.target.value)}
          rows={8}
          className="mt-3 w-full rounded-md border border-border bg-background px-3 py-2 font-mono text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
        />
      </details>
    </div>
  )
}

const inputClassName = "h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
const compactButtonClassName = "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"

function ReadonlyFact({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-background px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function PreviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/20 px-3 py-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="mt-1 text-base font-semibold text-foreground">{value}</div>
    </div>
  )
}

function CategoryPicker({
  title,
  categories,
  selectedIds,
  onSelectedIdsChange,
  assignedByOtherGroup,
  conflictLabel,
  emptyLabel,
  searchLabel,
  searchValue,
  onSearchChange,
  disabled,
}: {
  title: string
  categories: DepreciationPolicyEditorCategory[]
  selectedIds: string[]
  onSelectedIdsChange: (ids: string[]) => void
  assignedByOtherGroup: Set<string>
  conflictLabel: string
  emptyLabel: string
  searchLabel?: string
  searchValue?: string
  onSearchChange?: (value: string) => void
  disabled: boolean
}) {
  return (
    <div className="min-w-0 rounded-md border border-border">
      <div className="border-b border-border px-3 py-2 text-sm font-semibold text-foreground">{title}</div>
      {onSearchChange ? (
        <label className="relative block border-b border-border p-2">
          <Search className="pointer-events-none absolute left-5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input value={searchValue ?? ""} disabled={disabled} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchLabel} className="h-9 w-full rounded-md border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary" />
        </label>
      ) : null}
      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {categories.length === 0 ? <p className="px-2 py-3 text-sm text-muted-foreground">{emptyLabel}</p> : null}
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id)
          const isConflict = assignedByOtherGroup.has(category.id)
          return (
            <label key={category.id} className={`flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors ${isConflict ? "text-muted-foreground" : "hover:bg-accent"}`}>
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled || isConflict}
                onChange={(event) => {
                  if (event.target.checked) onSelectedIdsChange([...selectedIds, category.id])
                  else onSelectedIdsChange(selectedIds.filter((id) => id !== category.id))
                }}
                className="mt-0.5"
              />
              <span className="min-w-0">
                <span className="block truncate font-medium text-foreground">{category.code}</span>
                <span className="block truncate text-xs text-muted-foreground">{category.name}</span>
                {isConflict ? <span className="mt-1 block text-xs text-warning">{conflictLabel}</span> : null}
              </span>
            </label>
          )
        })}
      </div>
    </div>
  )
}

function parsePolicyForEditor(policyJson: string): DepreciationPolicy {
  const parsed = parseDepreciationPolicySetting(policyJson)
  if (!parsed.isValid || policyJson.trim().length === 0) return parsed.policy

  try {
    const rawPolicy = JSON.parse(policyJson)
    if (!rawPolicy || typeof rawPolicy !== "object" || !Array.isArray(rawPolicy.rules)) return parsed.policy
    return {
      defaultUsefulLifeMonths: parsed.policy.defaultUsefulLifeMonths,
      defaultResidualRate: parsed.policy.defaultResidualRate,
      rules: rawPolicy.rules.map((rule: Record<string, unknown>) => ({
        ...rule,
        match: String(rule?.match ?? ""),
        usefulLifeMonths: Number(rule?.usefulLifeMonths),
        residualRate: rule?.residualRate == null ? undefined : Number(rule.residualRate),
      })),
    }
  } catch {
    return parsed.policy
  }
}

function formatMoney(value: number) {
  return value.toLocaleString("th-TH", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}
