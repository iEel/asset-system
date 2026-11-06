import { notFound } from "next/navigation"
import { BatchCheckinForm } from "@/components/asset-operations/batch-checkin-form"
import { getAssetOperationMasterOptions } from "@/lib/asset-operation-options"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { batchCheckinPageHref, toBatchCheckinFormRow } from "@/lib/batch-checkin-form-rules"
import { prisma } from "@/lib/db"
import { readEmployeeReturnBatch, type EmployeePageDb } from "@/lib/employee-page-data"
import { requirePagePermission } from "@/lib/page-auth"

type BatchCheckinPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ employeeId?: string | string[]; returnTo?: string | string[] }>
}

// รับคืนหลายรายการ (group 7 plan 4 Task 4, spec §5.3): one holder's machines in one form, asset:edit as the single return.
// The rows are the employee page's held rows (the same return block), read whole; the form posts to
// /api/asset-checkins/batch and opens the RT- page.
export default async function BatchCheckinPage({ params, searchParams }: BatchCheckinPageProps) {
  const { locale } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "asset", "edit")
  const employeeId = Array.isArray(filters.employeeId) ? filters.employeeId[0] : filters.employeeId
  if (!employeeId) notFound()
  const [batch, options] = await Promise.all([
    readEmployeeReturnBatch(prisma as unknown as EmployeePageDb, employeeId),
    getAssetOperationMasterOptions({ conditionsFor: "checkin" }),
  ])
  if (!batch) notFound()
  const returnTo = filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined

  return (
    <BatchCheckinForm
      holder={batch.employee}
      rows={batch.rows.map(toBatchCheckinFormRow)}
      total={batch.total}
      employees={options.employees}
      locations={options.locations}
      statuses={options.statuses}
      conditions={options.conditions}
      currentEmployeeId={user.employeeId ?? null}
      pageHref={batchCheckinPageHref(locale, batch.employee.id, returnTo)}
      returnTo={returnTo}
    />
  )
}
