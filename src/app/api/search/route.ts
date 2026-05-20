import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { hasPermission, requireAuth } from "@/lib/auth-utils"
import { errorResponse } from "@/lib/api-response"
import {
  normalizeGlobalSearchScope,
  sortGlobalSearchResults,
  type GlobalSearchMetadata,
  type GlobalSearchResultType,
} from "@/lib/global-search"

type SearchResult = {
  id: string
  type: GlobalSearchResultType
  typeLabel: string
  title: string
  subtitle: string
  href: string
  badge: {
    label: string
    colorCode: string | null
  }
  metadata: GlobalSearchMetadata[]
  keywords?: string[]
  assetTag?: string
  serialNumber?: string | null
  status?: {
    label: string
    colorCode: string | null
  }
  meta?: {
    custodian: string | null
    location: string
    category: string
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await requireAuth()
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim()
    const locale = request.nextUrl.searchParams.get("locale") === "en" ? "en" : "th"
    const scope = normalizeGlobalSearchScope(request.nextUrl.searchParams.get("scope"))
    if (query.length < 2) return NextResponse.json({ results: [] })

    const results = await Promise.all([
      hasPermission(user, "asset", "view") ? searchAssets(query, locale) : [],
      scope === "all" && hasPermission(user, "employee", "view") ? searchEmployees(query, locale) : [],
      scope === "all" && hasPermission(user, "supplier", "view") ? searchSuppliers(query, locale) : [],
      scope === "all" && hasPermission(user, "company", "view") ? searchCompanies(query, locale) : [],
      scope === "all" && hasPermission(user, "branch", "view") ? searchBranches(query, locale) : [],
      scope === "all" && hasPermission(user, "location", "view") ? searchLocations(query, locale) : [],
      scope === "all" && hasPermission(user, "maintenance", "view") ? searchMaintenanceTickets(query, locale) : [],
      scope === "all" && hasPermission(user, "audit", "view") ? searchAuditRounds(query, locale) : [],
      scope === "all" && hasPermission(user, "disposal", "view") ? searchDisposalRequests(query, locale) : [],
    ])

    return NextResponse.json({
      results: sortGlobalSearchResults(results.flat(), query, scope === "asset" ? 8 : 14),
      scope,
    })
  } catch (error) {
    return errorResponse(error)
  }
}

async function searchAssets(query: string, locale: string): Promise<SearchResult[]> {
  const assets = await prisma.asset.findMany({
    where: {
      isActive: true,
      OR: [
        { assetTag: { contains: query } },
        { name: { contains: query } },
        { serialNumber: { contains: query } },
        { fixedAssetCode: { contains: query } },
        { category: { code: { contains: query } } },
        { category: { name: { contains: query } } },
        { brand: { name: { contains: query } } },
        { model: { name: { contains: query } } },
        { company: { code: { contains: query } } },
        { company: { nameTh: { contains: query } } },
        { company: { nameEn: { contains: query } } },
        { branch: { code: { contains: query } } },
        { branch: { name: { contains: query } } },
        { custodian: { code: { contains: query } } },
        { custodian: { fullNameTh: { contains: query } } },
        { custodian: { fullNameEn: { contains: query } } },
        { custodian: { email: { contains: query } } },
        { currentLocation: { code: { contains: query } } },
        { currentLocation: { name: { contains: query } } },
      ],
    },
    select: {
      id: true,
      assetTag: true,
      name: true,
      serialNumber: true,
      fixedAssetCode: true,
      category: { select: { code: true, name: true } },
      custodian: { select: { code: true, fullNameTh: true } },
      currentLocation: { select: { code: true, name: true } },
      status: { select: { name: true, nameTh: true, colorCode: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { assetTag: "asc" }],
    take: 10,
  })

  return assets.map((asset) => {
    const statusLabel = locale === "th" ? asset.status.nameTh : asset.status.name
    const location = `${asset.currentLocation.code} - ${asset.currentLocation.name}`
    const category = `${asset.category.code} - ${asset.category.name}`
    const custodian = asset.custodian ? `${asset.custodian.code} - ${asset.custodian.fullNameTh}` : null

    return {
      id: asset.id,
      type: "asset",
      typeLabel: label("asset", locale),
      title: asset.assetTag,
      subtitle: asset.name,
      href: `/${locale}/assets/${asset.id}`,
      badge: { label: statusLabel, colorCode: asset.status.colorCode },
      metadata: compactMetadata([
        ["Serial", asset.serialNumber],
        [locale === "th" ? "สถานที่" : "Location", location],
        [locale === "th" ? "ผู้ถือครอง" : "Custodian", custodian],
      ]),
      keywords: [asset.fixedAssetCode ?? "", category],
      assetTag: asset.assetTag,
      serialNumber: asset.serialNumber,
      status: {
        label: statusLabel,
        colorCode: asset.status.colorCode,
      },
      meta: { custodian, location, category },
    }
  })
}

async function searchEmployees(query: string, locale: string): Promise<SearchResult[]> {
  const employees = await prisma.employee.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { contains: query } },
        { fullNameTh: { contains: query } },
        { fullNameEn: { contains: query } },
        { email: { contains: query } },
        { position: { contains: query } },
        { department: { code: { contains: query } } },
        { department: { name: { contains: query } } },
      ],
    },
    select: {
      id: true,
      code: true,
      fullNameTh: true,
      fullNameEn: true,
      email: true,
      position: true,
      employmentStatus: true,
      department: { select: { code: true, name: true } },
      branch: { select: { code: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    take: 5,
  })

  return employees.map((employee) => ({
    id: employee.id,
    type: "employee",
    typeLabel: label("employee", locale),
    title: `${employee.code} - ${locale === "en" ? employee.fullNameEn ?? employee.fullNameTh : employee.fullNameTh}`,
    subtitle: employee.position ?? `${employee.department.code} - ${employee.department.name}`,
    href: `/${locale}/master-data/employees/${employee.id}`,
    badge: { label: employee.employmentStatus, colorCode: null },
    metadata: compactMetadata([
      [locale === "th" ? "แผนก" : "Department", `${employee.department.code} - ${employee.department.name}`],
      [locale === "th" ? "สาขา" : "Branch", `${employee.branch.code} - ${employee.branch.name}`],
      ["Email", employee.email],
    ]),
    keywords: [employee.fullNameEn ?? ""],
  }))
}

