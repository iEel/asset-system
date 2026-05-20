import "dotenv/config"

const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
const token = process.env.MAINTENANCE_PM_GENERATION_TOKEN
const isScheduled = process.argv.includes("--scheduled")

if (!token) {
  console.error("Missing MAINTENANCE_PM_GENERATION_TOKEN")
  process.exit(1)
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/maintenance-plans/generate-due`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    dryRun: process.argv.includes("--dry-run"),
    ...(isScheduled ? { action: "scheduled" } : {}),
  }),
})

const payload = await response.json().catch(() => null)

if (!response.ok) {
  console.error(payload?.error ?? payload?.message ?? "PM generation failed")
  process.exit(1)
}

console.log(JSON.stringify(payload, null, 2))
