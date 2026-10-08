// Applies a change file to messages/th.json and messages/en.json.
// Change file: { "set": { "th": { "ns.key": "text" }, "en": { … } }, "delete": ["ns.key", …] }
// Usage: node scripts/messages-edit.mjs path/to/changes.json   (an empty {} only normalises formatting)
import { readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { applyMessageChanges, serializeMessages } from "./lib/messages-edit-core.mjs"

const changeFile = process.argv[2]
if (!changeFile) {
  console.error("Usage: node scripts/messages-edit.mjs <changes.json>")
  process.exit(2)
}
const changes = JSON.parse(readFileSync(changeFile, "utf8"))
for (const locale of ["th", "en"]) {
  const file = join(process.cwd(), "messages", `${locale}.json`)
  const raw = readFileSync(file, "utf8")
  const eol = raw.includes("\r\n") ? "\r\n" : "\n"
  writeFileSync(file, serializeMessages(applyMessageChanges(JSON.parse(raw), changes, locale), eol))
}
console.log(`messages updated: ${Object.keys(changes.set?.th ?? {}).length} th, ${Object.keys(changes.set?.en ?? {}).length} en, ${(changes.delete ?? []).length} deleted`)
