import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const componentPath = "src/components/auth/login-form.tsx"

function source() {
  return readFileSync(componentPath, "utf8")
}

test("login fields expose labels and password-manager metadata", () => {
  const content = source()
  assert.match(content, /htmlFor="login-username"/)
  assert.match(content, /id="login-username"/)
  assert.match(content, /name="username"/)
  assert.match(content, /autoComplete="username"/)
  assert.match(content, /htmlFor="login-password"/)
  assert.match(content, /id="login-password"/)
  assert.match(content, /name="password"/)
  assert.match(content, /autoComplete="current-password"/)
})

test("login form provides accessible password visibility and submission states", () => {
  const content = source()
  assert.match(content, /EyeOff/)
  assert.match(content, /Eye/)
  assert.match(content, /aria-label=\{showPassword \? t\("hidePassword"\) : t\("showPassword"\)\}/)
  assert.match(content, /aria-pressed=\{showPassword\}/)
  assert.match(content, /aria-busy=\{loading\}/)
  assert.match(content, /loading \? t\("loggingIn"\) : t\("login"\)/)
})

test("failed login clears and refocuses only the password while exposing a live error", () => {
  const content = source()
  assert.match(content, /setPassword\(""\)/)
  assert.match(content, /passwordRef\.current\?\.focus\(\)/)
  assert.match(content, /role="alert"/)
  assert.match(content, /aria-live="polite"/)
  assert.match(content, /onChange=\{\(event\) => \{\s*setUsername\(event\.target\.value\)\s*setError\(""\)/)
  assert.match(content, /router\.replace\(callbackUrl\)/)
})

test("login translations include visibility and loading copy", () => {
  const thai = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const english = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.equal(thai.auth.showPassword, "แสดงรหัสผ่าน")
  assert.equal(thai.auth.hidePassword, "ซ่อนรหัสผ่าน")
  assert.equal(thai.auth.loggingIn, "กำลังเข้าสู่ระบบ...")
  assert.equal(english.auth.showPassword, "Show password")
  assert.equal(english.auth.hidePassword, "Hide password")
  assert.equal(english.auth.loggingIn, "Signing in...")
})
