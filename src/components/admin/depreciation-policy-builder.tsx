"use client"

import { useEffect, useId, useMemo, useRef, useState } from "react"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ChoiceChip } from "@/components/ui/choice-card"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { KeyValueList } from "@/components/ui/key-value-list"
import { Notice } from "@/components/ui/notice"
import { SearchField } from "@/components/ui/search-field"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import { parseDepreciationPolicySetting, type DepreciationPolicy } from "@/lib/asset-depreciation"
import {
  buildDepreciationPolicyEditorState,
  buildDepreciationPolicyPreview,
  formatPurchasePriceInput,
  sanitizePurchasePriceInput,
  sanitizeResidualPercentInput,
  sanitizeUsefulLifeMonthsInput,
  serializeDepreciationPolicyEditorState,
  type DepreciationPolicyEditorCategory,
  type DepreciationPolicyEditorGroup,
  type DepreciationPolicyEditorState,
} from "@/lib/depreciation-policy-editor"
import { formatCount, formatMoney } from "@/lib/display-format"

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
  depreciationLegacyRuleMonths: string
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
  // The policy JSON's id and its error (the settings form's rule for accounting_depreciation_policy, spec U8).
  jsonId?: string
  jsonError?: React.ReactNode
  // The text of that rule while the JSON breaks it, or null, for the JSON field's polite region; a save's error is read
  // once, by focus (v-track final task 3).
  jsonLiveError?: string | null
}

