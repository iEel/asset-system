import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import test from "node:test"

function walk(dir: string, out: string[] = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) walk(path, out)
    else if (entry.name.endsWith(".tsx")) out.push(path.replaceAll("\\", "/"))
  }
  return out
}

test("no screen toasts raw server text; it goes through useApiError", () => {
  const offenders: string[] = []
  for (const file of [...walk("src/components"), ...walk("src/app")]) {
    const source = readFileSync(file, "utf8")
    for (const match of source.matchAll(/toast\.error\(([^)]*)\)/g)) {
      if (/(?:result|payload|data|json|body|response)\??\.error\b|error\.message|^\s*error\s*$/.test(match[1])) offenders.push(`${file}: toast.error(${match[1].slice(0, 60)})`)
    }
  }
  assert.deepEqual(offenders, [])
})

test("the helpers render Thai first and the original text as a small second line", () => {
  const hook = readFileSync("src/components/ui/use-api-error.ts", "utf8")
  assert.match(hook, /toast\.error\(message, detail \? \{ description: detail \} : undefined\)/)
  assert.match(hook, /console\.warn\(/)
  const text = readFileSync("src/components/ui/api-error-text.tsx", "utf8")
  assert.match(text, /block text-xs font-normal text-muted-foreground/)
})
