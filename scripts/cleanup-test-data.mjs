import "dotenv/config"

import { pathToFileURL } from "node:url"

const DATE_ONLY_PATTERN = /^\d{4}-\d{2}-\d{2}$/
const CHUNK_SIZE = 500

export function parseCleanupArgs(argv = process.argv.slice(2)) {
  const options = {
    apply: false,
    dryRun: true,
    confirmDelete: false,
    allAssets: false,
    assetTagPrefixes: [],
    assetIds: [],
    createdBy: "",
    createdAfter: null,
    createdBefore: null,
    resetAuditRuns: true,
    includeLogs: false,
    help: false,
  }

  for (let index = 0; index < argv.length; index += 1) {
    const raw = argv[index]
    const [flag, inlineValue] = raw.includes("=") ? raw.split(/=(.*)/s, 2) : [raw, undefined]
    const readValue = () => {
      if (inlineValue !== undefined) return inlineValue
      index += 1
      if (index >= argv.length || argv[index].startsWith("--")) {
        throw new Error(`${flag} requires a value.`)
      }
      return argv[index]
    }

    switch (flag) {
      case "--help":
      case "-h":
        options.help = true
        break
      case "--dry-run":
        options.apply = false
        options.dryRun = true
        break
      case "--apply":
        options.apply = true
        options.dryRun = false
        break
      case "--confirm-delete":
        options.confirmDelete = true
        break
      case "--all-assets":
        options.allAssets = true
        break
      case "--asset-tag-prefix":
        options.assetTagPrefixes.push(readValue().trim())
        break
      case "--asset-id":
        options.assetIds.push(...splitCsv(readValue()))
        break
      case "--created-by":
        options.createdBy = readValue().trim()
        break
      case "--created-after":
        options.createdAfter = parseDateBoundary(readValue(), "start")
        break
      case "--created-before":
        options.createdBefore = parseDateBoundary(readValue(), "end")
        break
      case "--keep-audit-rounds":
        options.resetAuditRuns = false
        break
      case "--include-logs":
        options.includeLogs = true
        break
      default:
        throw new Error(`Unknown option: ${flag}`)
    }
  }

  options.assetTagPrefixes = uniqueNonEmpty(options.assetTagPrefixes)
  options.assetIds = uniqueNonEmpty(options.assetIds)
  return options
}

export function getCleanupSafetyErrors(options, env = process.env) {
  const errors = []
  const hasScope =
    options.allAssets ||
    options.assetTagPrefixes.length > 0 ||
    options.assetIds.length > 0 ||
    Boolean(options.createdBy) ||
    Boolean(options.createdAfter) ||
    Boolean(options.createdBefore)

  if (!hasScope) {
    errors.push(
      "Choose at least one cleanup scope such as --asset-tag-prefix, --asset-id, --created-by, --created-after, or --all-assets."
    )
  }

  if (options.apply) {
    if (env.ALLOW_TEST_DATA_CLEANUP !== "true") {
      errors.push("Set ALLOW_TEST_DATA_CLEANUP=true before running --apply.")
    }
    if (!options.confirmDelete) {
      errors.push("Pass --confirm-delete with --apply to acknowledge hard deletion.")
    }
    if (env.NODE_ENV === "production" && env.ALLOW_PRODUCTION_TEST_DATA_CLEANUP !== "true") {
      errors.push("Production cleanup is blocked unless ALLOW_PRODUCTION_TEST_DATA_CLEANUP=true is set.")
    }
  }

  return errors
}

export function buildAssetWhereFilter(options) {
  if (options.allAssets) return {}

  const and = []

  if (options.assetIds.length > 0) {
    and.push({ id: { in: options.assetIds } })
  }
  if (options.assetTagPrefixes.length > 0) {
    and.push({
      OR: options.assetTagPrefixes.map((prefix) => ({ assetTag: { startsWith: prefix } })),
    })
  }
  if (options.createdBy) {
    and.push({ createdBy: options.createdBy })
  }
  if (options.createdAfter) {
    and.push({ createdAt: { gte: options.createdAfter } })
  }
  if (options.createdBefore) {
    and.push({ createdAt: { lte: options.createdBefore } })
  }

  return and.length === 0 ? {} : { AND: and }
}

