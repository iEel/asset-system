"use client"

import { useMemo, useState } from "react"
import { useLocale, useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { ArrowDown, ArrowLeft, ArrowUp, Copy, Loader2, Plus, Save, Trash2 } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import {
  duplicateCategoryCustomField,
  moveArrayItem,
  type CategoryCustomFieldDraft,
} from "@/lib/category-form-arrays"

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

export function CategoryForm({
  category,
  backHref: providedBackHref,
}: {
  category?: CategoryFormValues
  backHref?: string
}) {
  const locale = useLocale()
  const router = useRouter()
  const t = useTranslations("category")
  const tCommon = useTranslations("common")
  const [values, setValues] = useState<CategoryFormValues>(category ?? emptyCategory)
  const [saving, setSaving] = useState(false)

  const isEdit = Boolean(category?.id)
  const backHref = providedBackHref ?? `/${locale}/master-data/categories`
  const title = useMemo(() => (isEdit ? t("editTitle") : t("createTitle")), [isEdit, t])

  function setField<K extends keyof CategoryFormValues>(field: K, value: CategoryFormValues[K]) {
    setValues((current) => ({ ...current, [field]: value }))
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
        throw new Error(result?.error ?? tCommon("error"))
      }

      toast.success(tCommon("savedSuccess"))
      router.push(backHref)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{title}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Link
          href={backHref}
          className="inline-flex h-10 items-center gap-2 rounded-md border border-border bg-surface px-3 text-sm font-medium transition-colors hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          {tCommon("back")}
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          <Field label={t("code")} required>
            <input
              value={values.code}
              onChange={(event) => setField("code", event.target.value)}
              maxLength={20}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("name")} required>
            <input
              value={values.name}
              onChange={(event) => setField("name", event.target.value)}
              maxLength={200}
              required
              className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <Field label={t("description")}>
            <textarea
              value={values.description ?? ""}
              onChange={(event) => setField("description", event.target.value)}
              maxLength={500}
              rows={4}
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>

          <label className="flex items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm md:self-start">
            <input
              type="checkbox"
              checked={values.isActive}
              onChange={(event) => setField("isActive", event.target.checked)}
              className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
            />
            {tCommon("active")}
          </label>
          </div>
        </section>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("customFieldTemplate")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("customFieldTemplateHelp")}</p>
            </div>
            <button
              type="button"
              onClick={() => setCustomFields([...values.customFieldDefs, createCustomFieldDefinition(values.customFieldDefs.length)])}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              {t("addCustomField")}
            </button>
          </div>

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
          />
        </section>

        <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
          <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-lg font-semibold text-foreground">{t("photoChecklistTemplate")}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t("photoChecklistTemplateHelp")}</p>
            </div>
            <button
              type="button"
              onClick={() => setPhotoChecklist([...values.photoChecklist, ""])}
              className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
            >
              <Plus className="h-4 w-4" />
              {t("addPhotoChecklist")}
            </button>
          </div>

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
          />
        </section>

        <div className="flex justify-end gap-3 border-t border-border pt-5">
          <Link
            href={backHref}
            className="inline-flex h-10 items-center rounded-md border border-border bg-surface px-4 text-sm font-medium transition-colors hover:bg-accent"
          >
            {tCommon("cancel")}
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {tCommon("save")}
          </button>
        </div>
      </form>
    </div>
  )
}

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-danger">*</span>}
      </span>
      {children}
    </label>
  )
}

