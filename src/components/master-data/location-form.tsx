"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Building2, CheckCircle2, Circle, Save } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { locationTypes } from "@/lib/validations/location"
import { formatLocationType, type LocationType } from "@/lib/location-types"
import { buildLocationParentOptions, parentAfterBranchChange, type LocationParentOption, type LocationRuleRow } from "@/lib/location-parent-options"
import { Button, buttonVariants } from "@/components/ui/button"
import { Chip } from "@/components/ui/chip"
import { Field } from "@/components/ui/field"
import { FieldGroup } from "@/components/ui/field-group"
import { checkboxVariants } from "@/components/ui/field-variants"
import { FormSection } from "@/components/ui/form-section"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { SearchableSelect } from "@/components/ui/searchable-select"
import { Segmented } from "@/components/ui/segmented"
import { StickyFormFooter } from "@/components/ui/sticky-form-footer"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { getPanelClasses } from "@/lib/design-system"
import { cn } from "@/lib/utils"
import { maxLength, required } from "@/lib/validation-rules"

type LocationFormValues = {
  id?: string
  code: string
  name: string
  branchId: string
  parentId?: string | null
  locationType: (typeof locationTypes)[number]
  description?: string | null
  isActive: boolean
}

type BranchOption = {
  id: string
  code: string
  name: string
  company: {
    code: string
    nameTh: string
  }
}

const emptyLocation: LocationFormValues = {
  code: "",
  name: "",
  branchId: "",
  parentId: "",
  locationType: "Room",
  description: "",
  isActive: true,
}

// The path reads with the branch first, as the board writes it ("สำนักงานใหญ่ › อาคาร A › ชั้น 3").
const PATH_SEPARATOR = " › "
// The board's three rows of types (MD-Location-New); together they hold every value of locationTypes once.
const TYPE_GROUPS = [
  { key: "typeGroupBuilding", types: ["Site", "Building", "Floor", "Room", "Area", "Zone"] },
  { key: "typeGroupFixture", types: ["Rack", "Desk", "Storage"] },
  { key: "typeGroupOutside", types: ["Vehicle", "User-held", "Offsite"] },
] as const satisfies readonly { key: string; types: readonly LocationType[] }[]
// The preview names this many locations on the new one's level, then "และอีก n ที่ตั้ง".
const PREVIEW_SIBLINGS = 6

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  branchId: "location-branch",
  parentId: "location-parent",
  locationType: "location-type",
  name: "location-name",
  code: "location-code",
  description: "location-description",
} as const
type LocationField = keyof typeof FIELD_IDS
const FIELD_ORDER = Object.keys(FIELD_IDS) as LocationField[]

// noValidate turns the browser's check off, so this restates the controls' required and maxLength (v-track M-R2).
function validate(values: LocationFormValues): Partial<Record<LocationField, string>> {
  const errors: Partial<Record<LocationField, string>> = {}
  const check = (key: LocationField, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 50))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("branchId", required(values.branchId))
  check("locationType", required(values.locationType))
  check("description", maxLength(values.description, 500))
  return errors
}

