import "dotenv/config"

const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
const token = process.env.LDAP_SYNC_TOKEN

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
  body: JSON.stringify({ action: "apply" }),
})

const payload = await response.json().catch(() => null)

if (!response.ok) {
  console.error(payload?.error ?? payload?.message ?? "LDAP sync failed")
  process.exit(1)
}

console.log(JSON.stringify(payload, null, 2))
