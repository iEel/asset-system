// The finding types' words in every language the app has, for the findings search (bug 19, P4-R5b). The page and both
// findings exports read this one helper, so a Thai or English field name finds the same rows on screen and in the file.
import { getTranslations } from "next-intl/server"
import { routing } from "@/i18n/routing"
import { buildAuditFindingTypeSearchLabels, type AuditFindingTypeSearchLabels } from "@/lib/audit-finding-filters"

export async function getAuditFindingTypeSearchLabels(): Promise<AuditFindingTypeSearchLabels> {
  const translators = await Promise.all(
    routing.locales.map(async (locale) => {
      const [finding, round] = await Promise.all([getTranslations({ locale, namespace: "auditFinding" }), getTranslations({ locale, namespace: "auditRound" })])
      return { finding: (key: string) => finding(key), round: (key: string) => round(key) }
    }),
  )
  return buildAuditFindingTypeSearchLabels(translators)
}
