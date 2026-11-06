"use client"

import { useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import { moveArrayItem, type CategoryCustomFieldDraft } from "@/lib/category-form-arrays"
import type { CategoryFormContext } from "@/lib/category-form-context"
import { Button, buttonVariants } from "@/components/ui/button"
import { linkVariants } from "@/components/ui/button-variants"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { CategoryPrefixBox } from "@/components/master-data/category-form/prefix-box"
import { CategoryFormSection } from "@/components/master-data/category-form/section-card"
import {
  CUSTOM_FIELD_ID_SUFFIX,
  CustomFieldTemplateTable,
  createCustomFieldDefinition,
} from "@/components/master-data/category-form/template-table"
import { maxLength, required } from "@/lib/validation-rules"

type CustomFieldDefinitionValue = CategoryCustomFieldDraft

// The save sends this object as it is (POST /api/categories, PUT /api/categories/[id]): the API is unchanged.
export type CategoryFormValues = {
  id?: string
  code: string
  name: string
  description?: string | null
  isActive: boolean
  customFieldDefs: CustomFieldDefinitionValue[]
  photoChecklist: string[]
}

const emptyCategory: CategoryFormValues = {
  code: "",
  name: "",
  description: "",
  isActive: true,
  customFieldDefs: [],
  photoChecklist: [],
}

const emptySavedFields: readonly CustomFieldDefinitionValue[] = []

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "category-code",
  name: "category-name",
  description: "category-description",
} as const
type CustomFieldErrorField = keyof typeof CUSTOM_FIELD_ID_SUFFIX

function fieldOrder(values: CategoryFormValues): string[] {
  return [
    ...Object.keys(FIELD_IDS),
    ...values.customFieldDefs.flatMap((_, index) =>
      Object.keys(CUSTOM_FIELD_ID_SUFFIX).map((field) => `customFieldDefs.${index}.${field}`)
    ),
    ...values.photoChecklist.map((_, index) => `photoChecklist.${index}`),
  ]
}

function fieldId(key: string): string {
  const row = key.match(/^customFieldDefs\.(\d+)\.(\w+)$/)
  if (row) return `category-field-${row[1]}-${CUSTOM_FIELD_ID_SUFFIX[row[2] as CustomFieldErrorField]}`
  const photo = key.match(/^photoChecklist\.(\d+)$/)
  if (photo) return `category-photo-${photo[1]}`
  return FIELD_IDS[key as keyof typeof FIELD_IDS] ?? key
}

// noValidate turns the browser's check off, so this restates required and maxLength, and the server's non-empty photo item (v-track M-R2).
function validate(values: CategoryFormValues): Partial<Record<string, string>> {
  const errors: Partial<Record<string, string>> = {}
  const check = (key: string, code: string | null) => {
    if (code) errors[key] = code
  }
  check("code", required(values.code) ?? maxLength(values.code, 20))
  check("name", required(values.name) ?? maxLength(values.name, 200))
  check("description", maxLength(values.description, 500))
  values.customFieldDefs.forEach((field, index) => {
    check(`customFieldDefs.${index}.fieldName`, required(field.fieldName) ?? maxLength(field.fieldName, 100))
    check(`customFieldDefs.${index}.fieldLabel`, required(field.fieldLabel) ?? maxLength(field.fieldLabel, 200))
    check(`customFieldDefs.${index}.fieldLabelTh`, maxLength(field.fieldLabelTh, 200))
  })
  values.photoChecklist.forEach((item, index) => {
    check(`photoChecklist.${index}`, required(item) ?? maxLength(item, 100))
  })
  return errors
}

