import { getAuditRoundOptions } from "@/lib/audit-options"
import { requirePagePermission } from "@/lib/page-auth"
import { AuditRoundForm } from "@/components/audit/audit-round-form"

type NewAuditRoundPageProps = {
  params: Promise<{ locale: string }>
}

export default async function NewAuditRoundPage({ params }: NewAuditRoundPageProps) {
  const { locale } = await params
  await requirePagePermission(locale, "audit", "create")
  const options = await getAuditRoundOptions()

  return <AuditRoundForm options={options} />
}
