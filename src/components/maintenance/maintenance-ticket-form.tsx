"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { Loader2, Save } from "lucide-react"
import { toast } from "sonner"
import { FormContextBanner } from "@/components/ui/form-context-banner"
import { SearchableSelect } from "@/components/ui/searchable-select"

type Option = { id: string; label: string }

export function MaintenanceTicketForm({
  assets,
  employees,
  suppliers,
  initialAssetId,
}: {
  assets: Option[]
  employees: Option[]
  suppliers: Option[]
  initialAssetId?: string
}) {
  const router = useRouter()
  const t = useTranslations("maintenancePage")
  const tCommon = useTranslations("common")
  const [saving, setSaving] = useState(false)
  const initialAsset = assets.find((asset) => asset.id === initialAssetId)
  const [values, setValues] = useState({
    assetId: initialAsset?.id ?? "",
    problem: "",
    reportedById: "",
    reportedDate: new Date().toISOString().slice(0, 10),
    dueDate: "",
    assignedToId: "",
    repairType: "internal",
    vendorId: "",
    laborCost: "",
    partsCost: "",
    repairCost: "",
    quotationNo: "",
    invoiceNo: "",
    warrantyClaim: false,
  })

  function setField(field: string, value: string | boolean) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch("/api/maintenance-tickets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assetId: values.assetId,
          problem: values.problem,
          reportedById: values.reportedById,
          reportedDate: values.reportedDate,
          dueDate: values.dueDate || null,
          assignedToId: values.assignedToId || null,
          repairType: values.repairType,
          vendorId: values.repairType === "vendor" ? values.vendorId || null : null,
          laborCost: values.laborCost || null,
          partsCost: values.partsCost || null,
          repairCost: values.repairCost || null,
          quotationNo: values.quotationNo || null,
          invoiceNo: values.invoiceNo || null,
          warrantyClaim: values.warrantyClaim,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("createSuccess"))
      setValues((current) => ({
        ...current,
        assetId: initialAsset?.id ?? "",
        problem: "",
        dueDate: "",
        laborCost: "",
        partsCost: "",
        repairCost: "",
        quotationNo: "",
        invoiceNo: "",
        vendorId: "",
      }))
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section className="rounded-lg border border-border bg-surface p-6 shadow-sm">
      <div className="mb-5">
        <h2 className="text-base font-semibold text-foreground">{t("createTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("createSubtitle")}</p>
      </div>
      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {initialAsset ? (
          <div className="md:col-span-2">
            <FormContextBanner label={t("asset")} value={initialAsset.label} />
          </div>
        ) : null}
        <SearchableSelect label={t("asset")} value={values.assetId} required options={assets} placeholder={t("selectAsset")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("assetId", value)} />
        <SearchableSelect label={t("reportedBy")} value={values.reportedById} required options={employees} placeholder={t("selectEmployee")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("reportedById", value)} />
        <Field label={t("reportedDate")} required>
          <input
            type="date"
            value={values.reportedDate}
            required
            onChange={(event) => setField("reportedDate", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("dueDate")}>
          <input
            type="date"
            value={values.dueDate}
            onChange={(event) => setField("dueDate", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <SearchableSelect label={t("assignedTo")} value={values.assignedToId} options={employees} placeholder={t("unassigned")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("assignedToId", value)} />
        <Select label={t("repairType")} value={values.repairType} required onChange={(value) => setField("repairType", value)}>
          <option value="internal">{t("internalRepair")}</option>
          <option value="vendor">{t("vendorRepair")}</option>
        </Select>
        <SearchableSelect label={t("vendor")} value={values.vendorId} required={values.repairType === "vendor"} options={suppliers} placeholder={t("selectVendor")} searchPlaceholder={tCommon("searchSelectPlaceholder")} emptyLabel={tCommon("searchSelectNoResults")} onChange={(value) => setField("vendorId", value)} />
        <Field label={t("laborCost")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.laborCost}
            onChange={(event) => setField("laborCost", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("partsCost")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.partsCost}
            onChange={(event) => setField("partsCost", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("repairCost")}>
          <input
            type="number"
            min="0"
            step="0.01"
            value={values.repairCost}
            onChange={(event) => setField("repairCost", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("quotationNo")}>
          <input
            value={values.quotationNo}
            maxLength={100}
            onChange={(event) => setField("quotationNo", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <Field label={t("invoiceNo")}>
          <input
            value={values.invoiceNo}
            maxLength={100}
            onChange={(event) => setField("invoiceNo", event.target.value)}
            className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
          />
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm font-medium text-foreground">
          <input
            type="checkbox"
            checked={values.warrantyClaim}
            onChange={(event) => setField("warrantyClaim", event.target.checked)}
            className="h-4 w-4 rounded border-border"
          />
          {t("warrantyClaim")}
        </label>
        <div className="md:col-span-2">
          <Field label={t("problem")} required>
            <textarea
              value={values.problem}
              required
              rows={4}
              maxLength={4000}
              onChange={(event) => setField("problem", event.target.value)}
              className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </Field>
        </div>
        <div className="md:col-span-2 flex justify-end">
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
    </section>
  )
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
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

function Select({
  label,
  value,
  required,
  onChange,
  children,
}: {
  label: string
  value: string
  required?: boolean
  onChange: (value: string) => void
  children: React.ReactNode
}) {
  return (
    <Field label={label} required={required}>
      <select
        value={value}
        required={required}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
      >
        {children}
      </select>
    </Field>
  )
}