async function searchSuppliers(query: string, locale: string): Promise<SearchResult[]> {
  const suppliers = await prisma.supplier.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { contains: query } },
        { name: { contains: query } },
        { contactPerson: { contains: query } },
        { phone: { contains: query } },
        { email: { contains: query } },
      ],
    },
    select: { id: true, code: true, name: true, contactPerson: true, phone: true, email: true },
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    take: 4,
  })

  return suppliers.map((supplier) => ({
    id: supplier.id,
    type: "supplier",
    typeLabel: label("supplier", locale),
    title: `${supplier.code} - ${supplier.name}`,
    subtitle: supplier.contactPerson ?? supplier.email ?? supplier.phone ?? label("supplier", locale),
    href: `/${locale}/master-data/suppliers/${supplier.id}`,
    badge: { label: label("supplier", locale), colorCode: null },
    metadata: compactMetadata([
      [locale === "th" ? "ผู้ติดต่อ" : "Contact", supplier.contactPerson],
      ["Phone", supplier.phone],
      ["Email", supplier.email],
    ]),
  }))
}

async function searchCompanies(query: string, locale: string): Promise<SearchResult[]> {
  const companies = await prisma.company.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { contains: query } },
        { nameTh: { contains: query } },
        { nameEn: { contains: query } },
        { taxId: { contains: query } },
      ],
    },
    select: { id: true, code: true, nameTh: true, nameEn: true, taxId: true },
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    take: 3,
  })

  return companies.map((company) => ({
    id: company.id,
    type: "company",
    typeLabel: label("company", locale),
    title: `${company.code} - ${locale === "en" ? company.nameEn ?? company.nameTh : company.nameTh}`,
    subtitle: company.nameEn ?? company.nameTh,
    href: `/${locale}/master-data/companies/${company.id}/edit`,
    badge: { label: label("company", locale), colorCode: null },
    metadata: compactMetadata([["Tax ID", company.taxId]]),
  }))
}

async function searchBranches(query: string, locale: string): Promise<SearchResult[]> {
  const branches = await prisma.branch.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { contains: query } },
        { name: { contains: query } },
        { contactPerson: { contains: query } },
        { company: { code: { contains: query } } },
        { company: { nameTh: { contains: query } } },
      ],
    },
    select: {
      id: true,
      code: true,
      name: true,
      contactPerson: true,
      company: { select: { code: true, nameTh: true, nameEn: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    take: 3,
  })

  return branches.map((branch) => ({
    id: branch.id,
    type: "branch",
    typeLabel: label("branch", locale),
    title: `${branch.code} - ${branch.name}`,
    subtitle: `${branch.company.code} - ${locale === "en" ? branch.company.nameEn ?? branch.company.nameTh : branch.company.nameTh}`,
    href: `/${locale}/master-data/branches/${branch.id}/edit`,
    badge: { label: label("branch", locale), colorCode: null },
    metadata: compactMetadata([[locale === "th" ? "ผู้ติดต่อ" : "Contact", branch.contactPerson]]),
  }))
}

async function searchLocations(query: string, locale: string): Promise<SearchResult[]> {
  const locations = await prisma.location.findMany({
    where: {
      isActive: true,
      OR: [
        { code: { contains: query } },
        { name: { contains: query } },
        { locationType: { contains: query } },
        { branch: { code: { contains: query } } },
        { branch: { name: { contains: query } } },
      ],
    },
    select: { id: true, code: true, name: true, locationType: true, branch: { select: { code: true, name: true } } },
    orderBy: [{ updatedAt: "desc" }, { code: "asc" }],
    take: 4,
  })

  return locations.map((location) => ({
    id: location.id,
    type: "location",
    typeLabel: label("location", locale),
    title: `${location.code} - ${location.name}`,
    subtitle: `${location.branch.code} - ${location.branch.name}`,
    href: `/${locale}/master-data/locations/${location.id}/edit`,
    badge: { label: location.locationType, colorCode: null },
    metadata: [],
  }))
}

