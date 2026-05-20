import "dotenv/config"

const baseUrl = (process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000").replace(/\/$/, "")

const jobs = [
  {
    name: "pm_generate_due",
    token: process.env.MAINTENANCE_PM_GENERATION_TOKEN,
    path: "/api/maintenance-plans/generate-due",
  },
  {
    name: "ldap_sync",
    token: process.env.LDAP_SYNC_TOKEN,
    path: "/api/admin/settings/ldap-sync",
  },
]

const results = []

for (const job of jobs) {
  if (!job.token) {
    results.push({ job: job.name, status: "skipped", reason: "missing_token" })
    continue
  }

  const response = await fetch(`${baseUrl}${job.path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${job.token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ action: "scheduled" }),
  })
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    results.push({
      job: job.name,
      status: "failed",
      statusCode: response.status,
      error: payload?.error ?? payload?.message ?? "Scheduled job failed",
    })
    continue
  }

  results.push({ job: job.name, status: "ok", result: payload })
}

console.log(JSON.stringify({ baseUrl, results }, null, 2))

if (results.some((result) => result.status === "failed")) {
  process.exit(1)
}
