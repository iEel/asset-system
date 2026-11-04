import type { Prisma } from "@prisma/client"
import { listDisposalPhotos, type DisposalPhotoDb } from "./disposal-photo.ts"
import { listPageWindow, type ListPageSize } from "./list-pagination.ts"

// The round pages' reads (group 6 plan 4 Task 4, spec §11.3–11.4): the rounds list (/disposal/rounds) and one round
// with its machines (/disposal/rounds/[id]). A round has no title of its own; it comes from its requests' asset names.

export type DisposalRoundTitleWords = {
  same: (name: string, count: number) => string
  mixed: (name: string, rest: number) => string
}

const thaiTitleWords: DisposalRoundTitleWords = {
  same: (name, count) => `${name} ${count} เครื่อง`,
  mixed: (name, rest) => `${name} และอีก ${rest} รายการ`,
}

/** "{name} {n} เครื่อง" when every machine has one name, else "{first name} และอีก {n-1} รายการ". */
export function buildDisposalRoundTitle(names: readonly string[], words: DisposalRoundTitleWords = thaiTitleWords): string {
  if (names.length === 0) return ""
  const [first] = names
  return names.every((name) => name === first) ? words.same(first, names.length) : words.mixed(first, names.length - 1)
}

// Method syntax, so a fake may narrow the args; Prisma's client fits as is.
export type DisposalRoundPageDb = DisposalPhotoDb & {
  disposalRound: {
    findMany(args: object): Promise<unknown[]>
    count(args: object): Promise<number>
    findFirst(args: object): Promise<unknown>
  }
  user: { findUnique(args: object): Promise<unknown> }
}

export type DisposalRoundListRow = {
  id: string
  roundNo: string
  title: string
  machineCount: number
  disposalType: string
  recipientName: string | null
  executionDate: Date
  saleValue: number | null
}

type DecimalLike = number | string | { toString(): string } | null

const toNumber = (value: DecimalLike) => (value == null ? null : Number(value.toString()))

/** Newest first; search by the round number, the document number, the buyer and the machines' tag or name. */
export function disposalRoundListWhere(search: string): Prisma.DisposalRoundWhereInput {
  const term = search.trim()
  if (!term) return { isActive: true }
  return {
    isActive: true,
    OR: [
      { roundNo: { contains: term } },
      { documentNo: { contains: term } },
      { recipientName: { contains: term } },
      { disposalRequests: { some: { isActive: true, asset: { OR: [{ assetTag: { contains: term } }, { name: { contains: term } }] } } } },
    ],
  }
}

type ListRound = {
  id: string
  roundNo: string
  disposalType: string
  recipientName: string | null
  executionDate: Date
  saleValue: DecimalLike
  disposalRequests: Array<{ asset: { name: string } }>
}

export async function readDisposalRoundList(
  db: DisposalRoundPageDb,
  options: { search: string; page: number; pageSize: ListPageSize | number; titleWords?: DisposalRoundTitleWords },
): Promise<{ rows: DisposalRoundListRow[]; total: number }> {
  const where = disposalRoundListWhere(options.search)
  const { skip, take } = listPageWindow({ page: options.page, pageSize: options.pageSize as ListPageSize })
  const [rounds, total] = await Promise.all([
    db.disposalRound.findMany({
      where,
      select: {
        id: true,
        roundNo: true,
        disposalType: true,
        recipientName: true,
        executionDate: true,
        saleValue: true,
        disposalRequests: { where: { isActive: true }, select: { asset: { select: { name: true } } }, orderBy: { disposalNo: "asc" } },
      },
      orderBy: [{ executionDate: "desc" }, { roundNo: "desc" }],
      skip,
      take,
    }) as Promise<ListRound[]>,
    db.disposalRound.count({ where }),
  ])
  return {
    total,
    rows: rounds.map((round) => ({
      id: round.id,
      roundNo: round.roundNo,
      title: buildDisposalRoundTitle(round.disposalRequests.map((request) => request.asset.name), options.titleWords),
      machineCount: round.disposalRequests.length,
      disposalType: round.disposalType,
      recipientName: round.recipientName,
      executionDate: round.executionDate,
      saleValue: toNumber(round.saleValue),
    })),
  }
}