async function searchMaintenanceTickets(query: string, locale: string): Promise<SearchResult[]> {
  const tickets = await prisma.maintenanceTicket.findMany({
    where: {
      isActive: true,
      OR: [
        { repairNo: { contains: query } },
        { problem: { contains: query } },
        { quotationNo: { contains: query } },
        { invoiceNo: { contains: query } },
        { asset: { assetTag: { contains: query } } },
        { asset: { name: { contains: query } } },
        { vendor: { name: { contains: query } } },
      ],
    },
    select: {
      id: true,
      repairNo: true,
      problem: true,
      repairStatus: true,
      asset: { select: { assetTag: true, name: true } },
      vendor: { select: { name: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { repairNo: "asc" }],
    take: 4,
  })

  return tickets.map((ticket) => ({
    id: ticket.id,
    type: "maintenance",
    typeLabel: label("maintenance", locale),
    title: `${ticket.repairNo} - ${ticket.asset.assetTag}`,
    subtitle: ticket.asset.name,
    href: `/${locale}/maintenance/${ticket.id}`,
    badge: { label: ticket.repairStatus, colorCode: null },
    metadata: compactMetadata([
      [locale === "th" ? "ปัญหา" : "Problem", ticket.problem],
      [locale === "th" ? "ผู้ขาย" : "Vendor", ticket.vendor?.name],
    ]),
  }))
}

async function searchAuditRounds(query: string, locale: string): Promise<SearchResult[]> {
  const rounds = await prisma.auditRound.findMany({
    where: {
      isActive: true,
      OR: [
        { auditNo: { contains: query } },
        { name: { contains: query } },
        { scopeCompany: { code: { contains: query } } },
        { scopeBranch: { code: { contains: query } } },
        { scopeDepartment: { name: { contains: query } } },
        { scopeLocation: { name: { contains: query } } },
      ],
    },
    select: { id: true, auditNo: true, name: true, auditYear: true, status: true },
    orderBy: [{ updatedAt: "desc" }, { auditNo: "asc" }],
    take: 4,
  })

  return rounds.map((round) => ({
    id: round.id,
    type: "audit",
    typeLabel: label("audit", locale),
    title: `${round.auditNo} - ${round.name}`,
    subtitle: `${label("audit", locale)} ${round.auditYear}`,
    href: `/${locale}/audit/rounds/${round.id}`,
    badge: { label: round.status, colorCode: null },
    metadata: [],
  }))
}

async function searchDisposalRequests(query: string, locale: string): Promise<SearchResult[]> {
  const requests = await prisma.disposalRequest.findMany({
    where: {
      isActive: true,
      OR: [
        { disposalNo: { contains: query } },
        { reason: { contains: query } },
        { documentNo: { contains: query } },
        { recipientName: { contains: query } },
        { asset: { assetTag: { contains: query } } },
        { asset: { name: { contains: query } } },
      ],
    },
    select: {
      id: true,
      disposalNo: true,
      disposalType: true,
      requestStatus: true,
      asset: { select: { assetTag: true, name: true } },
    },
    orderBy: [{ updatedAt: "desc" }, { disposalNo: "asc" }],
    take: 4,
  })

  return requests.map((request) => ({
    id: request.id,
    type: "disposal",
    typeLabel: label("disposal", locale),
    title: `${request.disposalNo} - ${request.asset.assetTag}`,
    subtitle: request.asset.name,
    href: `/${locale}/disposal/${request.id}`,
    badge: { label: request.requestStatus, colorCode: null },
    metadata: compactMetadata([[locale === "th" ? "ประเภท" : "Type", request.disposalType]]),
  }))
}

function compactMetadata(items: Array<[string, string | null | undefined]>): GlobalSearchMetadata[] {
  return items
    .filter((item): item is [string, string] => Boolean(item[1]))
    .map(([labelText, value]) => ({ label: labelText, value }))
}

function label(type: GlobalSearchResultType, locale: string) {
  const th: Record<GlobalSearchResultType, string> = {
    asset: "ทรัพย์สิน",
    employee: "พนักงาน",
    supplier: "ผู้ขาย",
    company: "บริษัท",
    branch: "สาขา",
    location: "พื้นที่/ตำแหน่ง",
    maintenance: "งานซ่อม",
    audit: "ตรวจนับ",
    disposal: "ตัดจำหน่าย",
  }
  const en: Record<GlobalSearchResultType, string> = {
    asset: "Asset",
    employee: "Employee",
    supplier: "Supplier",
    company: "Company",
    branch: "Branch",
    location: "Location",
    maintenance: "Maintenance",
    audit: "Audit",
    disposal: "Disposal",
  }
  return locale === "en" ? en[type] : th[type]
}
