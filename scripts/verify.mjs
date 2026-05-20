import { spawnSync } from "node:child_process"

const npmCommand = process.platform === "win32" ? "cmd.exe" : "npm"
const skipBuild = process.argv.includes("--skip-build")
const steps = [
  { name: "lint", args: ["run", "lint"] },
  { name: "test", args: ["test"] },
  ...skipBuild ? [] : [{ name: "build", args: ["run", "build"] }],
]

for (const step of steps) {
  console.log(`\n=== npm ${step.args.join(" ")} ===`)
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm", ...step.args] : step.args
  const result = spawnSync(npmCommand, args, { stdio: "inherit" })
  if (result.error) {
    console.error(result.error.message)
  }
  if (result.status !== 0) {
    console.error(`Verification failed at step: ${step.name}`)
    process.exit(result.status ?? 1)
  }
}

console.log("\nVerification completed successfully.")