export async function collectCleanupSummary(prisma, options) {
  const assetWhere = buildAssetWhereFilter(options)
  const assets = await prisma.asset.findMany({
    where: assetWhere,
    select: { id: true, assetTag: true, name: true, createdAt: true, createdBy: true },
    orderBy: { createdAt: "asc" },
  })
  const assetIds = assets.map((asset) => asset.id)

  if (assetIds.length === 0) {
    return emptySummary(assetWhere)
  }

  const [
    checkouts,
    maintenanceTickets,
    disposalRequests,
    assetMovements,
    customFieldValues,
    purchaseDocumentAssets,
    assetComponents,
    auditItems,
    directAuditFindings,
    directAuditScanHistory,
    licenseAssignmentsToClear,
  ] = await Promise.all([
    prisma.assetCheckout.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, documentNo: true } }),
    prisma.maintenanceTicket.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, repairNo: true } }),
    prisma.disposalRequest.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, disposalNo: true } }),
    prisma.assetMovement.findMany({ where: { assetId: { in: assetIds } }, select: { id: true } }),
    prisma.customFieldValue.findMany({ where: { assetId: { in: assetIds } }, select: { id: true } }),
    prisma.purchaseDocumentAsset.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, purchaseDocumentId: true } }),
    prisma.assetComponent.findMany({
      where: { OR: [{ parentAssetId: { in: assetIds } }, { componentAssetId: { in: assetIds } }] },
      select: { id: true },
    }),
    prisma.auditItem.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, auditRoundId: true } }),
    prisma.auditFinding.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, auditRoundId: true, auditItemId: true } }),
    prisma.auditScanHistory.findMany({ where: { assetId: { in: assetIds } }, select: { id: true, auditRoundId: true, auditItemId: true } }),
    prisma.asset.findMany({
      where: {
        OR: [{ id: { in: assetIds }, licenseAssignedAssetId: { not: null } }, { licenseAssignedAssetId: { in: assetIds } }],
      },
      select: { id: true, assetTag: true, licenseAssignedAssetId: true },
    }),
  ])

  const checkoutIds = checkouts.map((checkout) => checkout.id)
  const checkins = await prisma.assetCheckin.findMany({
    where: {
      OR: compactWhere([{ assetId: { in: assetIds } }, checkoutIds.length ? { checkoutId: { in: checkoutIds } } : null]),
    },
    select: { id: true, documentNo: true, checkoutId: true },
  })

  const auditItemIds = auditItems.map((item) => item.id)
  const auditFindingsByItem = auditItemIds.length
    ? await prisma.auditFinding.findMany({
        where: { auditItemId: { in: auditItemIds } },
        select: { id: true, auditRoundId: true, auditItemId: true },
      })
    : []
  const auditScanHistoryByItem = auditItemIds.length
    ? await prisma.auditScanHistory.findMany({
        where: { auditItemId: { in: auditItemIds } },
        select: { id: true, auditRoundId: true, auditItemId: true },
      })
    : []

  const auditFindings = uniqueById([...directAuditFindings, ...auditFindingsByItem])
  const auditScanHistory = uniqueById([...directAuditScanHistory, ...auditScanHistoryByItem])
  const auditRoundsToDelete = options.resetAuditRuns
    ? await findFullySelectedAuditRounds(prisma, auditItems)
    : []

  const attachmentReferenceConditions = [
    referenceCondition("asset", assetIds),
    referenceCondition("checkout", checkoutIds),
    referenceCondition("checkin", checkins.map((checkin) => checkin.id)),
    referenceCondition("maintenance", maintenanceTickets.map((ticket) => ticket.id)),
    referenceCondition("disposal", disposalRequests.map((request) => request.id)),
    referenceCondition("audit_finding", auditFindings.map((finding) => finding.id)),
  ].filter(Boolean)

  const attachments = await prisma.attachment.findMany({
    where: {
      OR: compactWhere([{ assetId: { in: assetIds } }, ...attachmentReferenceConditions]),
    },
    select: { id: true },
  })

  const recordIdsForLogs = [
    ...assetIds,
    ...checkoutIds,
    ...checkins.map((checkin) => checkin.id),
    ...maintenanceTickets.map((ticket) => ticket.id),
    ...disposalRequests.map((request) => request.id),
    ...auditItems.map((item) => item.id),
    ...auditFindings.map((finding) => finding.id),
    ...auditScanHistory.map((scan) => scan.id),
    ...auditRoundsToDelete.map((round) => round.id),
  ]
  const systemLogs = options.includeLogs
    ? await prisma.systemLog.findMany({ where: { recordId: { in: uniqueNonEmpty(recordIdsForLogs) } }, select: { id: true } })
    : []

  return {
    assetWhere,
    assets,
    assetIds,
    related: {
      attachments,
      systemLogs,
      auditScanHistory,
      auditFindings,
      auditItems,
      auditRoundsToDelete,
      checkins,
      checkouts,
      maintenanceTickets,
      disposalRequests,
      assetMovements,
      assetComponents,
      purchaseDocumentAssets,
      customFieldValues,
      licenseAssignmentsToClear,
    },
  }
}