// Page group 7 plan 3 Task 2 (spec §6.2, board MD-Location-New): where the location sits (branch, then a parent of that
// branch with its path), its type in three rows, its name and code; beside them where it lands after saving.
export function LocationForm({
  location,
  branches,
  locationRows,
  preset,
  backHref: providedBackHref,
}: {
  location?: LocationFormValues
  branches: BranchOption[]
  // Every location (inactive ones too): the parent list, its paths and the descendants left out on edit.
  locationRows: LocationRuleRow[]
  // ?branchId=&parentId= on create ("เพิ่มที่ตั้งในนี้"), already checked by the page.
  preset?: { branchId: string; parentId: string }
  backHref?: string
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("location")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<LocationFormValues>(
    location ?? { ...emptyLocation, branchId: preset?.branchId ?? "", parentId: preset?.parentId ?? "" },
  )
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<LocationField>()

  const isEdit = Boolean(location?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/locations`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  const needsBranch = branches.length === 0
  const focusFirstError = () => fieldErrors.focusFirst(FIELD_ORDER, { idFor: (key) => FIELD_IDS[key] })

  const parentOptions = useMemo(
    () =>
      buildLocationParentOptions(locationRows, {
        branchId: values.branchId,
        editingId: location?.id ?? null,
        keepParentId: location?.parentId ?? null,
        // The kept stored parent goes once another branch is chosen (it belongs to the stored branch's place).
        keepBranchId: location?.branchId ?? null,
      }),
    [locationRows, values.branchId, location?.id, location?.parentId, location?.branchId],
  )
  const branchNameOf = useMemo(() => {
    const branchById = new Map(branches.map((branch) => [branch.id, branch.name]))
    const rowBranch = new Map(locationRows.map((row) => [row.id, row.branchId]))
    return (option: LocationParentOption) => branchById.get(rowBranch.get(option.id) ?? "")
  }, [branches, locationRows])
  const pathOf = (option: LocationParentOption) => [branchNameOf(option), ...option.path].filter(Boolean) as string[]
  const chosenBranch = branches.find((branch) => branch.id === values.branchId)
  const chosenParent = parentOptions.find((option) => option.id === values.parentId)
  const branchParentCount = parentOptions.filter((option) => !option.kept).length
  const selectOptions = parentOptions.map((option) => ({
    id: option.id,
    label: `${pathOf(option).join(PATH_SEPARATOR)} · ${option.code}${option.kept ? ` (${t("form.parentKept")})` : ""}`,
  }))

  function setField<K extends keyof LocationFormValues>(field: K, value: LocationFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field as LocationField)
  }

  // A parent of another branch goes with the old branch (spec §6.2).
  function handleBranchChange(branchId: string) {
    setValues((current) => ({ ...current, branchId, parentId: parentAfterBranchChange(locationRows, current.parentId ?? "", branchId) }))
    fieldErrors.clear("branchId", "parentId")
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (needsBranch) return
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/locations/${location?.id}` : "/api/locations"
    const method = isEdit ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        // A refusal that names a field of this form shows under it (the parent rules of Task 1 name parentId or
        // branchId); any other keeps the toast (spec §4.1).
        if (fieldErrors.applyServer(result) && focusFirstError()) return
        throw new Error(result?.error ?? tCommon("error"))
      }

      toast.success(tCommon("savedSuccess"))
      router.push(backHref)
      router.refresh()
    } catch (error) {
      apiError.toast(error)
    } finally {
      setSaving(false)
    }
  }

  // The preview: the branch, the parent's chain, the parent's other children and this location.
  const displayName = values.name.trim() || (isEdit ? t("form.previewThis") : t("form.previewUnnamed"))
  const parentChain = chosenParent ? pathOf(chosenParent) : chosenBranch ? [chosenBranch.name] : []
  const siblings = chosenBranch
    ? parentOptions.filter((option) => !option.kept && option.parentId === (chosenParent?.id ?? null))
    : []
  const joinsParent = Boolean(chosenParent) && values.isActive && (!isEdit || (location?.parentId ?? "") !== (values.parentId ?? ""))
  const footerParent = [...parentChain].reverse().join(" · ")
  const bold = (chunks: React.ReactNode) => <b className="font-semibold text-foreground">{chunks}</b>
  const footerLine = !chosenBranch
    ? t("form.previewNoBranch")
    : chosenParent
      ? t.rich(isEdit ? "form.footerEdit" : "form.footerCreate", { name: displayName, parent: footerParent, b: bold })
      : t.rich(isEdit ? "form.footerEditRoot" : "form.footerCreateRoot", { name: displayName, branch: chosenBranch.name, b: bold })
  const checks = [
    { key: "where", label: t("form.checkWhere"), done: Boolean(values.branchId) },
    { key: "type", label: t("form.checkType"), done: Boolean(values.locationType) },
    { key: "name", label: t("form.checkName"), done: Boolean(values.name.trim() && values.code.trim()) },
  ]

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-6xl">
      <PageHeader
        title={title}
        meta={isEdit ? t("form.introEdit") : t("form.introCreate")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className={cn(getPanelClasses(), "grid min-w-0 content-start gap-8 p-4 sm:p-5")}>
          <FormSection number={1} title={t("form.sectionWhere")}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t("branch")} id="location-branch" required hint={t("form.branchHint")} error={fieldErrors.message("branchId")}>
                <NativeSelect
                  value={values.branchId}
                  onChange={(event) => handleBranchChange(event.target.value)}
                  required
                >
                  <option value="">{t("selectBranch")}</option>
                  {branches.map((branch) => (
                    <option key={branch.id} value={branch.id}>
                      {branch.name} · {branch.company.nameTh} · {branch.code}
                    </option>
                  ))}
                </NativeSelect>
              </Field>

              <SearchableSelect
                id="location-parent"
                label={t("parentLocation")}
                value={values.parentId ?? ""}
                options={selectOptions}
                placeholder={t("form.parentPlaceholder")}
                searchPlaceholder={t("form.parentSearch")}
                emptyLabel={chosenBranch ? t("form.parentEmpty") : t("form.parentNeedsBranch")}
                clearLabel={t("form.parentClear")}
                hint={chosenBranch ? t("form.parentHint", { branch: chosenBranch.name, count: branchParentCount }) : t("form.parentNeedsBranch")}
                error={fieldErrors.message("parentId")}
                onChange={(parentId) => setField("parentId", parentId)}
              />
            </div>
          </FormSection>

          <FormSection number={2} title={t("form.sectionType")}>
            <FieldGroup legend={t("locationType")} id="location-type" required error={fieldErrors.message("locationType")}>
              <div className="grid gap-x-3 gap-y-2 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
                {TYPE_GROUPS.map((group) => (
                  <div key={group.key} className="contents">
                    <span aria-hidden="true" className="text-meta font-medium text-muted-foreground">{t(`form.${group.key}`)}</span>
                    <Segmented<LocationType>
                      aria-label={t(`form.${group.key}`)}
                      value={values.locationType}
                      options={group.types.map((type) => ({ value: type, label: formatLocationType(type, t) }))}
                      onValueChange={(type) => setField("locationType", type)}
                      showCheck
                      className="max-w-full flex-wrap justify-self-start"
                    />
                  </div>
                ))}
              </div>
              <p className="mt-1.5 text-meta text-faint-foreground">{t("form.typeHint")}</p>
            </FieldGroup>
          </FormSection>

          <FormSection number={3} title={t("form.sectionName")}>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
              <Field label={t("name")} id="location-name" required hint={t("form.nameHint")} error={fieldErrors.message("name")}>
                <Input
                  value={values.name}
                  onChange={(event) => setField("name", event.target.value)}
                  maxLength={200}
                  required
                />
              </Field>

              <Field label={t("code")} id="location-code" required hint={t("form.codeHint")} error={fieldErrors.message("code")}>
                <Input
                  value={values.code}
                  onChange={(event) => setField("code", event.target.value)}
                  maxLength={50}
                  required
                  className="num"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label={t("description")} id="location-description" error={fieldErrors.message("description")}>
                  <Textarea
                    value={values.description ?? ""}
                    onChange={(event) => setField("description", event.target.value)}
                    placeholder={t("form.descriptionPlaceholder")}
                    rows={3}
                    maxLength={500}
                  />
                </Field>
              </div>

              <label className="flex items-start gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:col-span-2">
                <input
                  type="checkbox"
                  checked={values.isActive}
                  onChange={(event) => setField("isActive", event.target.checked)}
                  className={cn(checkboxVariants(), "mt-0.5")}
                />
                <span className="grid gap-0.5">
                  <span className="font-medium text-foreground">{tCommon("active")}</span>
                  <span className="text-meta text-muted-foreground">{t("form.activeHint")}</span>
                </span>
              </label>
            </div>
          </FormSection>
        </div>

        <aside
          data-location-preview
          aria-labelledby="location-preview-title"
          className={cn(getPanelClasses(), "grid min-w-0 content-start gap-4 p-4 sm:p-5 lg:sticky lg:top-4 lg:self-start")}
        >
          <h2 id="location-preview-title" className="text-base font-semibold text-foreground">{t("form.previewTitle")}</h2>
          {chosenBranch ? (
            <>
              <p data-location-preview-path className="min-w-0 break-words text-sm text-muted-foreground">
                {parentChain.map((name, index) => (
                  <span key={`${index}-${name}`}>{name}{PATH_SEPARATOR}</span>
                ))}
                <b className="font-semibold text-foreground">{displayName}</b>
              </p>
              <ul aria-label={t("form.previewSiblings")} className="grid gap-1 text-sm">
                {parentChain.map((name, index) => (
                  <li key={`${index}-${name}`} className="flex min-w-0 items-center gap-2 text-muted-foreground" style={{ paddingInlineStart: `${index * 0.75}rem` }}>
                    {index === 0 ? <Building2 aria-hidden="true" className="size-3.5 shrink-0 text-faint-foreground" /> : null}
                    <span className="min-w-0 truncate">{name}</span>
                    {joinsParent && chosenParent && index === parentChain.length - 1 ? (
                      <span className="ml-auto shrink-0 text-meta num">{t("form.previewChildren", { from: chosenParent.activeChildCount, to: chosenParent.activeChildCount + 1 })}</span>
                    ) : null}
                  </li>
                ))}
                {siblings.slice(0, PREVIEW_SIBLINGS).map((option) => (
                  <li key={option.id} className="min-w-0 truncate text-muted-foreground" style={{ paddingInlineStart: `${parentChain.length * 0.75}rem` }}>
                    {option.name}
                  </li>
                ))}
                {siblings.length > PREVIEW_SIBLINGS ? (
                  <li className="text-meta text-faint-foreground" style={{ paddingInlineStart: `${parentChain.length * 0.75}rem` }}>
                    {t("form.previewMore", { count: siblings.length - PREVIEW_SIBLINGS })}
                  </li>
                ) : null}
                <li className="flex min-w-0 items-center gap-2" style={{ paddingInlineStart: `${parentChain.length * 0.75}rem` }}>
                  <b className="min-w-0 truncate font-semibold text-foreground">{displayName}</b>
                  <Chip>{isEdit ? t("form.previewThis") : t("form.previewNew")}</Chip>
                </li>
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">{t("form.previewNoBranch")}</p>
          )}
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1.5 border-t border-border-soft pt-3 text-sm">
            <dt className="text-muted-foreground">{t("locationType")}</dt>
            <dd className="min-w-0 break-words text-foreground">{formatLocationType(values.locationType, t)}</dd>
            <dt className="text-muted-foreground">{t("code")}</dt>
            <dd className="min-w-0 break-words text-foreground num">{values.code.trim() || "—"}</dd>
            <dt className="text-muted-foreground">{tCommon("status")}</dt>
            <dd className="text-foreground">{values.isActive ? tCommon("active") : tCommon("inactive")}</dd>
          </dl>
          <ul className="grid gap-2 text-sm">
            {checks.map((check) => (
              <li key={check.key} data-location-check={check.key} data-done={check.done || undefined} className="flex items-start gap-2">
                {check.done ? (
                  <CheckCircle2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-success" />
                ) : (
                  <Circle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-faint-foreground" />
                )}
                <span className="min-w-0">{check.label}</span>
              </li>
            ))}
          </ul>
        </aside>

        <StickyFormFooter
          className="lg:col-span-2"
          status={(
            <>
              {needsBranch ? <p id="location-save-reason" className="basis-full text-meta text-muted-foreground sm:mr-auto sm:basis-auto sm:self-center">{t("saveNeedsBranch")}</p> : null}
              {needsBranch ? null : <span data-location-footer className="break-words">{footerLine}</span>}
            </>
          )}
        >
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving} aria-disabled={needsBranch || undefined} aria-describedby={needsBranch ? "location-save-reason" : undefined}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </StickyFormFooter>
      </div>
    </form>
  )
}
