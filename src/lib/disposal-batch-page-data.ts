import type { Prisma } from "@prisma/client"
import { listDisposalPhotos, type DisposalPhotoDb, type DisposalPhotoRef } from "./disposal-photo.ts"
import { getDisposalRoundTickBlocks, type DisposalRoundActor, type DisposalRoundBlockCode } from "./disposal-round-service.ts"
import { buildDisposalRoundTitle, type DisposalRoundTitleWords } from "./disposal-round-page-data.ts"
import { listPageWindow, type ListPageSize } from "./list-pagination.ts"

// The request-batch pages' reads (request batches spec §5–6, Task 1): the batch list (/disposal/batches) and one batch
// with its machines, its lot photo and the machines that can start a round (/disposal/batches/[id]). A batch has no
// title of its own; it comes from its requests' asset names, the round title rule.

// The photo types the thumbnail route serves; an old HEIC is skipped (the round page's rule).
const showablePhotoTypes: readonly string[] = ["image/jpeg", "image/png", "image/webp", "image/gif"]

export type DisposalBatchStageCounts = { pending: number; approved: number; disposed: number; rejected: number; total: number }

export type DisposalBatchListRow = {
  id: string
  batchNo: string
  title: string
  machineCount: number
  disposalType: string
  requestedByName: string | null
  /** The requester's name without the code: the list shows the name only (Task 4, the canvas note). */
  requestedByShortName: string | null
  requestDate: Date
  counts: DisposalBatchStageCounts
}

export type DisposalBatchMachine = {
  requestId: string
  disposalNo: string
  assetTag: string
  assetName: string
  serialNumber: string | null
  requestStatus: string
  ownPhotoId: string | null
  round: { id: string; roundNo: string; executionDate: Date } | null
}

export type DisposalBatchDetail = {
  batch: {
    id: string
    batchNo: string
    title: string
    disposalType: string
    requestedByName: string | null
    approverName: string | null
    reason: string
    requestDate: Date
  }
  counts: DisposalBatchStageCounts
  machines: DisposalBatchMachine[]
  lotPhotos: DisposalPhotoRef[]
  roundCandidates: { joinableIds: string[]; blocked: Array<{ requestId: string; code: DisposalRoundBlockCode }> }
}

// Method syntax, so a fake may narrow the args; Prisma's client fits as is.
export type DisposalBatchPageDb = DisposalPhotoDb & {
  disposalBatch: {
    findMany(args: object): Promise<unknown[]>
    count(args: object): Promise<number>
    findFirst(args: object): Promise<unknown>
  }
  disposalRequest: { count(args: object): Promise<number> }
}

/** The round service's reader: the batch page's tick blocks run through it. */
export type DisposalBatchTickDb = Parameters<typeof getDisposalRoundTickBlocks>[0]

type Person = { code: string; fullNameTh: string } | null

const personName = (person: Person) => (person ? `${person.code} - ${person.fullNameTh}` : null)

const stageStatuses = ["pending", "approved", "disposed", "rejected"] as const

/** Requests by stage; total counts every active request, a status outside the four included. */
function countStages(statuses: readonly string[]): DisposalBatchStageCounts {
  const counts: DisposalBatchStageCounts = { pending: 0, approved: 0, disposed: 0, rejected: 0, total: statuses.length }
  for (const status of statuses) {
    if ((stageStatuses as readonly string[]).includes(status)) counts[status as (typeof stageStatuses)[number]] += 1
  }
  return counts
}

/** Search by the batch number, any machine's tag or name, and the requester's code or name. */
export function disposalBatchListWhere(search: string): Prisma.DisposalBatchWhereInput {
  const term = search.trim()
  if (!term) return { isActive: true }
  return {
    isActive: true,
    OR: [
      { batchNo: { contains: term } },
      { disposalRequests: { some: { isActive: true, asset: { OR: [{ assetTag: { contains: term } }, { name: { contains: term } }] } } } },
      { requestedBy: { OR: [{ code: { contains: term } }, { fullNameTh: { contains: term } }] } },
    ],
  }
}

type ListBatch = {
  id: string
  batchNo: string
  disposalType: string
  requestDate: Date
  requestedBy: Person
  disposalRequests: Array<{ requestStatus: string; asset: { name: string } }>
}

/**
 * Newest first by request date, then batch number. The strip counts the requests of every active batch by stage
 * (not only the search's), with the number of batches.
 */
