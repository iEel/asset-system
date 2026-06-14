import { createHash, randomBytes } from "node:crypto"

const args = parseArgs(process.argv.slice(2))
const clientId = args["client-id"] || args.clientId || "external-readonly"
const name = args.name || clientId
const scopes = (args.scopes || "asset:read,reference:read,integration:read")
  .split(",")
  .map((scope) => scope.trim())
  .filter(Boolean)

if (!/^[A-Za-z0-9._:-]+$/.test(clientId)) {
  console.error("client-id may contain only letters, numbers, dot, underscore, colon, or hyphen.")
  process.exit(1)
}

if (scopes.length === 0) {
  console.error("At least one scope is required.")
  process.exit(1)
}

const token = `ams_${randomBytes(32).toString("base64url")}`
const tokenHash = createHash("sha256").update(token).digest("hex")
const tokenPreview = buildTokenPreview(token)

console.log("Integration API token generated.")
console.log("")
console.log("Normal workflow:")
console.log("Create, rotate, enable, and disable clients in Admin > Integration API.")
console.log("")
console.log("Manual recovery/troubleshooting output only:")
console.log("Use this data only for controlled SQL repair or emergency client recovery.")
console.log("This script prints to the terminal and does not write files or secrets to disk.")
console.log("")
console.log("Plain token (show once; store in the calling system secret manager):")
console.log(token)
console.log("")
console.log("Token hash:")
console.log(tokenHash)
console.log("")
console.log("Token preview:")
console.log(tokenPreview)
console.log("")
console.log("Client metadata for manual SQL:")
console.log(JSON.stringify({ clientId, displayName: name, scopes, enabled: true }, null, 2))

function parseArgs(argv) {
  const result = {}
  for (let index = 0; index < argv.length; index += 1) {
    const item = argv[index]
    if (!item.startsWith("--")) continue
    const [rawKey, inlineValue] = item.slice(2).split("=", 2)
    const value = inlineValue ?? argv[index + 1]
    if (inlineValue === undefined) index += 1
    result[rawKey] = value ?? ""
  }
  return result
}

function buildTokenPreview(token) {
  const prefix = token.startsWith("ams_") ? "ams_" : ""
  const body = prefix ? token.slice(prefix.length) : token
  const start = body.slice(0, 4)
  const end = body.slice(-4)
  return `${prefix}${start}...${end}`.slice(0, 20)
}
