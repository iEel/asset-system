import "dotenv/config"

import { pathToFileURL } from "node:url"

// A bare run only previews. Applying can deactivate employees and users, so it must be asked for.
export function resolveLdapSyncAction(argv) {
  const apply = argv.includes("--apply")
  const scheduled = argv.includes("--scheduled")
  if (apply && scheduled) throw new Error("Choose only one of --apply or --scheduled")
  if (scheduled) return "scheduled"
  return apply ? "apply" : "preview"
}

async function main() {
  const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
  const token = process.env.LDAP_SYNC_TOKEN
  const action = resolveLdapSyncAction(process.argv.slice(2))

  if (!token) {
    console.error("Missing LDAP_SYNC_TOKEN")
    process.exit(1)
  }

  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/admin/settings/ldap-sync`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    console.error(payload?.error ?? payload?.message ?? "LDAP sync failed")
    process.exit(1)
  }

  console.log(JSON.stringify(payload, null, 2))
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  await main()
}
