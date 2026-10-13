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
  assert.match(content, /<Button[\s\S]*?type="submit"[\s\S]*?busy=\{loading\}/)
  assert.doesNotMatch(content, /aria-busy=/)
  assert.match(content, /\{t\("login"\)\}/)
  assert.doesNotMatch(content, /t\("loggingIn"\)/)
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

// Phase 2C batch 4 (spec 2C §8.9, §4.18 item 10, §6.3 #93, I35): FieldLabel + Input (the first test pins the literal
// htmlFor strings, so not Field), both fields keep the browser's own required check, the two boxes are Notice with
// their live-region roles, and the submit button is busy with one label (K13).
test("login form uses the shared label, inputs, notices and a busy submit button (2C batch 4)", () => {
  const content = source().replace(/\r\n/g, "\n")
  assert.match(content, /<FieldLabel htmlFor="login-username">\{t\("username"\)\}<\/FieldLabel>\n\s+<Input\n\s+id="login-username"/)
  assert.match(content, /<FieldLabel htmlFor="login-password">\{t\("password"\)\}<\/FieldLabel>\n\s+<div className="relative">\n\s+<Input\n\s+ref=\{passwordRef\}/)
  assert.equal(content.match(/^\s+required$/gm)?.length, 2, "both fields keep native required")
  assert.match(content, /className="pr-12"\n\s+required\n\s+\/>\n\s+<button\n\s+type="button"\n\s+aria-label=\{showPassword/)
  assert.match(content, /<Notice tone="info" role="status" aria-live="polite">\n\s+\{t\("sessionExpired"\)\}\n\s+<\/Notice>/)
  assert.match(content, /<Notice tone="danger" role="alert" aria-live="polite">\n\s+\{error\}\n\s+<\/Notice>/)
  assert.match(content, /<Button type="submit" busy=\{loading\} className="w-full">\n\s+\{t\("login"\)\}\n\s+<\/Button>/)
  assert.doesNotMatch(content, /<input\b|<label\b|Loader2|bg-info-soft|bg-danger-soft|disabled=\{loading\}|mb-1\.5 block/)
})