export async function readDisposalBatchList(
  db: DisposalBatchPageDb,
  query: { search: string; page: number; pageSize: ListPageSize; titleWords?: DisposalRoundTitleWords },
): Promise<{ rows: DisposalBatchListRow[]; total: number; strip: DisposalBatchStageCounts & { batches: number } }> {
  const where = disposalBatchListWhere(query.search)
  const { skip, take } = listPageWindow({ page: query.page, pageSize: query.pageSize })
  const inActiveBatch = { isActive: true, batchId: { not: null }, batch: { isActive: true } }
  const [batches, total, batchCount, stripTotal, ...stageCounts] = await Promise.all([
    db.disposalBatch.findMany({
      where,
      select: {
        id: true,
        batchNo: true,
        disposalType: true,
        requestDate: true,
        requestedBy: { select: { code: true, fullNameTh: true } },
        disposalRequests: { where: { isActive: true }, select: { requestStatus: true, asset: { select: { name: true } } }, orderBy: { disposalNo: "asc" } },
      },
      orderBy: [{ requestDate: "desc" }, { batchNo: "desc" }],
      skip,
      take,
    }) as Promise<ListBatch[]>,
    db.disposalBatch.count({ where }),
    db.disposalBatch.count({ where: { isActive: true } }),
    db.disposalRequest.count({ where: inActiveBatch }),
    ...stageStatuses.map((status) => db.disposalRequest.count({ where: { ...inActiveBatch, requestStatus: status } })),
  ])
  const [pending, approved, disposed, rejected] = stageCounts
  return {
    total,
    strip: { pending, approved, disposed, rejected, total: stripTotal, batches: batchCount },
    rows: batches.map((batch) => ({
      id: batch.id,
      batchNo: batch.batchNo,
      title: buildDisposalRoundTitle(batch.disposalRequests.map((request) => request.asset.name), query.titleWords),
      machineCount: batch.disposalRequests.length,
      disposalType: batch.disposalType,
      requestedByName: personName(batch.requestedBy),
      requestedByShortName: batch.requestedBy?.fullNameTh ?? null,
      requestDate: batch.requestDate,
      counts: countStages(batch.disposalRequests.map((request) => request.requestStatus)),
    })),
  }
}

type DetailBatch = {
  id: string
  batchNo: string
  disposalType: string
  reason: string
  requestDate: Date
  requestedBy: Person
  approver: Person
  disposalRequests: Array<{
    id: string
    disposalNo: string
    batchId: string | null
    requestStatus: string
    roundId: string | null
    asset: { assetTag: string; name: string; serialNumber: string | null }
    round: { id: string; roundNo: string; executionDate: Date; isActive: boolean } | null
  }>
}

/**
 * One batch (≤ 100 machines) with its machines in request-number order. ownPhotoId is a machine's first own showable
 * photo (the lot photo is not one); lotPhotos are the batch's images. roundCandidates come from the approved requests
 * not yet in a round, split by the round service's tick blocks, and only for an actor (a viewer with disposal:edit);
 * actor null gives none.
 */
export async function readDisposalBatch(
  db: DisposalBatchPageDb & DisposalBatchTickDb,
  id: string,
  actor: DisposalRoundActor | null,
  options: { titleWords?: DisposalRoundTitleWords } = {},
): Promise<DisposalBatchDetail | null> {
  const batch = (await db.disposalBatch.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      batchNo: true,
      disposalType: true,
      reason: true,
      requestDate: true,
      requestedBy: { select: { code: true, fullNameTh: true } },
      approver: { select: { code: true, fullNameTh: true } },
      disposalRequests: {
        where: { isActive: true },
        select: {
          id: true,
          disposalNo: true,
          batchId: true,
          requestStatus: true,
          roundId: true,
          asset: { select: { assetTag: true, name: true, serialNumber: true } },
          round: { select: { id: true, roundNo: true, executionDate: true, isActive: true } },
        },
        orderBy: { disposalNo: "asc" },
      },
    },
  })) as DetailBatch | null
  if (!batch) return null
  const requests = [...batch.disposalRequests].sort((a, b) => a.disposalNo.localeCompare(b.disposalNo))
  const candidateIds = requests.filter((request) => request.requestStatus === "approved" && request.roundId == null).map((request) => request.id)
  // A batch holds at most 100 machines, so each IN list stays far under SQL Server's 2,100 parameters; the round
  // service chunks its own reads.
  const [photos, tickBlocks] = await Promise.all([
    listDisposalPhotos(db, requests.map((request) => ({ id: request.id, batchId: batch.id }))),
    actor && candidateIds.length > 0
      ? getDisposalRoundTickBlocks(db, candidateIds, actor)
      : Promise.resolve(new Map<string, DisposalRoundBlockCode | null>()),
  ])
  const isShowable = (photo: DisposalPhotoRef) => showablePhotoTypes.includes(photo.fileType.toLowerCase())
  // Every request lists the batch's images after its own; the first request's batch refs are the lot photos.
  const lotPhotos = requests.length > 0 ? (photos.get(requests[0].id) ?? []).filter((photo) => photo.source === "batch") : []

  const joinableIds: string[] = []
  const blocked: Array<{ requestId: string; code: DisposalRoundBlockCode }> = []
  if (actor) {
    for (const requestId of candidateIds) {
      const code = tickBlocks.get(requestId) ?? null
      if (code) blocked.push({ requestId, code })
      else joinableIds.push(requestId)
    }
  }

  return {
    batch: {
      id: batch.id,
      batchNo: batch.batchNo,
      title: buildDisposalRoundTitle(requests.map((request) => request.asset.name), options.titleWords),
      disposalType: batch.disposalType,
      requestedByName: personName(batch.requestedBy),
      approverName: personName(batch.approver),
      reason: batch.reason,
      requestDate: batch.requestDate,
    },
    counts: countStages(requests.map((request) => request.requestStatus)),
    machines: requests.map((request) => ({
      requestId: request.id,
      disposalNo: request.disposalNo,
      assetTag: request.asset.assetTag,
      assetName: request.asset.name,
      serialNumber: request.asset.serialNumber ?? null,
      requestStatus: request.requestStatus,
      ownPhotoId: photos.get(request.id)?.find((photo) => photo.source === "request" && isShowable(photo))?.id ?? null,
      round: request.round && request.round.isActive
        ? { id: request.round.id, roundNo: request.round.roundNo, executionDate: request.round.executionDate }
        : null,
    })),
    lotPhotos,
    roundCandidates: { joinableIds, blocked },
  }
}
