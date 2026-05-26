"use client"

import { useState } from "react"
import { useTranslations } from "next-intl"
import { useRouter } from "next/navigation"
import { CheckCircle2, ClipboardCheck, Loader2, X } from "lucide-react"
import { toast } from "sonner"

type StatusOption = { id: string; label: string; name: string }
type DisposalDecision = "approve" | "reject"

export function DisposalDecisionButton({
  requestId,
  disposalNo,
  disposalType,
  statuses,
  defaultSaleValue,
  defaultSalvageValue,
}: {
  requestId: string
  disposalNo: string
  disposalType: string
  statuses: StatusOption[]
  defaultSaleValue?: string
  defaultSalvageValue?: string
}) {
  const router = useRouter()
  const t = useTranslations("disposalPage")
  const tCommon = useTranslations("common")
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const disposedStatus = statuses.find((status) => status.name === "Disposed")
  const lostStatus = statuses.find((status) => status.name === "Lost")
  const readyStatus = statuses.find((status) => status.name === "Ready")
  const defaultStatus = disposalType === "lost" ? lostStatus : disposedStatus
  const [values, setValues] = useState({
    decision: "approve" as DisposalDecision,
    nextStatusId: defaultStatus?.id ?? statuses[0]?.id ?? "",
    saleValue: defaultSaleValue ?? "",
    salvageValue: defaultSalvageValue ?? "",
    approvalRemark: "",
  })

  function setField(field: string, value: string) {
    setValues((current) => {
      if (field === "decision" && value === "reject") {
        return { ...current, decision: value, nextStatusId: readyStatus?.id ?? current.nextStatusId }
      }
      if (field === "decision" && value === "approve") {
        return { ...current, decision: value, nextStatusId: defaultStatus?.id ?? current.nextStatusId }
      }
      return { ...current, [field]: value }
    })
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    try {
      const response = await fetch(`/api/disposal-requests/${requestId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          decision: values.decision,
          nextStatusId: values.nextStatusId,
          saleValue: values.saleValue || null,
          salvageValue: values.salvageValue || null,
          approvalRemark: values.approvalRemark || null,
        }),
      })
      const payload = await response.json().catch(() => null)
      if (!response.ok) throw new Error(payload?.error ?? tCommon("error"))
      toast.success(t("decisionSuccess"))
      setOpen(false)
      router.refresh()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : tCommon("error"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-accent sm:h-8 sm:min-h-0"
      >
        <ClipboardCheck className="h-3.5 w-3.5" />
        {t("reviewRequest")}
      </button>

      {open ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/30 p-3 sm:items-center sm:p-4">
          <section className="max-h-[calc(100vh-1.5rem)] w-full max-w-2xl overflow-hidden rounded-lg border border-border bg-surface shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="text-base font-semibold text-foreground">{t("decisionTitle")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{disposalNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="inline-flex h-11 w-11 items-center justify-center rounded-md border border-border hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 sm:h-8 sm:w-8"
                aria-label={tCommon("close")}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="grid max-h-[calc(100vh-7rem)] grid-cols-1 gap-5 overflow-y-auto p-4 sm:p-5 md:grid-cols-2">
              <Field label={t("decision")} required>
                <select
                  value={values.decision}
                  required
                  onChange={(event) => setField("decision", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  <option value="approve">{t("approve")}</option>
                  <option value="reject">{t("reject")}</option>
                </select>
              </Field>
              <Field label={t("nextStatus")} required>
                <select
                  value={values.nextStatusId}
                  required
                  disabled={values.decision === "approve"}
                  onChange={(event) => setField("nextStatusId", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                >
                  {statuses.map((status) => (
                    <option key={status.id} value={status.id}>
                      {status.label}
                    </option>
                  ))}
                </select>
                {values.decision === "approve" ? (
                  <p className="mt-1 text-xs text-muted-foreground">{t("approveKeepsPendingDisposal")}</p>
                ) : null}
              </Field>
              <Field label={t("saleValue")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.saleValue}
                  onChange={(event) => setField("saleValue", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <Field label={t("salvageValue")}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={values.salvageValue}
                  onChange={(event) => setField("salvageValue", event.target.value)}
                  className="h-10 w-full rounded-md border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </Field>
              <div className="md:col-span-2">
                <Field label={t("approvalRemark")}>
                  <textarea
                    value={values.approvalRemark}
                    rows={4}
                    maxLength={4000}
                    onChange={(event) => setField("approvalRemark", event.target.value)}
                    className="min-h-28 w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                  />
                </Field>
              </div>
              <div className="flex flex-col justify-end gap-2 sm:flex-row md:col-span-2">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="inline-flex min-h-11 items-center justify-center rounded-md border border-border px-4 text-sm font-medium transition-colors hover:bg-accent sm:h-10 sm:min-h-0"
                >
                  {tCommon("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-white transition-colors hover:bg-primary/90 disabled:opacity-50 sm:h-10 sm:min-h-0"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t("saveDecision")}
                </button>
              </div>
            </form>
          </section>
        </div>
      ) : null}
    </>
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
