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
const clientConfig = {
  clientId,
  name,
  tokenHash,
  scopes,
  enabled: true,
}

console.log("Integration API token generated.")
console.log("")
console.log("Plain token (show once; store in the calling system secret manager):")
console.log(token)
console.log("")
console.log("Token hash:")
console.log(tokenHash)
console.log("")
console.log("INTEGRATION_API_CLIENTS entry:")
console.log(JSON.stringify([clientConfig], null, 2))
console.log("")
console.log("Example:")
console.log(`set INTEGRATION_API_CLIENTS=${JSON.stringify([clientConfig])}`)

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
