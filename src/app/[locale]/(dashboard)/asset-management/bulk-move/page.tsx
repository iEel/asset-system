import { BulkMoveForm } from "@/components/asset-operations/bulk-move-form"
import { readBulkMoveListPage, readBulkMovePageOptions, type BulkMoveListDb } from "@/lib/bulk-move-list"
import { prisma } from "@/lib/db"
import { requirePagePermission } from "@/lib/page-auth"

type BulkMovePageProps = {
  params: Promise<{ locale: string }>
}

export default async function BulkMovePage({ params }: BulkMovePageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "asset", "edit")
  // Active rooms and categories only, and the first page, so the first paint has rows (group 3 spec §10.3; P4-R12).
  const db = prisma as unknown as BulkMoveListDb
  const [options, firstPage] = await Promise.all([readBulkMovePageOptions(db), readBulkMoveListPage(db, { q: "", locationId: null, categoryId: null, page: 1 })])

  return <BulkMoveForm rooms={options.rooms} categories={options.categories} initialPage={firstPage} />
}
