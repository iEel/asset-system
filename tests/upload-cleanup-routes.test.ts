import assert from "node:assert/strict"
import { existsSync, readFileSync } from "node:fs"
import * as nodeModule from "node:module"
import { beforeEach, test } from "node:test"
import { pathToFileURL } from "node:url"

// A refused or rolled-back save removes the evidence files it wrote; a committed one keeps them, even when logAudit
// throws after the commit (group 3 follow-up C). The handover saves its files only after its checks, as the return does.
type World = {
  mode: "checkout" | "checkin"
  assetStatusName: string
  saves: string[]
  failingSaves: string[]
  tracked: string[]
  discards: string[]
  failTransaction: boolean
  failAudit: boolean
  attachmentPaths: string[]
}

const world: World = freshWorld()
Object.assign(globalThis, { __uploadCleanupWorld: world })

function freshWorld(): World {
  return {
    mode: "checkout",
    assetStatusName: "Ready",
    saves: [],
    failingSaves: [],
    tracked: [],
    discards: [],
    failTransaction: false,
    failAudit: false,
    attachmentPaths: [],
  }
}

const mockedModuleSources = new Map<string, string>([
  ["next/server", `
    export class NextRequest extends Request {}
    export class NextResponse extends Response {
      static json(body, init) { return Response.json(body, init) }
    }
  `],
  ["@/lib/auth-utils", `
    export async function requireAuth() { return { id: "user-1", roles: ["system_admin"], permissions: [], employeeId: "emp-1" } }
    export function hasRole(user, role) { return user.roles.includes(role) }
    export function hasPermission() { return true }
    export function requirePermission() {}
  `],
  ["@/lib/audit-log", `
    export async function logAudit() { if (globalThis.__uploadCleanupWorld.failAudit) throw new Error("audit log down") }
  `],
  ["@/lib/asset-status-flow", `
    export async function getRequiredAssetStatusId(name) { return "status:" + name }
    export async function isValidCheckinReturnStatus() { return true }
  `],
  ["@/lib/operation-document-number", `
    export async function generateCheckoutDocumentNo() { return "HO-202611-0001" }
    export async function generateCheckinDocumentNo() { return "RT-202611-0001" }
  `],
  ["@/lib/asset-component-sync", `
    export async function syncInstalledComponentsWithParent() { return { updated: 0, skipped: 0, movements: 0, componentSnapshots: [] } }
  `],
  ["@/lib/asset-operation-evidence", `
    const world = () => globalThis.__uploadCleanupWorld
    export function optionalFormFile(formData, name) { const value = formData.get(name); return value instanceof File && value.size > 0 ? value : null }
    export function optionalFormText(formData, name) { const value = formData.get(name); return typeof value === "string" && value.trim() ? value.trim() : null }
    export function requiredFormText(formData, name) { const value = formData.get(name); return typeof value === "string" ? value : "" }
    export async function saveOperationEvidenceFile(file, operation) {
      world().saves.push(file.name)
      if (world().failingSaves.includes(file.name)) throw new Error("disk full")
      return { fileName: "saved-" + file.name, originalName: file.name, fileType: file.type, fileSize: file.size, filePath: "uploads/" + operation + "/" + file.name }
    }
  `],
  ["@/lib/upload-server", `
    const world = () => globalThis.__uploadCleanupWorld
    export async function scanWrittenUploadFile() {}
    export async function discardUploadedFiles(filePaths) { world().discards.push(...filePaths) }
    export function createUploadCleanup() {
      const filePaths = []
      let committed = false
      return {
        track(filePath) { filePaths.push(filePath); world().tracked.push(filePath) },
        commit() { committed = true },
        async discardIfUncommitted() { if (!committed) world().discards.push(...filePaths.splice(0)) },
      }
    }
  `],
  ["@/lib/db", `
    const world = () => globalThis.__uploadCleanupWorld
    const asset = () => ({
      id: "asset-1",
      assetTag: "GRL-COM-26-0001",
      ownershipType: "personal",
      statusId: "status:" + world().assetStatusName,
      conditionId: "condition-good",
      branchId: "branch-1",
      currentLocationId: "loc-1",
      custodianId: "emp-5",
      departmentId: "dept-1",
      updatedAt: new Date("2026-10-01T00:00:00Z"),
      status: { name: world().assetStatusName, nameTh: world().assetStatusName },
      condition: { name: "Good" },
    })
    function model(name) {
      return new Proxy({}, {
        get(_target, method) {
          return async (args) => {
            if (name === "attachment" && method === "create") world().attachmentPaths.push(args.data.filePath)
            if (name === "asset" && (method === "findFirst" || method === "findUnique")) return asset()
            if (name === "asset" && method === "update") return { ...asset(), ...(args?.data ?? {}) }
            if (name === "assetCheckout" && method === "findFirst") {
              if (world().mode === "checkout") return null
              return { id: "co-1", assetId: "asset-1", handoverMode: "temporary_loan", custodianId: "emp-5", checkoutDate: new Date("2026-10-01T03:00:00Z"), remark: null, asset: { status: { name: "Checked Out" } } }
            }
            if (name === "assetCondition") return { name: "Good", isActive: true }
            if (name === "assetStatus") return { id: args?.where?.id ?? "status:Ready", name: String(args?.where?.id ?? "status:Ready").replace("status:", "") }
            if (name === "employee" && method === "findFirst") return { id: "emp-2", departmentId: "dept-2" }
            if (name === "department" && method === "findFirst") return { id: "dept-it", code: "IT", name: "Information Technology" }
            if (name === "location" && method === "findFirst") return { id: args?.where?.id ?? "loc-1" }
            if (method === "updateMany") return { count: 1 }
            if (method === "count") return 0
            if (method === "findMany") return []
            if (method === "findFirst" || method === "findUnique") return null
            return { id: name + "-new", createdAt: new Date(), ...(args?.data ?? {}) }
          }
        },
      })
    }
    const client = new Proxy({}, {
      get(_target, key) {
        if (key === "$transaction") return async (callback) => {
          if (world().failTransaction) throw new Error("transaction rolled back")
          return callback(client)
        }
        return model(String(key))
      },
    })
    export const prisma = client
  `],
])