export async function applyCleanup(prisma, summary) {
  const assetIds = summary.assetIds
  if (assetIds.length === 0) return emptyAppliedCounts()

  return prisma.$transaction(
    async (tx) => {
      const related = summary.related
      const auditRoundIds = related.auditRoundsToDelete.map((round) => round.id)
      const counts = {}

      counts.attachments = await deleteManyByIds(tx, "attachment", related.attachments)
      counts.systemLogs = await deleteManyByIds(tx, "systemLog", related.systemLogs)
      counts.auditScanHistory = await deleteManyByWhere(tx, "auditScanHistory", orWhere([
        idsWhere(related.auditScanHistory),
        auditRoundIds.length ? { auditRoundId: { in: auditRoundIds } } : null,
      ]))
      counts.auditFindings = await deleteManyByWhere(tx, "auditFinding", orWhere([
        idsWhere(related.auditFindings),
        auditRoundIds.length ? { auditRoundId: { in: auditRoundIds } } : null,
      ]))
      counts.auditItems = await deleteManyByWhere(tx, "auditItem", orWhere([
        idsWhere(related.auditItems),
        auditRoundIds.length ? { auditRoundId: { in: auditRoundIds } } : null,
      ]))
      counts.auditRounds = await deleteManyByIds(tx, "auditRound", related.auditRoundsToDelete)
      counts.checkins = await deleteManyByIds(tx, "assetCheckin", related.checkins)
      counts.checkouts = await deleteManyByIds(tx, "assetCheckout", related.checkouts)
      counts.maintenanceTickets = await deleteManyByIds(tx, "maintenanceTicket", related.maintenanceTickets)
      counts.disposalRequests = await deleteManyByIds(tx, "disposalRequest", related.disposalRequests)
      counts.assetMovements = await deleteManyByIds(tx, "assetMovement", related.assetMovements)
      counts.assetComponents = await deleteManyByIds(tx, "assetComponent", related.assetComponents)
      counts.purchaseDocumentAssets = await deleteManyByIds(tx, "purchaseDocumentAsset", related.purchaseDocumentAssets)
      counts.customFieldValues = await deleteManyByIds(tx, "customFieldValue", related.customFieldValues)
      counts.licenseAssignmentsCleared = await clearLicenseAssignments(tx, assetIds)
      counts.assets = await deleteManyByIds(tx, "asset", summary.assets)

      return counts
    },
    { timeout: 120000 }
  )
}

