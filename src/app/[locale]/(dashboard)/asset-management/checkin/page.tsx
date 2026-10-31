import Link from "next/link"
import { getTranslations } from "next-intl/server"
import { linkVariants } from "@/components/ui/button-variants"
import { getAssetOperationMasterOptions } from "@/lib/asset-operation-options"
import { buildExactAssetRegisterHref } from "@/lib/asset-register-view-memory"
import { countLegacyReturns, getCheckinPreselect, readConditionLabels } from "@/lib/checkin-page-data"
import { readCheckinDepartment } from "@/lib/checkin-department"
import { prisma } from "@/lib/db"
import { hasPermission } from "@/lib/auth-utils"
import { formatCount } from "@/lib/display-format"
import { requirePagePermission } from "@/lib/page-auth"
import { CheckinForm } from "@/components/asset-operations/checkin-form"
import { normalizeAssetReturnTo } from "@/lib/asset-return-navigation"
import { cn } from "@/lib/utils"

type CheckinPageProps = {
  params: Promise<{ locale: string }>
  searchParams: Promise<{ checkoutId?: string | string[]; assetId?: string | string[]; returnTo?: string | string[] }>
}

export default async function CheckinPage({ params, searchParams }: CheckinPageProps) {
  const { locale } = await params
  const filters = await searchParams
  const user = await requirePagePermission(locale, "asset", "edit")
  const t = await getTranslations("checkin")
  // The master lists, at most one preselect answer and one count: the picker asks the server search (spec 6.3). The
  // condition names and the return department feed the summary (group 3 spec §8.2, §8.4). A return department that does
  // not resolve reads null: the summary warns, the legacy confirm is refused, and the route refuses the save (P2-R8).
  const [options, preselect, legacyReturnCount, conditionLabels, returnDepartment] = await Promise.all([
    getAssetOperationMasterOptions({ conditionsFor: "checkin" }),
    getCheckinPreselect({ checkoutId: filters.checkoutId, assetId: filters.assetId }),
    countLegacyReturns(),
    readConditionLabels(),
    readCheckinDepartment(prisma).catch(() => null),
  ])
  // The header link (group 3 spec §8.1): N opens the register's noHandover list, the count's own where, as an exact
  // link that leaves the viewer's saved register view alone. Nothing when N is 0. Built here because the form is a
  // client file that imports no next/link (tests/operations-sweep-ui.test.ts).
  const legacyLink = legacyReturnCount > 0 ? (
    <Link href={buildExactAssetRegisterHref(locale, { dataQuality: "noHandover" })} className={cn(linkVariants({ size: "inherit" }), "inline-flex min-h-11 items-center text-meta md:min-h-0")}>
      {t("legacyReturnLink", { count: formatCount(legacyReturnCount) })}
    </Link>
  ) : null

  return (
    <CheckinForm
      employees={options.employees}
      locations={options.locations}
      statuses={options.statuses}
      conditions={options.conditions}
      conditionLabels={conditionLabels}
      initialRow={preselect.row}
      initialQuery={preselect.query}
      returnDepartment={returnDepartment}
      currentEmployeeId={user.employeeId ?? null}
      canCreateRepair={hasPermission(user, "maintenance", "create")}
      legacyLink={legacyLink}
      returnTo={filters.returnTo ? normalizeAssetReturnTo(locale, filters.returnTo) : undefined}
    />
  )
}
