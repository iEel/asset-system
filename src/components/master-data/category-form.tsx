"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowUp, Copy, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  duplicateCategoryCustomField,
  moveArrayItem,
  type CategoryCustomFieldDraft,
} from "@/lib/category-form-arrays"
import { Button, buttonVariants } from "@/components/ui/button"
import { ContentPanel } from "@/components/ui/content-panel"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { PageBackLink, PageHeader } from "@/components/ui/page-header"
import { Textarea } from "@/components/ui/textarea"
import { useApiError } from "@/components/ui/use-api-error"
import { useFieldErrors } from "@/components/ui/use-field-errors"
import { maxLength, required } from "@/lib/validation-rules"

type CustomFieldDefinitionValue = CategoryCustomFieldDraft

type CategoryFormValues = {
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

// The fields in visual order, keyed like the server's fieldErrors, with the id focus moves to (v-track M-R1).
const FIELD_IDS = {
  code: "category-code",
  name: "category-name",
  description: "category-description",
} as const
const CUSTOM_FIELD_ID_SUFFIX = { fieldName: "name", fieldLabel: "label", fieldLabelTh: "label-th" } as const
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

export function CategoryForm({
  category,
  backHref: providedBackHref,
}: {
  category?: CategoryFormValues
  backHref?: string
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
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

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

  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader
        title={title}
        meta={t("subtitle")}
        className="mb-6"
        back={<PageBackLink href={backHref} label={tCommon("back")} />}
      />

      <form onSubmit={handleSubmit} noValidate className="space-y-5">
        <ContentPanel>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} id="category-code" required error={fieldErrors.message("code")}>
            <Input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
            />
          </Field>

          <Field label={t("name")} id="category-name" required error={fieldErrors.message("name")}>
            <Input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
            />
          </Field>

          <Field label={t("description")} id="category-description" error={fieldErrors.message("description")}>
            <Textarea
              value={values.description ?? ""}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={500}
              rows={4}
              className="min-h-28"
            />
          </Field>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-start">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className={checkboxVariants()}
            />
            {tCommon("active")}
          </label>
          </div>
        </ContentPanel>

        <ContentPanel
          title={t("customFieldTemplate")}
          description={t("customFieldTemplateHelp")}
          actions={
            <Button
              variant="outline"
              size="md"
              onClick={() => setCustomFields([...values.customFieldDefs, createCustomFieldDefinition(values.customFieldDefs.length)])}
            >
              <Plus aria-hidden="true" />
              {t("addCustomField")}
            </Button>
          }
        >
          <CustomFieldTemplateEditor
            fields={values.customFieldDefs}
            labels={{
              fieldName: t("fieldName"),
              fieldLabel: t("fieldLabel"),
              fieldLabelTh: t("fieldLabelTh"),
              fieldType: t("fieldType"),
              options: t("fieldOptions"),
              required: t("fieldRequired"),
              remove: t("removeCustomField"),
              empty: t("customFieldTemplateEmpty"),
              text: t("fieldTypeText"),
              number: t("fieldTypeNumber"),
              date: t("fieldTypeDate"),
              select: t("fieldTypeSelect"),
              boolean: t("fieldTypeBoolean"),
              duplicate: t("duplicateItem"),
              moveUp: t("moveUp"),
              moveDown: t("moveDown"),
            }}
            onChange={setCustomFields}
            errorFor={(index, field) => fieldErrors.message(`customFieldDefs.${index}.${field}`)}
            onFieldEdit={(index, field) => fieldErrors.clear(`customFieldDefs.${index}.${field}`)}
            onRowsShift={() => clearRowErrors("customFieldDefs.")}
          />
        </ContentPanel>

        <ContentPanel
          title={t("photoChecklistTemplate")}
          description={t("photoChecklistTemplateHelp")}
          actions={
            <Button variant="outline" size="md" onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}>
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
        </ContentPanel>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link href={backHref} className={buttonVariants({ variant: "outline" })}>
            {tCommon("cancel")}
          </Link>
          <Button type="submit" busy={saving}>
            <Save aria-hidden="true" />
            {tCommon("save")}
          </Button>
        </div>
      </form>
    </div>
  )
}