export function formatCleanupSummary(summary, options) {
  const related = summary.related
  const lines = [
    `Mode: ${options.apply ? "APPLY" : "DRY RUN"}`,
    `Assets matched: ${summary.assets.length}`,
  ]

  if (summary.assets.length > 0) {
    lines.push(`Asset samples: ${summary.assets.slice(0, 10).map((asset) => asset.assetTag).join(", ")}`)
    if (summary.assets.length > 10) lines.push(`Asset samples truncated: ${summary.assets.length - 10} more`)
  }

  lines.push("Related rows:")
  for (const [label, rows] of [
    ["attachments", related.attachments],
    ["audit scan history", related.auditScanHistory],
    ["audit findings", related.auditFindings],
    ["audit items", related.auditItems],
    ["audit rounds reset candidates", related.auditRoundsToDelete],
    ["checkins", related.checkins],
    ["checkouts", related.checkouts],
    ["maintenance tickets", related.maintenanceTickets],
    ["disposal requests", related.disposalRequests],
    ["asset movements", related.assetMovements],
    ["asset components", related.assetComponents],
    ["purchase document links", related.purchaseDocumentAssets],
    ["custom field values", related.customFieldValues],
    ["license assignments to clear", related.licenseAssignmentsToClear],
    ["system logs", related.systemLogs],
  ]) {
    lines.push(`- ${label}: ${rows.length}`)
  }

  lines.push("Run numbers are recalculated from remaining rows after hard deletion.")
  if (!options.apply) {
    lines.push("Dry run only. Re-run with --apply --confirm-delete and ALLOW_TEST_DATA_CLEANUP=true to delete.")
  }
  return lines.join("\n")
}

function emptySummary(assetWhere) {
  return {
    assetWhere,
    assets: [],
    assetIds: [],
    related: {
      attachments: [],
      systemLogs: [],
      auditScanHistory: [],
      auditFindings: [],
      auditItems: [],
      auditRoundsToDelete: [],
      checkins: [],
      checkouts: [],
      maintenanceTickets: [],
      disposalRequests: [],
      assetMovements: [],
      assetComponents: [],
      purchaseDocumentAssets: [],
      customFieldValues: [],
      licenseAssignmentsToClear: [],
    },
  }
}

function emptyAppliedCounts() {
  return {
    attachments: 0,
    systemLogs: 0,
    auditScanHistory: 0,
    auditFindings: 0,
    auditItems: 0,
    auditRounds: 0,
    checkins: 0,
    checkouts: 0,
    maintenanceTickets: 0,
    disposalRequests: 0,
    assetMovements: 0,
    assetComponents: 0,
    purchaseDocumentAssets: 0,
    customFieldValues: 0,
    licenseAssignmentsCleared: 0,
    assets: 0,
  }
}

async function findFullySelectedAuditRounds(prisma, auditItems) {
  if (auditItems.length === 0) return []

  const selectedCountsByRound = new Map()
  for (const item of auditItems) {
    selectedCountsByRound.set(item.auditRoundId, (selectedCountsByRound.get(item.auditRoundId) ?? 0) + 1)
  }
  const roundIds = [...selectedCountsByRound.keys()]
  const rounds = await prisma.auditRound.findMany({
    where: { id: { in: roundIds } },
    select: { id: true, auditNo: true, _count: { select: { items: true } } },
  })

  return rounds.filter((round) => selectedCountsByRound.get(round.id) === round._count.items)
}

async function deleteManyByIds(tx, delegateName, records) {
  const ids = uniqueNonEmpty(records.map((record) => record.id))
  let count = 0
  for (const chunk of chunks(ids, CHUNK_SIZE)) {
    const result = await tx[delegateName].deleteMany({ where: { id: { in: chunk } } })
    count += result.count
  }
  return count
}

async function deleteManyByWhere(tx, delegateName, where) {
  if (!where) return 0
  const result = await tx[delegateName].deleteMany({ where })
  return result.count
}

async function clearLicenseAssignments(tx, assetIds) {
  const result = await tx.asset.updateMany({
    where: {
      OR: [{ id: { in: assetIds } }, { licenseAssignedAssetId: { in: assetIds } }],
    },
    data: { licenseAssignedAssetId: null },
  })
  return result.count
}

function idsWhere(records) {
  const ids = uniqueNonEmpty(records.map((record) => record.id))
  return ids.length ? { id: { in: ids } } : null
}

function orWhere(conditions) {
  const compact = compactWhere(conditions)
  if (compact.length === 0) return null
  return compact.length === 1 ? compact[0] : { OR: compact }
}

function referenceCondition(module, ids) {
  const uniqueIds = uniqueNonEmpty(ids)
  return uniqueIds.length ? { module, referenceId: { in: uniqueIds } } : null
}

function compactWhere(conditions) {
  return conditions.filter(Boolean)
}