const registerHooks = (nodeModule as unknown as {
  registerHooks(options: {
    resolve(specifier: string, context: unknown, nextResolve: (specifier: string, context: unknown) => unknown): unknown
  }): void
}).registerHooks

registerHooks({
  resolve(specifier, context, nextResolve) {
    const source = mockedModuleSources.get(specifier)
    if (source !== undefined) {
      return { url: `data:text/javascript;charset=utf-8,${encodeURIComponent(source)}`, shortCircuit: true }
    }
    if (specifier.startsWith("@/")) {
      const base = `src/${specifier.slice(2)}`
      const file = [`${base}.ts`, `${base}.tsx`, `${base}/index.ts`].find((candidate) => existsSync(candidate))
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
    }
    return nextResolve(specifier, context)
  },
})

type RouteModule = { POST(request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> }
const checkoutRoute = await import(pathToFileURL("src/app/api/assets/[id]/checkout/route.ts").href) as RouteModule
const checkinRoute = await import(pathToFileURL("src/app/api/assets/[id]/checkin/route.ts").href) as RouteModule
const context = { params: Promise.resolve({ id: "asset-1" }) }

beforeEach(() => {
  Object.assign(world, freshWorld())
})

// A real PNG signature, so the upload checks the handover runs before its checks accept it.
function png(name: string) {
  return new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])], name, { type: "image/png" })
}

function multipart(url: string, fields: Record<string, string | File>) {
  const formData = new FormData()
  for (const [key, value] of Object.entries(fields)) formData.append(key, value)
  return new Request(url, { method: "POST", body: formData })
}

function checkoutRequest() {
  return multipart("http://localhost/api/assets/asset-1/checkout", {
    handoverMode: "temporary_loan",
    checkoutType: "user",
    custodianId: "emp-2",
    checkoutDate: "2026-10-07",
    expectedReturnDate: "2026-10-14",
    conditionBefore: "condition-good",
    photoBefore: png("before.png"),
    receiverSignatureFile: png("signature.png"),
  })
}

function checkinRequest() {
  return multipart("http://localhost/api/assets/asset-1/checkin", {
    checkoutId: "co-1",
    returnDate: "2026-10-07",
    returnBy: "สมชาย",
    receiveBy: "สมหญิง",
    conditionAfter: "condition-good",
    nextStatusId: "status:Ready",
    nextLocationId: "loc-1",
    photoAfterFiles: png("after.png"),
    returnSignatureFile: png("return.png"),
    receiveSignatureFile: png("receive.png"),
  })
}

test("a handover refused after its checks saves no evidence file", async () => {
  world.assetStatusName = "Checked Out"
  const response = await checkoutRoute.POST(checkoutRequest(), context)
  assert.equal(response.status, 409, await response.clone().text())
  assert.deepEqual(world.saves, [], "the files are saved only after every check has passed")
  assert.deepEqual(world.discards, [])
})

test("a handover whose transaction throws discards both files it saved", async () => {
  world.failTransaction = true
  const response = await checkoutRoute.POST(checkoutRequest(), context)
  assert.equal(response.status, 400)
  assert.deepEqual(world.saves, ["before.png", "signature.png"])
  assert.deepEqual(world.discards.sort(), ["uploads/checkout/before.png", "uploads/checkout/signature.png"])
})

test("a committed handover keeps its files even when logAudit throws after the commit", async () => {
  world.failAudit = true
  const response = await checkoutRoute.POST(checkoutRequest(), context)
  assert.equal(response.status, 400, "the answer stays what it was")
  assert.deepEqual(world.attachmentPaths, ["uploads/checkout/before.png", "uploads/checkout/signature.png"])
  assert.deepEqual(world.discards, [], "the committed rows point at the files")
})

