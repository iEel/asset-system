// Where a disposal request came from (group 6 spec §9.3). Server-safe and client-safe: no runtime import; the db is
// injected (pages pass Prisma, the tests fake it).
//
// - maintenance → "งานซ่อม MT-…" linking to the repair record;
// - audit_finding → "รายการไม่ตรง AUD-…" linking to the findings page opened on that finding;
// - anything else, or a known type whose record is not found, keeps the old "<sourceType> / <sourceId>" text.

export type DisposalSourceLink =
  | { kind: "maintenance" | "audit_finding"; number: string; href: string }
  | { kind: "other"; text: string; href: null }

export type DisposalSourceRef = { sourceType: string | null; sourceId: string | null }
export type DisposalSourceNumbers = { repairNo?: string | null; auditNo?: string | null }

// Method syntax, so fakes may narrow args; Prisma's client fits as is.
export type DisposalSourceDb = {
  maintenanceTicket: { findMany(args: { where: { id: { in: string[] } }; select: object }): Promise<unknown[]> }
  auditFinding: { findMany(args: { where: { id: { in: string[] } }; select: object }): Promise<unknown[]> }
}

type MaintenanceRow = { id: string; repairNo: string }
type FindingRow = { id: string; auditRound: { auditNo: string } | null }

export function toDisposalSourceLink(
  locale: string,
  source: DisposalSourceRef,
  numbers: DisposalSourceNumbers,
): DisposalSourceLink | null {
  const { sourceType, sourceId } = source
  if (!sourceType && !sourceId) return null

  if (sourceType === "maintenance" && sourceId && numbers.repairNo) {
    return { kind: "maintenance", number: numbers.repairNo, href: `/${locale}/maintenance/${encodeURIComponent(sourceId)}` }
  }
  if (sourceType === "audit_finding" && sourceId && numbers.auditNo) {
    return {
      kind: "audit_finding",
      number: numbers.auditNo,
      href: `/${locale}/audit/findings?finding=${encodeURIComponent(sourceId)}`,
    }
  }

  return { kind: "other", text: [sourceType, sourceId].filter(Boolean).join(" / "), href: null }
}

function idsOfType(requests: Array<DisposalSourceRef>, sourceType: string) {
  return [...new Set(requests.filter((request) => request.sourceType === sourceType && request.sourceId).map((request) => request.sourceId as string))]
}

/** One read per source table for any number of requests; the map holds every request id. */
export async function readDisposalSourceLinks(
  db: DisposalSourceDb,
  locale: string,
  requests: Array<{ id: string } & DisposalSourceRef>,
): Promise<Map<string, DisposalSourceLink | null>> {
  const maintenanceIds = idsOfType(requests, "maintenance")
  const findingIds = idsOfType(requests, "audit_finding")

  const [maintenanceRows, findingRows] = await Promise.all([
    maintenanceIds.length
      ? (db.maintenanceTicket.findMany({ where: { id: { in: maintenanceIds } }, select: { id: true, repairNo: true } }) as Promise<MaintenanceRow[]>)
      : Promise.resolve([] as MaintenanceRow[]),
    findingIds.length
      ? (db.auditFinding.findMany({
          where: { id: { in: findingIds } },
          select: { id: true, auditRound: { select: { auditNo: true } } },
        }) as Promise<FindingRow[]>)
      : Promise.resolve([] as FindingRow[]),
  ])

  const repairNoById = new Map(maintenanceRows.map((row) => [row.id, row.repairNo]))
  const auditNoById = new Map(findingRows.map((row) => [row.id, row.auditRound?.auditNo ?? null]))

  return new Map(
    requests.map((request) => {
      const numbers: DisposalSourceNumbers =
        request.sourceType === "maintenance" && request.sourceId
          ? { repairNo: repairNoById.get(request.sourceId) ?? null }
          : request.sourceType === "audit_finding" && request.sourceId
            ? { auditNo: auditNoById.get(request.sourceId) ?? null }
            : {}
      return [request.id, toDisposalSourceLink(locale, request, numbers)]
    }),
  )
}