function CustomFieldTemplateEditor({
  fields,
  labels,
  onChange,
  errorFor,
  onFieldEdit,
  onRowsShift,
}: {
  fields: CustomFieldDefinitionValue[]
  labels: {
    fieldName: string
    fieldLabel: string
    fieldLabelTh: string
    fieldType: string
    options: string
    required: string
    remove: string
    empty: string
    text: string
    number: string
    date: string
    select: string
    boolean: string
    duplicate: string
    moveUp: string
    moveDown: string
  }
  onChange: (fields: CustomFieldDefinitionValue[]) => void
  errorFor: (index: number, field: CustomFieldErrorField) => string | undefined
  onFieldEdit: (index: number, field: CustomFieldErrorField) => void
  onRowsShift: () => void
}) {
  function updateField(index: number, field: keyof CustomFieldDefinitionValue, value: string | boolean) {
    onChange(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
    if (field in CUSTOM_FIELD_ID_SUFFIX) onFieldEdit(index, field as CustomFieldErrorField)
  }

  function removeField(index: number) {
    onChange(fields.filter((_, itemIndex) => itemIndex !== index))
    onRowsShift()
  }

  function duplicateField(index: number) {
    const field = fields[index]
    if (!field) return
    onChange([...fields.slice(0, index + 1), duplicateCategoryCustomField(field), ...fields.slice(index + 1)])
    onRowsShift()
  }

  function moveField(index: number, direction: -1 | 1) {
    onChange(moveArrayItem(fields, index, index + direction))
    onRowsShift()
  }

  if (fields.length === 0) {
    return <EmptyNote>{labels.empty}</EmptyNote>
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={`${field.id ?? "new"}-${index}`} className="rounded-md border border-border bg-background p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={labels.fieldName} id={`category-field-${index}-name`} required error={errorFor(index, "fieldName")}>
              <Input
                value={field.fieldName}
                onChange={(event) => updateField(index, "fieldName", toFieldName(event.target.value))}
                maxLength={100}
                required
                placeholder="cpu"
              />
            </Field>

            <Field label={labels.fieldLabel} id={`category-field-${index}-label`} required error={errorFor(index, "fieldLabel")}>
              <Input
                value={field.fieldLabel}
                onChange={(event) => updateField(index, "fieldLabel", event.target.value)}
                maxLength={200}
                required
                placeholder="CPU"
              />
            </Field>

            <Field label={labels.fieldLabelTh} id={`category-field-${index}-label-th`} error={errorFor(index, "fieldLabelTh")}>
              <Input
                value={field.fieldLabelTh ?? ""}
                onChange={(event) => updateField(index, "fieldLabelTh", event.target.value)}
                maxLength={200}
              />
            </Field>

            <Field label={labels.fieldType}>
              <NativeSelect
                value={field.fieldType}
                onChange={(event) => updateField(index, "fieldType", event.target.value)}
              >
                <option value="text">{labels.text}</option>
                <option value="number">{labels.number}</option>
                <option value="date">{labels.date}</option>
                <option value="select">{labels.select}</option>
                <option value="boolean">{labels.boolean}</option>
              </NativeSelect>
            </Field>

            {field.fieldType === "select" && (
              <div className="md:col-span-2">
                <Field label={labels.options}>
                  <Textarea
                    value={field.options ?? ""}
                    onChange={(event) => updateField(index, "options", event.target.value)}
                    rows={3}
                    placeholder="Windows 11&#10;Windows 10&#10;macOS"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex min-h-11 items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.isRequired}
                onChange={(event) => updateField(index, "isRequired", event.target.checked)}
                className={checkboxVariants()}
              />
              {labels.required}
            </label>

            <div className="flex flex-wrap gap-2">
              <Button variant="outline" size="md" onClick={() => moveField(index, -1)} disabled={index === 0}>
                <ArrowUp aria-hidden="true" />
                {labels.moveUp}
              </Button>
              <Button variant="outline" size="md" onClick={() => moveField(index, 1)} disabled={index === fields.length - 1}>
                <ArrowDown aria-hidden="true" />
                {labels.moveDown}
              </Button>
              <Button variant="outline" size="md" onClick={() => duplicateField(index)}>
                <Copy aria-hidden="true" />
                {labels.duplicate}
              </Button>
              <Button variant="danger" size="md" onClick={() => removeField(index)}>
                <Trash2 aria-hidden="true" />
                {labels.remove}
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

function createCustomFieldDefinition(sortOrder: number): CustomFieldDefinitionValue {
  return {
    fieldName: "",
    fieldLabel: "",
    fieldLabelTh: "",
    fieldType: "text",
    options: "",
    isRequired: false,
    sortOrder,
    isActive: true,
  }
}

function toFieldName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "")
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
