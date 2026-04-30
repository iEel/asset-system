import { spawn } from "node:child_process"
import { createRequire } from "node:module"
import { config } from "dotenv"

const require = createRequire(import.meta.url)

config({ quiet: true })

const command = process.argv[2]
const allowedCommands = new Set(["dev", "start"])

if (!allowedCommands.has(command)) {
  console.error("Usage: node scripts/next-with-env-port.mjs <dev|start>")
  process.exit(1)
}

const port = process.env.WEB_PORT || process.env.PORT || "3000"
const nextBin = require.resolve("next/dist/bin/next")

const child = spawn(process.execPath, [nextBin, command], {
  env: {
    ...process.env,
    PORT: port,
  },
  stdio: "inherit",
})

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
    return
  }

  process.exit(code ?? 0)
})
