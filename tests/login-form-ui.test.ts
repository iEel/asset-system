import test from "node:test"
import assert from "node:assert/strict"
import { readFileSync } from "node:fs"

const componentPath = "src/components/auth/login-form.tsx"

function source() {
  return readFileSync(componentPath, "utf8").replace(/\r\n/g, "\n")
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

test("failed login clears and refocuses only the password while exposing a live error", () => {
  const content = source()
  assert.match(content, /setPassword\(""\)/)
  assert.match(content, /passwordRef\.current\?\.focus\(\)/)
  assert.match(content, /role="alert"/)
  assert.match(content, /aria-live="polite"/)
  assert.match(content, /onChange=\{\(event\) => \{\s*setUsername\(event\.target\.value\)\s*setError\(""\)/)
  assert.match(content, /router\.replace\(callbackUrl\)/)
})

test("login translations include the password visibility copy", () => {
  const thai = JSON.parse(readFileSync("messages/th.json", "utf8"))
  const english = JSON.parse(readFileSync("messages/en.json", "utf8"))

  assert.equal(thai.auth.showPassword, "แสดงรหัสผ่าน")
  assert.equal(thai.auth.hidePassword, "ซ่อนรหัสผ่าน")
  assert.equal(english.auth.showPassword, "Show password")
  assert.equal(english.auth.hidePassword, "Hide password")
})

test("login form: the show-password toggle is a word with a full accessible name, and the submit is busy (spec §8)", () => {
  const content = source()
  assert.match(content, /aria-label=\{showPassword \? t\("hidePassword"\) : t\("showPassword"\)\}/)
  assert.match(content, /\{showPassword \? t\("hidePasswordShort"\) : t\("showPasswordShort"\)\}/)
  assert.doesNotMatch(content, /aria-pressed|\bEye\b|EyeOff|ShieldCheck/)
  assert.match(content, /<Button type="submit" busy=\{loading\} className="w-full">\n\s+\{t\("login"\)\}\n\s+<\/Button>/)
  assert.doesNotMatch(content, /aria-busy=|t\("loggingIn"\)/)
})

test("login form posts, so a submit before hydration never puts the password in the URL (spec §8)", () => {
  assert.match(source(), /<form method="post" onSubmit=\{handleSubmit\}/)
})

test("login form: the username field does not autocorrect, and Caps Lock shows under the password while it has focus (spec §8)", () => {
  const content = source().replace(/\r\n/g, "\n")
  assert.match(content, /id="login-username"[\s\S]*?autoCapitalize="none"[\s\S]*?spellCheck=\{false\}[\s\S]*?enterKeyHint="next"/)
  assert.match(content, /id="login-password"[\s\S]*?enterKeyHint="go"[\s\S]*?aria-describedby=\{capsLockOn \? "login-caps-lock" : undefined\}/)
  assert.match(content, /getModifierState\("CapsLock"\)/)
  assert.match(content, /onBlur=\{\(\) => setCapsLockOn\(false\)\}/)
  assert.match(content, /<p id="login-caps-lock" role="status"/)
  assert.match(content, /\{t\("capsLockOn"\)\}/)
  assert.equal(content.match(/role="alert"/g)?.length, 1, "the auth error is the form's only alert")
  assert.doesNotMatch(content, /sessionExpired|directoryLoginHint/)
})

test("login form keeps the shared label, inputs and the error notice (2C batch 4, spec §8)", () => {
  const content = source().replace(/\r\n/g, "\n")
  assert.match(content, /<FieldLabel htmlFor="login-username">\{t\("username"\)\}<\/FieldLabel>\n\s+<Input\n\s+id="login-username"/)
  assert.match(content, /<FieldLabel htmlFor="login-password">\{t\("password"\)\}<\/FieldLabel>\n\s+<div className="relative">\n\s+<Input\n\s+ref=\{passwordRef\}/)
  assert.equal(content.match(/^\s+required$/gm)?.length, 2, "both fields keep native required")
  assert.match(content, /<Notice tone="danger" role="alert" aria-live="polite">\n\s+\{error\}\n\s+<\/Notice>/)
  assert.doesNotMatch(content, /<input\b|<label\b|Loader2|bg-info-soft|bg-danger-soft|disabled=\{loading\}|mb-1\.5 block/)
})