test("a committed handover answers 201 and discards nothing", async () => {
  const response = await checkoutRoute.POST(checkoutRequest(), context)
  assert.equal(response.status, 201, await response.clone().text())
  assert.deepEqual(world.tracked.sort(), ["uploads/checkout/before.png", "uploads/checkout/signature.png"])
  assert.deepEqual(world.discards, [])
})

test("a handover whose one save fails discards the file its sibling saved", async () => {
  world.failingSaves = ["before.png"]
  const response = await checkoutRoute.POST(checkoutRequest(), context)
  assert.equal(response.status, 400)
  assert.deepEqual(world.discards, ["uploads/checkout/signature.png"])
})

test("a return whose transaction throws discards every file it saved", async () => {
  world.mode = "checkin"
  world.assetStatusName = "Checked Out"
  world.failTransaction = true
  const response = await checkinRoute.POST(checkinRequest(), context)
  assert.equal(response.status, 400)
  assert.deepEqual(world.saves, ["after.png", "return.png", "receive.png"])
  assert.deepEqual(world.discards.sort(), ["uploads/checkin/after.png", "uploads/checkin/receive.png", "uploads/checkin/return.png"])
})

test("a return whose one save fails discards the files its siblings saved", async () => {
  world.mode = "checkin"
  world.assetStatusName = "Checked Out"
  world.failingSaves = ["return.png"]
  const response = await checkinRoute.POST(checkinRequest(), context)
  assert.equal(response.status, 400)
  assert.deepEqual(world.discards.sort(), ["uploads/checkin/after.png", "uploads/checkin/receive.png"])
})

test("a committed return answers 201 and discards nothing", async () => {
  world.mode = "checkin"
  world.assetStatusName = "Checked Out"
  const response = await checkinRoute.POST(checkinRequest(), context)
  assert.equal(response.status, 201, await response.clone().text())
  assert.deepEqual(world.attachmentPaths, ["uploads/checkin/after.png", "uploads/checkin/return.png", "uploads/checkin/receive.png"])
  assert.deepEqual(world.discards, [])
})

// Each other evidence route creates the tracker, tracks the file it writes, commits on the line after its transaction (or
// its one attachment row) resolves, before logAudit, and discards in a finally.
test("every other evidence route tracks its file, commits right after its save and discards in a finally", () => {
  const routes: Array<[string, string]> = [
    ["src/app/api/assets/[id]/components/route.ts", "await prisma.$transaction("],
    ["src/app/api/assets/[id]/components/[componentId]/route.ts", "await prisma.$transaction("],
    ["src/app/api/audit-items/[id]/mark-not-found/route.ts", "await prisma.$transaction("],
    ["src/app/api/purchase-documents/route.ts", "await prisma.$transaction("],
    ["src/app/api/assets/[id]/purchase-documents/route.ts", "await prisma.$transaction("],
    ["src/app/api/assets/[id]/attachments/route.ts", "await prisma.attachment.create("],
    ["src/app/api/maintenance-tickets/[id]/attachments/route.ts", "await prisma.attachment.create("],
    ["src/app/api/disposal-requests/[id]/attachments/route.ts", "await prisma.attachment.create("],
    ["src/app/api/disposal-batches/[id]/attachments/route.ts", "await prisma.attachment.create("],
    ["src/app/api/audit-findings/[id]/attachments/route.ts", "await prisma.attachment.create("],
    ["src/app/api/models/[id]/attachments/route.ts", "await prisma.attachment.create("],
  ]
  for (const [file, save] of routes) {
    const source = readFileSync(file, "utf8").replace(/\r\n/g, "\n")
    assert.match(source, /\n {2}const uploads = createUploadCleanup\(\)\n {2}try \{\n/, `${file}: the tracker is created before the try`)
    const track = source.indexOf("uploads.track(")
    const saveAt = source.indexOf(save)
    const commit = source.indexOf("uploads.commit()")
    const audit = source.indexOf("await logAudit(", saveAt)
    assert.ok(track > 0 && track < saveAt, `${file}: the file is tracked before the save`)
    assert.ok(commit > saveAt && commit < audit, `${file}: the commit is after the save and before logAudit`)
    assert.equal(source.indexOf("uploads.commit()", commit + 1), -1, `${file}: one commit`)
    assert.match(source.slice(saveAt, audit), /\n {4}\}\)\n {4}uploads\.commit\(\)\n\n {4}$/,`${file}: the commit is on the line after the save resolves`)
    assert.match(source, /\n {2}\} finally \{\n {4}await uploads\.discardIfUncommitted\(\)\n {2}\}\n\}/, `${file}: the files are discarded in a finally`)
  }
})
