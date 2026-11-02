"use client"

import { useLocale, useTranslations } from "next-intl"
import { Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EmptyNote } from "@/components/ui/empty-note"
import { Field, FieldError } from "@/components/ui/field"
import { checkboxVariants } from "@/components/ui/field-variants"
import { Input } from "@/components/ui/input"
import { NativeSelect } from "@/components/ui/native-select"
import { FoldedSection, type AssetFormDisclosure } from "@/components/assets/asset-form-section"
import {
  createCustomFieldRow,
  customFieldKey,
  type AssetField,
  type CustomFieldDefinition,
  type CustomFieldRow,
} from "@/lib/asset-form-rules"

// รายละเอียดเฉพาะทรัพย์สิน: the category template's fields and the extra rows (group 4 plan 2 Task 5 moved them out of
// asset-form.tsx; the rows and their JSON stay in its state). Folded since Task 6a; the remark and the raw JSON are the
// next section, asset-form-other.tsx, and the active box left the form (P2-R7).
export function AssetFormCustomFields({
  categoryId,
  errorText,
  definitions,
  getCustomFieldValue,
  onTemplateCustomFieldChange,
  additionalCustomFieldRows,
  onAdditionalCustomFieldRowsChange,
  disclosure,
}: {
  categoryId: string
  errorText: (key: AssetField) => string | undefined
  definitions: CustomFieldDefinition[]
  getCustomFieldValue: (fieldName: string) => string
  onTemplateCustomFieldChange: (fieldName: string, value: string) => void
  additionalCustomFieldRows: CustomFieldRow[]
  onAdditionalCustomFieldRowsChange: (rows: CustomFieldRow[]) => void
  disclosure: AssetFormDisclosure
}) {
  const locale = useLocale()
  const t = useTranslations("asset")

  return (
    <FoldedSection title={t("customFieldsStructuredTitle")} disclosure={disclosure}>
      <div className="space-y-4 md:col-span-2">
        <p className="max-w-2xl text-sm text-muted-foreground">{t("customFieldsStructuredHelp")}</p>

        {definitions.length > 0 ? (
          <TemplateCustomFields
            definitions={definitions}
            locale={locale}
            getValue={getCustomFieldValue}
            getError={(fieldName) => errorText(customFieldKey(fieldName))}
            onChange={onTemplateCustomFieldChange}
          />
        ) : (
          <EmptyNote>{categoryId ? t("customFieldsNoTemplate") : t("customFieldsSelectCategory")}</EmptyNote>
        )}

        <div className="space-y-3 border-t border-border pt-4">
          <h3 className="text-sm font-semibold text-foreground">{t("customFieldsAdditional")}</h3>
          <CustomFieldRowsEditor
            rows={additionalCustomFieldRows}
            labels={{
              key: t("customFieldKey"),
              value: t("customFieldValue"),
              add: t("addCustomField"),
              remove: t("removeCustomField"),
              empty: t("customFieldsEmpty"),
            }}
            onChange={onAdditionalCustomFieldRowsChange}
          />
        </div>
      </div>
    </FoldedSection>
  )
}

function CustomFieldRowsEditor({
  rows,
  labels,
  onChange,
}: {
  rows: CustomFieldRow[]
  labels: {
    key: string
    value: string
    add: string
    remove: string
    empty: string
  }
  onChange: (rows: CustomFieldRow[]) => void
}) {
  function updateRow(id: string, field: "key" | "value", value: string) {
    onChange(rows.map((row) => (row.id === id ? { ...row, [field]: value } : row)))
  }

  function removeRow(id: string) {
    onChange(rows.filter((row) => row.id !== id))
  }

  return (
    <div className="space-y-3">
      {rows.length === 0 ? (
        <EmptyNote>{labels.empty}</EmptyNote>
      ) : (
        <div className="space-y-2">
          {rows.map((row) => (
            <div key={row.id} className="grid grid-cols-1 gap-2 sm:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)_auto]">
              <Field label={labels.key} hideLabel>
                <Input value={row.key} onChange={(event) => updateRow(row.id, "key", event.target.value)} placeholder={labels.key} />
              </Field>
              <Field label={labels.value} hideLabel>
                <Input value={row.value} onChange={(event) => updateRow(row.id, "value", event.target.value)} placeholder={labels.value} />
              </Field>
              <Button
                variant="outline"
                size="icon-lg"
                className="justify-self-start"
                onClick={() => removeRow(row.id)}
                aria-label={labels.remove}
                title={labels.remove}
              >
                <Trash2 aria-hidden="true" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button variant="outline" size="md" onClick={() => onChange([...rows, createCustomFieldRow()])}>
        <Plus aria-hidden="true" />
        {labels.add}
      </Button>
    </div>
  )
}

function TemplateCustomFields({
  definitions,
  locale,
  getValue,
  getError,
  onChange,
}: {
  definitions: CustomFieldDefinition[]
  locale: string
  getValue: (fieldName: string) => string
  getError: (fieldName: string) => string | undefined
  onChange: (fieldName: string, value: string) => void
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {definitions.map((definition, index) => (
        <TemplateField
          key={definition.id}
          id={`asset-custom-field-${index}`}
          definition={definition}
          label={getTemplateFieldLabel(definition, locale)}
          value={getValue(definition.fieldName)}
          error={getError(definition.fieldName)}
          onChange={(value) => onChange(definition.fieldName, value)}
        />
      ))}
    </div>
  )
}

function TemplateField({
  id,
  definition,
  label,
  value,
  error,
  onChange,
}: {
  // The id fieldId() gives this field's key: its place in the template.
  id: string
  definition: CustomFieldDefinition
  label: string
  value: string
  error?: string
  onChange: (value: string) => void
}) {
  if (definition.fieldType === "boolean") {
    // A checkbox has no Field: its error sits under the box and is tied to the checkbox.
    return (
      <div className="grid min-w-0 content-start gap-1.5">
        <label className="flex min-h-10 items-center gap-3 rounded-md border border-border bg-background px-3 py-2 text-sm">
          <input
            id={id}
            type="checkbox"
            checked={value === "true"}
            onChange={(event) => onChange(event.target.checked ? "true" : "false")}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${id}-error` : undefined}
            className={checkboxVariants()}
          />
          {label}
        </label>
        {error ? <FieldError id={`${id}-error`}>{error}</FieldError> : null}
      </div>
    )
  }

  if (definition.fieldType === "select") {
    return (
      <Field label={label} id={id} required={definition.isRequired} error={error}>
        <NativeSelect value={value} required={definition.isRequired} onChange={(event) => onChange(event.target.value)}>
          <option value=""></option>
          {definition.options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </NativeSelect>
      </Field>
    )
  }

  return (
    <Field label={label} id={id} required={definition.isRequired} error={error}>
      <Input
        type={definition.fieldType === "number" ? "number" : definition.fieldType === "date" ? "date" : "text"}
        value={value}
        required={definition.isRequired}
        onChange={(event) => onChange(event.target.value)}
      />
    </Field>
  )
}

function getTemplateFieldLabel(definition: CustomFieldDefinition, locale: string) {
  if (locale === "th" && definition.fieldLabelTh) {
    return definition.fieldLabelTh
  }

  return definition.fieldLabel
}
