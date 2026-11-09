// Where a disposal request came from (group 6 spec §9.3). Server-safe and client-safe: no runtime import; the db is
// injected (pages pass Prisma, the tests fake it).
//
// - maintenance → "งานซ่อม MT-…" linking to the repair record;
// - audit_finding → "รายการไม่ตรงทะเบียน AUD-…" linking to the findings page opened on that finding;
// - audit_round → "ตรวจนับ AUD-…" linking to the round (a request made from the round's confirm page);
// - anything else, or a known type whose record is not found, keeps the old "<sourceType> / <sourceId>" text.

export type DisposalSourceLink =
  | { kind: "maintenance" | "audit_finding" | "audit_round"; number: string; href: string }
  | { kind: "other"; text: string; href: null }

export type DisposalSourceRef = { sourceType: string | null; sourceId: string | null }
export type DisposalSourceNumbers = { repairNo?: string | null; auditNo?: string | null }

// Method syntax, so fakes may narrow args; Prisma's client fits as is.
export type DisposalSourceDb = {
  maintenanceTicket: { findMany(args: { where: { id: { in: string[] } }; select: object }): Promise<unknown[]> }
  auditFinding: { findMany(args: { where: { id: { in: string[] } }; select: object }): Promise<unknown[]> }
  auditRound: { findMany(args: { where: { id: { in: string[] } }; select: object }): Promise<unknown[]> }
}

type MaintenanceRow = { id: string; repairNo: string }
type FindingRow = { id: string; auditRound: { auditNo: string } | null }
type RoundRow = { id: string; auditNo: string }

/** The disposalPage message for a linked source, with `{number}`. */
export function disposalSourceLabelKey(kind: Exclude<DisposalSourceLink["kind"], "other">) {
  return kind === "maintenance" ? "sourceMaintenance" as const : kind === "audit_round" ? "sourceAuditRound" as const : "sourceAuditFinding" as const
}

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
  if (sourceType === "audit_round" && sourceId && numbers.auditNo) {
    return { kind: "audit_round", number: numbers.auditNo, href: `/${locale}/audit/rounds/${encodeURIComponent(sourceId)}` }
  }

  return { kind: "other", text: [sourceType, sourceId].filter(Boolean).join(" / "), href: null }
}

function idsOfType(requests: Array<DisposalSourceRef>, sourceType: string) {
  return [...new Set(requests.filter((request) => request.sourceType === sourceType && request.sourceId).map((request) => request.sourceId as string))]
}

const SOURCE_ID_CHUNK = 2000

async function readInChunks<T>(ids: string[], read: (chunk: string[]) => Promise<T[]>): Promise<T[]> {
  const chunks: string[][] = []
  for (let start = 0; start < ids.length; start += SOURCE_ID_CHUNK) chunks.push(ids.slice(start, start + SOURCE_ID_CHUNK))
  return (await Promise.all(chunks.map(read))).flat()
}

/** One read per source table (per 2,000 ids) for any number of requests; the map holds every request id. */
export async function readDisposalSourceLinks(
  db: DisposalSourceDb,
  locale: string,
  requests: Array<{ id: string } & DisposalSourceRef>,
): Promise<Map<string, DisposalSourceLink | null>> {
  const maintenanceIds = idsOfType(requests, "maintenance")
  const findingIds = idsOfType(requests, "audit_finding")
  const roundIds = idsOfType(requests, "audit_round")

  // IN lists in chunks of 2,000: SQL Server takes at most 2,100 parameters per query, and the export reads up to 5,000.
  const [maintenanceRows, findingRows, roundRows] = await Promise.all([
    readInChunks(maintenanceIds, (ids) => db.maintenanceTicket.findMany({ where: { id: { in: ids } }, select: { id: true, repairNo: true } }) as Promise<MaintenanceRow[]>),
    readInChunks(findingIds, (ids) => db.auditFinding.findMany({
      where: { id: { in: ids } },
      select: { id: true, auditRound: { select: { auditNo: true } } },
    }) as Promise<FindingRow[]>),
    readInChunks(roundIds, (ids) => db.auditRound.findMany({ where: { id: { in: ids } }, select: { id: true, auditNo: true } }) as Promise<RoundRow[]>),
  ])

  const repairNoById = new Map(maintenanceRows.map((row) => [row.id, row.repairNo]))
  const auditNoById = new Map(findingRows.map((row) => [row.id, row.auditRound?.auditNo ?? null]))
  const roundAuditNoById = new Map(roundRows.map((row) => [row.id, row.auditNo]))

  return new Map(
    requests.map((request) => {
      const numbers: DisposalSourceNumbers =
        request.sourceType === "maintenance" && request.sourceId
          ? { repairNo: repairNoById.get(request.sourceId) ?? null }
          : request.sourceType === "audit_finding" && request.sourceId
            ? { auditNo: auditNoById.get(request.sourceId) ?? null }
            : request.sourceType === "audit_round" && request.sourceId
              ? { auditNo: roundAuditNoById.get(request.sourceId) ?? null }
              : {}
      return [request.id, toDisposalSourceLink(locale, request, numbers)]
    }),
  )
}