function uniqueById(records) {
  const seen = new Set()
  const unique = []
  for (const record of records) {
    if (!record?.id || seen.has(record.id)) continue
    seen.add(record.id)
    unique.push(record)
  }
  return unique
}

function splitCsv(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
}

function uniqueNonEmpty(values) {
  return [...new Set(values.map((value) => String(value ?? "").trim()).filter(Boolean))]
}

function parseDateBoundary(value, boundary) {
  const trimmed = value.trim()
  const date = new Date(DATE_ONLY_PATTERN.test(trimmed) ? `${trimmed}T00:00:00.000Z` : trimmed)
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid date: ${value}`)
  if (DATE_ONLY_PATTERN.test(trimmed) && boundary === "end") {
    return new Date(`${trimmed}T23:59:59.999Z`)
  }
  return date
}

function chunks(values, size) {
  const result = []
  for (let index = 0; index < values.length; index += size) {
    result.push(values.slice(index, index + size))
  }
  return result
}

function env(name) {
  return process.env[name]?.trim().replace(/^"|"$/g, "")
}

function databaseFromUrl() {
  const database = env("DATABASE_URL")?.match(/(?:^|;)database=([^;]+)/i)?.[1]
  return database ? decodeURIComponent(database) : undefined
}

async function createPrismaClient() {
  const [{ PrismaClient }, { PrismaMssql }] = await Promise.all([
    import("@prisma/client"),
    import("@prisma/adapter-mssql"),
  ])
  const server = env("DB_SERVER")
  const instanceName = env("DB_INSTANCE")
  const tlsServerName = env("DB_TLS_SERVER_NAME")
  const port = instanceName ? undefined : Number(env("DB_PORT") ?? "1433")
  const user = env("DB_USER")
  const password = env("DB_PASSWORD")
  const database = databaseFromUrl()

  if (!server || !user || !password || !database) {
    throw new Error("Missing SQL Server connection settings in environment variables")
  }

  const adapter = new PrismaMssql({
    server,
    ...(port ? { port } : {}),
    database,
    user,
    password,
    options: {
      ...(instanceName ? { instanceName } : {}),
      ...(tlsServerName ? { serverName: tlsServerName } : {}),
      encrypt: true,
      trustServerCertificate: true,
    },
  })

  return new PrismaClient({ adapter })
}

function helpText() {
  return `Usage:
  npm run cleanup:test-data -- --dry-run --asset-tag-prefix TEST-
  npm run cleanup:test-data -- --apply --confirm-delete --asset-tag-prefix TEST-
  npm run cleanup:test-data -- --dry-run --all-assets

Options:
  --dry-run                     Preview rows only. This is the default.
  --apply                       Hard-delete matched assets and dependent rows.
  --confirm-delete              Required with --apply.
  --all-assets                  Match every asset row.
  --asset-tag-prefix <prefix>   Match asset tags by prefix. Repeatable.
  --asset-id <id[,id]>          Match explicit asset ids. Repeatable.
  --created-by <user>           Match assets created by this user.
  --created-after <date>        Match assets created on/after date.
  --created-before <date>       Match assets created on/before date.
  --keep-audit-rounds           Keep audit_rounds even when all their items are deleted.
  --include-logs                Also delete system_logs whose recordId matches cleanup rows.

Apply safety:
  ALLOW_TEST_DATA_CLEANUP=true is required for --apply.
  NODE_ENV=production also requires ALLOW_PRODUCTION_TEST_DATA_CLEANUP=true.`
}

async function main() {
  const options = parseCleanupArgs()
  if (options.help) {
    console.log(helpText())
    return
  }

  const errors = getCleanupSafetyErrors(options)
  if (errors.length > 0) {
    console.error(errors.join("\n"))
    console.error("")
    console.error(helpText())
    process.exit(1)
  }

  const prisma = await createPrismaClient()
  try {
    const summary = await collectCleanupSummary(prisma, options)
    console.log(formatCleanupSummary(summary, options))

    if (!options.apply) return

    const counts = await applyCleanup(prisma, summary)
    console.log("Applied cleanup:")
    console.log(JSON.stringify(counts, null, 2))
  } finally {
    await prisma.$disconnect()
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error?.message ?? error)
    process.exit(1)
  })
}
