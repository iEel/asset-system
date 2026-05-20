export type RbacRouteCheck = {
  module: string
  action: string
  snippets?: string[]
}

export type RbacRouteMatrixEntry = {
  filePath: string
  label: string
  checks: RbacRouteCheck[]
  customAuthSnippet?: string
}

export const rbacRoutePermissionMatrix: RbacRouteMatrixEntry[] = [
  {
    filePath: "src/app/api/admin/settings/route.ts",
    label: "Admin settings",
    checks: [
      { module: "setting", action: "view" },
      { module: "setting", action: "edit" },
    ],
  },
  {
    filePath: "src/app/api/admin/users/route.ts",
    label: "Admin users",
    checks: [
      { module: "user", action: "view" },
      { module: "user", action: "create" },
    ],
  },
  {
    filePath: "src/app/api/admin/roles/export/route.ts",
    label: "Role export",
    checks: [{ module: "role", action: "export" }],
  },
  {
    filePath: "src/app/api/assets/route.ts",
    label: "Assets",
    checks: [
      { module: "asset", action: "view" },
      { module: "asset", action: "create" },
    ],
  },
  {
    filePath: "src/app/api/assets/[id]/route.ts",
    label: "Asset detail mutations",
    checks: [
      { module: "asset", action: "view" },
      { module: "asset", action: "edit" },
      { module: "asset", action: "delete" },
    ],
  },
  {
    filePath: "src/app/api/assets/import-confirm/route.ts",
    label: "Asset import confirm",
    checks: [{ module: "asset", action: "create" }],
  },
  {
    filePath: "src/app/api/attachments/[id]/route.ts",
    label: "Attachment download/delete",
    customAuthSnippet: "requireAttachmentPermission",
    checks: [
      { module: "asset", action: "view", snippets: ["requireAttachmentPermission(user, attachment.module, \"view\")"] },
      { module: "asset", action: "edit", snippets: ["requireAttachmentPermission(user, existing.module, \"edit\")"] },
    ],
  },
  {
    filePath: "src/app/api/audit-rounds/route.ts",
    label: "Audit rounds",
    checks: [
      { module: "audit", action: "view" },
      { module: "audit", action: "create" },
    ],
  },
  {
    filePath: "src/app/api/audit-rounds/[id]/route.ts",
    label: "Audit round detail",
    checks: [
      { module: "audit", action: "view" },
      { module: "audit", action: "approve" },
      { module: "audit", action: "delete" },
    ],
  },
  {
    filePath: "src/app/api/audit-rounds/[id]/scan/route.ts",
    label: "Audit scan",
    checks: [{ module: "audit", action: "edit" }],
  },
  {
    filePath: "src/app/api/audit-findings/[id]/review/route.ts",
    label: "Audit finding review",
    checks: [{ module: "audit", action: "approve" }],
  },
  {
    filePath: "src/app/api/disposal-requests/route.ts",
    label: "Disposal requests",
    checks: [
      { module: "disposal", action: "view" },
      { module: "disposal", action: "create" },
    ],
  },
  {
    filePath: "src/app/api/disposal-requests/[id]/route.ts",
    label: "Disposal decision/execution",
    checks: [{ module: "disposal", action: "approve" }],
  },
  {
    filePath: "src/app/api/disposal-requests/[id]/attachments/route.ts",
    label: "Disposal attachments",
    checks: [
      { module: "disposal", action: "create", snippets: ["hasPermission(user, \"disposal\", \"create\")"] },
      { module: "disposal", action: "edit", snippets: ["hasPermission(user, \"disposal\", \"edit\")"] },
      { module: "disposal", action: "approve", snippets: ["hasPermission(user, \"disposal\", \"approve\")"] },
    ],
  },
  {
    filePath: "src/app/api/maintenance-plans/route.ts",
    label: "Preventive maintenance plans",
    checks: [
      { module: "maintenance", action: "view" },
      { module: "maintenance", action: "create" },
    ],
  },
  {
    filePath: "src/app/api/maintenance-plans/[id]/generate-ticket/route.ts",
    label: "Generate PM ticket from plan",
    checks: [{ module: "maintenance", action: "create" }],
  },
  {
    filePath: "src/app/api/maintenance-plans/generate-due/route.ts",
    label: "Generate due PM tickets",
    checks: [{ module: "maintenance", action: "create" }],
  },
  {
    filePath: "src/app/api/maintenance-tickets/route.ts",
    label: "Maintenance tickets",
    checks: [
      { module: "maintenance", action: "view" },
      { module: "maintenance", action: "create" },
    ],
  },
  {
    filePath: "src/app/api/maintenance-tickets/[id]/route.ts",
    label: "Maintenance ticket updates",
    checks: [{ module: "maintenance", action: "edit" }],
  },
  {
    filePath: "src/app/api/reports/assets-overview/export/route.ts",
    label: "Asset overview report export",
    checks: [{ module: "report", action: "export" }],
  },
  {
    filePath: "src/app/api/search/route.ts",
    label: "Global search",
    checks: [
      { module: "asset", action: "view", snippets: ["hasPermission(user, \"asset\", \"view\")"] },
      { module: "employee", action: "view", snippets: ["hasPermission(user, \"employee\", \"view\")"] },
      { module: "supplier", action: "view", snippets: ["hasPermission(user, \"supplier\", \"view\")"] },
      { module: "maintenance", action: "view", snippets: ["hasPermission(user, \"maintenance\", \"view\")"] },
      { module: "audit", action: "view", snippets: ["hasPermission(user, \"audit\", \"view\")"] },
      { module: "disposal", action: "view", snippets: ["hasPermission(user, \"disposal\", \"view\")"] },
    ],
  },
]

export function summarizeRbacRouteMatrix(entries: RbacRouteMatrixEntry[]) {
  const byModule = new Map<string, number>()
  let checks = 0

  for (const entry of entries) {
    for (const check of entry.checks) {
      checks += 1
      byModule.set(check.module, (byModule.get(check.module) ?? 0) + 1)
    }
  }

  return {
    routes: entries.length,
    checks,
    byModule: [...byModule.entries()]
      .map(([module, count]) => ({ module, checks: count }))
      .sort((left, right) => right.checks - left.checks || left.module.localeCompare(right.module)),
  }
}

export function validateRbacRouteSource(entry: RbacRouteMatrixEntry, source: string) {
  const failures: string[] = []
  if (!source.includes("requireAuth(")) {
    failures.push(`${entry.filePath}: missing requireAuth`)
  }
  if (entry.customAuthSnippet && !source.includes(entry.customAuthSnippet)) {
    failures.push(`${entry.filePath}: missing ${entry.customAuthSnippet}`)
  }

  for (const check of entry.checks) {
    const snippets = check.snippets ?? [`"${check.module}", "${check.action}"`]
    if (!snippets.some((snippet) => source.includes(snippet))) {
      failures.push(`${entry.filePath}: missing ${check.module}:${check.action}`)
    }
  }

  return failures
}