export function DepreciationPolicyBuilder({ categories, policyJson, labels, onPolicyJsonChange, jsonId, jsonError, jsonLiveError }: DepreciationPolicyBuilderProps) {
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
  // The group chips are one radio group, named by the "groups" heading (spec 2C section 7.4.4, T6).
  const groupsHeadingId = useId()
  const groupRadioName = useId()
  // Invalid JSON disables every control above it, so its closed section opens to show the JSON and its error (spec §4.2).
  const jsonDetailsRef = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (!isPolicyJsonValid && jsonDetailsRef.current) jsonDetailsRef.current.open = true
  }, [isPolicyJsonValid])

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

  // The builder sits in the organization panel: a line above it instead of a frame in the frame (D9).
  return (
    <div className="space-y-5 border-t border-border pt-5">
      <div>
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPolicyBuilderTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPolicyBuilderDescription}</p>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <KeyValueList
          className="md:col-span-2"
          items={[
            { key: "method", label: labels.depreciationMethod, value: labels.depreciationMethodStraightLine },
            { key: "startBasis", label: labels.depreciationStartBasis, value: labels.depreciationStartBasisPurchaseDate },
          ]}
        />
        <Field label={labels.depreciationDefaultUsefulLifeMonths}>
          <Input
            type="number"
            min={1}
            max={600}
            value={state.defaultUsefulLifeMonths}
            disabled={!isPolicyJsonValid}
            onChange={(event) => updateState({ defaultUsefulLifeMonths: sanitizeUsefulLifeMonthsInput(event.target.value, state.defaultUsefulLifeMonths) })}
          />
        </Field>
        <Field label={labels.depreciationDefaultResidualPercent}>
          <Input
            type="number"
            min={0}
            max={90}
            step={0.01}
            value={state.defaultResidualRatePercent}
            disabled={!isPolicyJsonValid}
            onChange={(event) => updateState({ defaultResidualRatePercent: sanitizeResidualPercentInput(event.target.value, state.defaultResidualRatePercent) })}
          />
        </Field>
      </div>

      <div className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <h3 id={groupsHeadingId} className="text-base font-semibold text-foreground">{labels.depreciationPolicyGroups}</h3>
          <Button variant="outline" onClick={addGroup} disabled={!isPolicyJsonValid}>
            <Plus />
            {labels.depreciationAddGroup}
          </Button>
        </div>
        {state.groups.length === 0 ? (
          <EmptyNote>{labels.depreciationNoGroups}</EmptyNote>
        ) : (
          <div role="radiogroup" aria-labelledby={groupsHeadingId} className="flex flex-wrap gap-2">
            {state.groups.map((group) => (
              <ChoiceChip
                key={group.id}
                type="radio"
                name={groupRadioName}
                checked={activeGroup?.id === group.id}
                disabled={!isPolicyJsonValid}
                onChange={() => setActiveGroupId(group.id)}
                label={group.name}
                detail={<span className="num">{group.categoryIds.length} / {categories.length}</span>}
              />
            ))}
          </div>
        )}

        {activeGroup ? (
          <div className="space-y-4 rounded-md border border-border bg-background p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <Field label={labels.depreciationPolicyGroupName}>
                <Input value={activeGroup.name} disabled={!isPolicyJsonValid} onChange={(event) => updateGroup(activeGroup.id, { name: event.target.value })} />
              </Field>
              <Field label={labels.depreciationUsefulLifeMonths}>
                <Input type="number" min={1} max={600} value={activeGroup.usefulLifeMonths} disabled={!isPolicyJsonValid} onChange={(event) => updateGroup(activeGroup.id, { usefulLifeMonths: sanitizeUsefulLifeMonthsInput(event.target.value, activeGroup.usefulLifeMonths) })} />
              </Field>
              <Field label={labels.depreciationResidualPercent}>
                <Input type="number" min={0} max={90} step={0.01} value={activeGroup.residualRatePercent} disabled={!isPolicyJsonValid} onChange={(event) => updateGroup(activeGroup.id, { residualRatePercent: sanitizeResidualPercentInput(event.target.value, activeGroup.residualRatePercent) })} />
              </Field>
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
                <Button variant="outline" onClick={addSelectedCategories} disabled={!isPolicyJsonValid || selectedAvailableIds.length === 0}>
                  {labels.depreciationAddSelectedCategories}
                </Button>
                <Button variant="outline" onClick={removeSelectedCategories} disabled={!isPolicyJsonValid || selectedAssignedIds.length === 0}>
                  {labels.depreciationRemoveSelectedCategories}
                </Button>
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

            <Button variant="danger" onClick={() => removeGroup(activeGroup.id)} disabled={!isPolicyJsonValid}>
              <Trash2 />
              {labels.depreciationRemoveGroup}
            </Button>
          </div>
        ) : null}
      </div>

      <div className="rounded-md border border-border bg-background p-4">
        <h3 className="text-base font-semibold text-foreground">{labels.depreciationPreviewTitle}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{labels.depreciationPreviewDescription}</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field label={labels.depreciationPreviewPurchasePrice}>
            <Input fieldSize="md" type="text" inputMode="decimal" value={formatPurchasePriceInput(previewPurchasePrice)} onChange={(event) => setPreviewPurchasePrice(sanitizePurchasePriceInput(event.target.value))} />
          </Field>
          <Field label={labels.depreciationPreviewPurchaseDate}>
            <Input fieldSize="md" type="date" value={previewPurchaseDate} onChange={(event) => setPreviewPurchaseDate(event.target.value)} />
          </Field>
        </div>
        <KeyValueList
          className="mt-4"
          items={[
            { key: "monthly", label: labels.depreciationPreviewMonthly, value: formatMoney(preview.monthlyDepreciation) },
            { key: "netBook", label: labels.depreciationPreviewNetBook, value: formatMoney(preview.netBookValue) },
            { key: "accumulated", label: labels.depreciationPreviewAccumulated, value: formatMoney(preview.accumulatedDepreciation) },
            { key: "ageMonths", label: labels.depreciationPreviewAgeMonths, value: formatCount(preview.ageMonths) },
          ]}
        />
      </div>

      {state.legacyRules.length > 0 ? (
        <Notice tone="warning" title={labels.depreciationLegacyRules}>
          <p>{labels.depreciationLegacyRulesHelp}</p>
          <ul className="mt-2 list-inside list-disc">
            {state.legacyRules.map((rule) => (
              <li key={`${rule.match}-${rule.usefulLifeMonths}`}>{rule.match}: {labels.depreciationLegacyRuleMonths.replace("{months}", formatCount(rule.usefulLifeMonths))}</li>
            ))}
          </ul>
        </Notice>
      ) : null}

      <details ref={jsonDetailsRef} className="rounded-md border border-border bg-background p-4">
        <summary className="cursor-pointer text-sm font-semibold text-foreground">{labels.depreciationAdvancedJson}</summary>
        <Field
          label={labels.depreciationAdvancedJson}
          hideLabel
          hint={labels.depreciationAdvancedJsonDescription}
          id={jsonId}
          error={jsonError}
          liveError={jsonLiveError}
          className="mt-3"
        >
          <Textarea value={policyJson} onChange={(event) => onPolicyJsonChange(event.target.value)} rows={8} className="font-mono" />
        </Field>
      </details>
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
        <div className="border-b border-border p-2">
          <SearchField fieldSize="md" aria-label={searchLabel} placeholder={searchLabel} value={searchValue ?? ""} disabled={disabled} onChange={(event) => onSearchChange(event.target.value)} />
        </div>
      ) : null}
      <div className="max-h-72 space-y-1 overflow-y-auto p-2">
        {categories.length === 0 ? <EmptyNote className="px-2 py-3">{emptyLabel}</EmptyNote> : null}
        {categories.map((category) => {
          const isSelected = selectedIds.includes(category.id)
          const isConflict = assignedByOtherGroup.has(category.id)
          return (
            <label
              key={category.id}
              className={cn(
                "flex cursor-pointer items-start gap-2 rounded-md px-2 py-2 text-sm transition-colors has-disabled:cursor-not-allowed has-disabled:text-faint-foreground",
                isConflict ? "text-muted-foreground" : "hover:bg-accent",
              )}
            >
              <input
                type="checkbox"
                checked={isSelected}
                disabled={disabled || isConflict}
                onChange={(event) => {
                  if (event.target.checked) onSelectedIdsChange([...selectedIds, category.id])
                  else onSelectedIdsChange(selectedIds.filter((id) => id !== category.id))
                }}
                className={cn(checkboxVariants(), "mt-0.5")}
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
