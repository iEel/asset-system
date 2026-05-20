import "dotenv/config"

const baseUrl = process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? "http://localhost:3000"
const token = process.env.NOTIFICATION_DIGEST_TOKEN
const dryRun = process.argv.includes("--dry-run")
const localeArg = process.argv.find((arg) => arg.startsWith("--locale="))
const locale = localeArg?.split("=")[1] === "en" ? "en" : "th"

if (!token) {
  console.error("Missing NOTIFICATION_DIGEST_TOKEN")
  process.exit(1)
}

const response = await fetch(`${baseUrl.replace(/\/$/, "")}/api/notifications/digest`, {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify({ dryRun, locale }),
})

const payload = await response.json().catch(() => null)

if (!response.ok) {
  console.error(payload?.error ?? payload?.message ?? "Notification digest failed")
  process.exit(1)
}

console.log(JSON.stringify(payload, null, 2))
