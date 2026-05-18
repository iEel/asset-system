import { existsSync } from "fs"
import { join } from "path"
import { Document, Font, Page, StyleSheet, Text, View, renderToBuffer } from "@react-pdf/renderer"
import { formatDateTime } from "@/lib/utils"

const windowsRoot = process.env.SystemRoot || process.env.WINDIR
const tahomaFont = windowsRoot ? join(windowsRoot, "Fonts", "tahoma.ttf") : ""
const tahomaBoldFont = windowsRoot ? join(windowsRoot, "Fonts", "tahomabd.ttf") : ""
const fontFamily = existsSync(tahomaFont) ? "Tahoma" : "Helvetica"

if (fontFamily === "Tahoma") {
  Font.register({
    family: "Tahoma",
    fonts: [
      { src: tahomaFont, fontWeight: "normal" },
      { src: tahomaBoldFont, fontWeight: "bold" },
    ],
  })
}

const styles = StyleSheet.create({
  page: {
    padding: 22,
    fontFamily,
    fontSize: 8,
    color: "#0f172a",
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  subtitle: {
    color: "#475569",
    marginBottom: 10,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  summaryCard: {
    flexGrow: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 4,
    padding: 8,
  },
  summaryLabel: {
    color: "#64748b",
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: "bold",
  },
  table: {
    border: "1px solid #cbd5e1",
  },
  row: {
    flexDirection: "row",
    minHeight: 24,
    borderBottom: "1px solid #e2e8f0",
  },
  headerRow: {
    backgroundColor: "#f1f5f9",
  },
  cell: {
    padding: 4,
    borderRight: "1px solid #e2e8f0",
  },
  headerCell: {
    fontWeight: "bold",
  },
  footer: {
    position: "absolute",
    left: 22,
    right: 22,
    bottom: 12,
    color: "#64748b",
    fontSize: 7,
    flexDirection: "row",
    justifyContent: "space-between",
  },
})

type PdfColumn<T> = {
  key: keyof T
  label: string
  width: number
}

type AuditResultPdfRow = {
  assetTag: string
  assetName: string
  expectedLocation: string
  actualLocation: string
  auditStatus: string
  auditResult: string
  reconcileStatus: string
  scanCount: string
  lastScanAt: string
}

type AuditFindingPdfRow = {
  reportedAt: string
  auditNo: string
  assetTag: string
  findingType: string
  expectedValue: string
  actualValue: string
  reviewStatus: string
  actionStatus: string
  actionOwner: string
  actionTaken: string
}

type SummaryItem = {
  label: string
  value: string | number
}

const auditResultColumns: Array<PdfColumn<AuditResultPdfRow>> = [
  { key: "assetTag", label: "Asset Tag", width: 58 },
  { key: "assetName", label: "Asset Name", width: 94 },
  { key: "expectedLocation", label: "Expected Location", width: 104 },
  { key: "actualLocation", label: "Actual Location", width: 104 },
  { key: "auditStatus", label: "Audit Status", width: 58 },
  { key: "auditResult", label: "Result", width: 62 },
  { key: "reconcileStatus", label: "Reconcile", width: 62 },
  { key: "scanCount", label: "Scan", width: 34 },
  { key: "lastScanAt", label: "Last Scan", width: 76 },
]

const auditFindingColumns: Array<PdfColumn<AuditFindingPdfRow>> = [
  { key: "reportedAt", label: "Reported", width: 70 },
  { key: "auditNo", label: "Audit No.", width: 58 },
  { key: "assetTag", label: "Asset Tag", width: 66 },
  { key: "findingType", label: "Type", width: 72 },
  { key: "expectedValue", label: "Expected", width: 104 },
  { key: "actualValue", label: "Actual", width: 104 },
  { key: "reviewStatus", label: "Review", width: 58 },
  { key: "actionStatus", label: "Plan", width: 56 },
  { key: "actionOwner", label: "Owner", width: 72 },
  { key: "actionTaken", label: "Action", width: 58 },
]

export type AuditResultPdfData = {
  title: string
  subtitle: string
  summary: SummaryItem[]
  rows: AuditResultPdfRow[]
}

export type AuditFindingPdfData = {
  title: string
  subtitle: string
  summary: SummaryItem[]
  rows: AuditFindingPdfRow[]
}

export async function renderAuditResultPdf(data: AuditResultPdfData) {
  return renderToBuffer(
    <AuditPdfDocument title={data.title} subtitle={data.subtitle} summary={data.summary} columns={auditResultColumns} rows={data.rows} />
  )
}

export async function renderAuditFindingPdf(data: AuditFindingPdfData) {
  return renderToBuffer(
    <AuditPdfDocument title={data.title} subtitle={data.subtitle} summary={data.summary} columns={auditFindingColumns} rows={data.rows} />
  )
}

export function pdfResponse(buffer: Buffer, filename: string) {
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  })
}

function AuditPdfDocument<T extends Record<string, string>>({
  title,
  subtitle,
  summary,
  columns,
  rows,
}: {
  title: string
  subtitle: string
  summary: SummaryItem[]
  columns: Array<PdfColumn<T>>
  rows: T[]
}) {
  return (
    <Document title={title} author="Asset Management System">
      <Page size="A4" orientation="landscape" style={styles.page}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
        <View style={styles.summaryGrid}>
          {summary.map((item) => (
            <View key={item.label} style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>{item.label}</Text>
              <Text style={styles.summaryValue}>{String(item.value)}</Text>
            </View>
          ))}
        </View>
        <View style={styles.table}>
          <View style={[styles.row, styles.headerRow]} fixed>
            {columns.map((column) => (
              <Text key={String(column.key)} style={[styles.cell, styles.headerCell, { width: column.width }]}>
                {column.label}
              </Text>
            ))}
          </View>
          {rows.map((row, index) => (
            <View key={`${row.assetTag ?? row.auditNo ?? "row"}-${index}`} style={styles.row} wrap={false}>
              {columns.map((column) => (
                <Text key={String(column.key)} style={[styles.cell, { width: column.width }]}>
                  {row[column.key] || "-"}
                </Text>
              ))}
            </View>
          ))}
        </View>
        <View style={styles.footer} fixed>
          <Text>Generated {formatDateTime(new Date())}</Text>
          <Text render={({ pageNumber, totalPages }) => `Page ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