export type DisposalRoundMachine = {
  requestId: string
  disposalNo: string
  assetTag: string
  assetName: string
  serialNumber: string | null
  approverName: string | null
  firstPhotoId: string | null
}

export type DisposalRoundDetail = {
  id: string
  roundNo: string
  title: string
  disposalType: string
  executionDate: Date
  recipientName: string | null
  documentNo: string
  saleValue: number | null
  remark: string | null
  executedByName: string
  recordedByName: string
  createdAt: Date
}

type DetailRound = {
  id: string
  roundNo: string
  disposalType: string
  executionDate: Date
  recipientName: string | null
  documentNo: string
  saleValue: DecimalLike
  remark: string | null
  createdBy: string
  createdAt: Date
  executedBy: { code: string; fullNameTh: string }
  disposalRequests: Array<{
    id: string
    disposalNo: string
    batchId: string | null
    asset: { assetTag: string; name: string; serialNumber: string | null }
    approver: { code: string; fullNameTh: string } | null
  }>
}

export async function readDisposalRound(
  db: DisposalRoundPageDb,
  id: string,
  options: { titleWords?: DisposalRoundTitleWords } = {},
): Promise<{ round: DisposalRoundDetail; machines: DisposalRoundMachine[] } | null> {
  const round = (await db.disposalRound.findFirst({
    where: { id, isActive: true },
    select: {
      id: true,
      roundNo: true,
      disposalType: true,
      executionDate: true,
      recipientName: true,
      documentNo: true,
      saleValue: true,
      remark: true,
      createdBy: true,
      createdAt: true,
      executedBy: { select: { code: true, fullNameTh: true } },
      disposalRequests: {
        where: { isActive: true },
        select: {
          id: true,
          disposalNo: true,
          batchId: true,
          asset: { select: { assetTag: true, name: true, serialNumber: true } },
          approver: { select: { code: true, fullNameTh: true } },
        },
        orderBy: { disposalNo: "asc" },
      },
    },
  })) as DetailRound | null
  if (!round) return null
  // The service stores the signed-in user's id; an unknown one shows as stored.
  const [recorder, photos] = await Promise.all([
    db.user.findUnique({ where: { id: round.createdBy }, select: { displayName: true, username: true } }) as Promise<{ displayName: string | null; username: string } | null>,
    listDisposalPhotos(db, round.disposalRequests.map((request) => ({ id: request.id, batchId: request.batchId }))),
  ])
  const requests = [...round.disposalRequests].sort((a, b) => a.disposalNo.localeCompare(b.disposalNo))
  return {
    round: {
      id: round.id,
      roundNo: round.roundNo,
      title: buildDisposalRoundTitle(requests.map((request) => request.asset.name), options.titleWords),
      disposalType: round.disposalType,
      executionDate: round.executionDate,
      recipientName: round.recipientName,
      documentNo: round.documentNo,
      saleValue: toNumber(round.saleValue),
      remark: round.remark,
      executedByName: `${round.executedBy.code} - ${round.executedBy.fullNameTh}`,
      recordedByName: recorder?.displayName || recorder?.username || round.createdBy,
      createdAt: round.createdAt,
    },
    machines: requests.map((request) => ({
      requestId: request.id,
      disposalNo: request.disposalNo,
      assetTag: request.asset.assetTag,
      assetName: request.asset.name,
      serialNumber: request.asset.serialNumber,
      approverName: request.approver ? `${request.approver.code} - ${request.approver.fullNameTh}` : null,
      firstPhotoId: photos.get(request.id)?.[0]?.id ?? null,
    })),
  }
}

/** The request page and its print (spec §9.3): the round a disposed request was recorded in, with its machine count. */
export const disposalRequestRoundSelect = {
  id: true,
  roundNo: true,
  disposalType: true,
  executionDate: true,
  recipientName: true,
  documentNo: true,
  saleValue: true,
  _count: { select: { disposalRequests: { where: { isActive: true } } } },
} as const