// Board MD-Category-Edit (group 8 plan 2): one client form state over numbered section cards in the main column, with
// the side column beside it from lg (Task 3 adds the side panel ผลของการแก้ไข and the sticky footer, and rebuilds sections
// 3 and 4). The edit page passes the saved category and context (usage counts, the prefix box, G8P2-R1's values per field
// name); the create page passes context only, so no counts and nothing to mark ใหม่ or renamed against.
export function CategoryForm({
  category,
  backHref: providedBackHref,
  context,
}: {
  category?: CategoryFormValues
  backHref?: string
  context: CategoryFormContext
}) {
  const locale = useLocale()
  const apiError = useApiError()
  const router = useRouter()
  const t = useTranslations("category")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<CategoryFormValues>(category ?? emptyCategory)
  const [saving, setSaving] = useState(false)
  const fieldErrors = useFieldErrors<string>()

  const isEdit = Boolean(category?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/categories`
  // The saved definition: ใหม่ (G8P2-R2) and the rename warning (G8P2-R1) compare the rows against it.
  const savedFields = category?.customFieldDefs ?? emptySavedFields
  const requiredCount = values.customFieldDefs.filter((field) => field.isRequired).length

  const focusFirstError = () => fieldErrors.focusFirst(fieldOrder(values), { idFor: fieldId })

  function setField<K extends keyof CategoryFormValues>(field: K, value: CategoryFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
    if (field in FIELD_IDS) fieldErrors.clear(field)
  }

  // Row keys are the server's dotted paths (customFieldDefs.0.fieldName): a removed, copied or moved row shifts them (M-R7).
  function clearRowErrors(prefix: "customFieldDefs." | "photoChecklist.") {
    fieldErrors.clear(...Object.keys(fieldErrors.errors).filter((key) => key.startsWith(prefix)))
  }

  function setCustomFields(customFieldDefs: CustomFieldDefinitionValue[]) {
    setField(
      "customFieldDefs",
      customFieldDefs.map((field, index) => ({ ...field, sortOrder: index }))
    )
  }

  function setPhotoChecklist(photoChecklist: string[]) {
    setField("photoChecklist", photoChecklist)
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    fieldErrors.setErrors(validate(values))
    if (focusFirstError()) return
    setSaving(true)

    const url = isEdit ? `/api/categories/${category?.id}` : "/api/categories"
    const method = isEdit ? "PUT" : "POST"

    try {
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      })

      if (!response.ok) {
        const result = await response.json().catch(() => null)
        // A refusal that names a field of this form shows under it; any other keeps the toast (spec §4.1).
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

  // "รหัส {code} · ใช้อยู่กับ {m} รุ่น และ {a} ทรัพย์สิน · …": each count links to its list with that list's view permission.
  function usageLink(href: string | null) {
    return function UsageCount(chunks: React.ReactNode) {
      return href ? <Link href={href} className={linkVariants({ size: "inherit" })}>{chunks}</Link> : <span>{chunks}</span>
    }
  }
  const title = isEdit ? t("form.editTitle", { name: category?.name ?? "" }) : t("createTitle")
  const meta =
    isEdit && context.usage ? (
      <span data-category-usage className="num">
        {t.rich("form.usageLine", {
          code: category?.code ?? "",
          models: context.usage.models,
          assets: context.usage.assets,
          mono: (chunks) => <span className="tag text-foreground">{chunks}</span>,
          modelsLink: usageLink(context.usage.modelsHref),
          assetsLink: usageLink(context.usage.assetsHref),
        })}
      </span>
    ) : (
      t("subtitle")
    )

  return (
    <form onSubmit={handleSubmit} noValidate className="mx-auto max-w-6xl">
      <PageHeader
        title={title}
        meta={meta}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
        <div data-category-form-main className="grid min-w-0 content-start gap-4">
          <CategoryFormSection number={1} title={t("form.sectionInfo")} titleId="category-section-info">
            <div className="grid grid-cols-1 gap-4 sm:gap-5 md:grid-cols-2">
              <Field label={t("code")} id="category-code" required hint={isEdit ? t("form.codeHintEdit") : t("form.codeHintCreate")} error={fieldErrors.message("code")}>
                <Input
                  value={values.code}
                  onChange={(event) => setField("code", event.target.value)}
                  maxLength={20}
                  required
                  className="font-mono"
                />
              </Field>

              <Field label={t("name")} id="category-name" required hint={t("form.nameHint")} error={fieldErrors.message("name")}>
                <Input
                  value={values.name}
                  onChange={(event) => setField("name", event.target.value)}
                  maxLength={200}
                  required
                />
              </Field>

              <Field label={t("description")} id="category-description" error={fieldErrors.message("description")} className="md:col-span-2">
                <Textarea
                  value={values.description ?? ""}
                  onChange={(event) => setField("description", event.target.value)}
                  maxLength={500}
                  rows={2}
                />
              </Field>
            </div>

            <CategoryPrefixBox context={context} code={values.code} isEdit={isEdit} />
          </CategoryFormSection>

          <CategoryFormSection
            number={2}
            title={t("customFieldTemplate")}
            titleId="category-section-template"
            meta={values.customFieldDefs.length > 0 ? t("form.templateCount", { count: values.customFieldDefs.length, required: requiredCount }) : null}
            description={t("customFieldTemplateHelp")}
            flush
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCustomFields([...values.customFieldDefs, createCustomFieldDefinition(values.customFieldDefs.length)])}
              >
                <Plus aria-hidden="true" />
                {t("addCustomField")}
              </Button>
            }
          >
            <CustomFieldTemplateTable
              fields={values.customFieldDefs}
              savedFields={savedFields}
              valueCounts={context.fieldValueCounts}
              onChange={setCustomFields}
              errorFor={(index, field) => fieldErrors.message(`customFieldDefs.${index}.${field}`)}
              onFieldEdit={(index, field) => fieldErrors.clear(`customFieldDefs.${index}.${field}`)}
              onRowsShift={() => clearRowErrors("customFieldDefs.")}
            />
          </CategoryFormSection>

          {/* Task 3 rebuilds sections 3 and 4 to the board (numbered photo items; the status rule). */}
          <CategoryFormSection
            number={3}
            title={t("photoChecklistTemplate")}
            titleId="category-section-photos"
            description={t("photoChecklistTemplateHelp")}
            action={
              <Button variant="outline" size="sm" onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}>
                <Plus aria-hidden="true" />
                {t("addPhotoChecklist")}
              </Button>
            }
          >
            <PhotoChecklistEditor
              items={values.photoChecklist}
              labels={{
                item: t("photoChecklistItem"),
                empty: t("photoChecklistEmpty"),
                remove: t("removePhotoChecklist"),
                duplicate: t("duplicateItem"),
                moveUp: t("moveUp"),
                moveDown: t("moveDown"),
              }}
              onChange={setPhotoChecklist}
              errorFor={(index) => fieldErrors.message(`photoChecklist.${index}`)}
              onItemEdit={(index) => fieldErrors.clear(`photoChecklist.${index}`)}
              onRowsShift={() => clearRowErrors("photoChecklist.")}
            />
          </CategoryFormSection>

          <CategoryFormSection number={4} title={t("form.sectionStatus")} titleId="category-section-status">
            <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={values.isActive}
                onChange={(event) => setField("isActive", event.target.checked)}
                className={checkboxVariants()}
              />
              {tCommon("active")}
            </label>
          </CategoryFormSection>
        </div>

        {/* The side column from lg: Task 3 puts the side panel ผลของการแก้ไข here (G8P2-R3). */}

        <div className="flex justify-end gap-3 border-t border-border pt-5 lg:col-span-2">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </div>
    </form>
  )
}

function PhotoChecklistEditor({
  items,
  labels,
  onChange,
  errorFor,
  onItemEdit,
  onRowsShift,
}: {
  items: string[]
  labels: {
    item: string
    empty: string
    remove: string
    duplicate: string
    moveUp: string
    moveDown: string
  }
  onChange: (items: string[]) => void
  errorFor: (index: number) => string | undefined
  onItemEdit: (index: number) => void
  onRowsShift: () => void
}) {
  function updateItem(index: number, value: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)))
    onItemEdit(index)
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
    onRowsShift()
  }

  function duplicateItem(index: number) {
    const item = items[index]
    if (item == null) return
    onChange([...items.slice(0, index + 1), item, ...items.slice(index + 1)])
    onRowsShift()
  }

  function moveItem(index: number, direction: -1 | 1) {
    onChange(moveArrayItem(items, index, index + direction))
    onRowsShift()
  }

  if (items.length === 0) {
    return <EmptyNote>{labels.empty}</EmptyNote>
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,auto)]">
          <Field label={labels.item} hideLabel id={`category-photo-${index}`} error={errorFor(index)}>
            <Input
              value={item}
              onChange={(event) => updateItem(index, event.target.value)}
              maxLength={100}
              placeholder={labels.item}
            />
          </Field>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => moveItem(index, -1)}
            disabled={index === 0}
            aria-label={labels.moveUp}
            title={labels.moveUp}
            className="justify-self-start"
          >
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => moveItem(index, 1)}
            disabled={index === items.length - 1}
            aria-label={labels.moveDown}
            title={labels.moveDown}
            className="justify-self-start"
          >
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => duplicateItem(index)}
            aria-label={labels.duplicate}
            title={labels.duplicate}
            className="justify-self-start"
          >
            <Copy aria-hidden="true" />
          </Button>
          <Button
            variant="outline"
            size="icon-lg"
            onClick={() => removeItem(index)}
            aria-label={labels.remove}
            title={labels.remove}
            className="justify-self-start"
          >
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      ))}
    </div>
  )
}