function CustomFieldTemplateEditor({
  fields,
  labels,
  onChange,
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
}) {
  function updateField(index: number, field: keyof CustomFieldDefinitionValue, value: string | boolean) {
    onChange(fields.map((item, itemIndex) => (itemIndex === index ? { ...item, [field]: value } : item)))
  }

  function removeField(index: number) {
    onChange(fields.filter((_, itemIndex) => itemIndex !== index))
  }

  function duplicateField(index: number) {
    const field = fields[index]
    if (!field) return
    onChange([...fields.slice(0, index + 1), duplicateCategoryCustomField(field), ...fields.slice(index + 1)])
  }

  function moveField(index: number, direction: -1 | 1) {
    onChange(moveArrayItem(fields, index, index + direction))
  }

  if (fields.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {fields.map((field, index) => (
        <div key={`${field.id ?? "new"}-${index}`} className="rounded-md border border-border bg-background p-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field label={labels.fieldName} required>
              <input
                value={field.fieldName}
                onChange={(event) => updateField(index, "fieldName", toFieldName(event.target.value))}
                maxLength={100}
                required
                placeholder="cpu"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>

            <Field label={labels.fieldLabel} required>
              <input
                value={field.fieldLabel}
                onChange={(event) => updateField(index, "fieldLabel", event.target.value)}
                maxLength={200}
                required
                placeholder="CPU"
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>

            <Field label={labels.fieldLabelTh}>
              <input
                value={field.fieldLabelTh ?? ""}
                onChange={(event) => updateField(index, "fieldLabelTh", event.target.value)}
                maxLength={200}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              />
            </Field>

            <Field label={labels.fieldType}>
              <select
                value={field.fieldType}
                onChange={(event) => updateField(index, "fieldType", event.target.value)}
                className="h-10 w-full rounded-md border border-border bg-surface px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
              >
                <option value="text">{labels.text}</option>
                <option value="number">{labels.number}</option>
                <option value="date">{labels.date}</option>
                <option value="select">{labels.select}</option>
                <option value="boolean">{labels.boolean}</option>
              </select>
            </Field>

            {field.fieldType === "select" && (
              <div className="md:col-span-2">
                <Field label={labels.options}>
                  <textarea
                    value={field.options ?? ""}
                    onChange={(event) => updateField(index, "options", event.target.value)}
                    rows={3}
                    placeholder="Windows 11&#10;Windows 10&#10;macOS"
                    className="min-h-24 w-full rounded-md border border-border bg-surface px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-col gap-3 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="inline-flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={field.isRequired}
                onChange={(event) => updateField(index, "isRequired", event.target.checked)}
                className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
              />
              {labels.required}
            </label>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => moveField(index, -1)}
                disabled={index === 0}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowUp className="h-4 w-4" />
                {labels.moveUp}
              </button>
              <button
                type="button"
                onClick={() => moveField(index, 1)}
                disabled={index === fields.length - 1}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <ArrowDown className="h-4 w-4" />
                {labels.moveDown}
              </button>
              <button
                type="button"
                onClick={() => duplicateField(index)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-accent"
              >
                <Copy className="h-4 w-4" />
                {labels.duplicate}
              </button>
              <button
                type="button"
                onClick={() => removeField(index)}
                className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-sm font-medium text-danger transition-colors hover:bg-danger/10"
              >
                <Trash2 className="h-4 w-4" />
                {labels.remove}
              </button>
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
}) {
  function updateItem(index: number, value: string) {
    onChange(items.map((item, itemIndex) => (itemIndex === index ? value : item)))
  }

  function removeItem(index: number) {
    onChange(items.filter((_, itemIndex) => itemIndex !== index))
  }

  function duplicateItem(index: number) {
    const item = items[index]
    if (item == null) return
    onChange([...items.slice(0, index + 1), item, ...items.slice(index + 1)])
  }

  function moveItem(index: number, direction: -1 | 1) {
    onChange(moveArrayItem(items, index, index + direction))
  }

  if (items.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-border px-4 py-8 text-center text-sm text-muted-foreground">
        {labels.empty}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,1fr)_repeat(4,2.5rem)]">
          <input
            value={item}
            onChange={(event) => updateItem(index, event.target.value)}
            maxLength={100}
            placeholder={labels.item}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
          <button
            type="button"
            onClick={() => moveItem(index, -1)}
            disabled={index === 0}
            aria-label={labels.moveUp}
            title={labels.moveUp}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => moveItem(index, 1)}
            disabled={index === items.length - 1}
            aria-label={labels.moveDown}
            title={labels.moveDown}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
          >
            <ArrowDown className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => duplicateItem(index)}
            aria-label={labels.duplicate}
            title={labels.duplicate}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-accent"
          >
            <Copy className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => removeItem(index)}
            aria-label={labels.remove}
            title={labels.remove}
            className="inline-flex h-10 w-10 items-center justify-center rounded-md border border-border text-muted-foreground transition-colors hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
