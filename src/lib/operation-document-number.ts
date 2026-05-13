import type { Prisma } from "@prisma/client"
import {
  checkinDocumentTemplateKey,
  checkoutDocumentTemplateKey,
  defaultCheckinDocumentTemplate,
  defaultCheckoutDocumentTemplate,
  operationDocumentRunningDigitsKey,
} from "@/lib/system-setting-defaults"

export const operationDocumentTemplateTokens = [
  "yyyyMM",
  "yyyyMMdd",
  "yyyy",
  "yy",
  "MM",
  "dd",
  "running",
] as const

type OperationDocumentKind = "checkout" | "checkin"

type OperationDocumentSettings = {
  template: string
  runningDigits: number
}

export async function generateCheckoutDocumentNo(tx: Prisma.TransactionClient, date: Date) {
  return generateOperationDocumentNo(tx, "checkout", date)
}

export async function generateCheckinDocumentNo(tx: Prisma.TransactionClient, date: Date) {
  return generateOperationDocumentNo(tx, "checkin", date)
}

export function renderOperationDocumentTemplate(template: string, date: Date, running: number, runningDigits: number) {
  const runningText = String(running).padStart(runningDigits, "0")
  return renderDateTokens(template, date).replaceAll("{running}", runningText)
}

export function validateOperationDocumentTemplate(template: string) {
  const tokens = Array.from(template.matchAll(/\{([A-Za-z0-9]+)\}/g)).map((match) => match[1])
  const supported = new Set<string>(operationDocumentTemplateTokens)
  return template.includes("{running}") && tokens.every((token) => supported.has(token))
}

async function generateOperationDocumentNo(tx: Prisma.TransactionClient, kind: OperationDocumentKind, date: Date) {
  const settings = await getOperationDocumentSettings(tx, kind)
  const renderedPrefix = renderDateTokens(settings.template, date).split("{running}")[0] ?? ""

  const count =
    kind === "checkout"
      ? await tx.assetCheckout.count({ where: { documentNo: { startsWith: renderedPrefix } } })
      : await tx.assetCheckin.count({ where: { documentNo: { startsWith: renderedPrefix } } })

  for (let index = count + 1; index < count + 1000; index += 1) {
    const documentNo = renderOperationDocumentTemplate(settings.template, date, index, settings.runningDigits)
    const existing =
      kind === "checkout"
        ? await tx.assetCheckout.findFirst({ where: { documentNo }, select: { id: true } })
        : await tx.assetCheckin.findFirst({ where: { documentNo }, select: { id: true } })
    if (!existing) return documentNo
  }

  throw new Error("Cannot generate a unique operation document number")
}

async function getOperationDocumentSettings(
  tx: Prisma.TransactionClient,
  kind: OperationDocumentKind
): Promise<OperationDocumentSettings> {
  const templateKey = kind === "checkout" ? checkoutDocumentTemplateKey : checkinDocumentTemplateKey
  const defaultTemplate = kind === "checkout" ? defaultCheckoutDocumentTemplate : defaultCheckinDocumentTemplate
  const rows = await tx.systemSetting.findMany({
    where: { key: { in: [templateKey, operationDocumentRunningDigitsKey] } },
    select: { key: true, value: true },
  })
  const byKey = new Map(rows.map((row) => [row.key, row.value]))
  const template = byKey.get(templateKey) || defaultTemplate
  const parsedDigits = Number(byKey.get(operationDocumentRunningDigitsKey) || "4")

  return {
    template: validateOperationDocumentTemplate(template) ? template : defaultTemplate,
    runningDigits: Number.isFinite(parsedDigits) ? Math.min(Math.max(parsedDigits, 1), 12) : 4,
  }
}

function renderDateTokens(template: string, date: Date) {
  const year = String(date.getFullYear())
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return template
    .replaceAll("{yyyyMMdd}", `${year}${month}${day}`)
    .replaceAll("{yyyyMM}", `${year}${month}`)
    .replaceAll("{yyyy}", year)
    .replaceAll("{yy}", year.slice(-2))
    .replaceAll("{MM}", month)
    .replaceAll("{dd}", day)
}
